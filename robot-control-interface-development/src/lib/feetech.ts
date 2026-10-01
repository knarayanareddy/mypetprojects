/* Minimal Feetech STS3215 (SCS protocol) driver over the Web Serial API.
   Packet: FF FF ID LEN INSTR PARAMS… CHK   (CHK = ~(ID+LEN+INSTR+ΣPARAMS) & 0xFF)
   Runs entirely in the browser (Chrome / Edge) — no Python needed for direct control.
   NOTE: close LeRobot / any other program that has the serial port open first. */

export const ADDR = {
  MODE: 33,
  P: 21,
  I: 22,
  D: 23,
  TORQUE_ENABLE: 40,
  ACCEL: 41,
  GOAL_POS: 42,
  GOAL_SPEED: 46,
  TORQUE_LIMIT: 48,
  LOCK: 55,
  PRESENT_POS: 56,
} as const;

const INSTR = { PING: 0x01, READ: 0x02, WRITE: 0x03, SYNC_READ: 0x82, SYNC_WRITE: 0x83 } as const;
const BROADCAST = 0xfe;

interface SerialPortLike {
  open(o: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}

export interface Telemetry {
  pos: number;
  speed: number;
  load: number; // signed, ±1000
  volt: number; // volts
  temp: number; // °C
}

interface Status {
  id: number;
  err: number;
  data: number[];
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class FeetechBus {
  private port: SerialPortLike | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private rx: number[] = [];
  private running = false;
  private chain: Promise<unknown> = Promise.resolve();
  portLabel = "";

  static supported(): boolean {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  async connect(baud = 1_000_000) {
    const serial = (navigator as unknown as { serial: { requestPort(): Promise<SerialPortLike> } }).serial;
    this.port = await serial.requestPort();
    await this.port.open({ baudRate: baud });
    if (!this.port.writable || !this.port.readable) throw new Error("Serial port is not readable/writable");
    const info = this.port.getInfo?.();
    this.portLabel = info?.usbVendorId ? `USB ${info.usbVendorId.toString(16)}:${(info.usbProductId ?? 0).toString(16)}` : "serial port";
    this.writer = this.port.writable.getWriter();
    this.running = true;
    void this.pump();
  }

  private async pump() {
    if (!this.port?.readable) return;
    const reader = this.port.readable.getReader();
    this.reader = reader;
    try {
      while (this.running) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) for (const b of value) this.rx.push(b);
        if (this.rx.length > 4096) this.rx.splice(0, this.rx.length - 1024);
      }
    } catch {
      /* port closed */
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* ignore */
      }
    }
  }

  async disconnect() {
    this.running = false;
    try {
      await this.reader?.cancel();
    } catch {
      /* ignore */
    }
    try {
      this.writer?.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      await this.port?.close();
    } catch {
      /* ignore */
    }
    this.port = null;
    this.writer = null;
    this.reader = null;
  }

  /** Serialise bus transactions. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn) as Promise<T>;
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private static packet(id: number, instr: number, params: number[]): Uint8Array {
    const len = params.length + 2;
    let sum = id + len + instr;
    for (const p of params) sum += p;
    return Uint8Array.from([0xff, 0xff, id, len, instr, ...params, ~sum & 0xff]);
  }

  private async tx(p: Uint8Array) {
    if (!this.writer) throw new Error("Not connected");
    this.rx.length = 0;
    await this.writer.write(p);
  }

  private parse(): Status[] {
    const out: Status[] = [];
    for (;;) {
      while (this.rx.length >= 2 && !(this.rx[0] === 0xff && this.rx[1] === 0xff)) this.rx.shift();
      if (this.rx.length < 4) break;
      const len = this.rx[3];
      const total = len + 4;
      if (len < 2 || len > 40) {
        this.rx.splice(0, 2);
        continue;
      }
      if (this.rx.length < total) break;
      const pk = this.rx.splice(0, total);
      let sum = 0;
      for (let i = 2; i < total - 1; i++) sum += pk[i];
      if ((~sum & 0xff) !== pk[total - 1]) continue;
      out.push({ id: pk[2], err: pk[4], data: pk.slice(5, total - 1) });
    }
    return out;
  }

  private async collect(n: number, timeoutMs: number): Promise<Status[]> {
    const got: Status[] = [];
    const t0 = performance.now();
    while (got.length < n && performance.now() - t0 < timeoutMs) {
      got.push(...this.parse());
      if (got.length >= n) break;
      await sleep(1);
    }
    return got;
  }

  ping(id: number): Promise<boolean> {
    return this.exclusive(async () => {
      await this.tx(FeetechBus.packet(id, INSTR.PING, []));
      const r = await this.collect(1, 60);
      return r.some((s) => s.id === id);
    });
  }

  write(id: number, addr: number, bytes: number[]): Promise<void> {
    return this.exclusive(async () => {
      await this.tx(FeetechBus.packet(id, INSTR.WRITE, [addr, ...bytes]));
      await this.collect(1, 15);
    });
  }

  syncWrite(addr: number, entries: { id: number; bytes: number[] }[]): Promise<void> {
    return this.exclusive(async () => {
      const dlen = entries[0].bytes.length;
      const params = [addr, dlen];
      for (const e of entries) params.push(e.id, ...e.bytes);
      await this.tx(FeetechBus.packet(BROADCAST, INSTR.SYNC_WRITE, params));
    });
  }

  syncRead(ids: number[], addr: number, len: number): Promise<Map<number, number[]>> {
    return this.exclusive(async () => {
      await this.tx(FeetechBus.packet(BROADCAST, INSTR.SYNC_READ, [addr, len, ...ids]));
      const res = await this.collect(ids.length, 40);
      const m = new Map<number, number[]>();
      for (const s of res) if (s.data.length >= len) m.set(s.id, s.data.slice(0, len));
      return m;
    });
  }

  /* ---------------- high-level helpers ---------------- */
  async readTelemetry(ids: number[]): Promise<(Telemetry | null)[]> {
    const m = await this.syncRead(ids, ADDR.PRESENT_POS, 8);
    return ids.map((id) => {
      const d = m.get(id);
      if (!d) return null;
      const u16 = (lo: number, hi: number) => d[lo] | (d[hi] << 8);
      const sgn15 = (v: number) => ((v & 0x8000) !== 0 ? -(v & 0x7fff) : v);
      const l = u16(4, 5);
      return { pos: u16(0, 1) & 0x0fff, speed: sgn15(u16(2, 3)), load: (l & 0x400 ? -1 : 1) * (l & 0x3ff), volt: d[6] / 10, temp: d[7] };
    });
  }

  async setTorque(ids: number[], on: boolean) {
    await this.syncWrite(ADDR.TORQUE_ENABLE, ids.map((id) => ({ id, bytes: [on ? 1 : 0] })));
  }

  /** LeRobot-style follower configuration: position mode, P=16 I=0 D=32 (smoother than defaults). */
  async configureFollower(ids: number[], opts: { accel: number; speed: number; torqueLimit: number }) {
    await this.setTorque(ids, false);
    for (const id of ids) {
      await this.write(id, ADDR.LOCK, [0]);
      await this.write(id, ADDR.MODE, [0]);
      await this.write(id, ADDR.P, [16]);
      await this.write(id, ADDR.I, [0]);
      await this.write(id, ADDR.D, [32]);
      await this.write(id, ADDR.LOCK, [1]);
    }
    await this.setLimits(ids, opts);
  }

  async setLimits(ids: number[], o: { accel: number; speed: number; torqueLimit: number }) {
    for (const id of ids) {
      await this.write(id, ADDR.ACCEL, [Math.max(0, Math.min(254, o.accel))]);
      await this.write(id, ADDR.GOAL_SPEED, [o.speed & 0xff, (o.speed >> 8) & 0xff]);
      await this.write(id, ADDR.TORQUE_LIMIT, [o.torqueLimit & 0xff, (o.torqueLimit >> 8) & 0xff]);
    }
  }

  async writeGoals(ids: number[], raws: number[]) {
    await this.syncWrite(
      ADDR.GOAL_POS,
      ids.map((id, i) => {
        const v = Math.max(0, Math.min(4095, Math.round(raws[i])));
        return { id, bytes: [v & 0xff, (v >> 8) & 0xff] };
      }),
    );
  }
}
