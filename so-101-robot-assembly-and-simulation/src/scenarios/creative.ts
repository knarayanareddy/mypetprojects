import type { Scenario, Phase, LiveOut } from '../sim/types';
import { P, par, wait, strike, rest, strokes, pickPlace, pour, fbox, fcyl, Stroke, B_BASE, A_BASE } from './dsl';

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ------------------------------------------------------------------ 1. PIANO */
const KEY_X = [-12.6, -9, -5.4, -1.8, 1.8, 5.4, 9, 12.6];
const FREQ = [261.6, 293.7, 329.6, 349.2, 392, 440, 493.9, 523.3];
const RAINBOW = [0xff5a5f, 0xff9f43, 0xfeca57, 0x1dd1a1, 0x48dbfb, 0x54a0ff, 0x8e6bff, 0xff6bd6];
const ODE = [2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 2, 1, 1, 2, 2, 3, 4, 4, 3, 2, 1, 0, 0, 1, 2, 1, 0, 0];

function pianoPhases(): Phase[] {
  const out: Phase[] = [P('a', 0.9, { p: [KEY_X[2], 6.5, -1], pitch: -90, grip: 0 }, '🎹 Playing “Ode to Joy” – the left arm takes the low notes, the right arm the high ones')];
  ODE.forEach((n, i) => {
    out.push(...strike(n <= 3 ? 'a' : 'b', KEY_X[n], -1, 1.9, 6.2));
    if (i % 4 === 3) out.push(wait(0.18));
  });
  out.push(P('a', 0.8, { p: [-5, 14, -3], pitch: -35, grip: 0.5 }));
  return out;
}

const piano: Scenario = {
  id: 'piano',
  title: 'Robo-Pianist Duo',
  emoji: '🎹',
  category: 'Music & Art',
  tagline: 'Two arms play a keyboard together',
  story: 'The arms hover over a one-octave keyboard and strike keys with a closed gripper used as a mallet. Each arm covers the notes it can physically reach, and they hand the melody back and forth.',
  novelty: 'Turns a pick-and-place arm into a musical instrument – timing and repeatability matter more than force.',
  difficulty: 1,
  arms: 2,
  hardware: ['Printed keyboard or a cheap toy xylophone', 'Rubber-tipped mallet taped to the fixed jaw', 'Optional: contact microphone to score accuracy'],
  approach: 'Scripted joint-space targets per key + a timing table (MIDI file → joint targets).',
  howTo: [
    'Teleoperate once to each key and record the 6 joint values with robot.get_observation().',
    'Store them in a dict {note: joints}. Add a “hover” offset by raising shoulder_lift ~10° above each key.',
    'Parse a MIDI file; for every note_on event schedule hover → strike → lift with a 90 ms strike.',
    'Split notes between arms by key position so neither has to over-reach.',
  ],
  code: `NOTES = {"C4": dict(shoulder_pan=-18, shoulder_lift=35, elbow_flex=62, wrist_flex=70),
         "D4": dict(shoulder_pan=-11, shoulder_lift=34, elbow_flex=63, wrist_flex=70)}  # recorded by teleop

def strike(note, hover=10):
    j = NOTES[note]
    move(**{**j, "shoulder_lift": j["shoulder_lift"] - hover})   # hover above the key
    time.sleep(0.15)
    move(**j)                                                    # strike
    time.sleep(0.09)
    move(**{**j, "shoulder_lift": j["shoulder_lift"] - hover})   # release`,
  theme: 'stage',
  fixtures: [
    fbox(0, 2.5, -7.1, 34, 5, 2.4, 0x14161d, { label: 'Robo-Piano' }),
    ...KEY_X.map((x, i) =>
      fbox(x, 0.8, -1, 3.2, 1.6, 8, 0xf4f1ea, {
        support: false,
        trigger: { r: 1.2, flash: RAINBOW[i], sound: { type: 'tone', freq: FREQ[i] }, depress: 0.35 },
      }),
    ),
  ],
  program: { kind: 'phases', phases: pianoPhases(), loop: true },
};

/* ------------------------------------------------------------------ 2. DRUMS */
const HAT: [number, number] = [-17, -3];
const SNARE: [number, number] = [-7, -2];
const KICK: [number, number] = [7, -2];
const TOM: [number, number] = [17, -3];

function drumPhases(): Phase[] {
  const A = ['h', '.', 'h', '.', 's', '.', 'h', '.', 'h', '.', 'h', '.', 's', '.', 'h', 's'];
  const B = ['k', '.', '.', '.', '.', '.', 't', '.', 'k', '.', 'k', '.', '.', '.', 't', 't'];
  const out: Phase[] = [wait(0.5, '🥁 Drum duo – left arm: hi-hat + snare, right arm: kick + tom')];
  for (let bar = 0; bar < 2; bar++) {
    A.forEach((a, i) => {
      const pa = a === 'h' ? strike('a', HAT[0], HAT[1], 2.0, 5.6) : a === 's' ? strike('a', SNARE[0], SNARE[1], 2.0, 5.6) : rest();
      const b = B[i];
      const pb = b === 'k' ? strike('b', KICK[0], KICK[1], 2.0, 5.6) : b === 't' ? strike('b', TOM[0], TOM[1], 2.0, 5.6) : rest();
      out.push(...par(pa, pb), wait(0.1));
    });
  }
  out.push(...par([P('a', 0.8, { p: [-5, 14, -3], pitch: -35, grip: 0.5 }, '🎤 Mic drop')], [P('b', 0.8, { p: [5, 14, -3], pitch: -35, grip: 0.5 })]));
  return out;
}

const drums: Scenario = {
  id: 'drums',
  title: 'Drum Duo',
  emoji: '🥁',
  category: 'Music & Art',
  tagline: 'Dual-arm polyrhythm drummer',
  story: 'One arm keeps the hi-hat and snare while the other lays down kick and tom. The two arms run a shared beat clock so the groove stays tight.',
  novelty: 'Synchronising two independent arms to a metronome is a perfect hackathon benchmark for latency and timing jitter.',
  difficulty: 2,
  arms: 2,
  hardware: ['Pads / small drums', 'Foam-tipped sticks glued to the claws', 'Laptop speaker or MIDI synth'],
  approach: 'Scripted pattern sequencer, one thread per arm, locked to a shared monotonic clock.',
  howTo: [
    'Record a hover pose and a hit pose for each pad.',
    'Write the pattern as a string per arm (“h.h.s.h.”) – one character per 1/8 note.',
    'Use time.perf_counter() (not sleep drift!) to trigger each step on the beat.',
    'Add swing by delaying every odd step by 20–40 ms.',
  ],
  code: `BPM, STEP = 112, 60 / 112 / 2
t0 = time.perf_counter()
for i, (a, b) in enumerate(zip(PATTERN_A, PATTERN_B)):
    target = t0 + i * STEP
    while time.perf_counter() < target: pass
    if a != ".": left.hit(PADS[a])    # each arm = its own SO101Follower instance
    if b != ".": right.hit(PADS[b])`,
  theme: 'stage',
  fixtures: [
    fcyl(HAT[0], 0.8, HAT[1], 3.4, 1.6, 0x2b2f3a, { label: 'Hi-hat', trigger: { r: 1.3, flash: 0xffe066, sound: { type: 'hat' }, depress: 0.3 } }),
    fcyl(SNARE[0], 0.8, SNARE[1], 3.4, 1.6, 0x2b2f3a, { label: 'Snare', trigger: { r: 1.3, flash: 0xff6b6b, sound: { type: 'snare' }, depress: 0.3 } }),
    fcyl(KICK[0], 0.8, KICK[1], 3.4, 1.6, 0x2b2f3a, { label: 'Kick', trigger: { r: 1.3, flash: 0x4dabf7, sound: { type: 'kick' }, depress: 0.3 } }),
    fcyl(TOM[0], 0.8, TOM[1], 3.4, 1.6, 0x2b2f3a, { label: 'Tom', trigger: { r: 1.3, flash: 0x69db7c, sound: { type: 'tone', freq: 120 }, depress: 0.3 } }),
  ],
  program: { kind: 'phases', phases: drumPhases(), loop: true },
};

/* ------------------------------------------------------------------ 3. SKETCH */
const heart = (cx: number, cz: number): Stroke => ({
  D: 7,
  f: (u) => {
    const t = u * TAU;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const z = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [cx + 0.36 * x, cz - 0.36 * z];
  },
});
const star = (cx: number, cz: number, R = 6.4): Stroke => ({
  D: 7,
  f: (u) => {
    const v = (k: number): [number, number] => {
      const a = ((-90 + 144 * k) * Math.PI) / 180;
      return [cx + R * Math.cos(a), cz + R * Math.sin(a)];
    };
    const s = Math.min(4, Math.floor(u * 5));
    const t = u * 5 - s;
    const p0 = v(s);
    const p1 = v(s + 1);
    return [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t)];
  },
});
const wave = (cx: number, cz: number): Stroke => ({
  D: 3.5,
  f: (u) => [cx - 5 + 10 * u, cz + 0.6 * Math.sin(u * TAU * 3)],
});

const sketch: Scenario = {
  id: 'sketch',
  title: 'Sketch Artists',
  emoji: '✍️',
  category: 'Music & Art',
  tagline: 'Pen plotting with live ink trails',
  story: 'Each arm holds a pen and draws on its own sheet – a heart and a star – then signs it with a wavy underline. The trail you see is the real end-effector path.',
  novelty: 'A 5-DOF arm becomes a pen-plotter with wrist-pitch control – and you can draw by hand in “Try it yourself”.',
  difficulty: 1,
  arms: 2,
  hardware: ['Pen clamped in the gripper (add a spring/foam for compliance)', 'Paper taped flat', 'Optional: whiteboard + marker'],
  approach: 'Scripted Cartesian path → inverse kinematics (e.g. ikpy / placo) → joint targets at 30–50 Hz.',
  howTo: [
    'Measure the table-plane height where the pen just touches paper (pen-down z).',
    'Convert an SVG path into points; sample at ≤ 2 mm spacing.',
    'Solve IK for each point with the wrist pitch fixed (≈ −90°) and stream joints with send_action.',
    'Lift 1 cm between strokes to travel without marking.',
  ],
  code: `import ikpy.chain, numpy as np
chain = ikpy.chain.Chain.from_urdf_file("so101.urdf")      # URDF is in the SO-ARM100 repo
for x, y in svg_points:
    q = chain.inverse_kinematics([x, y, PEN_DOWN_Z])
    move(**dict(zip(JOINTS, np.degrees(q[1:7]))))
    time.sleep(0.02)`,
  theme: 'paper',
  fixtures: [fbox(-6, 0.1, -1, 18, 0.2, 16, 0xfdfaf0, { support: false }), fbox(6, 0.1, -1, 18, 0.2, 16, 0xfdfaf0, { support: false })],
  trail: { arm: 2, color: 0x14161d, color2: 0x2f5bff, penY: 0.6, y: 0.27, r: 0.17 },
  program: {
    kind: 'phases',
    loop: true,
    phases: [
      ...par(
        strokes('a', [heart(-6, -1), wave(-6, 5.5)], { y: 0.38, hover: 4, say: '✍️ Two artists, two sheets – drawing a heart and a star' }),
        strokes('b', [star(6, -1), wave(6, 5.5)], { y: 0.38, hover: 4 }),
      ),
      wait(1.2),
    ],
  },
};

/* ------------------------------------------------------------------ 4. ZEN */
const ring = (cx: number, cz: number, r: number): Stroke => ({ D: 3.3, f: (u) => [cx + r * Math.cos(u * TAU), cz + r * Math.sin(u * TAU)] });
const rakeLine = (cx: number, cz: number, zo: number): Stroke => ({
  D: 3.3,
  f: (u) => [cx - 6.5 + 13 * u, cz + zo + 0.9 * Math.sin(u * TAU * 3)],
});

const zen: Scenario = {
  id: 'zen',
  title: 'Zen Garden Raker',
  emoji: '🪨',
  category: 'Music & Art',
  tagline: 'Meditative sand patterns, forever',
  story: 'The left arm rakes concentric ripples around a stone while the right arm combs flowing wave lines in its own tray. Grooves stay in the sand so patterns accumulate.',
  novelty: 'A desk-decor / gallery piece – and a great test of smooth, jerk-free joint trajectories.',
  difficulty: 1,
  arms: 2,
  hardware: ['Shallow tray with fine sand / salt', 'A toothpick or small 3D-printed rake in the gripper'],
  approach: 'Parametric curves (circles, sinusoids, spirals) → IK → streamed joint targets.',
  howTo: [
    'Fix the tray; calibrate the sand height by lowering until the rake just touches.',
    'Generate polar curves r(θ) and parametric waves; sample at ≤ 3 mm.',
    'Add slow speed (3–5 cm/s) and a tiny low-pass filter so motion is calm.',
    'Randomise parameters each run so no two gardens are alike.',
  ],
  code: `for th in np.linspace(0, 2*np.pi, 200):
    r = 0.04 + 0.002*k                      # k = ring index
    x, y = cx + r*np.cos(th), cy + r*np.sin(th)
    move(**solve_ik(x, y, SAND_Z))          # slow & smooth beats fast
    time.sleep(0.03)`,
  theme: 'zen',
  fixtures: [
    fbox(-10, 0.4, -1, 18.6, 0.8, 16.6, 0x5a3d26, { support: false }),
    fbox(-10, 0.85, -1, 17.2, 0.3, 15.2, 0xdccfa8, { support: false }),
    fbox(10, 0.4, -1, 18.6, 0.8, 16.6, 0x5a3d26, { support: false }),
    fbox(10, 0.85, -1, 17.2, 0.3, 15.2, 0xdccfa8, { support: false }),
    { shape: 'sphere', size: [1.6], pos: [-10, 1.7, -1], color: 0x59606b, scale: [1.3, 0.8, 1], rough: 0.9 },
    { shape: 'sphere', size: [1.2], pos: [-9.2, 1.4, -0.4], color: 0x6b727d, scale: [1.2, 0.7, 1], rough: 0.9 },
  ],
  trail: { arm: 2, color: 0x9a8858, penY: 1.55, y: 1.03, r: 0.36 },
  program: {
    kind: 'phases',
    loop: true,
    phases: [
      ...par(
        strokes('a', [ring(-10, -1, 3.3), ring(-10, -1, 4.9), ring(-10, -1, 6.5)], { y: 1.2, hover: 4.5, say: '🪨 Raking ripples around the stone – patterns persist in the sand' }),
        strokes('b', [rakeLine(10, -1, -5), rakeLine(10, -1, 0), rakeLine(10, -1, 5)], { y: 1.2, hover: 4.5 }),
      ),
      wait(1.5),
    ],
  },
};

/* ------------------------------------------------------------------ 5. LATTE */
const CUP: [number, number] = [-3, 1];
const leaf: Stroke = {
  D: 5.5,
  f: (u) => [CUP[0] + 2.9 * Math.sin(u * TAU * 5) * (1 - 0.55 * u), CUP[1] + 4.2 - 8.4 * u],
};
const stem: Stroke = { D: 1.6, f: (u) => [CUP[0], CUP[1] - 4.5 + 9.2 * u] };

function lattePhases(): Phase[] {
  // B pours milk from a jug, A etches the foam
  const jug: [number, number] = [19, 2];
  const bdir = [CUP[0] - B_BASE[0], CUP[1] - B_BASE[2]];
  const bl = Math.hypot(bdir[0], bdir[1]);
  const tipX = CUP[0] - (bdir[0] / bl) * 2.2;
  const tipZ = CUP[1] - (bdir[1] / bl) * 2.2;
  return [
    P('b', 0.8, { p: [jug[0], 9, jug[1]], pitch: -90, grip: 1 }, '☕ Right arm fetches the milk jug…'),
    P('b', 0.45, { p: [jug[0], 3.0, jug[1]] }),
    P('b', 0.3, { grip: 0 }),
    P('b', 0.5, { p: [jug[0], 10, jug[1]] }),
    P('b', 0.9, { p: [tipX, 9.5, tipZ] }),
    P('b', 0.6, { pitch: -35 }, '…and pours a steady stream into the espresso'),
    P('b', 2.2, { p: [tipX + (bdir[0] / bl) * 0.6, 9.5, tipZ + (bdir[1] / bl) * 0.6] }, undefined, { pour: pour('b', 0xfff7e6, 4.1, 70) }),
    P('b', 0.6, { pitch: -90 }),
    P('b', 0.9, { p: [jug[0], 10, jug[1]] }),
    P('b', 0.45, { p: [jug[0], 2.2, jug[1]] }),
    P('b', 0.3, { grip: 1 }),
    P('b', 0.5, { p: [jug[0], 9, jug[1]] }),
    P('b', 0.8, { p: [8, 14, -3], pitch: -35, grip: 0.5 }),
    ...strokes('a', [leaf, stem], { y: 4.25, hover: 7.5, say: '🌿 Left arm etches a rosetta leaf into the foam' }),
    P('a', 0.8, { p: [-5, 14, -3], pitch: -35, grip: 0.5 }),
    wait(1.5),
  ];
}

const latte: Scenario = {
  id: 'latte',
  title: 'Barista Latte Art',
  emoji: '☕',
  category: 'Music & Art',
  tagline: 'Pour the milk, etch the leaf',
  story: 'One arm picks up a milk jug and pours; the other follows with an etching pin to draw a rosetta in the foam.',
  novelty: 'Pouring plus fine-motion drawing is a lovely demo of why wrist pitch and roll matter.',
  difficulty: 3,
  arms: 2,
  hardware: ['Small milk jug with a gripper-friendly handle or collar', 'Wooden etching pin', 'Wide cup, dark liquid (cold brew works fine)'],
  approach: 'Scripted pour trajectory (tilt via wrist_flex) + parametric etching path.',
  howTo: [
    'Print a collar that lets the gripper hold the jug without squeezing the liquid out.',
    'Pour by increasing wrist_flex slowly (20°/s); stop when the stream is steady.',
    'Etch with sinusoidal strokes: amplitude tapers toward the top of the cup.',
    'Practise with water + food dye before the real thing.',
  ],
  code: `# pour: tilt the jug about the wrist-flex axis while keeping the spout over the cup
for tilt in np.linspace(0, 55, 40):
    move(**base_pose, wrist_flex=base_pose["wrist_flex"] + tilt)
    time.sleep(0.05)`,
  theme: 'kitchen',
  props: [{ id: 'jug', shape: 'cyl', size: [1.6, 4.2], pos: [19, 2.1, 2], color: 0xcfd8dc, rough: 0.25, metal: 0.7 }],
  fixtures: [
    fcyl(CUP[0], 2, CUP[1], 6.3, 4, 0xffffff, { support: false, rough: 0.3 }),
    fcyl(CUP[0], 3.85, CUP[1], 5.8, 0.3, 0x5a3220, { support: false, rough: 0.3 }),
  ],
  trail: { arm: 0, color: 0xf6e7cf, penY: 4.55, y: 4.03, r: 0.2 },
  program: { kind: 'phases', phases: lattePhases(), loop: true },
};

/* ------------------------------------------------------------------ 6. SHELL GAME */
const SX = [-6, 0, 6];
const SZ = -1;
const TEMP: [number, number] = [0, 5.5];

function shellPhases(): Phase[] {
  const slotCup = [0, 1, 2];
  const out: Phase[] = [];
  const at = (slot: number): [number, number] => [SX[slot], SZ];
  const mv = (from: [number, number], to: [number, number], say?: string) => pickPlace('a', from, to, { fh: 2.5, th: 1.9, safe: 8, speed: 0.55, say });
  // reveal the ball first
  const reveal = mv(at(1), at(1), '🎩 Watch the ball…');
  reveal.splice(4, 0, wait(1.1));
  out.push(...reveal);
  const swaps: [number, number][] = [[0, 1], [1, 2], [0, 2], [0, 1], [1, 2]];
  swaps.forEach(([s1, s2], k) => {
    out.push(...mv(at(s1), TEMP, k === 0 ? '🔀 Shuffling the cups…' : undefined));
    out.push(...mv(at(s2), at(s1)));
    out.push(...mv(TEMP, at(s2)));
    const t = slotCup[s1];
    slotCup[s1] = slotCup[s2];
    slotCup[s2] = t;
  });
  // right arm reveals what is under the middle slot
  const b = 'b' as const;
  out.push(
    P(b, 0.9, { p: [SX[1], 10, SZ], pitch: -90, grip: 1 }, '👀 Where is it? The right arm lifts the middle cup'),
    P(b, 0.5, { p: [SX[1], 2.5, SZ] }),
    P(b, 0.3, { grip: 0 }),
    P(b, 0.6, { p: [SX[1], 11, SZ] }),
    wait(2.2),
    P(b, 0.6, { p: [SX[1], 2.0, SZ] }),
    P(b, 0.3, { grip: 1 }),
    P(b, 0.6, { p: [SX[1], 10, SZ] }),
    P(b, 0.8, { p: [5, 14, -3], pitch: -35, grip: 0.5 }),
    wait(0.8),
  );
  return out;
}

const shell: Scenario = {
  id: 'shell',
  title: 'Shell-Game Magician',
  emoji: '🎩',
  category: 'Games & Play',
  tagline: 'Follow the cups – can you track the ball?',
  story: 'The arm lifts to show the ball, then swaps three cups through a temporary slot while a ball stays put. The second arm finally reveals what is under the middle cup.',
  novelty: 'A fun way to demo multi-step manipulation, and a nice dataset task for “object permanence” policies.',
  difficulty: 2,
  arms: 2,
  hardware: ['3 identical opaque cups', 'A small ball or coin', 'Overhead camera if you want the robot to also “guess”'],
  approach: 'Scripted pick-and-place swaps; optionally add a vision model that tracks the ball cup.',
  howTo: [
    'Define 3 slots plus a temp slot as fixed (x, y) table coordinates.',
    'Generate a random swap list; a swap is 3 pick-place moves via the temp slot.',
    'Keep a slot→cup map so you always know which cup hides the ball.',
    'Bonus: use the wrist camera + a detector to let the robot find the ball after the shuffle.',
  ],
  code: `slots = [0, 1, 2]
for a, b in random_swaps(n=5):
    pick_place(slots[a], TEMP); pick_place(slots[b], slots[a]); pick_place(TEMP, slots[b])
    slots[a], slots[b] = slots[b], slots[a]`,
  theme: 'stage',
  props: [
    ...SX.map((x, i) => ({ id: `cup${i}`, shape: 'cyl' as const, size: [1.7, 3.6], pos: [x, 1.8, SZ] as [number, number, number], color: [0xe74c3c, 0x3498db, 0x2ecc71][i], rough: 0.3 })),
    { id: 'ball', shape: 'sphere' as const, size: [0.9], pos: [0, 0.9, SZ] as [number, number, number], color: 0xffd54a, grab: false, support: false, emissive: 0x553300 },
  ],
  fixtures: [fbox(0, 0.05, 8.5, 18, 0.1, 2.2, 0x2d3748, { label: 'Follow the cups!', support: false })],
  program: { kind: 'phases', phases: shellPhases(), loop: true },
};

/* ------------------------------------------------------------------ 7. BUDDY */
const F = -90;
const smooth = (x: number) => x * x * (3 - 2 * x);
type J = number[];

function mood(k: number, t: number, who: 0 | 1): J {
  const toward = who === 0 ? 0 : 180;
  const s = Math.sin;
  switch (k) {
    case 0:
      return [F + 30 * s(1.1 * t), 90 + 6 * s(2 * t), -95, 30 + 10 * s(1.7 * t), 25 * s(0.9 * t), 0.5 + 0.3 * s(2 * t)];
    case 1:
      return [toward, 100, -90, 50, 40 * s(7 * t), 0.5 + 0.5 * s(6 * t)];
    case 2:
      return [toward, 95 + 8 * s(9 * t + 1), -95, 35 + 25 * s(9 * t), 0, 0.5 + 0.5 * s(10 * t)];
    case 3:
      return who === 0 ? [toward + 28 * s(7 * t), 95, -95, 20, 0, 0.2] : [toward, 85, -90, 50, 35 * s(1.5 * t), 0.7];
    case 4:
      return [toward, 95, -95, 30 + 28 * s(3.5 * t), 0, 0.6];
    default:
      return [F + (who === 0 ? -10 : 10), 55 + 2 * s(1.2 * t), -140, 80, 0, 0];
  }
}

const SAYS = [
  '😮 Waking up and looking around…',
  '👋 Oh – a friend! Turning to say hello',
  '🤩 So excited! (nodding + clapping claws)',
  '🙅 “No!” …“Hmm?”  – one shakes, one tilts curiously',
  '🙆 “OK, you win” – a slow, agreeing nod',
  '😴 Getting sleepy…',
];

const buddy: Scenario = {
  id: 'buddy',
  title: 'Emotional Desk Buddies',
  emoji: '🤖',
  category: 'Games & Play',
  tagline: 'Expressive body language, no screen needed',
  story: 'Two arms become little creatures: they wake, notice each other, wave, nod, disagree and fall asleep – all through posture and rhythm alone.',
  novelty: 'Robot “animation”: designing emotion with joint trajectories, like a Pixar rig. Great for HRI projects.',
  difficulty: 1,
  arms: 2,
  hardware: ['Googly eyes on the gripper', 'Optional: mic + sentiment model to pick the mood', 'Optional: wrist camera for face tracking'],
  approach: 'Keyframed joint-space animation with smooth blending between moods.',
  howTo: [
    'Define each mood as a function of time returning 6 joint targets (nod = sine on wrist_flex).',
    'Blend between moods with a smoothstep over ~1 s so transitions feel organic.',
    'Map outputs of a sentiment/face model to a mood index in real time.',
    'Keep speeds low – slower motions read as calmer, bigger = more excited.',
  ],
  code: `def nod(t):   return dict(wrist_flex=35 + 25*np.sin(9*t))
def shake(t): return dict(shoulder_pan=28*np.sin(7*t))
while True:
    t = time.perf_counter() - t0
    move(**blend(mood[prev](t), mood[cur](t), smoothstep((t - t_switch)/1.0)))`,
  theme: 'warm',
  usesPointer: false,
  program: {
    kind: 'live',
    fn: (ctx): LiveOut => {
      const T = 4;
      const cycle = T * 6;
      const t = ctx.t % cycle;
      const k = Math.min(5, Math.floor(t / T));
      const prev = (k + 5) % 6;
      const s = smooth(clamp((t - k * T) / 1.0, 0, 1));
      const mix = (who: 0 | 1): J => {
        const a = mood(prev, t, who);
        const b = mood(k, t, who);
        return a.map((v, i) => lerp(v, b[i], s));
      };
      return { ja: mix(0), jb: mix(1), say: SAYS[k] };
    },
  },
};

/* ------------------------------------------------------------------ 8. CAT */
let lastYaw = 0;
const cat: Scenario = {
  id: 'cat',
  title: 'Laser Cat Entertainer',
  emoji: '🐱',
  category: 'Games & Play',
  tagline: 'Keeps your pet busy while you debug',
  story: 'The arm swings a laser pointer along unpredictable Lissajous paths. The cat chases the dot with a lazy lag – and an adaptive wrist pitch keeps the dot on the floor.',
  novelty: 'Pet-tech with a robot arm: random-but-smooth motion generation plus a safety rule (laser never leaves the table).',
  difficulty: 1,
  arms: 1,
  hardware: ['Class-2 laser pointer on the gripper (never aim at eyes!)', 'Optional: camera to detect when the pet is present'],
  approach: 'Procedural motion: pick a dot target on the floor, solve for tip position + pitch that puts the beam there.',
  howTo: [
    'Pick a target (x, y) on the floor using sum-of-sines for smooth randomness.',
    'Place the pointer at height h behind the dot; compute pitch = atan2(h, horizontal distance).',
    'Clamp the target to a safe rectangle so the beam never points up.',
    'Optional: pause randomly to let the cat “catch” the dot.',
  ],
  code: `h = 0.13
tip_r = np.clip(R_dot - 0.09, 0.07, 0.20)
pitch = -np.degrees(np.arctan2(h, R_dot - tip_r))   # beam lands on the dot
move(**solve_ik(tip_x, tip_y, h, pitch=pitch))`,
  theme: 'warm',
  laser: 0,
  props: [
    {
      id: 'cat',
      shape: 'sphere',
      size: [2.3],
      scale: [1.5, 0.95, 1],
      pos: [6, 2.3, 4],
      color: 0xe8913a,
      grab: false,
      rough: 0.9,
      children: [
        { shape: 'sphere', size: [1.55], pos: [2.0, 0.9, 0], color: 0xe8913a, rough: 0.9, scale: [0.667, 1.05, 1] },
        { shape: 'cone', size: [0.6, 1.3], pos: [1.9, 2.5, 0.9], color: 0xd9822b, scale: [0.667, 1, 1] },
        { shape: 'cone', size: [0.6, 1.3], pos: [1.9, 2.5, -0.9], color: 0xd9822b, scale: [0.667, 1, 1] },
        { shape: 'sphere', size: [0.24], pos: [2.9, 1.2, 0.6], color: 0x7cff6b, emissive: 0x2a8f1f, scale: [0.667, 1, 1] },
        { shape: 'sphere', size: [0.24], pos: [2.9, 1.2, -0.6], color: 0x7cff6b, emissive: 0x2a8f1f, scale: [0.667, 1, 1] },
        { shape: 'cyl', size: [0.35, 3.6], pos: [-2.9, 1.0, 0], color: 0xd9822b, rot: [0, 0, 55] },
      ],
      motion: (t, ctx, cur) => {
        const tgt = ctx.laser ?? cur;
        const k = 1 - Math.exp(-ctx.dt * 2.4);
        const nx = cur[0] + (tgt[0] - cur[0]) * k;
        const nz = cur[2] + (tgt[2] - cur[2]) * k;
        const dx = tgt[0] - nx;
        const dz = tgt[2] - nz;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.8) lastYaw = Math.atan2(-dz, dx);
        const bob = dist > 1 ? 0.25 * Math.sin(t * 14) : 0;
        return { p: [nx, 2.3 + bob, nz], yaw: lastYaw };
      },
    },
  ],
  fixtures: [fcyl(-20, 0.35, 8, 2.5, 0.7, 0x8e5bd6, { support: false, label: 'cat bed' })],
  program: {
    kind: 'live',
    fn: (ctx): LiveOut => {
      const t = ctx.t;
      const dx = clamp(-4 + 14 * Math.sin(0.55 * t) + 4 * Math.sin(1.7 * t + 1), -22, 14);
      const dz = clamp(4 + 6 * Math.sin(0.4 * t + 1.2) + 2.5 * Math.sin(1.3 * t), -3, 12);
      const b = A_BASE;
      const vx = dx - b[0];
      const vz = dz - b[2];
      const R = Math.hypot(vx, vz);
      const ux = vx / R;
      const uz = vz / R;
      const h = 13;
      const rtip = clamp(R - 9, 7, 20);
      const pitch = (-Math.atan2(h, R - rtip) * 180) / Math.PI;
      return { a: { p: [b[0] + ux * rtip, h, b[2] + uz * rtip], pitch, grip: 0 }, say: '🐱 The cat is chasing the red dot…' };
    },
  },
};

export const creativeScenarios: Scenario[] = [piano, drums, sketch, zen, latte, shell, buddy, cat];
