import { ball, box, cyl, home, mv, plot, slab, strike, sync, TAU, tone, turn, wait } from "./dsl";
import type { Scenario, Step } from "./types";

const KEY_X = [-12.6, -9, -5.4, -1.8, 1.8, 5.4, 9, 12.6];
const FREQ = [261.6, 293.7, 329.6, 349.2, 392, 440, 493.9, 523.3];
const RAINBOW = [0xff5a5f, 0xff9f43, 0xfeca57, 0x1dd1a1, 0x48dbfb, 0x54a0ff, 0x8e6bff, 0xff6bd6];
const ODE = [2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 2, 1, 1];

const piano: Scenario = {
  id: "piano",
  title: "Robo-Pianist Duo",
  emoji: "🎹",
  category: "Music & Art",
  tagline: "Two arms play a keyboard together",
  story: "Each arm covers the keys it can reach and they trade the melody back and forth, using the closed gripper as a mallet.",
  novelty: "Turns a pick-and-place arm into an instrument — timing and repeatability matter more than force.",
  difficulty: 1,
  arms: 2,
  hardware: ["Toy keyboard / xylophone / printed keys", "Rubber tip taped to the fixed jaw"],
  sensors: ["Optional: contact microphone to score note accuracy"],
  approach: "Joint-space targets per key recorded by teleop + a MIDI→timing table.",
  howTo: [
    "Teleoperate to each key and record the 6 joint values.",
    "Add a 'hover' offset ≈10° above each key; strike = hover→key→hover in ~150 ms.",
    "Parse a MIDI file and split notes between arms by key position.",
  ],
  code: `for note, t in midi_events:\n    wait_until(t0 + t)\n    arm = left if note < "G4" else right\n    arm.send(HOVER[note]); arm.send(KEY[note]); arm.send(HOVER[note])`,
  keywords: ["piano", "play music", "keyboard", "song", "melody", "xylophone"],
  prompt: "Play Ode to Joy on the keyboard",
  needs: { precision: 0.5, contact: 0.1, horizon: 0.3, speed: 0.7, generalize: 0.1 },
  theme: "stage",
  fixtures: [
    slab(0, -1, 32, 9.6, 0.8, 0x14161d, { support: true }),
    ...KEY_X.map((x, i) => box([x, 1.2, -1], [3.2, 0.8, 8], 0xf4f1ea, { trigger: { r: 1.8, flash: RAINBOW[i], sound: { type: "tone", freq: FREQ[i] }, depress: 0.4 } })),
  ],
  objects: [],
  program: () => {
    const A: Step[] = [];
    const B: Step[] = [];
    A.push(wait("a", 0.4, { say: "Playing “Ode to Joy” — left arm low notes, right arm high notes" }));
    ODE.forEach((n, i) => turn(A, B, n <= 3 ? "a" : "b", strike(n <= 3 ? "a" : "b", KEY_X[n], -1, { y: 2.2, h: 5.5 }), "n" + i));
    A.push(home("a"));
    B.push(home("b"));
    return { a: A, b: B };
  },
};

const HAT: [number, number] = [-17, -3];
const SNARE: [number, number] = [-7, -3];
const KICK: [number, number] = [7, -3];
const TOM: [number, number] = [17, -3];
const drums: Scenario = {
  id: "drums",
  title: "Drum Duo",
  emoji: "🥁",
  category: "Music & Art",
  tagline: "Dual-arm polyrhythm drummer",
  story: "One arm keeps hi-hat and snare while the other lays down kick and tom, locked to a shared beat clock.",
  novelty: "Synchronising two independent arms to a metronome is a perfect latency / jitter benchmark.",
  difficulty: 2,
  arms: 2,
  hardware: ["Pads or small drums", "Foam-tipped sticks glued to the claws"],
  sensors: ["Optional: microphone for beat-onset error measurement"],
  approach: "Scripted pattern sequencer, one thread per arm, locked to time.perf_counter().",
  howTo: ["Record a hover and a hit pose per pad.", "Write patterns as strings ('h.h.s.h.').", "Trigger on a shared monotonic clock — not sleep() drift.", "Add swing by delaying odd steps 20–40 ms."],
  code: `t0 = time.perf_counter()\nfor i,(a,b) in enumerate(zip(PAT_A, PAT_B)):\n    while time.perf_counter() < t0 + i*STEP: pass\n    if a != ".": left.hit(PADS[a])\n    if b != ".": right.hit(PADS[b])`,
  keywords: ["drum", "beat", "rhythm", "percussion", "band"],
  prompt: "Play a drum groove",
  needs: { precision: 0.4, contact: 0.2, horizon: 0.3, speed: 0.9, generalize: 0.1 },
  theme: "stage",
  fixtures: [
    cyl([HAT[0], 1.5, HAT[1]], 3.4, 3, 0x2b2f3a, { trigger: { r: 2, flash: 0xffe066, sound: { type: "hat" }, depress: 0.3 } }),
    cyl([SNARE[0], 1.5, SNARE[1]], 3.4, 3, 0x2b2f3a, { trigger: { r: 2, flash: 0xff6b6b, sound: { type: "snare" }, depress: 0.3 } }),
    cyl([KICK[0], 1.5, KICK[1]], 3.4, 3, 0x2b2f3a, { trigger: { r: 2, flash: 0x4dabf7, sound: { type: "kick" }, depress: 0.3 } }),
    cyl([TOM[0], 1.5, TOM[1]], 3.4, 3, 0x2b2f3a, { trigger: { r: 2, flash: 0x69db7c, sound: tone(120), depress: 0.3 } }),
  ],
  objects: [],
  program: () => {
    const A: Step[] = [wait("a", 0.4, { say: "Left arm: hi-hat + snare · Right arm: kick + tom" })];
    const B: Step[] = [wait("b", 0.4)];
    const pa = "h.h.s.h.h.h.s.hs".split("");
    const pb = "k.....t.k.k...tt".split("");
    for (let bar = 0; bar < 2; bar++)
      pa.forEach((a, i) => {
        const k = `d${bar}_${i}`;
        A.push(sync("a", k));
        B.push(sync("b", k));
        const sa = a === "h" ? strike("a", HAT[0], HAT[1], { y: 3.4, h: 4 }) : a === "s" ? strike("a", SNARE[0], SNARE[1], { y: 3.4, h: 4 }) : [wait("a", 0.44)];
        const b = pb[i];
        const sb = b === "k" ? strike("b", KICK[0], KICK[1], { y: 3.4, h: 4 }) : b === "t" ? strike("b", TOM[0], TOM[1], { y: 3.4, h: 4 }) : [wait("b", 0.44)];
        A.push(...sa);
        B.push(...sb);
      });
    A.push(home("a"));
    B.push(home("b"));
    return { a: A, b: B };
  },
};

const heart = (cx: number, cz: number, s = 0.3) => (u: number): [number, number] => {
  const t = u * TAU;
  return [cx + s * 16 * Math.pow(Math.sin(t), 3), cz - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
};
const star = (cx: number, cz: number, R = 5) => (u: number): [number, number] => {
  const s = Math.min(4, Math.floor(u * 5));
  const t = u * 5 - s;
  const v = (k: number): [number, number] => {
    const a = ((-90 + 144 * k) * Math.PI) / 180;
    return [cx + R * Math.cos(a), cz + R * Math.sin(a)];
  };
  const p0 = v(s);
  const p1 = v(s + 1);
  return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
};

const calligraphy: Scenario = {
  id: "calligraphy",
  title: "Sketch Artists",
  emoji: "✍️",
  category: "Music & Art",
  tagline: "Pen plotting with live ink trails",
  story: "Each arm holds a pen and draws on its own sheet — a heart and a star — then signs it with a wavy underline.",
  novelty: "A 5-DOF arm becomes a pen-plotter with wrist-pitch control; the trail is the real end-effector path.",
  difficulty: 1,
  arms: 2,
  hardware: ["Pen clamped in gripper (foam for compliance)", "Paper taped flat"],
  sensors: ["Optional: overhead camera to compare drawing vs. target SVG"],
  approach: "SVG path → sampled XY points → IK per point at constant pen height.",
  howTo: ["Measure the paper plane (3 corner points) and fit z.", "Sample SVG paths every 2 mm.", "Use IK with pitch=-90°; add a spring pen for height tolerance.", "Lift between strokes."],
  code: `for (x, y) in svg_points(path, step_mm=2):\n    q = ik(x, y, z_paper + 0.5, pitch=-90)\n    robot.send_action(q)  # 30 Hz`,
  keywords: ["draw", "sketch", "pen", "paint", "write", "calligraphy", "plot"],
  prompt: "Draw a heart and a star",
  needs: { precision: 0.8, contact: 0.4, horizon: 0.4, speed: 0.2, generalize: 0.2 },
  theme: "home",
  fixtures: [slab(-10, -2, 14, 14, 0.3, 0xfafafa), slab(10, -2, 14, 14, 0.3, 0xfafafa)],
  objects: [],
  program: () => ({
    a: [...plot("a", heart(-10, -2.5, 0.3), { n: 50, dur: 6, y: 0.6, color: "#ef4444" }), ...plot("a", (u) => [-14 + 8 * u, 5 + 0.5 * Math.sin(u * TAU * 3)], { n: 20, dur: 2, y: 0.6, color: "#ef4444" }), home("a")],
    b: [...plot("b", star(10, -2, 5), { n: 50, dur: 6, y: 0.6, color: "#2563eb" }), ...plot("b", (u) => [6 + 8 * u, 5 + 0.5 * Math.sin(u * TAU * 3)], { n: 20, dur: 2, y: 0.6, color: "#2563eb" }), home("b")],
  }),
};

const zen: Scenario = {
  id: "zen",
  title: "Zen Garden Rakers",
  emoji: "🪨",
  category: "Music & Art",
  tagline: "Spiral and ripple patterns in sand",
  story: "A shallow sand tray with two stones. One arm rakes outward spirals, the other draws concentric ripples.",
  novelty: "Generative art with a physical medium — each run can be seeded differently and photographed for a timelapse.",
  difficulty: 1,
  arms: 2,
  hardware: ["Shallow tray + fine sand", "Small rake/stylus (printed)"],
  sensors: ["Optional: top-down camera for timelapse"],
  approach: "Parametric curves (spirals, circles) as IK trajectories at fixed depth.",
  howTo: ["Mount a stylus in the gripper.", "Generate curves r(θ) around each stone.", "Keep depth constant — pitch -90° and compliant tip.", "Randomise seeds for variation."],
  code: `for th in np.linspace(0, 6*np.pi, 200):\n    r = 1 + 0.45*th\n    robot.move_xy(cx + r*np.cos(th), cz + r*np.sin(th), z=SAND_Z)`,
  keywords: ["zen", "sand", "garden", "rake", "spiral", "relax", "art"],
  prompt: "Rake a zen garden",
  needs: { precision: 0.4, contact: 0.6, horizon: 0.4, speed: 0.1, generalize: 0.2 },
  theme: "home",
  fixtures: [slab(0, -2, 34, 16, 0.4, 0xd9c49b), box([-7, 1.2, -2], [2.6, 2, 2.6], 0x6b7280, { support: false }), box([7, 1.2, -2], [2.6, 2, 2.6], 0x6b7280, { support: false })],
  objects: [],
  program: () => ({
    a: [...plot("a", (u) => { const th = u * 5 * Math.PI; const r = 2.2 + 0.28 * th; return [-7 + r * Math.cos(th), -2 + r * Math.sin(th) * 0.9]; }, { n: 70, dur: 8, y: 0.7, color: "#7c6a43" }), home("a")],
    b: [...[3, 4.5, 6].flatMap((R) => plot("b", (u) => [7 + R * Math.cos(u * TAU), -2 + R * Math.sin(u * TAU) * 0.9], { n: 36, dur: 3.2, y: 0.7, color: "#7c6a43" })), home("b")],
  }),
};

const lightpaint: Scenario = {
  id: "lightpaint",
  title: "Light-Painting Studio",
  emoji: "💫",
  category: "Music & Art",
  tagline: "LED wands draw 3-D light sculptures",
  story: "A tiny LED in each gripper draws a helix and an infinity loop in mid-air; a long-exposure camera records the glowing trail.",
  novelty: "Photography meets robotics: the arm becomes a repeatable 3-D light brush.",
  difficulty: 2,
  arms: 2,
  hardware: ["LED on a 3D-printed wand", "Dark room / tripod camera"],
  sensors: ["DSLR or phone on long exposure (30 s)"],
  approach: "3-D parametric curves with a constant orientation; smooth velocity profile for even brightness.",
  howTo: ["Mount LED at the gripper tip (battery pack on the wrist).", "Generate 3-D curves inside the reachable volume.", "Use constant speed so brightness is uniform.", "Trigger the camera shutter from the UI."],
  code: `for u in np.linspace(0, 1, 300):\n    x, y, z = helix(u)\n    robot.move_xyz(x, y, z, pitch=-90)`,
  keywords: ["light", "led", "paint", "photography", "glow", "long exposure", "helix"],
  prompt: "Paint a light sculpture",
  needs: { precision: 0.5, contact: 0.1, horizon: 0.3, speed: 0.3, generalize: 0.1 },
  theme: "stage",
  fixtures: [],
  objects: [],
  program: () => {
    const hx: Step[] = [mv("a", [-8 + 4, 3, -4], 0.8, { pitch: -90, grip: 0.2 })];
    for (let i = 1; i <= 90; i++) {
      const u = i / 90;
      const th = u * TAU * 3;
      hx.push(mv("a", [-8 + 4 * Math.cos(th), 3 + 9 * u, -4 + 4 * Math.sin(th)], 0.08, { trail: "#22d3ee" }));
    }
    const inf: Step[] = [mv("b", [10, 7, -4], 0.8, { pitch: -90, grip: 0.2 })];
    for (let i = 1; i <= 90; i++) {
      const t = (i / 90) * TAU;
      inf.push(mv("b", [10 + 5 * Math.sin(t), 7 + 2.6 * Math.sin(2 * t), -4], 0.08, { trail: "#f472b6" }));
    }
    return { a: [...hx, home("a")], b: [...inf, home("b")] };
  },
};

export const musicArt: Scenario[] = [piano, drums, calligraphy, zen, lightpaint];
export { ball };
