import {
  g, W, PAL, TAU, bg, rect, ell, rr, poly, line, inkLine, letter, sfx, glow, camBegin, camEnd, lerp, ease, easeOut, backOut, seg, kf, hash, frac, pulse, starPts, mixCol,
} from '../engine/core';
import { bit, human, mood } from '../engine/chars';
import { cloud, sparkle, confetti } from '../engine/props';
import type { ShotFn } from './types';

function orbitIcon(kind: number, x: number, y: number, s: number) {
  ell(x, y, s, s, '#fffaf0', { sw: 4, lit: true });
  switch (kind) {
    case 0: // camera / eye
      ell(x, y, s * 0.6, s * 0.38, '#fff', { sw: 3, lit: false });
      ell(x, y, s * 0.26, s * 0.26, PAL.teal, { sw: 2, lit: false });
      ell(x, y, s * 0.1, s * 0.1, PAL.ink, { ink: null, lit: false });
      break;
    case 1:
      letter('\u266b', x, y, s * 1.1, PAL.violet, { ink: false });
      break;
    case 2:
      letter('...', x, y - s * 0.15, s * 1.2, PAL.rose, { ink: false });
      break;
    case 3:
      letter('</>', x, y, s * 0.7, PAL.indigo, { ink: false });
      break;
    default:
      line(x - s * 0.4, y + s * 0.4, x + s * 0.3, y - s * 0.4, 7, PAL.wood);
      ell(x + s * 0.4, y - s * 0.5, s * 0.22, s * 0.22, PAL.rose, { sw: 2, lit: false });
  }
}

// 2023–now — eyes, ears, hands: multimodal, then a swarm of helpful agents
export const multimodal: ShotFn = (t, lt) => {
  bg('#ffd9b8', '#a9d8f0');
  glow(960, 700, 800, '#fff6d8', 0.5);
  const zoom = kf(lt, [[0, 1.12], [2.4, 1.12], [3.8, 0.82]]);
  camBegin(960, kf(lt, [[0, 600], [2.4, 600], [3.8, 520]]), zoom, 0);
  rect(-200, 930, 2400, 400, '#8fcf9a', { sw: 4, lit: false });
  // orbiting abilities
  const absorb = seg(lt, 1.8, 2.5);
  for (let i = 0; i < 5; i++) {
    const a = t * 1.1 + (i / 5) * TAU;
    const r = lerp(1, 0.1, easeOut(absorb));
    const x = 960 + Math.cos(a) * 400 * r;
    const y = 520 + Math.sin(a) * 170 * r;
    if (absorb < 1) orbitIcon(i, x, y, 62 * (1 - absorb * 0.6) * (0.85 + 0.25 * Math.sin(a)));
  }
  const m = mood(lt, [[0, 'normal'], [2.0, 'spark', 'spark']]);
  bit(960, 940, 34, {
    ...m,
    hat: 'phones',
    mouth: 'grin',
    blush: true,
    lookX: Math.cos(t * 1.1),
    lookY: -0.3,
    aL: 1.0 + Math.sin(t * 5) * 0.3,
    aR: 1.0 - Math.sin(t * 5) * 0.3,
    dy: -Math.abs(Math.sin((t / 0.625) * Math.PI)) * 0.4,
  });
  // the helpers arrive
  const left = [330, 520, 710];
  left.forEach((x, i) => {
    const k = backOut(seg(lt, 2.5 + i * 0.25, 3.0 + i * 0.25));
    if (k <= 0) return;
    bit(x, 940 + (1 - k) * 200, 11, {
      hat: ['hard', 'grad', 'specs'][i],
      eyes: 'happy',
      mouth: 'grin',
      aL: 0.7,
      aR: 0.7,
      armR: (u) => {
        rr(-u * 0.4, -u * 2.4, u * 3.4, u * 2.4, 4, '#4a4e6a', { sw: 2.5, lit: false });
        rect(u * 0, -u * 2.1, u * 2.8, u * 1.8, '#8fd0ff', { ink: null, lit: false });
        if (Math.floor(t * 8 + i) % 2) line(u * 0.3, -u * 1.5, u * 1.9, -u * 1.5, 2.5, '#fff');
      },
      dy: -Math.abs(Math.sin((t / 0.625 + i * 0.3) * Math.PI)) * 0.4,
    });
  });
  const right = [1220, 1410, 1600];
  right.forEach((x, i) => {
    const k = backOut(seg(lt, 2.8 + i * 0.25, 3.3 + i * 0.25));
    if (k <= 0) return;
    // a tower of blocks they stack together
    const bk = Math.floor(seg(lt, 3.0, 5) * 7);
    if (i === 1)
      for (let b = 0; b < bk; b++) rr(1360 + (b % 2) * 14, 940 - (b + 1) * 52, 100, 50, 6, ['#e86a7e', '#4fb3c8', '#eab04a', '#8a6fc7'][b % 4], { sw: 3, lit: false });
    bit(x, 940 + (1 - k) * 200, 11, {
      hat: ['hard', 'beret', 'hard'][i],
      eyes: 'happy',
      mouth: 'grin',
      aL: 1.1 + Math.sin(t * 9 + i) * 0.5,
      aR: 0.6,
      dy: -Math.abs(Math.sin((t / 0.625 + i * 0.5) * Math.PI)) * 0.6,
      flip: i === 0,
    });
  });
  camEnd();
};

// 2024 — AlphaFold: proteins fold, medicine follows
export const science: ShotFn = (t, lt) => {
  bg('#e9f3f4', '#c3e3e6');
  glow(960, 500, 700, '#ffffff', 0.5);
  rect(-20, 880, W + 40, 220, '#b6a58c', { sw: 4, lit: false });
  // DNA helix
  for (let i = 0; i < 26; i++) {
    const y = 120 + i * 30;
    const a = i * 0.55 + t * 2.2;
    const x1 = 300 + Math.sin(a) * 90;
    const x2 = 300 - Math.sin(a) * 90;
    line(x1, y, x2, y, 4, '#8a8aa0', 0.7);
    ell(x1, y, 13 + Math.cos(a) * 3, 13, '#ff7a9a', { sw: 2, lit: false });
    ell(x2, y, 13 - Math.cos(a) * 3, 13, '#5ad8c8', { sw: 2, lit: false });
  }
  // the folding ribbon
  const N = 130;
  const fold = ease(seg(lt, 0.5, 3.3));
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const sx = 620 + (i / (N - 1)) * 700;
    const sy = 700 + Math.sin(i * 0.5 + t * 6) * 28 * (1 - fold);
    const a = i * 0.33;
    const r = 120 + 50 * Math.sin(i * 0.11);
    const fx = 960 + Math.cos(a) * r + Math.cos(a * 2.3) * 36;
    const fy = 480 + Math.sin(a) * r * 0.85 + Math.sin(a * 1.7) * 36;
    pts.push([lerp(sx, fx, fold), lerp(sy, fy, fold)]);
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const pass of [0, 1]) {
    for (let i = 0; i < N - 1; i++) {
      g.beginPath();
      g.moveTo(pts[i][0], pts[i][1]);
      g.lineTo(pts[i + 1][0], pts[i + 1][1]);
      g.lineWidth = pass ? 20 : 29;
      g.strokeStyle = pass ? `hsl(${(i / N) * 300 + 10},75%,62%)` : PAL.ink;
      g.stroke();
    }
  }
  // lab folk
  human(1500, 930, 19, { era: 5, gray: 0.7, seed: 8, eyes: lt > 3.2 ? 'star' : 'dot', mouth: 'smile', aL: lt > 3.2 ? 2.4 : 0.8, aR: lt > 3.2 ? 2.4 : 0.8, dy: lt > 3.2 ? -Math.abs(Math.sin((t / 0.625) * Math.PI)) * 0.7 : 0 });
  bit(1740, 930, 15, {
    hat: 'specs',
    eyes: 'happy',
    mouth: 'grin',
    aR: 1.0,
    armR: (u) => {
      rr(-u * 0.5, -u * 3.2, u * 1.0, u * 3.2, u * 0.5, 'rgba(200,235,255,.5)', { sw: 2.5, lit: false, op: 0.6 });
      rect(-u * 0.4, -u * 1.6, u * 0.8, u * 1.5, '#7ae8c8', { ink: null, lit: false });
    },
  });
  // test tubes bubbling on the bench
  for (let i = 0; i < 3; i++) {
    const x = 540 + i * 70;
    rr(x - 22, 780, 44, 120, 20, 'rgba(200,235,255,.5)', { sw: 3, lit: false, op: 0.6 });
    rect(x - 16, 830, 32, 60, ['#ff7a9a', '#5ad8c8', '#ffd24a'][i], { ink: null, lit: false });
    ell(x + Math.sin(t * 4 + i) * 6, 800 - ((t * 60 + i * 20) % 60), 5, 5, '#fff', { sw: 1.5, lit: false });
  }
  // the medal
  if (lt > 3.4) {
    const k = backOut(seg(lt, 3.4, 4.0));
    g.save();
    g.translate(1470, 300);
    g.scale(k, k);
    poly([[-40, -150], [-10, -150], [30, -20], [0, -20]], PAL.red, { sw: 3, lit: false });
    poly([[40, -150], [10, -150], [-30, -20], [0, -20]], '#2f6fd6', { sw: 3, lit: false });
    ell(0, 30, 80, 80, '#f4c542', { sw: 5 });
    ell(0, 30, 58, 58, '#fadf7a', { sw: 3, lit: false });
    poly(starPts(0, 30, 38, 0.45, 5), '#f4c542', { sw: 2.5, lit: false });
    g.restore();
    sparkle(1380 + Math.sin(t * 3) * 30, 220, 24, '#fff', t * 2);
    sparkle(1570, 340 + Math.cos(t * 3) * 20, 20, PAL.ochre, -t * 2);
  }
};

// the road ahead
export const future: ShotFn = (t, lt) => {
  bg('#8ecae6', '#ffd29a');
  glow(960, 560, 900, '#fff0b0', 0.7);
  const z = lerp(1, 1.16, ease(seg(lt, 0, 5)));
  camBegin(960, 560, z, 0);
  ell(960, 560, 150, 150, '#ffe9a0', { sw: 0, ink: null, lit: false });
  letter('?', 960, 480, 220, PAL.cream, { rot: Math.sin(t) * 0.05 });
  for (let i = 0; i < 4; i++) cloud(260 + i * 480 + Math.sin(t * 0.4 + i) * 30, 220 + (i % 2) * 120, 60, '#fffaf0');
  rect(-200, 560, 2400, 700, '#8fcf9a', { sw: 3, lit: false });
  poly([[935, 560], [985, 560], [1620, 1100], [300, 1100]], '#6a6a7a', { sw: 4, lit: false });
  for (let i = 0; i < 9; i++) {
    const p = (i + frac(t * 0.7)) / 9;
    const y = 560 + p * p * 520;
    const hh = 6 + p * p * 40;
    const w = 4 + p * p * 36;
    rect(960 - w / 2, y, w, hh, '#fff3da', { ink: null, lit: false });
  }
  // little sign posts along the road
  [[0, 'AGENTS'], [1, '?']].forEach(([s, txt]) => {
    const x = s === 0 ? 400 : 1500;
    rect(x - 8, 700, 16, 240, PAL.wood, { sw: 3, lit: false });
    rr(x - 110, 640, 220, 90, 14, '#fff3da', { sw: 4, lit: false });
    letter(txt as string, x, 685, txt === '?' ? 80 : 40, PAL.indigo, { ink: false });
  });
  // walking together
  const wk = t / 1.25;
  human(790, 960, 19, { era: 5, gray: 0.7, seed: 8, walk: wk, eyes: 'happy', mouth: 'smile', aR: 0.1, aL: -0.9, dy: -Math.abs(Math.sin(wk * Math.PI * 2)) * 0.25 });
  bit(1070, 960, 21, { walk: wk, eyes: 'happy', mouth: 'smile', aL: 0.05, aR: -0.9, dy: -Math.abs(Math.sin(wk * Math.PI * 2)) * 0.25, blush: true });
  camEnd();
  for (let i = 0; i < 14; i++) {
    const k = (t * 0.25 + hash(i)) % 1;
    sparkle(hash(i * 3) * W, 700 - k * 600, 8 + hash(i + 1) * 12, i % 2 ? '#fff' : PAL.ochre, t + i);
  }
  void sfx;
  void inkLine;
  void confetti;
  void pulse;
  void mixCol;
  void backOut;
};
