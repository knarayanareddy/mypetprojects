// Camera → world calibration + object localisation.
//
// World frame (cm) = the frame skills.ts / kin.ts use:  x → right (arm A base x=-16, arm B base x=+16),
// z → toward the viewer, arms sit at z=+14 and reach toward -z; table surface is y=0.
//
// How it works
//  1. A fixed overhead camera looks at the table. The user clicks 4+ reference marks in the live image and types
//     the cm position of each mark (measured with a ruler from the arm bases). A planar homography H (pixel → cm)
//     is solved by DLT / least squares. The reprojection error (cm) is shown so a bad click is obvious.
//  2. `detect()` thresholds the frame in HSV for each scene object's colour, labels connected blobs, and maps blob
//     centroids through H. Skills call `hub.relocate()` before every pick, so a moved cube is found where it is
//     instead of where the script remembers it.
//
// Limits (honest): single plane (table), objects assumed to sit on it; centroid of a 3D object seen from above is
// biased by its height × camera tilt – keep the camera close to top-down, or correct with `heightBias`.
import { cameras, CamSlot } from "./cameras";
import { backup } from "./persist";

export type Pt = [number, number];
export type Mat3 = number[]; // row-major, length 9

export const DEFAULT_REF_WORLD: Pt[] = [[-20, -10], [20, -10], [20, 8], [-20, 8]];

/** Solve H such that dst ≈ H·src (homogeneous). ≥4 correspondences; least squares via normal equations. */
export function solveHomography(src: Pt[], dst: Pt[]): Mat3 | null {
  if (src.length < 4 || src.length !== dst.length) return null;
  // Normalise for numerical stability (Hartley)
  const norm = (pts: Pt[]) => {
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const d = pts.reduce((a, p) => a + Math.hypot(p[0] - cx, p[1] - cy), 0) / pts.length || 1;
    const s = Math.SQRT2 / d;
    return { s, cx, cy, pts: pts.map((p) => [(p[0] - cx) * s, (p[1] - cy) * s] as Pt) };
  };
  const a = norm(src), b = norm(dst);
  const A: number[][] = [], y: number[] = [];
  for (let i = 0; i < src.length; i++) {
    const [x, yy] = a.pts[i], [u, v] = b.pts[i];
    A.push([x, yy, 1, 0, 0, 0, -u * x, -u * yy]); y.push(u);
    A.push([0, 0, 0, x, yy, 1, -v * x, -v * yy]); y.push(v);
  }
  // normal equations (AᵀA) h = Aᵀy
  const n = 8;
  const M = Array.from({ length: n }, () => Array(n + 1).fill(0));
  for (let r = 0; r < A.length; r++) for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) M[i][j] += A[r][i] * A[r][j]; M[i][n] += A[r][i] * y[r]; }
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const h = M.map((row, i) => row[n] / row[i]);
  const Hn: Mat3 = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  // denormalise: H = T_dst⁻¹ · Hn · T_src
  const Ts = [a.s, 0, -a.s * a.cx, 0, a.s, -a.s * a.cy, 0, 0, 1];
  const Tdi = [1 / b.s, 0, b.cx, 0, 1 / b.s, b.cy, 0, 0, 1];
  const H = mul(Tdi, mul(Hn, Ts));
  const k = H[8] || 1;
  return H.map((v) => v / k);
}
const mul = (A: Mat3, B: Mat3): Mat3 => {
  const C = Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
  return C;
};
export function invert3(m: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-14) return null;
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map((v) => v / det);
}
export function applyH(H: Mat3, p: Pt): Pt {
  const w = H[6] * p[0] + H[7] * p[1] + H[8];
  return [(H[0] * p[0] + H[1] * p[1] + H[2]) / w, (H[3] * p[0] + H[4] * p[1] + H[5]) / w];
}

// ---------- colour helpers ----------
export function hexToHsv(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return rgbToHsv((n >> 16) & 255, (n >> 8) & 255, n & 255);
}
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, mx === 0 ? 0 : d / mx, mx];
}

export interface Blob { px: Pt; area: number; world: Pt | null }

/** Connected-component colour blobs. `img` is RGBA ImageData. */
export function findBlobs(img: ImageData, hex: string, opts: { hueTol?: number; minSat?: number; minVal?: number; minArea?: number } = {}): Blob[] {
  const { hueTol = 16, minSat = 0.38, minVal = 0.22, minArea = 14 } = opts;
  const [th] = hexToHsv(hex);
  const { width: W, height: H, data } = img;
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const [h, s, v] = rgbToHsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    const dh = Math.min(Math.abs(h - th), 360 - Math.abs(h - th));
    if (s >= minSat && v >= minVal && dh <= hueTol) mask[i] = 1;
  }
  const seen = new Uint8Array(W * H), out: Blob[] = [], stack: number[] = [];
  for (let s0 = 0; s0 < W * H; s0++) {
    if (!mask[s0] || seen[s0]) continue;
    let area = 0, sx = 0, sy = 0;
    stack.push(s0); seen[s0] = 1;
    while (stack.length) {
      const p = stack.pop()!, x = p % W, y = (p / W) | 0;
      area++; sx += x; sy += y;
      if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x < W - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && mask[p - W] && !seen[p - W]) { seen[p - W] = 1; stack.push(p - W); }
      if (y < H - 1 && mask[p + W] && !seen[p + W]) { seen[p + W] = 1; stack.push(p + W); }
    }
    if (area >= minArea) out.push({ px: [sx / area, sy / area], area, world: null });
  }
  return out.sort((a, b) => b.area - a.area);
}

// ---------- persistent calibration ----------
const KEY = "so101.vision";
export interface VisionCal { slot: CamSlot; refPx: Pt[]; refWorld: Pt[]; H: Mat3; rmse: number; frameW: number; frameH: number; heightBias: number }

class Vision {
  cal: VisionCal | null = null;
  draftPx: Pt[] = [];
  draftWorld: Pt[] = DEFAULT_REF_WORLD.map((p) => [...p] as Pt);
  slot: CamSlot = "top";
  lastBlobs: { id: string; color: string; world: Pt; px: Pt; area: number }[] = [];
  lastDetectAt = 0;
  version = 0;
  listeners = new Set<() => void>();
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getVersion = () => this.version;
  private emit() { this.version++; this.listeners.forEach((l) => l()); }

  constructor() { this.reload(); }
  reload() {
    try {
      const t = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
      if (t) { this.cal = JSON.parse(t); if (this.cal) { this.slot = this.cal.slot; this.draftPx = this.cal.refPx.map((p) => [...p] as Pt); this.draftWorld = this.cal.refWorld.map((p) => [...p] as Pt); } }
    } catch { /* ignore */ }
  }

  get ready() { return !!this.cal && cameras.active(this.cal.slot); }

  addPoint(px: Pt) { if (this.draftPx.length < this.draftWorld.length) { this.draftPx.push(px); this.emit(); } }
  clearPoints() { this.draftPx = []; this.emit(); }
  setWorld(i: number, w: Pt) { this.draftWorld[i] = w; this.emit(); }
  addRef() { this.draftWorld.push([0, 0]); this.emit(); }
  popRef() { if (this.draftWorld.length > 4) { this.draftWorld.pop(); this.draftPx = this.draftPx.slice(0, this.draftWorld.length); this.emit(); } }

  solve(frameW: number, frameH: number): VisionCal {
    if (this.draftPx.length < 4 || this.draftPx.length !== this.draftWorld.length) throw new Error(`click all ${this.draftWorld.length} reference marks in the image first`);
    const H = solveHomography(this.draftPx, this.draftWorld);
    if (!H) throw new Error("degenerate reference points (are 3 of them in a line?)");
    const err = this.draftPx.map((p, i) => { const w = applyH(H, p); return Math.hypot(w[0] - this.draftWorld[i][0], w[1] - this.draftWorld[i][1]); });
    const rmse = Math.sqrt(err.reduce((a, e) => a + e * e, 0) / err.length);
    this.cal = { slot: this.slot, refPx: this.draftPx.map((p) => [...p] as Pt), refWorld: this.draftWorld.map((p) => [...p] as Pt), H, rmse, frameW, frameH, heightBias: 0 };
    this.persist();
    return this.cal;
  }
  persist() { try { localStorage.setItem(KEY, JSON.stringify(this.cal)); } catch { /* */ } backup(KEY, this.cal); this.emit(); }
  clear() { this.cal = null; this.draftPx = []; this.lastBlobs = []; try { localStorage.removeItem(KEY); } catch { /* */ } this.emit(); }

  /** pixel in *native video* coordinates → world cm (x,z) */
  pxToWorld(px: Pt): Pt | null { return this.cal ? applyH(this.cal.H, px) : null; }
  worldToPx(w: Pt): Pt | null { if (!this.cal) return null; const inv = invert3(this.cal.H); return inv ? applyH(inv, w) : null; }

  /** full-frame (not centre-cropped) RGBA grab, downscaled to `width`; returns scale native/grab */
  grab(slot: CamSlot, width = 320): { img: ImageData; scale: number } | null {
    const v = cameras.slots[slot].video;
    if (!v || !v.videoWidth) return null;
    const scale = v.videoWidth / width, h = Math.round(v.videoHeight / scale);
    const c = document.createElement("canvas"); c.width = width; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(v, 0, 0, width, h);
    return { img: ctx.getImageData(0, 0, width, h), scale };
  }

  /** Locate coloured objects. `want` = scene objects to find (id,color). Greedy nearest assignment to expected positions. */
  detect(want: { id: string; color: string; expect: Pt }[]): { id: string; world: Pt; px: Pt; area: number }[] {
    if (!this.cal) throw new Error("camera not calibrated");
    const g = this.grab(this.cal.slot);
    if (!g) throw new Error(`camera slot “${this.cal.slot}” is not streaming`);
    const byColor = new Map<string, typeof want>();
    for (const w of want) byColor.set(w.color.toLowerCase(), [...(byColor.get(w.color.toLowerCase()) ?? []), w]);
    const found: { id: string; world: Pt; px: Pt; area: number }[] = [];
    for (const [color, ws] of byColor) {
      const blobs = findBlobs(g.img, color).slice(0, ws.length + 3).map((b) => {
        const px: Pt = [b.px[0] * g.scale, b.px[1] * g.scale];
        return { ...b, px, world: this.pxToWorld(px)! };
      });
      const used = new Set<number>();
      for (const w of ws) {
        let best = -1, bd = Infinity;
        blobs.forEach((b, i) => { if (used.has(i)) return; const d = Math.hypot(b.world[0] - w.expect[0], b.world[1] - w.expect[1]); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { used.add(best); found.push({ id: w.id, world: blobs[best].world, px: blobs[best].px, area: blobs[best].area }); }
      }
    }
    this.lastBlobs = found.map((f) => ({ ...f, color: want.find((w) => w.id === f.id)!.color }));
    this.lastDetectAt = Date.now();
    this.emit();
    return found;
  }
}

export const vision = new Vision();
