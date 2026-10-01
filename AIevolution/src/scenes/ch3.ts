import {
  g, W, H, PAL, TAU, bg, rect, ell, rr, poly, line, inkLine, letter, sfx, flash, iris, camBegin, camEnd, lerp, ease, easeOut, backOut, seg, kf, hash, frac, glow, shake, rgba,
} from '../engine/core';
import { bit, human, mood, mini } from '../engine/chars';
import { deepBlue, watson, roomba, cat, confetti, sky, cloud, spotBeams } from '../engine/props';
import type { ShotFn } from './types';

function piece(x: number, y: number, s: number, col: string, kind: string) {
  ell(x, y, s * 1.1, s * 0.4, col, { sw: 2.4, lit: false });
  if (kind === 'knight') {
    poly([[x - s * 0.7, y], [x - s * 0.5, y - s * 1.6], [x - s * 0.1, y - s * 2.3], [x + s * 0.9, y - s * 1.6], [x + s * 0.6, y - s * 1.3], [x + s * 0.4, y - s * 1.1], [x + s * 0.7, y]], col, { sw: 2.4, lit: false });
    ell(x - s * 0.05, y - s * 1.7, s * 0.14, s * 0.14, PAL.ink, { ink: null, lit: false });
  } else {
    rr(x - s * 0.45, y - s * 1.2, s * 0.9, s * 1.2, s * 0.3, col, { sw: 2.4, lit: false });
    ell(x, y - s * 1.5, s * 0.55, s * 0.55, col, { sw: 2.4, lit: false });
  }
}

// 1997 — Deep Blue beats the world champion
export const deepBlueShot: ShotFn = (t, lt) => {
  bg('#d5e1ef', '#9fb6d6');
  spotBeams(t, 3, '#fff6c8', 0.2, -10);
  const mate = lt > 2.4;
  const [sx, sy] = shake(t, mate && lt < 2.9 ? 12 : 0);
  camBegin(960 + sx, 600 + sy, lerp(1, 1.12, ease(seg(lt, 0, 5))), 0);
  rect(-100, 900, 2200, 400, '#6a7d9a', { sw: 4, lit: false });
  // board in perspective
  for (let r = 0; r < 8; r++) {
    const y0 = 600 + r * 30;
    const y1 = y0 + 30;
    const w0 = lerp(760, 1000, (y0 - 600) / 240);
    const w1 = lerp(760, 1000, (y1 - 600) / 240);
    for (let c = 0; c < 8; c++) {
      g.fillStyle = (r + c) % 2 ? '#7a4a30' : '#f1dcb0';
      g.beginPath();
      g.moveTo(960 - w0 / 2 + (c * w0) / 8, y0);
      g.lineTo(960 - w0 / 2 + ((c + 1) * w0) / 8, y0);
      g.lineTo(960 - w1 / 2 + ((c + 1) * w1) / 8, y1);
      g.lineTo(960 - w1 / 2 + (c * w1) / 8, y1);
      g.fill();
    }
  }
  poly([[580, 600], [1340, 600], [1460, 840], [460, 840]], null, { sw: 5, lit: false });
  rr(440, 840, 1040, 50, 10, PAL.wood, { sw: 4 });
  // pieces
  [[720, 640], [820, 640], [1100, 640], [1200, 640]].forEach(([x, y], i) => piece(x, y, 17, '#2b2638', i === 3 ? 'knight' : 'pawn'));
  [[700, 790], [800, 790], [1110, 790], [1220, 790]].forEach(([x, y]) => piece(x, y, 22, '#fff3da', 'pawn'));
  // black knight moved by the machine's arm
  const arm = ease(seg(lt, 1.2, 2.2));
  const kx = lerp(1000, 960, arm);
  const ky = lerp(700, 735, arm);
  piece(kx, ky, 22, '#2b2638', 'knight');
  // Bit as the white king in a crown
  const dead = mate;
  bit(900, 760 + (dead ? 28 : 0), 7.5, { hat: 'crown', eyes: dead ? 'x' : 'scared', mouth: dead ? 'wobble' : 'o', rot: dead ? 1.3 : Math.sin(t * 30) * 0.04, noLegs: dead, noShadow: true });
  camEnd();
  // the machine and its arm
  deepBlue(1600, 960, 24, t);
  const ax = lerp(1480, 1060, arm);
  const ay = lerp(760, 680, arm);
  inkLine([[1500, 700], [(1500 + ax) / 2, 560], [ax, ay]], 14, '#4a4e60');
  ell(ax, ay, 22, 22, '#8a929e', { sw: 4, lit: false });
  // champion tears out his hair
  const m = mood(lt, [[0, 'dot'], [2.4, 'scared', '!!']]);
  human(360, 960, 21, {
    era: 3,
    seed: 6,
    eyes: m.eyes === 'scared' ? 'scared' : 'dot',
    mouth: mate ? 'o' : 'flat',
    sweat: 1,
    aL: mate ? 2.7 : 1.2,
    aR: mate ? 2.7 : -0.5,
    rot: mate ? Math.sin(t * 20) * 0.05 : 0,
    dy: mate ? -Math.abs(Math.sin(t * 9)) * 0.5 : 0,
  });
  if (mate) sfx('CHECKMATE', 960, 330, 112, PAL.red, lt - 2.4, { life: 1.9 });
};

// 2005 — the desert race, then a robot vacuum conquers the living room
export const roombaShot: ShotFn = (t, lt) => {
  if (lt < 2.7) {
    sky('#9fd8f0', '#f9e0a8');
    glow(1500, 250, 340, '#fff0b0', 0.7);
    ell(1500, 250, 80, 80, '#ffe58a', { sw: 3, lit: false });
    const sc = t * 340;
    // parallax mountains
    for (let l = 0; l < 2; l++) {
      const off = (sc * (0.1 + l * 0.12)) % 900;
      for (let i = -1; i < 4; i++) {
        const x = i * 900 - off;
        poly([[x, 700], [x + 260 + l * 40, 420 + l * 80], [x + 450, 620], [x + 620, 380 + l * 90], [x + 900, 700]], l ? '#d79a68' : '#e8b88a', { sw: 3, lit: false });
      }
    }
    rect(-20, 700, W + 40, 400, '#efc88a', { sw: 3, lit: false });
    poly([[0, 1080], [W, 1080], [W, 900], [0, 900]], '#6a6a7a', { sw: 4, lit: false });
    for (let i = 0; i < 9; i++) rect(((i * 260 - sc * 1.3) % 2340) - 200, 985, 120, 14, '#fff3da', { sw: 2, lit: false });
    // self-driving car with spinning sensor
    const bob = Math.sin(t * 20) * 3;
    const cx = 880;
    const cy = 830 + bob;
    for (let i = 0; i < 6; i++) ell(cx - 260 - i * 60 - ((t * 200) % 60), cy + 60 - i * 8, 30 + i * 8, 24 + i * 6, 'rgba(235,205,160,.6)', { ink: null, lit: false, op: 0.6 - i * 0.08 });
    rr(cx - 230, cy - 120, 460, 150, 50, '#f2a362', { sw: 5 });
    rr(cx - 120, cy - 210, 270, 110, 40, '#f2a362', { sw: 5 });
    rr(cx - 100, cy - 195, 100, 80, 20, '#cfe8f5', { sw: 3, lit: false });
    rr(cx + 20, cy - 195, 110, 80, 20, '#cfe8f5', { sw: 3, lit: false });
    bit(cx - 50, cy - 80, 9, { hat: 'shades', mouth: 'grin', noLegs: true, noShadow: true, aR: 1.2 });
    rr(cx - 30, cy - 250, 60, 40, 10, '#4a4e60', { sw: 4, lit: false });
    const a = t * 14;
    line(cx, cy - 235, cx + Math.cos(a) * 80, cy - 235 + Math.sin(a) * 14, 5, PAL.red);
    ell(cx + Math.cos(a) * 80, cy - 235 + Math.sin(a) * 14, 8, 8, PAL.red, { ink: null, lit: false });
    for (const wx of [cx - 140, cx + 140]) {
      ell(wx, cy + 36, 54, 54, '#3b3a46', { sw: 5, lit: false });
      ell(wx, cy + 36, 24, 24, '#c9ced6', { sw: 3, lit: false });
      line(wx, cy + 36, wx + Math.cos(t * 22) * 22, cy + 36 + Math.sin(t * 22) * 22, 4);
    }
    // cacti zoom past in the foreground
    for (let i = 0; i < 3; i++) {
      const x = ((i * 880 - sc * 2.3) % 2640 + 2640) % 2640 - 300;
      rr(x, 640, 60, 300, 30, '#6fb06a', { sw: 4 });
      rr(x - 50, 740, 40, 100, 20, '#6fb06a', { sw: 4 });
      rr(x + 70, 710, 40, 110, 20, '#6fb06a', { sw: 4 });
    }
    iris(W / 2, 540, (1 - seg(lt, 2.2, 2.7)) * 1500, '#2b2638');
  } else {
    bg('#f8dcc6', '#f1c3a0');
    rect(-20, 800, W + 40, 300, '#c98f55', { sw: 4 });
    for (let i = 0; i < 10; i++) line(i * 220, 800, i * 220 - 80, H, 2.5, '#8a5a30', 0.4);
    // window + plant + couch
    rr(1300, 150, 400, 360, 14, '#d4eaf0', { sw: 5 });
    line(1500, 150, 1500, 510, 4);
    ell(240, 690, 80, 56, '#8a5a3a', { sw: 4 });
    for (let i = 0; i < 5; i++) ell(240 + (i - 2) * 40, 580 - Math.abs(i - 2) * 20, 28, 80, '#5fa860', { sw: 3, rot: (i - 2) * 0.3 });
    rr(1250, 560, 520, 260, 60, '#8a6fc7', { sw: 5 });
    rr(1220, 640, 580, 180, 50, '#a287d9', { sw: 5 });
    cat(1500, 640, 22, { eyes: 'scared', dy: Math.sin(t * 40) * 1.5, flip: true });
    // dust bunnies get eaten
    const rx = kf(lt, [[2.7, 200], [3.6, 800], [4.4, 560], [5, 1000]]);
    const ry = 940;
    for (let i = 0; i < 8; i++) {
      const x = 360 + i * 140;
      if (x > rx + 40) ell(x, 930 + hash(i) * 20, 22, 16, '#bdb6c0', { sw: 2, lit: false });
    }
    // Bit surfs on the Roomba
    roomba(rx, ry, 130, t, { spin: t * 10 });
    bit(rx, ry - 36, 12, { hat: 'party', eyes: 'happy', mouth: 'grin', aL: 1.2 + Math.sin(t * 12) * 0.5, aR: 1.2 - Math.sin(t * 12) * 0.5, rot: Math.sin(t * 6) * 0.1, noShadow: true });
    iris(W / 2, 540, seg(lt, 2.7, 3.2) < 1 ? seg(lt, 2.7, 3.2) * 1500 + 1 : 9999, '#2b2638');
    sfx('VROOM', 1000, 400, 100, PAL.teal, lt - 3.6, { life: 1.3 });
  }
};

// 2011 — Watson wins Jeopardy!
export const watsonShot: ShotFn = (t, lt) => {
  bg('#2b3d96', '#6a4aa8');
  spotBeams(t, 5, '#bfe0ff', 0.2, -10);
  // clue board
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++) {
      const on = hash(r * 7 + c + Math.floor(t * 1.2)) > 0.1;
      rr(190 + c * 262, 70 + r * 100, 244, 86, 8, on ? '#1f35a8' : '#0f1f6a', { sw: 3, lit: false });
      if (on) letter(`$${(r + 1) * 200}`, 190 + c * 262 + 122, 70 + r * 100 + 44, 46, '#f4c542', { ink: false });
    }
  camBegin(960, 560, lerp(1.0, 1.08, ease(seg(lt, 0, 5))), 0);
  rect(-100, 940, 2200, 300, '#202d78', { sw: 4, lit: false });
  const win = lt > 3.3;
  // human champions
  [[460, 4, 'dot'], [1460, 3, 'dot']].forEach(([x, era], i) => {
    human(x as number, 940, 18, { era: era as number, seed: 30 + i, noLegs: true, eyes: win ? 'scared' : 'dot', mouth: win ? 'o' : 'flat', sweat: 1, aL: win ? 2.6 : 0.4, aR: win ? 2.6 : 0.4 });
    rr((x as number) - 130, 760, 260, 190, 14, '#3a56c8', { sw: 5 });
    rr((x as number) - 100, 790, 200, 60, 8, '#0f1f4d', { sw: 3, lit: false });
  });
  // Watson and Bit with the buzzer
  watson(960, 940, 25, t);
  const m = mood(lt, [[0, 'normal'], [2.6, 'spark', 'spark']]);
  bit(990, 940 - 9 * 25 + 4, 8, { ...m, hat: 'party', mouth: 'grin', noShadow: true, aR: 1.5 + Math.sin(t * 20) * 0.3, armR: (u) => ell(u * 0.9, -u * 0.5, u * 1.1, u * 0.9, PAL.red, { sw: 2, lit: false }) });
  camEnd();
  // scores tick up
  const ws = Math.floor(lerp(0, 77147, ease(seg(lt, 1, 3.6))));
  letter('$' + ws.toLocaleString('en-US'), 960, 905, 60, '#f4c542', { rot: -0.02 });
  letter('$24,000', 460, 905, 46, '#fff3da', { rot: 0.02 });
  letter('$21,600', 1460, 905, 46, '#fff3da', { rot: -0.02 });
  if (win) {
    confetti(t, 70, 0, W, -50, H + 50, 4, 320);
    for (let i = 0; i < 8; i++) mini(120 + i * 240, 1085, 13, 40 + i, { cheer: 1 });
    sfx('DING!', 960, 330, 120, PAL.ochre, lt - 3.3, { life: 1.6 });
  }
  void frac;
  void rgba;
  void TAU;
  void cloud;
  void backOut;
  void easeOut;
  void flash;
  void W;
  void rect;
};
