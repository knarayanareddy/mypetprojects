import type { Scenario, Phase, PropSpec, FixtureSpec } from '../sim/types';
import { P, par, wait, pickPlace, pour, total, fbox, fcyl, A_BASE } from './dsl';

type V3 = [number, number, number];

/* ------------------------------------------------------------------ PILLS */
const PILL_COLORS = [0xff6b6b, 0x4dabf7, 0xfcc419, 0x69db7c, 0xda77f2];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function pillScenario(): Scenario {
  const trayA = -12.4;
  const trayB = 12.4;
  const props: PropSpec[] = [];
  const fixtures: FixtureSpec[] = [];
  const slotA = (i: number): [number, number] => [trayA + (i - 2) * 3.6, 3];
  const slotB = (i: number): [number, number] => [trayB + (2 - i) * 3.6, 3];
  for (const [tx, name] of [[trayA, 'Morning'], [trayB, 'Evening']] as [number, string][]) {
    fixtures.push(fbox(tx, 0.4, 3, 19.2, 0.8, 5.4, 0xe9ecef, { label: `${name} tray` }));
    for (let i = 0; i <= 5; i++) fixtures.push(fbox(tx + (i - 2.5) * 3.6, 0.85, 3, 0.3, 1.7, 5.4, 0xdee2e6));
    for (let i = 0; i < 5; i++) {
      const x = tx === trayA ? slotA(i)[0] : slotB(i)[0];
      fixtures.push(fbox(x, 0.9, 6.6, 2.6, 0.12, 0.9, 0xced4da, { label: DAYS[i], support: false }));
    }
  }
  const phA: Phase[] = [];
  const phB: Phase[] = [];
  for (let i = 0; i < 5; i++) {
    const a: [number, number] = [-26 + i * 2, -4];
    const b: [number, number] = [26 - i * 2, -4];
    props.push({ id: `pa${i}`, shape: 'sphere', size: [0.9], pos: [a[0], 0.9, a[1]], color: PILL_COLORS[i], rough: 0.2 });
    props.push({ id: `pb${i}`, shape: 'sphere', size: [0.9], pos: [b[0], 0.9, b[1]], color: PILL_COLORS[4 - i], rough: 0.2 });
    phA.push(...pickPlace('a', a, slotA(i), { fh: 1.0, th: 1.9, safe: 6, speed: 0.6, say: i === 0 ? '💊 Both arms sort the week’s pills into the organiser' : undefined }));
    phB.push(...pickPlace('b', b, slotB(i), { fh: 1.0, th: 1.9, safe: 6, speed: 0.6 }));
  }
  return {
    id: 'pills',
    title: 'Pill-Organiser Assistant',
    emoji: '💊',
    category: 'Care & Assistive',
    tagline: 'Fills a weekly pill box, one day at a time',
    story: 'Small coloured pills are picked from a dispenser row and dropped into the weekday compartments of two trays – morning and evening – by two arms working in parallel.',
    novelty: 'An assistive-tech demo with tiny objects: precision, gentle grasping and “never drop it” reliability.',
    difficulty: 2,
    arms: 2,
    hardware: ['Pill organiser tray with fixed position', 'Soft TPU finger pads', 'Wrist camera to verify one pill per pick', 'Gripper load read-back'],
    approach: 'Scripted pick & place + closed-loop check using motor load (grasp = load rises) and camera.',
    howTo: [
      'Fix the organiser; record the pose above each compartment.',
      'Pick pills from a vibration feeder or a shallow dish; use the wrist camera to locate the pill.',
      'After closing, read the gripper position: if it closed fully, nothing was grasped → retry.',
      'Log every dose with a timestamp to a CSV for the caregiver.',
    ],
    code: `obs = robot.get_observation()
closed = obs["gripper.pos"] < 5           # fully closed = missed the pill
if closed: retry_pick()
else:      place_in(day_slot[i])`,
    theme: 'kitchen',
    props,
    fixtures,
    program: { kind: 'phases', phases: [...par(phA, phB), wait(0.5)], loop: true },
  };
}

/* ------------------------------------------------------------------ PAGES */
const PAGE_COLORS = [0xffe3e3, 0xfff3bf, 0xd3f9d8, 0xd0ebff];

function pageScenario(): Scenario {
  const xsA = -10;
  const xsB = 10;
  const z = -1.5;
  const props: PropSpec[] = [];
  const fixtures: FixtureSpec[] = [fbox(xsA, 0.4, z, 20, 0.8, 11, 0x7b4b2a, { label: 'Book 1' }), fbox(xsB, 0.4, z, 20, 0.8, 11, 0x1e5b8a, { label: 'Book 2 (reverse)' })];
  const yAt = (k: number) => 0.95 + 0.3 * k;
  const phA: Phase[] = [];
  const phB: Phase[] = [];
  for (let i = 0; i < 4; i++) {
    props.push({ id: `pgA${i}`, shape: 'box', size: [6.4, 0.3, 9], pos: [xsA + 4.6, yAt(i), z], color: PAGE_COLORS[i], rough: 0.9 });
    props.push({ id: `pgB${i}`, shape: 'box', size: [6.4, 0.3, 9], pos: [xsB - 4.6, yAt(i), z], color: PAGE_COLORS[3 - i], rough: 0.9 });
    const top = 3 - i;
    phA.push(
      ...pickPlace('a', [xsA + 4.6 + 2.6, z], [xsA - 4.6 + 2.6, z], {
        fh: yAt(top),
        th: yAt(i) + 0.05,
        safe: 7.5,
        speed: 0.7,
        say: i === 0 ? '📖 Turning pages for you – hands-free reading' : undefined,
      }),
    );
    phB.push(...pickPlaceB(xsB, z, top, i, yAt));
  }
  return {
    id: 'pages',
    title: 'Hands-Free Page Turner',
    emoji: '📖',
    category: 'Care & Assistive',
    tagline: 'Accessibility for readers and musicians',
    story: 'The arm lifts the top page by its edge, carries it over the spine and lays it on the other side. The second arm reads a book in reverse – turning pages from left to right.',
    novelty: 'Thin, deformable objects are hard! Great for people who cannot turn pages themselves, or sheet-music turners.',
    difficulty: 2,
    arms: 2,
    hardware: ['Light paper pages', 'Gripper with a thin high-friction lip', 'Optional: foot-pedal or voice trigger (“next page”)'],
    approach: 'Teleop-recorded demos + ACT policy (page edges vary), or a simple scripted edge pick.',
    howTo: [
      'Record 30 demos of turning one page with the leader arm, varying page thickness slightly.',
      'Train ACT; add a wrist camera so the policy can see the page edge.',
      'Trigger one policy rollout per “next page” command.',
      'Add a small air-puff or sticky-tape fingertip to separate pages.',
    ],
    code: `# next_page: trigger a trained policy once per command
policy = ACTPolicy.from_pretrained("my-user/page_turner")
def next_page():
    for _ in range(150):                       # ~5 s @ 30 fps
        obs = robot.get_observation(); robot.send_action(policy.select_action(obs))`,
    theme: 'warm',
    props,
    fixtures,
    program: { kind: 'phases', phases: [...par(phA, phB), wait(0.5)], loop: true },
  };
}

function pickPlaceB(xsB: number, z: number, top: number, i: number, yAt: (k: number) => number): Phase[] {
  // B turns pages from the left stack to the right stack
  return pickPlace('b', [xsB - 4.6 - 2.6, z], [xsB + 4.6 - 2.6, z], { fh: yAt(top), th: yAt(i) + 0.05, safe: 7.5, speed: 0.7 });
}

/* ------------------------------------------------------------------ CARDS */
function cardScenario(): Scenario {
  const props: PropSpec[] = [];
  const fixtures: FixtureSpec[] = [fbox(0, 0.01, 2, 56, 0.02, 14, 0x1f7a4c, { support: false })];
  const deckA: [number, number] = [-23, -3];
  const deckB: [number, number] = [23, -3];
  const spotsA: [number, number][] = [[-14, 4], [-6, 4], [2, 4]];
  const spotsB: [number, number][] = [[10, 4], [18, 4]];
  for (let i = 0; i < 8; i++) {
    for (const [pre, deck, colorBack] of [['ca', deckA, 0xf8f8f8], ['cb', deckB, 0xf8f8f8]] as [string, [number, number], number][]) {
      props.push({
        id: `${pre}${i}`,
        shape: 'box',
        size: [4.2, 0.12, 6],
        pos: [deck[0], 0.06 + i * 0.12, deck[1]],
        color: colorBack,
        rough: 0.5,
        children: [{ shape: 'box', size: [1.4, 0.02, 1.4], pos: [0, 0.07, 0], color: i % 2 ? 0xd32f2f : 0x212121 }],
      });
    }
  }
  const phA: Phase[] = [];
  const cnt = [0, 0, 0];
  for (let n = 0; n < 6; n++) {
    const s = n % 3;
    const k = cnt[s]++;
    const topIdx = 7 - n;
    const to: [number, number] = [spotsA[s][0] + 1.4 * k, spotsA[s][1] + 0.6 * k];
    phA.push(
      ...pickPlace('a', deckA, to, {
        fh: 0.06 + topIdx * 0.12 + 0.05,
        th: 0.06 + 0.12 * k + 0.1,
        safe: 5,
        speed: 0.55,
        toRoll: k ? 14 : -10,
        say: n === 0 ? '🃏 Two dealers – the table is dealt in round-robin' : undefined,
      }),
    );
  }
  const phB: Phase[] = [];
  const cb = [0, 0];
  for (let n = 0; n < 4; n++) {
    const s = n % 2;
    const k = cb[s]++;
    const topIdx = 7 - n;
    const to: [number, number] = [spotsB[s][0] + 1.4 * k, spotsB[s][1] + 0.6 * k];
    phB.push(...pickPlace('b', deckB, to, { fh: 0.06 + topIdx * 0.12 + 0.05, th: 0.06 + 0.12 * k + 0.1, safe: 5, speed: 0.55, toRoll: k ? -14 : 10 }));
  }
  [...spotsA, ...spotsB].forEach((s, i) => fixtures.push(fbox(s[0] + 0.6, 0.1, s[1] + 5.4, 6, 0.04, 1.2, 0x145a37, { label: `Player ${i + 1}`, support: false })));
  return {
    id: 'cards',
    title: 'Casino Card Dealer',
    emoji: '🃏',
    category: 'Games & Play',
    tagline: 'Deals a full table, two dealers at once',
    story: 'Each arm picks the top card from its deck – thin objects, grasped at the centre – and slides it to a player’s spot with a little twist so the cards fan out naturally.',
    novelty: 'Card handling needs sub-millimetre height control: a classic “fine manipulation” benchmark.',
    difficulty: 2,
    arms: 2,
    hardware: ['Plastic-coated cards', 'Rubber fingertip', 'Overhead camera to read card faces'],
    approach: 'Scripted deal or an ACT policy trained on “deal one card” demos.',
    howTo: [
      'Calibrate the deck height; every deal lowers the pick height by one card thickness.',
      'Use a small roll rotation on release to fan the cards.',
      'Detect empty decks with the gripper position – fully closed = no card.',
      'Add a vision model to read cards and enable blackjack logic.',
    ],
    code: `for n in range(6):
    z_pick = DECK_TOP - n*CARD_T                 # lower by one card per deal
    pick_place(DECK, SPOTS[n % 3], z_pick=z_pick, roll=14 if n >= 3 else -10)`,
    theme: 'stage',
    props,
    fixtures,
    program: { kind: 'phases', phases: [...par(phA, phB), wait(0.5)], loop: true },
  };
}

/* ------------------------------------------------------------------ LAB */
function labScenario(): Scenario {
  const rackX = [-23, -20, -17];
  const slotPos: [number, number][] = [0, 1, 2].map((i) => {
    const th = ((-90 + 120 * i) * Math.PI) / 180;
    return [-2 + 3 * Math.cos(th), 2 + 3 * Math.sin(th)] as [number, number];
  });
  const props: PropSpec[] = rackX.map((x, i) => ({
    id: `tube${i}`,
    shape: 'cyl' as const,
    size: [1.0, 7],
    pos: [x, 4.3, -4] as V3,
    color: 0xd0ebff,
    opacity: 0.5,
    rough: 0.1,
    children: [{ shape: 'cyl' as const, size: [0.85, 4], pos: [0, -1.5, 0] as V3, color: [0xff6b6b, 0x51cf66, 0xfcc419][i] }],
  }));
  const fixtures: FixtureSpec[] = [
    fbox(-20, 0.4, -2, 11, 0.8, 8, 0x4a5568, { label: 'Sample rack' }),
    fcyl(-2, 1.25, 2, 5.6, 2.5, 0x2f3b4c, { label: 'Centrifuge' }),
    ...slotPos.map((s) => fcyl(s[0], 2.52, s[1], 1.25, 0.06, 0x0b0f14, { support: false })),
    fcyl(10, 0.6, 1, 1.6, 1.2, 0xe03131, {
      label: 'START',
      trigger: { r: 1.1, flash: 0x51cf66, latch: true, sound: { type: 'chime', freq: 660 }, text: '🔬 Centrifuge spinning…', depress: 0.3 },
    }),
  ];
  const shake = (): Phase[] => {
    const out: Phase[] = [];
    for (let i = 0; i < 6; i++) out.push(P('a', 0.14, { pitch: i % 2 ? -108 : -72 }));
    out.push(P('a', 0.2, { pitch: -90 }));
    return out;
  };
  const load = (i: number): Phase[] => {
    const ph = pickPlace('a', [rackX[i], -4], slotPos[i], { fh: 5.0, th: 6.75, safe: 9, toSafe: 10, speed: 0.75, say: i === 0 ? '🧪 Loading sample tubes (with a vortex-mix on the way)' : undefined });
    ph.splice(4, 0, ...shake());
    return ph;
  };
  const phases: Phase[] = [...load(0), ...load(1), ...load(2)];
  phases.push(
    P('b', 0.8, { p: [10, 5, 1], pitch: -90, grip: 0 }, '🔴 Right arm presses START'),
    P('b', 0.25, { p: [10, 1.5, 1] }),
    P('b', 0.3, { p: [10, 5, 1] }),
    wait(2.6, '⏱ Spinning at 12 000 rpm…'),
    P('b', 0.8, { p: [10, 5, 1] }),
  );
  [0, 1, 2].forEach((i) => phases.push(...pickPlace('a', slotPos[i], [rackX[i], 0], { fh: 6.4, th: 5.0, safe: 10, fromSafe: 10, speed: 0.75, say: i === 0 ? '✅ Unloading to the finished row' : undefined })));
  phases.push(...par([P('a', 0.8, { p: [-5, 14, -3], pitch: -35, grip: 0.5 })], [P('b', 0.8, { p: [5, 14, -3], pitch: -35, grip: 0.5 })]));
  return {
    id: 'lab',
    title: 'Lab Sample Handler',
    emoji: '🧪',
    category: 'Lab & Kitchen',
    tagline: 'Vortex-mix, load the centrifuge, press START',
    story: 'One arm moves test tubes from a rack into a centrifuge (shaking each to mix), the other presses START. Afterwards the tubes are returned to a “finished” row.',
    novelty: 'Lab-automation on a student budget: tube handling, tilt-shake mixing, and arm-to-arm choreography.',
    difficulty: 3,
    arms: 2,
    hardware: ['Tube rack with consistent hole spacing', 'Tapered fingertips for cylindrical tubes', 'Optional: AprilTags on rack to correct for placement error'],
    approach: 'Scripted tube pick & place with AprilTag calibration; teleop-recorded “insert” skill for tight fits.',
    howTo: [
      'Mount AprilTags on the rack and centrifuge; use a wrist camera to measure their pose before each run.',
      'Grasp tubes 2/3 up so the arm clears neighbouring tubes.',
      'Vortex-mix with ±18° wrist_flex oscillations at 3 Hz.',
      'Interlock: the second arm only presses START after the first has confirmed all slots are filled.',
    ],
    code: `for _ in range(6):                           # vortex mix
    move(wrist_flex=base + 18); time.sleep(0.07)
    move(wrist_flex=base - 18); time.sleep(0.07)
if all(slot.filled for slot in centrifuge): right.press(START)`,
    theme: 'lab',
    props,
    fixtures,
    program: { kind: 'phases', phases, loop: true },
  };
}

/* ------------------------------------------------------------------ PLANT */
function plantScenario(): Scenario {
  const pot: [number, number] = [-1.5, -1];
  const can: [number, number] = [-20, 0];
  const dx = pot[0] - A_BASE[0];
  const dz = pot[1] - A_BASE[2];
  const l = Math.hypot(dx, dz);
  const tip: V3 = [pot[0] - (dx / l) * 2.2, 9.5, pot[1] - (dz / l) * 2.2];
  const seed: [number, number] = [20, 3];
  const sun: [number, number] = [10, 5];
  const phases: Phase[] = [
    ...pickPlace('b', seed, sun, { fh: 1.8, th: 1.7, safe: 7, speed: 0.8, say: '🌞 Right arm moves the seedling into the sunny spot' }),
    P('b', 0.8, { p: [8, 14, -3], pitch: -35, grip: 0.5 }),
    P('a', 0.8, { p: [can[0], 9, can[1]], pitch: -90, grip: 1 }, '🚿 Left arm fetches the watering can'),
    P('a', 0.45, { p: [can[0], 2.6, can[1]] }),
    P('a', 0.3, { grip: 0 }),
    P('a', 0.5, { p: [can[0], 10, can[1]] }),
    P('a', 1.0, { p: tip }),
    P('a', 0.7, { pitch: -35 }, 'Tilting the can…'),
    P('a', 2.4, { p: [tip[0] + (dx / l) * 0.5, 9.5, tip[2] + (dz / l) * 0.5] }, '💧 Watering the plant', { pour: pour('a', 0x4aa3ff, 4.2, 65) }),
    P('a', 0.7, { pitch: -90 }),
    P('a', 1.0, { p: [can[0], 10, can[1]] }),
    P('a', 0.45, { p: [can[0], 2.4, can[1]] }),
    P('a', 0.3, { grip: 1 }),
    P('a', 0.5, { p: [can[0], 9, can[1]] }),
    P('a', 0.8, { p: [-5, 14, -3], pitch: -35, grip: 0.5 }, '🌱 Plant care complete'),
  ];
  return {
    id: 'plant',
    title: 'Plant Caretaker',
    emoji: '🪴',
    category: 'Lab & Kitchen',
    tagline: 'Chases the sun, waters on schedule',
    story: 'One arm carries a seedling to the sunniest spot on the desk; the other picks up a watering can and tilts it over the big plant with a proper pouring stream.',
    novelty: 'Garden-bot: pouring by tilting the wrist, and relocating plants based on light-sensor readings.',
    difficulty: 2,
    arms: 2,
    hardware: ['Small watering can with a printed collar', 'Light sensor (BH1750) or camera for sun tracking', 'Soil-moisture sensor on I²C'],
    approach: 'Scripted pour with a sensor-triggered schedule; policy for reliable can grasping.',
    howTo: [
      'Read soil moisture over I²C; only water when it falls below a threshold.',
      'Pour for a fixed time at a fixed tilt – calibrate flow ml/s once.',
      'Compare lux readings at 3 spots on the desk and move the seedling to the highest.',
      'Log each action and publish via MQTT.',
    ],
    code: `if soil.moisture() < 0.3:
    pick(CAN); move_to(ABOVE_POT)
    for tilt in range(0, 55, 2): move(wrist_flex=base + tilt); time.sleep(0.04)
    time.sleep(ml_to_seconds(120)); untilt(); put_back(CAN)`,
    theme: 'warm',
    props: [
      {
        id: 'can',
        shape: 'cyl',
        size: [1.6, 3.6],
        pos: [can[0], 1.8, can[1]],
        color: 0x339af0,
        rough: 0.3,
        children: [{ shape: 'cyl', size: [0.35, 2.6], pos: [2.0, 0.7, 0], color: 0x339af0, rot: [0, 0, -62] }],
      },
      {
        id: 'seedling',
        shape: 'cyl',
        size: [1.5, 3],
        pos: [seed[0], 1.5, seed[1]],
        color: 0xc2693b,
        children: [{ shape: 'sphere', size: [1.4], pos: [0, 2.3, 0], color: 0x40c057, scale: [1, 1.1, 1] }],
      },
    ],
    fixtures: [
      fcyl(pot[0], 2, pot[1], 3.6, 4, 0xc2693b, { support: false }),
      fcyl(pot[0], 4.05, pot[1], 3.3, 0.2, 0x3b2a1e, { support: false }),
      fcyl(pot[0], 5.4, pot[1], 0.3, 3, 0x2f9e44, { support: false }),
      { shape: 'sphere', size: [2.5], pos: [pot[0], 7.6, pot[1]], color: 0x2f9e44, scale: [1.2, 1, 1.2], rough: 0.8, support: false } as FixtureSpec,
      { shape: 'sphere', size: [1.6], pos: [pot[0] + 1.8, 6.6, pot[1] + 0.8], color: 0x51cf66, rough: 0.8, support: false } as FixtureSpec,
      { shape: 'torus', size: [2.7, 0.25], pos: [sun[0], 0.3, sun[1]], color: 0xffd43b, emissive: 0xffd43b, support: false, label: '☀ sunny spot' } as FixtureSpec,
    ],
    program: { kind: 'phases', phases, loop: true },
  };
}

/* ------------------------------------------------------------------ BARTENDER */
function barScenario(): Scenario {
  const glass: [number, number] = [-2, 1];
  const shaker: [number, number] = [-20, 0];
  const cherry: [number, number] = [20, 2];
  const dx = glass[0] - A_BASE[0];
  const dz = glass[1] - A_BASE[2];
  const l = Math.hypot(dx, dz);
  const tip: V3 = [glass[0] - (dx / l) * 2.4, 12, glass[1] - (dz / l) * 2.4];
  const phases: Phase[] = [
    P('a', 0.8, { p: [shaker[0], 9, shaker[1]], pitch: -90, grip: 1 }, '🍹 Left arm grabs the shaker'),
    P('a', 0.45, { p: [shaker[0], 3.3, shaker[1]] }),
    P('a', 0.3, { grip: 0 }),
    P('a', 0.5, { p: [shaker[0] + 4, 11, shaker[1] + 3] }),
  ];
  const cx = shaker[0] + 4;
  const cz = shaker[1] + 3;
  phases[phases.length - 1].say = '🧊 Shake, shake, shake!';
  for (let i = 0; i < 8; i++) phases.push(P('a', 0.13, { p: [cx, i % 2 ? 9.5 : 12.5, cz], pitch: i % 2 ? -72 : -108 }));
  phases.push(P('a', 0.2, { p: [cx, 11, cz], pitch: -90 }));
  phases.push(P('a', 0.9, { p: tip }));
  phases.push(P('a', 0.6, { pitch: -30 }, 'Pouring…'));
  const tPour = total(phases);
  phases.push(P('a', 2.0, { p: [tip[0] + (dx / l) * 0.4, 12, tip[2] + (dz / l) * 0.4] }, undefined, { pour: pour('a', 0xff9a1f, 3.9, 80) }));
  phases.push(P('a', 0.6, { pitch: -90 }));
  phases.push(P('a', 0.9, { p: [shaker[0], 10, shaker[1]] }));
  phases.push(P('a', 0.45, { p: [shaker[0], 3.2, shaker[1]] }), P('a', 0.3, { grip: 1 }), P('a', 0.5, { p: [shaker[0], 9, shaker[1]] }));
  phases.push(P('a', 0.8, { p: [-5, 14, -3], pitch: -35, grip: 0.5 }));
  phases.push(...pickPlace('b', cherry, glass, { fh: 1.1, th: 4.95, safe: 9, toSafe: 9, speed: 0.8, say: '🍒 Right arm adds the garnish' }));
  phases.push(P('b', 0.8, { p: [5, 14, -3], pitch: -35, grip: 0.5 }, '🥂 Cheers!'), wait(1));
  return {
    id: 'bar',
    title: 'Cocktail Bartender',
    emoji: '🍹',
    category: 'Lab & Kitchen',
    tagline: 'Shake, pour, garnish',
    story: 'One arm shakes a cocktail shaker with a tilting wrist, pours a stream into the glass, and the second arm drops a cherry on top.',
    novelty: 'Dynamic motion (shaking) and liquid pouring – stress-tests your calibration and gripper strength.',
    difficulty: 3,
    arms: 2,
    hardware: ['Lightweight shaker (plastic)', 'Gripper-friendly collar on the shaker', 'Drip tray', 'Optional: scale under the glass to measure pour'],
    approach: 'Scripted dynamics + closed-loop pour using a load cell.',
    howTo: [
      'Shake along the line of the forearm so loads stay within motor torque limits.',
      'Slow down the final approach to the glass to avoid spills.',
      'With a kitchen scale on the I²C/USB bus, stop pouring at the target grams.',
      'Add safety: abort if gripper load spikes (jammed or dropped shaker).',
    ],
    code: `for i in range(8):                          # shake
    move(shoulder_lift=base + (14 if i % 2 else -14), wrist_flex=wf + (18 if i % 2 else -18))
    time.sleep(0.13)
while scale.grams() < TARGET: tilt_more(1)   # pour until the scale says stop`,
    theme: 'stage',
    props: [
      { id: 'shaker', shape: 'cyl', size: [1.6, 6], pos: [shaker[0], 3, shaker[1]], color: 0xb0bec5, metal: 0.9, rough: 0.2 },
      { id: 'cherry', shape: 'sphere', size: [1.0], pos: [cherry[0], 1.0, cherry[1]], color: 0xd6336c, rough: 0.2 },
    ],
    fixtures: [
      fcyl(glass[0], 0.1, glass[1], 4.2, 0.2, 0x212529, { support: false }),
      fcyl(glass[0], 2.5, glass[1], 2.6, 5, 0xbfe9ff, { opacity: 0.28, support: false, rough: 0.05 }),
      fcyl(glass[0], 1.95, glass[1], 2.35, 3.7, 0xff8c1a, { opacity: 0.85, showAfter: tPour + 0.9, rough: 0.1 }),
    ],
    program: { kind: 'phases', phases, loop: true },
  };
}

/* ------------------------------------------------------------------ BURGER */
function burgerScenario(): Scenario {
  const plate: [number, number] = [0, -1];
  interface It {
    id: string;
    shape: 'cyl' | 'box';
    size: number[];
    color: number;
    pos: [number, number];
    arm: 'a' | 'b';
    label?: string;
  }
  const items: It[] = [
    { id: 'bun', shape: 'cyl', size: [1.7, 1.4], color: 0xd9a066, pos: [-20, 0], arm: 'a' },
    { id: 'patty', shape: 'cyl', size: [1.6, 1.0], color: 0x5b3a29, pos: [20, 0], arm: 'b' },
    { id: 'cheese', shape: 'box', size: [3.0, 0.4, 3.0], color: 0xffd43b, pos: [-16, 2], arm: 'a' },
    { id: 'tomato', shape: 'cyl', size: [1.5, 0.5], color: 0xe03131, pos: [16, 2], arm: 'b' },
    { id: 'lettuce', shape: 'cyl', size: [1.7, 0.35], color: 0x51cf66, pos: [-20, 4], arm: 'a' },
    { id: 'top', shape: 'cyl', size: [1.7, 1.3], color: 0xe3a869, pos: [20, 4], arm: 'b' },
  ];
  const half = (it: It) => it.size[1] / 2;
  const props: PropSpec[] = items.map((it) => ({ id: it.id, shape: it.shape, size: it.size, color: it.color, pos: [it.pos[0], half(it), it.pos[1]] as V3, rough: 0.7 }));
  const phases: Phase[] = [];
  let y = 0.5;
  items.forEach((it, i) => {
    const h = it.size[1];
    const center = y + h / 2;
    y += h;
    const off = 0.25;
    phases.push(...pickPlace(it.arm, it.pos, plate, { fh: half(it) + off, th: center + off, safe: 8.5, toSafe: 9, speed: 0.75, say: i === 0 ? '🍔 Two arms assemble a burger, layer by layer' : undefined }));
  });
  phases.push(...par([P('a', 0.8, { p: [-5, 14, -3], pitch: -35, grip: 0.5 }, '🍔 Order up!')], [P('b', 0.8, { p: [5, 14, -3], pitch: -35, grip: 0.5 })]), wait(1));
  return {
    id: 'burger',
    title: 'Tiny Chef – Burger Assembly',
    emoji: '🍔',
    category: 'Lab & Kitchen',
    tagline: 'Layer by layer, in the right order',
    story: 'Mini ingredients are fetched alternately by the two arms and stacked on a plate: bun, patty, cheese, tomato, lettuce, top bun.',
    novelty: 'Long-horizon, order-dependent manipulation – a perfect showcase for task sequencing and error recovery.',
    difficulty: 2,
    arms: 2,
    hardware: ['Felt or foam “ingredients” (never real food on electronics!)', 'Plate with a camera view', 'Optional: speech input for custom orders'],
    approach: 'Scripted state machine with per-ingredient grasp heights; learned policy for deformable pieces.',
    howTo: [
      'Measure each ingredient’s thickness; the stack height accumulates.',
      'Use a state machine: ORDER → FETCH(i) → PLACE(i) → CHECK(camera).',
      'If a pick fails (gripper closes fully) retry up to 3×.',
      'Let a language model convert “no cheese please” into a task list.',
    ],
    code: `height = PLATE_TOP
for item in order:                            # ["bun","patty","cheese",...]
    pick(SOURCE[item], z=THICK[item]/2 + 0.003)
    place(PLATE_XY, z=height + THICK[item]/2 + 0.003)
    height += THICK[item]`,
    theme: 'kitchen',
    props,
    fixtures: [fcyl(plate[0], 0.25, plate[1], 5, 0.5, 0xffffff, { label: 'Plate' })],
    program: { kind: 'phases', phases, loop: true },
  };
}

/* ------------------------------------------------------------------ TIC TAC TOE */
function tttScenario(): Scenario {
  const cell = (r: number, c: number): [number, number] => [-4 + 4 * c, -5 + 4 * r];
  const stashX: [number, number][] = [[-23, -5], [-23, -1], [-23, 3]];
  const stashO: [number, number][] = [[23, -5], [23, -1]];
  const props: PropSpec[] = [];
  stashX.forEach((p, i) =>
    props.push({
      id: `x${i}`,
      shape: 'box',
      size: [2.6, 1.6, 2.6],
      pos: [p[0], 0.8, p[1]],
      color: 0xf59e0b,
      children: [
        { shape: 'box', size: [3.0, 0.1, 0.5], pos: [0, 0.85, 0], color: 0x1a1a1a, rot: [0, 45, 0] },
        { shape: 'box', size: [3.0, 0.1, 0.5], pos: [0, 0.85, 0], color: 0x1a1a1a, rot: [0, -45, 0] },
      ],
    }),
  );
  stashO.forEach((p, i) =>
    props.push({
      id: `o${i}`,
      shape: 'cyl',
      size: [1.3, 1.4],
      pos: [p[0], 0.7, p[1]],
      color: 0x22d3ee,
      children: [{ shape: 'cyl', size: [0.65, 0.04], pos: [0, 0.71, 0], color: 0x0b2a33 }],
    }),
  );
  const phases: Phase[] = [];
  const moves: ['a' | 'b', number, [number, number]][] = [
    ['a', 0, cell(1, 1)],
    ['b', 0, cell(0, 0)],
    ['a', 1, cell(0, 2)],
    ['b', 1, cell(0, 1)],
    ['a', 2, cell(2, 0)],
  ];
  moves.forEach(([arm, idx, to], k) => {
    const from = arm === 'a' ? stashX[idx] : stashO[idx];
    phases.push(...pickPlace(arm, from, to, { fh: arm === 'a' ? 0.95 : 0.85, th: arm === 'a' ? 1.25 : 1.15, safe: 6.5, speed: 0.75, say: k === 0 ? '⭕❌ Tic-tac-toe: left arm = X, right arm = O' : undefined }));
  });
  const tWin = total(phases);
  const a0 = cell(0, 2);
  const a1 = cell(2, 0);
  phases.push(
    P('a', 0.7, { p: [a0[0], 4, a0[1]], pitch: -90, grip: 0.5 }, '🏆 X wins along the anti-diagonal!'),
    P('a', 1.0, { p: [a1[0], 4, a1[1]] }),
    ...par([P('a', 0.8, { p: [-5, 14, -3], pitch: -35, grip: 0.5 })], [P('b', 0.8, { p: [5, 14, -3], pitch: -10, grip: 0 }, '🙇 O concedes with a bow')]),
    wait(1.5),
  );
  const lines: FixtureSpec[] = [];
  for (const x of [-2, 2]) lines.push(fbox(x, 0.32, -1, 0.2, 0.04, 12.4, 0x2d3748, { support: false }));
  for (const z of [-3, 1]) lines.push(fbox(0, 0.32, z, 12.4, 0.04, 0.2, 0x2d3748, { support: false }));
  return {
    id: 'ttt',
    title: 'Tic-Tac-Toe Duel',
    emoji: '⭕',
    category: 'Games & Play',
    tagline: 'Two robots play each other',
    story: 'Each arm owns a set of pieces. They alternate moves, placing X and O into the board cells. When X completes a diagonal, the winning line lights up.',
    novelty: 'Game-playing embodied AI: connect a minimax or LLM move generator to the arms and play against a human.',
    difficulty: 2,
    arms: 2,
    hardware: ['3×3 board with printed grid', 'Two sets of 3D-printed pieces', 'Overhead camera to read the board state'],
    approach: 'Vision → board state → minimax (or LLM) → scripted pick & place into the chosen cell.',
    howTo: [
      'Detect the board and pieces with a simple colour threshold in OpenCV.',
      'Compute the best move with minimax (trivial for 3×3).',
      'Place the next piece at the cell centre using a pre-calibrated 3×3 grid of poses.',
      'Add trash talk with a TTS model for entertainment.',
    ],
    code: `board = read_board(camera.read())          # 3x3 array of ' ', 'X', 'O'
r, c = minimax(board, player="O")
pick_place(STASH_O.pop(), CELL[r][c])`,
    theme: 'lab',
    props,
    fixtures: [
      fbox(0, 0.15, -1, 13, 0.3, 13, 0xf1e4c3),
      ...lines,
      fbox(0, 0.36, -1, 11.8, 0.06, 0.5, 0x37b24d, { emissive: 0x37b24d, showAfter: tWin + 0.3, rot: [0, 45, 0], support: false }),
    ],
    program: { kind: 'phases', phases, loop: true },
  };
}

export const helpfulScenarios: Scenario[] = [pillScenario(), pageScenario(), cardScenario(), labScenario(), plantScenario(), barScenario(), burgerScenario(), tttScenario()];
