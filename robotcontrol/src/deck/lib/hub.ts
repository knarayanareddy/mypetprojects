// Central robot hub: simulation state, real-arm I/O (Web Serial or Python bridge), policies, recording, e-stop.
import { ARM_BASE, JOINTS, Pose, REST, V3, clamp, clampPose, fk, ik } from "./kin";
import {
  Calibration, FeetechBus, MotorTelemetry, REG, defaultCalibration, normToRaw, rawToNorm,
} from "./feetech";
import { cameras } from "./cameras";
import { Profile, getModel } from "./models";
import { vision } from "./vision";
import { backup } from "./persist";

export type ArmId = "A" | "B";
export const ARMS: ArmId[] = ["A", "B"];
export type Role = "follower" | "leader";
export type Source = "idle" | "mirror" | "skill" | "policy" | "replay";

export interface Obj {
  id: string; kind: string; pos: V3; color: string; size: number; label?: string;
  held: ArmId | null; pickable: boolean; w?: number; d?: number; state?: number; tilt?: number;
}
export interface Trail { color: string; pts: V3[] }
export interface Recording { id: string; name: string; frames: { t: number; A: Pose; B: Pose }[]; created: number }
export interface HistoryItem { t: number; name: string; status: "done" | "failed" | "aborted"; ms: number; model: string; note?: string; real: boolean }

export class SerialLink {
  bus = new FeetechBus();
  cal: Calibration;
  ids = [1, 2, 3, 4, 5, 6];
  found: number[] = [];
  telemetry: (MotorTelemetry | null)[] = Array(6).fill(null);
  pose: Pose | null = null;
  configured = false;
  errors = 0;
  /** does the servo EEPROM (homing offset + limits) match the saved calibration? – see feetech.ts header */
  calState: "unknown" | "ok" | "mismatch" | "none" = "unknown";
  calWhy = "";
  constructor(public arm: ArmId, public role: Role) {
    this.cal = loadCal(arm, role);
  }
  get calibrated() { return localStorage.getItem(calKey(this.arm, this.role)) !== null; }
}
const calKey = (a: ArmId, r: Role) => `so101.cal.${a}.${r}`;
export function loadCal(a: ArmId, r: Role): Calibration {
  try {
    const t = localStorage.getItem(calKey(a, r));
    if (t) return JSON.parse(t);
  } catch { /* */ }
  return defaultCalibration();
}
export function saveCal(a: ArmId, r: Role, c: Calibration) { localStorage.setItem(calKey(a, r), JSON.stringify(c)); backup(calKey(a, r), c); }

interface ArmCtl {
  target: Pose; sim: Pose; cmd: Pose; real: Pose | null; leaderPose: Pose | null;
  follower: SerialLink | null; leader: SerialLink | null; torque: boolean; mirror: boolean; ioBusy: boolean; lastIo: number;
}

export interface PolicyState {
  running: boolean; kind: "http" | "loopback" | "bridge"; url: string; task: string; fps: number; arms: 1 | 2;
  status: string; steps: number; latency: number; queue: number[][]; inflight: boolean; useCams: boolean; lastAction: number[] | null;
  // lerobot-rollout options (bridge transport)
  duration: number; inference: "sync" | "rtc"; useDegrees: boolean; cameras: string; strategy: "base";
}

const newPose = (): Pose => [...REST];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const SETTINGS_KEY = "so101.settings";
export interface Settings {
  drive: boolean; speed: number; maxRate: number; hwSpeed: number; torqueCap: number; twin: boolean; modelId: string;
  allowUncalibrated: boolean; useVision: boolean; gripGap: number; gripLoad: number;
}
const defaultSettings: Settings = { drive: false, speed: 1, maxRate: 90, hwSpeed: 900, torqueCap: 600, twin: true, modelId: "scripted",
  allowUncalibrated: false, useVision: false, gripGap: 8, gripLoad: 90 };

class Hub {
  arms: Record<ArmId, ArmCtl> = { A: this.mk(), B: this.mk() };
  settings: Settings = { ...defaultSettings, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") as Partial<Settings>) };
  source: Source = "idle";
  estopped = false;
  objects: Obj[] = [];
  trails: Trail[] = [];
  sceneName = "";
  logs: { t: number; msg: string; level: "info" | "warn" | "error" }[] = [];
  history: HistoryItem[] = JSON.parse(localStorage.getItem("so101.history") || "[]");
  recordings: Recording[] = JSON.parse(localStorage.getItem("so101.recs") || "[]");
  rec = { on: false, t0: 0, frames: [] as Recording["frames"] };
  abortToken = 0;
  caption = "";
  flashUntil = 0;
  say(text: string) { this.caption = text; this.bump(); }
  flash() { this.flashUntil = performance.now() + 220; this.beep(1200, 0.08, "square"); }
  runName = "";
  runStatus = "";
  profile: Profile = getModel(this.settings.modelId).profile;
  calib: { arm: ArmId; role: Role; min: number[]; max: number[]; raw: number[]; offsets: number[] | null } | null = null;
  bridge = {
    ws: null as WebSocket | null, connected: false, url: "ws://localhost:8765", arms: [] as ArmId[], status: "",
    state: {} as Partial<Record<ArmId, { follower: Pose | null; leader: Pose | null; torque?: boolean; tele?: { load: number; current: number; temp: number; volt: number; moving: boolean }[] | null }>>,
    policy: "",
  };
  policy: PolicyState = {
    running: false, kind: "loopback", url: "http://localhost:8000", task: "pick up the cube and place it on the pad", fps: 15, arms: 1,
    status: "idle", steps: 0, latency: 0, queue: [], inflight: false, useCams: false, lastAction: null,
    duration: 60, inference: "sync", useDegrees: true, strategy: "base",
    cameras: "{ front: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30}}",
  };
  version = 0;
  listeners = new Set<() => void>();
  private started = false;
  private lastStep = performance.now();
  private frame = 0;
  private lastPolicyT = 0;
  private lbPhase = 0;
  private lbObj: Obj | null = null;
  private audio: AudioContext | null = null;
  private penDown: Record<ArmId, Trail | null> = { A: null, B: null };

  private mk(): ArmCtl {
    return { target: newPose(), sim: newPose(), cmd: newPose(), real: null, leaderPose: null, follower: null, leader: null, torque: false, mirror: false, ioBusy: false, lastIo: 0 };
  }

  // ------------- store plumbing -------------
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getVersion = () => this.version;
  bump() { this.version++; this.listeners.forEach((l) => l()); }
  log(msg: string, level: "info" | "warn" | "error" = "info") {
    this.logs.push({ t: Date.now(), msg, level });
    if (this.logs.length > 250) this.logs.shift();
    this.bump();
  }
  saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); backup(SETTINGS_KEY, this.settings); this.bump(); }
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
    this.settings[k] = v;
    if (k === "modelId") this.profile = getModel(v as string).profile;
    this.saveSettings();
  }

  start() {
    if (this.started) return;
    this.started = true;
    setInterval(() => this.step(), 33);
    setInterval(() => { for (const a of ARMS) void this.io(a); this.bridgeTick(); }, 40);
    window.addEventListener("keydown", (e) => {
      const t = e.target as HTMLElement;
      if (e.code === "Space" && !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(t?.tagName)) { e.preventDefault(); void this.emergencyStop(); }
    });
  }

  // ------------- derived helpers -------------
  tip(arm: ArmId, pose?: Pose): V3 { return fk(pose ?? this.arms[arm].sim, ARM_BASE[arm]).pts[4]; }
  realPose(arm: ArmId): Pose | null {
    const a = this.arms[arm];
    if (a.follower?.pose) return a.follower.pose;
    if (this.bridge.connected) return this.bridge.state[arm]?.follower ?? null;
    return null;
  }
  leaderPoseOf(arm: ArmId): Pose | null {
    const a = this.arms[arm];
    if (a.leader?.pose) return a.leader.pose;
    if (this.bridge.connected) return this.bridge.state[arm]?.leader ?? null;
    return null;
  }
  hasReal(arm: ArmId) { return !!this.arms[arm].follower || (this.bridge.connected && this.bridge.arms.includes(arm)); }
  hasLeader(arm: ArmId) { return !!this.arms[arm].leader || (this.bridge.connected && !!this.bridge.state[arm]?.leader); }
  get busyMotion() { return this.source === "skill" || this.source === "policy" || this.source === "replay"; }

  setTarget(arm: ArmId, p: Pose) { this.arms[arm].target = clampPose(p); }
  setJoint(arm: ArmId, j: number, v: number) {
    const t = [...this.arms[arm].target]; t[j] = v; this.arms[arm].target = clampPose(t); this.bump();
  }
  setSource(s: Source) {
    this.source = s;
    if (s !== "mirror") for (const a of ARMS) this.arms[a].mirror = false;
    this.bump();
  }
  alignSimToReal(arm: ArmId) {
    const r = this.realPose(arm);
    if (r) { this.arms[arm].target = [...r]; this.arms[arm].sim = [...r]; this.arms[arm].cmd = [...r]; this.bump(); }
  }

  // ------------- scene -------------
  loadScene(name: string, objs: Obj[]) {
    this.sceneName = name;
    this.objects = objs.map((o) => ({ ...o, pos: [...o.pos] as V3, held: null }));
    this.trails = [];
    this.penDown = { A: null, B: null };
    this.bump();
  }
  obj(id: string) { return this.objects.find((o) => o.id === id); }

  attach(arm: ArmId, o: Obj) { o.held = arm; this.beep(520, 0.06); }
  release(arm: ArmId) {
    for (const o of this.objects) {
      if (o.held !== arm) continue;
      o.held = null;
      let y = o.size / 2;
      const flat = ["pad", "bin", "board", "paper", "tray", "plant", "button", "bar", "cloth", "drum", "slot", "stage"];
      if (o.kind === "pen" || o.kind === "bottle") y = o.size / 2;
      for (const u of this.objects) {
        if (u === o || u.held || flat.includes(u.kind)) continue;
        const d = Math.hypot(u.pos[0] - o.pos[0], u.pos[2] - o.pos[2]);
        if (d < (u.size + o.size) * 0.45) y = Math.max(y, u.pos[1] + u.size / 2 + o.size / 2);
      }
      o.pos = [o.pos[0], y, o.pos[2]];
      o.tilt = 0;
    }
    this.bump();
  }
  nearestPickable(arm: ArmId, maxD = 5): Obj | null {
    const tip = this.tip(arm);
    let best: Obj | null = null, bd = maxD;
    for (const o of this.objects) {
      if (!o.pickable || o.held) continue;
      const d = Math.hypot(o.pos[0] - tip[0], o.pos[1] - tip[1], o.pos[2] - tip[2]);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  holding(arm: ArmId) { return this.objects.find((o) => o.held === arm) ?? null; }

  beep(freq: number, dur = 0.25, type: OscillatorType = "triangle") {
    try {
      this.audio ??= new AudioContext();
      const c = this.audio, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g).connect(c.destination);
      o.start(); o.stop(c.currentTime + dur + 0.02);
    } catch { /* audio not available */ }
  }

  // ------------- simulation step -------------
  private step() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastStep) / 1000);
    this.lastStep = now;
    this.frame++;
    for (const id of ARMS) {
      const a = this.arms[id];
      for (let i = 0; i < 6; i++) {
        const d = a.target[i] - a.sim[i];
        const m = 520 * dt;
        a.sim[i] += clamp(d * 0.45, -m, m);
      }
    }
    // policy playback
    if (this.policy.running) this.policyTick(now);
    // grasp + held objects + pens
    for (const id of ARMS) {
      const a = this.arms[id];
      const f = fk(a.sim, ARM_BASE[id]);
      const tip = f.pts[4];
      if (this.source !== "skill") {
        const held = this.holding(id);
        if (!held && a.sim[5] < 18) {
          const o = this.nearestPickable(id, 4.5);
          if (o) this.attach(id, o);
        } else if (held && a.sim[5] > 38) this.release(id);
      }
      for (const o of this.objects) {
        if (o.held === id) {
          o.pos = [tip[0], tip[1], tip[2]];
          o.tilt = a.sim[4] * 1.6;
          if (o.kind === "pen" || o.kind === "laser") {
            if (tip[1] < 1.8 || o.kind === "laser") {
              if (!this.penDown[id]) { this.penDown[id] = { color: o.color, pts: [] }; this.trails.push(this.penDown[id]!); }
              const tr = this.penDown[id]!;
              const last = tr.pts[tr.pts.length - 1];
              if (!last || Math.hypot(last[0] - tip[0], last[2] - tip[2]) > 0.25) tr.pts.push([tip[0], o.kind === "laser" ? 0.05 : 0.05, tip[2]]);
              if (o.kind === "laser" && tr.pts.length > 40) tr.pts.shift();
            } else this.penDown[id] = null;
          }
        }
      }
      if (!this.holding(id)) this.penDown[id] = null;
    }
    if (this.rec.on) this.rec.frames.push({ t: (now - this.rec.t0) / 1000, A: [...this.arms.A.target], B: [...this.arms.B.target] });
    if (this.frame % 4 === 0) this.bump();
  }

  // ------------- real arm I/O -------------
  private async io(id: ArmId) {
    const a = this.arms[id];
    if (a.ioBusy || (!a.follower && !a.leader)) return;
    a.ioBusy = true;
    const now = performance.now();
    const dt = Math.min(0.2, (now - a.lastIo) / 1000);
    a.lastIo = now;
    try {
      const f = a.follower;
      if (f?.bus.isOpen) {
        if (a.torque && this.settings.drive && !this.estopped) {
          // rate-limited command stream
          for (let i = 0; i < 6; i++) {
            const lim = this.settings.maxRate * dt * (i === 5 ? 3 : 1);
            a.cmd[i] += clamp(a.target[i] - a.cmd[i], -lim, lim);
          }
          const sp = Math.round(this.settings.hwSpeed);
          const entries = f.ids.map((mid, i) => {
            const raw = normToRaw(i, a.cmd[i], f.cal);
            return { id: mid, data: [raw & 0xff, (raw >> 8) & 0xff, 0, 0, sp & 0xff, (sp >> 8) & 0xff] };
          });
          await f.bus.syncWrite(REG.GOAL_POS, 6, entries);
        }
        await this.readLink(f, id, "follower");
        if (!a.torque && this.settings.twin && !this.busyMotion && this.source !== "mirror" && f.pose && !this.calib) {
          a.target = [...f.pose];
        }
        if (!a.torque && f.pose) a.cmd = [...f.pose];
      }
      const l = a.leader;
      if (l?.bus.isOpen) {
        await this.readLink(l, id, "leader");
        if (a.mirror && l.pose && !this.estopped) a.target = clampPose([...l.pose]);
      }
    } catch (e) {
      this.log(`I/O error on arm ${id}: ${(e as Error).message}`, "error");
    } finally { a.ioBusy = false; }
  }

  private async readLink(link: SerialLink, arm: ArmId, role: Role) {
    let okCount = 0;
    const pose: Pose = [];
    for (let i = 0; i < 6; i++) {
      const t = await link.bus.readTelemetry(link.ids[i]);
      link.telemetry[i] = t;
      if (t) { okCount++; pose.push(rawToNorm(i, t.pos, link.cal)); } else pose.push(link.pose?.[i] ?? 0);
    }
    if (okCount > 0) link.pose = pose;
    link.errors = link.bus.errors;
    if (this.calib && this.calib.arm === arm && this.calib.role === role && this.calib.offsets) {
      for (let i = 0; i < 6; i++) {
        const t = link.telemetry[i];
        if (!t) continue;
        this.calib.raw[i] = t.pos;
        this.calib.min[i] = Math.min(this.calib.min[i], t.pos);
        this.calib.max[i] = Math.max(this.calib.max[i], t.pos);
      }
    }
  }

  /** Every SerialPort currently owned by a link – Web Serial grants ONE port per requestPort(), so two arms need two adapters. */
  private portsInUse(): { port: unknown; who: string }[] {
    const out: { port: unknown; who: string }[] = [];
    for (const a of ARMS) for (const r of ["follower", "leader"] as Role[]) { const l = this.arms[a][r]; if (l?.bus.port) out.push({ port: l.bus.port, who: `arm ${a} ${r}` }); }
    return out;
  }

  async connect(arm: ArmId, role: Role) {
    if (this.arms[arm][role]) throw new Error(`Arm ${arm} ${role} is already connected`);
    const link = new SerialLink(arm, role);
    await link.bus.open(1_000_000, this.portsInUse());
    link.found = await link.bus.scan(1, 8);
    if (link.found.length === 0) {
      await link.bus.close();
      throw new Error("No servos answered at 1 Mbps. Check 12V/5V power, the USB cable, the adapter jumpers (channel B / USB) and motor IDs.");
    }
    const missing = link.ids.filter((i) => !link.found.includes(i));
    if (missing.length) this.log(`Arm ${arm} ${role}: motor id(s) ${missing.join(",")} did not answer – fix cabling before enabling torque`, "warn");
    if (link.found.some((i) => i > 6)) this.log(`Arm ${arm} ${role}: unexpected ids ${link.found.filter((i) => i > 6).join(",")} – is another arm on this same bus?`, "warn");
    // leaders must never hold torque
    if (role === "leader") for (const id of link.found) await link.bus.writeInt(id, REG.TORQUE_EN, 0);
    this.arms[arm][role] = link;
    await this.checkCalibration(link);
    this.log(`Arm ${arm} ${role} connected – motors ${link.found.join(",")} (${link.bus.info}) · calibration: ${link.calState}${link.calWhy ? " (" + link.calWhy + ")" : ""}`, link.calState === "ok" ? "info" : "warn");
    if (role === "follower") {
      await this.readLink(link, arm, role);
      this.alignSimToReal(arm);
    }
    this.bump();
  }

  /** Compare saved calibration with servo EEPROM; if nothing is saved but the servos hold a LeRobot calibration, adopt it. */
  async checkCalibration(link: SerialLink) {
    if (link.found.length < 6) { link.calState = "none"; link.calWhy = "need all 6 motors"; return; }
    const eeprom = await link.bus.readCalibration(link.ids);
    const stored = link.calibrated;
    if (!eeprom) { link.calState = "unknown"; link.calWhy = "could not read servo EEPROM"; return; }
    const factory = JOINTS.every((j) => eeprom[j].homing_offset === 0 && eeprom[j].range_min === 0 && eeprom[j].range_max === 4095);
    if (!stored) {
      if (factory) { link.calState = "none"; link.calWhy = "servos are at factory limits – run calibration"; return; }
      link.cal = eeprom; saveCal(link.arm, link.role, eeprom);
      link.calState = "ok"; link.calWhy = "imported from servo EEPROM (LeRobot-calibrated)";
      return;
    }
    const m = await link.bus.matchesMotors(link.cal, link.ids);
    link.calState = m.ok ? "ok" : "mismatch"; link.calWhy = m.why;
  }

  /** Write the saved calibration into the servos (what lerobot does when you answer ENTER to “use calibration file”). */
  async applySavedCalibration(arm: ArmId, role: Role) {
    const l = this.arms[arm][role];
    if (!l) throw new Error("connect first");
    if (this.arms[arm].torque) throw new Error("torque off first");
    await l.bus.writeCalibration(l.cal);
    await this.checkCalibration(l);
    this.log(`Arm ${arm} ${role}: calibration written to servos → ${l.calState}`);
    this.bump();
  }

  async disconnect(arm: ArmId, role: Role) {
    const a = this.arms[arm];
    const l = a[role];
    if (!l) return;
    if (role === "follower") { try { await l.bus.setTorque(l.ids, false); } catch { /* */ } a.torque = false; }
    await l.bus.close();
    a[role] = null;
    if (role === "leader") a.mirror = false;
    this.log(`Arm ${arm} ${role} disconnected`);
  }

  async setTorque(arm: ArmId, on: boolean) {
    const a = this.arms[arm];
    if (this.bridge.connected && this.bridge.arms.includes(arm) && !a.follower) {
      this.bridgeSend({ type: "torque", arm, on });
      if (on) { const r = this.realPose(arm); if (r) { a.target = [...r]; a.sim = [...r]; a.cmd = [...r]; } }
      a.torque = on; this.bump(); return;
    }
    const f = a.follower;
    if (!f) throw new Error("Follower not connected");
    if (on) {
      if (this.estopped) throw new Error("E-stop is active – clear it first");
      if (f.found.length < 6) throw new Error(`Only motors ${f.found.join(",")} answered – all six are required for torque`);
      if (f.calState !== "ok" && !this.settings.allowUncalibrated)
        throw new Error(`Arm ${arm} calibration state is “${f.calState}” (${f.calWhy || "—"}). Calibrate / apply calibration on the Hardware tab, or tick “allow uncalibrated” (unsafe).`);
      await this.readLink(f, arm, "follower");
      const cur = f.pose ?? a.sim;
      a.target = [...cur]; a.sim = [...cur]; a.cmd = [...cur];
      if (!f.configured) { await f.bus.configureFollower(f.ids, this.settings.torqueCap); f.configured = true; }
      else for (const id of f.ids) await f.bus.writeInt(id, REG.TORQUE_LIMIT, this.settings.torqueCap, 2);
      // goal := present BEFORE enabling torque so the arm does not jump to an old goal
      const entries = f.ids.map((mid, i) => {
        const t = f.telemetry[i]?.pos ?? 2048;
        return { id: mid, data: [t & 0xff, (t >> 8) & 0xff] };
      });
      await f.bus.syncWrite(REG.GOAL_POS, 2, entries);
      await f.bus.setTorque(f.ids, true);
      a.torque = true;
      this.log(`Arm ${arm} torque ON (cap ${this.settings.torqueCap}/1000)`);
    } else {
      await f.bus.setTorque(f.ids, false);
      a.torque = false;
      this.log(`Arm ${arm} torque OFF`);
    }
    this.bump();
  }

  async emergencyStop() {
    this.estopped = true;
    this.abortToken++;
    this.policy.running = false; this.policy.queue = [];
    this.source = "idle";
    for (const id of ARMS) {
      const a = this.arms[id];
      a.mirror = false;
      a.torque = false;
      try { await a.follower?.bus.emergencyTorqueOff(); } catch { /* */ }
    }
    this.bridgeSend({ type: "estop" });
    this.log("E-STOP: all motion stopped, torque released on every follower", "error");
    this.bump();
  }
  clearEstop() { this.estopped = false; this.log("E-stop cleared. Re-enable torque per arm."); }

  // ------------- calibration (LeRobot-faithful) -------------
  // 1) startCalib: torque off.  2) user holds the arm in the middle of its range → calibHome(): reset + half-turn homing
  // written into the servos (same as lerobot set_half_turn_homings).  3) user sweeps joints, min/max are recorded in the
  // homed frame.  4) finishCalib: limits are written to the servos, JSON saved in lerobot's format.
  startCalib(arm: ArmId, role: Role) {
    const l = this.arms[arm][role];
    if (!l) throw new Error("connect that arm first");
    if (l.found.length < 6) throw new Error("all six motors must answer before calibrating");
    this.calib = { arm, role, min: l.telemetry.map((t) => t?.pos ?? 2047), max: l.telemetry.map((t) => t?.pos ?? 2047), raw: l.telemetry.map((t) => t?.pos ?? 0), offsets: null };
    void l.bus.setTorque(l.ids, false);
    this.arms[arm].torque = false;
    l.calState = "none"; l.calWhy = "calibration in progress";
    this.bump();
  }
  async calibHome() {
    const c = this.calib;
    if (!c) throw new Error("start calibration first");
    const l = this.arms[c.arm][c.role]!;
    await l.bus.setTorque(l.ids, false);
    c.offsets = await l.bus.setHalfTurnHomings(l.ids);
    // all joints now read ≈2047; start range recording from here
    for (let i = 0; i < 6; i++) { const v = await l.bus.readInt(l.ids[i], REG.PRESENT, 2); c.min[i] = c.max[i] = c.raw[i] = v ?? 2047; }
    this.log(`Arm ${c.arm} ${c.role}: homing offsets written to servos [${c.offsets.join(", ")}]`);
    this.bump();
  }
  async finishCalib(): Promise<Calibration | null> {
    const c = this.calib;
    if (!c) return null;
    if (!c.offsets) throw new Error("press “1 · Set homing” with the arm in the middle of its range first");
    const l = this.arms[c.arm][c.role]!;
    const cal = defaultCalibration();
    JOINTS.forEach((j, i) => {
      let mn = c.min[i], mx = c.max[i];
      if (j === "wrist_roll") { mn = 0; mx = 4095; }
      else if (mx - mn < 200) throw new Error(`${j} only moved ${mx - mn} ticks – sweep every joint through its whole range`);
      cal[j] = { id: i + 1, drive_mode: 0, homing_offset: c.offsets![i], range_min: mn, range_max: mx };
    });
    await l.bus.writeCalibration(cal);
    l.cal = cal;
    saveCal(c.arm, c.role, cal);
    this.calib = null;
    await this.checkCalibration(l);
    this.log(`Calibration saved for arm ${c.arm} ${c.role} and written to the servos (${l.calState})`);
    this.bump();
    return cal;
  }
  cancelCalib() { this.calib = null; this.bump(); }

  // ------------- grasp sensing & vision -------------
  /** latest gripper telemetry from whichever transport is live (position in normalised 0‥100) */
  gripperTelemetry(arm: ArmId): { pos: number; load: number; current: number; moving: boolean } | null {
    const f = this.arms[arm].follower;
    if (f?.telemetry[5] && f.pose) { const t = f.telemetry[5]!; return { pos: f.pose[5], load: t.load, current: t.current, moving: t.moving }; }
    const b = this.bridge.state[arm];
    if (this.bridge.connected && b?.follower && b.tele?.[5]) { const t = b.tele[5]; return { pos: b.follower[5], load: t.load, current: t.current, moving: t.moving }; }
    return null;
  }
  get realDriving() { return this.settings.drive && ARMS.some((a) => this.arms[a].torque && this.hasReal(a)); }

  /**
   * Decide whether the gripper is holding something. NO coin flips:
   *  • real hardware: gripper settled > gripGap norm-units above the commanded closure AND servo load ≥ gripLoad (‰)
   *    – i.e. the jaws were stopped by an object while the motor is still pushing (stall), not by reaching the goal.
   *  • simulation: purely geometric – the object must actually be within the jaws at the tip.
   */
  async verifyGrasp(arm: ArmId, commanded: number, target?: Obj | null): Promise<{ held: boolean; why: string }> {
    if (this.realDriving && this.arms[arm].torque && this.hasReal(arm)) {
      await sleep(450); // let the jaws settle
      let pos = 0, load = 0, cur = 0, n = 0, moving = false;
      for (let i = 0; i < 6; i++) {
        const g = this.gripperTelemetry(arm);
        if (g) { pos += g.pos; load += Math.abs(g.load); cur += g.current; n++; moving = moving || g.moving; }
        await sleep(60);
      }
      if (!n) return { held: false, why: "no gripper telemetry – cannot confirm grasp" };
      pos /= n; load /= n; cur /= n;
      const gap = pos - commanded;
      const held = gap >= this.settings.gripGap && load >= this.settings.gripLoad;
      return { held, why: `gripper at ${pos.toFixed(1)} (cmd ${commanded}, gap ${gap.toFixed(1)}), load ${load.toFixed(0)}‰, ${cur.toFixed(0)} mA` + (held ? " → object between jaws" : gap < this.settings.gripGap ? " → closed fully, nothing gripped" : " → jaws stopped but no stall load") };
    }
    // simulation: geometry (short settle so the smoothed sim pose reaches the commanded one)
    await sleep(160);
    const tip = this.tip(arm);
    const o = target ?? this.nearestPickable(arm, 6);
    if (!o) return { held: false, why: "no object near the tip" };
    const d = Math.hypot(o.pos[0] - tip[0], o.pos[1] - tip[1], o.pos[2] - tip[2]);
    const tol = o.size * 0.55 + 1.1;
    return { held: d <= tol, why: `tip–object distance ${d.toFixed(1)} cm (tolerance ${tol.toFixed(1)})` };
  }

  /** refresh object x/z from the calibrated camera. Returns ids found. */
  relocate(ids?: string[]): string[] {
    if (!vision.cal || !vision.ready) return [];
    const want = this.objects.filter((o) => o.pickable && !o.held && (!ids || ids.includes(o.id))).map((o) => ({ id: o.id, color: o.color, expect: [o.pos[0], o.pos[2]] as [number, number] }));
    if (!want.length) return [];
    const found = vision.detect(want);
    for (const f of found) {
      const o = this.obj(f.id);
      if (!o) continue;
      const moved = Math.hypot(o.pos[0] - f.world[0], o.pos[2] - f.world[1]);
      if (moved > 0.5) this.log(`vision: ${f.id} located at (${f.world[0].toFixed(1)}, ${f.world[1].toFixed(1)}) cm – ${moved.toFixed(1)} cm from where the script expected it`);
      o.pos = [f.world[0], o.pos[1], f.world[1]];
    }
    this.bump();
    return found.map((f) => f.id);
  }

  // ------------- recording / replay -------------
  startRec() { this.rec = { on: true, t0: performance.now(), frames: [] }; this.bump(); }
  stopRec(name?: string) {
    this.rec.on = false;
    if (this.rec.frames.length > 5) {
      const r: Recording = { id: crypto.randomUUID(), name: name || `Recording ${this.recordings.length + 1}`, frames: this.thin(this.rec.frames), created: Date.now() };
      this.recordings.unshift(r);
      this.persistRecs();
    }
    this.bump();
  }
  private thin(f: Recording["frames"]) { return f.filter((_, i) => i % 2 === 0).map((x) => ({ t: +x.t.toFixed(3), A: x.A.map((v) => +v.toFixed(1)), B: x.B.map((v) => +v.toFixed(1)) })); }
  persistRecs() { try { localStorage.setItem("so101.recs", JSON.stringify(this.recordings.slice(0, 12))); } catch { /* quota */ } this.bump(); }
  deleteRec(id: string) { this.recordings = this.recordings.filter((r) => r.id !== id); this.persistRecs(); }
  async replay(r: Recording, arms: ArmId[] = ["A", "B"]) {
    if (this.busyMotion) return;
    this.setSource("replay");
    const token = ++this.abortToken;
    const t0 = performance.now();
    const total = r.frames[r.frames.length - 1].t;
    let i = 0;
    this.runName = `Replay: ${r.name}`; this.runStatus = "running";
    const speed = this.settings.speed;
    while (token === this.abortToken) {
      const t = ((performance.now() - t0) / 1000) * speed;
      while (i < r.frames.length - 1 && r.frames[i + 1].t < t) i++;
      for (const a of arms) this.setTarget(a, r.frames[i][a]);
      if (t > total) break;
      await sleep(20);
    }
    if (token === this.abortToken) { this.source = "idle"; this.runStatus = "done"; }
    this.bump();
  }

  // ------------- history -------------
  addHistory(h: HistoryItem) {
    this.history.unshift(h);
    this.history = this.history.slice(0, 60);
    localStorage.setItem("so101.history", JSON.stringify(this.history)); backup("so101.history", this.history);
    this.bump();
  }
  abort() { this.abortToken++; if (this.source !== "idle") this.source = "idle"; this.policy.running = false; this.bump(); }

  // ------------- python bridge -------------
  connectBridge(url: string) {
    this.bridge.url = url;
    return new Promise<void>((resolve, reject) => {
      let ws: WebSocket;
      try { ws = new WebSocket(url); } catch (e) { reject(e); return; }
      const t = setTimeout(() => { try { ws.close(); } catch { /* */ } reject(new Error("timeout – is bridge/so101_bridge.py running?")); }, 4000);
      ws.onopen = () => { clearTimeout(t); this.bridge.ws = ws; this.bridge.connected = true; this.bridgeSend({ type: "hello" }); resolve(); this.bump(); };
      ws.onerror = () => { clearTimeout(t); reject(new Error("could not reach bridge at " + url)); };
      ws.onclose = () => { this.bridge.connected = false; this.bridge.ws = null; this.log("Bridge disconnected", "warn"); this.bump(); };
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data);
          if (m.type === "hello") { this.bridge.arms = m.arms; this.bridge.status = m.info ?? ""; this.log(`Bridge ready: arms ${m.arms.join(",")} ${m.info ?? ""}`); }
          else if (m.type === "state") {
            for (const k of ARMS) if (m[k]) this.bridge.state[k] = m[k];
            for (const k of ARMS) if (m[k] && this.arms[k].mirror && m[k].leader && !this.estopped) this.arms[k].target = clampPose(m[k].leader);
            for (const k of ARMS) {
              const a = this.arms[k];
              if (m[k] && typeof m[k].torque === "boolean") a.torque = m[k].torque;
              if (m[k]?.follower && !a.torque && this.settings.twin && !this.busyMotion && this.source !== "mirror") a.target = [...m[k].follower];
              if (m[k]?.follower && !a.torque) a.cmd = [...m[k].follower];
            }
          } else if (m.type === "log") this.log(`[bridge] ${m.text}`, m.level ?? "info");
          else if (m.type === "policy_status") { this.bridge.policy = m.text; this.policy.running = !!m.running; this.policy.status = m.text; this.bump(); }
        } catch { /* ignore */ }
      };
    });
  }
  disconnectBridge() { this.bridge.ws?.close(); }
  bridgeSend(m: object) { if (this.bridge.ws && this.bridge.connected) this.bridge.ws.send(JSON.stringify(m)); }
  private bridgeTick() {
    if (!this.bridge.connected || this.estopped || !this.settings.drive) return;
    const msg: Record<string, unknown> = { type: "action" };
    let any = false;
    for (const id of ARMS) {
      const a = this.arms[id];
      if (!this.bridge.arms.includes(id) || !a.torque || a.follower) continue;
      for (let i = 0; i < 6; i++) { const lim = this.settings.maxRate * 0.04 * (i === 5 ? 3 : 1); a.cmd[i] += clamp(a.target[i] - a.cmd[i], -lim, lim); }
      msg[id] = a.cmd.map((v) => +v.toFixed(2)); any = true;
    }
    if (any && !(this.policy.kind === "bridge" && this.policy.running)) this.bridgeSend(msg);
  }

  // ------------- policies -------------
  async startPolicy(cfg: Partial<PolicyState> & { repo?: string }) {
    Object.assign(this.policy, cfg);
    const p = this.policy;
    this.abortToken++;
    p.queue = []; p.steps = 0; p.inflight = false; p.lastAction = null;
    this.lbPhase = 0; this.lbObj = null;
    if (p.kind === "bridge") {
      if (!this.bridge.connected) throw new Error("Connect the Python bridge first (Hardware tab).");
      if (this.estopped) throw new Error("E-stop is active – clear it first");
      this.bridgeSend({ type: "rollout_start", policy: cfg.repo ?? p.url, task: p.task, duration: p.duration, arms: p.arms, inference: p.inference, useDegrees: p.useDegrees, cameras: p.cameras, strategy: p.strategy });
      p.status = "launching lerobot-rollout on bridge…"; p.running = true; this.bump();
      return;
    }
    this.setSource("policy");
    p.running = true; p.status = "running"; this.lastPolicyT = 0;
    this.log(`Policy started (${p.kind}) – "${p.task}"`);
    this.bump();
  }
  stopPolicy() {
    if (!this.policy.running) return;
    if (this.policy.kind === "bridge") this.bridgeSend({ type: "rollout_stop" });
    this.policy.running = false; this.policy.status = "stopped"; this.policy.queue = [];
    if (this.source === "policy") this.source = "idle";
    this.log("Policy stopped");
    this.bump();
  }

  private currentState(): Pose[] {
    return ARMS.map((id) => (this.settings.drive && this.realPose(id)) || this.arms[id].sim);
  }

  private policyTick(now: number) {
    const p = this.policy;
    if (p.kind === "bridge") return;
    if (now - this.lastPolicyT < 1000 / p.fps) return;
    this.lastPolicyT = now;
    if (p.queue.length < Math.max(2, p.fps * 0.15) && !p.inflight) void this.fetchChunk();
    const a = p.queue.shift();
    if (a) {
      p.lastAction = a; p.steps++;
      this.setTarget("A", a.slice(0, 6));
      if (p.arms === 2 && a.length >= 12) this.setTarget("B", a.slice(6, 12));
    }
  }

  private async fetchChunk() {
    const p = this.policy;
    p.inflight = true;
    const t0 = performance.now();
    try {
      const [sa, sb] = this.currentState();
      if (p.kind === "loopback") {
        await sleep(this.profile.latencyMs * 0.4);
        p.queue.push(...this.loopbackChunk(sa));
      } else {
        const body = {
          task: p.task, arms: p.arms, state: p.arms === 2 ? [...sa, ...sb] : sa, state_by_arm: { A: sa, B: sb },
          images: p.useCams ? cameras.grabAll() : {}, joint_names: JOINTS, timestamp: Date.now() / 1000,
        };
        const r = await fetch(p.url.replace(/\/$/, "") + "/predict", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const acts: number[][] = j.actions ?? (j.action ? [j.action] : []);
        if (!acts.length || acts.some((x) => !Array.isArray(x) || x.length < 6 || x.some((v) => !Number.isFinite(v)))) throw new Error("bad action payload (need actions: number[][] with ≥6 joints)");
        p.queue.push(...acts);
        p.status = "running";
      }
      p.latency = Math.round(performance.now() - t0);
    } catch (e) {
      p.status = `error: ${(e as Error).message}`;
      p.running = false;
      if (this.source === "policy") this.source = "idle";
      this.log(`Policy error – ${(e as Error).message}`, "error");
    } finally { p.inflight = false; this.bump(); }
  }

  /** tiny privileged "policy" so the loopback demo needs no server: pick nearest object -> pad */
  private loopbackChunk(cur: Pose): number[][] {
    const base = ARM_BASE.A;
    const pad = this.objects.find((o) => o.kind === "pad" || o.kind === "bin") ?? null;
    if (!this.lbObj || (this.lbObj.held === null && this.lbPhase === 0 && this.lbObj.pos[1] < 0)) {
      const cands = this.objects.filter((o) => o.pickable && !o.held && Math.hypot(o.pos[0] - base[0], o.pos[2] - base[2]) < 23)
        .filter((o) => !pad || Math.hypot(o.pos[0] - pad.pos[0], o.pos[2] - pad.pos[2]) > 3);
      this.lbObj = cands[0] ?? null;
      this.lbPhase = 0;
    }
    const o = this.lbObj;
    if (!o) return Array(8).fill(cur);
    const pp: V3 = pad ? [pad.pos[0], 0, pad.pos[2]] : [-6, 0, 0];
    const h = o.size / 2 + 0.3;
    const W: [V3, number][] = [
      [[o.pos[0], 9, o.pos[2]], 60], [[o.pos[0], h, o.pos[2]], 60], [[o.pos[0], h, o.pos[2]], 4], [[o.pos[0], 9, o.pos[2]], 4],
      [[pp[0], 9, pp[2]], 4], [[pp[0], h + 0.3, pp[2]], 4], [[pp[0], h + 0.3, pp[2]], 60], [[pp[0], 10, pp[2]], 60],
    ];
    const [pos, grip] = W[this.lbPhase];
    const r = ik(pos, base, { pitch: 170, grip });
    const n = 14;
    const out: number[][] = [];
    for (let k = 1; k <= n; k++) {
      const t = k / n, e = t * t * (3 - 2 * t);
      out.push(cur.map((v, i) => v + (r.pose[i] - v) * e + (Math.random() - 0.5) * this.profile.jitter));
    }
    // keep grip closed through the hold phase
    this.lbPhase++;
    if (this.lbPhase >= W.length) { this.lbPhase = 0; this.lbObj = null; }
    return out;
  }
}

export const hub = new Hub();
hub.start();
