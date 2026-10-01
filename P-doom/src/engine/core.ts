// @ts-nocheck
// core: constants, helpers, camera and the "paint" wrapper (watercolor wash + pooled edge + wobbly ink).
// Everything drawn is a pure function of song time t: no state survives between frames.

export const W = 1920, H = 1080;
export const BPM = 88, BEAT = 60 / BPM, OFF = 0.21, DUR = 156.6;
export const TAU = Math.PI * 2;
export const PAL = {
  paper: '#F3EBDC', ink: '#2B2233', clay: '#D97757', clayDk: '#A84D33', clayLt: '#F2A283',
  night: '#1F2550', indigo: '#2F3C7A', rose: '#E27A92', ochre: '#E8AA38', sap: '#6E9F58',
  teal: '#3A9C98', violet: '#7B5CA8', cream: '#FFF5E2', sky: '#8EC3E6',
  red: '#C8353F', crimson: '#9E2A3A', orange: '#F08A2E', steel: '#7C8794', jazz: '#2C4A7C',
};

export const S: any = { ctx: null, t: 0, meterShown: false };

export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
export const ease = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x: number) => Math.pow(clamp(x), 3);
export const backOut = (x: number) => { x = clamp(x); const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
export const elasticOut = (x: number) => { x = clamp(x); return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1; };
export const hash = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const bpOf = (t: number) => (t - OFF) / BEAT;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const frac = (x: number) => x - Math.floor(x);
export const beatN = (t: number) => Math.floor(bpOf(t));
export const pulse = (t: number, k = 6) => Math.exp(-frac(bpOf(t)) * k);
export const pulse2 = (t: number, k = 6) => Math.exp(-frac(bpOf(t) * 2) * k);
export const wob = (t: number, f = 1, ph = 0) => Math.sin((t * f + ph) * TAU);

export function kf(t: number, keys: any[], e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i], k = e((t - a) / (b - a));
      return Array.isArray(va) ? va.map((v: number, j: number) => lerp(v, vb[j], k)) : lerp(va, vb, k);
    }
  }
  return keys[keys.length - 1][1];
}
export function mixCol(a: string, b: string, k: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (i: number) => Math.round(lerp((pa >> i) & 255, (pb >> i) & 255, clamp(k)));
  return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
}
export const shakeXY = (t: number, amt: number) => { const f = Math.floor(t * 24); return [(hash(f * 1.7) - 0.5) * 2 * amt, (hash(f * 2.3 + 9) - 0.5) * 2 * amt]; };

// seeded random: reseeded 12x/s so the linework "boils" like hand-drawn animation
let _seed = 1;
export function seedFrame(t: number) { _seed = ((Math.floor(t * 12) * 2654435761) + 12345) >>> 0; }
export function random() {
  _seed = (_seed + 0x6D2B79F5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const jit = (a: number) => (random() * 2 - 1) * a;

// ---------- canvas transform wrappers ----------
export const push = () => S.ctx.save();
export const pop = () => S.ctx.restore();
export const translate = (x: number, y: number) => S.ctx.translate(x, y);
export const rotate = (a: number) => S.ctx.rotate(a);
export const scale = (x: number, y = x) => S.ctx.scale(x, y);

// ---------- camera ----------
export function camBegin(cx = W / 2, cy = H / 2, zoom = 1, rot = 0) {
  const c = S.ctx; c.save(); c.translate(W / 2, H / 2); c.rotate(rot); c.scale(zoom, zoom); c.translate(-cx, -cy);
}
export function camEnd() { S.ctx.restore(); }

// ---------- geometry ----------
const sm = (p: any) => { p.smooth = true; return p; };
export function rectPts(x: number, y: number, w: number, h: number, j = 0) {
  return [[x + jit(j), y + jit(j)], [x + w / 2 + jit(j), y + jit(j) * 0.5], [x + w + jit(j), y + jit(j)],
    [x + w + jit(j) * 0.5, y + h / 2], [x + w + jit(j), y + h + jit(j)], [x + w / 2 + jit(j), y + h + jit(j) * 0.5],
    [x + jit(j), y + h + jit(j)], [x + jit(j) * 0.5, y + h / 2]];
}
export function ellPts(cx: number, cy: number, rx: number, ry: number, n = 28, j = 0, rot = 0) {
  const p: any = []; for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; p.push([cx + Math.cos(a) * rx + jit(j), cy + Math.sin(a) * ry + jit(j)]); } return sm(p);
}
export function rrPts(x: number, y: number, w: number, h: number, r: number, j = 0) {
  const p: any = [], sg = 4;
  r = Math.min(r, w / 2, h / 2);
  const corner = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= sg; i++) { const a = a0 + (i / sg) * Math.PI / 2; p.push([cx + Math.cos(a) * r + jit(j), cy + Math.sin(a) * r + jit(j)]); } };
  corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
  return p;
}
export function starPts(cx: number, cy: number, r: number, inner = 0.38, n = 4, rot = -Math.PI / 2) {
  const p: any = []; for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, q = i % 2 ? r * inner : r; p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return p;
}
export function heartPts(cx: number, cy: number, r: number) {
  const p: any = [];
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    p.push([cx + (x / 17) * r, cy + (y / 17) * r + r * 0.05]);
  }
  return sm(p);
}

// ---------- painting ----------
const INK_K = 2.2;
function tracePath(pts: any, smooth: boolean, closed = true) {
  const c = S.ctx, n = pts.length;
  c.beginPath();
  if (smooth && n > 2) {
    const mid = (a: any, b: any) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (closed) {
      const m0 = mid(pts[n - 1], pts[0]); c.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
      c.closePath();
    } else {
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
      c.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  } else {
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (closed) c.closePath();
  }
}

// paint one shape: wash (flat), fill (watercolor with pooled edge), hatch, ink outline.
export function paint(pts: any, o: any = {}) {
  if (!pts || pts.length < 2) return;
  const c = S.ctx, smooth = !!(o.curv || pts.smooth), A = (o.a ?? 1) * (S.alpha ?? 1);
  if (o.wash) { tracePath(pts, smooth); c.globalAlpha = ((o.washOp ?? 255) / 255) * A; c.fillStyle = o.wash; c.fill(); }
  if (o.fill || o.hatch) {
    c.save(); tracePath(pts, smooth); c.clip();
    if (o.fill) {
      const op = (o.fillOp ?? 170) / 255;
      c.globalAlpha = op * 0.8 * A; c.fillStyle = o.fill; c.fillRect(-4000, -4000, 9000, 9000);
      tracePath(pts, smooth); c.globalAlpha = Math.min(0.55, op * 0.55) * A; c.strokeStyle = o.fill;
      c.lineWidth = 6 + (o.border ?? 0.35) * 26; c.lineJoin = 'round'; c.stroke();
    }
    if (o.hatch) {
      const h = o.hatch, d = Math.max(8, (h.d || 20) * 0.9), a = ((h.a || 0) * Math.PI) / 180 - 0.3;
      c.globalAlpha = 0.45 * A; c.strokeStyle = h.c || PAL.ink; c.lineWidth = (h.w || 1) * 1.6;
      c.beginPath();
      let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
      for (const p of pts) { minx = Math.min(minx, p[0]); miny = Math.min(miny, p[1]); maxx = Math.max(maxx, p[0]); maxy = Math.max(maxy, p[1]); }
      const R = Math.hypot(maxx - minx, maxy - miny), cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
      for (let k = -R; k < R; k += d) {
        const ox = cx + Math.cos(a + Math.PI / 2) * k, oy = cy + Math.sin(a + Math.PI / 2) * k;
        c.moveTo(ox - Math.cos(a) * R, oy - Math.sin(a) * R); c.lineTo(ox + Math.cos(a) * R, oy + Math.sin(a) * R);
      }
      c.stroke();
    }
    c.restore();
  }
  if (o.ink !== null) {
    const w = (o.sw ?? 1) * INK_K, col = o.ink || PAL.ink;
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = col;
    tracePath(pts, smooth); c.globalAlpha = 0.95 * A; c.lineWidth = w; c.stroke();
    if (w > 1.6) {
      c.save(); c.translate(jit(w * 0.5), jit(w * 0.5)); tracePath(pts, smooth); c.globalAlpha = 0.35 * A; c.lineWidth = w * 0.5; c.stroke(); c.restore();
    }
  }
  c.globalAlpha = 1;
}

export function inkLine(pts: any, sw = 1, col = PAL.ink, br = 'ink', curv = 0.5, a = 1) {
  if (!pts || pts.length < 2) return;
  const c = S.ctx; c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = col;
  tracePath(pts, curv > 0 && pts.length > 2, false);
  c.globalAlpha = (br === 'dry' ? 0.75 : 0.95) * a * (S.alpha ?? 1); c.lineWidth = sw * INK_K; c.stroke(); c.globalAlpha = 1;
}
// thick tube (tentacles, snakes, ropes): ink rim + colour core
export function tube(pts: any, w: number, col: string, rim = PAL.ink, a = 1) {
  const c = S.ctx; c.lineJoin = 'round'; c.lineCap = 'round';
  tracePath(pts, true, false); c.globalAlpha = a; c.strokeStyle = rim; c.lineWidth = w + 5; c.stroke();
  tracePath(pts, true, false); c.strokeStyle = col; c.lineWidth = w; c.stroke(); c.globalAlpha = 1;
}
// quick soft watercolor blob
export function blob(x: number, y: number, r: number, col: string, op = 120) {
  const c = S.ctx, g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, col + '00');
  c.globalAlpha = op / 255; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1;
}
export function lineGrad(x0: number, y0: number, x1: number, y1: number, stops: any[]) {
  const g = S.ctx.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) g.addColorStop(o, c); return g;
}
// full-frame (screen space) gradient background
export function bg(c1: string, c2: string, c3?: string) {
  const c = S.ctx; c.fillStyle = lineGrad(0, 0, 0, H, c3 ? [[0, c1], [0.55, c2], [1, c3]] : [[0, c1], [1, c2]]);
  c.fillRect(-4000, -4000, 9000, 9000);
}
export function fillAll(col: string, a = 1) { const c = S.ctx; c.globalAlpha = a; c.fillStyle = col; c.fillRect(-4000, -4000, 9000, 9000); c.globalAlpha = 1; }

// ---------- lettering ----------
export function letter(txt: string, x: number, y: number, size: number, color: string, o: any = {}) {
  const c = S.ctx, p = o.pop ?? 1; if (p <= 0 || (o.alpha ?? 1) <= 0) return;
  const k = o.pop != null ? Math.max(0.01, backOut(p)) : 1;
  c.save(); c.translate(x, y); c.rotate(o.rot || 0); c.scale(k, k);
  c.globalAlpha = o.alpha ?? 1;
  c.font = `${size}px ${o.font || '"Permanent Marker", "Comic Sans MS", cursive'}`;
  c.textAlign = o.align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (o.ink !== false) { c.lineWidth = size * 0.16; c.strokeStyle = PAL.ink; c.strokeText(txt, size * 0.03, size * 0.05); }
  if (o.stroke) { c.lineWidth = size * 0.1; c.strokeStyle = o.stroke; c.strokeText(txt, 0, 0); }
  c.fillStyle = color; c.fillText(txt, 0, 0);
  c.restore();
}
export function sfx(txt: string, x: number, y: number, size: number, color: string, age: number, o: any = {}) {
  const life = o.life ?? 1.2; if (age < 0 || age > life) return;
  const fade = 1 - ease((age - life * 0.7) / (life * 0.3));
  letter(txt, x, y, size, color, { pop: age * 5, rot: (o.rot ?? -0.08) + Math.sin(age * 20) * 0.03 * (1 - age / life), alpha: fade });
}

// ---------- full-frame effects (screen space, outside a camera) ----------
export function flash(k: number, col = '#FFFDF6') {
  if (k > 0.01) { const c = S.ctx; c.globalAlpha = clamp(k); c.fillStyle = col; c.fillRect(-60, -60, W + 120, H + 120); c.globalAlpha = 1; }
  if (k > 0.6) S.meterShown = true;
}
export function irisShape(pts: any, col = PAL.ink) {
  const c = S.ctx; c.save(); c.beginPath(); c.rect(-100, -100, W + 200, H + 200);
  const n = pts.length; c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath();
  c.fillStyle = col; c.fill('evenodd'); c.restore();
}
export function iris(cx: number, cy: number, r: number, col = PAL.ink) {
  if (r < 60) S.meterShown = true;
  const c = S.ctx;
  if (r < 2) { c.fillStyle = col; c.fillRect(-100, -100, W + 200, H + 200); return; }
  c.save(); c.beginPath(); c.rect(-100, -100, W + 200, H + 200); c.moveTo(cx + r, cy); c.arc(cx, cy, r, 0, TAU, true);
  c.fillStyle = col; c.fill('evenodd'); c.restore();
}
