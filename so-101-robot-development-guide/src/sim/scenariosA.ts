import { act, arc, binE, cube, cylE, grip, inBin, mv, near, padE, park, pick, place, say, stroke, SINGLE, sync, wait, type Scenario } from './dsl';
import type { EntDef, Step } from './engine';

const errStep = { t: 'err' } as Step;

export const SCENARIOS_A: Scenario[] = [
  /* 1 ------------------------------------------------------------ */
  {
    id: 'sorter', title: 'Colour Sorter', emoji: '🎨', category: 'Lab & Industry', arms: 1,
    tagline: 'The “hello world” of manipulation',
    desc: 'Three coloured cubes are scattered on the table. The arm must pick each one and drop it on the matching colour pad.',
    novel: 'Baseline benchmark – use it first to compare every policy under identical conditions and to validate calibration before attempting harder tasks.',
    real: 'Parcel, parts and laundry sorting; kitting stations.',
    demand: { precision: 0.35, generalization: 0.15, horizon: 0.25 }, tags: ['pick & place', 'baseline'],
    build: (rng) => {
      const cols: Record<string, string> = { red: '#ef4444', green: '#22c55e', blue: '#3b82f6' };
      const tg: Record<string, [number, number]> = { red: [-12, -4], green: [12, -4], blue: [0, -4] };
      const pos: [string, number, number][] = [['red', 9 + rng() * 2 - 1, 3], ['green', -9 + rng() * 2 - 1, 3], ['blue', rng() * 4 - 2, 4.5]];
      return {
        arms: SINGLE,
        ents: [...pos.map(([c, x, z]) => cube('c-' + c, x, z, cols[c])), ...Object.entries(tg).map(([c, p]) => padE('p-' + c, p[0], p[1], cols[c], c))],
        steps: [[...pos.flatMap(([c]) => [pick('c-' + c), place(tg[c][0], tg[c][1])]), park]],
        check: (sim) => { const s = Object.keys(tg).filter((c) => near(sim, 'c-' + c, tg[c][0], tg[c][1], 3.4)).length; return { score: s, max: 3, msg: `${s}/3 cubes on their colour pad` }; },
      };
    },
  },
  /* 2 ------------------------------------------------------------ */
  {
    id: 'tower', title: 'Tower Builder', emoji: '🧱', category: 'Games & Social', arms: 1,
    tagline: 'Stack four blocks into a tower',
    desc: 'Four blocks in a row must be stacked on top of each other at the centre. Small placement errors make the tower topple – precision matters.',
    novel: 'Directly mirrors the ArmnetBench “block_stack” task used to evaluate ACT, Diffusion, SmolVLA, π0, π0.5, GR00T and MolmoAct 2 on the SO-101.',
    real: 'Palletising, packing, assembly.',
    demand: { precision: 0.7, horizon: 0.45, contact: 0.2 }, tags: ['stacking', 'precision', 'benchmark'],
    build: () => {
      const cols = ['#ef4444', '#facc15', '#22c55e', '#3b82f6'], xs = [-9, -3, 3, 9];
      return {
        arms: SINGLE,
        ents: [...xs.map((x, i) => cube('b' + i, x, 3.5, cols[i])), padE('base', 0, -4, '#94a3b8', 'Tower', 2.6)],
        steps: [[...xs.flatMap((_, i) => [pick('b' + i), place(0, -4)]), park]],
        check: (sim) => {
          let top = 0;
          for (let i = 0; i < 4; i++) { const e = sim.ent('b' + i)!; if (Math.hypot(e.x, e.z + 4) < 2.8) top = Math.max(top, e.y + 1.5); }
          const lv = Math.round(top / 3);
          return { score: lv, max: 4, msg: `Tower height ${lv}/4 blocks` };
        },
      };
    },
  },
  /* 3 ------------------------------------------------------------ */
  {
    id: 'handover', title: 'Mid-air Handover', emoji: '🤝', category: 'Bimanual', arms: 2,
    tagline: 'Arm A passes cubes to Arm B in mid-air',
    desc: 'Arm A picks cubes that are only reachable on its side and offers them at the centre of the table. Arm B takes them and drops them in a bin that A can never reach.',
    novel: 'Uses BOTH robots you get at the hackathon as a coordinated pair – synchronisation barriers, object transfer and workspace extension in one demo.',
    real: 'Factory cells passing parts between stations; assistive feeding hand-offs.',
    demand: { precision: 0.5, bimanual: 0.85, horizon: 0.5, reactivity: 0.3 }, tags: ['2 arms', 'coordination'],
    build: () => {
      const starts: [number, number][] = [[-10, -9], [-5, -10]];
      const cols = ['#ef4444', '#facc15'];
      const A: Step[] = [], B: Step[] = [];
      starts.forEach((_, i) => {
        A.push(pick('c' + i), say('offering cube at the handover point'), mv(0, 7, 0, { pitch: -50, noerr: true }), sync('arr' + i), sync('grp' + i), grip(1, 0.3), mv(-8, 13, 0, { pitch: -50 }));
        B.push(mv(7, 12, 0, { pitch: -50, grip: 1, noerr: true }), sync('arr' + i), mv(0, 7, 0, { pitch: -50, speed: 6, noerr: true }), grip(0.6, 0.4),
          act((sim) => {
            const [a, b] = sim.arms;
            if (a.held) { const e = a.held; a.held = null; b.held = e; e.held = b; sim.log('Arm B took the cube from Arm A', 'ok'); } else sim.log('Handover failed – A is not holding anything', 'err');
          }, 'taking'), sync('grp' + i), mv(8, 13, 0, { pitch: -50 }), place(10, -9));
      });
      A.push(park); B.push(park);
      return {
        ents: [...starts.map(([x, z], i) => cube('c' + i, x, z, cols[i])), binE('bin', 10, -9, '#14b8a6', 'Bin (B only)', 8, 8, 3.5)],
        steps: [A, B],
        check: (sim) => { const s = [0, 1].filter((i) => inBin(sim, 'c' + i, 'bin')).length; return { score: s, max: 2, msg: `${s}/2 cubes delivered to the far bin` }; },
      };
    },
  },
  /* 4 ------------------------------------------------------------ */
  {
    id: 'barista', title: 'Dual-Arm Barista', emoji: '☕', category: 'Bimanual', arms: 2,
    tagline: 'One arm places the cup, the other presses the button & serves',
    desc: 'Arm A puts a cup under the dispenser. Arm B presses the brew button (miss it and nothing pours!), waits for the cup to fill, then serves it to the customer pad.',
    novel: 'Button pressing, liquid particles filling a cup, and a serving hand-off – a full café micro-workflow with real failure modes (missed button, spilled coffee).',
    real: 'Coffee kiosks, vending, hospitality automation.',
    demand: { precision: 0.6, horizon: 0.6, bimanual: 0.6, contact: 0.3, language: 0.3 }, tags: ['liquid', '2 arms', 'service'],
    build: () => {
      const flow = { on: false, t: 0, acc: 0 };
      const ents: EntDef[] = [
        cylE('cup', -10, -9, 1.9, 4.5, '#f8fafc', { taper: 1.2, tol: 1.8, data: { receiver: true, cap: 70, fillColor: '#6b3f1d' }, label: 'Cup' }),
        cylE('pillar', 0, -11, 1.2, 26, '#64748b', { movable: false }),
        { id: 'armbox', kind: 'box', x: 0, z: -7, w: 2, h: 2, d: 8, y: 24, color: '#64748b' },
        cylE('nozzle', 0, -4, 0.7, 2, '#cbd5e1', { movable: false, y: 22.5 }),
        { id: 'btn', kind: 'box', x: 6, z: 8, w: 3.2, h: 1.6, d: 3.2, color: '#ef4444', label: 'BREW' },
        padE('cust', 11, -10, '#38bdf8', 'Customer', 3.6),
      ];
      return {
        ents,
        steps: [
          [pick('cup'), place(0, -4), say('cup is under the nozzle'), sync('placed'), park],
          [mv(6, 8, 6, { noerr: true }), grip(0, 0.2), sync('placed'), errStep, mv(6, 6, 8), mv(6, 2.3, 8, { speed: 6 }),
            act((sim, arm) => {
              const t = sim.tcp(arm), b = sim.ent('btn')!;
              if (Math.hypot(t[0] - b.x, t[2] - b.z) < 2.3) { flow.on = true; flow.t = 0; b.setColor('#22c55e'); sim.log('Brew started ☕', 'ok'); } else sim.log('Arm B missed the button!', 'err');
            }, 'pressing'), mv(6, 7, 8), wait(3), pick('cup'), place(11, -10), park],
        ],
        tick: (sim, dt) => {
          if (!flow.on) return;
          flow.t += dt; flow.acc += dt * 50;
          while (flow.acc >= 1) { flow.acc -= 1; sim.emit(0 + sim.gauss() * 0.15, 21.4, -4 + sim.gauss() * 0.15, 0, -10, 0, '#8b5a2b', 2); }
          if (flow.t > 2.2) { flow.on = false; sim.ent('btn')?.setColor('#ef4444'); }
        },
        check: (sim) => {
          const c = sim.ent('cup')!;
          const served = near(sim, 'cup', 11, -10, 4), full = (c.data.fill ?? 0) >= 50;
          return { score: (served ? 1 : 0) + (full ? 1 : 0), max: 2, msg: `${served ? 'served' : 'not served'}, cup ${Math.round(((c.data.fill ?? 0) / 70) * 100)} % full` };
        },
      };
    },
  },
  /* 5 ------------------------------------------------------------ */
  {
    id: 'waterer', title: 'Plant Waterer', emoji: '🪴', category: 'Field & Sustainability', arms: 1,
    tagline: 'Grasp a bottle, tilt with the wrist-roll, water the plant',
    desc: 'The arm grabs a watering bottle from the side, moves above the pot, rolls its wrist ~115° to pour, then puts the bottle back.',
    novel: 'Showcases the often-forgotten wrist-roll joint and tool use with liquids – a task that depends on orientation control, not just position.',
    real: 'Plant-care while you travel, greenhouse irrigation, lab liquid handling.',
    demand: { precision: 0.45, contact: 0.5, horizon: 0.4 }, tags: ['tool use', 'wrist roll', 'liquid'],
    build: () => ({
      arms: SINGLE,
      ents: [
        cylE('bottle', 4, 4, 1.5, 8, '#38bdf8', { orient: 'full', tol: 1.8, data: { liquid: 130, liquidColor: '#7dd3fc' }, label: 'Water' }),
        cylE('pot', -5, 4.5, 3.2, 4, '#b45309', { taper: 1.15, movable: false, data: { receiver: true, cap: 60, fillColor: '#38bdf8' } }),
        { id: 'plant', kind: 'sph', x: -5, z: 4.5, r: 1.8, y: 5.2, color: '#22c55e' },
      ],
      steps: [[
        pick('bottle', { side: true }), mv(-1.2, 12, 4.5, { pitch: 0, dur: 1.4 }), say('pouring (wrist roll 115°)'),
        mv(-1.2, 12, 4.5, { pitch: 0, roll: 115, dur: 1.6, noerr: true }), wait(1.4), mv(-1.2, 12, 4.5, { pitch: 0, roll: 0, dur: 1.2, noerr: true }),
        mv(4, 5, 4, { pitch: 0 }), { t: 'release' }, mv(4, 9, -1, { pitch: 0 }), park,
      ]],
      check: (sim) => { const f = sim.ent('pot')!.data.fill ?? 0; const s = Math.min(4, Math.round((f / 60) * 4)); return { score: s, max: 4, msg: `pot ${Math.round((f / 60) * 100)} % watered` }; },
    }),
  },
  /* 6 ------------------------------------------------------------ */
  {
    id: 'doodle', title: 'Doodle Artist', emoji: '🖍️', category: 'Creative & Fun', arms: 1,
    tagline: 'Picks up a marker and draws a heart, spiral and star',
    desc: 'The arm picks a marker, then draws three shapes with continuous path following. Shaky policies produce visibly shaky lines.',
    novel: 'Turns the arm into a plotter: continuous trajectory tracking with a tool, perfect for a live “drawing a portrait for the judges” demo.',
    real: 'Signage, handwriting for people with tremors, calligraphy, marking & layout.',
    demand: { precision: 0.5, contact: 0.4, horizon: 0.35 }, tags: ['drawing', 'tool use'],
    build: () => {
      let done = 0;
      const heart: [number, number][] = Array.from({ length: 61 }, (_, i) => { const t = (i / 60) * Math.PI * 2, s = 0.33; return [s * 16 * Math.pow(Math.sin(t), 3) + 0, 0.6 - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))] as [number, number]; });
      const spiral: [number, number][] = Array.from({ length: 70 }, (_, i) => { const t = (i / 69) * Math.PI * 5; const r = 0.4 + (t / (Math.PI * 5)) * 3.2; return [-10.5 + r * Math.cos(t), 1 + r * Math.sin(t)] as [number, number]; });
      const star: [number, number][] = [0, 2, 4, 1, 3, 0].map((k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; return [10.5 + 3.6 * Math.cos(a), 1 + 3.6 * Math.sin(a)] as [number, number]; });
      const starPts: [number, number][] = [];
      star.forEach((p, i) => { if (i === 0) return; const q = star[i - 1]; for (let k = 1; k <= 8; k++) starPts.push([q[0] + ((p[0] - q[0]) * k) / 8, q[1] + ((p[1] - q[1]) * k) / 8]); });
      starPts.unshift(star[0]);
      const mark = (n: string): Step => act((_s, a) => { if (a.held?.def.id === 'pen') { done++; _s.log(`stroke complete: ${n}`, 'ok'); } }, 'stroke done');
      return {
        arms: SINGLE,
        decal: (c, X, Z, k) => { c.fillStyle = '#f1f5f9'; c.fillRect(X(-14), Z(-5), 28 * k, 12 * k); c.strokeStyle = '#cbd5e1'; c.strokeRect(X(-14), Z(-5), 28 * k, 12 * k); },
        ents: [cylE('pen', -13, -7, 0.6, 9, '#ef4444', { tol: 1.4, data: { tipDrop: 4.5 }, label: 'Marker' })],
        steps: [[pick('pen'), ...stroke(heart, '#ef4444'), mark('heart'), ...stroke(spiral, '#3b82f6'), mark('spiral'), ...stroke(starPts, '#16a34a'), mark('star'), park]],
        check: () => ({ score: done, max: 3, msg: `${done}/3 drawings completed` }),
      };
    },
  },
  /* 7 ------------------------------------------------------------ */
  {
    id: 'zen', title: 'Zen Garden Raker', emoji: '🪨', category: 'Creative & Fun', arms: 1,
    tagline: 'Rakes concentric ripples around two rocks',
    desc: 'The arm holds a rake and draws three concentric circles around each rock, then a wave line across the sand.',
    novel: 'Long, smooth, repetitive contact tool-use – a great test of trajectory smoothness and a calming showpiece for your booth.',
    real: 'Landscaping, surface finishing, sanding / polishing paths, spreading material.',
    demand: { precision: 0.35, contact: 0.5, horizon: 0.55 }, tags: ['tool use', 'patterns', 'smoothness'],
    build: () => {
      let done = 0;
      const mark: Step = act((s, a) => { if (a.held?.def.id === 'rake') { done++; s.log(`pattern ${done}/7 raked`, 'ok'); } }, 'raked');
      const steps: Step[] = [pick('rake')];
      for (const cx of [-9, 9]) for (const r of [3.8, 5.1, 6.4]) steps.push(...stroke(arc(cx, -3, r, 0, Math.PI * 2, 40), '#8a7653'), mark);
      const wave: [number, number][] = Array.from({ length: 36 }, (_, i) => [-12 + (i * 24) / 35, 1.2 + Math.sin(i / 3.5) * 1.1]);
      steps.push(...stroke(wave, '#8a7653'), mark, park);
      return {
        arms: SINGLE,
        decal: (c, X, Z, k) => { c.fillStyle = '#d6c7a1'; c.beginPath(); c.roundRect(X(-20), Z(-12), 40 * k, 21 * k, 22); c.fill(); },
        ents: [cylE('rake', -13, -7, 0.55, 9, '#92400e', { tol: 1.4, data: { tipDrop: 4.5 }, label: 'Rake' }),
          { id: 'r1', kind: 'sph', x: -9, z: -3, r: 2.4, y: 2.2, color: '#6b7280' }, { id: 'r2', kind: 'sph', x: 9, z: -3, r: 2.4, y: 2.2, color: '#4b5563' }],
        steps: [steps],
        check: () => ({ score: done, max: 7, msg: `${done}/7 patterns raked` }),
      };
    },
  },
  /* 8 ------------------------------------------------------------ */
  {
    id: 'pills', title: 'Pill Organiser', emoji: '💊', category: 'Assistive & Care', arms: 1,
    tagline: 'Sort 7 tiny pills into Mon–Sun compartments',
    desc: 'Seven pills only 1.2 cm wide must each be placed in the right day compartment. Needs high precision and 7 consecutive successful grasps.',
    novel: 'An accessibility application with extreme precision demands: each pill grasp tolerance is only ±1 cm, so low-precision VLAs struggle while ACT shines.',
    real: 'Medication management for elderly/vision-impaired users, pharmacy automation.',
    demand: { precision: 0.9, horizon: 0.7, generalization: 0.2 }, tags: ['tiny objects', 'precision', 'accessibility'],
    build: () => {
      const cols = ['#f8fafc', '#fda4af', '#fde047', '#93c5fd', '#86efac', '#fdba74', '#d8b4fe'];
      const days = 'MTWTFSS';
      const sx = (i: number) => -12 + i * 4;
      return {
        arms: SINGLE,
        decal: (c, X, Z) => { c.fillStyle = '#e2e8f0'; c.font = 'bold 22px system-ui'; c.textAlign = 'center'; days.split('').forEach((d, i) => c.fillText(d, X(sx(i)), Z(-7.3))); },
        ents: [...cols.map((c, i) => ({ id: 'pill' + i, kind: 'sph', x: -6 + i * 2, z: 3.5, r: 0.6, color: c, movable: true, tol: 1.0 }) as EntDef),
          ...cols.map((_, i) => ({ id: 'slot' + i, kind: 'pad', x: sx(i), z: -4, w: 3.2, d: 3.2, color: '#475569' }) as EntDef)],
        steps: [[...cols.flatMap((_, i) => [pick('pill' + i, { hover: 6 }), place(sx(i), -4, { hover: 8 })]), park]],
        check: (sim) => { const s = cols.filter((_, i) => near(sim, 'pill' + i, sx(i), -4, 1.8)).length; return { score: s, max: 7, msg: `${s}/7 pills in the right day` }; },
      };
    },
  },
  /* 9 ------------------------------------------------------------ */
  {
    id: 'vials', title: 'Lab Vial Loader', emoji: '🧪', category: 'Lab & Industry', arms: 1,
    tagline: 'Scan barcodes and load sample vials into a rack',
    desc: 'Each vial is lifted, rotated 180° in front of a (virtual) barcode scanner with the wrist-roll, and then inserted into a rack slot.',
    novel: 'Lab automation on a $120 arm: pick → inspect-by-rotation → precise insertion, the classic liquid-handling robot workflow.',
    real: 'Clinical labs, COVID-style sample processing, cell-culture automation.',
    demand: { precision: 0.75, contact: 0.4, horizon: 0.5 }, tags: ['lab', 'insertion', 'wrist roll'],
    build: () => {
      const xs = [-6, -2, 2, 6];
      return {
        arms: SINGLE,
        ents: [...xs.map((x, i) => cylE('v' + i, x, 4, 1.1, 5.5, '#38bdf8', { tol: 1.2, taper: 1, label: i === 0 ? 'Vials' : undefined })),
          { id: 'rack', kind: 'box', x: 0, z: -5, w: 18, d: 5, h: 2, color: '#334155', support: true, label: 'Rack' }],
        steps: [[...xs.flatMap((x, i) => [pick('v' + i), mv(0, 14, -1, { dur: 1.1 }), say(`scanning barcode of vial ${i + 1}`), mv(0, 14, -1, { roll: 180, dur: 1.2, noerr: true }), place(x, -5)]), park]],
        check: (sim) => { const s = xs.filter((x, i) => near(sim, 'v' + i, x, -5, 1.6) && sim.ent('v' + i)!.y > 2).length; return { score: s, max: 4, msg: `${s}/4 vials seated in the rack` }; },
      };
    },
  },
  /* 10 ----------------------------------------------------------- */
  {
    id: 'recycle', title: 'Recycling Sorter', emoji: '♻️', category: 'Field & Sustainability', arms: 1,
    tagline: 'Sort never-seen items into Plastic / Metal / Paper',
    desc: 'Four objects with random colours (a different mix every reset) must be classified and dropped in the right bin. Tests perception and generalisation to unseen objects.',
    novel: 'Randomised appearance each run: a policy that memorised one coloured block will fail – only generalist VLAs survive. Perfect to demonstrate why foundation models matter.',
    real: 'Waste-sorting facilities, smart bins, e-waste disassembly.',
    demand: { generalization: 0.85, language: 0.4, precision: 0.4, horizon: 0.4 }, tags: ['perception', 'generalisation'],
    build: (rng) => {
      const pal = ['#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa'];
      const pc = () => pal[Math.floor(rng() * pal.length)];
      const items: [string, EntDef, string][] = [
        ['bottle1', cylE('bottle1', -8, 3, 1.3, 6, pc(), { label: 'bottle' }), 'bPlastic'],
        ['can', cylE('can', -2, 4.5, 1.4, 5, '#9ca3af', { label: 'can' }), 'bMetal'],
        ['paper', { id: 'paper', kind: 'sph', x: 4, z: 4.5, r: 1.8, color: '#f8fafc', movable: true, label: 'paper' } as EntDef, 'bPaper'],
        ['bottle2', cylE('bottle2', 9, 3, 1.3, 6, pc(), { label: 'bottle' }), 'bPlastic'],
      ];
      const bx: Record<string, number> = { bPlastic: -13, bMetal: 0, bPaper: 13 };
      return {
        arms: SINGLE,
        ents: [...items.map((i) => i[1]), binE('bPlastic', -13, -4, '#2563eb', 'Plastic', 8, 8, 4.5), binE('bMetal', 0, -4, '#6b7280', 'Metal', 8, 8, 4.5), binE('bPaper', 13, -4, '#16a34a', 'Paper', 8, 8, 4.5)],
        steps: [[...items.flatMap(([id, , b]) => [say(`classifying ${id} → ${b.slice(1)}`), pick(id), place(bx[b], -4)]), park]],
        check: (sim) => { const s = items.filter(([id, , b]) => inBin(sim, id, b)).length; return { score: s, max: 4, msg: `${s}/4 items in the right bin` }; },
      };
    },
  },
  /* 11 ----------------------------------------------------------- */
  {
    id: 'ttt', title: 'Tic-Tac-Toe Opponent', emoji: '⭕', category: 'Games & Social', arms: 1,
    tagline: 'Reads the board, finds the blocking move, plays it',
    desc: 'The human (blue cubes) has two in a diagonal. The robot (orange discs) must reason about the threat and place its disc on the one square that blocks.',
    novel: 'Reasoning + manipulation: the “brain” (minimax / VLM planner) and the “hand” (the policy) are separate – ideal for pairing an LLM planner with LeRobot.',
    real: 'Companion robots for elderly people, therapy/education games.',
    demand: { language: 0.55, generalization: 0.35, precision: 0.45, horizon: 0.3 }, tags: ['reasoning', 'games', 'LLM planner'],
    build: () => {
      const sq = (r: number, c: number): [number, number] => [(c - 1) * 4.2, -2 + (r - 1) * 4.2];
      const target = sq(2, 2);
      return {
        arms: SINGLE,
        decal: (c, X, Z, k) => { c.strokeStyle = '#e2e8f0'; c.lineWidth = 3; for (let i = -1; i <= 2; i++) { const v = -6.3 + (i + 1) * 4.2; c.beginPath(); c.moveTo(X(v), Z(-8.3)); c.lineTo(X(v), Z(4.3)); c.stroke(); c.beginPath(); c.moveTo(X(-6.3), Z(-8.3 + (i + 1) * 4.2)); c.lineTo(X(6.3), Z(-8.3 + (i + 1) * 4.2)); c.stroke(); } void k; },
        ents: [
          cube('x1', sq(0, 0)[0], sq(0, 0)[1], '#3b82f6', { w: 2.4, d: 2.4, h: 2.4, movable: false }),
          cube('x2', sq(1, 1)[0], sq(1, 1)[1], '#3b82f6', { w: 2.4, d: 2.4, h: 2.4, movable: false }),
          cylE('o1', sq(0, 2)[0], sq(0, 2)[1], 1.3, 1.2, '#fb923c', { movable: false }),
          cylE('o2', -13, -5, 1.3, 1.2, '#fb923c', { tol: 1.6, label: 'My move' }),
        ],
        steps: [[say('board: X at (0,0) & (1,1) – X threatens the diagonal → I must block (2,2)'), pick('o2'), place(target[0], target[1]), park]],
        check: (sim) => { const ok = near(sim, 'o2', target[0], target[1], 2); return { score: ok ? 1 : 0, max: 1, msg: ok ? 'blocked the winning diagonal' : 'failed to block – X wins' }; },
      };
    },
  },
  /* 12 ----------------------------------------------------------- */
  {
    id: 'domino', title: 'Domino Setter', emoji: '🁣', category: 'Creative & Fun', arms: 1,
    tagline: 'Place a curved domino run, then topple it',
    desc: 'Six dominoes are placed along a curve with the correct heading (wrist-roll aligns each). The arm then nudges the first – the chain only continues if every gap is small enough.',
    novel: 'Failure is visible and dramatic: a 1 cm placement error breaks the chain. Gives instant, intuitive feedback on policy precision – and it is great stage theatre.',
    real: 'Precision assembly with sequential dependencies, shelf stocking, tile laying.',
    demand: { precision: 0.85, horizon: 0.6, contact: 0.4 }, tags: ['precision', 'orientation', 'spectacle'],
    build: () => {
      const N = 6;
      const P = Array.from({ length: N }, (_, i) => { const x = -7.5 + i * 3; return [x, -6 + 0.035 * x * x] as [number, number]; });
      const yaw = (i: number) => {
        const p = i === N - 1 ? P[N - 2] : P[i], q = i === N - 1 ? P[N - 1] : P[i + 1];
        return Math.atan2(-(q[1] - p[1]), q[0] - p[0]);
      };
      const st = { on: false, t0: 0, fall: [] as boolean[] };
      const steps: Step[] = [];
      P.forEach((p, i) => steps.push(pick('dom' + i), place(p[0], p[1], { yaw: yaw(i) })));
      steps.push(mv(P[0][0] - 3.6, 3, P[0][1] - 0.2, { noerr: true }), grip(0, 0.2), mv(P[0][0] - 1.5, 3, P[0][1], { speed: 5, noerr: true }),
        act((sim) => {
          st.on = true; st.t0 = sim.time;
          let ok = true;
          st.fall = P.map((_, i) => {
            const e = sim.ent('dom' + i)!;
            if (i > 0) { const p = sim.ent('dom' + (i - 1))!; if (Math.hypot(e.x - p.x, e.z - p.z) > 3.9) ok = false; }
            if (e.z > -1.5) ok = false;
            return ok;
          });
          sim.log(`nudging first domino… chain reach: ${st.fall.filter(Boolean).length}/${N}`, 'plan');
        }, 'nudge'), mv(P[0][0] - 4, 8, P[0][1], { noerr: true }), wait(3), park);
      return {
        arms: SINGLE,
        ents: Array.from({ length: N }, (_, i) => ({ id: 'dom' + i, kind: 'box', x: -7.5 + i * 3, z: 3.5, w: 0.8, d: 2.4, h: 4, color: i % 2 ? '#f8fafc' : '#fca5a5', movable: true, tol: 1.3 }) as EntDef),
        steps: [steps],
        tick: (sim) => {
          if (!st.on) return;
          st.fall.forEach((f, i) => { if (f && sim.time > st.t0 + 0.3 + i * 0.3) sim.ent('dom' + i)!.tiltTarget = 1.38; });
        },
        check: (sim) => { const s = Array.from({ length: N }, (_, i) => sim.ent('dom' + i)!.tiltTarget > 1).filter(Boolean).length; return { score: s, max: N, msg: `${s}/${N} dominoes fell in the chain` }; },
      };
    },
  },
  /* 13 ----------------------------------------------------------- */
  {
    id: 'cards', title: 'Card Dealer', emoji: '🃏', category: 'Games & Social', arms: 1,
    tagline: 'Deal six playing cards to two players',
    desc: 'The arm takes the top card from the deck one at a time and fans them out alternately to Player 1 and Player 2.',
    novel: 'Thin, flat objects (2.5 mm) are the hardest grasps for a low-cost gripper – height accuracy of a single millimetre is required.',
    real: 'Casino/entertainment automation, document & envelope handling, tray sorting.',
    demand: { precision: 0.8, horizon: 0.5, contact: 0.5 }, tags: ['thin objects', 'games'],
    build: () => {
      const cards = Array.from({ length: 6 }, (_, i) => cube('card' + i, -13, -5, i % 2 ? '#fecaca' : '#f8fafc', { w: 4.2, d: 6, h: 0.25, y: 0.125 + i * 0.25, tol: 2.2 }));
      const steps: Step[] = [];
      for (let k = 0; k < 6; k++) {
        const id = 'card' + (5 - k), pl = k % 2, n = Math.floor(k / 2);
        steps.push(pick(id, { hover: 5 }), place(pl === 0 ? -8 + n * 1.8 : 8 - n * 1.8, 3, { hover: 8 }));
      }
      steps.push(park);
      return {
        arms: SINGLE,
        ents: [...cards, padE('p1', -5.5, 3, '#38bdf8', 'Player 1', 5), padE('p2', 5.5, 3, '#f472b6', 'Player 2', 5)],
        steps: [steps],
        check: (sim) => { let s = 0; for (let k = 0; k < 6; k++) { const e = sim.ent('card' + (5 - k))!; const px = k % 2 === 0 ? -5.5 : 5.5; if (Math.hypot(e.x - px, e.z - 3) < 6) s++; } return { score: s, max: 6, msg: `${s}/6 cards dealt` }; },
      };
    },
  },
];
