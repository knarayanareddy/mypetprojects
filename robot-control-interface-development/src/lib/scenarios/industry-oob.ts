import { ball, box, can, cube, cyl, home, mv, pick, place, say, slab, strike, sync, turn, wait } from "./dsl";
import type { Anim, Scenario, SimObject, Step } from "./types";

/* ================================================================ INDUSTRY & LAB */
const handover: Scenario = {
  id: "handover",
  title: "Dual-Arm Handover Line",
  emoji: "🤝",
  category: "Industry & Lab",
  tagline: "Arm A feeds parts, arm B receives & assembles",
  story: "The left arm picks parts from a feeder and presents them mid-air; the right arm takes each part and seats it on the assembly plate.",
  novelty: "Mid-air handover is the signature bimanual skill — and a clean test of two-arm calibration.",
  difficulty: 3,
  arms: 2,
  hardware: ["Parts (cubes)", "Assembly plate"],
  sensors: ["Gripper load read-back (built in)", "Camera for handover pose", "AprilTags to calibrate arm-to-arm transform"],
  approach: "Calibrate T(A→B) with AprilTags; agree a handover pose; receiver closes when giver's load drops.",
  howTo: ["Clamp both arms on the same table, measure base distance.", "Estimate the A→B transform with AprilTags seen by the top camera.", "Handover pose P in the shared reach zone.", "Receiver closes, then giver opens after a 150 ms overlap."],
  code: `A.go(P); B.go(P_recv)\nB.close(); wait(0.15); A.open()  # overlap\nB.place(PLATE[i])`,
  keywords: ["handover", "hand over", "assemble", "assembly", "factory", "pass", "feeder", "bimanual"],
  prompt: "Pass the part from the left arm to the right arm and assemble it",
  needs: { precision: 0.7, contact: 0.4, horizon: 0.5, speed: 0.5, generalize: 0.4 },
  theme: "factory",
  fixtures: [slab(-14, 0, 6, 12, 0.3, 0x475569), slab(10, 2, 12, 6, 0.8, 0x334155)],
  objects: [cube("p1", -14, -2, 0xfbbf24), cube("p2", -14, 2, 0x34d399)],
  program: () => {
    const A: Step[] = [];
    const B: Step[] = [];
    const H: [number, number, number] = [-1, 8.5, -3];
    ["p1", "p2"].forEach((id, i) => {
      A.push(...pick("a", id, -14, -2 + 4 * i, { y: 1.8, grip: 0.3 }), mv("a", H, 1.0, { pitch: -90 }), sync("a", `ha${i}`), sync("a", `hb${i}`), wait("a", 0.2, { grip: 1 }), mv("a", [-8, 10, -3], 0.6));
      B.push(sync("b", `ha${i}`), mv("b", H, 0.9, { pitch: 0, grip: 1 }), { arm: "b", dur: 0.05, grab: id, grip: 0.3 }, sync("b", `hb${i}`), ...place("b", 8 + 4 * i, 2, { y: 2.3 }), mv("b", [8, 10, -4], 0.5, { pitch: -90 }));
    });
    A.push(home("a"));
    B.push(home("b"));
    return { a: A, b: B };
  },
};

const HX = -2;
const peg: Scenario = {
  id: "peg",
  title: "Peg-in-Hole Insertion",
  emoji: "🔩",
  category: "Industry & Lab",
  tagline: "Spiral search + compliant insertion",
  story: "The left arm picks a peg, hovers over a hole, runs a spiral search (cyan trail), then seats it. The right arm confirms with a button press.",
  novelty: "The classic contact-rich benchmark — perfect for comparing diffusion/ACT policies vs. scripted search.",
  difficulty: 3,
  arms: 2,
  hardware: ["Peg (printed) + board with a 2 mm clearance hole"],
  sensors: ["Servo current read-back (built in) as a cheap force proxy", "Wrist camera"],
  approach: "Spiral search while monitoring Present_Load; descend on drop in load; stop at stall.",
  howTo: ["Hover 5 mm above the hole.", "Spiral outward at 1 mm pitch, pressing lightly.", "A sudden z-drop (or load change) means the peg found the hole.", "Push through, release."],
  code: `for r, th in spiral(max_r=4):\n    arm.move_xy(hole + r*[cos th, sin th])\n    if arm.load("wrist_flex") > THRESH: break`,
  keywords: ["peg", "insert", "hole", "screw", "precision", "assembly", "contact"],
  prompt: "Insert the peg into the hole",
  needs: { precision: 0.95, contact: 0.9, horizon: 0.3, speed: 0.2, generalize: 0.2 },
  theme: "factory",
  fixtures: [slab(HX, 3, 11, 3, 3, 0x64748b), slab(HX, -3, 11, 3, 3, 0x64748b), slab(HX - 3.5, 0, 4, 3, 3, 0x64748b), slab(HX + 3.5, 0, 4, 3, 3, 0x64748b), box([12, 0.6, -4], [3, 1.2, 3], 0x16a34a, { trigger: { r: 2.2, flash: 0x22c55e, sound: { type: "ding" }, depress: 0.4 } })],
  objects: [{ id: "peg", shape: "cyl", pos: [-10, 3, -2], size: [1.6, 6, 1.6], color: 0xfacc15 }],
  program: () => {
    const spiral: Step[] = [];
    for (let i = 0; i <= 18; i++) {
      const r = 1.6 * (1 - i / 18);
      const th = i * 0.9;
      spiral.push(mv("a", [HX + r * Math.cos(th), 8.5, r * Math.sin(th)], 0.12, { trail: "#22d3ee" }));
    }
    return {
      a: [...pick("a", "peg", -10, -2, { y: 3.6, grip: 0.3, h: 5 }), mv("a", [HX + 1.6, 8.5, 0], 1.0, { pitch: -90 }), say("a", "Spiral search…"), ...spiral, mv("a", [HX, 5, 0], 0.9, { pitch: -90, say: "Hole found → compliant insertion" }), { arm: "a", dur: 0.25, drop: true, grip: 1 }, mv("a", [HX, 10, 0], 0.5), home("a")],
      b: [mv("b", [2, 12, 4], 1.0, { pitch: -60 }), wait("b", 6.5), ...strike("b", 12, -4, { y: 1.8, h: 5 }), say("b", "Insertion verified ✔"), home("b")],
    };
  },
};

const inspect: Scenario = {
  id: "inspect",
  title: "Quality Inspector",
  emoji: "🔍",
  category: "Industry & Lab",
  tagline: "Rotates parts under a camera, sorts pass / reject",
  story: "The left arm picks each part, rotates it with the wrist roll for a 360° scan and puts it on a tray. The right arm sorts it to the PASS or REJECT bin.",
  novelty: "Active vision: the arm presents the object to the camera — no turntable needed.",
  difficulty: 2,
  arms: 2,
  hardware: ["Parts with/without a defect mark", "Pass / reject bins"],
  sensors: ["Fixed inspection camera + lamp", "Optional: depth camera"],
  approach: "Wrist-roll scan → defect classifier (CNN) → route to bin.",
  howTo: ["Hold the part in front of a fixed camera.", "Rotate wrist_roll in 45° steps; capture a frame at each.", "Aggregate classifier scores.", "Hand the part over to the sorter arm."],
  code: `frames = [capture() for _ in rotate_wrist(step=45)]\nok = classifier(frames).mean() > 0.5\nsorter.place(PASS if ok else REJECT)`,
  keywords: ["inspect", "quality", "defect", "scan", "reject", "pass", "camera", "qc"],
  prompt: "Inspect each part and sort the defective ones",
  needs: { precision: 0.6, contact: 0.2, horizon: 0.6, speed: 0.4, generalize: 0.5 },
  theme: "factory",
  fixtures: [slab(-1, -2, 5, 5, 0.3, 0x334155), slab(14, -6, 8, 6, 0.6, 0x16a34a), slab(14, 4, 8, 6, 0.6, 0xdc2626), box([-6, 3.5, 9], [3, 2, 2], 0x0f172a), cyl([-6, 1.5, 9], 0.8, 3, 0x475569)],
  objects: [cube("i0", -12, -4, 0x60a5fa), cube("i1", -12, 0, 0xb91c1c), cube("i2", -12, 4, 0x60a5fa)],
  program: () => {
    const A: Step[] = [];
    const B: Step[] = [];
    const H: [number, number, number] = [-6, 8.5, 2];
    const verdict = [true, false, true];
    verdict.forEach((ok, i) => {
      A.push(...pick("a", "i" + i, -12, -4 + 4 * i, { y: 1.8, grip: 0.3 }), mv("a", H, 0.9, { pitch: -90 }), mv("a", H, 0.7, { roll: 180, say: "Scanning 360°…" }), mv("a", H, 0.7, { roll: 360 }), mv("a", H, 0.3, { roll: 0, say: ok ? "PASS ✔" : "DEFECT ✘ → reject" }), ...place("a", -1, -2, { y: 1.9 }), sync("a", "t" + i));
      B.push(sync("b", "t" + i), ...pick("b", "i" + i, -1, -2, { y: 1.9, grip: 0.3 }), ...place("b", ok ? 12.5 + (i % 2) * 3 : 13.5, ok ? -6 : 4, { y: 2.1 }));
    });
    A.push(home("a"));
    B.push(home("b"));
    return { a: A, b: B };
  },
};

const tubes: Scenario = {
  id: "tubes",
  title: "Lab Tube Shuttle",
  emoji: "🧪",
  category: "Industry & Lab",
  tagline: "Rack → centrifuge → rack, unattended",
  story: "The left arm loads two sample tubes into a centrifuge, the right arm presses CLOSE / START and OPEN, then the left arm moves the tubes to the output rack.",
  novelty: "Lab automation on a hobbyist budget: the arms operate existing equipment through its own buttons.",
  difficulty: 2,
  arms: 2,
  hardware: ["Sample tubes (empty!)", "Mini centrifuge or mock-up", "2 tube racks"],
  sensors: ["Camera to read tube barcodes / rack occupancy"],
  approach: "Task graph with safety interlocks (lid state, balance check) before START.",
  howTo: ["Define rack slots as poses.", "Always load tubes in opposite pairs (balance).", "Press the device buttons with the closed gripper.", "Wait for the done-LED via camera before unloading."],
  code: `load(rack_in[0], cf[0]); load(rack_in[1], cf[1])\nassert balanced(cf)\ndevice.press("close"); device.press("start")`,
  keywords: ["lab", "tube", "centrifuge", "sample", "science", "pipette", "laboratory", "rack"],
  prompt: "Spin the two sample tubes in the centrifuge and rack them",
  needs: { precision: 0.7, contact: 0.3, horizon: 0.6, speed: 0.3, generalize: 0.3 },
  theme: "lab",
  fixtures: [slab(-13, -2, 5, 10, 1.5, 0x94a3b8), slab(-24, 0, 5, 8, 1.5, 0x94a3b8), cyl([0, 2, -3], 7, 4, 0xe2e8f0), box([12, 0.6, -4], [3, 1.2, 3], 0x16a34a, { trigger: { r: 2.2, flash: 0x22c55e, sound: { type: "click" }, depress: 0.4, fire: "close" } }), box([12, 0.6, -8], [3, 1.2, 3], 0xdc2626, { trigger: { r: 2.2, flash: 0xef4444, sound: { type: "click" }, depress: 0.4, fire: "open" } })],
  objects: [
    { id: "t1", shape: "cyl", pos: [-13, 3.3, -4], size: [1.8, 3.6, 1.8], color: 0x38bdf8 },
    { id: "t2", shape: "cyl", pos: [-13, 3.3, 0], size: [1.8, 3.6, 1.8], color: 0xf472b6 },
    { id: "lid", shape: "cyl", pos: [0, 15, -3], size: [6.6, 0.8, 6.6], color: 0x64748b, fixed: true },
  ],
  anims: {
    close: [{ obj: "lid", delay: 0, dur: 0.8, to: { pos: [0, 8.4, -3] } }],
    open: [{ obj: "lid", delay: 0, dur: 0.8, to: { pos: [0, 15, -3] } }],
  } as Record<string, Anim[]>,
  program: () => {
    const A: Step[] = [];
    const B: Step[] = [];
    [0, 1].forEach((i) => A.push(...pick("a", "t" + (i + 1), -13, -4 + 4 * i, { y: 3.4, grip: 0.25, h: 6 }), ...place("a", -1.6 + 3.2 * i, -3, { y: 6.1, h: 4 })));
    A.push(home("a"), sync("a", "loaded"), sync("a", "spun"));
    B.push(wait("b", 0.1), sync("b", "loaded"), ...strike("b", 12, -4, { y: 1.8, h: 5 }), say("b", "Spinning at 3000 rpm…"), wait("b", 2.5), ...strike("b", 12, -8, { y: 1.8, h: 5 }), sync("b", "spun"), home("b"));
    [0, 1].forEach((i) => A.push(...pick("a", "t" + (i + 1), -1.6 + 3.2 * i, -3, { y: 5.9, grip: 0.25, h: 4 }), ...place("a", -24, -1.5 + 3 * i, { y: 3.6, h: 6 })));
    A.push(home("a"));
    return { a: A, b: B };
  },
};

const PAD: [number, number][] = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
const padXZ = (i: number): [number, number] => [-8 + (PAD[i][0] - 1) * 2.4, -1 + (PAD[i][1] - 1) * 3];
const touch: Scenario = {
  id: "touch",
  title: "Touch-Screen Tester",
  emoji: "📱",
  category: "Industry & Lab",
  tagline: "Automated UI testing on real devices",
  story: "The left arm taps a PIN on a keypad (keys light up) while the right arm draws a swipe-unlock pattern on a tablet.",
  novelty: "Real-device app QA: no emulator can find the bugs a physical finger finds.",
  difficulty: 1,
  arms: 2,
  hardware: ["Phone/tablet (or printed mock-up)", "Conductive-foam fingertip (stylus tip)"],
  sensors: ["Top camera to read the device screen", "Optional: current sensor on the device"],
  approach: "Screen coordinates → table coordinates (homography) → tap / swipe skills.",
  howTo: ["Fix the device with double-sided tape.", "Calibrate 4 screen corners to table XY.", "Tap = descend 3 mm, 80 ms dwell, lift.", "Swipe = linear interpolation with constant height."],
  code: `x, y = screen_to_table(px, py)\narm.tap(x, y, dwell=0.08)\narm.swipe([(x0,y0),(x1,y1)], speed=120)`,
  keywords: ["phone", "touch", "screen", "tap", "swipe", "app", "test", "device", "ui"],
  prompt: "Enter the PIN 1-5-9-6-3 and swipe the unlock pattern",
  needs: { precision: 0.6, contact: 0.4, horizon: 0.4, speed: 0.4, generalize: 0.2 },
  theme: "lab",
  fixtures: [
    slab(-8, -1, 9, 14, 0.8, 0x0f172a),
    ...PAD.map((_, i) => box([padXZ(i)[0], 1.0, padXZ(i)[1]], [1.8, 0.4, 2.2], 0x4b5563, { trigger: { r: 1.3, flash: 0x22d3ee, sound: { type: "click" }, depress: 0.2 } })),
    slab(10, -1, 12, 16, 0.8, 0x111827),
    ...PAD.map(([c, r]) => cyl([10 + (c - 1) * 3.5, 1.0, -1 + (r - 1) * 4], 1, 0.4, 0x94a3b8, { support: false })),
  ],
  objects: [],
  program: () => {
    const A: Step[] = [say("a", "Entering PIN 1-5-9-6-3")];
    [0, 4, 8, 5, 2].forEach((i) => A.push(...strike("a", padXZ(i)[0], padXZ(i)[1], { y: 1.9, h: 4 })));
    A.push(say("a", "PIN accepted ✔"), home("a"));
    const path: [number, number][] = [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]];
    const B: Step[] = [mv("b", [10 + (0 - 1) * 3.5, 6, -1 - 4], 0.9, { pitch: -90, grip: 0 }), mv("b", [10 - 3.5, 1.5, -5], 0.3, { pitch: -90 })];
    path.slice(1).forEach(([c, r]) => B.push(mv("b", [10 + (c - 1) * 3.5, 1.5, -1 + (r - 1) * 4], 0.6, { trail: "#38bdf8" })));
    B.push(mv("b", [10 + 3.5, 6, 3], 0.4), say("b", "Pattern unlocked ✔"), home("b"));
    return { a: A, b: B };
  },
};

/* ================================================================ OUT-OF-THE-BOX */
const mirrorPts: [number, number, number][] = Array.from({ length: 26 }, (_, k) => {
  const t = (k / 26) * Math.PI * 4;
  return [-8 + 5 * Math.sin(t), 9 + 3 * Math.sin(t * 1.5), -2 + 4 * Math.cos(t)];
});
const mirror: Scenario = {
  id: "mirror",
  title: "Mirror Me — Telepresence",
  emoji: "🪞",
  category: "Out-of-the-box",
  tagline: "Webcam hand tracking drives both arms",
  story: "A tracked human hand (gold ball) moves in front of the webcam; the left arm copies it and the right arm mirrors it in real time.",
  novelty: "Zero-hardware teleop: MediaPipe hand tracking replaces the leader arm. Great for live demos with the audience.",
  difficulty: 2,
  arms: 2,
  hardware: ["Laptop webcam"],
  sensors: ["Webcam (MediaPipe Hands / Pose)", "Optional: depth camera for true 3-D"],
  approach: "Hand landmark → table-frame target (scaled) → IK → low-pass filter → servo.",
  howTo: ["Run MediaPipe Hands (in-browser, WASM).", "Map normalised wrist (x, y, size→z) to the arm workspace.", "Filter with a One-Euro filter to remove jitter.", "Mirror the other arm by flipping x."],
  code: `lm = hands.process(frame).multi_hand_landmarks[0].landmark[0]\ntarget = WORKSPACE.map(lm.x, lm.y, lm.z)\nleft.send(ik(target)); right.send(ik(mirror_x(target)))`,
  keywords: ["mirror", "mimic", "copy me", "follow my hand", "telepresence", "webcam", "hand tracking", "puppet"],
  prompt: "Mirror my hand movements",
  needs: { precision: 0.3, contact: 0.1, horizon: 0.2, speed: 0.9, generalize: 0.6 },
  theme: "stage",
  fixtures: [box([0, 9, 16], [9, 18, 2], 0x1e293b, { support: false, opacity: 0.25 }), box([0, 2, 20], [4, 3, 3], 0x0f172a)],
  objects: [{ id: "hand", shape: "sphere", pos: [mirrorPts[0][0], mirrorPts[0][1], mirrorPts[0][2] + 14], size: [2.2, 2.2, 2.2], color: 0xfbbf24, fixed: true }],
  anims: {
    track: mirrorPts.map((p, k): Anim => ({ obj: "hand", delay: k * 0.45, dur: 0.45, to: { pos: [p[0], p[1], p[2] + 14] } })),
  },
  program: () => {
    const A: Step[] = [say("a", "Hand tracked → arms follow"), mv("a", mirrorPts[0], 0.6, { pitch: -90, grip: 0.3, fire: "track" } as Step)];
    const B: Step[] = [mv("b", [-mirrorPts[0][0], mirrorPts[0][1], mirrorPts[0][2]], 0.6, { pitch: -90, grip: 0.3 })];
    mirrorPts.slice(1).forEach((p) => {
      A.push(mv("a", p, 0.45, { trail: "#fbbf24" }));
      B.push(mv("b", [-p[0], p[1], p[2]], 0.45, { trail: "#a78bfa" }));
    });
    A.push(home("a"));
    B.push(home("b"));
    return { a: A, b: B };
  },
};

const FRAMES = 6;
const clayPos = (k: number): [number, number] => [-12 + 2 * k, -2 + 1.5 * Math.sin(k * 0.9)];
const stopmotion: Scenario = {
  id: "stopmotion",
  title: "Stop-Motion Animator",
  emoji: "🎬",
  category: "Out-of-the-box",
  tagline: "Nudges a clay figure and clicks the shutter",
  story: "The left arm nudges a clay figure a few millimetres at a time; after each move the right arm presses the shutter, lighting up the film strip.",
  novelty: "Robots are perfect animators: repeatable micro-moves, perfect timing, and 24 fps × hours of patience.",
  difficulty: 2,
  arms: 2,
  hardware: ["Clay figure on a stick base", "Phone/camera + shutter button (or remote)"],
  sensors: ["Camera on a fixed tripod"],
  approach: "Keyframed micro-moves; each move followed by a camera trigger and a settle delay.",
  howTo: ["Define keyframe poses for the figure (x, z, rotation).", "After each move wait 300 ms for vibrations to settle.", "Trigger the camera via a servo-pressed button or USB.", "Assemble frames into a GIF/MP4 automatically."],
  code: `for k, pose in enumerate(keyframes):\n    arm_a.nudge(figure, pose); sleep(0.3)\n    camera.shoot(f"frame_{k:03d}.jpg")`,
  keywords: ["stop motion", "animate", "animation", "film", "movie", "clay", "timelapse"],
  prompt: "Make a stop-motion animation of the clay figure walking",
  needs: { precision: 0.8, contact: 0.2, horizon: 0.7, speed: 0.2, generalize: 0.2 },
  theme: "stage",
  fixtures: [box([12, 0.6, -4], [3, 1.2, 3], 0xef4444, { trigger: { r: 2.2, flash: 0xffffff, sound: { type: "click" }, depress: 0.5 } })],
  objects: [
    { id: "clay", shape: "cyl", pos: [clayPos(0)[0], 2, clayPos(0)[1]], size: [2, 4, 2], color: 0xf59e0b },
    ...Array.from({ length: FRAMES }, (_, k): SimObject => ({ id: "fr" + k, shape: "box", pos: [-7.5 + 3 * k, 0.3, 9], size: [2.4, 0.4, 3.2], color: 0x374151, fixed: true })),
  ],
  anims: Object.fromEntries(Array.from({ length: FRAMES }, (_, k) => ["f" + k, [{ obj: "fr" + k, delay: 0, dur: 0.3, to: { color: 0xfde047 } }] as Anim[]])),
  program: () => {
    const A: Step[] = [];
    const B: Step[] = [];
    for (let k = 0; k < FRAMES; k++) {
      const [x, z] = clayPos(k);
      const [nx, nz] = clayPos(k + 1);
      const steps = k < FRAMES - 1 ? [...pick("a", "clay", x, z, { y: 2.4, grip: 0.3, h: 5 }), ...place("a", nx, nz, { y: 2.6, h: 5 })] : [wait("a", 0.4)];
      turn(A, B, "a", steps, "m" + k);
      A.push(sync("a", "s" + k));
      B.push(sync("b", "s" + k), ...strike("b", 12, -4, { y: 1.8, h: 5, fire: "f" + k }));
    }
    A.push(say("a", "Wrap! 🎬 6 frames captured"), home("a"));
    B.push(home("b"));
    return { a: A, b: B };
  },
};

const evcharge: Scenario = {
  id: "evcharge",
  title: "Mini EV Auto-Charger",
  emoji: "🔌",
  category: "Out-of-the-box",
  tagline: "Opens the port flap and plugs in the charger",
  story: "The right arm slides open the charge-port flap; the left arm carries the charger plug (cyan cable trail) to the port. LEDs and the battery bar fill up.",
  novelty: "Autonomous EV charging is a real-world robotics problem — here as a 1:10 desk model.",
  difficulty: 3,
  arms: 2,
  hardware: ["Toy car with a printed port + flap", "Plug (printed) on a cable holder"],
  sensors: ["Wrist camera to locate the port (AprilTag next to it)", "Servo load for insertion detection"],
  approach: "AprilTag-based port pose → approach → compliant insertion → verify via LED/current.",
  howTo: ["Put an AprilTag next to the port.", "Estimate the port pose from the wrist camera.", "Approach along the port axis, then insert with load monitoring.", "Verify with a charge-LED detector."],
  code: `port = detect_tag(wrist_cam)\narm.approach(port, offset=0.05)\narm.insert(port, stop_on_load=LOAD_MAX)`,
  keywords: ["charge", "ev", "electric", "car", "plug", "port", "battery"],
  prompt: "Plug in the charger and start charging the car",
  needs: { precision: 0.9, contact: 0.8, horizon: 0.5, speed: 0.2, generalize: 0.3 },
  theme: "factory",
  fixtures: [box([0, 1.5, -3], [9, 3, 5], 0x2563eb), slab(-12, -2, 5, 5, 0.3, 0x475569)],
  objects: [
    { id: "flap", shape: "box", pos: [0, 3.15, -3], size: [3, 0.3, 3], color: 0x94a3b8, fixed: true },
    { id: "led", shape: "sphere", pos: [3.4, 3.3, -3], size: [0.9, 0.9, 0.9], color: 0xef4444, fixed: true },
    ...[0, 1, 2, 3].map((k): SimObject => ({ id: "seg" + k, shape: "box", pos: [-3 + 2 * k, 3.15, -4.4], size: [1.5, 0.3, 0.8], color: 0x374151, fixed: true })),
    can("plug", -12, -2, 0x22d3ee, 1.6, 4),
  ],
  anims: {
    open: [{ obj: "flap", delay: 0, dur: 0.6, to: { pos: [3.4, 3.15, -3] } }],
    charge: [
      { obj: "led", delay: 0.2, dur: 0.4, to: { color: 0x22c55e } },
      ...[0, 1, 2, 3].map((k): Anim => ({ obj: "seg" + k, delay: 0.5 + k * 0.7, dur: 0.4, to: { color: 0x22c55e } })),
    ],
  },
  program: () => ({
    a: [
      ...pick("a", "plug", -12, -2, { y: 2.2, grip: 0.3, h: 7 }),
      sync("a", "ready"),
      mv("a", [-4, 10, -3], 0.9, { pitch: -90, trail: "#22d3ee" }),
      mv("a", [0, 9.5, -3], 0.7, { pitch: -90, trail: "#22d3ee" }),
      mv("a", [0, 5.4, -3], 0.8, { pitch: -90, trail: "#22d3ee", say: "Inserting — watching servo load…" }),
      { arm: "a", dur: 0.3, drop: true, grip: 1, fire: "charge", say: "Charging ⚡" },
      mv("a", [0, 11, -3], 0.5, { pitch: -90 }),
      wait("a", 3.2),
      home("a"),
    ],
    b: [mv("b", [0, 9, -3], 0.9, { pitch: -90, grip: 0 }), ...strike("b", 0, -3, { y: 3.8, h: 5, fire: "open" }), say("b", "Port open"), sync("b", "ready"), home("b")],
  }),
};

const seedling: Scenario = {
  id: "seedling",
  title: "Seed Planter",
  emoji: "🌱",
  category: "Out-of-the-box",
  tagline: "Dibbles holes, drops seeds, sprouts appear",
  story: "The left arm pokes a hole, the right arm drops a seed into it. Three holes later, the time-lapse shows sprouts.",
  novelty: "Tiny-scale precision agriculture: row planting, spacing control and growth logging per plant.",
  difficulty: 2,
  arms: 2,
  hardware: ["Seed tray, soil bed", "Dibble stick (printed) for the left jaw", "Seeds (bigger ones like beans)"],
  sensors: ["Top camera to log seed positions and growth", "Soil-moisture sensor"],
  approach: "Row planner generates hole coordinates; A pokes, B drops; camera audits each hole.",
  howTo: ["Generate hole coordinates with fixed spacing.", "Poke 1 cm deep with the stylus.", "Right arm picks a seed from the tray and releases above the hole.", "Photograph the bed daily for the growth timelapse."],
  code: `for z in rows(spacing_cm=3):\n    A.poke(x0, z); B.pick(SEED_TRAY); B.place(x0, z, release_height=2)`,
  keywords: ["seed", "plant", "agriculture", "farm", "grow", "sprout", "garden bed", "sow"],
  prompt: "Plant three seeds in a row",
  needs: { precision: 0.6, contact: 0.4, horizon: 0.6, speed: 0.3, generalize: 0.5 },
  theme: "home",
  fixtures: [slab(0, 0, 9, 14, 0.8, 0x78350f), ...[-4, -1, 2].map((z) => cyl([0, 0.85, z], 1.2, 0.1, 0x1c1917, { support: false }))],
  objects: [
    ...[0, 1, 2].map((k): SimObject => ({ id: "s" + k, shape: "sphere", pos: [14, 0.5, -6 + 3 * k], size: [1, 1, 1], color: 0xfacc15 })),
    ...[0, 1, 2].map((k): SimObject => ({ id: "sp" + k, shape: "sphere", pos: [0, 1, -4 + 3 * k], size: [0.1, 0.1, 0.1], color: 0x22c55e, fixed: true })),
  ],
  anims: { grow: [0, 1, 2].map((k): Anim => ({ obj: "sp" + k, delay: k * 0.4, dur: 1.6, to: { scale: 20, pos: [0, 2.2, -4 + 3 * k] } })) },
  program: () => {
    const A: Step[] = [];
    const B: Step[] = [];
    [-4, -1, 2].forEach((z, k) => {
      turn(A, B, "a", [...strike("a", 0, z, { y: 1.3, h: 5 })], "p" + k);
      turn(A, B, "b", [...pick("b", "s" + k, 14, -6 + 3 * k, { y: 0.5, grip: 0.1, h: 6 }), ...place("b", 0, z, { y: 1.6, h: 5, fire: k === 2 ? "grow" : undefined })], "q" + k);
    });
    A.push(wait("a", 2), say("a", "Sprouts after 7 days (time-lapse) 🌱"), home("a"));
    B.push(home("b"));
    return { a: A, b: B };
  },
};

export const industry: Scenario[] = [handover, peg, inspect, tubes, touch];
export const outOfBox: Scenario[] = [mirror, stopmotion, evcharge, seedling];
export { ball, can };
