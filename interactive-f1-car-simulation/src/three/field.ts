import type { FlowParams } from "../lib/aero";

/* SDF primitives in car-local coordinates (nose toward -x) */
interface Prim {
  t: 0 | 1 | 2; // 0 ellipsoid, 1 round box, 2 z-cylinder
  cx: number;
  cy: number;
  cz: number;
  rx: number;
  ry: number;
  rz: number;
  k: number;
  br: number;
}

const prims: Prim[] = [];
const E = (cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) =>
  prims.push({ t: 0, cx, cy, cz, rx, ry, rz, k: 0, br: Math.max(rx, ry, rz) + 0.03 });
const B = (cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, k: number) =>
  prims.push({ t: 1, cx, cy, cz, rx, ry, rz, k, br: Math.hypot(rx, ry, rz) + 0.03 });
const Y = (cx: number, cy: number, cz: number, R: number, h: number, k: number) =>
  prims.push({ t: 2, cx, cy, cz, rx: R, ry: h, rz: 0, k, br: Math.hypot(R, h) + 0.03 });

E(-2.05, 0.26, 0, 0.62, 0.14, 0.11); // nose
B(-0.4, 0.37, 0, 0.85, 0.25, 0.26, 0.1); // tub
E(-0.42, 0.78, 0, 0.14, 0.15, 0.13); // helmet
E(-0.45, 0.74, 0, 0.42, 0.09, 0.28); // halo volume
E(1.1, 0.54, 0, 1.35, 0.28, 0.15); // engine cover
B(0.1, 0.72, 0, 0.22, 0.14, 0.12, 0.05); // airbox
for (const s of [1, -1]) {
  E(0.6, 0.36, s * 0.42, 1.35, 0.2, 0.2); // sidepod
  E(1.55, 0.24, s * 0.3, 0.65, 0.13, 0.12); // sidepod rear
  Y(-1.65, 0.36, s * 0.85, 0.36, 0.15, 0.04); // front wheel
  Y(1.95, 0.36, s * 0.85, 0.36, 0.2, 0.04); // rear wheel
  B(-2.55, 0.2, s * 0.94, 0.45, 0.2, 0.012, 0.005); // fw endplate
  B(2.55, 0.78, s * 0.46, 0.42, 0.25, 0.012, 0.005); // rw endplate
}
B(0.6, 0.067, 0, 2.1, 0.022, 0.68, 0.015); // floor
B(2.3, 0.22, 0, 0.42, 0.12, 0.5, 0.02); // diffuser
B(-2.72, 0.14, 0, 0.25, 0.06, 0.93, 0.02); // fw main
B(-2.42, 0.26, 0, 0.22, 0.06, 0.88, 0.02); // fw flaps
B(2.6, 0.88, 0, 0.24, 0.14, 0.46, 0.03); // rw main
B(2.5, 0.38, 0, 0.16, 0.05, 0.4, 0.02); // beam wing
B(2.3, 0.36, 0, 0.5, 0.17, 0.17, 0.05); // gearbox

const NP = prims.length;

function primD(p: Prim, x: number, y: number, z: number): number {
  const px = x - p.cx;
  const py = y - p.cy;
  const pz = z - p.cz;
  const dist = Math.sqrt(px * px + py * py + pz * pz);
  if (dist - p.br > 0.7) return dist - p.br;
  if (p.t === 0) {
    const ax = px / p.rx;
    const ay = py / p.ry;
    const az = pz / p.rz;
    const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
    const bx = ax / p.rx;
    const by = ay / p.ry;
    const bz = az / p.rz;
    const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
    return k1 < 1e-9 ? -Math.min(p.rx, p.ry, p.rz) : (k0 * (k0 - 1)) / k1;
  }
  if (p.t === 1) {
    const qx = Math.abs(px) - p.rx + p.k;
    const qy = Math.abs(py) - p.ry + p.k;
    const qz = Math.abs(pz) - p.rz + p.k;
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    const oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - p.k;
  }
  const dx = Math.sqrt(px * px + py * py) - p.rx + p.k;
  const dy = Math.abs(pz) - p.ry + p.k;
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.min(Math.max(dx, dy), 0) + Math.sqrt(ox * ox + oy * oy) - p.k;
}

export function sdf(x: number, y: number, z: number): number {
  let d = 1e9;
  for (let i = 0; i < NP; i++) {
    const v = primD(prims[i], x, y, z);
    if (v < d) d = v;
  }
  return d;
}

/* floor half-width for venturi region */
const FH: [number, number][] = [
  [-1.55, 0.3],
  [-1.25, 0.52],
  [-0.6, 0.72],
  [0.2, 0.8],
  [0.9, 0.72],
  [1.5, 0.62],
  [2.05, 0.56],
  [2.72, 0.52],
];
function floorHW(x: number) {
  if (x <= FH[0][0]) return 0;
  for (let i = 1; i < FH.length; i++) {
    if (x <= FH[i][0]) {
      const t = (x - FH[i - 1][0]) / (FH[i][0] - FH[i - 1][0]);
      return FH[i - 1][1] + (FH[i][1] - FH[i - 1][1]) * t;
    }
  }
  return FH[FH.length - 1][1];
}

export interface Vortex {
  ax: number;
  ay: number;
  az: number;
  dx: number;
  dy: number;
  dz: number;
  g: number; // signed unit circulation
  rc: number;
  kind: "fw" | "floor" | "tyre" | "rw";
}
const vort: Vortex[] = [];
function V(
  kind: Vortex["kind"],
  a: [number, number, number],
  d: [number, number, number],
  g: number,
  rc: number,
) {
  const l = Math.hypot(...d);
  vort.push({ kind, ax: a[0], ay: a[1], az: a[2], dx: d[0] / l, dy: d[1] / l, dz: d[2] / l, g, rc });
}
for (const s of [1, -1]) {
  V("fw", [-2.75, 0.14, s * 0.96], [1, 0.05, s * 0.16], s * 0.55, 0.05);
  V("fw", [-2.55, 0.26, s * 0.24], [1, 0.1, s * 0.03], -s * 0.3, 0.05);
  V("floor", [-0.4, 0.085, s * 0.78], [1, 0, -s * 0.04], s * 0.45, 0.045);
  V("floor", [0.8, 0.12, s * 0.45], [1, 0, -s * 0.06], s * 0.25, 0.05);
  V("tyre", [-1.3, 0.36, s * 1.03], [1, 0, s * 0.08], -s * 0.4, 0.13);
  V("tyre", [2.3, 0.36, s * 1.05], [1, 0, s * 0.05], -s * 0.35, 0.14);
  V("floor", [2.0, 0.15, s * 0.45], [1, 0.15, s * 0.05], s * 0.4, 0.05);
  V("rw", [2.75, 0.95, s * 0.47], [1, 0, s * 0.1], s * 0.55, 0.05);
}

export const vortexList = vort;

export interface Sample {
  vx: number;
  vy: number;
  vz: number;
  ratio: number;
  turb: number;
  d: number;
  px: number;
  py: number;
  pz: number; // world push-out vector (when penetrating)
}

const RI = 0.55;
const EPS = 0.012;

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export class CarField {
  fp: FlowParams;
  cosY = 1;
  sinY = 0;
  o: Sample = { vx: 1, vy: 0, vz: 0, ratio: 1, turb: 0, d: 10, px: 0, py: 0, pz: 0 };
  vortexScale = 1;

  constructor(fp: FlowParams) {
    this.fp = fp;
    this.setParams(fp);
  }

  setParams(fp: FlowParams) {
    this.fp = fp;
    this.cosY = Math.cos(fp.yaw);
    this.sinY = Math.sin(fp.yaw);
  }

  /** sample in world coords */
  sample(xw: number, yw: number, zw: number): Sample {
    const fp = this.fp;
    const c = this.cosY;
    const s = this.sinY;
    const o = this.o;
    // world -> car-local (yaw about Y, y offset)
    const lx = xw * c - zw * s;
    const ly = yw - fp.yOff;
    const lz = xw * s + zw * c;
    const ux = c;
    const uz = s;

    let vx = ux;
    let vy = 0;
    let vz = uz;
    let mul = 1;
    let turb = fp.turbBase;
    let dd = 10;
    let pushx = 0;
    let pushy = 0;
    let pushz = 0;

    const near = lx > -3.7 && lx < 3.6 && ly < 1.5 && Math.abs(lz) < 1.75;
    if (near) {
      const d = sdf(lx, ly, lz);
      dd = d;
      if (d < RI) {
        const gx = sdf(lx + EPS, ly, lz) - sdf(lx - EPS, ly, lz);
        const gy = sdf(lx, ly + EPS, lz) - sdf(lx, ly - EPS, lz);
        const gz = sdf(lx, ly, lz + EPS) - sdf(lx, ly, lz - EPS);
        const gl = Math.hypot(gx, gy, gz) || 1;
        const nx = gx / gl;
        const ny = gy / gl;
        const nz = gz / gl;
        const w0 = 1 - Math.max(d, 0) / RI;
        const w = w0 * w0 * (3 - 2 * w0);
        const un = vx * nx + vz * nz; // uy = 0
        if (un < 0) {
          vx -= un * nx * w;
          vy -= un * ny * w;
          vz -= un * nz * w;
        }
        const facing = Math.max(0, -un);
        const lee = Math.max(0, un);
        mul *= 1 - 0.8 * facing * facing * w;
        mul *= 1 + (0.42 * Math.max(0, ny) + 0.22 * Math.abs(nz)) * w * (1 - facing) * (1 - lee * 0.6);
        mul *= 1 - 0.55 * lee * w;
        if (d < 0.006) {
          const push = 0.006 - d + 0.004;
          pushx = nx * push;
          pushy = ny * push;
          pushz = nz * push;
        }
        turb += 0.25 * lee * w;
      }
    }

    // underfloor venturi
    if (ly < 0.05 && lx > -1.55 && lx < 2.8) {
      const hw = floorHW(lx);
      if (Math.abs(lz) < hw - 0.02) {
        const tun = smoothstep(-1.4, -0.5, lx) * (1 - 0.5 * smoothstep(2.2, 2.75, lx));
        mul *= 1 + fp.floorUp * tun;
        if (lx > 1.9) {
          const lift = smoothstep(1.9, 2.7, lx);
          vy += 0.2 * lift;
          mul *= 1 - 0.3 * lift;
        }
      }
    }

    // vortices
    let swirlx = 0;
    let swirly = 0;
    let swirlz = 0;
    for (let i = 0; i < vort.length; i++) {
      const v = vort[i];
      const rx = lx - v.ax;
      const ry = ly - v.ay;
      const rz = lz - v.az;
      const sAx = rx * v.dx + ry * v.dy + rz * v.dz;
      if (sAx < -0.25) continue;
      const qx = rx - sAx * v.dx;
      const qy = ry - sAx * v.dy;
      const qz = rz - sAx * v.dz;
      const r2 = qx * qx + qy * qy + qz * qz;
      if (r2 > 1.2) continue;
      const strength =
        v.kind === "fw" ? fp.fwV : v.kind === "floor" ? fp.floorV : v.kind === "tyre" ? fp.tyreV : fp.rwV;
      const sp = Math.max(sAx, 0);
      const rc = v.rc + 0.035 * sp;
      const gam = v.g * strength * Math.exp(-sp / 6.5) * smoothstep(-0.25, 0.2, sAx) * this.vortexScale;
      const k = gam / (6.2832 * (r2 + rc * rc));
      // axis x r
      const cx = v.dy * qz - v.dz * qy;
      const cy = v.dz * qx - v.dx * qz;
      const cz = v.dx * qy - v.dy * qx;
      swirlx += cx * k;
      swirly += cy * k;
      swirlz += cz * k;
      turb += 0.35 * Math.exp(-r2 / (9 * rc * rc)) * Math.min(1, strength);
    }

    // wake (world space)
    {
      const dx = xw - 2.75;
      if (dx > -0.4) {
        const zc = -2.8 * s;
        const sy = 0.5 + 0.05 * Math.max(dx, 0);
        const sz = 0.8 + 0.08 * Math.max(dx, 0);
        const ay = (yw - 0.5) / sy;
        const az = (zw - zc) / sz;
        const core = Math.exp(-(ay * ay + az * az));
        const W = Math.exp(-Math.max(dx, 0) / 5.5) * smoothstep(-0.4, 0.5, dx) * core;
        mul *= 1 - fp.wakeDef * W;
        turb += fp.turbWake * W;
      }
    }
    // tyre wakes (car space)
    {
      for (let i = 0; i < 4; i++) {
        const front = i < 2;
        const wx = (front ? -1.65 : 1.95) + 0.38;
        const wz = (i % 2 === 0 ? 1 : -1) * 0.88;
        const dx = lx - wx;
        if (dx < -0.1 || dx > 6) continue;
        const sy = 0.34 + 0.05 * Math.max(dx, 0);
        const sz = 0.2 + 0.07 * Math.max(dx, 0);
        const ay = (ly - 0.3) / sy;
        const az = (lz - wz) / sz;
        const W = Math.exp(-(ay * ay + az * az)) * Math.exp(-Math.max(dx, 0) / 3) * smoothstep(-0.1, 0.3, dx);
        mul *= 1 - 0.5 * W;
        turb += 0.5 * W;
      }
    }
    // dirty air from a leading car
    if (fp.dirtyAmp > 0.001) {
      const m = Math.exp(-(zw * zw) / 1.1 - ((yw - 0.5) * (yw - 0.5)) / 0.7);
      const up = 1 - 0.35 * smoothstep(-4, 6, xw);
      mul *= 1 - fp.dirtyDef * m * up;
      turb += fp.dirtyAmp * 0.9 * m * up;
    }

    mul = Math.max(0.12, Math.min(2.4, mul));
    vx = vx * mul + swirlx;
    vy = vy * mul + swirly;
    vz = vz * mul + swirlz;

    o.ratio = Math.hypot(vx, vy, vz);
    // local -> world
    o.vx = vx * c + vz * s;
    o.vy = vy;
    o.vz = -vx * s + vz * c;
    o.turb = Math.min(1.4, turb);
    o.d = dd;
    o.px = pushx * c + pushz * s;
    o.py = pushy;
    o.pz = -pushx * s + pushz * c;
    return o;
  }

  /** sample from car-local point (used to paint surface pressure) */
  ratioAtLocal(lx: number, ly: number, lz: number): number {
    const c = this.cosY;
    const s = this.sinY;
    const xw = lx * c + lz * s;
    const zw = -lx * s + lz * c;
    const yw = ly + this.fp.yOff;
    return this.sample(xw, yw, zw).ratio;
  }
}

export function noise3(x: number, y: number, z: number, t: number, out: number[]) {
  out[0] =
    Math.sin(y * 3.7 + t * 4.1 + z * 2.3) * Math.cos(x * 2.9 - t * 3.3 + z * 1.7) +
    0.5 * Math.sin(y * 9.1 + z * 7.3 - t * 6.1);
  out[1] =
    Math.sin(z * 3.1 + t * 3.7 + x * 2.1) * Math.cos(y * 4.3 - t * 2.9) + 0.5 * Math.sin(x * 8.3 + y * 6.7 + t * 5.3);
  out[2] =
    Math.sin(x * 3.3 + t * 4.7 + y * 2.5) * Math.cos(z * 3.9 - t * 3.1) + 0.5 * Math.sin(z * 8.7 - x * 7.1 + t * 5.9);
}
