/**
 * Camera -> table-plane calibration and object detection.
 *
 * Calibration honesty: a homography fitted to N marks reproduces those marks
 * (nearly) exactly, so the in-sample residual says nothing about accuracy
 * elsewhere on the table. Accuracy is therefore reported ONLY from
 *   (a) held-out PROBE marks (never used in the fit), or
 *   (b) leave-one-out cross-validation when there are >= 5 fit marks.
 * With exactly 4 fit marks and no probe the result is "unvalidated".
 */

export interface Pt {
  x: number;
  y: number;
}
export type Mat3 = number[]; // row-major, 9 entries

export interface Mark {
  id: string;
  px: Pt; // image pixel
  world: Pt; // robot-frame cm
  role: "fit" | "probe";
}

function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

function mul3(a: Mat3, b: Mat3): Mat3 {
  const o = new Array<number>(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return o;
}

function inv3(m: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-14) return null;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

function normalizer(pts: Pt[]): Mat3 {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const md = pts.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / pts.length || 1;
  const s = Math.SQRT2 / md;
  return [s, 0, -s * cx, 0, s, -s * cy, 0, 0, 1];
}

export function applyH(H: Mat3, p: Pt): Pt {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}

/** Least-squares homography src -> dst (>= 4 points, Hartley-normalised DLT with h33 = 1). */
export function solveHomography(src: Pt[], dst: Pt[]): Mat3 | null {
  if (src.length < 4 || src.length !== dst.length) return null;
  const Ts = normalizer(src);
  const Td = normalizer(dst);
  const s = src.map((p) => applyH(Ts, p));
  const d = dst.map((p) => applyH(Td, p));
  const AtA: number[][] = Array.from({ length: 8 }, () => new Array<number>(8).fill(0));
  const Atb = new Array<number>(8).fill(0);
  const acc = (row: number[], rhs: number) => {
    for (let i = 0; i < 8; i++) {
      Atb[i] += row[i] * rhs;
      for (let j = 0; j < 8; j++) AtA[i][j] += row[i] * row[j];
    }
  };
  for (let i = 0; i < s.length; i++) {
    const { x, y } = s[i];
    const { x: u, y: v } = d[i];
    acc([x, y, 1, 0, 0, 0, -u * x, -u * y], u);
    acc([0, 0, 0, x, y, 1, -v * x, -v * y], v);
  }
  const h = solveLinear(AtA, Atb);
  if (!h) return null;
  const Hn: Mat3 = [...h, 1];
  const Ti = inv3(Td);
  if (!Ti) return null;
  const H = mul3(mul3(Ti, Hn), Ts);
  const k = H[8] || 1;
  return H.map((v) => v / k);
}

function stats(errs: number[]) {
  const a = [...errs].sort((x, y) => x - y);
  const q = (p: number) => a[Math.min(a.length - 1, Math.floor(p * (a.length - 1) + 0.5))];
  return { median: q(0.5), p90: q(0.9), max: a[a.length - 1], n: a.length };
}

export interface CalibrationReport {
  H: Mat3 | null;
  nFit: number;
  nProbe: number;
  /** Informational ONLY. Near zero by construction; never used for pass/fail. */
  inSampleRmse: number | null;
  heldOut: { method: "probe" | "loocv"; median: number; p90: number; max: number; n: number } | null;
  status: "insufficient" | "unvalidated" | "ok" | "warn";
  message: string;
}

export const ACCURACY_TARGET_CM = 0.8;
export const ACCURACY_MAX_CM = 2.0;

export function fitAndValidate(marks: Mark[]): CalibrationReport {
  const fit = marks.filter((m) => m.role === "fit");
  const probes = marks.filter((m) => m.role === "probe");
  const base = { nFit: fit.length, nProbe: probes.length, inSampleRmse: null as number | null, heldOut: null as CalibrationReport["heldOut"] };
  if (fit.length < 4) return { ...base, H: null, status: "insufficient", message: `Need at least 4 fit marks (have ${fit.length}). Spread them over the whole working area.` };
  const H = solveHomography(fit.map((m) => m.px), fit.map((m) => m.world));
  if (!H) return { ...base, H: null, status: "insufficient", message: "Marks are degenerate (collinear or duplicated). Spread them in a quadrilateral." };
  const inSample = Math.sqrt(fit.reduce((s, m) => s + dist2(applyH(H, m.px), m.world), 0) / fit.length);
  let heldOut: CalibrationReport["heldOut"] = null;
  if (probes.length >= 1) {
    const e = probes.map((m) => Math.sqrt(dist2(applyH(H, m.px), m.world)));
    heldOut = { method: "probe", ...stats(e) };
  } else if (fit.length >= 5) {
    const e: number[] = [];
    for (let i = 0; i < fit.length; i++) {
      const rest = fit.filter((_, k) => k !== i);
      const Hi = solveHomography(rest.map((m) => m.px), rest.map((m) => m.world));
      if (Hi) e.push(Math.sqrt(dist2(applyH(Hi, fit[i].px), fit[i].world)));
    }
    if (e.length) heldOut = { method: "loocv", ...stats(e) };
  }
  if (!heldOut) {
    return { ...base, H, inSampleRmse: inSample, status: "unvalidated", message: "Fitted, but accuracy is UNVALIDATED: add 2-3 probe marks (touch/click spots not used in the fit) or a 5th+ fit mark." };
  }
  const good = heldOut.median <= ACCURACY_TARGET_CM && heldOut.max <= ACCURACY_MAX_CM;
  const how = heldOut.method === "probe" ? `${heldOut.n} held-out probe(s)` : `leave-one-out over ${heldOut.n} marks (conservative)`;
  return {
    ...base,
    H,
    inSampleRmse: inSample,
    heldOut,
    status: good ? "ok" : "warn",
    message: good
      ? `Held-out error ${heldOut.median.toFixed(2)} cm median / ${heldOut.max.toFixed(2)} cm max (${how}).`
      : `Held-out error ${heldOut.median.toFixed(2)} cm median / ${heldOut.max.toFixed(2)} cm max (${how}) exceeds ${ACCURACY_TARGET_CM} cm. Add more fit marks spread over the table, re-click carefully, or fix camera focus/mount.`,
  };
}

const dist2 = (a: Pt, b: Pt) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export interface Detection {
  label: string;
  px: Pt;
  area: number;
  bbox: [number, number, number, number];
  world?: Pt;
}

export interface Img {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

interface DetectOpts {
  minArea?: number;
  maxArea?: number;
  step?: number;
  roi?: [number, number, number, number];
  label?: string;
}

function blobs(mask: Uint8Array, gw: number, gh: number, step: number, o: DetectOpts): Detection[] {
  const seen = new Uint8Array(mask.length);
  const out: Detection[] = [];
  const minA = (o.minArea ?? 150) / (step * step);
  const maxA = (o.maxArea ?? 40000) / (step * step);
  const stack: number[] = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || seen[s]) continue;
    let n = 0, sx = 0, sy = 0, x0 = gw, y0 = gh, x1 = 0, y1 = 0;
    stack.push(s);
    seen[s] = 1;
    while (stack.length) {
      const c = stack.pop()!;
      const x = c % gw;
      const y = (c / gw) | 0;
      n++;
      sx += x;
      sy += y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const k = ny * gw + nx;
        if (mask[k] && !seen[k]) {
          seen[k] = 1;
          stack.push(k);
        }
      }
    }
    if (n < minA || n > maxA) continue;
    out.push({ label: o.label ?? "object", px: { x: (sx / n) * step + step / 2, y: (sy / n) * step + step / 2 }, area: n * step * step, bbox: [x0 * step, y0 * step, (x1 + 1) * step, (y1 + 1) * step] });
  }
  return out.sort((a, b) => b.area - a.area);
}

function gridMask(img: Img, o: DetectOpts, test: (i: number) => boolean) {
  const step = o.step ?? 2;
  const gw = Math.floor(img.width / step);
  const gh = Math.floor(img.height / step);
  const mask = new Uint8Array(gw * gh);
  const [rx0, ry0, rx1, ry1] = o.roi ?? [0, 0, img.width, img.height];
  for (let gy = 0; gy < gh; gy++) {
    const y = gy * step;
    if (y < ry0 || y >= ry1) continue;
    for (let gx = 0; gx < gw; gx++) {
      const x = gx * step;
      if (x < rx0 || x >= rx1) continue;
      if (test((y * img.width + x) * 4)) mask[gy * gw + gx] = 1;
    }
  }
  return { mask, gw, gh, step };
}

/** Pixels whose RGB is within `tol` (euclidean) of a sampled colour. Works for dark objects too if the colour was sampled. */
export function detectByColor(img: Img, rgb: [number, number, number], tol = 55, o: DetectOpts = {}): Detection[] {
  const d = img.data;
  const t2 = tol * tol;
  const { mask, gw, gh, step } = gridMask(img, o, (i) => (d[i] - rgb[0]) ** 2 + (d[i + 1] - rgb[1]) ** 2 + (d[i + 2] - rgb[2]) ** 2 <= t2);
  return blobs(mask, gw, gh, step, o);
}

/** Background subtraction against an empty-table reference frame. Colour independent. */
export function detectByDiff(img: Img, bg: Img, thresh = 45, o: DetectOpts = {}): Detection[] {
  if (bg.width !== img.width || bg.height !== img.height) return [];
  const d = img.data;
  const b = bg.data;
  const { mask, gw, gh, step } = gridMask(img, o, (i) => Math.abs(d[i] - b[i]) + Math.abs(d[i + 1] - b[i + 1]) + Math.abs(d[i + 2] - b[i + 2]) > thresh);
  return blobs(mask, gw, gh, step, o);
}

export function meanColorAt(img: Img, p: Pt, r = 3): [number, number, number] {
  let R = 0, G = 0, B = 0, n = 0;
  for (let y = Math.max(0, Math.round(p.y) - r); y <= Math.min(img.height - 1, Math.round(p.y) + r); y++)
    for (let x = Math.max(0, Math.round(p.x) - r); x <= Math.min(img.width - 1, Math.round(p.x) + r); x++) {
      const i = (y * img.width + x) * 4;
      R += img.data[i];
      G += img.data[i + 1];
      B += img.data[i + 2];
      n++;
    }
  return [Math.round(R / n), Math.round(G / n), Math.round(B / n)];
}

export function localizeAll(dets: Detection[], H: Mat3 | null): Detection[] {
  return dets.map((d) => ({ ...d, world: H ? applyH(H, d.px) : undefined }));
}
