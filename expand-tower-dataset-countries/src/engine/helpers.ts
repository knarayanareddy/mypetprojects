import * as THREE from 'three';

export type Tex =
  | 'none'
  | 'ashlar'
  | 'brick'
  | 'plaster'
  | 'tile'
  | 'scale'
  | 'wood'
  | 'glass'
  | 'mud'
  | 'concrete';

export interface Spec {
  key: string;
  tex: Tex;
  color: number;
  metal: number;
  rough: number;
  tile: number;
  glow: boolean;
}

export interface MatOpts {
  metal?: number;
  rough?: number;
  tile?: number;
  glow?: boolean;
}

/** Describe a surface. The engine turns specs into real materials. */
export const M = (tex: Tex, color: number, o: MatOpts = {}): Spec => {
  const metal = o.metal ?? 0;
  const rough = o.rough ?? 0.85;
  const tile = o.tile ?? 2;
  const glow = o.glow ?? false;
  return {
    key: `${tex}|${color}|${metal}|${rough}|${tile}|${glow ? 1 : 0}`,
    tex,
    color,
    metal,
    rough,
    tile,
    glow,
  };
};

export type Ring = [number, number] | [number, number, number];

export interface LoftOpts {
  sides?: number;
  rot?: number;
  smooth?: boolean;
  sub?: number;
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  capBottom?: boolean;
  capTop?: boolean;
}

type V3 = [number, number, number];
type V2 = [number, number];

const EPS = 1e-5;

/**
 * Swept closed solid: a stack of regular polygon rings [y, apothem, lift].
 * `sides` 4 => square with axis-aligned faces, large `sides` + smooth => round.
 * `lift` raises the corners of a ring (curled eaves) when `sub` > 1.
 */
export function makeLoft(rings: Ring[], o: LoftOpts = {}): THREE.BufferGeometry {
  const sides = o.sides ?? 4;
  const sub = o.sub ?? 1;
  const rot = o.rot ?? 0;
  const smooth = !!o.smooth;
  const step = (Math.PI * 2) / sides;
  const N = sides * sub;
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];

  // unit template (apothem = 1)
  const R = 1 / Math.cos(step / 2);
  const tx: number[] = [];
  const tz: number[] = [];
  const lf: number[] = [];
  for (let k = 0; k < N; k++) {
    const i = Math.floor(k / sub);
    const j = k % sub;
    const t = j / sub;
    const a0 = rot + (i + 0.5) * step;
    const a1 = rot + (i + 1.5) * step;
    const x = R * (Math.cos(a0) * (1 - t) + Math.cos(a1) * t);
    const z = R * (Math.sin(a0) * (1 - t) + Math.sin(a1) * t);
    tx.push(x);
    tz.push(z);
    const m = Math.min(t, 1 - t);
    lf.push(sub > 1 ? Math.pow(1 - 2 * m, 2) : 0);
  }
  const ang = tx.map((x, k) => Math.atan2(tz[k], x));

  const pts: V3[][] = rings.map((rg) => {
    const y = rg[0];
    const r = rg[1];
    const l = rg.length > 2 ? (rg[2] as number) : 0;
    const row: V3[] = [];
    for (let k = 0; k < N; k++) row.push([tx[k] * r, y + l * lf[k], tz[k] * r]);
    return row;
  });

  const addTri = (P: V3[], UV: V2[], ref: V3, NS?: V3[]) => {
    let [a, b, c] = P;
    let [ua, ub, uc] = UV;
    let ns = NS ? NS.slice() : undefined;
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let gx = uy * vz - uz * vy;
    let gy = uz * vx - ux * vz;
    let gz = ux * vy - uy * vx;
    const len = Math.hypot(gx, gy, gz);
    if (len < 1e-9) return;
    if (gx * ref[0] + gy * ref[1] + gz * ref[2] < 0) {
      [b, c] = [c, b];
      [ub, uc] = [uc, ub];
      if (ns) [ns[1], ns[2]] = [ns[2], ns[1]];
      gx = -gx;
      gy = -gy;
      gz = -gz;
    }
    gx /= len;
    gy /= len;
    gz /= len;
    const vs = [a, b, c];
    const us = [ua, ub, uc];
    for (let i = 0; i < 3; i++) {
      pos.push(vs[i][0], vs[i][1], vs[i][2]);
      if (ns) nor.push(ns[i][0], ns[i][1], ns[i][2]);
      else nor.push(gx, gy, gz);
      uv.push(us[i][0], us[i][1]);
    }
  };

  let vAcc = 0;
  for (let q = 0; q < rings.length - 1; q++) {
    const ra = rings[q];
    const rb = rings[q + 1];
    const dy = rb[0] - ra[0];
    const dr = rb[1] - ra[1];
    const segLen = Math.hypot(dy, dr);
    if (segLen > EPS) {
      const nr = dy / segLen;
      const ny = -dr / segLen;
      const P = Math.PI * 2 * Math.max(ra[1], rb[1], 0.15);
      for (let k = 0; k < N; k++) {
        const k2 = (k + 1) % N;
        let cx = tx[k] + tx[k2];
        let cz = tz[k] + tz[k2];
        const cl = Math.hypot(cx, cz) || 1;
        cx /= cl;
        cz /= cl;
        const ref: V3 = [nr * cx, ny, nr * cz];
        const u0 = (k / N) * P;
        const u1 = ((k + 1) / N) * P;
        const A0 = pts[q][k];
        const A1 = pts[q][k2];
        const B0 = pts[q + 1][k];
        const B1 = pts[q + 1][k2];
        const v0 = vAcc;
        const v1 = vAcc + segLen;
        let n0: V3 | undefined;
        let n1: V3 | undefined;
        if (smooth) {
          n0 = [nr * Math.cos(ang[k]), ny, nr * Math.sin(ang[k])];
          n1 = [nr * Math.cos(ang[k2]), ny, nr * Math.sin(ang[k2])];
        }
        addTri(
          [A0, A1, B1],
          [
            [u0, v0],
            [u1, v0],
            [u1, v1],
          ],
          ref,
          n0 && n1 ? [n0, n1, n1] : undefined,
        );
        addTri(
          [A0, B1, B0],
          [
            [u0, v0],
            [u1, v1],
            [u0, v1],
          ],
          ref,
          n0 && n1 ? [n0, n1, n0] : undefined,
        );
      }
      vAcc += segLen;
    }
  }

  const cap = (ringIdx: number, dirY: number) => {
    const rg = rings[ringIdx];
    if (rg[1] < EPS) return;
    const cy = rg[0] + (rg.length > 2 ? (rg[2] as number) * 0.25 : 0);
    const c: V3 = [0, cy, 0];
    for (let k = 0; k < N; k++) {
      const k2 = (k + 1) % N;
      const a = pts[ringIdx][k];
      const b = pts[ringIdx][k2];
      addTri(
        [c, a, b],
        [
          [0, 0],
          [a[0], a[2]],
          [b[0], b[2]],
        ],
        [0, dirY, 0],
      );
    }
  };
  if (o.capBottom !== false) cap(0, -1);
  if (o.capTop !== false) cap(rings.length - 1, 1);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));

  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(o.x ?? 0, o.y ?? 0, o.z ?? 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, 'YXZ')),
    new THREE.Vector3(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1),
  );
  g.applyMatrix4(m);
  return g;
}

/** Ring list from a function of t in [0,1]. */
export const curve = (n: number, f: (t: number) => Ring): Ring[] => {
  const out: Ring[] = [];
  for (let i = 0; i <= n; i++) out.push(f(i / n));
  return out;
};

/** Scale a normalised [t, r] profile into rings. */
export const profileRings = (pts: [number, number][], y0: number, h: number, r0: number): Ring[] =>
  pts.map(([t, r]) => [y0 + t * h, r * r0] as Ring);

/** Quarter-circle dome ring set. */
export const domeRings = (r: number, y0: number, h: number, n = 10): Ring[] =>
  curve(n, (t) => {
    const a = t * Math.PI * 0.5;
    return [y0 + h * Math.sin(a), Math.max(0, r * Math.cos(a))] as Ring;
  });

/** Onion dome profile. */
export const ONION: [number, number][] = [
  [0, 0.55],
  [0.06, 0.78],
  [0.18, 0.98],
  [0.34, 1],
  [0.5, 0.84],
  [0.64, 0.58],
  [0.78, 0.32],
  [0.9, 0.12],
  [1, 0],
];

export const sphereRings = (r: number, n = 12): Ring[] =>
  curve(n, (t) => {
    const a = -Math.PI / 2 + t * Math.PI;
    return [r + r * Math.sin(a), Math.max(0, r * Math.cos(a))] as Ring;
  });

export interface Group {
  spec: Spec;
  geos: THREE.BufferGeometry[];
}

export interface RoofOpts {
  y: number;
  w: number;
  e: number;
  h: number;
  lift?: number;
  sides?: number;
  rot?: number;
  thick?: number;
  sub?: number;
  x?: number;
  z?: number;
  concave?: number;
}

/** Collects geometry grouped by material spec. */
export class T {
  groups = new Map<string, Group>();
  private cur = new THREE.Matrix4();

  private push(geo: THREE.BufferGeometry, spec: Spec) {
    if (!this.cur.equals(new THREE.Matrix4())) geo.applyMatrix4(this.cur);
    let g = this.groups.get(spec.key);
    if (!g) {
      g = { spec, geos: [] };
      this.groups.set(spec.key, g);
    }
    g.geos.push(geo.index ? geo.toNonIndexed() : geo);
  }

  /** Run `fn` with everything rotated about the vertical axis. */
  under(ry: number, fn: () => void) {
    const prev = this.cur.clone();
    this.cur = new THREE.Matrix4().makeRotationY(ry).premultiply(prev);
    fn();
    this.cur = prev;
  }

  /** Box whose base sits at y. */
  box(spec: Spec, w: number, h: number, d: number, x = 0, y = 0, z = 0, ry = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    const sizes: [number, number][] = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
    for (let f = 0; f < 6; f++) {
      for (let i = 0; i < 4; i++) {
        const idx = f * 4 + i;
        uv.setXY(idx, uv.getX(idx) * sizes[f][0], uv.getY(idx) * sizes[f][1]);
      }
    }
    g.translate(0, h / 2, 0);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    this.push(g, spec);
  }

  loft(spec: Spec, rings: Ring[], o: LoftOpts = {}) {
    this.push(makeLoft(rings, o), spec);
  }

  cyl(spec: Spec, r: number, h: number, o: LoftOpts = {}) {
    this.loft(spec, [[0, r], [h, r]], { sides: 28, smooth: true, ...o });
  }

  frustum(spec: Spec, r0: number, r1: number, h: number, o: LoftOpts = {}) {
    this.loft(spec, [[0, r0], [h, r1]], { sides: 28, smooth: true, ...o });
  }

  cone(spec: Spec, r: number, h: number, o: LoftOpts = {}) {
    this.loft(spec, [[0, r], [h, 0]], { sides: 28, smooth: true, ...o });
  }

  dome(spec: Spec, r: number, h: number, o: LoftOpts = {}) {
    this.loft(spec, domeRings(r, 0, h, 10), { sides: 32, smooth: true, ...o });
  }

  ball(spec: Spec, r: number, x = 0, y = 0, z = 0) {
    this.loft(spec, sphereRings(r, 10), { sides: 16, smooth: true, x, y, z });
  }

  /** A box running from point a to point b. */
  strut(spec: Spec, a: V3, b: V3, th: number, th2 = th) {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    if (len < EPS) return;
    const g = new THREE.BoxGeometry(th, len, th2);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * th, uv.getY(i) * len);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    g.applyMatrix4(
      new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)),
    );
    this.push(g, spec);
  }

  /** Hip roof with optional curled eaves. */
  roof(spec: Spec, o: RoofOpts) {
    const { y, w, e, h } = o;
    const L = o.lift ?? 0;
    const th = o.thick ?? 0.22;
    const W = w + e;
    const c = o.concave ?? 0.5;
    const rings: Ring[] = [
      [y, W, L],
      [y + th, W, L * 0.92],
      [y + th + h * 0.3, W * (0.66 + c * 0.1), L * 0.35],
      [y + th + h * 0.62, W * (0.36 + c * 0.05), L * 0.06],
      [y + th + h * 0.85, W * 0.12, 0],
      [y + th + h, 0, 0],
    ];
    this.loft(spec, rings, {
      sides: o.sides ?? 4,
      rot: o.rot ?? 0,
      sub: o.sub ?? (L > 0 ? 6 : 1),
      x: o.x ?? 0,
      z: o.z ?? 0,
    });
  }

  /**
   * Details spaced around each face of a regular polygon.
   * Boxes face outward; `per` items per face spaced `gap` apart.
   */
  around(
    spec: Spec,
    p: {
      sides?: number;
      apothem: number;
      y: number;
      w: number;
      h: number;
      d: number;
      per?: number;
      gap?: number;
      rot?: number;
      x?: number;
      z?: number;
      skip?: (face: number, k: number) => boolean;
    },
  ) {
    const sides = p.sides ?? 4;
    const per = p.per ?? 1;
    const gap = p.gap ?? 1;
    const rot = p.rot ?? 0;
    const step = (Math.PI * 2) / sides;
    for (let f = 0; f < sides; f++) {
      const th = rot + f * step;
      const cx = Math.cos(th);
      const cz = Math.sin(th);
      const tx = -cz;
      const tz = cx;
      for (let k = 0; k < per; k++) {
        if (p.skip && p.skip(f, k)) continue;
        const off = (k - (per - 1) / 2) * gap;
        const rr = p.apothem + p.d * 0.35;
        this.box(
          spec,
          p.w,
          p.h,
          p.d,
          (p.x ?? 0) + cx * rr + tx * off,
          p.y,
          (p.z ?? 0) + cz * rr + tz * off,
          Math.PI / 2 - th,
        );
      }
    }
  }

  /** Straight stair climbing in +z direction (rotate with `under`). */
  stair(spec: Spec, p: { w: number; y0: number; y1: number; zIn: number; zOut: number; n: number; x?: number }) {
    const { w, y0, y1, zIn, zOut, n } = p;
    for (let i = 0; i < n; i++) {
      const top = y0 + ((i + 1) / n) * (y1 - y0);
      const zEnd = zOut - (i / n) * (zOut - zIn);
      const zc = (zIn + zEnd) / 2;
      this.box(spec, w, top - y0, zEnd - zIn, p.x ?? 0, y0, zc);
    }
  }
}
