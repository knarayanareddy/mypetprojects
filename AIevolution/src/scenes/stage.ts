import {
  g, W, H, PAL, TAU, bg, rect, ell, poly, rr, line, inkLine, letter, sfx, flash, iris, camBegin, camEnd, shake, lerp, ease, easeOut, backOut, seg, kf, pulse, wob, frac, BEAT, hash, mixCol, rgba, glow, starPts, heartPts,
} from '../engine/core';
import { bit, human, dancer, mood } from '../engine/chars';
import { curtains, valance, stageFloor, spotBeams, rays, meter, confetti, hal, shakey, roomba, deepBlue, watson, balloon, stars } from '../engine/props';
import type { ShotFn } from './types';

// =====================================================================
// 0 · Curtain up
// =====================================================================
export const intro: ShotFn = (t, lt) => {
  bg('#f9e6b8', '#eab872');
  rays(W / 2, 560, 20, t * 0.04, 1800, '#f4c77c', '#fbe3a8', 0.4);
  // title is painted on the backdrop
  letter('TEACHING THE', W / 2, 250, 112, PAL.rose, { rot: -0.025 });
  letter('SAND TO THINK', W / 2, 400, 160, PAL.teal, { rot: 0.015 });
  letter('60+ YEARS OF A.I.', W / 2, 560, 62, PAL.indigo, { rot: -0.01 });
  stars(t, 0);
  stageFloor(760, '#c98f55');
  // trapdoor
  ell(W / 2, 905, 170, 30, '#2a1e2a', { sw: 3, lit: false });
  const pop = backOut(seg(lt, 2.5, 3.3));
  const by = 905 + (1 - pop) * 330;
  if (lt > 2.4) {
    const m = mood(lt, [[0, 'normal'], [3.6, 'spark', 'spark']]);
    bit(W / 2, by, 24, { ...m, aR: lt > 3.4 ? 1.5 + Math.sin(lt * 14) * 0.5 : -0.9, mouth: 'grin', blush: true, hat: 'party', noShadow: true });
  }
  // stage lip hides the bottom of the hole
  rect(W / 2 - 230, 915, 460, 120, '#b57d46', { sw: 3.5, lit: false });
  curtains(ease(seg(lt, 0.3, 2.4)), t);
  valance();
  spotBeams(t, 3, '#fff3b0', 0.18, 90);
  if (lt > 3.5) confetti(t, 40, 200, W - 200, -50, 800, 1, 260);
};

// =====================================================================
// Chorus: the same stage returns after every chorus, escalating each time
// party -> pyro + machines -> flood of pages -> golden finale
// =====================================================================
const MV: [number, number][] = [[8, 34], [34, 61], [61, 86], [86, 100]];
const BG: [string, string, string, string][] = [
  ['#f3a08e', '#f6d38a', '#f6c0b0', '#fbe0a0'],
  ['#4a3a7a', '#c46a7a', '#6a4a9a', '#e08a7a'],
  ['#1f5a64', '#4aa0a0', '#2f7a84', '#79c4b8'],
  ['#8a2a3a', '#eaa64a', '#b4405a', '#f6cc70'],
];

function page(x: number, y: number, s: number, rot: number) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = '#fffaf0';
  g.strokeStyle = PAL.ink;
  g.lineWidth = 2;
  g.fillRect(-18 * s, -24 * s, 36 * s, 48 * s);
  g.strokeRect(-18 * s, -24 * s, 36 * s, 48 * s);
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(-12 * s, (-16 + i * 8) * s);
    g.lineTo((i % 2 ? 6 : 12) * s, (-16 + i * 8) * s);
    g.stroke();
  }
  g.restore();
}

export const chorus = (level: number, phase: number): ShotFn => (t, lt) => {
  const ct = lt + (phase ? 7.5 : 0);
  const bp = ct / BEAT;
  const [c1, c2, r1, r2] = BG[level];
  bg(c1, c2);
  rays(W / 2, 520, 22, t * 0.06, 2000, r1, r2, 0.55);
  if (level === 2) {
    for (let i = 0; i < 26; i++) {
      const x = hash(i * 3.3) * W;
      const y = (hash(i * 5.1) * H + t * (80 + hash(i) * 120)) % (H + 80) - 40;
      page(x, y, 1.2 + hash(i * 9) * 1, t * (hash(i) - 0.5) * 2 + i);
    }
  }
  if (level === 3) stars(t, 40, H * 0.5, '#fff6c8');
  // camera
  const push = phase === 0 ? lerp(1, 1.1, ease(seg(lt, 0, 7.5))) : 1.08 + pulse(t, 7) * 0.05;
  const rot = phase === 0 ? 0 : Math.sin(lt * 2.4) * 0.035;
  const [sx, sy] = shake(t, phase && level === 3 && lt < 1 ? 16 : pulse(t, 8) * 3);
  camBegin(W / 2 + sx, 590 + sy, push, rot);
  curtains(1, t, level === 2 ? '#2a5a64' : '#c23b4e');
  stageFloor(800, level === 2 ? '#7a8c8c' : '#c98f55');
  spotBeams(t, 4, '#fff6c0', 0.16, 0);
  if (level === 0) {
    balloon(110, 360 + Math.sin(t * 1.3) * 14, 46, PAL.rose);
    balloon(1810, 330 + Math.sin(t * 1.1) * 14, 50, PAL.teal);
    balloon(1700, 260 + Math.sin(t * 1.7) * 14, 40, PAL.ochre);
  }

  // meter + pump
  const [v0, v1] = MV[level];
  let val: number;
  if (phase === 0) {
    const k = (Math.floor(bp) + easeOut(frac(bp) * 3)) / 12;
    val = lerp(v0, v1, Math.min(1, k));
  } else val = v1;
  const pk = phase === 0 ? easeOut(1 - frac(bp)) : 0.5;
  const burst = level === 3 && phase === 1 ? seg(lt, 0, 1.1) : 0;
  meter(250 + (burst > 0 && burst < 1 ? Math.sin(lt * 90) * 4 : 0), 870, 430, val, pk, burst > 0 && burst < 1 ? burst : 0);
  // the researcher pumps (ages through the decades)
  const era = [0, 2, 4, 5][level];
  const dn = phase === 0 ? easeOut(1 - frac(bp)) : 0.5;
  human(590, 890, 22, {
    era,
    gray: [0, 0.1, 0.4, 0.7][level],
    dy: phase === 0 ? -Math.abs(Math.sin(bp * Math.PI)) * 0.2 : -Math.abs(Math.sin(bp * Math.PI)) * 0.7,
    aL: phase === 0 ? 0.4 + dn * 0.7 : 2.4 + Math.sin(bp * 3) * 0.3,
    aR: phase === 0 ? 0.4 + dn * 0.7 : 2.4 - Math.sin(bp * 3) * 0.3,
    eyes: level === 3 && phase === 1 ? 'star' : lt < 0.5 && phase === 0 ? 'scared' : 'happy',
    mouth: 'grin',
    sweat: level === 2 ? 0.8 : 0,
  });

  // the machines of earlier verses join the band
  const slots = [1330, 1500, 1670, 1830];
  const slotKinds: string[][] = [
    ['bit', 'bit', 'bit', 'bit'],
    ['shakey', 'bit', 'roomba', 'bit'],
    ['deep', 'watson', 'shakey', 'roomba'],
    ['deep', 'watson', 'shakey', 'roomba'],
  ];
  const hats = ['party', 'grad', 'hard', 'beret'];
  slots.forEach((x, i) => {
    const k = slotKinds[level][i];
    const hop = Math.abs(Math.sin((bp + i * 0.3) * Math.PI));
    if (k === 'bit') dancer(x, 890, 14, ['hop', 'sway', 'stomp', 'shimmy'][i], t, { hat: hats[i], mouth: 'smile', eyes: 'happy' }, i);
    if (k === 'shakey') shakey(x, 890 - hop * 12, 14, t, { roll: bp * 3 });
    if (k === 'roomba') roomba(x, 870 - hop * 14, 78, t, { spin: t * 6 });
    if (k === 'deep') deepBlue(x, 890, 14, t);
    if (k === 'watson') watson(x, 890 - hop * 10, 15, t);
  });
  if (level >= 1) {
    dancer(760, 890, 15, 'hop', t, { hat: 'phones', eyes: 'happy', mouth: 'grin' }, 3);
    dancer(1190, 890, 15, 'stomp', t, { hat: 'specs', eyes: 'happy', mouth: 'grin' }, 4);
  }
  if (level >= 2) {
    inkLine([[1700, -40], [1700 + Math.sin(t * 2) * 12, 100]], 3, '#5a4a5a');
    hal(1700 + Math.sin(t * 2) * 12, 170, 62, t);
  }

  // the star: Bit
  const style = phase === 0 ? 'hop' : level % 2 ? 'roof' : 'spin';
  const mv = dancer;
  mv(960, 900, 32, style, t, {
    eyes: level === 3 && phase === 1 ? 'spark' : 'happy',
    mouth: 'grin',
    blush: true,
    hat: ['party', ['shades', 'phones'], 'grad', 'crown'][level] as string | string[],
    bulb: level === 3 ? '#ff6a8a' : undefined,
  });
  camEnd();

  // per-level pyro
  if (level >= 1) {
    for (const bx of [150, 1770]) {
      for (let i = 0; i < 14; i++) {
        const age = (t * 1.7 + i / 14) % 1;
        const x = bx + Math.sin(i * 7 + t * 5) * 36 * age;
        const y = 860 - age * 420 * (0.6 + 0.4 * hash(i));
        g.globalAlpha = 0.85 * (1 - age * 0.5);
        g.fillStyle = mixCol('#ffd24a', '#e8452a', age);
        g.beginPath();
        g.arc(x, y, (1 - age) * 34 + 8, 0, TAU);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  // overlays
  if (level === 0 && phase === 0 && lt < 1.3) iris(W / 2, 540, easeOut(lt / 1.3) * 1500, '#6a1a1a');
  else if (phase === 0 && lt < 0.25) flash(1 - lt / 0.25);
  if (phase === 1) {
    confetti(t, level === 3 ? 90 : 45, 0, W, -50, H + 50, level, 300);
    if (level === 3) {
      sfx('BOOM', W / 2, 330, 150, PAL.red, lt, { life: 1.5 });
      for (let i = 0; i < 9; i++) {
        const k = (t * 0.4 + i / 9) % 1;
        poly(heartPts(200 + hash(i) * 1500, 900 - k * 800, 22), PAL.rose, { sw: 2, curv: true, lit: false, op: 1 - k });
      }
    }
  }
  if (phase === 1 && lt < 0.15) flash(0.6 * (1 - lt / 0.15), '#fff');
  void wob;
  void backOut;
  void glow;
  void rgba;
  void starPts;
  void line;
  void kf;
};

// =====================================================================
// Finale: the camera pulls back and the whole history was a stage show
// =====================================================================
export const finale: ShotFn = (t, lt) => {
  bg('#f7d9a0', '#e08a5a');
  rays(W / 2, 520, 24, t * 0.04, 2000, '#f3b878', '#fbe3a8', 0.5);
  const zoom = kf(lt, [[0, 3.1], [3.6, 1]], easeOut);
  const cy = kf(lt, [[0, 700], [3.6, 560]], easeOut);
  const [sx, sy] = shake(t, lt < 0.2 ? 6 : 0);
  camBegin(W / 2 + sx, cy + sy, zoom, 0);
  stageFloor(800, '#c98f55');
  spotBeams(t, 4, '#fff6c0', 0.15, 0);
  // audience silhouettes at the bottom
  for (let i = 0; i < 18; i++) {
    const x = 60 + i * 110;
    const y = 1075 + Math.abs(Math.sin((t / BEAT + i * 0.4) * Math.PI)) * -12;
    g.fillStyle = '#3a2a45';
    g.beginPath();
    g.arc(x, y - 70, 38, 0, TAU);
    g.fill();
    g.fillRect(x - 55, y - 40, 110, 120);
  }
  // line-up
  const items = ['h0', 'shakey', 'h1', 'roomba', 'h2', 'bit', 'deep', 'h3', 'watson', 'h4', 'h5'];
  items.forEach((k, i) => {
    const x = 210 + i * 118;
    const tb = 3.6 + (i < 5 ? i : 10 - i) * 0.35 + 0.4;
    const bow = Math.sin(seg(lt, tb, tb + 0.9) * Math.PI);
    const hop = Math.abs(Math.sin((t / BEAT + i * 0.2) * Math.PI));
    if (k[0] === 'h') {
      const era = +k[1];
      human(x, 880, 11.5, { era, gray: era * 0.14, rot: bow * 0.55, aL: -0.4 + hop * 1.2, aR: -0.4 + hop * 1.2, eyes: 'happy', mouth: 'grin', dy: -hop * 0.4 });
    } else if (k === 'bit') {
      bit(x, 890, 22, { rot: bow * 0.6, eyes: 'happy', mouth: 'grin', blush: true, hat: 'crown', aL: 1.6 + hop, aR: 1.6 + hop, dy: -hop * 0.8 });
    } else if (k === 'shakey') shakey(x, 880 - bow * 20 - hop * 8, 13, t, { roll: 0 });
    else if (k === 'roomba') roomba(x, 865 - hop * 14, 62, t, { spin: t * 5 });
    else if (k === 'deep') deepBlue(x, 880, 13, t);
    else if (k === 'watson') watson(x, 880 - hop * 8, 14, t);
  });
  // HAL hangs from a string: it was a puppet all along
  inkLine([[1500, -60], [1500 + Math.sin(t * 2) * 8, 90]], 3, '#5a4a5a');
  hal(1500 + Math.sin(t * 2) * 8, 165, 58, t, { dim: 0.7 });

  // the meter resets, and a kid takes the pump
  const val = lt < 6.4 ? 100 : lt < 7.2 ? lerp(100, 12, ease(seg(lt, 6.4, 7.2))) : lerp(12, 26, Math.min(1, ((lt - 7.6) / BEAT) / 6));
  const kidX = lerp(2050, 1860, easeOut(seg(lt, 6.5, 8.2)));
  const pk = lt > 8.2 ? easeOut(1 - frac(t / BEAT)) : 0.5;
  meter(1590, 880, 380, val, pk);
  if (lt > 6.3) {
    human(kidX, 890, 8.5, { era: 5, gray: 0, skin: '#e0a97a', hair: '#4a3a55', eyes: 'star', mouth: 'grin', aL: 0.5 + pk, aR: 0.5 + pk, specs: false, dy: lt > 8.2 ? -Math.abs(Math.sin(t / BEAT * Math.PI)) * 0.2 : 0 });
  }
  camEnd();

  // curtain closes
  const open = 1 - ease(seg(lt, 10, 11.7));
  if (lt > 9.9) {
    curtains(open, t);
    valance();
  } else {
    curtains(1, t);
    valance();
  }
  if (lt > 11.6) {
    letter('TO BE CONTINUED\u2026', W / 2, 470, 110, PAL.cream, { pop: seg(lt, 11.6, 12.2), rot: -0.03 });
  }
  if (lt < 6) confetti(t, 40, 0, W, -50, H + 50, 7, 160);
  void rr;
  void ell;
  void hash;
  void rect;
  void H;
  void line;
  void dancer;
};
