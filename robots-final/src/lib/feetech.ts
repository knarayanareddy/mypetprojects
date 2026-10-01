// Feetech STS3215 bus driver over the browser Web Serial API.
// Protocol: FF FF ID LEN INST PARAMS... CHK  (CHK = ~(ID+LEN+INST+PARAMS) & 0xFF), 1 Mbps, half-duplex via the
// Waveshare / Feetech URT-1 bus adapter that ships with SO-101 kits.
import { JOINTS, clamp } from "./kin";

export const REG = {
  ID: 5,
  BAUD: 6,
  RETURN_DELAY: 7,
  MAX_TORQUE: 16,
  P: 21,
  D: 22,
  I: 23,
  PROT_CURRENT: 28,
  MODE: 33,
  OVERLOAD: 36,
  TORQUE_EN: 40,
  ACCEL: 41,
  GOAL_POS: 42,
  TORQUE_LIMIT: 48,
  LOCK: 55,
  PRESENT: 56,
  MAX_ACCEL: 85,
} as const;

const INST = { PING: 1, READ: 2, WRITE: 3, SYNC_WRITE: 0x83 } as const;
export const BROADCAST = 0xfe;

export interface MotorTelemetry {
  id: number;
  pos: number;
  vel: number;
  load: number; // -1000..1000
  volt: number; // volts
  temp: number; // °C
  moving: boolean;
  current: number; // mA
}

export interface CalibEntry { id: number; drive_mode: number; homing_offset: number; range_min: number; range_max: number }
export type Calibration = Record<string, CalibEntry>;

export const defaultCalibration = (): Calibration =>
  Object.fromEntries(
    JOINTS.map((j, i) => [j, { id: i + 1, drive_mode: 0, homing_offset: 0, range_min: 0, range_max: 4095 }]),
  );

export function rawToNorm(joint: number, raw: number, cal: Calibration): number {
  const c = cal[JOINTS[joint]];
  const span = Math.max(1, c.range_max - c.range_min);
  const b = clamp(raw, c.range_min, c.range_max);
  const t = (b - c.range_min) / span;
  let v = joint === 5 ? t * 100 : t * 200 - 100;
  if (c.drive_mode) v = joint === 5 ? 100 - v : -v;
  return v;
}
export function normToRaw(joint: number, norm: number, cal: Calibration): number {
  const c = cal[JOINTS[joint]];
  let v = norm;
  if (c.drive_mode) v = joint === 5 ? 100 - v : -v;
  const t = joint === 5 ? v / 100 : (v + 100) / 200;
  return Math.round(clamp(c.range_min + t * (c.range_max - c.range_min), c.range_min, c.range_max));
}

export const serialSupported = () => typeof navigator !== "undefined" && "serial" in navigator;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class FeetechBus {
  port: any = null;
  label = "";
  private buf: number[] = [];
  private notify: (() => void) | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private reader: any = null;
  private closed = true;
  info = "";
  errors = 0;

  async open(baud = 1_000_000) {
    const serial = (navigator as any).serial;
    if (!serial) throw new Error("Web Serial is not available. Use desktop Chrome or Edge over https/localhost.");
    this.port = await serial.requestPort();
    await this.port.open({ baudRate: baud });
    try {
      const i = this.port.getInfo?.() ?? {};
      this.info = i.usbVendorId ? `USB ${i.usbVendorId.toString(16)}:${(i.usbProductId ?? 0).toString(16)}` : "serial";
    } catch { this.info = "serial"; }
    this.closed = false;
    this.buf = [];
    void this.readLoop();
  }

  private async readLoop() {
    while (this.port?.readable && !this.closed) {
      this.reader = this.port.readable.getReader();
      try {
        for (;;) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            for (const b of value) this.buf.push(b);
            if (this.buf.length > 512) this.buf.splice(0, this.buf.length - 512);
            this.notify?.();
          }
        }
      } catch { /* port closed / unplugged */ }
      finally { try { this.reader.releaseLock(); } catch { /* */ } }
    }
  }

  async close() {
    this.closed = true;
    try { await this.reader?.cancel(); } catch { /* */ }
    try { await this.port?.close(); } catch { /* */ }
    this.port = null;
  }
  get isOpen() { return !!this.port && !this.closed; }

  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(() => undefined, () => undefined);
    return run;
  }

  private async tx(id: number, inst: number, params: number[] = []) {
    const len = params.length + 2;
    let sum = id + len + inst;
    for (const p of params) sum += p;
    const pkt = new Uint8Array([0xff, 0xff, id, len, inst, ...params, ~sum & 0xff]);
    const w = this.port.writable.getWriter();
    try { await w.write(pkt); } finally { w.releaseLock(); }
  }

  private waitData(ms: number) {
    return new Promise<void>((res) => {
      const t = setTimeout(() => { this.notify = null; res(); }, ms);
      this.notify = () => { clearTimeout(t); this.notify = null; res(); };
    });
  }

  private async rx(id: number, timeout = 25): Promise<{ err: number; params: number[] } | null> {
    const end = performance.now() + timeout;
    for (;;) {
      const b = this.buf;
      for (let i = 0; i + 3 < b.length; i++) {
        if (b[i] !== 0xff || b[i + 1] !== 0xff) continue;
        const pid = b[i + 2], ln = b[i + 3];
        if (ln < 2 || ln > 40) continue;
        if (i + 4 + ln > b.length) break; // need more bytes
        const body = b.slice(i + 2, i + 4 + ln); // id len err params chk
        let sum = 0;
        for (let k = 0; k < body.length - 1; k++) sum += body[k];
        const ok = (~sum & 0xff) === body[body.length - 1];
        b.splice(0, i + 4 + ln);
        if (ok && (pid === id || id === -1)) return { err: body[2], params: body.slice(3, body.length - 1) };
        i = -1;
      }
      const left = end - performance.now();
      if (left <= 0) { this.errors++; return null; }
      await this.waitData(left);
    }
  }

  ping(id: number) {
    return this.exclusive(async () => {
      this.buf.length = 0;
      await this.tx(id, INST.PING);
      return (await this.rx(id, 15)) !== null;
    });
  }

  read(id: number, addr: number, len: number) {
    return this.exclusive(async () => {
      this.buf.length = 0;
      await this.tx(id, INST.READ, [addr, len]);
      const r = await this.rx(id, 25);
      if (!r || r.params.length < len) return null;
      return r.params;
    });
  }

  async readInt(id: number, addr: number, len = 1) {
    const p = await this.read(id, addr, len);
    if (!p) return null;
    return len === 2 ? p[0] | (p[1] << 8) : p[0];
  }

  write(id: number, addr: number, data: number[]) {
    return this.exclusive(async () => {
      this.buf.length = 0;
      await this.tx(id, INST.WRITE, [addr, ...data]);
      if (id === BROADCAST) { await sleep(2); return true; }
      return (await this.rx(id, 20)) !== null;
    });
  }

  writeInt(id: number, addr: number, value: number, len = 1) {
    return this.write(id, addr, len === 2 ? [value & 0xff, (value >> 8) & 0xff] : [value & 0xff]);
  }

  syncWrite(addr: number, len: number, entries: { id: number; data: number[] }[]) {
    return this.exclusive(async () => {
      const params = [addr, len];
      for (const e of entries) params.push(e.id, ...e.data);
      await this.tx(BROADCAST, INST.SYNC_WRITE, params);
      return true;
    });
  }

  /** read position+telemetry block (regs 56..70) */
  async readTelemetry(id: number): Promise<MotorTelemetry | null> {
    const p = await this.read(id, REG.PRESENT, 15);
    if (!p) return null;
    const u16 = (i: number) => p[i] | (p[i + 1] << 8);
    const signed = (v: number) => ((v & 0x400) ? -(v & 0x3ff) : v & 0x3ff);
    return {
      id,
      pos: u16(0),
      vel: signed(u16(2)),
      load: signed(u16(4)),
      volt: p[6] / 10,
      temp: p[7],
      moving: p[10] === 1,
      current: u16(13) * 6.5,
    };
  }

  async scan(from = 1, to = 12): Promise<number[]> {
    const found: number[] = [];
    for (let id = from; id <= to; id++) if (await this.ping(id)) found.push(id);
    return found;
  }

  async setTorque(ids: number[], on: boolean) {
    for (const id of ids) await this.writeInt(id, REG.TORQUE_EN, on ? 1 : 0);
  }
  /** broadcast torque off – used by E-stop (one packet, no replies) */
  async emergencyTorqueOff() {
    await this.write(BROADCAST, REG.TORQUE_EN, [0]);
    await this.write(BROADCAST, REG.TORQUE_EN, [0]);
  }

  /** same registers LeRobot's SO101Follower.configure() writes */
  async configureFollower(ids: number[], torqueCap = 1000) {
    for (const id of ids) {
      await this.writeInt(id, REG.TORQUE_EN, 0);
      await this.writeInt(id, REG.LOCK, 0);
      await this.writeInt(id, REG.RETURN_DELAY, 0);
      await this.writeInt(id, REG.MAX_ACCEL, 254);
      await this.writeInt(id, REG.MODE, 0);
      await this.writeInt(id, REG.P, 16);
      await this.writeInt(id, REG.I, 0);
      await this.writeInt(id, REG.D, 32);
      if (id === 6) {
        await this.writeInt(id, REG.MAX_TORQUE, 500, 2);
        await this.writeInt(id, REG.PROT_CURRENT, 250, 2);
        await this.writeInt(id, REG.OVERLOAD, 25);
      }
      await this.writeInt(id, REG.LOCK, 1);
      await this.writeInt(id, REG.ACCEL, 254);
      await this.writeInt(id, REG.TORQUE_LIMIT, torqueCap, 2);
    }
  }

  /** assign a new id to the single motor connected (used by the in-browser motor setup wizard) */
  async setMotorId(oldId: number, newId: number) {
    await this.writeInt(oldId, REG.TORQUE_EN, 0);
    await this.writeInt(oldId, REG.LOCK, 0);
    await this.writeInt(oldId, REG.BAUD, 0); // 0 = 1 Mbps
    await this.writeInt(oldId, REG.ID, newId);
    await sleep(60);
    const ok = await this.ping(newId);
    if (ok) await this.writeInt(newId, REG.LOCK, 1);
    return ok;
  }
}

export function calibrationToLeRobotJson(c: Calibration) { return JSON.stringify(c, null, 4); }
export function parseCalibration(text: string): Calibration {
  const j = JSON.parse(text);
  const out = defaultCalibration();
  for (const name of JOINTS) {
    const e = j[name];
    if (!e) throw new Error(`missing joint "${name}"`);
    out[name] = {
      id: Number(e.id), drive_mode: Number(e.drive_mode ?? 0), homing_offset: Number(e.homing_offset ?? 0),
      range_min: Number(e.range_min), range_max: Number(e.range_max),
    };
  }
  return out;
}
