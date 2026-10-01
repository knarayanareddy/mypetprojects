import { ball, box, can, cube, cyl, home, mv, pick, place, say, slab, strike, sync, turn, wait } from "./dsl";
import type { Anim, Scenario, SimObject, Step } from "./types";

/* ================================================================ HOME & CARE */
const sorter: Scenario = {
  id: "sorter",
  title: "Toy Sorting Helper",
  emoji: "🧸",
  category: "Home & Care",
  tagline: "Tidies colour-coded blocks into bins",
  story: "Six coloured blocks are scattered on the table. Each arm sorts the colours it can reach; green blocks go to the shared middle bin.",
  novelty: "A child- or elderly-friendly tidy-up helper that needs only a colour classifier plus pick-and-place.",
  difficulty: 1,
  arms: 2,
  hardware: ["Coloured blocks", "3 low-wall bins"],
  sensors: ["Top camera (640×480) for colour/position detection"],
  approach: "Colour segmentation → pixel→table homography → IK pick & place.",
  howTo: ["Calibrate camera with 4 AprilTags on the table corners.", "Detect blobs per colour → (x, y) on the table.", "Pick with pitch -90°, close until gripper load rises.", "Route by colour to a bin; alternate arms by reachability."],
  code: `for blob in detect_blocks(frame):\n    arm = left if blob.x < 0 else right\n    arm.pick(blob.xy); arm.place(BIN[blob.color])`,
  keywords: ["sort", "tidy", "clean", "blocks", "toys", "colour", "color", "organize"],
  prompt: "Tidy up the blocks by colour",
  needs: { precision: 0.5, contact: 0.2, horizon: 0.5, speed: 0.4, generalize: 0.6 },
  theme: "home",
  fixtures: [slab(-26, -6, 8, 8, 0.6, 0xef4444), slab(26, -6, 8, 8, 0.6, 0x3b82f6), slab(0, -10, 8, 8, 0.6, 0x22c55e)],
  objects: [cube("r1", -8, -2, 0xef4444), cube("r2", -12, 2, 0xef4444), cube("b1", 8, -2, 0x3b82f6), cube("b2", 12, 2, 0x3b82f6), cube("g1", -4, 2, 0x22c55e), cube("g2", 4, 2, 0x22c55e)],
  program: () => ({
    a: [...pick("a", "r1", -8, -2), ...place("a", -27.5, -6, { y: 2.1 }), ...pick("a", "r2", -12, 2), ...place("a", -24.5, -6, { y: 2.1 }), ...pick("a", "g1", -4, 2), ...place("a", -1.8, -10, { y: 2.1 }), home("a")],
    b: [...pick("b", "b1", 8, -2), ...place("b", 27.5, -6, { y: 2.1 }), ...pick("b", "b2", 12, 2), ...place("b", 24.5, -6, { y: 2.1 }), ...pick("b", "g2", 4, 2), ...place("b", 1.8, -10, { y: 2.1 }), home("b")],
  }),
};

const pills: Scenario = {
  id: "pills",
  title: "Pill-Dispenser Assistant",
  emoji: "💊",
  category: "Home & Care",
  tagline: "Loads a weekly organizer and serves water",
  story: "The left arm sorts today's pills into the organizer compartments while the right arm brings a cup of water to the user.",
  novelty: "Assistive care use-case: reliable, slow, verifiable motion — with a camera double-check of each compartment.",
  difficulty: 2,
  arms: 2,
  hardware: ["Pill organizer (printed or off-the-shelf)", "Dummy pills (beads!)", "Cup"],
  sensors: ["Top camera to verify each compartment", "Optional: weight sensor under the cup"],
  approach: "Scheduled skill + vision verification loop (retry if compartment empty).",
  howTo: ["NEVER use real medication in a hackathon demo — use beads.", "Use a small-gripper pad for 5 mm objects.", "Verify each compartment with a camera crop; retry on failure.", "Serve the cup at a fixed handover pose."],
  code: `for day, n in schedule.items():\n    for _ in range(n):\n        arm.pick(tray_pill()); arm.place(COMPARTMENT[day])\n        assert camera.count(COMPARTMENT[day]) >= 1`,
  keywords: ["pill", "medication", "medicine", "care", "elderly", "water", "assist"],
  prompt: "Prepare today's pills and bring a glass of water",
  needs: { precision: 0.8, contact: 0.2, horizon: 0.5, speed: 0.2, generalize: 0.5 },
  theme: "home",
  fixtures: [slab(-9.5, 5, 12, 4, 0.6, 0xf3f4f6), box([-13, 1.0, 5], [0.3, 0.8, 4], 0x9ca3af), box([-9.5, 1.0, 5], [0.3, 0.8, 4], 0x9ca3af), box([-6, 1.0, 5], [0.3, 0.8, 4], 0x9ca3af), slab(-12, -2, 10, 5, 0.3, 0xe5e7eb)],
  objects: [
    { id: "p1", shape: "cyl", pos: [-14, 0.7, -2], size: [1.4, 0.8, 1.4], color: 0xf59e0b },
    { id: "p2", shape: "cyl", pos: [-12, 0.7, -2], size: [1.4, 0.8, 1.4], color: 0xef4444 },
    { id: "p3", shape: "cyl", pos: [-10, 0.7, -2], size: [1.4, 0.8, 1.4], color: 0x60a5fa },
    can("cup", 16, -1, 0xbfdbfe, 3.4, 4.5),
  ],
  program: () => ({
    a: [say("a", "Loading Mon / Tue / Wed compartments"), ...pick("a", "p1", -14, -2, { y: 0.8, grip: 0.12, h: 6 }), ...place("a", -11.5, 5, { y: 1.3, h: 6 }), ...pick("a", "p2", -12, -2, { y: 0.8, grip: 0.12, h: 6 }), ...place("a", -8, 5, { y: 1.3, h: 6 }), ...pick("a", "p3", -10, -2, { y: 0.8, grip: 0.12, h: 6 }), ...place("a", -14.5, 5, { y: 1.3, h: 6 }), home("a")],
    b: [wait("b", 1.5), ...pick("b", "cup", 16, -1, { y: 2.2, grip: 0.4 }), ...place("b", 4, 4, { y: 2.3 }), say("b", "Water is ready — time for your pills", 0.01), wait("b", 1.2), home("b")],
  }),
};

const FILL_ANIM: Record<string, Anim[]> = { pour: [{ obj: "coffee", delay: 0.3, dur: 2.2, to: { scale: 20, pos: [0, 3.65, 0] } }] };
const barista: Scenario = {
  id: "barista",
  title: "Pour-Over Barista",
  emoji: "☕",
  category: "Home & Care",
  tagline: "Pours a coffee and serves it",
  story: "The left arm grasps a kettle from the side, rolls its wrist to pour into the dripper cup, then the right arm serves the cup to the customer.",
  novelty: "Showcases wrist roll — the one DOF most pick-and-place demos ignore.",
  difficulty: 3,
  arms: 2,
  hardware: ["Small kettle with side handle (or a plastic cup)", "Dripper cup", "Water only!"],
  sensors: ["Scale (HX711 load cell) to stop pouring at target grams", "Optional: wrist camera"],
  approach: "Scripted pour profile with load-cell feedback controlling wrist roll angle.",
  howTo: ["Grasp the handle horizontally (pitch 0°).", "Pour: slowly roll wrist 0→100° while watching grams.", "Stop at target mass; roll back quickly to avoid drips.", "Right arm picks the cup from the top and serves."],
  code: `while scale.grams() < TARGET:\n    roll = min(roll + 0.6, 100)\n    arm.set(wrist_roll=roll)\narm.set(wrist_roll=0)`,
  keywords: ["coffee", "pour", "barista", "kettle", "tea", "drink", "serve"],
  prompt: "Make me a pour-over coffee",
  needs: { precision: 0.6, contact: 0.5, horizon: 0.6, speed: 0.3, generalize: 0.4 },
  theme: "home",
  fixtures: [cyl([0, 1.75, 0], 4.2, 3.5, 0xf8fafc), cyl([13, 0.3, -4], 6, 0.6, 0x94a3b8), slab(14, 8, 6, 6, 0.3, 0xfde68a)],
  objects: [
    can("kettle", -6, 2, 0x64748b, 4, 7),
    { id: "coffee", shape: "cyl", pos: [0, 3.65, 0], size: [0.17, 0.015, 0.17], color: 0x3b2314, fixed: true },
    can("cup2", 13, -4, 0xffffff, 3.6, 4.2, 2.7),
  ],
  anims: { ...FILL_ANIM },
  program: () => ({
    a: [
      mv("a", [-9, 3.5, 3.5], 0.9, { pitch: 0, grip: 1 }),
      mv("a", [-6.7, 3.5, 2.2], 0.6, { pitch: 0 }),
      { arm: "a", dur: 0.05, grab: "kettle", grip: 0.35 },
      mv("a", [-3, 9, 0], 1.1, { pitch: 0 }),
      mv("a", [-1.2, 9, 0], 0.5, { pitch: 0, fire: "pour", roll: 100 } as Step),
      wait("a", 2.4),
      mv("a", [-3, 9, 0], 0.7, { pitch: 0, roll: 0 }),
      mv("a", [-6.7, 3.9, 2.2], 1.0, { pitch: 0 }),
      { arm: "a", dur: 0.2, drop: true, grip: 1 },
      home("a"),
    ],
    b: [wait("b", 6.2), ...pick("b", "cup2", 13, -4, { y: 2.7, grip: 0.4 }), ...place("b", 14, 8, { y: 2.6 }), say("b", "One pour-over, served ☕", 0.01), wait("b", 1), home("b")],
  }),
};

const plant: Scenario = {
  id: "plant",
  title: "Plant Caretaker",
  emoji: "🪴",
  category: "Home & Care",
  tagline: "Waters a plant when the soil sensor says dry",
  story: "A soil sensor flags 'dry' (red). The left arm waters the plant, the sensor turns green and the plant perks up while the right arm logs the result.",
  novelty: "A closed sensing → acting loop that runs unattended for days.",
  difficulty: 1,
  arms: 2,
  hardware: ["Small pot + plant", "Mini watering can (water!)", "Capacitive soil-moisture sensor"],
  sensors: ["Soil moisture sensor (ESP32/Arduino)", "Optional: camera for leaf health"],
  approach: "Threshold trigger from sensor → scripted watering skill → log to DB.",
  howTo: ["Read the soil sensor over serial/MQTT.", "If moisture < 30 %: run the water skill.", "Pour in 3 short pulses; wait for the reading to rise.", "Store the run in the database."],
  code: `if soil.read() < 0.30:\n    arm.run_skill("water_plant", pulses=3)\n    log_run("water_plant", soil.read())`,
  keywords: ["plant", "water", "garden", "soil", "flower", "gardening"],
  prompt: "Water the plant if the soil is dry",
  needs: { precision: 0.5, contact: 0.3, horizon: 0.5, speed: 0.2, generalize: 0.5 },
  theme: "home",
  fixtures: [cyl([0, 2, 2], 6, 4, 0xb45309), box([12, 0.6, -4], [3, 1.2, 3], 0x1f2937, { trigger: { r: 2.2, flash: 0x22c55e, sound: { type: "ding" }, depress: 0.4 } })],
  objects: [
    { id: "leaf", shape: "sphere", pos: [0, 5.2, 2], size: [1.4, 1.4, 1.4], color: 0xa3862f, fixed: true },
    { id: "sensor", shape: "box", pos: [3.4, 4.4, 2], size: [0.5, 1.2, 0.2], color: 0xef4444, fixed: true },
    can("can", -9, -1, 0x2563eb, 3.6, 5),
  ],
  anims: {
    water: [
      { obj: "leaf", delay: 0.6, dur: 2.4, to: { scale: 2.2, pos: [0, 6.2, 2], color: 0x16a34a } },
      { obj: "sensor", delay: 0.8, dur: 1.6, to: { color: 0x22c55e } },
    ],
  },
  program: () => ({
    a: [
      say("a", "Soil sensor: DRY (22 %) → watering"),
      mv("a", [-12, 3.2, 1], 0.9, { pitch: 0, grip: 1 }),
      mv("a", [-9.6, 3.2, -0.6], 0.6, { pitch: 0 }),
      { arm: "a", dur: 0.05, grab: "can", grip: 0.35 },
      mv("a", [-4, 8.5, 2], 1.0, { pitch: 0 }),
      mv("a", [-2.4, 8.5, 2], 0.5, { pitch: 0, roll: 90, fire: "water" } as Step),
      wait("a", 2.2),
      mv("a", [-4, 8.5, 2], 0.6, { pitch: 0, roll: 0 }),
      mv("a", [-9.6, 3.6, -0.6], 1.0, { pitch: 0 }),
      { arm: "a", dur: 0.2, drop: true, grip: 1 },
      home("a"),
    ],
    b: [wait("b", 4.5), mv("b", [2, 12, 4], 1.0, { pitch: -60 }), ...strike("b", 12, -4, { y: 1.8, h: 5 }), say("b", "Logged: watered at 08:00 ✔", 0.01), home("b")],
  }),
};

const pageBook: Scenario = {
  id: "pageturn",
  title: "One-Button Page Turner",
  emoji: "📖",
  category: "Home & Care",
  tagline: "Accessible reading: press a switch, the page turns",
  story: "The left arm acts as an assistive switch operator (one big button), the right arm slides under the page edge and flips it.",
  novelty: "Single-switch accessibility device built from an off-the-shelf arm — replaces a $1000+ commercial page turner.",
  difficulty: 2,
  arms: 2,
  hardware: ["Book held flat with clips", "Thin printed 'finger' tab / double-sided tape", "Large arcade button"],
  sensors: ["Optional: camera + OCR to verify the page changed"],
  approach: "Low-pitch sweep trajectory with compliant fingertip; retry if camera sees the same page.",
  howTo: ["Tape a thin plastic tab to the fixed jaw.", "Slide under the page edge at ~45°, sweep in an arc.", "Hold the page until it settles, then retreat.", "Verify via a hash of the page image."],
  code: `waypoints = [edge, lift, over, flat]\nfor w in waypoints: arm.move_to(w, pitch=-45)`,
  keywords: ["page", "book", "read", "accessib", "turn", "disabled", "switch"],
  prompt: "Turn the page",
  needs: { precision: 0.7, contact: 0.7, horizon: 0.4, speed: 0.2, generalize: 0.5 },
  theme: "home",
  fixtures: [slab(2, 0, 8, 10, 0.8, 0xfef3c7), slab(10, 0, 8, 10, 0.8, 0xfef3c7), box([-14, 0.6, -2], [4, 1.2, 4], 0xef4444, { trigger: { r: 2.5, flash: 0xfacc15, sound: { type: "ding" }, depress: 0.6 } })],
  objects: [{ id: "page", shape: "box", pos: [10, 0.9, 0], size: [7.4, 0.15, 9.4], color: 0xffffff }],
  anims: {
    flip: [
      { obj: "page", delay: 0.0, dur: 0.5, to: { pos: [6, 6, 0], rot: [0, 0, 1.57] } },
      { obj: "page", delay: 0.5, dur: 0.5, to: { pos: [2, 0.9, 0], rot: [0, 0, 3.14] } },
    ],
  },
  program: () => ({
    a: [mv("a", [-14, 7, -2], 0.8, { pitch: -90, grip: 0 }), ...strike("a", -14, -2, { y: 1.6, h: 5 }), sync("a", "go"), wait("a", 1.5), home("a")],
    b: [sync("b", "go"), mv("b", [14, 3, 1], 0.9, { pitch: -45, grip: 0 }), mv("b", [12.5, 1.2, 0], 0.5, { pitch: -45 }), mv("b", [8, 3, 0], 0.5, { pitch: -45, fire: "flip" } as Step), mv("b", [4.5, 5.5, 0], 0.5, { pitch: -45 }), say("b", "Page turned ✔", 0.01), home("b")],
  }),
};

/* ================================================================ GAMES & MAGIC */
const COLS = [-4.5, -1.5, 1.5, 4.5];
const connect4: Scenario = {
  id: "connect4",
  title: "Connect-4 Duel",
  emoji: "🔴",
  category: "Games & Magic",
  tagline: "Two arms play a disc-dropping game",
  story: "Red (left arm) and yellow (right arm) alternate dropping discs into the tubes. Red stacks four in column two and wins.",
  novelty: "Adversarial turn-taking between two policies — pit two different models against each other!",
  difficulty: 2,
  arms: 2,
  hardware: ["Discs (poker chips)", "Vertical tubes / a printed Connect-4 frame"],
  sensors: ["Top/front camera to read the board state"],
  approach: "Camera → board state → minimax/MCTS → column → drop skill.",
  howTo: ["Read the board with a colour threshold.", "Pick the move with minimax depth 4.", "Pick a chip from the reservoir, release above the column.", "Run a different model for each arm for an 'AI battle'."],
  code: `col = minimax(board, depth=4)\narm.pick(RESERVOIR); arm.move_over(COLUMN[col]); arm.release()`,
  keywords: ["connect", "game", "play against", "duel", "tic", "chess", "board game", "battle"],
  prompt: "Play a game of Connect-4 with the other arm",
  needs: { precision: 0.6, contact: 0.1, horizon: 0.7, speed: 0.3, generalize: 0.3 },
  theme: "stage",
  fixtures: COLS.map((x) => cyl([x, 4.5, 3], 3.4, 9, 0x93c5fd, { support: false, opacity: 0.25 })),
  objects: [
    ...[0, 1, 2, 3].map((i): SimObject => ({ id: "r" + i, shape: "cyl", pos: [-13, 0.3, -4 + i * 2.6], size: [2.6, 0.6, 2.6], color: 0xef4444 })),
    ...[0, 1, 2, 3].map((i): SimObject => ({ id: "y" + i, shape: "cyl", pos: [13, 0.3, -4 + i * 2.6], size: [2.6, 0.6, 2.6], color: 0xfacc15 })),
  ],
  program: () => {
    const A: Step[] = [];
    const B: Step[] = [];
    const seq: ["a" | "b", number, number][] = [["a", 0, 1], ["b", 0, 3], ["a", 1, 1], ["b", 1, 2], ["a", 2, 1], ["b", 2, 3], ["a", 3, 1]];
    seq.forEach(([arm, i, col], k) => {
      const src = arm === "a" ? -13 : 13;
      const id = (arm === "a" ? "r" : "y") + i;
      const steps = [...pick(arm, id, src, -4 + i * 2.6, { y: 0.4, grip: 0.25, h: 7 }), ...place(arm, COLS[col], 3, { y: 9, h: 1 })];
      turn(A, B, arm, steps, "m" + k);
    });
    A.push(say("a", "Red connects four! 🔴🔴🔴🔴"), home("a"));
    B.push(home("b"));
    return { a: A, b: B };
  },
};

const DOM_X = Array.from({ length: 10 }, (_, i) => -13.5 + 3 * i);
const dominoes: Scenario = {
  id: "dominoes",
  title: "Domino Chain Reaction",
  emoji: "🀄",
  category: "Games & Magic",
  tagline: "Completes a gap, then triggers the topple",
  story: "A domino line has one missing piece. The right arm places it into the gap and the left arm taps the first tile to start the chain.",
  novelty: "Precision placement of thin objects — and a gloriously satisfying demo for judges.",
  difficulty: 2,
  arms: 2,
  hardware: ["Dominoes (or printed tiles)"],
  sensors: ["Camera to find the gap / verify the line"],
  approach: "Vision-based gap detection → thin-object pick → fine insertion → push.",
  howTo: ["Lay the line with a printed jig.", "Pick the tile by its narrow edge, pitch -90°.", "Insert with slow final 5 mm descent.", "Tap the first tile with the closed gripper."],
  code: `gap = camera.find_gap()\narm_b.pick(TILE_FEEDER); arm_b.place(gap, slow=True)\narm_a.push(FIRST_TILE)`,
  keywords: ["domino", "chain", "topple", "reaction", "dominos"],
  prompt: "Finish the domino line and knock it over",
  needs: { precision: 0.7, contact: 0.4, horizon: 0.5, speed: 0.3, generalize: 0.3 },
  theme: "stage",
  fixtures: [],
  objects: [
    ...DOM_X.map((x, i): SimObject => ({ id: "d" + i, shape: "box", pos: [x, 2, 1], size: [0.9, 4, 2.6], color: [0xf87171, 0xfb923c, 0xfacc15, 0x4ade80, 0x2dd4bf, 0x60a5fa, 0xa78bfa, 0xf472b6, 0xf87171, 0xfb923c][i] })).filter((o) => o.id !== "d5"),
    { id: "d5", shape: "box", pos: [14, 2, -6], size: [0.9, 4, 2.6], color: 0x60a5fa },
  ],
  anims: {
    topple: DOM_X.map((x, i): Anim => ({ obj: "d" + i, delay: i * 0.17, dur: 0.35, to: { pos: [x + 2.1, 0.5, 1], rot: [0, 0, -1.45] } })),
  },
  program: () => ({
    a: [sync("a", "placed"), mv("a", [-17.5, 6, 1], 0.7, { pitch: -90, grip: 0 }), mv("a", [-17.5, 3.4, 1], 0.4, { pitch: -90 }), mv("a", [-14.4, 3.4, 1], 0.25, { pitch: -90, fire: "topple" } as Step), mv("a", [-14.4, 8, 1], 0.4), say("a", "Chain reaction! 🀄"), wait("a", 3), home("a")],
    b: [...pick("b", "d5", 14, -6, { y: 2, grip: 0.12, h: 7 }), ...place("b", -13.5 + 15, 1, { y: 2.3 }), sync("b", "placed"), home("b")],
  }),
};

const CUP_Y = [1.5, 4.5, 7.5];
const cupstack: Scenario = {
  id: "cupstack",
  title: "Speed Cup-Stacking Duo",
  emoji: "🥤",
  category: "Games & Magic",
  tagline: "Two arms build a 3-2-1 pyramid",
  story: "Six cups on the sides get stacked into a pyramid by two arms taking strict turns, never colliding in the shared centre.",
  novelty: "Shared-workspace collision avoidance via a turn-taking protocol — the core of bimanual manipulation.",
  difficulty: 2,
  arms: 2,
  hardware: ["6 plastic cups (small)", "Tape marks for the pyramid footprint"],
  sensors: ["Top camera for cup poses"],
  approach: "Task-graph scheduler with mutual-exclusion on the centre zone.",
  howTo: ["Define a pyramid task graph (base→row2→top).", "Lock the centre zone while an arm is inside it.", "Use TPU pads on the claw for round cups.", "Time it — and race a human!"],
  code: `with workspace_lock("centre"):\n    arm.pick(cup); arm.place(slot)`,
  keywords: ["stack", "cup", "pyramid", "tower", "build", "race"],
  prompt: "Stack the cups into a pyramid",
  needs: { precision: 0.7, contact: 0.3, horizon: 0.7, speed: 0.6, generalize: 0.3 },
  theme: "stage",
  fixtures: [],
  objects: [
    can("c1", -12, -2, 0xf87171, 3, 3), can("c4", -12, 2, 0xfb923c, 3, 3), can("c6", -12, 6, 0xfacc15, 3, 3),
    can("c2", 12, -2, 0x60a5fa, 3, 3), can("c3", 12, 2, 0x4ade80, 3, 3), can("c5", 12, 6, 0xa78bfa, 3, 3),
  ],
  program: () => {
    const A: Step[] = [];
    const B: Step[] = [];
    const plan: ["a" | "b", string, number, number, number, number][] = [
      ["a", "c1", -12, -2, -3.2, 0], ["b", "c2", 12, -2, 0, 0], ["b", "c3", 12, 2, 3.2, 0],
      ["a", "c4", -12, 2, -1.6, 1], ["b", "c5", 12, 6, 1.6, 1], ["a", "c6", -12, 6, 0, 2],
    ];
    plan.forEach(([arm, id, sx, sz, px, row], k) => {
      turn(A, B, arm, [...pick(arm, id, sx, sz, { y: 1.8, grip: 0.3, h: 6 }), ...place(arm, px, -3, { y: CUP_Y[row] + 0.4, h: 3 })], "s" + k);
    });
    A.push(home("a"));
    B.push(home("b"));
    return { a: A, b: B };
  },
};

const goalkeeper: Scenario = {
  id: "goalkeeper",
  title: "Penalty Shootout",
  emoji: "⚽",
  category: "Games & Magic",
  tagline: "Striker vs. goalkeeper, reaction-time test",
  story: "The left arm taps a ball toward the goal; the right arm tracks it and blocks. The third shot is placed out of reach and scores.",
  novelty: "The ultimate closed-loop latency test: a reactive visual policy vs. scripted open-loop.",
  difficulty: 3,
  arms: 2,
  hardware: ["Ping-pong ball", "Two goal posts"],
  sensors: ["High-FPS camera (60+ FPS) for ball tracking"],
  approach: "Ball tracking → trajectory prediction → goalkeeper intercept pose (needs ≤100 ms latency).",
  howTo: ["Track the ball with a colour mask at 60 FPS.", "Fit a line, predict the crossing point at the goal line.", "Command the goalie pose immediately.", "Compare ACT (fast) vs. VLA (slow) as the goalie."],
  code: `x_goal = predict_crossing(track)\ngoalie.move_to(x_goal, GOAL_Z, pitch=-90, speed="max")`,
  keywords: ["ball", "goal", "soccer", "football", "react", "catch", "block", "keeper"],
  prompt: "Block the ball",
  needs: { precision: 0.5, contact: 0.2, horizon: 0.2, speed: 1.0, generalize: 0.4 },
  theme: "stage",
  fixtures: [box([6, 2.5, 8.2], [0.8, 5, 0.8], 0xf8fafc), box([18, 2.5, 8.2], [0.8, 5, 0.8], 0xf8fafc)],
  objects: [ball("ball", -6, -2, 0xfafafa, 3)],
  anims: {
    s1: [{ obj: "ball", delay: 0, dur: 0.75, to: { pos: [13, 1.5, 5.5] } }],
    r1: [{ obj: "ball", delay: 0, dur: 0.4, to: { pos: [-6, 1.5, -2] } }],
    s2: [{ obj: "ball", delay: 0, dur: 0.75, to: { pos: [8, 1.5, 6] } }],
    s3: [{ obj: "ball", delay: 0, dur: 0.75, to: { pos: [17, 1.5, 8.5] } }],
  },
  program: () => {
    const A: Step[] = [];
    const B: Step[] = [];
    const shots = [
      ["s1", [13, 2.4, 5.5], "Save!"],
      ["s2", [8, 2.4, 6], "Save!"],
      ["s3", [10, 2.4, 6], "GOAL! ⚽"],
    ] as const;
    shots.forEach(([anim, block, msg], k) => {
      A.push(mv("a", [-9, 6, -2], 0.5, { pitch: -90, grip: 0 }), mv("a", [-9, 2.3, -2], 0.25, { pitch: -90 }), mv("a", [-5, 2.3, -2], 0.18, { pitch: -90, fire: anim } as Step), sync("a", "k" + k), mv("a", [-9, 6, -2], 0.4), wait("a", 1.2));
      B.push(sync("b", "k" + k), mv("b", block as unknown as [number, number, number], 0.5, { pitch: -90, grip: 0, say: msg } as Step), wait("b", 0.7), mv("b", [12, 8, 2], 0.5, { pitch: -90 }));
      if (k < 2) {
        A.push(wait("a", 0.3, { fire: "r1" }));
      }
    });
    A.push(home("a"));
    B.push(home("b"));
    return { a: A, b: B };
  },
};

const CUP_POS = [-3.2, 0, 3.2];
function shellPlan() {
  const pos = [0, 1, 2]; // cup id -> slot index
  const moves: { arm: "a" | "b"; id: number; from: number; to: number }[] = [];
  const swap = (arm: "a" | "b", s1: number, s2: number) => {
    const c1 = pos.indexOf(s1);
    const c2 = pos.indexOf(s2);
    moves.push({ arm, id: c1, from: s1, to: 3 }, { arm, id: c2, from: s2, to: s1 }, { arm, id: c1, from: 3, to: s2 });
    pos[c1] = s2;
    pos[c2] = s1;
  };
  swap("a", 0, 1);
  swap("b", 1, 2);
  return { moves, finalSlotOfBallCup: pos[1] };
}
const SHELL = shellPlan();
const slotXZ = (s: number): [number, number] => (s === 3 ? [0, -9] : [CUP_POS[s], -3]);
const shellgame: Scenario = {
  id: "shellgame",
  title: "Shell-Game Hustler",
  emoji: "🎩",
  category: "Games & Magic",
  tagline: "Shuffles cups, then reveals the ball",
  story: "A ball hides under the middle cup. Both arms swap cups through a temporary slot, then the left arm lifts the winning cup.",
  novelty: "A magic trick as a memory + manipulation test: can the vision model still track the right cup?",
  difficulty: 3,
  arms: 2,
  hardware: ["3 identical opaque cups", "Small ball"],
  sensors: ["Camera to track which cup hides the ball (identity tracking)"],
  approach: "Track cup identities across swaps with a Kalman/Hungarian tracker; reveal the tracked cup.",
  howTo: ["Mark cups with hidden AprilTags on the top.", "Swap via a temp slot so one arm never holds two cups.", "Run the tracker through the swaps.", "Lift the cup above the predicted ball."],
  code: `slot = {0:c0, 1:c1, 2:c2}\nfor a, b in shuffles:\n    swap(a, b, via=TEMP); slot[a], slot[b] = slot[b], slot[a]\nreveal(slot_of_ball)`,
  keywords: ["shell", "cup game", "magic", "trick", "hide", "guess", "memory"],
  prompt: "Shuffle the cups and show me where the ball is",
  needs: { precision: 0.5, contact: 0.2, horizon: 0.8, speed: 0.7, generalize: 0.4 },
  theme: "stage",
  fixtures: [],
  objects: [
    { id: "ball", shape: "sphere", pos: [0, 1, -3], size: [2, 2, 2], color: 0xef4444, fixed: true },
    can("cup0", CUP_POS[0], -3, 0x7c3aed, 3.4, 4.2),
    can("cup1", CUP_POS[1], -3, 0x7c3aed, 3.4, 4.2),
    can("cup2", CUP_POS[2], -3, 0x7c3aed, 3.4, 4.2),
  ],
  anims: {
    vanish: [{ obj: "ball", delay: 0.2, dur: 0.1, to: { scale: 0.01 } }],
    hide: [{ obj: "ball", delay: 0, dur: 0.1, to: { scale: 1, pos: [CUP_POS[SHELL.finalSlotOfBallCup], 1, -3] } }],
  },
  program: () => {
    const A: Step[] = [{ ...say("a", "Watch the cup with the ball…"), fire: "vanish" }];
    const B: Step[] = [wait("b", 0.3)];
    SHELL.moves.forEach((m, k) => {
      const [fx, fz] = slotXZ(m.from);
      const [tx, tz] = slotXZ(m.to);
      turn(A, B, m.arm, [...pick(m.arm, "cup" + m.id, fx, fz, { y: 2.3, grip: 0.4, h: 5 }), ...place(m.arm, tx, tz, { y: 2.3, h: 5 })], "w" + k);
    });
    A.push(sync("a", "rev"), ...pick("a", "cup" + 1, CUP_POS[SHELL.finalSlotOfBallCup], -3, { y: 2.3, grip: 0.4, h: 7 }).slice(0, 2));
    B.push(sync("b", "rev"));
    A.push({ arm: "a", dur: 0.05, grab: "cup1", grip: 0.4, fire: "hide" } as Step);
    A.push(mv("a", [CUP_POS[SHELL.finalSlotOfBallCup] - 2, 11, -3], 0.7, { pitch: -90 }), say("a", "Here it is! 🎩"), wait("a", 1.4), home("a"));
    B.push(home("b"));
    return { a: A, b: B };
  },
};

export const homeCare: Scenario[] = [sorter, pills, barista, plant, pageBook];
export const games: Scenario[] = [connect4, dominoes, cupstack, goalkeeper, shellgame];
export { cyl };
