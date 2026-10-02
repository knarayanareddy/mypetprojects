// Feetech STS3215 bus driver over the browser Web Serial API.
// Protocol: FF FF ID LEN INST PARAMS... CHK  (CHK = ~(ID+LEN+INST+PARAMS) & 0xFF), 1 Mbps, half-duplex via the
// Waveshare / Feetech URT-1 bus adapter that ships with SO-101 kits.
import { JOINTS, clamp } from "./kin";

// ── Calibration semantics (mirrors lerobot FeetechMotorsBus) ───────────────────────────────────
// LeRobot does NOT apply homing_offset in software. It writes it into each servo's Homing_Offset register
// (31, sign-magnitude bit 11) together with Min/Max_Position_Limit (9 / 11). The servo then reports
// Present_Position already homed (raw − offset, wrapped to 0‥4095). So `rawToNorm` below must only ever see
// *homed* positions – which is why `writeCalibration()` / `readCalibration()` / `matchesMotors()` exist:
// the app verifies (and if you ask it to, writes) the same EEPROM state LeRobot expects before torque is enabled.
export const HOMING_SIGN_BIT = 11;
export const encodeSignMagnitude = (v: number, bit: number) => (v < 0 ? (1 << bit) | -v : v);
export const decodeSignMagnitude = (v: number, bit: number) => (v & (1 << bit) ? -(v & ((1 << bit) - 1)) : v);

export const REG = {
  ID: 5,
  BAUD: 6,
  RETURN_DELAY: 7,
  MIN_LIMIT: 9,
  MAX_LIMIT: 11,
  MAX_TORQUE: 16,
  PHASE: 18,
  P: 21,
  D: 22,
  I: 23,
  PROT_CURRENT: 28,
  HOMING_OFFSET: 31,
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

/** raw = servo Present_Position, i.e. ALREADY homed by the servo (see header note). Matches lerobot RANGE_M100_100 / RANGE_0_100. */
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

  async open(baud = 1_000_000, inUse: { port: unknown; who: string }[] = []) {
    const serial = (navigator as any).serial;
    if (!serial) throw new Error("Web Serial is not available. Use desktop Chrome or Edge over https/localhost.");
    const port = await serial.requestPort();
    const clash = inUse.find((u) => u.port === port);
    if (clash) throw new Error(`That serial port is already connected as ${clash.who}. Two SO-101 arms need two separate USB bus adapters – pick the other one.`);
    this.port = port;
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
    // upstream STS_SMS_SERIES_ENCODINGS_TABLE: Present_Load → sign bit 10, Present_Velocity → sign bit 15
    return {
      id,
      pos: u16(0),
      vel: decodeSignMagnitude(u16(2), 15),
      load: decodeSignMagnitude(u16(4), 10),
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
      // STS3215: clear bit 4 of Phase so Present_Position stays in 0‥4095 (lerobot configure_motors)
      const ph = await this.readInt(id, REG.PHASE, 1);
      if (ph !== null && (ph & 0x10)) await this.writeInt(id, REG.PHASE, ph & ~0x10);
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


  // ---- calibration in servo EEPROM (same registers as lerobot write_calibration/read_calibration) ----
  async readCalibration(ids: number[]): Promise<Calibration | null> {
    const out = defaultCalibration();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const off = await this.readInt(id, REG.HOMING_OFFSET, 2);
      const mn = await this.readInt(id, REG.MIN_LIMIT, 2);
      const mx = await this.readInt(id, REG.MAX_LIMIT, 2);
      if (off === null || mn === null || mx === null) return null;
      out[JOINTS[i]] = { id, drive_mode: 0, homing_offset: decodeSignMagnitude(off, HOMING_SIGN_BIT), range_min: mn, range_max: mx };
    }
    return out;
  }

  /** torque must be off. Unlocks EEPROM, writes offset + limits, re-locks. */
  async writeCalibration(cal: Calibration) {
    for (const j of JOINTS) {
      const c = cal[j];
      await this.writeInt(c.id, REG.TORQUE_EN, 0);
      await this.writeInt(c.id, REG.LOCK, 0);
      await this.writeInt(c.id, REG.HOMING_OFFSET, encodeSignMagnitude(Math.round(c.homing_offset), HOMING_SIGN_BIT), 2);
      await this.writeInt(c.id, REG.MIN_LIMIT, Math.round(c.range_min), 2);
      await this.writeInt(c.id, REG.MAX_LIMIT, Math.round(c.range_max), 2);
      await this.writeInt(c.id, REG.LOCK, 1);
    }
  }

  /** lerobot reset_calibration(): offset 0, limits 0‥4095 */
  async resetCalibration(ids: number[]) {
    for (const id of ids) {
      await this.writeInt(id, REG.TORQUE_EN, 0);
      await this.writeInt(id, REG.LOCK, 0);
      await this.writeInt(id, REG.HOMING_OFFSET, 0, 2);
      await this.writeInt(id, REG.MIN_LIMIT, 0, 2);
      await this.writeInt(id, REG.MAX_LIMIT, 4095, 2);
      await this.writeInt(id, REG.LOCK, 1);
    }
  }

  /**
   * lerobot set_half_turn_homings(): reset, read raw positions, write offset = position − 2047 so that the
   * pose the user is holding (middle of every range) reads exactly 2047. Returns the offsets written.
   */
  async setHalfTurnHomings(ids: number[]): Promise<number[]> {
    await this.resetCalibration(ids);
    await sleep(30);
    const offsets: number[] = [];
    for (const id of ids) {
      const pos = await this.readInt(id, REG.PRESENT, 2);
      if (pos === null) throw new Error(`motor ${id} did not answer while homing`);
      const off = pos - 2047;
      await this.writeInt(id, REG.LOCK, 0);
      await this.writeInt(id, REG.HOMING_OFFSET, encodeSignMagnitude(off, HOMING_SIGN_BIT), 2);
      await this.writeInt(id, REG.LOCK, 1);
      offsets.push(off);
    }
    await sleep(30);
    return offsets;
  }

  /** lerobot `is_calibrated`: do the servos' stored limits/offsets equal this calibration? */
  async matchesMotors(cal: Calibration, ids: number[]): Promise<{ ok: boolean; why: string }> {
    const m = await this.readCalibration(ids);
    if (!m) return { ok: false, why: "could not read servo EEPROM" };
    for (const j of JOINTS) {
      const a = cal[j], b = m[j];
      if (a.range_min !== b.range_min || a.range_max !== b.range_max) return { ok: false, why: `${j}: limits ${b.range_min}‥${b.range_max} on servo vs ${a.range_min}‥${a.range_max} in file` };
      if (a.homing_offset !== b.homing_offset) return { ok: false, why: `${j}: homing offset ${b.homing_offset} on servo vs ${a.homing_offset} in file` };
    }
    return { ok: true, why: "servo EEPROM matches calibration file" };
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
