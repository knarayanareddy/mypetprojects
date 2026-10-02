// Skill library: 29 scripted use-cases for two SO-101 arms, written against a small async DSL (Ctx).
// The exact same joint targets are streamed to the simulator and – if "Drive real arms" is on – to the hardware.
import { ARM_BASE, Pose, V3, clamp, ik, lerpPose } from "./kin";
import { ARMS, ArmId, Obj, hub } from "./hub";
import { Category } from "./models";
import { vision } from "./vision";
import { getModel } from "./models";

export class Aborted extends Error { constructor() { super("aborted"); } }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const OPEN = 60, CLOSED = 6;

export interface Ctx {
  move(arm: ArmId, to: V3, o?: { pitch?: number; roll?: number; grip?: number; dur?: number }): Promise<void>;
  grip(arm: ArmId, v: number, dur?: number): Promise<void>;
  pose(arm: ArmId, p: Pose, dur?: number): Promise<void>;
  wait(ms: number): Promise<void>;
  pick(arm: ArmId, id: string, o?: { pitch?: number }): Promise<void>;
  place(arm: ArmId, xz: [number, number], o?: { dy?: number }): Promise<void>;
  transfer(from: ArmId, to: ArmId): void;
  par(...fns: (() => Promise<void>)[]): Promise<void>;
  say(t: string): void;
  tap(arm: ArmId, xz: [number, number], freq: number, o?: { y?: number }): Promise<void>;
  home(arms?: ArmId[]): Promise<void>;
  tween(dur: number, fn: (t: number) => void): Promise<void>;
  obj(id: string): Obj;
  note(freq: number, dur?: number): void;
}

export interface Skill {
  id: string; name: string; emoji: string; category: Category; arms: 1 | 2; blurb: string; keywords: string[];
  sensors: string[]; difficulty: 1 | 2 | 3; realWorld: string;
  objects: () => Obj[];
  run: (c: Ctx) => Promise<void>;
}

const FLAT = new Set(["pad", "bin", "board", "paper", "tray", "plant", "button", "bar", "cloth", "drum", "slot", "stage", "knob"]);
const PICK = new Set(["cube", "ball", "cup", "pen", "bottle", "card", "tile", "piece", "laser", "phone", "tube", "candy", "die", "spoon"]);
const O = (id: string, kind: string, x: number, z: number, color: string, size: number, extra: Partial<Obj> = {}): Obj => ({
  id, kind, pos: [x, FLAT.has(kind) ? 0.05 : size / 2, z], color, size, held: null, pickable: PICK.has(kind), ...extra,
});

export function readyPose(arm: ArmId): Pose {
  const b = ARM_BASE[arm];
  return ik([b[0] * 0.8, 13, b[2] - 14], b, { pitch: 150, grip: 40 }).pose;
}

export function makeCtx(token: number): Ctx {
  const chk = () => { if (token !== hub.abortToken) throw new Aborted(); };
  const k = () => Math.max(0.15, hub.settings.speed * hub.profile.speed);
  const seg = async (arm: ArmId, end: Pose, dur?: number) => {
    const start = [...hub.arms[arm].target];
    const delta = Math.max(...end.map((v, i) => Math.abs(v - start[i]) * (i === 5 ? 0.4 : 1)));
    const d = ((dur ?? clamp(delta / 105, 0.3, 3)) / k()) * 1000;
    const t0 = performance.now();
    for (;;) {
      chk();
      const t = Math.min(1, (performance.now() - t0) / d);
      const e = t * t * (3 - 2 * t);
      const p = lerpPose(start, end, e);
      if (hub.profile.jitter > 0 && t < 1 && !hub.realDriving) for (let i = 0; i < 5; i++) p[i] += (Math.random() - 0.5) * hub.profile.jitter * 2;
      hub.setTarget(arm, p);
      if (t >= 1) break;
      await sleep(16);
    }
    hub.setTarget(arm, end);
  };
  const think = async () => { if (hub.profile.latencyMs > 0) { for (let i = 0; i < hub.profile.latencyMs / 50; i++) { chk(); await sleep(50); } } };
  const c: Ctx = {
    async move(arm, to, o = {}) {
      const cur = hub.arms[arm].target;
      const r = ik(to, ARM_BASE[arm], { pitch: o.pitch ?? 170, roll: o.roll ?? cur[4], grip: o.grip ?? cur[5] });
      if (!r.ok) hub.log(`Arm ${arm}: (${to.map((v) => v.toFixed(0)).join(", ")}) is at/over reach – clamped`, "warn");
      await seg(arm, r.pose, o.dur);
    },
    async grip(arm, v, dur = 0.35) {
      const p = [...hub.arms[arm].target];
      p[5] = v;
      await seg(arm, p, dur);
      if (v > 38) hub.release(arm);
    },
    async pose(arm, p, dur) { await seg(arm, p, dur); },
    async wait(ms) { const e = performance.now() + ms / k(); while (performance.now() < e) { chk(); await sleep(20); } },
    async pick(arm, id, o = {}) {
      const ob = hub.obj(id);
      if (!ob) throw new Error(`object ${id} not in scene`);
      await think();
      const pitch = o.pitch ?? 172;
      for (let attempt = 1; attempt <= 3; attempt++) {
        // 1) perception: if the camera is calibrated and “use vision” is on, find the object where it really is now
        if (hub.settings.useVision && vision.ready) {
          const seen = hub.relocate([id]);
          if (!seen.length) {
            if (hub.realDriving) throw new Error(`vision: ${id} (${ob.color}) is not visible to the “${vision.cal!.slot}” camera – refusing to reach into empty air`);
            hub.log(`vision: ${id} not found in camera frame – using scene position`, "warn");
          }
        }
        // 2) simulated policy clumsiness is *aim error in cm* (geometry decides the outcome) – never applied to real hardware
        let ax = 0, az = 0;
        if (!hub.realDriving && hub.profile.miss > 0) {
          // 2-D Gaussian aim error, σ chosen so P(tip lands outside the jaw tolerance) = profile.miss. Outcome is then pure geometry.
          const tol = ob.size * 0.55 + 1.1;
          const sigma = tol / Math.sqrt(-2 * Math.log(Math.max(hub.profile.miss, 1e-4)));
          const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
          ax = sigma * gauss(); az = sigma * gauss();
        }
        const [x, y, z] = ob.pos;
        await c.move(arm, [x + ax, y + 8, z + az], { grip: OPEN, pitch });
        await c.move(arm, [x + ax, Math.max(0.6, y), z + az], { pitch });
        await c.grip(arm, CLOSED, 0.4);
        // 3) sensing: servo stall (real) or tip–object geometry (sim). No random numbers.
        const g = await hub.verifyGrasp(arm, CLOSED, ob);
        if (g.held) {
          hub.attach(arm, ob);
          await c.move(arm, [x + ax, y + 9, z + az], { grip: CLOSED, pitch });
          if (hub.realDriving) {
            // slip check after lifting – a stalled gripper that lost the object drops to “closed, no load”
            const g2 = await hub.verifyGrasp(arm, CLOSED, ob);
            if (!g2.held) { ob.held = null; hub.log(`Arm ${arm}: lost ${id} during lift (${g2.why}) – retrying`, "warn"); await c.grip(arm, OPEN, 0.25); continue; }
          }
          if (hub.realDriving) hub.log(`Arm ${arm}: grasp confirmed – ${g.why}`);
          return;
        }
        hub.log(`Arm ${arm}: grasp on ${id} failed (attempt ${attempt}) – ${g.why}`, "warn");
        await c.grip(arm, OPEN, 0.25);
        await c.move(arm, [x + ax, y + 8, z + az], { grip: OPEN });
      }
      throw new Error(`could not grasp ${id} after 3 attempts`);
    },
    async place(arm, [x, z], o = {}) {
      const held = hub.holding(arm);
      const size = held?.size ?? 2;
      let y = size / 2;
      for (const u of hub.objects) {
        if (u === held || u.held || FLAT.has(u.kind)) continue;
        if (Math.hypot(u.pos[0] - x, u.pos[2] - z) < (u.size + size) * 0.45) y = Math.max(y, u.pos[1] + u.size / 2 + size / 2);
      }
      y += o.dy ?? 0;
      await think();
      await c.move(arm, [x, y + 8, z], { grip: CLOSED });
      await c.move(arm, [x, y + 0.3, z], { grip: CLOSED });
      await c.grip(arm, OPEN, 0.3);
      await c.move(arm, [x, y + 8, z], { grip: OPEN });
    },
    transfer(from, to) { const o = hub.holding(from); if (o) { o.held = to; hub.beep(660, 0.08); } },
    async par(...fns) { await Promise.all(fns.map((f) => f())); },
    say(t) { hub.say(t); },
    async tap(arm, [x, z], freq, o = {}) {
      const y = o.y ?? 1.6;
      await c.move(arm, [x, y + 5, z], { grip: CLOSED, dur: 0.22 });
      await c.move(arm, [x, y, z], { grip: CLOSED, dur: 0.16 });
      c.note(freq, 0.5);
      await c.move(arm, [x, y + 5, z], { grip: CLOSED, dur: 0.18 });
    },
    async home(arms = ARMS) { await Promise.all(arms.map((a) => seg(a, readyPose(a), 1.2))); },
    async tween(dur, fn) {
      const t0 = performance.now(), d = (dur * 1000) / k();
      for (;;) { chk(); const t = Math.min(1, (performance.now() - t0) / d); fn(t); if (t >= 1) break; await sleep(16); }
    },
    obj(id) { const o = hub.obj(id); if (!o) throw new Error(`object ${id} missing`); return o; },
    note(f, d = 0.3) { hub.beep(f, d); },
  };
  return c;
}

// ---------- helpers for skills ----------
const draw = async (c: Ctx, arm: ArmId, pts: [number, number][], dur = 0.5) => {
  await c.move(arm, [pts[0][0], 4, pts[0][1]], { pitch: 172 });
  for (const p of pts) await c.move(arm, [p[0], 0.9, p[1]], { pitch: 172, dur });
  await c.move(arm, [pts[pts.length - 1][0], 5, pts[pts.length - 1][1]], { pitch: 172 });
};
const pourOver = async (c: Ctx, arm: ArmId, at: [number, number], targetId: string, amt: number) => {
  await c.move(arm, [at[0] - 1, 15, at[1]], { grip: CLOSED, pitch: 150 });
  const start = hub.arms[arm].target[4];
  const tg = hub.obj(targetId);
  const base = tg?.state ?? 0;
  await c.tween(1.3, (t) => { const p = [...hub.arms[arm].target]; p[4] = start + 75 * t; hub.setTarget(arm, p); });
  await c.tween(1.2, (t) => { if (tg) tg.state = Math.min(1, base + amt * t); });
  await c.tween(0.9, (t) => { const p = [...hub.arms[arm].target]; p[4] = start + 75 * (1 - t); hub.setTarget(arm, p); });
};
const swing = async (c: Ctx, arm: ArmId, joint: number, center: number, amp: number, n: number, dur = 0.28) => {
  for (let i = 0; i < n; i++) {
    for (const s of [1, -1]) { const p = [...hub.arms[arm].target]; p[joint] = center + s * amp; await c.pose(arm, p, dur); }
  }
};

const star = (cx: number, cz: number, r: number): [number, number][] =>
  [0, 2, 4, 1, 3, 0].map((i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [cx + r * Math.cos(a), cz + r * Math.sin(a)] as [number, number]; });
const heart = (cx: number, cz: number, r: number): [number, number][] =>
  Array.from({ length: 25 }, (_, i) => { const t = (i / 24) * Math.PI * 2; return [cx + (r * 16 * Math.sin(t) ** 3) / 16, cz - (r * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))) / 16] as [number, number]; });

const paper = (x: number, z: number) => O("paper", "paper", x, z, "#f8fafc", 0.1, { w: 16, d: 12 });

export const SKILLS: Skill[] = [
  {
    id: "pick_place", name: "Pick & place a cube", emoji: "🧊", category: "Pick & place", arms: 1, difficulty: 1,
    blurb: "The hello-world of manipulation: grab the red cube and drop it on the target pad.",
    keywords: ["pick", "place", "move", "cube", "grab", "put", "block"], sensors: ["top camera (for live object location)"],
    realWorld: "Bin picking, kitting, packaging.",
    objects: () => [O("pad", "pad", -3, 4, "#22c55e", 0.1, { w: 7, d: 7, label: "target" }), O("cube", "cube", -17, -1, "#ef4444", 3)],
    async run(c) { c.say("Reach → grasp → lift → place"); await c.pick("A", "cube"); await c.place("A", [-3, 4]); },
  },
  {
    id: "sort_colors", name: "Colour sorting (2 arms)", emoji: "🎨", category: "Bimanual", arms: 2, difficulty: 2,
    blurb: "Both arms work in parallel: A takes red cubes to the red bin, B takes blue cubes to the blue bin.",
    keywords: ["sort", "colour", "color", "separate", "bins", "recycle"], sensors: ["top RGB camera for colour classification"],
    realWorld: "Recycling lines, QC sorting, LEGO sorting.",
    objects: () => [
      O("binR", "bin", -14, -2, "#ef4444", 0.1, { w: 8, d: 8 }), O("binB", "bin", 14, -2, "#3b82f6", 0.1, { w: 8, d: 8 }),
      O("r1", "cube", -3, 1, "#ef4444", 2.6), O("b1", "cube", 3, 1, "#3b82f6", 2.6), O("r2", "cube", -3, -3, "#ef4444", 2.6), O("b2", "cube", 3, -3, "#3b82f6", 2.6),
    ],
    async run(c) {
      c.say("Parallel sorting by colour");
      for (const [r, b] of [["r1", "b1"], ["r2", "b2"]]) {
        await c.par(async () => { await c.pick("A", r); await c.place("A", [-14, -2]); }, async () => { await c.pick("B", b); await c.place("B", [14, -2]); });
      }
    },
  },
  {
    id: "tower", name: "Build a cube tower", emoji: "🏗️", category: "Pick & place", arms: 1, difficulty: 2,
    blurb: "Stack three cubes into a tower – precise vertical placement with stack-height awareness.",
    keywords: ["stack", "tower", "build", "pile"], sensors: ["wrist camera (alignment)", "gripper current (contact)"],
    realWorld: "Palletising, assembly staging.",
    objects: () => [O("c1", "cube", -20, 4, "#f97316", 3), O("c2", "cube", -18, -3, "#eab308", 3), O("c3", "cube", -12, -6, "#a855f7", 3), O("base", "pad", -6, 2, "#94a3b8", 0.1, { w: 5, d: 5 })],
    async run(c) { for (const id of ["c1", "c2", "c3"]) { await c.pick("A", id); await c.place("A", [-6, 2]); } c.say("Tower complete – 3 high"); },
  },
  {
    id: "handover", name: "Mid-air hand-over", emoji: "🤝", category: "Bimanual", arms: 2, difficulty: 3,
    blurb: "Arm A fetches a ball, passes it to Arm B in mid-air, B drops it in a cup on the far side.",
    keywords: ["hand", "handover", "pass", "give", "transfer", "bimanual"], sensors: ["gripper current / load for release timing", "side camera"],
    realWorld: "Assisting a person: hand me the tool.",
    objects: () => [O("ball", "ball", -18, 0, "#f43f5e", 2.6), O("cupB", "bin", 20, -2, "#14b8a6", 0.1, { w: 7, d: 7 })],
    async run(c) {
      await c.pick("A", "ball");
      c.say("Meeting in the middle");
      await c.par(
        () => c.move("A", [-1.2, 11, 3], { pitch: 100, grip: CLOSED }),
        () => c.move("B", [4, 11, 3], { pitch: 100, grip: OPEN }),
      );
      await c.move("B", [1.2, 11, 3], { pitch: 100, grip: OPEN, dur: 0.6 });
      await c.grip("B", CLOSED, 0.4);
      c.transfer("A", "B");
      await c.grip("A", OPEN, 0.3);
      await c.par(() => c.home(["A"]), async () => { await c.move("B", [20, 12, -2], { pitch: 150, grip: CLOSED }); });
      await c.place("B", [20, -2]);
    },
  },
  {
    id: "pour", name: "Pour a drink", emoji: "🥤", category: "Home & care", arms: 1, difficulty: 2,
    blurb: "Pick up the bottle, tilt with wrist-roll over the glass, fill it and put the bottle back.",
    keywords: ["pour", "drink", "water", "fill", "glass", "bartender", "bottle"], sensors: ["load cell under glass (fill level)", "top camera"],
    realWorld: "Assistive drink pouring, lab liquid handling.",
    objects: () => [O("bottle", "bottle", -19, 2, "#38bdf8", 9), O("glass", "cup", -6, -1, "#e2e8f0", 5, { state: 0 })],
    async run(c) {
      await c.pick("A", "bottle");
      await pourOver(c, "A", [-6, -1], "glass", 1);
      c.say("Glass full – returning bottle");
      await c.place("A", [-19, 2]);
    },
  },
  {
    id: "wave", name: "Wave hello", emoji: "👋", category: "Creative", arms: 1, difficulty: 1,
    blurb: "Raise the arm and wave – the classic social-robot greeting.",
    keywords: ["wave", "hello", "hi", "greet", "welcome", "goodbye"], sensors: ["USB mic / person detection (optional trigger)"],
    realWorld: "Reception / event greeter.",
    objects: () => [],
    async run(c) {
      c.say("👋 Hello!");
      await c.pose("A", [0, -5, -45, 10, 0, 50], 1);
      await swing(c, "A", 0, 0, 22, 3);
      await swing(c, "A", 4, 0, 45, 2, 0.22);
      await c.home(["A"]);
    },
  },
  {
    id: "high_five", name: "High-five duet", emoji: "🙌", category: "Bimanual", arms: 2, difficulty: 1,
    blurb: "Both arms raise and clap in the centre – instant crowd-pleaser for demos.",
    keywords: ["high five", "highfive", "clap", "applause", "five"], sensors: ["none"], realWorld: "Fun interaction / marketing demo.",
    objects: () => [],
    async run(c) {
      c.say("High five!");
      await c.par(() => c.move("A", [-5, 14, 3], { pitch: 105, grip: OPEN }), () => c.move("B", [5, 14, 3], { pitch: 105, grip: OPEN }));
      for (let i = 0; i < 2; i++) {
        await c.par(() => c.move("A", [-1, 14, 3], { pitch: 105, dur: 0.35 }), () => c.move("B", [1, 14, 3], { pitch: 105, dur: 0.35 }));
        c.note(300, 0.15);
        await c.par(() => c.move("A", [-6, 14, 3], { pitch: 105, dur: 0.3 }), () => c.move("B", [6, 14, 3], { pitch: 105, dur: 0.3 }));
      }
      await c.home();
    },
  },
  {
    id: "draw_star", name: "Draw a star", emoji: "⭐", category: "Creative", arms: 1, difficulty: 2,
    blurb: "Pick up a marker and draw a five-pointed star on the paper.",
    keywords: ["draw", "star", "sketch", "marker", "pen"], sensors: ["force/current feedback for pen pressure"], realWorld: "Plotter / signage / art.",
    objects: () => [paper(-4, 0), O("pen", "pen", -19, 6, "#1d4ed8", 6)],
    async run(c) { await c.pick("A", "pen"); await draw(c, "A", star(-4, 0, 4.6), 0.55); await c.place("A", [-19, 6]); },
  },
  {
    id: "draw_heart", name: "Draw a heart", emoji: "❤️", category: "Creative", arms: 1, difficulty: 2,
    blurb: "Smooth parametric curve – shows off trajectory quality (great policy-vs-script comparison).",
    keywords: ["heart", "love", "valentine"], sensors: ["none"], realWorld: "Greeting-card personalisation.",
    objects: () => [paper(-4, 0), O("pen", "pen", -19, 6, "#dc2626", 6)],
    async run(c) { await c.pick("A", "pen"); await draw(c, "A", heart(-4, 0, 5.2), 0.22); await c.place("A", [-19, 6]); },
  },
  {
    id: "write_hi", name: "Write “HI”", emoji: "✍️", category: "Creative", arms: 1, difficulty: 2,
    blurb: "Stroke-based handwriting: two letters with pen lifts in between.",
    keywords: ["write", "text", "letters", "hi", "signature", "calligraphy"], sensors: ["none"], realWorld: "Labelling, signatures, sign-writing.",
    objects: () => [paper(-4, 0), O("pen", "pen", -19, 6, "#0f172a", 6)],
    async run(c) {
      await c.pick("A", "pen");
      const strokes: [number, number][][] = [[[-9, -3], [-9, 3]], [[-6, -3], [-6, 3]], [[-9, 0], [-6, 0]], [[-2, -3], [-2, 3]]];
      for (const s of strokes) await draw(c, "A", s, 0.6);
      await c.place("A", [-19, 6]);
    },
  },
  {
    id: "xylophone", name: "Play xylophone", emoji: "🎼", category: "Music & play", arms: 1, difficulty: 2,
    blurb: "Taps the bars to play ‘Ode to Joy’. Sound is synthesised in the browser so you can hear timing precision.",
    keywords: ["xylophone", "music", "play", "song", "piano", "melody", "tune"], sensors: ["USB microphone to verify pitch"], realWorld: "Music education, timing/dexterity benchmark.",
    objects: () => ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"].map((col, i) => O(`bar${i}`, "bar", -23 + i * 4.2, 3, col, 0.4, { w: 3.4, d: 9, label: "CDEFG"[i] })),
    async run(c) {
      const f = [261.6, 293.7, 329.6, 349.2, 392];
      const song = [2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 2, 1, 1];
      c.say("♪ Ode to Joy");
      await c.grip("A", CLOSED, 0.3);
      for (const n of song) await c.tap("A", [-23 + n * 4.2, 3], f[n]);
    },
  },
  {
    id: "drums", name: "Drum duet", emoji: "🥁", category: "Music & play", arms: 2, difficulty: 2,
    blurb: "Two arms play a rhythm pattern with simultaneous hits – synchronisation test.",
    keywords: ["drum", "drums", "beat", "rhythm", "percussion"], sensors: ["USB microphone"], realWorld: "Latency/sync benchmark for bimanual control.",
    objects: () => [O("dA", "drum", -9, 3, "#f43f5e", 0.5, { w: 8, d: 8 }), O("dB", "drum", 9, 3, "#6366f1", 0.5, { w: 8, d: 8 })],
    async run(c) {
      c.say("🥁 Boom – tish");
      await c.par(() => c.grip("A", CLOSED, 0.3), () => c.grip("B", CLOSED, 0.3));
      const pat: [number, number][] = [[1, 0], [0, 1], [1, 1], [0, 1], [1, 0], [1, 0], [1, 1], [1, 1]];
      for (const [a, b] of pat) {
        await c.par(
          async () => { if (a) await c.tap("A", [-9, 3], 110, { y: 1 }); },
          async () => { if (b) await c.tap("B", [9, 3], 220, { y: 1 }); },
        );
      }
    },
  },
  {
    id: "dealer", name: "Card dealer", emoji: "🃏", category: "Games", arms: 1, difficulty: 2,
    blurb: "Peel cards off the deck and deal them to four positions.",
    keywords: ["card", "cards", "deal", "poker", "shuffle", "dealer"], sensors: ["wrist camera (card edge)", "suction/gripper current"], realWorld: "Casino automation, document feeding.",
    objects: () => [0, 1, 2, 3].map((i) => O(`card${i}`, "card", -21, 8, ["#ef4444", "#3b82f6", "#22c55e", "#eab308"][i], 0.3, { w: 4.5, d: 6.5, pos: [-21, 0.15 + i * 0.3, 8] })),
    async run(c) {
      const slots: [number, number][] = [[-10, -2], [-3, 3], [-3, -2], [-9, 6]];
      for (let i = 3; i >= 0; i--) { await c.pick("A", `card${i}`, { pitch: 176 }); await c.place("A", slots[3 - i]); }
    },
  },
  {
    id: "chess", name: "Chess: move & capture", emoji: "♟️", category: "Games", arms: 2, difficulty: 3,
    blurb: "A and B each advance a pawn, then B captures A's pawn and removes it from the board.",
    keywords: ["chess", "pawn", "board game", "capture"], sensors: ["top camera + board detection", "wrist camera"], realWorld: "Physical board-game opponent.",
    objects: () => [O("board", "board", 0, -2, "#b45309", 0.1, { w: 16, d: 16 }), O("wp", "piece", -4, 2, "#f1f5f9", 3.6), O("bp", "piece", 4, -6, "#1e293b", 3.6)],
    async run(c) {
      await c.pick("A", "wp"); await c.place("A", [-4, -2]);
      await c.pick("B", "bp"); await c.place("B", [4, -2]);
      await c.pick("A", "wp"); await c.place("A", [0, -2]);
      c.say("Black captures!");
      await c.pick("B", "wp"); await c.place("B", [22, 6]);
      await c.pick("B", "bp"); await c.place("B", [0, -2]);
    },
  },
  {
    id: "tictactoe", name: "Tic-tac-toe match", emoji: "❌", category: "Games", arms: 2, difficulty: 2,
    blurb: "A plays X, B plays O, alternating turns on a shared grid. X wins on the diagonal.",
    keywords: ["tic", "tac", "toe", "noughts", "crosses", "game"], sensors: ["top camera to read the board"], realWorld: "Turn-taking human-robot games.",
    objects: () => [
      O("grid", "board", 0, 2, "#334155", 0.1, { w: 14, d: 14 }),
      O("x1", "tile", -22, 6, "#ef4444", 1.2), O("x2", "tile", -22, 0, "#ef4444", 1.2), O("x3", "tile", -20, -4, "#ef4444", 1.2),
      O("o1", "tile", 22, 6, "#3b82f6", 1.2), O("o2", "tile", 22, 0, "#3b82f6", 1.2),
    ],
    async run(c) {
      const turn = async (arm: ArmId, id: string, xz: [number, number]) => { await c.pick(arm, id); await c.place(arm, xz); };
      await turn("A", "x1", [0, 2]); await turn("B", "o1", [4.5, 2]); await turn("A", "x2", [-4.5, -2.5]);
      await turn("B", "o2", [4.5, -2.5]); await turn("A", "x3", [4.5, 6.5]);
      c.say("X wins on the diagonal 🎉");
    },
  },
  {
    id: "shell", name: "Shell game", emoji: "🥤", category: "Games", arms: 1, difficulty: 3,
    blurb: "Hide a ball under a cup, shuffle the cups, then reveal – tests trajectory tracking under motion.",
    keywords: ["shell", "cups", "shuffle", "hide", "magic", "trick", "guess"], sensors: ["top camera (track the ball cup)"], realWorld: "Entertainment, visual-tracking evaluation.",
    objects: () => [O("ball", "ball", -4, 2, "#facc15", 2, { state: 9 }), O("k1", "cup", -10, 2, "#ef4444", 4.5), O("k2", "cup", -4, 2, "#22c55e", 4.5), O("k3", "cup", 2, 2, "#3b82f6", 4.5)],
    async run(c) {
      const P: [number, number][] = [[-10, 2], [-4, 2], [2, 2]];
      const swap = async (a: string, b: string, pa: [number, number], pb: [number, number]) => {
        await c.pick("A", a); await c.place("A", [-14, -5]);
        await c.pick("A", b); await c.place("A", pa);
        await c.pick("A", a); await c.place("A", pb);
      };
      c.say("Watch the ball…");
      await swap("k1", "k2", P[0], P[1]); await swap("k2", "k3", P[0], P[2]);
      c.say("Where is the ball? Revealing…");
      await c.pick("A", "k2"); await c.place("A", [-14, -5]);
    },
  },
  {
    id: "plants", name: "Water the plants", emoji: "🪴", category: "Home & care", arms: 1, difficulty: 2,
    blurb: "Grabs a watering bottle and waters three plants one by one.",
    keywords: ["plant", "plants", "water", "garden", "flower", "watering"], sensors: ["soil-moisture sensor via serial/GPIO", "top camera"], realWorld: "Home gardening, greenhouse care.",
    objects: () => [O("can", "bottle", -21, 8, "#22c55e", 8), O("p1", "plant", -10, -2, "#16a34a", 3, { state: 0 }), O("p2", "plant", -2, 1, "#16a34a", 3, { state: 0 }), O("p3", "plant", -7, -6, "#16a34a", 3, { state: 0 })],
    async run(c) {
      await c.pick("A", "can");
      for (const id of ["p1", "p2", "p3"]) { const p = c.obj(id); await pourOver(c, "A", [p.pos[0], p.pos[2]], id, 1); }
      await c.place("A", [-21, 8]);
    },
  },
  {
    id: "buttons", name: "Smart-home button presser", emoji: "💡", category: "Home & care", arms: 2, difficulty: 1,
    blurb: "Presses physical buttons (lights, coffee, fan, TV) – retrofits any dumb device into a smart one.",
    keywords: ["button", "press", "light", "switch", "coffee", "lights", "fan", "tv", "toggle", "smart home"], sensors: ["camera/LED sensor to confirm state"], realWorld: "Accessibility: operate switches for people with limited mobility.",
    objects: () => [
      O("b1", "button", -12, 0, "#fbbf24", 1, { label: "💡 Lights", state: 0 }), O("b2", "button", -6, -3, "#a16207", 1, { label: "☕ Coffee", state: 0 }),
      O("b3", "button", 6, -3, "#38bdf8", 1, { label: "🌀 Fan", state: 0 }), O("b4", "button", 12, 0, "#a78bfa", 1, { label: "📺 TV", state: 0 }),
    ],
    async run(c) {
      const press = async (arm: ArmId, id: string) => { const b = c.obj(id); await c.tap(arm, [b.pos[0], b.pos[2]], 700, { y: 1.3 }); b.state = 1; };
      await c.par(() => c.grip("A", CLOSED, 0.3), () => c.grip("B", CLOSED, 0.3));
      await c.par(async () => { await press("A", "b1"); await press("A", "b2"); }, async () => { await press("B", "b3"); await press("B", "b4"); });
      c.say("All devices ON");
    },
  },
  {
    id: "pillbox", name: "Pill-box loader (candy demo)", emoji: "💊", category: "Home & care", arms: 1, difficulty: 2,
    blurb: "Fills a weekly organiser, one candy per day slot. Use candy only – never real medication in a hackathon demo.",
    keywords: ["pill", "pills", "medicine", "organiser", "organizer", "candy", "dispense"], sensors: ["wrist camera (count verification)"], realWorld: "Medication-prep assistance prototype (with pharmacist verification).",
    objects: () => [
      ...["Mon", "Tue", "Wed", "Thu"].map((d, i) => O(`s${i}`, "slot", -12 + i * 4.4, -2, "#cbd5e1", 0.2, { w: 3.6, d: 4, label: d })),
      ...[0, 1, 2, 3].map((i) => O(`m${i}`, "candy", -22 + (i % 2) * 2.5, 9 - Math.floor(i / 2) * 2.5, ["#f43f5e", "#22c55e", "#3b82f6", "#facc15"][i], 1.3)),
    ],
    async run(c) { for (let i = 0; i < 4; i++) { await c.pick("A", `m${i}`); await c.place("A", [-12 + i * 4.4, -2]); } c.say("Week loaded"); },
  },
  {
    id: "tubes", name: "Centrifuge loading", emoji: "🧪", category: "Lab & industry", arms: 2, difficulty: 3,
    blurb: "Both arms load opposite centrifuge slots (balanced!), spin, then unload.",
    keywords: ["tube", "tubes", "lab", "centrifuge", "sample", "laboratory", "pipette", "science"], sensors: ["barcode camera", "tube-presence IR sensor"], realWorld: "Lab automation: sample handling.",
    objects: () => [O("cf", "stage", 0, 0, "#64748b", 0.5, { w: 14, d: 14, state: 0 }), O("t1", "tube", -20, 5, "#f87171", 6), O("t2", "tube", 20, 5, "#60a5fa", 6)],
    async run(c) {
      await c.par(async () => { await c.pick("A", "t1"); await c.place("A", [-4, 0]); }, async () => { await c.pick("B", "t2"); await c.place("B", [4, 0]); });
      c.say("Spinning…");
      const cf = c.obj("cf");
      for (const t of [0.15, 0.3]) c.note(200 + t * 800, 0.4);
      await c.par(() => c.home(), () => c.tween(3, (t) => { cf.state = t * Math.PI * 14; hub.bump(); }));
      await c.par(async () => { await c.pick("A", "t1"); await c.place("A", [-20, 5]); }, async () => { await c.pick("B", "t2"); await c.place("B", [20, 5]); });
    },
  },
  {
    id: "cupstack", name: "Speed cup stacking", emoji: "🥛", category: "Games", arms: 2, difficulty: 2,
    blurb: "Arms alternate stacking four cups in the middle.",
    keywords: ["cup stack", "cups", "stacking", "speed stack", "pyramid"], sensors: ["none"], realWorld: "Dexterity benchmark, dish handling.",
    objects: () => [O("u1", "cup", -20, 6, "#ef4444", 3.5), O("u2", "cup", 20, 6, "#3b82f6", 3.5), O("u3", "cup", -18, -2, "#f59e0b", 3.5), O("u4", "cup", 18, -2, "#10b981", 3.5)],
    async run(c) {
      for (const [arm, id] of [["A", "u1"], ["B", "u2"], ["A", "u3"], ["B", "u4"]] as [ArmId, string][]) { await c.pick(arm, id); await c.place(arm, [0, 2]); }
      c.say("Tower of 4!");
    },
  },
  {
    id: "tidy", name: "Tidy the desk (2 arms)", emoji: "🧹", category: "Home & care", arms: 2, difficulty: 2,
    blurb: "Each arm clears items within its reach into a shared tray.",
    keywords: ["tidy", "clean", "clear", "desk", "organise", "organize", "declutter", "mess"], sensors: ["top camera + object detector (YOLO/OWL-ViT)"], realWorld: "Desk-tidying assistant.",
    objects: () => [
      O("tray", "tray", 0, 8, "#475569", 0.2, { w: 14, d: 8 }), O("it1", "pen", -20, 0, "#0ea5e9", 6), O("it2", "cube", -12, -4, "#f97316", 2.6), O("it3", "ball", -9, 3, "#ec4899", 2.6),
      O("it4", "cube", 20, 0, "#84cc16", 2.6), O("it5", "ball", 12, -4, "#a855f7", 2.6),
    ],
    async run(c) {
      await c.par(
        async () => { for (const [i, x] of [["it1", -3.5], ["it2", -1.5], ["it3", 0]] as [string, number][]) { await c.pick("A", i); await c.place("A", [x, 8]); } },
        async () => { for (const [i, x] of [["it4", 3.5], ["it5", 1.5]] as [string, number][]) { await c.pick("B", i); await c.place("B", [x, 8]); } },
      );
      c.say("Desk is tidy ✔");
    },
  },
  {
    id: "cloth", name: "Fold a cloth (bimanual)", emoji: "🧺", category: "Bimanual", arms: 2, difficulty: 3,
    blurb: "Each arm pinches an edge and folds it over the middle – a tri-fold. Cloth is the classic deformable-object stress test.",
    keywords: ["fold", "cloth", "towel", "laundry", "shirt", "napkin"], sensors: ["top camera (cloth corners/segmentation)", "wrist cameras"], realWorld: "Laundry folding, garment handling.",
    objects: () => [O("cl", "cloth", 0, 2, "#f472b6", 0.2, { w: 16, d: 11, state: 0, tilt: 0 })],
    async run(c) {
      const cl = c.obj("cl");
      await c.par(() => c.move("A", [-8, 1.2, 2], { grip: OPEN }), () => c.move("B", [8, 1.2, 2], { grip: OPEN }));
      await c.par(() => c.grip("A", CLOSED, 0.4), () => c.grip("B", CLOSED, 0.4));
      await c.par(() => c.move("A", [-8, 7, 2], { grip: CLOSED }), () => c.move("B", [8, 7, 2], { grip: CLOSED }));
      c.say("Folding left edge over the middle");
      await c.move("A", [-2.6, 6, 2], { grip: CLOSED, dur: 1.4 });
      await c.tween(0.4, (t) => { cl.state = t; });
      await c.move("A", [-2.6, 1.6, 2], { grip: CLOSED, dur: 0.5 });
      await c.grip("A", OPEN, 0.3);
      c.say("…and the right edge");
      await c.move("B", [2.6, 6, 2], { grip: CLOSED, dur: 1.4 });
      await c.tween(0.4, (t) => { cl.tilt = t; });
      await c.move("B", [2.6, 1.6, 2], { grip: CLOSED, dur: 0.5 });
      await c.grip("B", OPEN, 0.3);
    },
  },
  {
    id: "laser", name: "Cat-toy laser teaser", emoji: "🐱", category: "Creative", arms: 1, difficulty: 1,
    blurb: "Holds a laser pointer and sweeps a random-looking Lissajous pattern for your pet.",
    keywords: ["cat", "pet", "dog", "laser", "play", "toy", "kitten"], sensors: ["pet-detect camera (optional)", "servo-safe class-1 laser"], realWorld: "Pet entertainment while you're out.",
    objects: () => [O("pa", "pad", -4, -3, "#fde68a", 0.05, { w: 22, d: 14 }), O("lz", "laser", -20, 7, "#ef4444", 7)],
    async run(c) {
      await c.pick("A", "lz");
      c.say("Here kitty… 🐾");
      await c.move("A", [-4, 5, -3], { grip: CLOSED, pitch: 150 });
      for (let i = 0; i <= 28; i++) {
        const t = i / 28 * Math.PI * 4;
        await c.move("A", [-4 + 9 * Math.sin(t * 1.0), 5, -3 + 5 * Math.sin(t * 1.5 + 1)], { grip: CLOSED, pitch: 150, dur: 0.25 });
      }
      await c.place("A", [-20, 7]);
    },
  },
  {
    id: "timelapse", name: "Time-lapse photographer", emoji: "📸", category: "Creative", arms: 1, difficulty: 2,
    blurb: "Carries a phone on a smooth arc around a subject and snaps a photo at each station.",
    keywords: ["photo", "camera", "picture", "timelapse", "time-lapse", "film", "selfie", "photograph"], sensors: ["phone camera (USB / IP webcam)"], realWorld: "Product photography, 360° captures, content creation.",
    objects: () => [O("pl", "plant", -3, -2, "#16a34a", 4), O("ph", "phone", -21, 7, "#0f172a", 1.2)],
    async run(c) {
      await c.pick("A", "ph", { pitch: 176 });
      for (const [x, z] of [[-14, -8], [-15, 0], [-12, 6]] as [number, number][]) {
        await c.move("A", [x, 11, z], { grip: CLOSED, pitch: 130, dur: 1.2 });
        await c.wait(250); hub.flash(); hub.say("📸 click"); await c.wait(300);
      }
      await c.place("A", [-21, 7]);
    },
  },
  {
    id: "dice", name: "Dice roller", emoji: "🎲", category: "Games", arms: 1, difficulty: 1,
    blurb: "Lifts a die, drops it from height and reports the result – a physical RNG for board games.",
    keywords: ["dice", "die", "roll", "random", "board game", "gamble"], sensors: ["top camera to read the face (pip counting)"], realWorld: "Tabletop gaming, randomised experiments.",
    objects: () => [O("die", "die", -19, 4, "#f8fafc", 2.6, { label: "?" })],
    async run(c) {
      const d = c.obj("die");
      await c.pick("A", "die");
      await c.move("A", [-8, 16, 2], { grip: CLOSED, pitch: 150 });
      await c.grip("A", OPEN, 0.2);
      const r = 1 + Math.floor(Math.random() * 6);
      await c.tween(0.9, (t) => { d.label = t < 1 ? String(1 + Math.floor(Math.random() * 6)) : String(r); });
      d.label = String(r);
      c.say(`Rolled a ${r}`);
      await c.wait(800);
    },
  },
  {
    id: "microscope", name: "Microscope slide + focus", emoji: "🔬", category: "Lab & industry", arms: 2, difficulty: 3,
    blurb: "A loads the slide onto the stage, B grips the focus knob and sweeps it with wrist-roll.",
    keywords: ["microscope", "slide", "focus", "biology", "lab", "specimen"], sensors: ["microscope camera feed for autofocus metric"], realWorld: "Digital pathology, lab automation.",
    objects: () => [O("st", "stage", -4, 0, "#94a3b8", 0.4, { w: 9, d: 9 }), O("sl", "card", -21, 4, "#a5f3fc", 0.3, { w: 5, d: 2 }), O("kn", "knob", 11, -1, "#f59e0b", 1.6, { state: 0 })],
    async run(c) {
      await c.pick("A", "sl", { pitch: 176 }); await c.place("A", [-4, 0], { dy: 0.1 });
      c.say("Focus sweep");
      const kn = c.obj("kn");
      await c.move("B", [11, 7, -1], { grip: OPEN, pitch: 172 });
      await c.move("B", [11, 2.4, -1], { pitch: 172 });
      await c.grip("B", CLOSED, 0.3);
      for (const r of [80, -80, 20]) {
        const s = hub.arms.B.target[4];
        await c.tween(0.9, (t) => { const p = [...hub.arms.B.target]; p[4] = s + (r - s) * t; hub.setTarget("B", p); kn.state = p[4]; });
        c.note(300 + r, 0.12);
      }
      await c.grip("B", OPEN, 0.3);
    },
  },
  {
    id: "coffee", name: "Stir the coffee (bimanual)", emoji: "☕", category: "Home & care", arms: 2, difficulty: 3,
    blurb: "B holds the cup steady in the middle while A stirs with a spoon, then B serves it.",
    keywords: ["coffee", "stir", "tea", "mix", "cafe", "barista", "spoon"], sensors: ["gripper current (cup grip force)", "top camera"], realWorld: "Barista / kitchen assistant.",
    objects: () => [O("mug", "cup", 14, 4, "#fef3c7", 5, { state: 0.8 }), O("sp", "spoon", -21, 7, "#cbd5e1", 8)],
    async run(c) {
      await c.pick("B", "mug"); await c.move("B", [2, 8, 3], { grip: CLOSED, pitch: 165 });
      await c.pick("A", "sp");
      c.say("Stirring…");
      await c.move("A", [-1.5, 8.5, 3], { grip: CLOSED, pitch: 165 });
      for (let i = 0; i <= 16; i++) { const a = (i / 8) * Math.PI; await c.move("A", [-0.3 + 1.2 * Math.cos(a), 6.8, 3 + 1.2 * Math.sin(a)], { grip: CLOSED, pitch: 165, dur: 0.18 }); }
      await c.move("A", [-1.5, 10, 3], { grip: CLOSED, pitch: 165 });
      await c.par(() => c.place("A", [-21, 7]), () => c.place("B", [10, -2]));
      c.say("Coffee served ☕");
    },
  },
  {
    id: "dance", name: "Dance duet", emoji: "💃", category: "Creative", arms: 2, difficulty: 1,
    blurb: "Mirror-symmetric choreography with beeps for the beat. Zero objects – pure joint-space motion.",
    keywords: ["dance", "choreography", "show", "perform", "groove", "boogie"], sensors: ["audio in (beat-tracking, optional)"], realWorld: "Entertainment, joint-limit/speed stress test.",
    objects: () => [],
    async run(c) {
      c.say("💃 Showtime");
      const mir = (p: Pose): Pose => [-p[0], p[1], p[2], p[3], -p[4], p[5]];
      const moves: Pose[] = [[35, -20, 20, 20, 40, 60], [-35, 10, -20, 40, -40, 20], [20, -40, 40, -20, 70, 60], [-20, 20, 0, 50, -70, 10], [0, -5, -45, 10, 0, 60], [45, -30, 30, 0, 90, 30]];
      let beat = 0;
      for (const p of moves) { c.note(220 + (beat++ % 4) * 110, 0.12); await c.par(() => c.pose("A", p, 0.45), () => c.pose("B", mir(p), 0.45)); }
      await c.par(() => swing(c, "A", 0, 0, 40, 2, 0.25), () => swing(c, "B", 0, 0, 40, 2, 0.25));
      await c.home();
    },
  },
];

export const skillById = (id: string) => SKILLS.find((s) => s.id === id);

// ---------- runner ----------
export async function runSkill(s: Skill, opts: { keepScene?: boolean } = {}): Promise<boolean> {
  if (hub.estopped) { hub.log("E-stop is active", "error"); return false; }
  hub.stopPolicy();
  const token = ++hub.abortToken;
  hub.setSource("skill");
  if (!opts.keepScene) hub.loadScene(s.name, s.objects());
  hub.runName = s.name; hub.runStatus = "running"; hub.say(s.name);
  const ctx = makeCtx(token);
  const t0 = performance.now();
  let status: "done" | "failed" | "aborted" = "done";
  let note = "";
  hub.log(`▶ ${s.name} · model profile: ${getModel(hub.settings.modelId).name}${hub.settings.drive ? " · REAL ARMS" : " · sim"}`);
  try {
    await ctx.home(s.arms === 2 ? ARMS : ["A"]);
    await s.run(ctx);
    await ctx.home(ARMS);
  } catch (e) {
    if (e instanceof Aborted) status = "aborted"; else { status = "failed"; note = (e as Error).message; hub.log(`✖ ${s.name}: ${note}`, "error"); }
  } finally {
    if (token === hub.abortToken) { hub.source = "idle"; }
    hub.runStatus = status;
    hub.addHistory({ t: Date.now(), name: s.name, status, ms: performance.now() - t0, model: getModel(hub.settings.modelId).name, note, real: hub.settings.drive });
    if (status === "done") hub.log(`✔ ${s.name} finished in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  }
  return status === "done";
}

export async function runSequence(list: Skill[]) {
  for (let i = 0; i < list.length; i++) {
    const ok = await runSkill(list[i]);
    if (!ok) break;
  }
}
