import {
  g, W, H, PAL, TAU, bg, rect, ell, rr, poly, line, inkLine, letter, sfx, flash, camBegin, camEnd, lerp, ease, easeOut, backOut, seg, hash, frac, mixCol, glow, shake,
} from '../engine/core';
import type { Pt } from '../engine/core';
import { bit, human, mood } from '../engine/chars';
import { balloon, snow, crt, sparkle } from '../engine/props';
import type { ShotFn } from './types';

// 1974 — the first AI winter: funding floats away on balloons
export const winter: ShotFn = (t, lt) => {
  bg('#c5d9e8', '#eaf1f6');
  poly([[0, 720], [300, 560], [620, 690], [980, 540], [1400, 700], [1700, 590], [1920, 700], [1920, 1080], [0, 1080]], '#f6f9fc', { sw: 3, lit: false });
  const z = lerp(1, 1.1, ease(seg(lt, 0, 5)));
  camBegin(lerp(1000, 760, ease(seg(lt, 0, 5))), 560, z, 0);
  rect(-100, 880, 2400, 400, '#fafcfe', { sw: 4, lit: false });
  // the lab, snowed in
  rect(1100, 300, 720, 590, '#a56f5f', { sw: 5 });
  for (let r = 0; r < 8; r++) line(1100, 300 + r * 74, 1820, 300 + r * 74, 2, '#7d4f43', 0.5);
  poly([[1070, 310], [1850, 310], [1790, 230], [1130, 230]], '#fdfefe', { sw: 4 });
  for (let i = 0; i < 9; i++) poly([[1110 + i * 80, 312], [1140 + i * 80, 312], [1125 + i * 80, 372 + hash(i) * 50]], '#cfe8f5', { sw: 2, lit: false });
  rr(1180, 440, 200, 190, 10, '#ffe9a8', { sw: 4 });
  line(1280, 440, 1280, 630, 3);
  glow(1280, 540, 260, '#ffe9a8', 0.35);
  rr(1560, 540, 140, 350, 10, '#6a4a3a', { sw: 4 });
  rr(1410, 330, 250, 70, 12, '#fff3da', { sw: 4 });
  letter('A.I. LAB', 1535, 366, 44, PAL.indigo, { ink: false });
  // dollar balloons float away
  for (let i = 0; i < 5; i++) {
    const k = seg(lt, 0.2 + i * 0.25, 5);
    balloon(1180 + i * 90 + Math.sin(t * 1.3 + i) * 20, lerp(520, -260, easeOut(k * 0.9 + 0.02)), 36, '#f4c542', '$');
  }
  // researchers leave with boxes
  [0, 1, 2].forEach((i) => {
    const x = lerp(1540 - i * 60, -200, ease(seg(lt, 0.4 + i * 0.3, 5)));
    human(x, 905, 16, {
      era: 1,
      seed: 20 + i,
      walk: lt * 1.8 + i,
      flip: true,
      eyes: 'closed',
      mouth: 'flat',
      aL: 0.8,
      aR: 0.8,
      armL: (s) => rect(-s * 1, -s * 2.4, s * 3.4, s * 2.6, '#c98f55', { sw: 3 }),
    });
  });
  // Bit shivers, then freezes into an ice cube
  const frozen = lt > 3.2;
  const shiver = frozen ? 0 : Math.sin(t * 50) * 0.03;
  bit(560, 905, 18, {
    eyes: frozen ? 'closed' : 'scared',
    mouth: frozen ? 'flat' : 'wobble',
    hat: 'scarf',
    rot: shiver,
    aL: 0.2,
    aR: 0.2,
    emote: lt > 0.4 && lt < 3 ? 'sweat' : undefined,
    emoteK: 1,
    sq: frozen ? 0 : Math.abs(Math.sin(t * 25)) * 0.05,
  });
  if (frozen) {
    const k = backOut(seg(lt, 3.2, 3.6));
    g.save();
    g.translate(560, 905);
    g.scale(k, k);
    rr(-250, -320, 500, 350, 50, 'rgba(165,215,240,.6)', { sw: 4, op: 0.55 });
    line(-190, -250, -120, -280, 6, '#fff', 0.8);
    line(-190, -210, -170, -230, 6, '#fff', 0.8);
    g.restore();
    if (lt < 4) sfx('BRRR', 700, 330, 90, '#6fb4d8', lt - 3.3, { life: 1.4 });
  }
  camEnd();
  snow(t, 170, 150, 70);
};

// 1980s — expert systems: thousands of if/then rules in a box (until one too many)
export const expert: ShotFn = (t, lt) => {
  bg('#2b1f4d', '#5b2a6e');
  // synthwave sun + grid floor
  ell(960, 520, 270, 270, '#f2845c', { sw: 0, ink: null, lit: false, op: 0.95 });
  for (let i = 0; i < 6; i++) rect(660, 520 + i * 40 + 20, 600, 8 + i * 4, '#4a2870', { ink: null, lit: false, edge: 0 });
  rect(-20, 640, W + 40, 460, '#2a1a45', { ink: null, lit: false });
  for (let i = -10; i <= 10; i++) line(960 + i * 40, 640, 960 + i * 330, H, 2.5, '#e86ab4', 0.7);
  for (let i = 0; i < 8; i++) line(0, 640 + Math.pow(((i + (t * 0.8) % 1) / 8), 2) * 440, W, 640 + Math.pow(((i + (t * 0.8) % 1) / 8), 2) * 440, 2.5, '#5ad0d0', 0.7);
  camBegin(960, 540, lerp(1, 1.08, seg(lt, 0, 5)), Math.sin(lt) * 0.005);
  // beige computer
  crt(100, 300, 440, 340, '#0f2a1a', (x, y, w) => {
    for (let i = 0; i < 9; i++) {
      const wd = 80 + hash(i + Math.floor(lt * 3)) * (w - 160);
      g.fillStyle = '#6dff9a';
      g.globalAlpha = 0.85;
      g.fillRect(x + 30, y + 30 + i * 28, wd, 10);
    }
    g.globalAlpha = 1;
  });
  human(660, 930, 17, { era: 2, seed: 5, aL: 0.5 + Math.sin(t * 22) * 0.2, aR: 0.5 - Math.sin(t * 22) * 0.2, eyes: lt > 3.6 ? 'scared' : 'dot', mouth: lt > 3.6 ? 'o' : 'smile', sweat: lt > 3.6 ? 1 : 0 });
  // flowchart of rules unfolding
  const nodes: [number, number, string][] = [[1350, 250, 'IF'], [1150, 420, 'THEN'], [1550, 420, 'ELSE'], [1050, 590, 'IF'], [1250, 590, 'THEN'], [1450, 590, 'IF'], [1650, 590, 'ELSE']];
  const par = [-1, 0, 0, 1, 1, 2, 2];
  const boom = lt > 3.7;
  nodes.forEach(([x, y, tx], i) => {
    const k = backOut(seg(lt, 0.2 + i * 0.35, 0.6 + i * 0.35));
    if (par[i] >= 0 && k > 0) {
      const [px, py] = nodes[par[i]];
      line(px, py + 40, lerp(px, x, k), lerp(py + 40, y - 40, k), 4, '#f4c9e8');
    }
    if (k > 0) {
      const jx = boom ? Math.sin(t * 45 + i) * 6 : 0;
      g.save();
      g.translate(x + jx, y);
      g.scale(k, k);
      rr(-85, -40, 170, 80, 18, boom ? mixCol('#fff3da', '#e86a7e', 0.5 + 0.5 * Math.sin(t * 20)) : '#fff3da', { sw: 3.5, lit: false });
      letter(tx, 0, 2, 40, PAL.indigo, { ink: false });
      g.restore();
    }
  });
  // Bit in a suit, popping out of a box of rules
  const pop = backOut(seg(lt, 0.4, 1.1));
  const m = mood(lt, [[0, 'shades'], [3.7, 'x', 'sweat']]);
  bit(960, 925 + (1 - pop) * 180, 18, { ...m, hat: 'tie', mouth: lt > 3.7 ? 'wobble' : 'grin', aR: 1.3 + Math.sin(t * 6) * 0.3, noShadow: true });
  rect(820, 810, 280, 200, '#c8964f', { sw: 5 });
  rect(820, 810, 280, 36, '#dcab63', { sw: 4 });
  letter('EXPERT', 960, 920, 60, PAL.cream, { rot: -0.03 });
  camEnd();
  if (boom) {
    for (let i = 0; i < 7; i++) sparkle(1050 + hash(i) * 700, 260 + hash(i + 9) * 380 - ((lt - 3.7) * 60) % 60, 20 + hash(i + 3) * 18, i % 2 ? PAL.ochre : '#fff', t * 4 + i);
    sfx('ERROR!', 1380, 160, 110, PAL.red, lt - 3.7, { life: 1.3 });
    flash(Math.max(0, 0.35 - (lt - 3.7) * 1.2), '#fff');
  }
};

// 1986 — a seed under the snow: backpropagation
export const seed: ShotFn = (t, lt) => {
  const warm = ease(seg(lt, 3.1, 4.6));
  bg(mixCol('#c5d9e8', '#ffe2a8', warm), mixCol('#eaf1f6', '#fff4d8', warm));
  const horizon = 520;
  glow(960, horizon - 40, 520 * warm + 1, '#ffd070', 0.6 * warm);
  camBegin(960, lerp(640, 560, ease(seg(lt, 0, 5))), 1.02, 0);
  // snow ground (turns to grass)
  rect(-100, horizon, 2200, 220, mixCol('#f9fcff', '#9fd08a', warm), { sw: 4, lit: false });
  // soil cross-section
  rect(-100, horizon + 120, 2200, 700, '#7a5238', { sw: 4, lit: false });
  for (let i = 0; i < 30; i++) ell(hash(i * 3) * 1920, horizon + 160 + hash(i * 7) * 520, 6 + hash(i) * 10, 5 + hash(i + 3) * 7, '#5a3a28', { ink: null, lit: false, op: 0.7 });
  // backprop roots: signals flow BACKWARD (leaf -> trunk)
  const edges: [Pt, Pt][] = [
    [[960, 680], [960, 760]], [[960, 760], [740, 860]], [[960, 760], [1180, 860]], [[740, 860], [560, 970]], [[740, 860], [820, 990]],
    [[1180, 860], [1100, 990]], [[1180, 860], [1380, 960]], [[960, 760], [960, 900]],
  ];
  edges.forEach(([a, b], i) => {
    inkLine([a, b], 7, '#3fe0c8', false, 0.85);
    const p = frac(t * 0.9 + i * 0.17);
    const px = lerp(b[0], a[0], p);
    const py = lerp(b[1], a[1], p);
    glow(px, py, 40, '#ffe58a', 0.8);
    ell(px, py, 8, 8, '#fff6c0', { ink: null, lit: false });
  });
  [[740, 860], [1180, 860], [560, 970], [820, 990], [1100, 990], [1380, 960], [960, 900]].forEach(([x, y]) => ell(x, y, 17, 17, '#3fa7a0', { sw: 3, lit: false }));
  // sprout pushes up through the snow
  const grow = easeOut(seg(lt, 0.8, 3.4));
  const top = horizon + 150 - grow * 360;
  inkLine([[960, horizon + 160], [960 + Math.sin(t * 2) * 4, (horizon + 160 + top) / 2], [960 + Math.sin(t * 2) * 6, top]], 10, '#4f9a4a');
  if (grow > 0.3) ell(920, lerp(horizon + 150, top, 0.5), 44, 20, '#6fbf5f', { sw: 3, rot: -0.5 });
  if (grow > 0.5) ell(1000, lerp(horizon + 150, top, 0.7), 44, 20, '#6fbf5f', { sw: 3, rot: 0.5 });
  if (lt > 3.3) {
    const b = backOut(seg(lt, 3.3, 3.9));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + t;
      ell(960 + Math.cos(a) * 36 * b, top + Math.sin(a) * 36 * b, 24 * b, 24 * b, i % 2 ? PAL.rose : '#ffb0c0', { sw: 2, lit: false });
    }
    ell(960, top, 20 * b, 20 * b, PAL.ochre, { sw: 2, lit: false });
    sparkle(960 + Math.sin(t * 5) * 80, top - 60, 22, '#fff');
  }
  // sleeping Bit on the snow wakes when spring comes
  const m = mood(lt, [[0, 'closed', 'zzz'], [3.4, 'spark', 'spark']]);
  bit(420, horizon + 70, 17, { ...m, hat: 'scarf', mouth: lt > 3.4 ? 'grin' : 'flat', aR: lt > 3.6 ? 1.6 : -0.3, dy: lt > 3.6 ? -Math.abs(Math.sin(t * 8)) * 0.5 : 0 });
  // researcher with a candle keeps the faith
  human(1500, horizon + 90, 16, {
    era: 2,
    seed: 3,
    gray: 0.3,
    eyes: lt > 3.4 ? 'happy' : 'closed',
    mouth: 'smile',
    aR: 1.2,
    armR: (s) => {
      rect(-s * 0.3, -s * 1.7, s * 0.6, s * 1.8, '#fffaf0', { sw: 2, lit: false });
      glow(0, -s * 2.4, 120, '#ffd070', 0.6);
      ell(0, -s * 2.3, s * 0.35, s * 0.6 + Math.sin(t * 22) * 2, '#ffb030', { sw: 1.4, lit: false });
    },
  });
  camEnd();
  if (lt < 3.4) snow(t, 90, 120, 50, 0.85);
  void H;
  void W;
  void rr;
  void poly;
  void letter;
  void flash;
  void shake;
  void crt;
};
