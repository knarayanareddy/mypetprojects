import { act, arc, binE, cube, cylE, grip, inBin, mv, near, padE, park, pick, place, say, SINGLE, sync, wait, type Scenario } from './dsl';
import type { ArmCfg, EntDef, Sim, Step } from './engine';

const errStep = { t: 'err' } as Step;

export const SCENARIOS_B: Scenario[] = [
  /* 14 ----------------------------------------------------------- */
  {
    id: 'plug', title: 'Plug-in Charger', emoji: '🔌', category: 'Lab & Industry', arms: 1,
    tagline: 'Insert three plugs into a socket strip',
    desc: 'Three plugs lie on the table; the socket strip has holes that only accept a plug if it is placed within ±1.1 cm of the centre. Misses land on the strip and are rejected.',
    novel: 'Contact-rich insertion – the same family as the ArmnetBench cable_clip / ring_insert / tool_insert tasks that separate good policies from great ones.',
    real: 'Autonomous EV charging, connector mating, electronics assembly & test.',
    demand: { precision: 0.95, contact: 0.7, horizon: 0.4 }, tags: ['insertion', 'contact-rich'],
    build: () => {
      const hx = [-5, 0, 5];
      const holes = hx.map((x) => ({ x, z: -6, r: 1.1 }));
      return {
        arms: SINGLE,
        ents: [
          { id: 'socket', kind: 'box', x: 0, z: -6, w: 15, d: 5, h: 2, color: '#475569', support: true, data: { holes }, label: 'Socket' },
          ...hx.map((x, i) => cylE('hole' + i, x, -6, 1.25, 0.1, '#020617', { movable: false, y: 2.05 })),
          ...hx.map((x, i) => cylE('plug' + i, x, 3.5, 0.9, 3.2, '#fbbf24', { tol: 1.3 })),
        ] as EntDef[],
        steps: [[...hx.flatMap((x, i) => [pick('plug' + i), place(x, -6, { hover: 9 })]), park]],
        check: (sim) => { const s = hx.filter((x, i) => { const e = sim.ent('plug' + i)!; return Math.hypot(e.x - x, e.z + 6) < 1.4 && e.y < 2.2; }).length; return { score: s, max: 3, msg: `${s}/3 plugs inserted` }; },
      };
    },
  },
  /* 15 ----------------------------------------------------------- */
  {
    id: 'hanoi', title: 'Tower of Hanoi', emoji: '🗼', category: 'Games & Social', arms: 1,
    tagline: 'Solve the 3-disk puzzle in 7 legal moves',
    desc: 'The planner computes the optimal 7-move solution; the arm executes each move, respecting stacking order so the small disks always end up on the larger ones.',
    novel: 'A planning + dexterity combo: the full solution is 7 sequential dependent picks – one failed grasp ruins the rest unless the policy can re-plan (a great LLM/VLM demo).',
    real: 'Multi-step assembly sequencing, packing order, STEM education.',
    demand: { horizon: 0.9, precision: 0.6, language: 0.3, contact: 0.2 }, tags: ['planning', 'long horizon'],
    build: () => {
      const px = [-10, 0, 10];
      const disks = [
        { id: 'd0', r: 2.6, c: '#ef4444' }, { id: 'd1', r: 2.0, c: '#facc15' }, { id: 'd2', r: 1.4, c: '#22c55e' },
      ];
      const moves: [number, number, number][] = [];
      const solve = (n: number, f: number, t: number, v: number) => { if (n < 0) return; solve(n - 1, f, v, t); moves.push([n, f, t]); solve(n - 1, v, t, f); };
      solve(2, 0, 2, 1);
      const steps: Step[] = [];
      moves.forEach(([d, , t], i) => steps.push(say(`move ${i + 1}/7: disk ${d + 1} → peg ${'ABC'[t]}`), pick('d' + d), place(px[t], -3)));
      steps.push(park);
      return {
        arms: SINGLE,
        ents: [...px.map((x, i) => padE('pp' + i, x, -3, '#475569', 'ABC'[i], 3.6)),
          ...px.map((x, i) => cylE('peg' + i, x, -3, 0.5, 9, '#94a3b8', { movable: false })),
          ...disks.map((d, i) => cylE(d.id, -10, -3, d.r, 1.4, d.c, { y: 0.7 + i * 1.4, tol: 1.5 }))],
        steps: [steps],
        check: (sim) => { const s = disks.filter((d, i) => { const e = sim.ent(d.id)!; return Math.hypot(e.x - 10, e.z + 3) < 1.8 && Math.abs(e.y - (0.7 + i * 1.4)) < 0.5; }).length; return { score: s, max: 3, msg: `${s}/3 disks correctly stacked on peg C` }; },
      };
    },
  },
  /* 16 ----------------------------------------------------------- */
  {
    id: 'shelf', title: 'Assistive Shelf Fetch', emoji: '🧓', category: 'Assistive & Care', arms: 1,
    tagline: '“Put my eye-drops, pills and cup on the shelf”',
    desc: 'Three everyday items on the table must be lifted onto an 8 cm high shelf where a wheelchair user can reach them. Heights, tilt and clearance are all different from table-top tasks.',
    novel: 'Mirrors the ArmnetBench eye_drops_to_shelf task – placement at a different height tests whether the policy really understands depth, not just 2-D positions. Language command “bring my X” fits VLAs.',
    real: 'Home-care robots, wheelchair-mounted arms, hospital bedside assistance.',
    demand: { language: 0.65, precision: 0.5, generalization: 0.5, horizon: 0.4 }, tags: ['assistive', 'language', 'height'],
    build: () => ({
      arms: SINGLE,
      ents: [
        { id: 'shelf', kind: 'box', x: 0, z: 3, w: 18, d: 6, h: 8, color: '#78716c', support: true, label: 'Shelf' },
        cylE('drops', -11, -4, 1, 5, '#38bdf8', { label: 'Eye drops' }),
        { id: 'pills', kind: 'box', x: -5, z: -8, w: 3.5, d: 2.5, h: 2.5, color: '#a78bfa', movable: true, label: 'Pills' },
        cylE('cup', 10, -4, 1.8, 4, '#f8fafc', { taper: 1.2 }),
      ] as EntDef[],
      steps: [[say('“Put my eye drops on the shelf”'), pick('drops'), place(-5, 3), pick('pills'), place(0, 3), pick('cup'), place(5, 3), park]],
      check: (sim) => { const s = ['drops', 'pills', 'cup'].filter((id) => sim.ent(id)!.y > 7.5).length; return { score: s, max: 3, msg: `${s}/3 items on the shelf` }; },
    }),
  },
  /* 17 ----------------------------------------------------------- */
  {
    id: 'keypad', title: 'Keypad / Touchscreen Tester', emoji: '🔢', category: 'Lab & Industry', arms: 1,
    tagline: 'Presses 4-2-7-1 on a keypad – no API required',
    desc: 'With its gripper closed like a finger, the arm presses four keys in order. A stray press on a neighbouring key (they are only 1.2 cm apart) is a wrong digit.',
    novel: 'Retrofit automation: operate any legacy device (elevator, microwave, ATM, medical pump, phone UI) physically, without needing access to its software.',
    real: 'Automated QA of phones & kiosks, accessibility switch-pressing, legacy equipment control.',
    demand: { precision: 0.8, language: 0.4, horizon: 0.3, reactivity: 0.2 }, tags: ['UI testing', 'retrofit', 'precision'],
    build: () => {
      const code = [4, 2, 7, 1];
      const kx = (d: number) => ((d - 1) % 3 - 1) * 4.2, kz = (d: number) => -1 + (Math.floor((d - 1) / 3) - 1) * 4.2;
      const typed: number[] = [];
      const flash = new Map<number, number>();
      const steps: Step[] = [grip(0, 0.2), say('typing code 4-2-7-1')];
      code.forEach((d) => steps.push(errStep, mv(kx(d), 5, kz(d)), mv(kx(d), 2.2, kz(d), { speed: 6 }),
        act((sim, arm) => {
          const t = sim.tcp(arm);
          let best = 0, bd = 9;
          for (let k = 1; k <= 9; k++) { const dd = Math.hypot(t[0] - kx(k), t[2] - kz(k)); if (dd < bd) { bd = dd; best = k; } }
          if (bd < 2.1) { typed.push(best); flash.set(best, sim.time + 0.5); sim.ent('k' + best)?.setColor(best === d ? '#22c55e' : '#ef4444'); sim.log(`pressed ${best}${best === d ? '' : ` (wanted ${d})`}`, best === d ? 'ok' : 'warn'); }
          else sim.log(`missed all keys for digit ${d}`, 'err');
        }, 'pressing'), mv(kx(d), 5, kz(d))));
      steps.push(park);
      return {
        arms: SINGLE,
        ents: [{ id: 'plate', kind: 'box', x: 0, z: -1, w: 15, d: 15, h: 0.6, color: '#1e293b' } as EntDef,
          ...Array.from({ length: 9 }, (_, i) => ({ id: 'k' + (i + 1), kind: 'box', x: kx(i + 1), z: kz(i + 1), w: 3, d: 3, h: 1.6, y: 1.4, color: '#64748b', data: { text: String(i + 1) } }) as EntDef)],
        steps: [steps],
        tick: (sim) => { flash.forEach((t, k) => { if (sim.time > t) { sim.ent('k' + k)?.setColor('#64748b'); flash.delete(k); } }); },
        check: () => { const s = code.filter((d, i) => typed[i] === d).length; return { score: s, max: 4, msg: `typed ${typed.join('') || '—'} (target ${code.join('')})` }; },
      };
    },
  },
  /* 18 ----------------------------------------------------------- */
  {
    id: 'napkin', title: 'Napkin Folder', emoji: '🧻', category: 'Assistive & Care', arms: 1,
    tagline: 'Fold a napkin in half, then in half again',
    desc: 'The arm grabs a corner tab, carries it to the opposite edge and releases – the cloth folds. Repeat once more for a quarter-fold.',
    novel: 'Deformable-object manipulation (the sim shows it with a simple scale-fold). Cloth is exactly where learned world models like Visionary and π0 shine versus hand-written controllers.',
    real: 'Hospital linen, hotel & restaurant service, laundry folding.',
    demand: { contact: 0.9, precision: 0.5, generalization: 0.4, horizon: 0.3 }, tags: ['deformable', 'cloth'],
    build: () => {
      const folded = [false, false];
      const fold = (n: number, tx: number, tz: number, apply: (sim: Sim) => void): Step =>
        act((sim) => {
          const tab = sim.ent('tab' + n)!;
          if (Math.hypot(tab.x - tx, tab.z - tz) < 2.6) { folded[n - 1] = true; apply(sim); sim.log(`fold ${n} done`, 'ok'); } else sim.log(`fold ${n} failed – corner not aligned`, 'warn');
        }, 'folding');
      return {
        arms: SINGLE,
        ents: [
          { id: 'napkin', kind: 'box', x: 0, z: -1, w: 12, d: 12, h: 0.2, color: '#f9a8d4' },
          cube('tab1', 0, 4.8, '#ec4899', { w: 1.6, d: 1.6, h: 0.5, tol: 1.4, y: 0.45 }),
          cube('tab2', 5.8, -4, '#ec4899', { w: 1.6, d: 1.6, h: 0.5, tol: 1.4, y: 0.45 }),
        ] as EntDef[],
        steps: [[
          pick('tab1', { hover: 6 }), place(0, -6.8, { hover: 7 }),
          fold(1, 0, -6.8, (sim) => { const n = sim.ent('napkin')!; n.mesh.scale.z = 0.5; n.mesh.scale.y = 2; n.z = -4; }),
          pick('tab2', { hover: 6 }), place(-5.8, -4, { hover: 7 }),
          fold(2, -5.8, -4, (sim) => { const n = sim.ent('napkin')!; n.mesh.scale.x = 0.5; n.mesh.scale.y = 4; n.x = -3; }), park,
        ]],
        check: () => { const s = folded.filter(Boolean).length; return { score: s, max: 2, msg: `${s}/2 folds completed` }; },
      };
    },
  },
  /* 19 ----------------------------------------------------------- */
  {
    id: 'seeds', title: 'Seedling Planter', emoji: '🌱', category: 'Field & Sustainability', arms: 1,
    tagline: 'Drop one seed into each pot – then watch them grow',
    desc: 'Four tiny seeds (1.1 cm) have to land in four pots. When the run ends a time-lapse spawns sprouts in every pot that received a seed.',
    novel: 'Precision-agriculture micro-task: tiny objects + one-per-container constraint, with a satisfying time-lapse reward.',
    real: 'Vertical farms, nursery trays, plant phenotyping, lab seed sorting.',
    demand: { precision: 0.85, horizon: 0.4, generalization: 0.25 }, tags: ['agriculture', 'tiny objects'],
    build: () => {
      const px = [-9, -3, 3, 9], sx = [-4.5, -1.5, 1.5, 4.5];
      return {
        arms: SINGLE,
        ents: [...px.map((x, i) => binE('pot' + i, x, -4, '#c2410c', 'Pot ' + (i + 1), 5, 5, 3)),
          ...sx.map((x, i) => ({ id: 'seed' + i, kind: 'sph', x, z: 3.5, r: 0.55, color: '#78350f', movable: true, tol: 0.9 }) as EntDef)],
        steps: [[...sx.flatMap((_, i) => [pick('seed' + i, { hover: 6 }), place(px[i], -4, { hover: 8 })]),
          act((sim) => { let n = 0; px.forEach((_, i) => { if (inBin(sim, 'seed' + i, 'pot' + i)) { n++; sim.spawn(cylE('st' + i, px[i], -4, 0.4, 3, '#16a34a', { movable: false, y: 2.1 })); sim.spawn({ id: 'lf' + i, kind: 'sph', x: px[i], z: -4, r: 1.3, y: 3.8, color: '#4ade80' }); } }); sim.log(`time-lapse: ${n} seedlings sprouted 🌿`, 'ok'); }, 'time-lapse'), park]],
        check: (sim) => { const s = px.filter((_, i) => inBin(sim, 'seed' + i, 'pot' + i)).length; return { score: s, max: 4, msg: `${s}/4 seeds planted` }; },
      };
    },
  },
  /* 20 ----------------------------------------------------------- */
  {
    id: 'light', title: 'Light-Painting Studio', emoji: '✨', category: 'Creative & Fun', arms: 1,
    tagline: 'Paint 3-D neon shapes in mid-air for a long-exposure photo',
    desc: 'The arm holds a glowing LED and traces a circle, a figure-eight and a helix in the air. In a real booth you would capture it with a long-exposure camera.',
    novel: 'Zero contact, zero objects – pure trajectory quality. The result is immediately photogenic, great for social media and for judging smoothness.',
    real: 'Photography & advertising, motion-capture calibration, camera-path testing.',
    demand: { precision: 0.4, contact: 0.2, horizon: 0.4 }, tags: ['art', 'trajectory'],
    build: () => {
      let done = 0;
      const air = (pts: [number, number, number][], color: string): Step[] => [
        mv(pts[0][0], pts[0][1], pts[0][2], { pitch: -60, noerr: true }),
        ...pts.slice(1).map((p) => mv(p[0], p[1], p[2], { pitch: -60, ink: color, lin: true, speed: 11, noerr: true })),
        act((s, a) => { if (a.held?.def.id === 'led') { done++; s.log('light stroke finished', 'ok'); } }, 'stroke'),
      ];
      const circle = Array.from({ length: 50 }, (_, i) => { const t = (i / 49) * Math.PI * 2; return [5 * Math.cos(t), 9 + 4 * Math.sin(t), -3] as [number, number, number]; });
      const eight = Array.from({ length: 70 }, (_, i) => { const t = (i / 69) * Math.PI * 2; return [6 * Math.sin(t), 7, 2 + 3 * Math.sin(2 * t)] as [number, number, number]; });
      const helix = Array.from({ length: 80 }, (_, i) => { const t = (i / 79) * Math.PI * 6; return [3.5 * Math.cos(t), 4 + (i / 79) * 10, 2 + 3.5 * Math.sin(t)] as [number, number, number]; });
      return {
        arms: SINGLE, dark: true,
        ents: [{ id: 'led', kind: 'sph', x: -10, z: -6, r: 0.9, color: '#22d3ee', movable: true, emissive: true, data: { tipDrop: 0 } } as EntDef],
        steps: [[pick('led'), ...air(circle, '#22d3ee'), ...air(eight, '#f472b6'), ...air(helix, '#facc15'), park]],
        check: () => ({ score: done, max: 3, msg: `${done}/3 light shapes painted` }),
      };
    },
  },
  /* 21 ----------------------------------------------------------- */
  {
    id: 'cat', title: 'Cat Teaser (Pet-Sitter)', emoji: '🐈', category: 'Games & Social', arms: 1,
    tagline: 'Wiggles a feather wand so the cat stays entertained',
    desc: 'The arm picks up a wand and moves it unpredictably. The virtual cat chases it – engagement is scored only while the wand is moving and within the cat’s reach.',
    novel: 'Human-free interaction with a living creature: reactive, safe, low-force motion. Great storytelling for a hackathon pitch about robots caring for pets.',
    real: 'Pet care when owners are away, animal-behaviour research, children’s therapy play.',
    demand: { reactivity: 0.7, horizon: 0.3, generalization: 0.4, precision: 0.2 }, tags: ['interaction', 'reactivity'],
    build: (rng) => {
      const st = { eng: 0, last: [0, 0, 0] as number[], speed: 0 };
      const wp: Step[] = [];
      for (let i = 0; i < 12; i++) wp.push(mv(-8 + rng() * 16, 3 + rng() * 5, -2 + rng() * 6, { pitch: -90, speed: 17, dur: 0.8 + rng() * 0.4, noerr: true }));
      return {
        arms: SINGLE,
        ents: [cylE('wand', -13, -6, 0.4, 10, '#a16207', { tol: 1.4, label: 'Wand' }),
          { id: 'cat', kind: 'sph', x: 9, z: 1, r: 2.6, y: 2.6, color: '#f97316' }, { id: 'head', kind: 'sph', x: 9, z: 2.3, r: 1.6, y: 5.3, color: '#fb923c' }] as EntDef[],
        steps: [[pick('wand'), say('wiggling the wand!'), ...wp, park]],
        tick: (sim, dt) => {
          const arm = sim.arms[0];
          if (!arm.held || arm.held.def.id !== 'wand') return;
          const t = sim.tcp(arm);
          st.speed = Math.hypot(t[0] - st.last[0], t[2] - st.last[2]) / Math.max(dt, 1e-3);
          st.last = t;
          const cat = sim.ent('cat')!, head = sim.ent('head')!;
          const tx = Math.max(-10, Math.min(12, t[0])), tz = Math.max(-3, Math.min(5, t[2]));
          const d = Math.hypot(tx - cat.x, tz - cat.z);
          if (d > 4) { cat.x += ((tx - cat.x) / d) * 4 * dt; cat.z += ((tz - cat.z) / d) * 4 * dt; }
          head.x = cat.x; head.z = cat.z + 1.3;
          if (Math.hypot(t[0] - cat.x, t[2] - cat.z) < 9 && st.speed > 3) st.eng += dt;
        },
        check: () => { const s = Math.min(10, Math.floor(st.eng)); return { score: s, max: 10, msg: `cat engaged for ${st.eng.toFixed(1)} s (target ≥ 10 s)` }; },
      };
    },
  },
  /* 22 ----------------------------------------------------------- */
  {
    id: 'colift', title: 'Co-Lift & Rotate a Crate', emoji: '📦', category: 'Bimanual', arms: 2,
    tagline: 'Two arms carry a crate too wide for one gripper',
    desc: 'The crate is 12 cm wide – larger than the gripper opening. Both arms pinch its opposite faces, lift it, rotate 90° in lock-step and set it down. Fail the coordination and it drops.',
    novel: 'True bimanual coordination (ALOHA-style): the object is carried by the midpoint of the two grippers, a synchronised arc with shared timing.',
    real: 'Moving oversized or fragile objects, trays, panels; warehouse tote handling.',
    demand: { bimanual: 0.95, horizon: 0.45, contact: 0.5, precision: 0.5 }, tags: ['2 arms', 'coordination', 'large objects'],
    build: () => {
      const arms: ArmCfg[] = [{ name: 'Arm A', x: -22, z: 0, yaw: 0, color: '#ff7a1a' }, { name: 'Arm B', x: 22, z: 0, yaw: Math.PI, color: '#38bdf8' }];
      const c0 = [-3, -5], c1 = [3, 5], N = 14;
      const st = { carry: false, drop: -1 };
      const attach = (sim: Sim) => {
        if (st.carry) return;
        const cr = sim.ent('crate')!, [a, b] = sim.arms, ta = sim.tcp(a), tb = sim.tcp(b);
        if (Math.hypot(ta[0] - cr.x, ta[2] - cr.z) < 8 && Math.hypot(tb[0] - cr.x, tb[2] - cr.z) < 8) {
          cr.held = a; st.carry = true; st.drop = Math.random() > sim.q ? sim.time + 1.5 + Math.random() * 2.5 : -1; sim.log('crate lifted by both arms', 'ok');
        } else sim.log('arms are not on the crate faces – grasp failed', 'err');
      };
      const release = (sim: Sim) => { if (!st.carry) return; const cr = sim.ent('crate')!; cr.held = null; cr.vy = -0.01; st.carry = false; sim.log('crate set down', 'info'); };
      const mk = (si: number): Step[] => {
        const a = si === 0 ? -5.8 : 5.8;
        const tcp = (u: number, y: number): [number, number, number] => { const th = (u * Math.PI) / 2; return [c0[0] + (c1[0] - c0[0]) * u + a * Math.cos(th), y, c0[1] + (c1[1] - c0[1]) * u - a * Math.sin(th)]; };
        const p0 = tcp(0, 2.5), s: Step[] = [grip(1, 0.2), mv(p0[0] + (a < 0 ? -4 : 4), 8, p0[2], { pitch: -60, noerr: true }), mv(p0[0], 2.5, p0[2], { pitch: -60, noerr: true, speed: 6 }), grip(0.05, 0.5), sync('closed'), act(attach, 'lifting')];
        s.push(mv(...tcp(0, 9), { pitch: -60, noerr: true, dur: 0.8 }));
        for (let i = 1; i <= N; i++) s.push(mv(...tcp(i / N, 9), { pitch: -60, noerr: true, lin: true, dur: 0.35 }));
        s.push(mv(...tcp(1, 3.2), { pitch: -60, noerr: true, dur: 0.8 }), sync('down'), act(release, 'releasing'), grip(1, 0.3), mv(...tcp(1, 9), { pitch: -60, noerr: true }), park);
        return s;
      };
      return {
        arms,
        ents: [{ id: 'crate', kind: 'box', x: -3, z: -5, w: 12, d: 7, h: 5, color: '#a16207', movable: true, label: 'Crate' } as EntDef, padE('goal', 3, 5, '#22c55e', 'Goal', 6)],
        steps: [mk(0), mk(1)],
        tick: (sim) => {
          if (!st.carry) return;
          const cr = sim.ent('crate')!, ta = sim.tcp(sim.arms[0]), tb = sim.tcp(sim.arms[1]);
          if (st.drop > 0 && sim.time > st.drop) { cr.held = null; cr.vy = -0.01; st.carry = false; sim.log('⚠ crate slipped and dropped!', 'err'); return; }
          cr.x = (ta[0] + tb[0]) / 2; cr.y = (ta[1] + tb[1]) / 2; cr.z = (ta[2] + tb[2]) / 2;
          cr.yaw = Math.atan2(-(tb[2] - ta[2]), tb[0] - ta[0]);
        },
        check: (sim) => {
          const c = sim.ent('crate')!;
          let yw = c.yaw % Math.PI; if (yw < 0) yw += Math.PI;
          const pos = Math.hypot(c.x - 3, c.z - 5) < 4, rot = Math.abs(yw - Math.PI / 2) < 0.4;
          return { score: (pos ? 1 : 0) + (rot ? 1 : 0), max: 2, msg: `${pos ? 'at goal' : 'not at goal'}, ${rot ? 'rotated 90°' : 'wrong heading'}` };
        },
      };
    },
  },
  /* 23 ----------------------------------------------------------- */
  {
    id: 'dig', title: 'Disaster Dig-Out', emoji: '🚑', category: 'Field & Sustainability', arms: 1,
    tagline: 'Clear rubble to reach a buried medkit',
    desc: 'A medkit is buried under two pieces of debris. The robot has to reason about the order (top piece first), clear the rubble, and deliver the medkit to the safe zone.',
    novel: 'Requires scene understanding & ordering (can’t grab the bottom first), the kind of reasoning VLAs with sub-task planning (π0.5, EO-1) are designed for.',
    real: 'Search-and-rescue, mining, demolition, clearing a workspace before a task.',
    demand: { horizon: 0.8, generalization: 0.6, language: 0.4, precision: 0.5 }, tags: ['reasoning', 'rescue'],
    build: () => ({
      arms: SINGLE,
      ents: [
        cube('medkit', 3, 0, '#ef4444', { w: 3.2, d: 3.2, h: 2.2, label: 'Medkit' }),
        cube('d1', 3, 0, '#78716c', { y: 3.3 }), cube('d2', 3.2, 0.1, '#57534e', { y: 6.3 }),
        padE('rubble', -12, -4, '#78716c', 'Rubble', 4), padE('safe', 12, -4, '#22c55e', 'Safe zone', 4),
      ],
      steps: [[say('scene analysis: medkit is under d1 and d2 – clear top piece first'), pick('d2'), place(-12, -4), pick('d1'), place(-12, -4), pick('medkit', { hover: 7 }), place(12, -4), park]],
      check: (sim) => {
        const s = (near(sim, 'medkit', 12, -4, 3.6) ? 1 : 0) + (near(sim, 'd1', -12, -4, 4) ? 1 : 0) + (near(sim, 'd2', -12, -4, 4) ? 1 : 0);
        return { score: s, max: 3, msg: `${s}/3 objectives (medkit safe, rubble cleared ×2)` };
      },
    }),
  },
  /* 24 ----------------------------------------------------------- */
  {
    id: 'qc', title: 'Quality-Control Inspector', emoji: '🔍', category: 'Lab & Industry', arms: 1,
    tagline: 'Rotate each part in front of a camera, accept or reject',
    desc: 'Five parts (two secretly defective) are lifted, rotated for inspection, then routed to PASS or REJECT. Inspection accuracy depends on the perception quality of the selected model.',
    novel: 'Inspection-by-manipulation: the arm moves the part so a single fixed camera can see all sides. Verdict accuracy is tied to the model’s generalisation, not only its motor skills.',
    real: 'Electronics & parts inspection, produce grading, pharma blister checking.',
    demand: { generalization: 0.55, precision: 0.5, horizon: 0.45, language: 0.2 }, tags: ['inspection', 'perception'],
    build: (rng) => {
      const xs = [-8, -4, 0, 4, 8];
      const bad = new Set<number>();
      while (bad.size < 2) bad.add(Math.floor(rng() * 5));
      const bx = { pass: -12, rej: 12 };
      const steps: Step[] = [];
      xs.forEach((_, i) => steps.push(pick('p' + i), mv(0, 14, -1, { dur: 1.0 }), mv(0, 14, -1, { roll: 180, dur: 1.2, noerr: true }),
        act((sim, arm) => {
          const e = arm.held; if (!e) return;
          const correct = Math.random() < 0.5 + 0.5 * sim.q, truthBad = bad.has(i), verdictBad = correct ? truthBad : !truthBad;
          e.setColor(verdictBad ? '#ef4444' : '#22c55e');
          sim.log(`part ${i + 1}: ${verdictBad ? 'DEFECT detected' : 'looks good'}${correct ? '' : ' (misjudged!)'}`, verdictBad ? 'warn' : 'ok');
          arm.queue.unshift(place(verdictBad ? bx.rej : bx.pass, -6));
        }, 'inspecting')));
      steps.push(park);
      return {
        arms: SINGLE,
        ents: [...xs.map((x, i) => cube('p' + i, x, 3.5, '#94a3b8', { w: 2.8, d: 2.8, h: 2.8 })), binE('pass', bx.pass, -6, '#16a34a', 'PASS', 8, 8, 4), binE('rej', bx.rej, -6, '#dc2626', 'REJECT', 8, 8, 4)],
        steps: [steps],
        check: (sim) => { const s = xs.filter((_, i) => inBin(sim, 'p' + i, bad.has(i) ? 'rej' : 'pass')).length; return { score: s, max: 5, msg: `${s}/5 parts routed correctly` }; },
      };
    },
  },
  /* 25 ----------------------------------------------------------- */
  {
    id: 'xylo', title: 'Xylophone Duet', emoji: '🎵', category: 'Bimanual', arms: 2,
    tagline: 'Two arms play “Twinkle Twinkle” – turn your sound on!',
    desc: 'Eight bars, 2.2 cm wide. Arm A covers the low notes, Arm B the high notes, and a sync barrier keeps tempo. Mis-hit a neighbouring bar and you hear the wrong note.',
    novel: 'Audible feedback! A wrong note is instantly obvious to a live audience, and both robots must stay in time – the most entertaining way to showcase precision + coordination.',
    real: 'Music therapy, entertainment robotics, timing-critical dual-arm assembly.',
    demand: { precision: 0.8, bimanual: 0.7, horizon: 0.5, reactivity: 0.4 }, tags: ['2 arms', 'sound', 'timing'],
    build: () => {
      const bars = Array.from({ length: 8 }, (_, i) => ({ x: -8.75 + i * 2.5, f: [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25][i], c: ['#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e', '#06b6d4', '#6366f1', '#a855f7'][i] }));
      const tune = [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0];
      let correct = 0;
      const A: Step[] = [grip(0, 0.2)], B: Step[] = [grip(0, 0.2)];
      tune.forEach((n, i) => {
        const mine = n <= 3 ? A : B, other = n <= 3 ? B : A, x = bars[n].x;
        mine.push(errStep, mv(x, 4.5, 0, { dur: 0.3 }), mv(x, 1.5, 0, { dur: 0.13, lin: true }),
          act((sim, arm) => {
            const t = sim.tcp(arm);
            let best = -1, bd = 9;
            bars.forEach((b, k) => { const d = Math.abs(t[0] - b.x); if (d < bd && Math.abs(t[2]) < 4.2) { bd = d; best = k; } });
            if (best >= 0 && bd < 1.25) {
              sim.playNote(bars[best].f); const e = sim.ent('bar' + best)!; const o = e.color; e.setColor('#ffffff'); setTimeout(() => e.setColor(o), 180);
              if (best === n) correct++; else sim.log(`wrong bar! wanted note ${n + 1}, hit ${best + 1}`, 'warn');
            } else sim.log(`missed the bars on beat ${i + 1}`, 'warn');
          }, 'playing'), mv(x, 4.5, 0, { dur: 0.13, lin: true }));
        other.push(wait(0.05));
        A.push(sync('n' + i)); B.push(sync('n' + i));
      });
      A.push(park); B.push(park);
      return {
        ents: bars.map((b, i) => ({ id: 'bar' + i, kind: 'box', x: b.x, z: 0, w: 2.2, d: 8.4 - i * 0.45, h: 1, color: b.c }) as EntDef),
        steps: [A, B],
        check: () => ({ score: correct, max: tune.length, msg: `${correct}/${tune.length} notes correct` }),
      };
    },
  },
];

export { arc, near };
