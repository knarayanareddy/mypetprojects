import {
  g, W, H, T, PAL, TAU, ell, rr, rect, poly, line, inkLine, letter, glow, hash, wob, pulse, clamp, mixCol, shade, rgba, starPts, heartPts, lerp, ease, seg, backOut, FONT,
} from './core';
import type { Pt } from './core';

const CONF = ['#e86a7e', '#eab04a', '#3fa7a0', '#8a6fc7', '#7db56a', '#4fb3c8', '#fff3da'];

export function confetti(t: number, n: number, x0 = 0, x1 = W, y0 = -50, y1 = H + 50, seed = 0, speed = 220) {
  for (let i = 0; i < n; i++) {
    const hh = hash(i * 1.7 + seed);
    const x = x0 + hash(i * 3.3 + seed) * (x1 - x0) + Math.sin(t * 2 + i) * 24;
    const span = y1 - y0;
    const y = y0 + ((t * speed * (0.6 + hh * 0.7) + hash(i * 5.1 + seed) * span) % span);
    g.save();
    g.translate(x, y);
    g.rotate(t * (hh * 6 - 3) + i);
    g.scale(1, Math.cos(t * 5 + i));
    g.fillStyle = CONF[i % CONF.length];
    g.globalAlpha = 0.95;
    g.fillRect(-7, -4, 14, 8);
    g.restore();
  }
  g.globalAlpha = 1;
}

export function snow(t: number, n: number, speed = 120, wind = 40, a = 0.9) {
  g.fillStyle = '#ffffff';
  for (let i = 0; i < n; i++) {
    const hh = hash(i * 2.3);
    const x = (hash(i * 7.7) * (W + 200) + t * wind * (0.5 + hh) + Math.sin(t + i) * 20) % (W + 200) - 100;
    const y = (hash(i * 4.1) * H + t * speed * (0.5 + hh)) % (H + 40) - 20;
    g.globalAlpha = a * (0.5 + hh * 0.5);
    g.beginPath();
    g.arc(x, y, 3 + hh * 5, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

export function stars(t: number, n: number, ymax = H * 0.6, col = '#fff3da') {
  for (let i = 0; i < n; i++) {
    const x = hash(i * 3.1) * W;
    const y = hash(i * 8.7) * ymax;
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2);
    g.globalAlpha = 0.4 + tw * 0.6;
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, 1.5 + hash(i) * 3 * tw, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

export function sparkle(x: number, y: number, r: number, col = PAL.ochre, rot = 0) {
  poly(starPts(x, y, r, 0.3, 4, rot), col, { sw: 1.5, lit: false });
}

export function rays(cx: number, cy: number, n: number, rot: number, r: number, c1: string, c2: string, a = 0.5) {
  g.globalAlpha = a;
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * TAU;
    const a1 = rot + ((i + 1) / n) * TAU;
    g.fillStyle = i % 2 ? c1 : c2;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    g.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 1;
}

export function speech(x: number, y: number, w: number, h: number, text: string, o: { size?: number; tx?: number; ty?: number; chars?: number; col?: string; txt?: string; pop?: number } = {}) {
  const pop = o.pop ?? 1;
  if (pop <= 0) return;
  g.save();
  g.translate(x + w / 2, y + h / 2);
  const s = backOut(pop);
  g.scale(s, s);
  g.translate(-(x + w / 2), -(y + h / 2));
  const tx = o.tx ?? x + w * 0.3;
  const ty = o.ty ?? y + h + 50;
  poly([[x + w * 0.25, y + h - 4], [x + w * 0.5, y + h - 4], [tx, ty]], o.col ?? '#fffaf0', { sw: 2.4, lit: false });
  rr(x, y, w, h, Math.min(30, h / 2), o.col ?? '#fffaf0', { sw: 2.6, lit: false });
  rect(x + w * 0.25 + 3, y + h - 8, w * 0.25 - 6, 8, o.col ?? '#fffaf0', { ink: null, lit: false, edge: 0 });
  const shown = o.chars === undefined ? text : text.slice(0, Math.floor(o.chars));
  letter(shown, x + w / 2, y + h / 2, o.size ?? 44, o.txt ?? PAL.ink, { ink: false });
  g.restore();
}

export function stamp(x: number, y: number, text: string, size = 56, rot = -0.06, col = PAL.red, a = 0.9) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.font = `${size}px ${FONT}`;
  const w = g.measureText(text).width + 40;
  g.globalAlpha = a;
  g.strokeStyle = col;
  g.lineWidth = 6;
  g.strokeRect(-w / 2, -size * 0.7, w, size * 1.4);
  g.lineWidth = 2;
  g.strokeRect(-w / 2 + 8, -size * 0.7 + 8, w - 16, size * 1.4 - 16);
  g.fillStyle = col;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, 2);
  g.restore();
  g.globalAlpha = 1;
}

export function balloon(x: number, y: number, r: number, col: string, txt?: string) {
  inkLine([[x, y + r * 1.2], [x + Math.sin(T * 2 + x) * 10, y + r * 2.2], [x, y + r * 3.4]], 2, '#6b5a6a');
  ell(x, y, r, r * 1.2, col, { sw: 2.4 });
  if (txt) letter(txt, x, y, r * 1.1, PAL.cream, { ink: true });
}

export function coin(x: number, y: number, r: number, t: number, seed = 0) {
  const sx = Math.abs(Math.cos(t * 4 + seed));
  ell(x, y, Math.max(2, r * sx), r, '#f4c542', { sw: 2.2, lit: false });
  if (sx > 0.45) letter('$', x, y, r * 1.2, '#b98714', { ink: false });
}

export function cat(x: number, y: number, s: number, o: { col?: string; eyes?: string; dy?: number; flip?: boolean; helmet?: boolean; tail?: number } = {}) {
  const col = o.col ?? '#f0a45a';
  g.save();
  g.translate(x, y + (o.dy ?? 0));
  g.scale(o.flip ? -1 : 1, 1);
  const tw = o.tail ?? Math.sin(T * 4) * 0.6;
  inkLine([[2.4 * s, -2.4 * s], [4.2 * s, -3 * s + tw * s], [4.6 * s, -5.4 * s + tw * s * 1.5]], 4.5 * s * 0.3, col);
  ell(0, -2.4 * s, 3 * s, 2.3 * s, col, { sw: 2.4 });
  ell(-1.5 * s, -0.3 * s, 0.8 * s, 0.5 * s, shade(col, 0.2), { sw: 1.8, lit: false });
  ell(1.5 * s, -0.3 * s, 0.8 * s, 0.5 * s, shade(col, 0.2), { sw: 1.8, lit: false });
  poly([[-2.3 * s, -5.4 * s], [-2.3 * s, -7.6 * s], [-0.8 * s, -6.3 * s]], col, { sw: 2, lit: false });
  poly([[2.3 * s, -5.4 * s], [2.3 * s, -7.6 * s], [0.8 * s, -6.3 * s]], col, { sw: 2, lit: false });
  ell(0, -4.6 * s, 2.5 * s, 2.1 * s, col, { sw: 2.4 });
  if (o.helmet) ell(0, -4.6 * s, 3.1 * s, 2.8 * s, 'rgba(190,230,250,.35)', { sw: 3, lit: false, op: 0.4 });
  if (o.eyes === 'happy') {
    inkLine([[-1.4 * s, -4.4 * s], [-0.9 * s, -4.9 * s], [-0.4 * s, -4.4 * s]], 2);
    inkLine([[1.4 * s, -4.4 * s], [0.9 * s, -4.9 * s], [0.4 * s, -4.4 * s]], 2);
  } else if (o.eyes === 'scared') {
    ell(-0.9 * s, -4.6 * s, 0.55 * s, 0.7 * s, '#fff', { sw: 1.4, lit: false });
    ell(0.9 * s, -4.6 * s, 0.55 * s, 0.7 * s, '#fff', { sw: 1.4, lit: false });
  } else {
    ell(-0.9 * s, -4.6 * s, 0.25 * s, 0.4 * s, PAL.ink, { ink: null, lit: false });
    ell(0.9 * s, -4.6 * s, 0.25 * s, 0.4 * s, PAL.ink, { ink: null, lit: false });
  }
  poly([[-0.25 * s, -3.9 * s], [0.25 * s, -3.9 * s], [0, -3.6 * s]], PAL.rose, { sw: 1, lit: false });
  line(-1.2 * s, -3.7 * s, -2.8 * s, -3.9 * s, 1.4);
  line(1.2 * s, -3.7 * s, 2.8 * s, -3.9 * s, 1.4);
  g.restore();
}

// ---------- stage ----------
export function curtains(open: number, t: number, col = '#c23b4e') {
  const w = lerp(W / 2 + 40, 170, ease(open));
  for (const side of [-1, 1]) {
    g.save();
    if (side === 1) {
      g.translate(W, 0);
      g.scale(-1, 1);
    }
    const sway = Math.sin(t * 1.5) * 6;
    poly([[0, 0], [w, 0], [w - 45 * open + sway, H * 0.5], [w - 110 * open, H], [0, H]], col, { sw: 3.5, curv: false });
    for (let k = 1; k < 7; k++) {
      const x = (w * k) / 7.4;
      inkLine([[x, 0], [x + Math.sin(k + t) * 8 - 14 * open * (k / 7), H * 0.5], [x - 30 * open * (k / 7), H]], 3.5, shade(col, -0.4), true, 0.45);
      inkLine([[x + 22, 0], [x + 22 + Math.sin(k * 2) * 6, H]], 7, shade(col, 0.35), true, 0.18);
    }
    g.restore();
  }
}
export function valance(col = '#a82c40') {
  rect(-10, -10, W + 20, 96, col, { sw: 3.5 });
  for (let i = 0; i < 12; i++) {
    const x = i * (W / 12);
    poly([[x, 80], [x + W / 12, 80], [x + W / 24, 135]], col, { sw: 3, curv: false, lit: false });
  }
  for (let i = 0; i < 12; i++) ell(i * (W / 12) + W / 24, 60, 8, 8, '#f4c542', { sw: 1.6, lit: false });
}
export function stageFloor(y = 760, col = '#c98f55') {
  rect(-20, y, W + 40, H - y + 20, col, { sw: 3.5 });
  for (let i = 1; i < 8; i++) line(0, y + i * ((H - y) / 7) * (0.7 + i * 0.08), W, y + i * ((H - y) / 7) * (0.7 + i * 0.08), 2, shade(col, -0.35), 0.5);
  for (let i = 0; i < 12; i++) line(i * (W / 11), y, (i - 5.5) * (W / 7) + W / 2, H, 2, shade(col, -0.35), 0.35);
}
export function spotBeams(t: number, n = 3, col = '#fff3b0', a = 0.22, apexY = -20) {
  for (let i = 0; i < n; i++) {
    const cx = ((i + 0.5) / n) * W;
    const tx = cx + Math.sin(t * 0.9 + i * 2) * 380;
    g.globalAlpha = a;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(cx - 24, apexY);
    g.lineTo(cx + 24, apexY);
    g.lineTo(tx + 190, 900);
    g.lineTo(tx - 190, 900);
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 1;
}

/** the capability meter (the "P(doom) meter" of this film) with its bicycle pump */
export function meter(x: number, y: number, h: number, val: number, pumpK: number, burst = 0) {
  const w = 74;
  const v = clamp(val / 100);
  rr(x - w / 2, y - h, w, h, w / 2, '#f6efe2', { sw: 3.5 });
  const fh = Math.max(10, h * v);
  const colv = v < 0.5 ? mixCol('#3fa7a0', '#eab04a', v * 2) : mixCol('#eab04a', '#d64545', (v - 0.5) * 2);
  g.save();
  g.beginPath();
  g.rect(x - w / 2, y - fh, w, fh);
  g.clip();
  rr(x - w / 2 + 6, y - h + 6, w - 12, h - 12, w / 2 - 6, colv, { ink: null, lit: false });
  g.restore();
  for (let i = 1; i < 10; i++) line(x + w / 2 - 6, y - (h * i) / 10, x + w / 2 + (i % 5 === 0 ? 26 : 14), y - (h * i) / 10, 2.5);
  ell(x, y + 18, 56, 56, colv, { sw: 3.5 });
  ell(x - 16, y + 2, 14, 10, '#fff', { ink: null, lit: false, op: 0.5 });
  const bounce = pulse(T, 3);
  letter(Math.round(val * 10) / 10 + '%', x, y - h - 50, 52 + bounce * 6, PAL.cream, { rot: -0.04 });
  if (burst > 0) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      sparkle(x + Math.cos(a) * burst * 260, y - h + Math.sin(a) * burst * 260, 26 * (1 - burst * 0.6), PAL.ochre, a);
    }
  }
  // pump
  const px = x + 170;
  rr(px - 55, y + 52, 110, 14, 6, '#4a4e6a', { sw: 3 });
  rr(px - 22, y - 150, 44, 205, 10, PAL.clay, { sw: 3.5 });
  const hy = y - 150 - 60 + pumpK * 90;
  rect(px - 6, hy, 12, 100, '#b8c0cc', { sw: 2.5 });
  rr(px - 44, hy - 18, 88, 20, 8, PAL.night, { sw: 3 });
  inkLine([[px - 20, y - 120], [px - 100, y - 100], [x + 60, y + 10]], 5, '#6b5a6a');
}

// ---------- the cast of historical machines (re-used in the curtain call) ----------
export function hal(x: number, y: number, r: number, t: number, o: { dim?: number } = {}) {
  const k = 0.8 + 0.2 * Math.sin(t * 3);
  const dim = o.dim ?? 1;
  glow(x, y, r * 2.3, '#ff3b2f', 0.45 * dim * k);
  ell(x, y, r * 1.28, r * 1.28, '#2b2d38', { sw: 4, n: 28 });
  ell(x, y, r * 1.1, r * 1.1, '#8a929e', { sw: 3, n: 28, lit: false });
  ell(x, y, r * 0.95, r * 0.95, mixCol('#3a2224', '#c22218', dim), { sw: 3, n: 28, lit: false });
  ell(x, y, r * 0.62, r * 0.62, mixCol('#3a2224', '#ff4a2a', dim * k), { sw: 2, n: 24, lit: false });
  ell(x, y, r * 0.28, r * 0.28, mixCol('#3a2224', '#ffd24a', dim), { sw: 2, n: 20, lit: false });
  ell(x - r * 0.12, y - r * 0.14, r * 0.07, r * 0.07, '#fff8d8', { ink: null, lit: false });
}

export function shakey(x: number, y: number, s: number, t: number, o: { roll?: number } = {}) {
  const roll = o.roll ?? t * 4;
  const wb = Math.sin(t * 9) * 0.03;
  g.save();
  g.translate(x, y);
  g.rotate(wb);
  ell(0, 0.2 * s, 5 * s, 0.7 * s, 'rgba(50,35,60,.25)', { ink: null, lit: false, edge: 0 });
  for (const sd of [-1, 1]) {
    ell(sd * 2.7 * s, -0.9 * s, 1 * s, 1 * s, '#3b3a46', { sw: 3, lit: false });
    line(sd * 2.7 * s, -0.9 * s, sd * 2.7 * s + Math.cos(roll) * 0.8 * s, -0.9 * s + Math.sin(roll) * 0.8 * s, 2.4, '#d7dbe2');
  }
  rr(-3.6 * s, -4.2 * s, 7.2 * s, 3.2 * s, 0.5 * s, '#c9ced6', { sw: 3.2 });
  rect(-3.6 * s, -3 * s, 7.2 * s, 0.5 * s, PAL.red, { sw: 2, lit: false });
  rr(-1.6 * s, -9 * s, 3.2 * s, 5 * s, 0.4 * s, '#dfe3e8', { sw: 3.2 });
  rect(-0.9 * s, -8 * s, 1.8 * s, 2.4 * s, '#40414f', { sw: 2, lit: false });
  for (let i = 0; i < 3; i++) ell(-0.4 * s + i * 0.4 * s, -7.1 * s, 0.14 * s, 0.14 * s, i === Math.floor(t * 3) % 3 ? PAL.ochre : '#8a8a8a', { ink: null, lit: false });
  rr(-2 * s, -12 * s, 4 * s, 3 * s, 0.4 * s, '#cfd4db', { sw: 3 });
  ell(0, -10.5 * s, 0.9 * s, 0.9 * s, '#2b2d38', { sw: 2.4, lit: false });
  ell(0, -10.5 * s, 0.4 * s, 0.4 * s, '#6ab0d4', { sw: 1.6, lit: false });
  rect(-2.3 * s, -12.8 * s, 1.3 * s, 0.8 * s, '#2b2d38', { sw: 2, lit: false });
  line(1 * s, -12 * s, 1.5 * s + Math.sin(t * 7) * 0.4 * s, -14.4 * s, 2.5);
  ell(1.5 * s + Math.sin(t * 7) * 0.4 * s, -14.6 * s, 0.25 * s, 0.25 * s, PAL.red, { sw: 1.6, lit: false });
  g.restore();
}

export function roomba(x: number, y: number, r: number, t: number, o: { spin?: number } = {}) {
  ell(x, y + r * 0.35, r * 1.05, r * 0.25, 'rgba(50,35,60,.28)', { ink: null, lit: false, edge: 0 });
  ell(x, y, r, r * 0.42, '#454a5a', { sw: 3.2, n: 22 });
  ell(x, y - r * 0.12, r * 0.95, r * 0.4, '#6a7184', { sw: 3, n: 22, lit: false });
  ell(x, y - r * 0.15, r * 0.25, r * 0.1, '#e0e4ea', { sw: 2, lit: false });
  ell(x, y - r * 0.14, r * 0.1, r * 0.04, PAL.sap, { ink: null, lit: false });
  const sp = o.spin ?? t * 12;
  for (let i = 0; i < 3; i++) {
    const a = sp + (i / 3) * TAU;
    line(x + Math.cos(a) * r * 0.9, y + r * 0.3 + Math.sin(a) * r * 0.12, x + Math.cos(a) * r * 1.15, y + r * 0.34 + Math.sin(a) * r * 0.2, 3, PAL.rose);
  }
}

export function deepBlue(x: number, y: number, s: number, t: number) {
  ell(x, y + 0.1 * s, 4 * s, 0.7 * s, 'rgba(50,35,60,.28)', { ink: null, lit: false, edge: 0 });
  rr(x - 3 * s, y - 13 * s, 6 * s, 13 * s, 0.6 * s, '#23263a', { sw: 3.5 });
  rect(x - 3 * s, y - 11.2 * s, 6 * s, 0.9 * s, '#2f6fd6', { sw: 2, lit: false });
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 4; c++) {
      const on = hash(r * 11 + c * 5 + Math.floor(t * 6)) > 0.5;
      rect(x - 2.3 * s + c * 1.2 * s, y - 9.6 * s + r * 1.1 * s, 0.8 * s, 0.6 * s, on ? '#6fb4ff' : '#3a4060', { ink: null, lit: false });
    }
  for (let i = 0; i < 3; i++) ell(x - 1.5 * s + i * 1.5 * s, y - 2 * s, 0.35 * s, 0.35 * s, i === Math.floor(t * 2) % 3 ? PAL.red : '#555', { sw: 1.4, lit: false });
}

export function watson(x: number, y: number, s: number, t: number) {
  rr(x - 3.2 * s, y - 9 * s, 6.4 * s, 9 * s, 0.7 * s, '#2c4ea0', { sw: 3.5 });
  rr(x - 2.7 * s, y - 8.3 * s, 5.4 * s, 4.8 * s, 0.4 * s, '#0f1f4d', { sw: 2.4, lit: false });
  const cx = x;
  const cy = y - 5.9 * s;
  ell(cx, cy, 1.6 * s, 1.6 * s, '#1a3f8a', { sw: 1.6, lit: false });
  for (let i = 0; i < 3; i++) {
    const a = t * 1.6 + i * 1.05;
    inkLine(
      Array.from({ length: 14 }, (_, k) => {
        const aa = (k / 13) * TAU;
        return [cx + Math.cos(aa) * 1.6 * s * Math.cos(a % 3), cy + Math.sin(aa) * 1.6 * s] as Pt;
      }),
      1.8,
      '#8fd0ff',
    );
  }
  for (let i = 0; i < 5; i++) {
    const a = t * 2 + i * 1.3;
    ell(cx + Math.cos(a) * 1.9 * s, cy + Math.sin(a) * 0.9 * s, 0.14 * s, 0.14 * s, '#fff', { ink: null, lit: false });
  }
  rect(x - 2.2 * s, y - 2.6 * s, 4.4 * s, 0.6 * s, '#8fd0ff', { sw: 1.6, lit: false });
}

export function crt(x: number, y: number, w: number, h: number, screen: string, onDraw?: (sx: number, sy: number, sw: number, sh: number) => void) {
  rr(x, y, w, h, 24, '#d7cdb8', { sw: 4 });
  const sx = x + w * 0.09;
  const sy = y + h * 0.09;
  const sw = w * 0.82;
  const sh = h * 0.7;
  rr(sx, sy, sw, sh, 26, screen, { sw: 3.5, lit: false });
  if (onDraw) {
    g.save();
    g.beginPath();
    g.rect(sx + 6, sy + 6, sw - 12, sh - 12);
    g.clip();
    onDraw(sx, sy, sw, sh);
    g.restore();
  }
  ell(sx + sw * 0.16, sy + sh * 0.14, sw * 0.12, sh * 0.06, '#fff', { ink: null, lit: false, op: 0.25, rot: -0.5 });
  ell(x + w * 0.85, y + h * 0.88, 8, 8, PAL.sap, { sw: 2, lit: false });
  rr(x + w * 0.3, y + h, w * 0.4, h * 0.12, 10, '#bfb49c', { sw: 3.5 });
  rr(x + w * 0.15, y + h * 1.1, w * 0.7, h * 0.08, 10, '#a79c84', { sw: 3.5 });
}

export function heartFloat(x: number, y: number, r: number, col = PAL.rose) {
  poly(heartPts(x, y, r), col, { sw: 2, curv: true, lit: false });
}

export function sky(c1: string, c2: string) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, c1);
  gr.addColorStop(1, c2);
  g.globalAlpha = 1;
  g.fillStyle = PAL.paper;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.95;
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
  for (let i = 0; i < 5; i++) glow(hash(i * 3.1) * W, hash(i * 5.7 + 2) * H, 300 + hash(i) * 300, i % 2 ? '#ffffff' : '#3a2a40', 0.09);
}

export function cloud(x: number, y: number, s: number, col = '#fffaf0') {
  ell(x, y, 3 * s, 1.1 * s, col, { sw: 2.4, lit: false });
  ell(x - 1.3 * s, y - 0.7 * s, 1.5 * s, 1.2 * s, col, { sw: 2.4, lit: false });
  ell(x + 0.7 * s, y - 1.1 * s, 1.8 * s, 1.5 * s, col, { sw: 2.4, lit: false });
  ell(x, y + 0.1 * s, 3 * s, 1 * s, col, { ink: null, lit: false });
}

export { wob, seg, backOut, rgba };
export { T };
