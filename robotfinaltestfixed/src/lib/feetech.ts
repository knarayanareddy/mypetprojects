/**
 * Feetech STS3215 (SCS protocol) driver used by the SO-101.
 * Pure TypeScript, transport-agnostic: runs over Web Serial in the browser,
 * or over SimServoTransport (a register-level virtual bus) for tests / demo.
 */

export const REG = {
  MODEL: 3,
  ID: 5,
  BAUD: 6,
  RETURN_DELAY: 7,
  MIN_POS_LIMIT: 9,
  MAX_POS_LIMIT: 11,
  MAX_TEMP: 13,
  MAX_TORQUE_LIMIT: 16,
  P_COEF: 21,
  D_COEF: 22,
  I_COEF: 23,
  /** 2 bytes. LeRobot STS_SMS control table: Protection_Current = (28, 2). NOT 34 (see PROTECTIVE_TORQUE). */
  PROTECTION_CURRENT: 28,
  HOMING_OFFSET: 31,
  OPERATING_MODE: 33,
  /** 1 byte. A different register that used to be overwritten by mistake. Never written by this app. */
  PROTECTIVE_TORQUE: 34,
  PROTECTION_TIME: 35,
  OVERLOAD_TORQUE: 36,
  TORQUE_ENABLE: 40,
  ACCELERATION: 41,
  GOAL_POS: 42,
  GOAL_TIME: 44,
  GOAL_SPEED: 46,
  TORQUE_LIMIT: 48,
  LOCK: 55,
  PRESENT_POS: 56,
  PRESENT_SPEED: 58,
  PRESENT_LOAD: 60,
  PRESENT_VOLTAGE: 62,
  PRESENT_TEMP: 63,
  MOVING: 66,
  PRESENT_CURRENT: 69,
} as const;

export const INST = { PING: 1, READ: 2, WRITE: 3, REG_WRITE: 4, ACTION: 5, SYNC_READ: 0x82, SYNC_WRITE: 0x83 } as const;
export const BROADCAST = 0xfe;
export const STEPS_PER_REV = 4096;
export const BAUD_CODES: Record<number, number> = { 1000000: 0, 500000: 1, 250000: 2, 128000: 3, 115200: 4, 76800: 5, 57600: 6, 38400: 7 };

export function checksum(bytes: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < bytes.length; i++) s += bytes[i];
  return ~s & 0xff;
}

export function buildPacket(id: number, inst: number, params: number[] = []): Uint8Array {
  const len = params.length + 2;
  const body = [id, len, inst, ...params];
  return Uint8Array.from([0xff, 0xff, ...body, checksum(body)]);
}

export function buildRead(id: number, addr: number, n: number): Uint8Array {
  return buildPacket(id, INST.READ, [addr, n]);
}

export function buildWrite(id: number, addr: number, data: number[]): Uint8Array {
  return buildPacket(id, INST.WRITE, [addr, ...data]);
}

export function buildSyncWrite(addr: number, entries: { id: number; data: number[] }[]): Uint8Array {
  const dl = entries[0]?.data.length ?? 0;
  const params: number[] = [addr, dl];
  for (const e of entries) {
    if (e.data.length !== dl) throw new Error("sync write: unequal data lengths");
    params.push(e.id, ...e.data);
  }
  return buildPacket(BROADCAST, INST.SYNC_WRITE, params);
}

export const u16 = (v: number): number[] => [v & 0xff, (v >> 8) & 0xff];
export const fromU16 = (lo: number, hi: number): number => lo | (hi << 8);

/** Sign-magnitude encode (Feetech uses this for offsets / speed / load). */
export function encodeSignMag(v: number, signBit: number): number {
  return v < 0 ? (1 << signBit) | Math.abs(v) : v;
}
export function decodeSignMag(raw: number, signBit: number): number {
  const mag = raw & ((1 << signBit) - 1);
  return raw & (1 << signBit) ? -mag : mag;
}

export interface StatusPacket {
  id: number;
  error: number;
  params: number[];
}

/** Find the first valid status packet in a buffer. Returns packet + bytes consumed. */
export function parseStatus(buf: number[]): { pkt: StatusPacket; consumed: number } | null {
  for (let i = 0; i + 5 <= buf.length; i++) {
    if (buf[i] !== 0xff || buf[i + 1] !== 0xff) continue;
    const id = buf[i + 2];
    const len = buf[i + 3];
    if (len < 2 || len > 250) continue;
    const end = i + 4 + len;
    if (end > buf.length) return null; // incomplete: wait for more bytes
    const body = buf.slice(i + 2, end - 1);
    if (checksum(body) !== buf[end - 1]) continue; // corrupt, resync
    return { pkt: { id, error: buf[i + 4], params: buf.slice(i + 5, end - 1) }, consumed: end };
  }
  return null;
}

export interface Transport {
  write(data: Uint8Array): Promise<void>;
  /** Wait up to timeoutMs for at least one byte; returns what is available (maybe empty). */
  read(timeoutMs: number): Promise<number[]>;
  /** Discard pending RX bytes. */
  flush(): Promise<void>;
  close(): Promise<void>;
}

export class BusError extends Error {}

export class ServoBus {
  private chain: Promise<unknown> = Promise.resolve();
  constructor(public transport: Transport, public timeoutMs = 25) {}

  private lock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async transact(packet: Uint8Array, expectId: number): Promise<StatusPacket | null> {
    await this.transport.flush();
    await this.transport.write(packet);
    let buf: number[] = [];
    const deadline = Date.now() + this.timeoutMs;
    while (Date.now() < deadline) {
      const chunk = await this.transport.read(Math.max(1, deadline - Date.now()));
      if (chunk.length) buf = buf.concat(chunk);
      for (;;) {
        const r = parseStatus(buf);
        if (!r) break;
        buf = buf.slice(r.consumed);
        if (r.pkt.id === expectId) return r.pkt;
      }
    }
    return null;
  }

  ping(id: number): Promise<boolean> {
    return this.lock(async () => (await this.transact(buildPacket(id, INST.PING), id)) !== null);
  }

  /** Read n bytes at addr; retries on timeouts. Throws BusError when the motor never answers. */
  read(id: number, addr: number, n: number, retries = 2): Promise<number[]> {
    return this.lock(async () => {
      for (let t = 0; t <= retries; t++) {
        const r = await this.transact(buildRead(id, addr, n), id);
        if (r && r.params.length === n) return r.params;
      }
      throw new BusError(`motor ${id}: no reply reading reg ${addr}`);
    });
  }

  async read16(id: number, addr: number): Promise<number> {
    const [lo, hi] = await this.read(id, addr, 2);
    return fromU16(lo, hi);
  }
  async read8(id: number, addr: number): Promise<number> {
    return (await this.read(id, addr, 1))[0];
  }

  write(id: number, addr: number, data: number[], retries = 1): Promise<void> {
    return this.lock(async () => {
      for (let t = 0; t <= retries; t++) {
        const r = await this.transact(buildWrite(id, addr, data), id);
        if (r) return;
      }
      throw new BusError(`motor ${id}: no ack writing reg ${addr}`);
    });
  }
  write8(id: number, addr: number, v: number) {
    return this.write(id, addr, [v & 0xff]);
  }
  write16(id: number, addr: number, v: number) {
    return this.write(id, addr, u16(v));
  }

  syncWrite(addr: number, entries: { id: number; data: number[] }[]): Promise<void> {
    return this.lock(async () => {
      await this.transport.write(buildSyncWrite(addr, entries));
    });
  }

  async scan(ids = [1, 2, 3, 4, 5, 6]): Promise<number[]> {
    const found: number[] = [];
    for (const id of ids) if (await this.ping(id)) found.push(id);
    return found;
  }
}

// ---------------------------------------------------------------------------
// Register-level simulated bus (STS3215 x N). Used for demo mode & tests.
// ---------------------------------------------------------------------------

export interface SimMotorInit {
  id: number;
  pos: number;
}

export class SimServoTransport implements Transport {
  regs = new Map<number, Uint8Array>();
  private rx: number[] = [];
  private last = new Map<number, number>();
  private pos = new Map<number, number>();
  /** Optional world coupling: returns the lowest raw position the gripper may reach (an object between the jaws). */
  gripperObstacle: ((positions: Map<number, number>) => number | null) | null = null;
  gripperId = 6;
  stalled = new Map<number, boolean>();
  /** Fault injection for tests. */
  dropPackets = false;

  constructor(motors: SimMotorInit[], public speedStepsPerS = 1800) {
    for (const m of motors) {
      const r = new Uint8Array(128);
      r[REG.ID] = m.id;
      r[REG.MODEL] = 777 & 0xff;
      r[REG.MODEL + 1] = 777 >> 8;
      r.set(u16(m.pos), REG.GOAL_POS);
      r.set(u16(m.pos), REG.PRESENT_POS);
      r.set(u16(0), REG.MIN_POS_LIMIT);
      r.set(u16(4095), REG.MAX_POS_LIMIT);
      r[REG.LOCK] = 1; // like the real servo after power-up: EEPROM (addr < 40) is write-protected until Lock = 0
      r[REG.PRESENT_VOLTAGE] = 74; // 7.4 V
      r[REG.PRESENT_TEMP] = 32;
      this.regs.set(m.id, r);
      this.pos.set(m.id, m.pos);
      this.last.set(m.id, Date.now());
    }
  }

  positions() {
    return this.pos;
  }

  private advance(id: number) {
    const r = this.regs.get(id)!;
    const now = Date.now();
    const dt = (now - (this.last.get(id) ?? now)) / 1000;
    this.last.set(id, now);
    let p = this.pos.get(id)!;
    this.stalled.set(id, false);
    if (r[REG.TORQUE_ENABLE]) {
      let goal = r[REG.GOAL_POS] | (r[REG.GOAL_POS + 1] << 8);
      const lo = r[REG.MIN_POS_LIMIT] | (r[REG.MIN_POS_LIMIT + 1] << 8);
      const hi = r[REG.MAX_POS_LIMIT] | (r[REG.MAX_POS_LIMIT + 1] << 8);
      if (hi > lo) goal = Math.min(hi, Math.max(lo, goal));
      const sp = (r[REG.GOAL_SPEED] | (r[REG.GOAL_SPEED + 1] << 8)) || this.speedStepsPerS;
      const maxStep = Math.min(sp, this.speedStepsPerS * 1.5) * dt;
      let next = Math.abs(goal - p) <= maxStep ? goal : p + Math.sign(goal - p) * maxStep;
      if (id === this.gripperId && this.gripperObstacle) {
        const lim = this.gripperObstacle(this.pos);
        if (lim !== null && next < lim && goal < lim) {
          next = Math.max(next, lim);
          this.stalled.set(id, true);
        }
      }
      p = next;
    }
    this.pos.set(id, p);
    r.set(u16(Math.round(p) & 0xffff), REG.PRESENT_POS);
    const stalled = this.stalled.get(id);
    r.set(u16(stalled ? 420 | (1 << 10) : 18), REG.PRESENT_LOAD);
  }

  async write(data: Uint8Array): Promise<void> {
    if (this.dropPackets) return;
    const id = data[2];
    const len = data[3];
    const inst = data[4];
    if (inst === INST.SYNC_WRITE) {
      const addr = data[5];
      const dl = data[6];
      for (let i = 7; i + dl < data.length; i += dl + 1) {
        const r = this.regs.get(data[i]);
        if (r) for (let k = 0; k < dl; k++) r[addr + k] = data[i + 1 + k];
      }
      return;
    }
    const r = this.regs.get(id);
    if (!r) return; // silent: like a real empty bus
    if (inst === INST.PING) return this.reply(id, []);
    if (inst === INST.READ) {
      const addr = data[5];
      const n = data[6];
      this.advance(id);
      return this.reply(id, Array.from(r.slice(addr, addr + n)));
    }
    if (inst === INST.WRITE) {
      const addr = data[5];
      const payload = Array.from(data.slice(6, 6 + len - 3));
      if (addr < 40 && r[REG.LOCK] === 1) return this.reply(id, []); // acked but ignored: EEPROM is locked
      if (addr === REG.ID) {
        // re-address the motor
        this.regs.delete(id);
        r[REG.ID] = payload[0];
        this.regs.set(payload[0], r);
        this.pos.set(payload[0], this.pos.get(id)!);
        this.last.set(payload[0], Date.now());
        return this.reply(payload[0], []);
      }
      for (let k = 0; k < payload.length; k++) r[addr + k] = payload[k];
      return this.reply(id, []);
    }
  }

  private reply(id: number, params: number[]) {
    const body = [id, params.length + 2, 0, ...params];
    this.rx.push(0xff, 0xff, ...body, checksum(body));
  }

  async read(timeoutMs: number): Promise<number[]> {
    if (this.rx.length) {
      const out = this.rx;
      this.rx = [];
      return out;
    }
    await new Promise((r) => setTimeout(r, Math.min(timeoutMs, 3)));
    return [];
  }
  async flush() {
    this.rx = [];
  }
  async close() {}
}
