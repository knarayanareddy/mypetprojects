/* Client-side policy runner.  The browser is the robot runtime (cameras + serial);
   the model runs wherever you like (Python policy server, cloud GPU, anything that
   speaks the small HTTP contract below).

   POST {endpoint}/predict
     { task: string, state: number[]  // LeRobot-normalised joints (6 per arm, ±100, gripper 0..100)
       images: { [cameraKey]: base64-jpeg }, arm: "a"|"b"|"both", fps: number }
   →   { actions: number[][] }       // action chunk, same normalisation, one row per timestep   */

export type ArmSel = "a" | "b" | "both";

export interface PolicyCfg {
  endpoint: string; // "demo://loopback" for the built-in connectivity test
  task: string;
  fps: number;
  prefetch: number; // request a new chunk when the queue drops to this size
  arms: ArmSel;
}

export interface PolicyIO {
  state: () => number[] | null;
  images: () => Record<string, string>;
  apply: (action: number[]) => void;
  onLog: (msg: string) => void;
}

export interface PolicyStats {
  latencyMs: number;
  requests: number;
  errors: number;
  queue: number;
  steps: number;
  lastError: string;
}

export class PolicyRunner {
  running = false;
  stats: PolicyStats = { latencyMs: 0, requests: 0, errors: 0, queue: 0, steps: 0, lastError: "" };
  private queue: number[][] = [];
  private inflight = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private anchor: number[] | null = null;
  private phase = 0;

  constructor(
    private cfg: PolicyCfg,
    private io: PolicyIO,
  ) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.queue = [];
    this.anchor = null;
    this.timer = setInterval(() => void this.tick(), 1000 / this.cfg.fps);
    this.io.onLog(`policy started → ${this.cfg.endpoint} · task “${this.cfg.task}” · ${this.cfg.fps} Hz`);
  }

  stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.queue = [];
    this.io.onLog("policy stopped");
  }

  private async tick() {
    if (!this.running) return;
    if (this.queue.length <= this.cfg.prefetch && !this.inflight) void this.request();
    const a = this.queue.shift();
    if (a) {
      this.io.apply(a);
      this.stats.steps++;
    }
    this.stats.queue = this.queue.length;
  }

  private demoChunk(state: number[]): number[][] {
    if (!this.anchor) this.anchor = [...state];
    const out: number[][] = [];
    for (let k = 0; k < 30; k++) {
      this.phase += 0.07;
      const a = [...this.anchor];
      for (let i = 0; i < a.length; i += 6) {
        a[i] += 22 * Math.sin(this.phase); // pan sweep
        a[i + 3] += 12 * Math.sin(this.phase * 1.7); // wrist nod
        a[i + 5] = 40 + 30 * Math.sin(this.phase * 2.3); // gripper breathing
      }
      out.push(a);
    }
    return out;
  }

  private async request() {
    const state = this.io.state();
    if (!state) {
      this.stats.lastError = "no robot state (is the follower connected with torque on?)";
      return;
    }
    this.inflight = true;
    const t0 = performance.now();
    try {
      let actions: number[][];
      if (this.cfg.endpoint.startsWith("demo://")) {
        actions = this.demoChunk(state);
      } else {
        const r = await fetch(this.cfg.endpoint.replace(/\/$/, "") + "/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: this.cfg.task, state, images: this.io.images(), arm: this.cfg.arms, fps: this.cfg.fps }),
        });
        if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
        const j = (await r.json()) as { actions?: number[][] };
        if (!j.actions?.length) throw new Error("server returned no actions");
        actions = j.actions;
      }
      const lat = performance.now() - t0;
      // drop actions that would already be "in the past" (RTC-lite latency compensation)
      const skip = Math.min(Math.floor((lat / 1000) * this.cfg.fps), actions.length - 1);
      this.queue.push(...actions.slice(skip));
      this.stats.latencyMs = this.stats.latencyMs * 0.7 + lat * 0.3;
      this.stats.requests++;
      this.stats.lastError = "";
    } catch (e) {
      this.stats.errors++;
      this.stats.lastError = e instanceof Error ? e.message : String(e);
    } finally {
      this.inflight = false;
    }
  }
}

export async function policyHealth(endpoint: string): Promise<{ ok: boolean; info?: Record<string, unknown>; error?: string }> {
  if (endpoint.startsWith("demo://")) return { ok: true, info: { policy: "demo loopback" } };
  try {
    const r = await fetch(endpoint.replace(/\/$/, "") + "/health");
    if (!r.ok) return { ok: false, error: `${r.status}` };
    return { ok: true, info: (await r.json()) as Record<string, unknown> };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function loadPolicyOnServer(endpoint: string, body: { path: string; type: string; device?: string }): Promise<{ ok: boolean; message: string }> {
  try {
    const r = await fetch(endpoint.replace(/\/$/, "") + "/load", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const t = await r.text();
    return { ok: r.ok, message: t };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
