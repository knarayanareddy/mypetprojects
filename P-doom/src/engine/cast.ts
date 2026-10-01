// @ts-nocheck
import { PAL, S, W, H, clamp, lerp, ease, easeOut, backOut, hash, bpOf, frac, TAU, paint, inkLine, tube, blob, rectPts, ellPts, rrPts, starPts, heartPts, push, pop, translate, rotate, scale, letter, pulse, bg, lineGrad, mixCol, seg, fillAll } from './core';
import { clawd } from './clawd';

// ---------- guest monsters ----------
export function shoggoth(x: number, y: number, s: number, t: number, o: any = {}) {
  const mask = o.mask ?? 0, slip = o.slip ?? 0;
  const base = o.col || '#5A4780';
  // tentacles
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = lerp(-1.25, 1.25, i / (n - 1)) + Math.sin(t * 3 + i) * 0.1, len = (5 + hash(i * 5) * 4) * s;
    const pts = [];
    for (let k = 0; k <= 6; k++) { const f = k / 6, wig = Math.sin(t * 6 + i * 1.3 - f * 3) * (1 + Math.max(0, Math.sin(bpOf(t) * Math.PI)) * 0.8) * f * 1.4 * s; pts.push([x + Math.sin(a) * len * f * 1.4 + wig, y - 1.5 * s + Math.cos(a) * len * f * 0.45 + f * f * 1.5 * s]); }
    tube(pts, (1.9 - 0.6 * (i % 2)) * s, i % 2 ? '#6B5599' : base);
  }
  // body
  const by = y - 6.2 * s;
  paint(ellPts(x, by, 6.4 * s, 5.2 * s, 26, s * 0.15), { wash: base, fill: PAL.teal, fillOp: 60, ink: PAL.ink, sw: 1.4 });
  paint(ellPts(x - 2 * s, by - 2 * s, 2.5 * s, 1.4 * s, 14), { fill: '#9A86C6', fillOp: 120, ink: null });
  // many eyes
  const open = o.eyes ?? 1;
  for (let i = 0; i < 11; i++) {
    const a = hash(i * 2.1) * TAU, r = (0.4 + hash(i * 3.7) * 0.55) * 4.6 * s, ex = x + Math.cos(a) * r * 1.2, ey = by + Math.sin(a) * r * 0.9;
    const er = (0.55 + hash(i * 9.1) * 0.6) * s * (0.6 + 0.4 * open), bl = ((t * 0.8 + i * 0.37) % 2.4) < 0.1;
    if (bl) { inkLine([[ex - er, ey], [ex + er, ey]], 1.1, PAL.ink, 'ink', 0); continue; }
    paint(ellPts(ex, ey, er, er * 1.1, 10), { wash: '#FFF3C8', ink: PAL.ink, sw: 0.6 });
    paint(ellPts(ex + Math.sin(t * 2 + i) * er * 0.3, ey, er * 0.45, er * 0.7, 8), { wash: PAL.red, ink: null });
  }
  // fanged maw
  if (mask < 0.99) {
    const mw = 3.4 * s;
    paint([[x - mw, by + 2.4 * s], [x, by + 3.7 * s + Math.sin(t * 6) * 0.4 * s], [x + mw, by + 2.4 * s], [x, by + 2.7 * s]], { wash: '#2A1236', ink: PAL.ink, sw: 1, curv: 0.4 });
    for (let i = -2; i <= 2; i++) paint([[x + i * 0.65 * s - 0.3 * s, by + 2.7 * s], [x + i * 0.65 * s + 0.3 * s, by + 2.7 * s], [x + i * 0.65 * s, by + 3.4 * s]], { wash: PAL.cream, ink: null });
  }
  // smiley mask: slips off as slip -> 1
  if (mask > 0.01) {
    push();
    translate(x + slip * 5.5 * s, by - 0.5 * s + slip * slip * 5 * s); rotate(slip * 1.0 + Math.sin(t * 3) * 0.04 * (1 - slip));
    const mr = 4.8 * s;
    paint(ellPts(0, 0, mr, mr, 24), { wash: '#FFD84A', fill: PAL.ochre, fillOp: 90, ink: PAL.ink, sw: 1.5 });
    for (const ex of [-1.6, 1.6]) paint(ellPts(ex * s, -1.2 * s, 0.55 * s, 0.9 * s, 10), { wash: PAL.ink, ink: null });
    inkLine([[-2.4 * s, 1.1 * s], [0, 3.1 * s], [2.4 * s, 1.1 * s]], 2.4, PAL.ink, 'ink', 0.7);
    pop();
  }
}

export function basilisk(x: number, y: number, s: number, t: number, o: any = {}) {
  const rise = o.rise ?? 1, N = 10, hgt = 17 * s * rise, fl = o.flip ? -1 : 1;
  const pts = [];
  for (let i = 0; i <= N; i++) { const f = i / N; pts.push([x + fl * (Math.sin(f * 4 + t * 3) * 2.6 * s * f + (o.lean || 0) * s * f * f), y - f * hgt]); }
  if (rise > 0.05) {
    tube(pts, 4.6 * s, PAL.sap, PAL.ink);
    for (let i = 1; i < N; i += 1) paint(ellPts(pts[i][0], pts[i][1], 1.3 * s, 0.7 * s, 8), { wash: '#C9DA8A', washOp: 200, ink: null });
    for (let i = 1; i < N; i += 2) paint(starPts(pts[i][0], pts[i][1] - 0.2 * s, 0.9 * s, 0.4, 3), { wash: PAL.teal, ink: null });
    const hd = pts[N], ang = Math.sin(t * 2) * 0.1;
    push(); translate(hd[0], hd[1]); rotate(ang);
    paint([[-3.6 * s, 0.8 * s], [-3 * s, -2.6 * s], [2.6 * s, -2.6 * s], [fl * 5.2 * s, -0.4 * s], [fl * 4.2 * s, 1.6 * s], [-2 * s, 2.2 * s]], { wash: '#7FB265', fill: PAL.sap, fillOp: 90, ink: PAL.ink, sw: 1.4, curv: 0.2 });
    // crown
    paint([[-2.2 * s, -2.5 * s], [-2.4 * s, -5 * s], [-1 * s, -3.6 * s], [0, -5.6 * s], [1 * s, -3.6 * s], [2.4 * s, -5 * s], [2.2 * s, -2.5 * s]], { wash: PAL.ochre, ink: PAL.ink, sw: 1.1 });
    // eye, slit pupil, fangs, tongue
    paint(ellPts(fl * 1.2 * s, -0.8 * s, 1 * s, 0.9 * s, 10), { wash: '#FFE56A', ink: PAL.ink, sw: 0.8 });
    paint(rectPts(fl * 1.2 * s - 0.12 * s, -1.5 * s, 0.24 * s, 1.4 * s, 0), { wash: PAL.ink, ink: null });
    paint([[fl * 3 * s, 1.5 * s], [fl * 3.4 * s, 3 * s], [fl * 2.4 * s, 1.6 * s]], { wash: PAL.cream, ink: PAL.ink, sw: 0.5 });
    const tl = (1 + Math.sin(t * 14)) * 0.5;
    inkLine([[fl * 4.4 * s, 1.2 * s], [fl * (5.6 + tl * 1.4) * s, 1.6 * s], [fl * (6.6 + tl * 1.4) * s, 1.1 * s + tl * 0.5 * s]], 1.4, PAL.red, 'ink', 0.2);
    pop();
  }
  if (o.puppet) { // puppet stick + hand from below
    inkLine([[pts[N][0], pts[N][1] + 3 * s], [pts[N][0] + 2 * s, y + 6 * s]], 3, '#7A5A3A', 'ink', 0);
  }
}

export function chinchilla(x: number, y: number, s: number, t: number, o: any = {}) {
  const ch = o.cheek ?? 0, bob = Math.abs(Math.sin(t * 5)) * 0.3 * s * (o.munch ? 1 : 0);
  const gy = '#BDB8CC', dk = '#8F8AA3';
  paint(ellPts(x, y + 0.2 * s, 5 * s, 0.8 * s, 14), { fill: PAL.ink, fillOp: 80, ink: null });
  paint(ellPts(x - 4.6 * s, y - 3 * s, 2.2 * s, 1.5 * s, 12, 0, -0.5), { wash: gy, ink: PAL.ink, sw: 1 });   // tail
  paint(ellPts(x, y - 3 * s - bob, 4.2 * s, 3.4 * s, 22, s * 0.1), { wash: gy, fill: dk, fillOp: 70, ink: PAL.ink, sw: 1.3 });
  paint(ellPts(x, y - 2 * s - bob, 2.8 * s, 2 * s, 16), { wash: '#F1EEF5', ink: null });
  for (const e of [-1, 1]) { paint(ellPts(x + e * 2.4 * s, y - 6.8 * s - bob, 1.6 * s, 2 * s, 12), { wash: gy, ink: PAL.ink, sw: 1.1 }); paint(ellPts(x + e * 2.4 * s, y - 6.8 * s - bob, 0.9 * s, 1.3 * s, 10), { wash: PAL.rose, washOp: 200, ink: null }); }
  for (const e of [-1, 1]) { const cr = 1.3 + ch * 1.6; paint(ellPts(x + e * 2.6 * s, y - 3.3 * s - bob, cr * s, cr * 0.9 * s, 14), { fill: '#E5E1EE', fillOp: 150, ink: PAL.ink, sw: 0.7 }); }
  for (const e of [-1, 1]) paint(ellPts(x + e * 1.5 * s, y - 4.2 * s - bob, 0.65 * s, 0.75 * s, 10), { wash: PAL.ink, ink: null });
  paint(ellPts(x, y - 3.4 * s - bob, 0.4 * s, 0.3 * s, 8), { wash: PAL.rose, ink: PAL.ink, sw: 0.5 });
  for (const e of [-1, 1]) for (let i = -1; i <= 1; i++) inkLine([[x + e * 0.8 * s, y - 3.1 * s - bob + i * 0.2 * s], [x + e * 3.6 * s, y - 3.5 * s - bob + i * 0.8 * s]], 0.4, PAL.ink, 'inkfine', 0);
}

export const sydney = (x: number, y: number, u: number, o: any = {}) => clawd(x, y, u, { col: '#E8879E', dk: '#B65671', lt: '#F7B8C6', eyes: 'heart', mouth: 'smile', blush: true, ...o });
export const gato = (x: number, y: number, u: number, o: any = {}) => clawd(x, y, u, { hat: 'cat', mouth: 'cat', col: '#E08A62', ...o });

// ---------- props & scenery ----------
export function rays(cx: number, cy: number, n: number, r: number, c1: string, c2: string, rot: number, op = 255) {
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * TAU, a1 = rot + ((i + 0.5) / n) * TAU;
    paint([[cx, cy], [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r], [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r]], { wash: i % 2 ? c1 : c2, washOp: op, ink: null });
  }
}
export function cloud(x: number, y: number, s: number, col = PAL.cream, a = 1) {
  const c = [[-2, 0, 2], [0, -1, 2.4], [2.2, 0, 2], [0.5, 0.8, 2.6], [-1.6, 0.8, 1.8]];
  for (const [dx, dy, r] of c) paint(ellPts(x + dx * s, y + dy * s, r * s, r * 0.8 * s, 14), { wash: col, a, ink: null });
  paint(ellPts(x + 0.3 * s, y + 0.3 * s, 3.4 * s, 1.8 * s, 14), { fill: PAL.sky, fillOp: 60, a, ink: null });
}
export function confetti(t: number, n: number, seed = 0, speed = 220) {
  const cols = [PAL.rose, PAL.ochre, PAL.sky, PAL.sap, PAL.violet, PAL.cream];
  for (let i = 0; i < n; i++) {
    const h = hash(i * 7.7 + seed), x = h * W + Math.sin(t * 2 + i) * 30, y = ((t * speed * (0.6 + hash(i + seed) * 0.8) + hash(i * 3.1) * (H + 200)) % (H + 200)) - 100;
    push(); translate(x, y); rotate(t * (2 + h * 4) + i); scale(Math.cos(t * 5 + i), 1);
    paint(rectPts(-9, -5, 18, 10, 0), { wash: cols[i % 6], ink: null }); pop();
  }
}
export function speedLines(cx: number, cy: number, t: number, n: number, r0: number, r1: number, col = PAL.ink, w = 1.4) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + hash(i + Math.floor(t * 12)) * 0.3, k = 0.6 + hash(i * 3 + Math.floor(t * 12)) * 0.5;
    inkLine([[cx + Math.cos(a) * r0 * k, cy + Math.sin(a) * r0 * k], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], w, col, 'dry', 0);
  }
}
export function paperclip(x: number, y: number, s: number, rot = 0, col = '#B7C2CF') {
  push(); translate(x, y); rotate(rot); scale(s);
  const P = [[-0.45, -0.6], [-0.45, 1.5], [0.45, 1.5], [0.45, -1.5], [-0.9, -1.5], [-0.9, 1.0]];
  tube(P.map((p) => [p[0], p[1]]), 0.28, col, PAL.ink); pop();
}
export function mug(x: number, y: number, s: number, col = PAL.cream, t = 0, steam = true) {
  paint(rrPts(x - 2 * s, y - 3.4 * s, 4 * s, 3.4 * s, 0.8 * s), { wash: col, fill: PAL.sky, fillOp: 50, ink: PAL.ink, sw: 1 });
  inkLine([[x + 2 * s, y - 2.6 * s], [x + 3.4 * s, y - 2.4 * s], [x + 3.4 * s, y - 0.9 * s], [x + 2 * s, y - 0.8 * s]], 1.3, PAL.ink, 'ink', 0.5);
  paint(ellPts(x, y - 3.3 * s, 1.9 * s, 0.4 * s, 12), { wash: '#6B3F2A', ink: null });
  if (steam) for (const e of [-0.8, 0.8]) inkLine([[x + e * s, y - 3.8 * s], [x + (e + 0.4 * Math.sin(t * 4 + e)) * s, y - 5 * s], [x + e * s, y - 6.2 * s]], 0.8, PAL.cream, 'ink', 0.6);
}

// P(doom) meter: painted stage thermometer with a bicycle pump. v = 0..100. pump = 0..1 handle position.
export function meterProp(x: number, y: number, s: number, v: number, o: any = {}) {
  S.meterShown = true;
  const t = S.t, col = meterColor(v), th = 300 * s, tw = 46 * s;
  push(); translate(x, y);
  // stand
  paint(rrPts(-tw * 0.9, -th - 70 * s, tw * 1.8, th + 70 * s, tw * 0.9), { wash: PAL.cream, fill: PAL.sky, fillOp: 40, ink: PAL.ink, sw: 1.5 });
  const hh = th * clamp(v / 100);
  if (hh > 6) paint(rrPts(-tw * 0.45, -70 * s - hh, tw * 0.9, hh + 60 * s, tw * 0.45), { wash: col, ink: null });
  for (let q = 1; q < 5; q++) inkLine([[-tw * 0.9, -70 * s - (th * q) / 5], [-tw * 0.4, -70 * s - (th * q) / 5]], 0.8, PAL.ink, 'inkfine', 0);
  paint(ellPts(0, 0, 56 * s, 56 * s, 22), { wash: col, ink: PAL.ink, sw: 1.5 });
  paint(ellPts(-14 * s, -14 * s, 14 * s, 10 * s, 10), { wash: PAL.cream, washOp: 130, ink: null });
  if (o.crack) { const k = clamp(o.crack); inkLine([[-tw * 0.9, -th * 0.5], [-tw * 0.3, -th * 0.5 - 20 * s * k], [tw * 0.1, -th * 0.5 + 10 * s * k], [tw * 0.8, -th * 0.5 - 30 * s * k]], 1.6, PAL.ink, 'ink', 0); inkLine([[0, -th * 0.7], [10 * s * k, -th * 0.7 - 30 * s * k], [-6 * s * k, -th * 0.7 - 60 * s * k]], 1.3, PAL.ink, 'ink', 0); }
  // bicycle pump on the right
  const px = 130 * s, pm = o.pump ?? 0.5, pumpTop = -150 * s - pm * 90 * s;
  tube([[56 * s, -4 * s], [90 * s, 14 * s], [px - 18 * s, -10 * s]], 5 * s, '#555', PAL.ink);
  paint(rrPts(px - 18 * s, -150 * s, 36 * s, 150 * s, 8 * s), { wash: PAL.teal, fill: PAL.sap, fillOp: 60, ink: PAL.ink, sw: 1.4 });
  inkLine([[px, pumpTop + 40 * s], [px, -140 * s]], 5 * s, '#C9C9D2', 'ink', 0);
  inkLine([[px - 38 * s, pumpTop], [px + 38 * s, pumpTop]], 8 * s, PAL.ink, 'ink', 0);
  paint(rrPts(px - 24 * s, 0, 48 * s, 12 * s, 5 * s), { wash: PAL.ink, ink: null });
  pop();
  letter('P(DOOM)', x, y - th - 100 * s, 38 * s, o.labelCol || PAL.cream, { rot: -0.04 });
  letter(v >= 99.5 ? v.toFixed(1) + '%' : Math.floor(v) + '%', x, y, 30 * s, PAL.cream);
  void t;
}
export const meterColor = (v: number) => (v < 35 ? PAL.sap : v < 65 ? PAL.ochre : v < 90 ? PAL.orange : PAL.red);

// The shared stage. th = 'party' | 'pyro' | 'flood' | 'alarm' | 'curtain'. Draws the whole frame (screen space).
export function stage(t: number, th = 'party') {
  const pal: any = {
    party: ['#F7C9A6', '#E27A92', '#E8AA38'], pyro: ['#4A2C63', '#B9455B', '#E8AA38'],
    flood: ['#4B535F', '#7C8794', '#B7C2CF'], alarm: ['#2A0A10', '#8F1E2C', '#FF4A4A'], curtain: ['#E7C9A0', '#C8353F', '#E8AA38'],
  };
  const [a, b, c] = pal[th];
  bg(a, b);
  const sweep = th === 'alarm' ? t * 0.9 : t * 0.15;
  rays(W / 2, 470, 20, 2400, mixCol(b, c, 0.5), b, sweep, th === 'alarm' ? 130 : 90);
  blob(W / 2, 480, 700, c, th === 'alarm' ? 60 : 130);
  // back wall flats + floor
  paint([[0, 790], [W, 790], [W, H], [0, H]], { wash: th === 'alarm' ? '#2C0D12' : '#7A4A30', fill: '#3A2018', fillOp: 90, ink: PAL.ink, sw: 1.2 });
  for (let i = 1; i < 9; i++) inkLine([[i * 240 - 40, 790], [i * 330 - 700, H]], 0.9, PAL.ink, 'inkfine', 0, 0.5);
  inkLine([[0, 790], [W, 790]], 2, PAL.ink, 'ink', 0);
  // side curtains
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 0 : W, wv = (k: number) => Math.sin(t * 1.3 + k) * 6;
    const wd = 250 + Math.sin(t * 1.1) * 8;
    paint([[x0, -20], [x0 + sd * wd, -20], [x0 + sd * (wd * 0.7 + wv(1)), 300], [x0 + sd * (wd * 0.85 + wv(2)), 640], [x0 + sd * (wd * 0.6 + wv(3)), 820], [x0, 820]], { wash: th === 'alarm' ? '#5A1018' : PAL.crimson, fill: PAL.ink, fillOp: 50, ink: PAL.ink, sw: 1.4, curv: 0.4 });
    for (let k = 1; k < 4; k++) inkLine([[x0 + sd * wd * k * 0.22, -10], [x0 + sd * wd * (k * 0.2 + wv(k) * 0.01), 810]], 1, PAL.ink, 'ink', 0.4, 0.45);
  }
  paint(rectPts(-20, -30, W + 40, 90, 0), { wash: PAL.crimson, ink: PAL.ink, sw: 1.4 });
  for (let i = 0; i < 12; i++) paint([[i * 170 - 20, 60], [i * 170 + 70, 60], [i * 170 + 25, 100]], { wash: PAL.ochre, ink: PAL.ink, sw: 1 });
  // footlights
  for (let i = 0; i < 9; i++) { const lx = 240 + i * 180; blob(lx, 800, 90, th === 'alarm' ? '#FF3A3A' : '#FFE9A0', 120 + pulse(t) * 50); paint(ellPts(lx, 805, 14, 9, 8), { wash: '#FFE9A0', ink: PAL.ink, sw: 0.8 }); }
  if (th === 'pyro') for (const sx of [330, 1590]) { const k = 0.5 + 0.5 * pulse(t, 4); for (let i = 0; i < 4; i++) { const fh = 160 + i * 30 + k * 160; paint([[sx - 26 + i * 4, 800], [sx + 4 * (i - 1.5), 800 - fh], [sx + 26 - i * 4, 800]], { wash: i % 2 ? PAL.orange : PAL.ochre, washOp: 220, curv: 0.4, ink: null }); } }
  if (th === 'alarm') { for (let i = 0; i < 2; i++) { const ang = Math.sin(t * 2 + i * 3) * 0.7 + (i ? 0.2 : -0.2); push(); translate(i ? W - 140 : 140, 120); rotate(ang + Math.PI / 2); paint([[0, 0], [-170, 1500], [170, 1500]], { wash: '#FF5A4A', washOp: 70, ink: null }); pop(); paint(ellPts(i ? W - 140 : 140, 120, 36, 36, 14), { wash: '#FF3A3A', ink: PAL.ink, sw: 1.4 }); } fillAll('#FF0000', 0.06 + 0.1 * pulse(t, 3)); }
}

// Clawd's lunchbox jaws as a full-frame iris. k = 1 closed (screen black), 0 fully open.
export function jaws(k: number, col = '#2A0E1A') {
  if (k <= 0.005) return;
  const reach = (H / 2 + 120) * clamp(k);
  for (const dir of [-1, 1]) {
    const edge = dir < 0 ? reach : H - reach;
    const pts: any[] = [[-100, dir < 0 ? -200 : H + 200], [W + 100, dir < 0 ? -200 : H + 200]];
    const n = 12;
    for (let i = n; i >= 0; i--) pts.push([-100 + ((W + 200) * i) / n, edge + (i % 2 ? 0 : dir * -60 * Math.min(1, k * 4))]);
    paint(pts, { wash: col, ink: null });
    for (let i = 0; i < n; i++) {
      const x0 = -100 + ((W + 200) * i) / n, x1 = -100 + ((W + 200) * (i + 1)) / n;
      paint([[x0 + 6, edge], [x1 - 6, edge], [(x0 + x1) / 2, edge + dir * -80]], { wash: PAL.cream, ink: PAL.ink, sw: 1.2 });
    }
    inkLine([[-100, edge], [W + 100, edge]], 2, PAL.ink, 'ink', 0);
  }
}
export function lunchboxMouthIris(t: number) { return t; }
void seg; void ease; void easeOut; void backOut; void frac; void lineGrad; void heartPts; void scale;
