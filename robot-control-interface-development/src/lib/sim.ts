import { clamp, ik, lerp, lerpPose, REST, smooth, tcpWorld, type Pose, type V3 } from "./kin";
import { play } from "./audio";
import { BASE } from "./scenarios/dsl";
import { IDEAL_PROFILE, type Arm, type Scenario, type SimObject, type SimProfile, type Step } from "./scenarios/types";

interface Cmd {
  p: V3;
  pitch: number;
  roll: number;
  grip: number;
}

interface GrabPhase {
  id: string;
  state: "close" | "reopen";
  t: number;
  attempts: number;
  grip: number;
}

interface ArmState {
  track: Step[];
  i: number;
  u: number;
  started: boolean;
  from: Cmd;
  to: Cmd;
  cmd: Cmd;
  desired: Pose;
  pose: Pose;
  syncWait: string | null;
  grab: GrabPhase | null;
  held: string | null;
  done: boolean;
  phase: number;
  frozen: Pose | null;
}

export interface ObjState {
  def: SimObject;
  pos: V3;
  rot: V3;
  scale: number;
  color: number;
  held: Arm | null;
  vy: number;
  animating: boolean;
  animated: boolean;
  tiltAxis: V3;
  tilt: number;
}

export interface FixState {
  flash: number;
  depress: number;
}

export interface Trail {
  arm: Arm;
  color: string;
  pts: V3[];
}

interface ActiveAnim {
  o: ObjState;
  start: number;
  dur: number;
  from: { pos: V3; rot: V3; scale: number; color: number } | null;
  to: { pos?: V3; rot?: V3; scale?: number; color?: number };
}

export interface SimStats {
  grabs: number;
  misses: number;
  hits: number;
  loops: number;
  cycle: number;
  trackErr: number;
  unreachable: number;
}

const ARMS: Arm[] = ["a", "b"];
const restCmd = (arm: Arm): Cmd => ({ p: tcpWorld(BASE[arm], REST), pitch: REST.a3 * (180 / Math.PI), roll: 0, grip: REST.grip });
const cloneCmd = (c: Cmd): Cmd => ({ p: [...c.p] as V3, pitch: c.pitch, roll: c.roll, grip: c.grip });

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Sim {
  scenario!: Scenario;
  profile: SimProfile = IDEAL_PROFILE;
  speed = 1;
  arms!: Record<Arm, ArmState>;
  objs: ObjState[] = [];
  fix: FixState[] = [];
  trails: Trail[] = [];
  t = 0;
  say = "";
  sayT = 0;
  stats: SimStats = { grabs: 0, misses: 0, hits: 0, loops: 0, cycle: 0, trackErr: 0, unreachable: 0 };
  private anims: ActiveAnim[] = [];
  private rng = mulberry(7);
  private idle = 0;
  private cycleT = 0;
  loop = true;
  paused = false;
  finished = false;

  constructor(scenario: Scenario, profile: SimProfile = IDEAL_PROFILE) {
    this.load(scenario, profile);
  }

  load(scenario: Scenario, profile: SimProfile = this.profile) {
    this.scenario = scenario;
    this.profile = profile;
    this.rng = mulberry(7);
    this.stats = { grabs: 0, misses: 0, hits: 0, loops: 0, cycle: 0, trackErr: 0, unreachable: 0 };
    const prog = scenario.program();
    const mk = (arm: Arm, track: Step[], prev?: ArmState): ArmState => {
      const cmd = prev ? cloneCmd(prev.cmd) : restCmd(arm);
      return {
        track,
        i: 0,
        u: 0,
        started: false,
        from: cloneCmd(cmd),
        to: cloneCmd(cmd),
        cmd,
        desired: prev ? { ...prev.desired } : { ...REST },
        pose: prev ? { ...prev.pose } : { ...REST },
        syncWait: null,
        grab: null,
        held: null,
        done: track.length === 0,
        phase: arm === "a" ? 0 : 2.1,
        frozen: null,
      };
    };
    this.arms = { a: mk("a", prog.a, this.arms?.a), b: mk("b", prog.b, this.arms?.b) };
    this.resetWorld();
    this.t = 0;
    this.finished = false;
    this.idle = 0;
    this.cycleT = 0;
  }

  setProfile(p: SimProfile) {
    this.profile = p;
  }

  private resetWorld() {
    this.objs = this.scenario.objects.map((d) => ({
      def: d,
      pos: [...d.pos] as V3,
      rot: [...(d.rot ?? [0, 0, 0])] as V3,
      scale: 1,
      color: d.color,
      held: null,
      vy: 0,
      animating: false,
      animated: false,
      tiltAxis: [1, 0, 0],
      tilt: 0,
    }));
    this.fix = this.scenario.fixtures.map(() => ({ flash: 0, depress: 0 }));
    this.trails = [];
    this.anims = [];
  }

  private restartProgram() {
    const prog = this.scenario.program();
    (["a", "b"] as Arm[]).forEach((arm) => {
      const a = this.arms[arm];
      a.track = prog[arm];
      a.i = 0;
      a.u = 0;
      a.started = false;
      a.syncWait = null;
      a.grab = null;
      a.held = null;
      a.done = a.track.length === 0;
    });
    this.resetWorld();
    this.idle = 0;
    this.cycleT = 0;
  }

  /* ---------------------------------------------------------------- */
  private resolve(step: Step, cur: Cmd, arm: Arm): Cmd {
    if (step.rest) return restCmd(arm);
    return {
      p: step.p ? ([...step.p] as V3) : ([...cur.p] as V3),
      pitch: step.pitch ?? cur.pitch,
      roll: step.roll ?? cur.roll,
      grip: step.grip ?? cur.grip,
    };
  }

  private advance(arm: Arm, sdt: number) {
    const a = this.arms[arm];
    if (a.done) return;

    if (a.grab) {
      const g = a.grab;
      g.t += sdt;
      if (g.state === "close") {
        a.cmd.grip = lerp(a.cmd.grip, g.grip, 0.3);
        if (g.t > 0.35) {
          const p = 1 - Math.pow(1 - this.profile.pGrab, g.attempts + 1);
          this.stats.grabs++;
          if (this.rng() < p) {
            const o = this.objs.find((x) => x.def.id === g.id);
            if (o) {
              ARMS.forEach((k) => {
                if (this.arms[k].held === g.id) this.arms[k].held = null;
              });
              o.held = arm;
              o.vy = 0;
              a.held = g.id;
              play({ type: "click" });
            }
            a.grab = null;
            a.i++;
            a.u = 0;
            a.started = false;
          } else {
            this.stats.misses++;
            this.say = "Missed grasp — regrasping";
            this.sayT = 1.8;
            g.state = "reopen";
            g.t = 0;
          }
        }
      } else {
        a.cmd.grip = lerp(a.cmd.grip, 1, 0.3);
        if (g.t > 0.55) {
          g.state = "close";
          g.t = 0;
          g.attempts++;
        }
      }
      return;
    }

    const step = a.track[a.i];
    if (!step) {
      a.done = true;
      return;
    }
    if (step.sync) {
      a.syncWait = step.sync;
      return;
    }
    if (!a.started) {
      a.from = cloneCmd(a.cmd);
      a.to = this.resolve(step, a.cmd, arm);
      a.started = true;
      a.u = 0;
    }
    a.u += sdt;
    const k = step.dur > 0 ? clamp(a.u / step.dur, 0, 1) : 1;
    const e = smooth(k);
    a.cmd = {
      p: [lerp(a.from.p[0], a.to.p[0], e), lerp(a.from.p[1], a.to.p[1], e), lerp(a.from.p[2], a.to.p[2], e)],
      pitch: lerp(a.from.pitch, a.to.pitch, e),
      roll: lerp(a.from.roll, a.to.roll, e),
      grip: lerp(a.from.grip, a.to.grip, e),
    };
    if (step.trail) this.addTrail(arm, step.trail);
    if (k >= 1) this.finishStep(arm, step);
  }

  private finishStep(arm: Arm, step: Step) {
    const a = this.arms[arm];
    if (step.say) {
      this.say = step.say;
      this.sayT = 3.5;
    }
    if (step.snd) play(step.snd);
    if (step.hit) this.doHit(arm);
    if (step.fire) this.fire(step.fire);
    if (step.drop && a.held) {
      const o = this.objs.find((x) => x.def.id === a.held);
      if (o) {
        o.held = null;
        o.vy = 0;
        o.tilt = 0;
      }
      a.held = null;
    }
    if (step.grab) {
      a.grab = { id: step.grab, state: "close", t: 0, attempts: 0, grip: step.grip ?? 0.3 };
      return;
    }
    a.i++;
    a.u = 0;
    a.started = false;
  }

  private doHit(arm: Arm) {
    const tcp = tcpWorld(BASE[arm], this.arms[arm].pose);
    let best = -1;
    let bd = 1e9;
    this.scenario.fixtures.forEach((f, i) => {
      if (!f.trigger) return;
      const d = Math.hypot(f.pos[0] - tcp[0], f.pos[2] - tcp[2]);
      if (d < f.trigger.r + 1.5 && d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best < 0) return;
    const f = this.scenario.fixtures[best];
    this.fix[best].flash = 1;
    this.fix[best].depress = 1;
    this.stats.hits++;
    if (f.trigger?.sound) play(f.trigger.sound);
    if (f.trigger?.fire) this.fire(f.trigger.fire);
  }

  private fire(name: string) {
    const list = this.scenario.anims?.[name];
    if (!list) return;
    for (const an of list) {
      const o = this.objs.find((x) => x.def.id === an.obj);
      if (!o) continue;
      this.anims.push({ o, start: this.t + an.delay, dur: an.dur, from: null, to: an.to });
    }
  }

  private addTrail(arm: Arm, color: string) {
    const tcp = tcpWorld(BASE[arm], this.arms[arm].pose);
    let tr = this.trails.find((t) => t.arm === arm && t.color === color && t.pts.length > 0 && t.pts.length < 6000);
    const last = tr?.pts[tr.pts.length - 1];
    if (!tr || (last && Math.hypot(last[0] - tcp[0], last[2] - tcp[2]) > 12)) {
      tr = { arm, color, pts: [] };
      this.trails.push(tr);
    }
    const l = tr.pts[tr.pts.length - 1];
    if (!l || Math.hypot(l[0] - tcp[0], l[1] - tcp[1], l[2] - tcp[2]) > 0.2) tr.pts.push([tcp[0], Math.max(0.12, tcp[1] - 0.2), tcp[2]]);
  }

  private groundAt(x: number, z: number, self: ObjState): number {
    let top = 0;
    for (const f of this.scenario.fixtures) {
      if (f.support === false) continue;
      if (Math.abs(x - f.pos[0]) <= f.size[0] / 2 && Math.abs(z - f.pos[2]) <= f.size[2] / 2) top = Math.max(top, f.pos[1] + f.size[1] / 2);
    }
    for (const o of this.objs) {
      if (o === self || o.held || o.def.fixed) continue;
      if (Math.abs(x - o.pos[0]) <= o.def.size[0] / 2 + 0.4 && Math.abs(z - o.pos[2]) <= o.def.size[2] / 2 + 0.4 && o.pos[1] < self.pos[1]) {
        top = Math.max(top, o.pos[1] + (o.def.size[1] * o.scale) / 2);
      }
    }
    return top;
  }

  /* ---------------------------------------------------------------- */
  update(rawDt: number) {
    if (this.paused) return;
    const dt = Math.min(rawDt, 0.05);
    this.t += dt;
    this.cycleT += dt;
    const sdt = dt * this.speed * this.profile.speed;
    ARMS.forEach((arm) => this.advance(arm, sdt));

    // sync barriers
    const A = this.arms.a;
    const Bm = this.arms.b;
    const releasable = (me: ArmState, other: ArmState) => me.syncWait !== null && (other.syncWait === me.syncWait || other.done);
    if (releasable(A, Bm) && (Bm.syncWait !== null || Bm.done)) {
      [A, Bm].forEach((s) => {
        if (s.syncWait !== null) {
          s.syncWait = null;
          s.i++;
          s.started = false;
        }
      });
    } else if (releasable(Bm, A) && (A.syncWait !== null || A.done)) {
      Bm.syncWait = null;
      Bm.i++;
      Bm.started = false;
    }

    // controller dynamics (model profile)
    const pr = this.profile;
    let errSum = 0;
    ARMS.forEach((arm) => {
      const s = this.arms[arm];
      s.phase += dt;
      const n = (sin1: number, sin2: number) => (Math.sin(s.phase * sin1) + Math.sin(s.phase * sin2 + 1.3)) * 0.5 * pr.jitter;
      const target: V3 = [s.cmd.p[0] + n(7.1, 11.3), s.cmd.p[1] + n(5.3, 9.7) * 0.5, s.cmd.p[2] + n(6.1, 13.1)];
      const r = ik(BASE[arm], target, s.cmd.pitch, (s.cmd.roll * Math.PI) / 180, s.cmd.grip);
      if (!r.ok && !s.done && s.started) this.stats.unreachable += 0; // counted by validator
      s.desired = r.pose;
      let frozen = false;
      if (pr.stallEvery > 0) {
        const cyc = pr.stallEvery + pr.stallFor;
        frozen = (this.t + (arm === "b" ? 0.7 : 0)) % cyc > pr.stallEvery;
      }
      const goal = frozen && s.frozen ? s.frozen : s.desired;
      s.frozen = frozen ? (s.frozen ?? { ...s.pose }) : null;
      const k = 1 - Math.exp(-dt / Math.max(0.01, pr.lag));
      s.pose = lerpPose(s.pose, goal, k);
      // gripper follows quickly regardless
      s.pose.grip = lerp(s.pose.grip, goal.grip, 1 - Math.exp(-dt / 0.06));
      const tcp = tcpWorld(BASE[arm], s.pose);
      errSum += Math.hypot(tcp[0] - s.cmd.p[0], tcp[1] - s.cmd.p[1], tcp[2] - s.cmd.p[2]);
      // held object follows TCP
      if (s.held) {
        const o = this.objs.find((x) => x.def.id === s.held);
        if (o) {
          o.pos = [tcp[0], tcp[1] - (o.def.size[1] * 0.05), tcp[2]];
          const ca = Math.cos(s.pose.a3);
          o.tiltAxis = [ca * Math.sin(s.pose.pan), Math.sin(s.pose.a3), ca * Math.cos(s.pose.pan)];
          o.tilt = s.pose.roll;
        }
      }
    });
    this.stats.trackErr = lerp(this.stats.trackErr, errSum / 2, 0.05);

    // scene animations
    for (const an of this.anims) {
      if (this.t < an.start) continue;
      const o = an.o;
      if (!an.from) an.from = { pos: [...o.pos] as V3, rot: [...o.rot] as V3, scale: o.scale, color: o.color };
      o.animated = true;
      const k = smooth(clamp((this.t - an.start) / Math.max(0.01, an.dur), 0, 1));
      o.animating = k < 1;
      if (an.to.pos) o.pos = [lerp(an.from.pos[0], an.to.pos[0], k), lerp(an.from.pos[1], an.to.pos[1], k), lerp(an.from.pos[2], an.to.pos[2], k)];
      if (an.to.rot) o.rot = [lerp(an.from.rot[0], an.to.rot[0], k), lerp(an.from.rot[1], an.to.rot[1], k), lerp(an.from.rot[2], an.to.rot[2], k)];
      if (an.to.scale !== undefined) o.scale = lerp(an.from.scale, an.to.scale, k);
      if (an.to.color !== undefined) {
        const c1 = an.from.color;
        const c2 = an.to.color;
        const ch = (sh: number) => Math.round(lerp((c1 >> sh) & 255, (c2 >> sh) & 255, k));
        o.color = (ch(16) << 16) | (ch(8) << 8) | ch(0);
      }
    }
    this.anims = this.anims.filter((an) => !an.from || this.t < an.start + an.dur + 0.05);

    // gravity for free objects
    for (const o of this.objs) {
      if (o.held || o.animating || o.animated || o.def.fixed) continue;
      const half = (o.def.size[1] * o.scale) / 2;
      const top = this.groundAt(o.pos[0], o.pos[2], o);
      const rest = top + half;
      if (o.pos[1] > rest + 0.01) {
        o.vy -= 160 * dt;
        o.pos[1] = Math.max(rest, o.pos[1] + o.vy * dt);
        if (o.pos[1] <= rest) o.vy = 0;
      } else if (o.pos[1] < rest - 0.01 && !this.anims.some((x) => x.o === o)) {
        o.pos[1] = rest;
      }
    }

    // fixtures decay
    this.fix.forEach((f) => {
      f.flash = Math.max(0, f.flash - dt * 2.2);
      f.depress = Math.max(0, f.depress - dt * 6);
    });
    this.sayT = Math.max(0, this.sayT - dt);

    // loop
    if (A.done && Bm.done && !A.grab && !Bm.grab) {
      this.idle += dt;
      if (!this.finished) {
        this.finished = true;
        this.stats.cycle = this.cycleT;
      }
      if (this.idle > 1.8) {
        this.stats.loops++;
        this.finished = false;
        if (this.loop) this.restartProgram();
        else this.idle = -1e9;
      }
    }
  }

  /** Static reachability check for the scenario program (used by tests / validator). */
  static unreachableSteps(scn: Scenario): string[] {
    const bad: string[] = [];
    const prog = scn.program();
    (["a", "b"] as Arm[]).forEach((arm) => {
      let pitch = REST.a3 * (180 / Math.PI);
      prog[arm].forEach((s, i) => {
        if (s.pitch !== undefined) pitch = s.pitch;
        if (!s.p) return;
        const r = ik(BASE[arm], s.p, pitch);
        if (!r.ok) bad.push(`${scn.id}/${arm}[${i}] ${s.p.map((v) => v.toFixed(1)).join(",")} pitch ${pitch}`);
      });
    });
    return bad;
  }
}
