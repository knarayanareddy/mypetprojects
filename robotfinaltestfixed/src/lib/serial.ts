import type { Transport } from "./feetech";

/** Minimal Web Serial typings (not part of lib.dom in all TS versions). */
interface SerialPortLike {
  open(o: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo?(): { usbVendorId?: number; usbProductId?: number };
}
interface SerialApi {
  requestPort(o?: { filters?: { usbVendorId?: number }[] }): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

export function webSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

function api(): SerialApi {
  return (navigator as unknown as { serial: SerialApi }).serial;
}

export class WebSerialTransport implements Transport {
  private rx: number[] = [];
  private waiters: (() => void)[] = [];
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private closed = false;

  private constructor(private port: SerialPortLike) {}

  /** Must be called from a user gesture (button click). */
  static async request(baudRate = 1_000_000): Promise<WebSerialTransport> {
    if (!webSerialSupported()) throw new Error("Web Serial is not available. Use Chrome or Edge (desktop) over https or localhost.");
    const port = await api().requestPort();
    await port.open({ baudRate });
    const t = new WebSerialTransport(port);
    t.start();
    return t;
  }

  portLabel(): string {
    const i = this.port.getInfo?.();
    return i?.usbVendorId ? `USB ${i.usbVendorId.toString(16)}:${(i.usbProductId ?? 0).toString(16)}` : "serial port";
  }

  private start() {
    if (!this.port.readable || !this.port.writable) throw new Error("Port streams unavailable");
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
    void (async () => {
      try {
        while (!this.closed && this.reader) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            for (const b of value) this.rx.push(b);
            const w = this.waiters;
            this.waiters = [];
            w.forEach((f) => f());
          }
        }
      } catch {
        /* port unplugged */
      } finally {
        this.closed = true;
        this.waiters.forEach((f) => f());
      }
    })();
  }

  get isOpen() {
    return !this.closed;
  }

  async write(data: Uint8Array) {
    if (this.closed || !this.writer) throw new Error("Serial port closed (unplugged?)");
    await this.writer.write(data);
  }

  async read(timeoutMs: number): Promise<number[]> {
    if (!this.rx.length && !this.closed) {
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, timeoutMs);
        this.waiters.push(() => {
          clearTimeout(t);
          resolve();
        });
      });
    }
    const out = this.rx;
    this.rx = [];
    return out;
  }

  async flush() {
    this.rx = [];
  }

  async close() {
    this.closed = true;
    try {
      await this.reader?.cancel();
    } catch {}
    try {
      this.reader?.releaseLock();
    } catch {}
    try {
      this.writer?.releaseLock();
    } catch {}
    try {
      await this.port.close();
    } catch {}
  }
}
