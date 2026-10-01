import type { Scenario, Phase, PropSpec, FixtureSpec, LiveOut } from '../sim/types';
import { P, par, wait, pickPlace, strike, fbox, fcyl, cube, bin, A_BASE } from './dsl';

type V3 = [number, number, number];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ------------------------------------------------------------------ SORTER */
function sorterScenario(): Scenario {
  const binA: [number, number] = [-26, 0];
  const binB: [number, number] = [26, 0];
  const props: PropSpec[] = [
    { id: 'paper', shape: 'sphere', size: [1.5], pos: [-8, 1.5, -3], color: 0xf1f3f5, rough: 0.9 },
    { id: 'banana', shape: 'box', size: [3.2, 1.2, 1.4], pos: [-5, 0.6, 1], color: 0xfcc419, rough: 0.7 },
    { id: 'apple', shape: 'sphere', size: [1.5], pos: [-2, 1.5, -1], color: 0xe03131, rough: 0.4 },
    { id: 'can', shape: 'cyl', size: [1.4, 4], pos: [2, 2, -3], color: 0xadb5bd, metal: 0.8, rough: 0.3 },
    { id: 'bottle', shape: 'cyl', size: [1.3, 5], pos: [5, 2.5, 1], color: 0x4dabf7, opacity: 0.85, rough: 0.2 },
    { id: 'nut', shape: 'box', size: [2.8, 2.8, 2.8], pos: [8, 1.4, -1], color: 0xced4da, metal: 0.9, rough: 0.25 },
  ];
  const drop = (half: number) => 0.4 + half + 1.4;
  const A: Phase[] = [
    ...pickPlace('a', [-8, -3], binA, { fh: 1.6, th: drop(1.5), safe: 9, speed: 0.7, say: '♻️ Sorting by material: organic / paper left, plastic / metal right' }),
    ...pickPlace('a', [-5, 1], binA, { fh: 0.7, th: drop(0.6), safe: 9, speed: 0.7 }),
    ...pickPlace('a', [-2, -1], binA, { fh: 1.6, th: drop(1.5), safe: 9, speed: 0.7 }),
  ];
  const B: Phase[] = [
    ...pickPlace('b', [2, -3], binB, { fh: 2.1, th: drop(2), safe: 9, speed: 0.7 }),
    ...pickPlace('b', [5, 1], binB, { fh: 2.6, th: drop(2.5), safe: 9, speed: 0.7 }),
    ...pickPlace('b', [8, -1], binB, { fh: 1.5, th: drop(1.4), safe: 9, speed: 0.7 }),
  ];
  return {
    id: 'sorter',
    title: 'Recycling Sorter',
    emoji: '♻️',
    category: 'Industry & Testing',
    tagline: 'Vision-guided waste sorting, two arms',
    story: 'Mixed objects lie on the table. One arm clears everything organic or paper into the left bin; the other sends plastic and metal to the right bin.',
    novelty: 'A tiny recycling plant: combine a classifier with manipulation to let the robot decide which bin each item goes to.',
    difficulty: 2,
    arms: 2,
    hardware: ['Overhead camera', 'Two bins', 'Soft pads for varied shapes', 'Optional: inductive sensor to detect metal'],
    approach: 'Detector (YOLO / CLIP) → class → scripted pick & place. Train an ACT policy for tricky objects.',
    howTo: [
      'Run a detector on the overhead image; convert pixel centres to table coordinates with a homography.',
      'Map class → bin; assign each object to the arm that can reach its bin.',
      'Grasp with a top-down approach; adjust gripper width from the bounding box.',
      'Count successes to tune the pick height and grip force.',
    ],
    code: `for det in detector(camera.read()):
    bin = BIN_FOR[det.label]               # "can" -> right, "apple" -> left
    arm = left if bin == "left" else right
    arm.pick_place(px_to_table(det.center), BIN_POSE[bin])`,
    theme: 'lab',
    props,
    fixtures: [...bin(binA[0], binA[1], 8, 8, 4, 0x2f9e44, '🍃 Organic / paper'), ...bin(binB[0], binB[1], 8, 8, 4, 0x1c7ed6, '🥫 Plastic / metal')],
    program: { kind: 'phases', phases: [...par(A, B), wait(0.5)], loop: true },
  };
}

/* ------------------------------------------------------------------ TOWER RACE */
function towerScenario(): Scenario {
  const props: PropSpec[] = [];
  const srcA: [number, number][] = [[-24, -6], [-24, -2], [-24, 2], [-20, 3], [-16, 4]];
  const A: Phase[] = [];
  const B: Phase[] = [];
  srcA.forEach((s, k) => {
    const sb: [number, number] = [-s[0], s[1]];
    props.push(cube(`ta${k}`, s[0], s[1], 0xf59e0b));
    props.push(cube(`tb${k}`, sb[0], sb[1], 0x22d3ee));
    const ts = 6.5 + 3 * k;
    A.push(...pickPlace('a', s, [-6, -1], { fh: 1.5, th: 1.6 + 3 * k, safe: 8, toSafe: ts, speed: 0.7, say: k === 0 ? '🏗️ Tower race: first to stack five cubes wins' : undefined }));
    B.push(...pickPlace('b', sb, [6, -1], { fh: 1.5, th: 1.6 + 3 * k, safe: 8, toSafe: ts, speed: 0.7 }));
  });
  return {
    id: 'tower',
    title: 'Tower Race',
    emoji: '🏗️',
    category: 'Games & Play',
    tagline: 'Dual-arm stacking competition',
    story: 'Both arms stack five cubes into towers. Tower height grows, so the approach height is raised with every cube – the classic test for precise z-control and repeatable grasps.',
    novelty: 'A quick benchmark to compare policies: cubes stacked per minute, with a head-to-head mode for hackathon demos.',
    difficulty: 1,
    arms: 2,
    hardware: ['5 cubes per arm (3 cm)', 'High-friction finger pads', 'Optional: AprilTags on the cubes'],
    approach: 'Great first ACT task: record 50 demos of “stack the cube on the tower”.',
    howTo: [
      'Place cubes in slightly different spots for each demo to generalise.',
      'Record 50 episodes with lerobot-record and train ACT.',
      'Evaluate by counting cubes stacked in 60 s; try dual-arm for a head-to-head race.',
      'Add a wrist camera to improve alignment on tall towers.',
    ],
    code: `# dataset task string – one policy handles any tower height
--dataset.single_task="Pick the cube and place it on top of the tower"
--dataset.num_episodes=50
# evaluate: count successes in 60 s`,
    theme: 'lab',
    props,
    fixtures: [fbox(-6, 0.02, -1, 6, 0.04, 6, 0x495057, { support: false, label: 'Tower A' }), fbox(6, 0.02, -1, 6, 0.04, 6, 0x495057, { support: false, label: 'Tower B' })],
    program: { kind: 'phases', phases: [...par(A, B), wait(0.8)], loop: true },
  };
}

/* ------------------------------------------------------------------ HANDOVER */
function handoverScenario(): Scenario {
  const src: [number, number][] = [[-22, -4], [-20, 1], [-16, 3]];
  const colors = [0xff6b6b, 0x69db7c, 0x4dabf7];
  const binPos: [number, number] = [22, -1];
  const props: PropSpec[] = src.map((s, i) => cube(`h${i}`, s[0], s[1], colors[i]));
  const HA: V3 = [-1.4, 9, 1];
  const HB: V3 = [1.4, 9, 1];
  const phases: Phase[] = [];
  src.forEach((s, i) => {
    phases.push(
      P('a', 0.75, { p: [s[0], 9, s[1]], pitch: -90, grip: 1 }, i === 0 ? '🤝 Relay: left arm passes each cube to the right arm mid-air' : undefined),
      P('a', 0.45, { p: [s[0], 1.5, s[1]] }),
      P('a', 0.3, { grip: 0 }),
      P('a', 0.45, { p: [s[0], 9, s[1]] }),
      ...par([P('a', 0.95, { p: HA, pitch: -55 })], [P('b', 0.95, { p: HB, pitch: -55, grip: 1 })]),
      P('b', 0.4, { grip: 0 }),
      ...par([P('a', 0.3, { grip: 1 })], [P('b', 0.3, { p: [HB[0] + 0.5, 9.5, HB[2]] })]),
      ...par([P('a', 0.6, { p: [-6, 12, -3], pitch: -50 })], [P('b', 0.9, { p: [binPos[0], 9, binPos[1]], pitch: -90 })]),
      P('b', 0.45, { p: [binPos[0], 3.3, binPos[1]] }),
      P('b', 0.3, { grip: 1 }),
      P('b', 0.35, { p: [binPos[0], 9, binPos[1]] }),
    );
  });
  phases.push(...par([P('a', 0.8, { p: [-5, 14, -3], pitch: -35, grip: 0.5 })], [P('b', 0.8, { p: [5, 14, -3], pitch: -35, grip: 0.5 })]), wait(0.8));
  return {
    id: 'handover',
    title: 'Mid-Air Handover Relay',
    emoji: '🤝',
    category: 'Industry & Testing',
    tagline: 'Arm-to-arm object transfer',
    story: 'The left arm fetches cubes and meets the right arm in the middle; the right arm closes, the left lets go, and the cube is delivered to a far bin neither arm could reach alone.',
    novelty: 'Extends the workspace by chaining arms – the basis for factory cells where robots pass parts down a line.',
    difficulty: 3,
    arms: 2,
    hardware: ['Two calibrated arms rigidly clamped to the same table', 'Wrist cameras to align the exchange', 'Gripper load read-back to detect a secure grasp'],
    approach: 'Fixed handover pose + handshake: receiver closes → checks load → giver opens.',
    howTo: [
      'Calibrate both arms into one shared world frame (measure the base-to-base transform).',
      'Define a handover point reachable by both and approach from different sides.',
      'Handshake: receiver closes, reads gripper load; only if load > threshold does the giver open.',
      'Add a retry if the receiver misses.',
    ],
    code: `right.close(); time.sleep(0.3)
if right.get_observation()["gripper.load"] > LOAD_OK:    # secure grasp?
    left.open()
else:
    right.open(); retry()`,
    theme: 'lab',
    props,
    fixtures: bin(binPos[0], binPos[1], 8, 8, 4, 0x5c7cfa, '📦 Delivered'),
    program: { kind: 'phases', phases, loop: true },
  };
}

/* ------------------------------------------------------------------ MOSAIC */
function mosaicScenario(): Scenario {
  const cell = (r: number, c: number): [number, number] => [(c - 2) * 3.2, 1 + (r - 1.5) * 3.2];
  const cellsA: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1], [2, 2], [3, 2]];
  const cellsB: [number, number][] = [[0, 3], [1, 3], [1, 4], [2, 3]];
  const srcA: [number, number][] = [[-23, -6], [-23, -3], [-23, 0], [-23, 3], [-19, -6], [-19, -3], [-19, 0]];
  const srcB: [number, number][] = [[23, -6], [23, -3], [23, 0], [23, 3]];
  const props: PropSpec[] = [];
  const A: Phase[] = [];
  const B: Phase[] = [];
  const tile = (id: string, p: [number, number], color: number): PropSpec => ({ id, shape: 'box', size: [2.8, 0.6, 2.8], pos: [p[0], 0.3, p[1]], color, rough: 0.35 });
  cellsA.forEach((c, i) => {
    props.push(tile(`ma${i}`, srcA[i], 0xf59e0b));
    A.push(...pickPlace('a', srcA[i], cell(c[0], c[1]), { fh: 0.45, th: 0.95, safe: 6, speed: 0.6, say: i === 0 ? '🧩 Pixel-art heart: left arm = amber tiles, right arm = cyan tiles' : undefined }));
  });
  cellsB.forEach((c, i) => {
    props.push(tile(`mb${i}`, srcB[i], 0x22d3ee));
    B.push(...pickPlace('b', srcB[i], cell(c[0], c[1]), { fh: 0.45, th: 0.95, safe: 6, speed: 0.6 }));
  });
  return {
    id: 'mosaic',
    title: 'Pixel-Art Mosaic',
    emoji: '🧩',
    category: 'Music & Art',
    tagline: 'Build images from tiles, pixel by pixel',
    story: 'Two arms assemble a heart-shaped mosaic. Each arm places the tiles on its side of the board – one in amber, one in cyan.',
    novelty: 'Turn any image into a physical mosaic: downsample → palette → plan tile placements for both arms.',
    difficulty: 2,
    arms: 2,
    hardware: ['Flat square tiles (Lego plates / wooden tiles)', 'Backing board with studs or a printed grid', 'Camera to verify final image'],
    approach: 'Image → pixel grid → assign each tile to the closer arm → scripted pick & place with tile feeders.',
    howTo: [
      'Downscale a photo to 8×8 and quantise to your tile colours.',
      'Arrange feeder rows by colour; each arm takes tiles from its own side.',
      'Press tiles down gently – use a slightly lower z and let compliance seat them.',
      'Finish with a camera snapshot compared to the target (SSIM).',
    ],
    code: `grid = quantize(resize(image, (8, 8)), PALETTE)
for (r, c), colour in np.ndenumerate(grid):
    arm = left if c < 4 else right
    arm.pick_place(FEEDER[colour].next(), BOARD[r][c])`,
    theme: 'lab',
    props,
    fixtures: [fbox(0, 0.25, 1, 20, 0.5, 16, 0x343a40, { label: 'Pixel board' })],
    program: { kind: 'phases', phases: [...par(A, B), wait(1)], loop: true },
  };
}

/* ------------------------------------------------------------------ QA TESTER */
function qaScenario(): Scenario {
  const fixtures: FixtureSpec[] = [];
  const keyPos = (cx: number, d: string): [number, number] => {
    if (d === '0') return [cx, 1 + 3 * 2.3];
    if (d === '#') return [cx + 2.3, 1 + 3 * 2.3];
    const n = parseInt(d, 10) - 1;
    return [cx + ((n % 3) - 1) * 2.3, 1 + Math.floor(n / 3) * 2.3];
  };
  const layout = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  for (const [cx, name] of [[-8, 'Phone A'], [8, 'Phone B']] as [number, string][]) {
    fixtures.push(fbox(cx, 0.4, 1.5, 8.4, 0.8, 17, 0x212529, { label: name, support: false }));
    layout.forEach((d) => {
      const [x, z] = keyPos(cx, d);
      const isEnter = d === '#';
      fixtures.push(
        fcyl(x, 1.05, z, 0.85, 0.5, 0xdee2e6, {
          label: d,
          support: false,
          trigger: isEnter
            ? { r: 0.9, flash: 0x51cf66, latch: true, sound: { type: 'chime', freq: 880 }, text: `✅ ${name} unlocked`, depress: 0.25 }
            : { r: 0.9, flash: 0x74c0fc, sound: { type: 'click', freq: 800 + (parseInt(d, 10) || 0) * 50 }, depress: 0.25 },
          children: isEnter ? [{ shape: 'box', size: [6, 0.1, 3.4], pos: [cx - x, 0.85 - 1.05, -4.5 - z], color: 0x1c2b4a }] : undefined,
        }),
      );
    });
  }
  const pinA = ['1', '3', '3', '7', '#'];
  const pinB = ['4', '2', '0', '8', '#'];
  const A: Phase[] = [];
  const B: Phase[] = [];
  pinA.forEach((d, i) => {
    const [x, z] = keyPos(-8, d);
    A.push(...strike('a', x, z, 1.45, 4.2, [0.32, 0.1, 0.12]), wait(0.12));
    const [x2, z2] = keyPos(8, pinB[i]);
    B.push(...strike('b', x2, z2, 1.45, 4.2, [0.32, 0.1, 0.12]), wait(0.12));
  });
  A[0].say = '📱 Device farm: both arms tap PIN codes on two phones at once';
  return {
    id: 'qa',
    title: 'Phone-Keypad QA Tester',
    emoji: '📱',
    category: 'Industry & Testing',
    tagline: 'Automated UI testing with real fingers',
    story: 'Each arm taps a PIN on a physical keypad and confirms with “#”. Keys flash and click on contact; on the final key the phone screen lights up.',
    novelty: 'Hardware-in-the-loop testing for devices that have no API – smart locks, ATMs, handhelds, car infotainment.',
    difficulty: 1,
    arms: 2,
    hardware: ['Capacitive stylus tip on the fixed jaw for touchscreens', 'Phone holder at a fixed pose', 'Camera pointed at the screen for OCR verification'],
    approach: 'Scripted taps from a calibrated key map; OCR the display to verify the result.',
    howTo: [
      'Calibrate by touching two corner keys and interpolating the remaining key positions.',
      'Tap with hover → press → release; limit force by stopping at a fixed z.',
      'Verify with OCR (Tesseract) on the camera image and log pass/fail with a screenshot.',
      'Run a test matrix overnight – every firmware build, every device.',
    ],
    code: `KEYMAP = calibrate_from_corners(c1, c3, c0)
for digit in "1337#":
    tap(KEYMAP[digit])
assert "Welcome" in ocr(camera.read())`,
    theme: 'lab',
    fixtures,
    program: { kind: 'phases', phases: [...par(A, B), wait(1)], loop: true },
  };
}

/* ------------------------------------------------------------------ SMART HOME */
function homeScenario(): Scenario {
  interface Dev {
    x: number;
    label: string;
    color: number;
    sound: { type: 'click' | 'chime' | 'tone' | 'pop'; freq: number };
    text: string;
    child: FixtureSpec[];
  }
  const rel = (x: number, y: number, z: number, from: number): [number, number, number] => [x - from, y - 0.6, z - 2];
  const devs: Dev[] = [
    {
      x: -20,
      label: 'Lamp',
      color: 0xffe066,
      sound: { type: 'click', freq: 1200 },
      text: '💡 Lamp toggled',
      child: [
        fcyl(0, 0, 0, 1.5, 0.5, 0x495057, { pos: rel(-20, 0.25, -4, -20) }),
        fcyl(0, 0, 0, 0.2, 4, 0x868e96, { pos: rel(-20, 2.4, -4, -20) }),
        { shape: 'cone', size: [2.2, 2.4], pos: rel(-20, 5.2, -4, -20), color: 0xfff3bf, rough: 0.6 },
      ],
    },
    {
      x: -8,
      label: 'Coffee',
      color: 0xff922b,
      sound: { type: 'chime', freq: 523 },
      text: '☕ Coffee machine toggled',
      child: [fbox(0, 0, 0, 5, 6, 4, 0x343a40, { pos: rel(-8, 3, -4, -8) }), fbox(0, 0, 0, 2.4, 0.3, 2.4, 0x868e96, { pos: rel(-8, 0.15, -1.2, -8) })],
    },
    {
      x: 8,
      label: 'Speaker',
      color: 0xf06595,
      sound: { type: 'tone', freq: 392 },
      text: '🔊 Speaker toggled',
      child: [fbox(0, 0, 0, 4, 6, 3.5, 0x212529, { pos: rel(8, 3, -4, 8) }), fcyl(0, 0, 0, 1.2, 0.2, 0x868e96, { pos: rel(8, 2, -2.2, 8), rot: [90, 0, 0] })],
    },
    {
      x: 20,
      label: 'Fan',
      color: 0x66d9e8,
      sound: { type: 'pop', freq: 500 },
      text: '🌀 Fan toggled',
      child: [fcyl(0, 0, 0, 2.2, 5, 0x495057, { pos: rel(20, 2.5, -4, 20) }), fcyl(0, 0, 0, 1.6, 0.3, 0x74c0fc, { pos: rel(20, 5.2, -4, 20) })],
    },
  ];
  const fixtures: FixtureSpec[] = devs.map((d) =>
    fcyl(d.x, 0.6, 2, 1.5, 1.2, 0xc92a2a, {
      label: d.label,
      support: false,
      trigger: { r: 1.1, flash: d.color, latch: true, sound: d.sound, text: d.text, depress: 0.3 },
      children: d.child as never,
    }),
  );
  const press = (arm: 'a' | 'b', x: number): Phase[] => [...strike(arm, x, 2, 1.45, 4.5, [0.5, 0.12, 0.15]), wait(0.6)];
  const A = [...press('a', -20), ...press('a', -8), ...press('a', -20)];
  const B = [...press('b', 8), ...press('b', 20), ...press('b', 8)];
  A[0].say = '🏠 Retrofitting a dumb home: arms press the physical buttons (toggle on / off)';
  return {
    id: 'home',
    title: 'Smart-Home Button Pusher',
    emoji: '🏠',
    category: 'Industry & Testing',
    tagline: 'Make any appliance “smart” without rewiring',
    story: 'Latching buttons switch a lamp, coffee machine, speaker and fan. Pressing twice toggles them off again. The arms follow a daily routine.',
    novelty: 'Retrofit automation: let an arm physically press the buttons of legacy appliances, controlled from Home Assistant.',
    difficulty: 1,
    arms: 2,
    hardware: ['Appliance on a fixed jig', 'Soft silicone fingertip', 'MQTT / Home Assistant bridge', 'Optional: current sensor to confirm “on”'],
    approach: 'Scripted presses triggered over MQTT / HTTP, with state feedback from a smart plug or camera.',
    howTo: [
      'Mount each appliance in a repeatable jig and record its button pose.',
      'Subscribe the Python script to an MQTT topic (home/coffee/set).',
      'Press with a fixed depth; confirm state with a power-monitoring smart plug.',
      'Add a voice assistant: “Hey robot, make coffee”.',
    ],
    code: `client.subscribe("home/+/set")
def on_message(c, u, msg):
    appliance = msg.topic.split("/")[1]
    press(BUTTON_POSE[appliance])
    wait_for_power(appliance, state=msg.payload == b"ON")`,
    theme: 'warm',
    fixtures,
    program: { kind: 'phases', phases: [...par(A, B), wait(0.8)], loop: true },
  };
}

/* ------------------------------------------------------------------ TRACKER */
const TRACK_H = 8;
function constrain(base: V3, x: number, z: number): [number, number] {
  const dx = x - base[0];
  const dz = z - base[2];
  const r = Math.hypot(dx, dz) || 1;
  const rr = clamp(r, 9, 21);
  return [base[0] + (dx / r) * rr, base[2] + (dz / r) * rr];
}
const tracker: Scenario = {
  id: 'tracker',
  title: 'Eye-in-Hand Object Tracker',
  emoji: '🎯',
  category: 'Space & Research',
  tagline: 'Visual servoing – move your mouse, the arms follow',
  story: 'A ball glides around the table (or follows your mouse pointer!). The left arm keeps its wrist camera centred above it while the right arm mirrors a second ball. The red ray is the camera’s line of sight.',
  novelty: 'Closed-loop visual servoing: the arm continuously re-plans from camera feedback instead of replaying a script.',
  difficulty: 2,
  arms: 2,
  hardware: ['Wrist camera on the SO-101 mount', 'Brightly coloured ball', 'Optional: Kalman filter for smooth tracking'],
  approach: 'Colour/YOLO detector → pixel error → proportional joint velocity (IBVS).',
  howTo: [
    'Detect the target centroid in the wrist-camera image each frame.',
    'Compute error = (cx − W/2, cy − H/2); map to shoulder_pan and wrist_flex increments with a P-gain.',
    'Limit joint speed and add a dead-band to avoid jitter.',
    'Extend: grasp the ball when the error is below a threshold and the target is centred.',
  ],
  code: `err_x = (cx - W/2) / W;  err_y = (cy - H/2) / H
obs = robot.get_observation()
move(shoulder_pan=obs["shoulder_pan.pos"] - KP*err_x,
     wrist_flex=obs["wrist_flex.pos"] + KP*err_y)`,
  theme: 'lab',
  laser: 0,
  usesPointer: true,
  props: [
    {
      id: 'ball1',
      shape: 'sphere',
      size: [1.4],
      pos: [-8, 1.4, -1],
      color: 0xf59e0b,
      emissive: 0x7a4300,
      grab: false,
      motion: (t, ctx, cur) => {
        let tx = -8 + 9 * Math.sin(0.8 * t);
        let tz = -1 + 6 * Math.sin(1.3 * t + 0.5);
        if (ctx.pointer) {
          tx = ctx.pointer[0];
          tz = ctx.pointer[2];
        }
        const [cx, cz] = constrain(A_BASE, tx, tz);
        const k = 1 - Math.exp(-ctx.dt * 7);
        return [lerp(cur[0], cx, k), 1.4, lerp(cur[2], cz, k)];
      },
    },
    {
      id: 'ball2',
      shape: 'sphere',
      size: [1.4],
      pos: [8, 1.4, -1],
      color: 0x22d3ee,
      emissive: 0x0b4a57,
      grab: false,
      motion: (_t, ctx) => {
        const b1 = ctx.prop('ball1');
        if (!b1) return [8, 1.4, -1];
        return [-b1[0], 1.4, b1[2]];
      },
    },
  ],
  program: {
    kind: 'live',
    fn: (ctx): LiveOut => {
      const b1 = ctx.prop('ball1') ?? [-8, 1.4, -1];
      const b2 = ctx.prop('ball2') ?? [8, 1.4, -1];
      return {
        a: { p: [b1[0], TRACK_H, b1[2]], pitch: -90, grip: 0.6 },
        b: { p: [b2[0], TRACK_H, b2[2]], pitch: -90, grip: 0.6 },
        say: '🎯 Tracking – hover your mouse over the table to steer the target',
      };
    },
  },
};

/* ------------------------------------------------------------------ SATELLITE */
function satScenario(): Scenario {
  const C: V3 = [-4, 9, 2];
  const D: V3 = [-17.5, 9, 3];
  const S0: V3 = [16, 21, 10];
  const phases: Phase[] = [
    P('a', 4.4, { p: [C[0], C[1] + 3.6, C[2]], pitch: -90, grip: 1 }, '🛰️ Zero-g: tracking an incoming satellite…'),
    P('a', 0.7, { p: C }),
    P('a', 0.4, { grip: 0 }, '🤏 Soft-capture!'),
    P('a', 1.9, { p: D }, 'Docking the satellite to the station'),
    P('a', 0.5, { grip: 1 }),
    P('a', 0.9, { p: [-8, 13, 0], pitch: -45 }),
    P('b', 0.9, { p: [18, 12, 0], pitch: -90, grip: 1 }, '🔧 Second arm positions a solar array'),
    P('b', 0.5, { p: [18, 8.2, 0] }),
    P('b', 0.3, { grip: 0 }),
    P('b', 1.7, { p: [6, 9, 3] }),
    P('b', 0.3, { grip: 1 }),
    P('b', 0.9, { p: [8, 14, -3], pitch: -35, grip: 0.5 }),
    wait(1.5),
  ];
  return {
    id: 'satellite',
    title: 'Orbital Satellite Servicing',
    emoji: '🛰️',
    category: 'Space & Research',
    tagline: 'Zero-gravity capture and docking',
    story: 'In a microgravity sandbox, a tumbling satellite drifts into reach. One arm tracks it, soft-captures it and docks it to the station; the second arm then installs a solar array.',
    novelty: 'Space-robotics research on a desk: zero-g object dynamics make “grab it before it floats away” a fun planning problem.',
    difficulty: 3,
    arms: 2,
    hardware: ['Lightweight foam “satellite” on a thread or air-bearing table', 'Compliant gripper pads', 'Camera for pose estimation'],
    approach: 'Pose estimation → intercept trajectory → soft-capture (compliant close) → dock. Train in sim, test with a hanging object.',
    howTo: [
      'Hang a foam satellite on a thin thread so it drifts and rotates slowly.',
      'Estimate its pose with an AprilTag; predict where it will be in 1 s.',
      'Approach along its spin axis; close with moderate speed to avoid bouncing it away.',
      'Dock with a funnel-shaped receptacle that tolerates 1 cm error.',
    ],
    code: `pose = tag_pose(camera.read())
intercept = pose.position + pose.velocity * T_INTERCEPT
move_to(intercept + [0, 0, 0.04])         # approach from above
close_gripper(speed="slow")               # compliant capture`,
    theme: 'space',
    gravity: 0,
    props: [
      {
        id: 'sat',
        shape: 'box',
        size: [3, 3, 3],
        pos: S0,
        color: 0xe5b94a,
        metal: 0.8,
        rough: 0.3,
        children: [
          { shape: 'box', size: [6, 0.15, 2.4], pos: [4.6, 0, 0], color: 0x3b5bdb, metal: 0.4, rough: 0.2 },
          { shape: 'box', size: [6, 0.15, 2.4], pos: [-4.6, 0, 0], color: 0x3b5bdb, metal: 0.4, rough: 0.2 },
          { shape: 'cyl', size: [0.15, 2.4], pos: [0, 2.6, 0], color: 0xdee2e6 },
        ],
        motion: (t, _ctx, _cur) => {
          const u = clamp(t / 4.5, 0, 1);
          const e = 1 - Math.pow(1 - u, 3);
          const w = (1 - u) * 1.6;
          return {
            p: [lerp(S0[0], C[0], e) + Math.sin(3 * t) * w, lerp(S0[1], C[1], e) + Math.cos(2.3 * t) * w, lerp(S0[2], C[2], e)],
            yaw: 6 * (1 - u) * (1 - u),
          };
        },
      },
      { id: 'array', shape: 'box', size: [5, 0.3, 3.2], pos: [18, 8, 0], color: 0x4c6ef5, metal: 0.5, rough: 0.2 },
    ],
    fixtures: [
      fbox(-22.5, 9, 3, 5, 6, 6, 0x868e96, { support: false, label: '🛰 Station', metal: 0.6 }),
      { shape: 'torus', size: [2.2, 0.3], pos: [-19.6, 9, 3], rot: [0, 0, 90], color: 0x51cf66, emissive: 0x51cf66, support: false } as FixtureSpec,
      { shape: 'torus', size: [2.4, 0.3], pos: [6, 9, 3], rot: [0, 0, 90], color: 0x4dabf7, emissive: 0x4dabf7, support: false, label: 'Array mount' } as FixtureSpec,
    ],
    program: { kind: 'phases', phases, loop: true },
  };
}

/* ------------------------------------------------------------------ TELEOP + SANDBOX */
const teleop: Scenario = {
  id: 'teleop',
  title: 'Teleop Lab & Dataset Recorder',
  emoji: '🎮',
  category: 'Learn & Teleop',
  tagline: 'You are the leader arm. Record. Replay.',
  story: 'Drive the left arm (the “leader”) with the sliders or by clicking the table. The right arm (the “follower”) copies every joint angle with a ~0.2 s latency – exactly how LeRobot teleoperation works. Hit Record to capture an episode, then Replay to see a “policy” repeat it.',
  novelty: 'Practice the full imitation-learning loop – demonstrate, record, replay – before you touch the real hardware.',
  difficulty: 1,
  arms: 2,
  hardware: ['Leader + follower SO-101', 'Wrist camera + overhead camera for observations', 'A GPU (or free Colab) for training'],
  approach: 'lerobot-record → lerobot-train --policy.type=act → lerobot-record --policy.path=…',
  howTo: [
    'Calibrate leader and follower with the SAME joint conventions (lerobot-calibrate).',
    'Record 50 episodes of one task; keep demos consistent and smooth.',
    'Train ACT for ~100k steps; evaluate by running the policy and counting successes.',
    'Iterate: add episodes where the policy failed (“DAgger-style” data).',
  ],
  code: `lerobot-record \\
  --robot.type=so101_follower --robot.port=/dev/ttyACM0 --robot.id=follower \\
  --teleop.type=so101_leader  --teleop.port=/dev/ttyACM1 --teleop.id=leader \\
  --dataset.repo_id=$HF_USER/pick_cube --dataset.num_episodes=50 \\
  --dataset.single_task="Pick up the cube"`,
  theme: 'lab',
  mirror: true,
  props: [
    cube('l0', -18, -3, 0xff6b6b),
    cube('l1', -14, 1, 0x69db7c),
    cube('l2', -20, 2, 0x4dabf7),
    cube('f0', 6, -3, 0xff6b6b),
    cube('f1', 10, 1, 0x69db7c),
    cube('f2', 4, 2, 0x4dabf7),
  ],
  fixtures: [...bin(-8, 5, 7, 7, 3.5, 0x748ffc, 'Leader bin'), ...bin(16, 5, 7, 7, 3.5, 0x748ffc, 'Follower bin')],
  program: { kind: 'manual' },
};

const sandbox: Scenario = {
  id: 'sandbox',
  title: 'Free-Play Sandbox',
  emoji: '🧰',
  category: 'Learn & Teleop',
  tagline: 'Two arms, a table, no script',
  story: 'Take full control of either arm: use inverse-kinematics sliders (XYZ + tool pitch), raw joint sliders, or click on the table to move the gripper. Pick up the objects and get a feel for the workspace and reach limits before you design your own use case.',
  novelty: 'Understand the arm’s workspace: where it can reach, which wrist angles are possible and how the gripper behaves.',
  difficulty: 1,
  arms: 2,
  hardware: ['Nothing needed – just your intuition'],
  approach: 'Manual control.',
  howTo: ['Click the table to move the selected arm there.', 'Use Height + Pitch to approach objects from above.', 'Close the gripper (0) near an object to grab it, open (1) to release.', 'Watch the “reach” indicator – red means the target is outside the workspace.'],
  code: `obs = robot.get_observation()      # read the 6 joint positions
print({k: round(v, 1) for k, v in obs.items()})`,
  theme: 'lab',
  props: [
    cube('c0', -16, -2, 0xff6b6b),
    cube('c1', -8, 1, 0xfcc419),
    cube('c2', 0, -2, 0x69db7c),
    cube('c3', 8, 1, 0x4dabf7),
    cube('c4', 16, -2, 0xda77f2),
    { id: 'b0', shape: 'sphere', size: [1.5], pos: [-3, 1.5, 4], color: 0xff922b },
    { id: 'b1', shape: 'cyl', size: [1.3, 4], pos: [4, 2, 5], color: 0x20c997 },
  ],
  fixtures: [...bin(0, 9, 10, 6, 3.5, 0x5c7cfa, 'Drop zone')],
  program: { kind: 'manual' },
};

export const industryScenarios: Scenario[] = [sorterScenario(), towerScenario(), handoverScenario(), mosaicScenario(), qaScenario(), homeScenario(), tracker, satScenario()];
export const labScenarios: Scenario[] = [teleop, sandbox];
