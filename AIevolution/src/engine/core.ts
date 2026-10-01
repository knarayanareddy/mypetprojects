// Watercolor-ish painting engine on Canvas2D.
// Every shot is a PURE FUNCTION of song time t (no state between frames, no Math.random),
// exactly like the frame-parallel renderer in the PDoomVideo project. `jit` is reseeded 12x/s
// so linework "boils" like hand-drawn animation.

export const W = 1920;
export const H = 1080;
export const BPM = 96;
export const BEAT = 60 / BPM; // 0.625s
export const BAR = BEAT * 4; // 2.5s
export const FONT = `'Permanent Marker','Comic Sans MS','Chalkboard SE','Marker Felt',cursive`;
export const TAU = Math.PI * 2;

export type Pt = [number, number];

export let g: CanvasRenderingContext2D = null as unknown as CanvasRenderingContext2D;
export let T = 0;
let seedN = 0;
let ctr = 0;
let pxScale = 1;

// ---------- math ----------
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const frac = (x: number) => x - Math.floor(x);
export const ease = (x: number) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x: number) => Math.pow(clamp(x), 3);
export const backOut = (x: number) => {
  x = clamp(x);
  const c = 2.70158;
  return 1 + c * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
};
export const elasticOut = (x: number) => {
  x = clamp(x);
  return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1;
};
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const wob = (t: number, f = 1, p = 0) => Math.sin(t * TAU * f + p);
export const pulse = (t: number, k = 5) => Math.exp(-frac(t / BEAT) * k);
export const beatN = (t: number) => Math.floor(t / BEAT);
export const jit = (a: number) => (hash(seedN * 131.7 + ctr++ * 7.13) - 0.5) * 2 * a;
export const shake = (t: number, a: number): Pt => [
  (hash(Math.floor(t * 30) * 1.7) - 0.5) * 2 * a,
  (hash(Math.floor(t * 30) * 3.1 + 9) - 0.5) * 2 * a,
];
export function kf(t: number, keys: [number, number][], e: (x: number) => number = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (t < keys[i + 1][0]) return lerp(keys[i][1], keys[i + 1][1], e(seg(t, keys[i][0], keys[i + 1][0])));
  }
  return keys[keys.length - 1][1];
}

// ---------- colour ----------
export const PAL = {
  paper: '#f3e9d2',
  ink: '#2b2638',
  night: '#1b1f3f',
  indigo: '#39407e',
  clay: '#e07a4f',
  rose: '#e86a7e',
  ochre: '#eab04a',
  sap: '#7db56a',
  teal: '#3fa7a0',
  violet: '#8a6fc7',
  cream: '#fff3da',
  sky: '#8ecae6',
  bit: '#4fb3c8',
  red: '#d64545',
  wood: '#c98f55',
  steel: '#8aa0b4',
};
const colCache = new Map<string, [number, number, number]>();
function parse(c: string): [number, number, number] {
  let r = colCache.get(c);
  if (r) return r;
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    r = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  } else {
    const m = c.match(/[\d.]+/g)!;
    r = [+m[0], +m[1], +m[2]];
  }
  if (colCache.size > 3000) colCache.clear();
  colCache.set(c, r);
  return r;
}
export function mixCol(a: string, b: string, k: number) {
  const A = parse(a);
  const B = parse(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(
    A[2] + (B[2] - A[2]) * k,
  )})`;
}
export const shade = (c: string, k: number) => (k < 0 ? mixCol(c, '#241a30', -k) : mixCol(c, '#fff6e4', k));
export function rgba(c: string, a: number) {
  const [r, gg, b] = parse(c);
  return `rgba(${r},${gg},${b},${a})`;
}

// ---------- frame lifecycle ----------
export function beginFrame(ctx: CanvasRenderingContext2D, t: number, scale: number) {
  g = ctx;
  T = t;
  seedN = Math.floor(t * 12);
  ctr = 0;
  pxScale = scale;
  g.setTransform(scale, 0, 0, scale, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.shadowBlur = 0;
}

let grainPat: CanvasPattern | null = null;
let vignette: HTMLCanvasElement | null = null;
function makeGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d')!;
  const id = x.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) {
    const v = 232 + hash(i * 0.37) * 23 - (hash(i * 1.91 + 5) > 0.985 ? 22 : 0);
    id.data[i * 4] = v;
    id.data[i * 4 + 1] = v - 3;
    id.data[i * 4 + 2] = v - 8;
    id.data[i * 4 + 3] = 255;
  }
  x.putImageData(id, 0, 0);
  for (let i = 0; i < 60; i++) {
    x.globalAlpha = 0.05;
    x.strokeStyle = '#8a7350';
    x.beginPath();
    const px = hash(i * 3.3) * 512;
    const py = hash(i * 7.7) * 512;
    x.moveTo(px, py);
    x.quadraticCurveTo(px + hash(i) * 40 - 20, py + hash(i + 3) * 40 - 20, px + hash(i + 5) * 60 - 30, py + hash(i + 9) * 60 - 30);
    x.stroke();
  }
  grainPat = g.createPattern(c, 'repeat');
}
export function finishFrame(cw: number, ch: number) {
  if (!grainPat) makeGrain();
  if (!vignette || vignette.width !== cw) {
    vignette = document.createElement('canvas');
    vignette.width = cw;
    vignette.height = ch;
    const x = vignette.getContext('2d')!;
    const gr = x.createRadialGradient(cw / 2, ch / 2, ch * 0.45, cw / 2, ch / 2, cw * 0.72);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgb(150,120,100)');
    x.fillStyle = gr;
    x.fillRect(0, 0, cw, ch);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'multiply';
  g.save();
  g.translate(Math.floor(hash(seedN * 1.3) * 200), Math.floor(hash(seedN * 2.9) * 200));
  g.fillStyle = grainPat!;
  g.fillRect(-300, -300, cw + 600, ch + 600);
  g.restore();
  g.drawImage(vignette, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.setTransform(pxScale, 0, 0, pxScale, 0, 0);
}

// ---------- geometry ----------
export const rectPts = (x: number, y: number, w: number, h: number, j = 0): Pt[] => [
  [x + jit(j), y + jit(j)],
  [x + w + jit(j), y + jit(j)],
  [x + w + jit(j), y + h + jit(j)],
  [x + jit(j), y + h + jit(j)],
];
export function ellPts(cx: number, cy: number, rx: number, ry: number, n = 18, j = 0, rot = 0): Pt[] {
  const o: Pt[] = [];
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx + jit(j);
    const y = Math.sin(a) * ry + jit(j);
    o.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return o;
}
export function rrPts(x: number, y: number, w: number, h: number, r: number, j = 0): Pt[] {
  r = Math.min(r, w / 2, h / 2);
  const o: Pt[] = [];
  const corners: [number, number, number][] = [
    [x + w - r, y + r, -Math.PI / 2],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * (Math.PI / 2);
      o.push([cx + Math.cos(a) * r + jit(j), cy + Math.sin(a) * r + jit(j)]);
    }
  }
  return o;
}
export function starPts(cx: number, cy: number, r: number, inner = 0.5, n = 5, rot = -Math.PI / 2): Pt[] {
  const o: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * TAU;
    const rr = i % 2 ? r * inner : r;
    o.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return o;
}
export function heartPts(cx: number, cy: number, r: number): Pt[] {
  const o: Pt[] = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU;
    const x = 16 * Math.pow(Math.sin(a), 3);
    const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    o.push([cx + (x / 17) * r, cy + (y / 17) * r - r * 0.1]);
  }
  return o;
}

// ---------- painting ----------
function trace(P: Pt[], curv: boolean, close = true) {
  g.beginPath();
  const n = P.length;
  if (!curv || n < 3) {
    g.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < n; i++) g.lineTo(P[i][0], P[i][1]);
    if (close) g.closePath();
    return;
  }
  if (close) {
    g.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = P[i];
      const q = P[(i + 1) % n];
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    g.closePath();
  } else {
    g.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
    g.lineTo(P[n - 1][0], P[n - 1][1]);
  }
}

export interface PO {
  op?: number;
  ink?: string | null;
  sw?: number;
  curv?: boolean;
  lit?: boolean;
  edge?: number;
  n?: number;
  [k: string]: unknown;
}

/** paint one watercolour shape: flat wash + pigment pooled at the edge + highlight/shadow blooms + wobbly ink. */
export function paint(pts: Pt[], fill: string | null, o: PO = {}) {
  const P = pts.map((p) => [p[0] + jit(1.4), p[1] + jit(1.4)] as Pt);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;
  for (const p of P) {
    if (p[0] < x0) x0 = p[0];
    if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[1] > y1) y1 = p[1];
  }
  const w = x1 - x0;
  const h = y1 - y0;
  if (fill) {
    trace(P, !!o.curv);
    g.globalAlpha = o.op ?? 0.94;
    g.fillStyle = fill;
    g.fill();
    if ((o.edge ?? 1) > 0) {
      g.globalAlpha = 0.28 * (o.edge ?? 1);
      g.strokeStyle = shade(fill, -0.25);
      g.lineWidth = 5;
      g.stroke();
    }
    if (o.lit !== false && w * h > 1800) {
      g.save();
      g.clip();
      g.globalAlpha = 0.3;
      g.fillStyle = shade(fill, 0.4);
      g.beginPath();
      g.ellipse(x0 + w * 0.32, y0 + h * 0.28, w * 0.3, h * 0.24, -0.4, 0, TAU);
      g.fill();
      g.globalAlpha = 0.16;
      g.fillStyle = shade(fill, -0.35);
      g.beginPath();
      g.ellipse(x0 + w * 0.72, y0 + h * 0.86, w * 0.42, h * 0.3, 0.2, 0, TAU);
      g.fill();
      g.restore();
    }
  }
  if (o.ink !== null) {
    const ink = o.ink ?? PAL.ink;
    const sw = o.sw ?? 2.6;
    const Q = P.map((p) => [p[0] + jit(1.1), p[1] + jit(1.1)] as Pt);
    trace(Q, !!o.curv);
    g.globalAlpha = 0.92;
    g.strokeStyle = ink;
    g.lineWidth = sw;
    g.stroke();
    if (w * h > 900) {
      const Q2 = P.map((p) => [p[0] + jit(1.6), p[1] + jit(1.6)] as Pt);
      trace(Q2, !!o.curv);
      g.globalAlpha = 0.4;
      g.lineWidth = sw * 0.5;
      g.stroke();
    }
  }
  g.globalAlpha = 1;
}
export const poly = (pts: Pt[], fill: string | null, o: PO = {}) => paint(pts, fill, o);
export const rect = (x: number, y: number, w: number, h: number, fill: string | null, o: PO = {}) => paint(rectPts(x, y, w, h), fill, o);
export const ell = (cx: number, cy: number, rx: number, ry: number, fill: string | null, o: PO = {}) =>
  paint(ellPts(cx, cy, rx, ry, o.n ?? 16, 0, (o.rot as number) ?? 0), fill, { curv: true, ...o });
export const rr = (x: number, y: number, w: number, h: number, r: number, fill: string | null, o: PO = {}) =>
  paint(rrPts(x, y, w, h, r), fill, o);

export function inkLine(pts: Pt[], sw = 3, col: string = PAL.ink, curv = true, alpha = 0.92) {
  if (pts.length < 2) return;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const A = pts.map((p) => [p[0] + jit(1), p[1] + jit(1)] as Pt);
  trace(A, curv, false);
  g.globalAlpha = alpha;
  g.strokeStyle = col;
  g.lineWidth = sw;
  g.stroke();
  if (sw > 2.2) {
    const B = pts.map((p) => [p[0] + jit(1.5), p[1] + jit(1.5)] as Pt);
    trace(B, curv, false);
    g.globalAlpha = alpha * 0.4;
    g.lineWidth = sw * 0.45;
    g.stroke();
  }
  g.globalAlpha = 1;
}
export const line = (x1: number, y1: number, x2: number, y2: number, sw = 3, col: string = PAL.ink, alpha = 0.92) =>
  inkLine(
    [
      [x1, y1],
      [x2, y2],
    ],
    sw,
    col,
    false,
    alpha,
  );

/** soft radial glow */
export function glow(x: number, y: number, r: number, col: string, a = 0.5) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a));
  gr.addColorStop(1, rgba(col, 0));
  g.globalAlpha = 1;
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** full-frame paper wash (optionally vertical gradient), with soft pigment blotches */
export function bg(c1: string, c2?: string) {
  g.globalAlpha = 1;
  g.fillStyle = PAL.paper;
  g.fillRect(0, 0, W, H);
  let fs: string | CanvasGradient = c1;
  if (c2) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, c1);
    gr.addColorStop(1, c2);
    fs = gr;
  }
  g.globalAlpha = 0.94;
  g.fillStyle = fs;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) {
    const cx = hash(i * 3.1) * W;
    const cy = hash(i * 5.7 + 2) * H;
    const r = 260 + hash(i * 1.3) * 380;
    glow(cx, cy, r, i % 2 ? '#ffffff' : '#3a2a40', 0.1);
  }
  g.globalAlpha = 1;
}

// ---------- camera ----------
export function camBegin(cx: number, cy: number, zoom = 1, rot = 0) {
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(rot);
  g.scale(zoom, zoom);
  g.translate(-cx, -cy);
}
export const camEnd = () => g.restore();

// ---------- lettering ----------
interface LO {
  pop?: number;
  rot?: number;
  alpha?: number;
  align?: string;
  ink?: boolean;
  font?: string;
}
export function letter(txt: string, x: number, y: number, size: number, col: string, o: LO = {}) {
  const pop = o.pop ?? 1;
  if (pop <= 0) return;
  const s = o.pop === undefined ? 1 : backOut(pop);
  g.save();
  g.translate(x, y);
  g.rotate(o.rot ?? 0);
  g.scale(s, s);
  g.globalAlpha = (o.alpha ?? 1) * clamp(pop * 3);
  g.font = `${size}px ${o.font ?? FONT}`;
  g.textAlign = (o.align ?? 'center') as CanvasTextAlign;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  if (o.ink !== false) {
    g.fillStyle = PAL.ink;
    g.fillText(txt, size * 0.045, size * 0.055);
    g.strokeStyle = PAL.ink;
    g.lineWidth = size * 0.11;
    g.strokeText(txt, 0, 0);
  }
  g.fillStyle = col;
  g.fillText(txt, 0, 0);
  g.restore();
  g.globalAlpha = 1;
}
export function sfx(txt: string, x: number, y: number, size: number, col: string, age: number, o: { life?: number; rot?: number } = {}) {
  const life = o.life ?? 1.4;
  if (age < 0 || age > life) return;
  const pop = age / 0.22;
  const a = 1 - seg(age, life * 0.7, life);
  const sc = backOut(pop);
  poly(starPts(x, y, size * 1.15 * sc, 0.62, 9, wob(age, 1) * 0.1), col, { sw: 3.5, op: 0.95 * a, edge: a });
  letter(txt, x, y, size, PAL.cream, { pop, rot: (o.rot ?? -0.12) + wob(age, 3) * 0.04, alpha: a });
}

// ---------- full-frame effects ----------
export function flash(k: number, col = '#fff6e0') {
  if (k <= 0) return;
  g.globalAlpha = clamp(k);
  g.fillStyle = col;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
}
export function irisShape(pts: Pt[], col: string) {
  g.fillStyle = col;
  g.beginPath();
  g.rect(-50, -50, W + 100, H + 100);
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fill('evenodd');
}
export function iris(cx: number, cy: number, r: number, col: string) {
  if (r > W) return;
  irisShape(ellPts(cx, cy, Math.max(r, 0.1), Math.max(r, 0.1), 48), col);
}

/** brush-stroke wipe centred on time tb: bands sweep in from the left, then sweep off */
export function brushWipe(t: number, tb: number, dur: number, cols: string[]) {
  const u = (t - tb) / dur + 0.5;
  if (u <= 0 || u >= 1) return;
  const cover = u < 0.5;
  const k = ease(cover ? u * 2 : (u - 0.5) * 2);
  const N = 12;
  const bh = H / N;
  g.globalAlpha = 1;
  for (let l = 0; l < cols.length; l++) {
    g.fillStyle = cols[l];
    for (let i = 0; i < N; i++) {
      const p = clamp(k * 1.35 - hash(i * 7.3 + l * 2.1) * 0.35 - l * 0.07);
      const edge = p * (W + 300) - 150;
      const y = i * bh - 6;
      if (cover) {
        g.beginPath();
        g.rect(-60, y, edge + 60, bh + 12);
        g.ellipse(edge, y + bh / 2 + 6, 60 + hash(i) * 40, bh * 0.62, 0, 0, TAU);
        g.fill();
      } else {
        if (l > 0) continue;
        g.beginPath();
        g.rect(edge, y, W - edge + 60, bh + 12);
        g.ellipse(edge, y + bh / 2 + 6, 60 + hash(i) * 40, bh * 0.62, 0, 0, TAU);
        g.fill();
      }
    }
  }
  if (!cover) {
    // keep top colour layer sweeping off, tinted with the second colour edge
    g.fillStyle = cols[cols.length - 1];
  }
}
