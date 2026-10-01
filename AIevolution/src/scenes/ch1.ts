import {
  g, W, H, PAL, TAU, bg, rect, ell, rr, poly, line, inkLine, letter, sfx, flash, camBegin, camEnd, lerp, ease, easeOut, backOut, seg, kf, pulse, hash, frac, mixCol, glow, shake,
} from '../engine/core';
import { bit, human, mood } from '../engine/chars';
import { hal, shakey, speech, sparkle } from '../engine/props';
import type { ShotFn } from './types';

const CHALK = '#ecf0e4';

// 1956 — Dartmouth summer: a few dreamers, one chalk doodle that wakes up
export const dartmouth: ShotFn = (t, lt) => {
  bg('#f3e0b6', '#e2b676');
  // window + light
  rr(1480, 110, 330, 430, 14, '#d4eaf0', { sw: 5 });
  line(1645, 110, 1645, 540, 4);
  line(1480, 325, 1810, 325, 4);
  glow(1645, 320, 380, '#fff8d0', 0.4);
  rect(-20, 850, W + 40, 260, '#a8794a', { sw: 4 });
  for (let i = 0; i < 9; i++) line(i * 240, 850, i * 240 - 60, H, 2.5, '#7d5530', 0.5);
  // hanging lamp
  line(800, -10, 800 + Math.sin(t * 1.4) * 14, 90, 3);
  glow(800 + Math.sin(t * 1.4) * 14, 120, 300, '#fff0b0', 0.4);
  ell(800 + Math.sin(t * 1.4) * 14, 105, 70, 28, '#3fa7a0', { sw: 3 });
  const z = lerp(1, 1.13, ease(seg(lt, 0, 5)));
  camBegin(W / 2 - 80, 540, z, 0);
  // chalkboard
  rr(235, 135, 1050, 620, 20, PAL.wood, { sw: 5 });
  rr(265, 165, 990, 560, 10, '#2f5d5a', { sw: 4, lit: false });
  letter('DARTMOUTH SUMMER', 760, 225, 56, CHALK, { ink: false, rot: -0.01 });
  letter('A.I.', 480, 420, 190, CHALK, { ink: false, rot: -0.05 });
  // chalk neuron doodles
  const nodes: [number, number][] = [[760, 340], [760, 460], [760, 580], [930, 400], [930, 520], [1100, 460]];
  nodes.forEach(([x, y], i) => {
    ell(x, y, 26, 26, null, { ink: CHALK, sw: 4, lit: false });
    nodes.forEach(([x2, y2], j) => {
      if (j > i && x2 > x && hash(i * 7 + j) > 0.35) line(x + 26, y, x2 - 26, y2, 2.5, CHALK, 0.7);
    });
  });
  // chalk Bit wakes up, then pops out of the board as the real thing
  const chalkOn = lt < 3.3 || (lt < 3.6 && Math.floor(lt * 20) % 2 === 0);
  if (chalkOn) {
    const m = mood(lt, [[0, 'closed', 'zzz'], [1.8, 'spark', 'spark']]);
    bit(1110, 700, 13, { ...m, col: '#dfe8dc', ink: CHALK, mouth: 'smile', noShadow: true, noLegs: true });
  }
  if (lt > 3.2 && lt < 3.9) {
    sparkle(1110, 600, 80 * (1 - seg(lt, 3.2, 3.9)), PAL.ochre, lt * 6);
    sparkle(1020, 650, 50 * (1 - seg(lt, 3.2, 3.9)), PAL.rose, -lt * 5);
  }
  // dreamers
  const xs = [1380, 1520, 1660, 1790];
  xs.forEach((x, i) => {
    const cheer = lt > 1.8 ? 1 : 0;
    const hop = cheer * Math.abs(Math.sin((t / 0.625 + i * 0.3) * Math.PI));
    human(x, 905, 17, {
      era: 0,
      seed: i + 1,
      dy: -hop * 1.2,
      aL: cheer ? 1.8 + Math.sin(t * 8 + i) * 0.4 : -0.4,
      aR: cheer ? 1.8 - Math.sin(t * 8 + i) * 0.4 : i % 2 ? 1.4 : -1,
      eyes: cheer ? 'happy' : 'dot',
      mouth: cheer ? 'grin' : 'flat',
      specs: i % 2 === 0,
    });
  });
  if (lt > 3.4) {
    const pop = backOut(seg(lt, 3.4, 3.9));
    const m = mood(lt, [[3.4, 'happy', 'heart']]);
    bit(1180 - (1 - pop) * 60, 905 - (1 - pop) * 200 * Math.max(0, Math.sin(pop * Math.PI)) * 0, 17, {
      ...m,
      hat: 'party',
      mouth: 'grin',
      aR: 1.5 + Math.sin(lt * 14) * 0.5,
      dy: -Math.abs(Math.sin(lt * 9)) * 0.6,
      blush: true,
    });
  }
  camEnd();
  // chalk dust
  g.fillStyle = '#fffdf0';
  for (let i = 0; i < 24; i++) {
    g.globalAlpha = 0.5;
    g.beginPath();
    g.arc(500 + hash(i) * 700, 300 + ((t * 40 + hash(i * 3) * 400) % 500), 2 + hash(i + 4) * 2, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
};

// 1966 — ELIZA: a chatbot therapist, typed one reply at a time
export const eliza: ShotFn = (t, lt) => {
  bg('#cfe6d8', '#a9d4bf');
  for (let i = 0; i < 28; i++) ell(((i % 7) + 0.5) * 290, (Math.floor(i / 7) + 0.5) * 230, 70, 70, null, { ink: '#e9a35a', sw: 8, lit: false, op: 1, edge: 0 });
  rect(-20, 880, W + 40, 220, '#c4876a', { sw: 4 });
  camBegin(lerp(900, 1030, ease(seg(lt, 0, 5))), 560, 1.06, 0);
  // couch (back), patient, couch seat
  rr(130, 500, 700, 230, 70, '#e98f55', { sw: 5 });
  human(480, 785, 17, { era: 1, seed: 11, noLegs: true, aL: 0.9, aR: -0.6, eyes: lt > 2.2 ? 'closed' : 'dot', mouth: lt > 2.2 ? 'wobble' : 'flat', noShadow: true });
  rr(110, 690, 740, 190, 50, '#f2a362', { sw: 5 });
  rr(70, 640, 120, 250, 50, '#e98f55', { sw: 5 });
  rr(780, 640, 120, 250, 50, '#e98f55', { sw: 5 });
  // teletype machine with paper spilling out
  const paperH = 80 + lt * 70;
  rr(980, 700, 240, 180, 16, '#8aa0b4', { sw: 5 });
  rect(1030, 700 - paperH, 140, paperH, '#fffaf0', { sw: 3, lit: false });
  for (let i = 0; i < paperH / 22; i++) line(1045, 700 - paperH + 16 + i * 22, 1045 + 60 + hash(i) * 60, 700 - paperH + 16 + i * 22, 3, '#6a6a7a', 0.8);
  ell(1100, 790, 18, 18, PAL.red, { sw: 3, lit: false });
  // therapist Bit in an armchair
  rr(1330, 500, 420, 380, 70, PAL.teal, { sw: 5 });
  const m = mood(lt, [[0, 'normal'], [2.1, 'happy', 'heart']]);
  bit(1540, 835, 21, { ...m, hat: 'specs', mouth: 'smile', noLegs: true, noShadow: true, aR: 0.2 + Math.sin(t * 3) * 0.1, armR: (u) => rect(0, -u * 1.3, u * 2.2, u * 2.8, '#fffaf0', { sw: 2, lit: false }), rot: Math.sin(t * 2) * 0.03 });
  rr(1310, 790, 460, 120, 50, '#4fbab2', { sw: 5 });
  rr(1280, 590, 90, 320, 40, PAL.teal, { sw: 5 });
  rr(1710, 590, 90, 320, 40, PAL.teal, { sw: 5 });
  camEnd();
  speech(1010, 150, 580, 100, 'HOW DO YOU FEEL?', { chars: (lt - 0.3) * 16, tx: 1500, ty: 380, pop: seg(lt, 0.3, 0.6) * (lt < 2.2 ? 1 : 0) });
  speech(200, 190, 300, 100, 'SAD.', { chars: (lt - 2.2) * 16, tx: 380, ty: 400, pop: seg(lt, 2.2, 2.5) * (lt < 3.4 ? 1 : 0) });
  speech(1010, 150, 580, 100, 'TELL ME MORE.', { chars: (lt - 3.4) * 16, tx: 1500, ty: 380, pop: seg(lt, 3.4, 3.7) });
};

// 1958–69 — the Perceptron lights up, Shakey rolls through the lab
export const shakeyShot: ShotFn = (t, lt) => {
  bg('#e4dfcf', '#c9c3ad');
  const cx = kf(lt, [[0, 760], [1.6, 760], [3.4, 1260]]);
  camBegin(cx, 560, 1, 0);
  // wall panel
  rect(-100, 0, 2700, 840, '#ded8c4', { sw: 0, ink: null, lit: false });
  // checkered floor
  for (let r = 0; r < 4; r++)
    for (let c = -2; c < 24; c++) {
      g.fillStyle = (r + c) % 2 ? '#7d8c9a' : '#c9d3d9';
      g.fillRect(c * 120, 840 + r * 70, 120, 70);
    }
  line(-100, 840, 2600, 840, 4);
  // perceptron: 5x5 photocell grid -> 3 neuron lamps -> output lamp
  rr(240, 220, 560, 560, 20, '#6a7d6e', { sw: 5 });
  const A = ['01110', '10001', '11111', '10001', '10001'];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 5; c++) {
      const on = A[r][c] === '1';
      const k = on ? 0.7 + 0.3 * Math.sin(t * 6 + r + c) : 0;
      rr(270 + c * 100, 250 + r * 100, 80, 80, 12, on ? mixCol('#3a4a3e', '#ffe58a', k) : '#3a4a3e', { sw: 3, lit: false });
    }
  letter('PERCEPTRON', 520, 160, 66, PAL.indigo, { rot: -0.02 });
  for (let i = 0; i < 3; i++) {
    const y = 330 + i * 150;
    inkLine([[800, 500], [900, y], [1000, y]], 4, '#a0522d');
    const on = Math.floor(t * 3 + i) % 3 === 0 || lt > 1.2;
    ell(1040, y, 44, 44, on ? '#ffd24a' : '#8a7a5a', { sw: 4, lit: false });
    if (on) glow(1040, y, 110, '#ffd24a', 0.5);
    inkLine([[1084, y], [1160, 480]], 4, '#a0522d');
  }
  const lit = lt > 1.5;
  ell(1190, 480, 60, 60, lit ? PAL.sap : '#6a7a5a', { sw: 5, lit: false });
  if (lit) {
    glow(1190, 480, 160, PAL.sap, 0.6);
    inkLine([[1160, 480], [1182, 505], [1225, 450]], 9, '#fff', true, 1);
  }
  // technician Bit
  bit(900, 900, 17, { ...mood(lt, [[0, 'normal'], [1.5, 'happy', 'spark']]), hat: 'hard', mouth: 'smile', aR: lt > 1.4 ? 1.6 + Math.sin(t * 12) * 0.4 : -0.5 });
  // Shakey rolls in with a block to push; Bit rides on top
  const sx = lerp(1350, 2150, ease(seg(lt, 1.2, 5)));
  const s = 26;
  rect(sx + 5.3 * s, 735, 130, 105, '#c98f55', { sw: 4 });
  line(sx + 5.3 * s, 735, sx + 5.3 * s + 130, 840, 3, '#7d5530');
  shakey(sx, 920, s, t, { roll: sx / 18 });
  bit(sx, 920 - 12 * s, 7.5, { eyes: 'happy', mouth: 'grin', aL: 1.6, aR: 1.6 + Math.sin(t * 10) * 0.5, rot: Math.sin(t * 9) * 0.04, noShadow: true, hat: 'party' });
  camEnd();
};

// 1968 — HAL watches. Bit gulps.
export const halShot: ShotFn = (t, lt) => {
  bg('#1b1024', '#43161e');
  const r = kf(lt, [[0, 170], [5.2, 250], [7.5, 2800]], (x) => x * x * x);
  const [sx, sy] = shake(t, lt > 5 ? (lt - 5) * 6 : 0);
  glow(960, 440, 900, '#ff2a2a', 0.18 + 0.1 * Math.sin(t * 3));
  camBegin(960 + sx, 520 + sy, 1, 0);
  // control panel
  rr(560, 110, 800, 640, 40, '#2b2d38', { sw: 6 });
  for (let i = 0; i < 12; i++) ell(610 + (i % 6) * 12, 160 + Math.floor(i / 6) * 14, 4, 4, i === Math.floor(t * 4) % 12 ? PAL.sap : '#4a4e5a', { ink: null, lit: false });
  for (let i = 0; i < 12; i++) ell(1260 + (i % 6) * 12, 160 + Math.floor(i / 6) * 14, 4, 4, hash(i + Math.floor(t * 3)) > 0.5 ? PAL.ochre : '#4a4e5a', { ink: null, lit: false });
  hal(960, 440, r, t);
  // red scan band over Bit
  rect(0, 640, W, H, null, { ink: null });
  const scan = (lt * 0.9) % 1;
  g.globalAlpha = 0.18;
  g.fillStyle = '#ff3b2f';
  g.fillRect(250 + scan * 500, 600, 28, 400);
  g.globalAlpha = 1;
  const m = mood(lt, [[0, 'scared', 'sweat'], [3.2, 'x', '!?'], [4.6, 'scared', '!']]);
  const quake = Math.sin(t * 40) * 0.03;
  bit(480, 905, 17, { ...m, mouth: lt > 4.4 ? 'O' : 'wobble', lookX: 0.6, lookY: -1, rot: quake, hat: 'party' });
  camEnd();
  const k = seg(lt, 2.4, 4.4);
  if (k > 0) letter("I'M SORRY, BIT.".slice(0, Math.floor(k * 15)) + (k < 1 ? '_' : ''), 1130, 850, 62, '#ff5a4a', { rot: -0.015 });
  if (lt > 6.2) flash(seg(lt, 6.2, 7.4), '#ff4a3a');
  void coinless;
  void poly;
  void sfx;
  void easeOut;
  void pulse;
  void frac;
  void rr;
  void H;
};
const coinless = 0;
