import * as THREE from "three";
import { CarField, noise3 } from "./field";
import type { FlowParams, SourceMode, VizMode } from "../lib/aero";

/* ------------------------------------------------------------ colour ramps */
type Stop = [number, number, number, number];
function makeLUT(stops: Stop[]): Float32Array {
  const lut = new Float32Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let k = 0; k < stops.length - 1; k++) {
      if (t >= stops[k][0] && t <= stops[k + 1][0]) {
        a = stops[k];
        b = stops[k + 1];
        break;
      }
    }
    const u = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
    lut[i * 3] = a[1] + (b[1] - a[1]) * u;
    lut[i * 3 + 1] = a[2] + (b[2] - a[2]) * u;
    lut[i * 3 + 2] = a[3] + (b[3] - a[3]) * u;
  }
  return lut;
}

export const LUT_VEL = makeLUT([
  [0, 0.1, 0.12, 0.6],
  [0.22, 0.1, 0.5, 1.0],
  [0.42, 0.1, 0.9, 0.8],
  [0.56, 0.55, 1.0, 0.3],
  [0.75, 1.0, 0.85, 0.1],
  [1, 1.0, 0.15, 0.1],
]);
export const LUT_CP = makeLUT([
  [0, 0.12, 0.2, 1.0],
  [0.4, 0.3, 0.72, 1.0],
  [0.69, 0.93, 0.96, 1.0],
  [0.85, 1.0, 0.6, 0.25],
  [1, 1.0, 0.1, 0.1],
]);
export const LUT_TURB = makeLUT([
  [0, 0.2, 0.55, 1.0],
  [0.35, 0.6, 0.3, 1.0],
  [0.65, 1.0, 0.3, 0.6],
  [1, 1.0, 0.85, 0.3],
]);

export const CP_MIN = -2.2;
export const CP_MAX = 1;
export function cpColor(cp: number, out: number[]) {
  const t = Math.max(0, Math.min(1, (cp - CP_MIN) / (CP_MAX - CP_MIN)));
  const i = Math.round(t * 255) * 3;
  out[0] = LUT_CP[i];
  out[1] = LUT_CP[i + 1];
  out[2] = LUT_CP[i + 2];
}

/* ------------------------------------------------------------ streamlines */
const X0 = -8.7;
const X1 = 8.9;
const TL = 34;

export class FlowSim {
  group = new THREE.Group();
  N = 0;
  field: CarField;
  px!: Float32Array;
  py!: Float32Array;
  pz!: Float32Array;
  age!: Float32Array;
  life!: Float32Array;
  trail!: Float32Array;
  trR!: Float32Array;
  trT!: Float32Array;
  head = 0;
  lines: THREE.LineSegments | null = null;
  posA!: Float32Array;
  colA!: Float32Array;
  mat: THREE.LineBasicMaterial;
  source: SourceMode = "volume";
  slice = 0.5;
  mode: VizMode = "velocity";
  trailLen = 24;
  time = 0;
  accum = 0;
  nz = [0, 0, 0];
  fp: FlowParams;
  slow = 0.6;
  opacity = 1;

  constructor(field: CarField, fp: FlowParams) {
    this.field = field;
    this.fp = fp;
    this.mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.setCount(1300);
  }

  setCount(n: number) {
    if (n === this.N) return;
    this.N = n;
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.pz = new Float32Array(n);
    this.age = new Float32Array(n);
    this.life = new Float32Array(n);
    this.trail = new Float32Array(n * TL * 3);
    this.trR = new Float32Array(n * TL);
    this.trT = new Float32Array(n * TL);
    this.posA = new Float32Array(n * (TL - 1) * 6);
    this.colA = new Float32Array(n * (TL - 1) * 6);
    if (this.lines) {
      this.group.remove(this.lines);
      this.lines.geometry.dispose();
    }
    const g = new THREE.BufferGeometry();
    const pa = new THREE.BufferAttribute(this.posA, 3);
    pa.setUsage(THREE.DynamicDrawUsage);
    const ca = new THREE.BufferAttribute(this.colA, 3);
    ca.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", pa);
    g.setAttribute("color", ca);
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
    this.group.add(this.lines);
    this.reset();
  }

  setSource(src: SourceMode, slice: number) {
    if (src !== this.source || Math.abs(slice - this.slice) > 0.001) {
      const changed = src !== this.source || Math.abs(slice - this.slice) > 0.001;
      this.source = src;
      this.slice = slice;
      if (changed) this.reset(true);
    }
  }

  reset(keepFlow = false) {
    void keepFlow;
    for (let i = 0; i < this.N; i++) this.spawn(i, true);
  }

  private spawn(i: number, initial: boolean) {
    const r = Math.random;
    let y = 0.5;
    let z = 0;
    switch (this.source) {
      case "volume":
        if (r() < 0.68) {
          y = 0.02 + Math.pow(r(), 1.5) * 1.5;
          z = (r() + r() + r() - 1.5) * 1.3;
        } else {
          y = 0.02 + r() * 3.3;
          z = (r() - 0.5) * 6.6;
        }
        break;
      case "side":
        z = (this.slice - 0.5) * 2.4 + (r() - 0.5) * 0.02;
        y = 0.03 + r() * 1.5;
        break;
      case "plan":
        y = 0.04 + this.slice * 1.4 + (r() - 0.5) * 0.02;
        z = (r() - 0.5) * 4.2;
        break;
      case "wheels": {
        const s = r() < 0.5 ? 1 : -1;
        z = s * (0.85 + (r() - 0.5) * 0.75);
        y = 0.03 + r() * 0.75;
        break;
      }
      case "floor":
        y = 0.012 + r() * 0.03;
        z = (r() - 0.5) * 1.5;
        break;
      case "wings":
        if (r() < 0.5) {
          y = 0.03 + r() * 0.42;
          z = (r() - 0.5) * 2.1;
        } else {
          y = 0.55 + r() * 0.65;
          z = (r() - 0.5) * 1.1;
        }
        break;
      case "intakes":
        if (r() < 0.25) {
          y = 0.55 + r() * 0.3;
          z = (r() - 0.5) * 0.25;
        } else {
          y = 0.15 + r() * 0.6;
          z = (r() < 0.5 ? 1 : -1) * (0.2 + r() * 0.45);
        }
        break;
    }
    const x = initial ? X0 + r() * (X1 - X0) : X0 + r() * 0.12;
    this.px[i] = x;
    this.py[i] = y;
    this.pz[i] = z;
    this.age[i] = 0;
    this.life[i] = 7 + r() * 3;
    const base = i * TL;
    for (let k = 0; k < TL; k++) {
      const o = (base + k) * 3;
      this.trail[o] = x;
      this.trail[o + 1] = y;
      this.trail[o + 2] = z;
      this.trR[base + k] = 1;
      this.trT[base + k] = 0;
    }
  }

  private step(dt: number) {
    const vis = this.fp.vis;
    const f = this.field;
    const nz = this.nz;
    this.head = (this.head + 1) % TL;
    const h = this.head;
    this.time += dt;
    const t = this.time;
    for (let i = 0; i < this.N; i++) {
      let x = this.px[i];
      let y = this.py[i];
      let z = this.pz[i];
      const o = f.sample(x, y, z);
      let vx = o.vx;
      let vy = o.vy;
      let vz = o.vz;
      const ratio = o.ratio;
      const turb = o.turb;
      if (turb > 0.03) {
        noise3(x, y, z, t, nz);
        const a = turb * 0.75;
        vx += nz[0] * a * 0.5;
        vy += nz[1] * a;
        vz += nz[2] * a;
      }
      x += vx * vis * dt;
      y += vy * vis * dt;
      z += vz * vis * dt;
      x += o.px;
      y += o.py;
      z += o.pz;
      if (y < 0.008) y = 0.008;
      if (y > 4.05) y = 4.05;
      if (z > 3.85) z = 3.85;
      if (z < -3.85) z = -3.85;
      this.age[i] += dt;
      if (x > X1 || this.age[i] > this.life[i] || x !== x) {
        this.spawn(i, false);
        continue;
      }
      this.px[i] = x;
      this.py[i] = y;
      this.pz[i] = z;
      const s = i * TL + h;
      const so = s * 3;
      this.trail[so] = x;
      this.trail[so + 1] = y;
      this.trail[so + 2] = z;
      this.trR[s] = ratio;
      this.trT[s] = turb;
    }
  }

  update(dt: number, fp: FlowParams, opacity: number, running: boolean) {
    this.fp = fp;
    this.opacity = opacity;
    this.mat.opacity = opacity;
    if (running) {
      this.accum += Math.min(dt, 1 / 20) * this.slow;
      const stepDt = 1 / 70;
      let n = 0;
      while (this.accum >= stepDt && n < 4) {
        this.step(stepDt);
        this.accum -= stepDt;
        n++;
      }
      if (n === 4) this.accum = 0;
    }
    this.render();
  }

  private render() {
    const N = this.N;
    const L = this.trailLen;
    const pos = this.posA;
    const col = this.colA;
    const mode = this.mode;
    const bright = 0.72;
    const head = this.head;
    const airK = this.fp.airKmh;
    void airK;
    let w = 0;
    for (let i = 0; i < N; i++) {
      const base = i * TL;
      for (let k = 0; k < TL - 1; k++) {
        if (k >= L - 1) {
          pos[w] = 0;
          pos[w + 1] = -10;
          pos[w + 2] = 0;
          pos[w + 3] = 0;
          pos[w + 4] = -10;
          pos[w + 5] = 0;
          col[w] = col[w + 1] = col[w + 2] = col[w + 3] = col[w + 4] = col[w + 5] = 0;
          w += 6;
          continue;
        }
        const sa = base + ((head - k + TL) % TL);
        const sb = base + ((head - k - 1 + TL * 2) % TL);
        const oa = sa * 3;
        const ob = sb * 3;
        pos[w] = this.trail[oa];
        pos[w + 1] = this.trail[oa + 1];
        pos[w + 2] = this.trail[oa + 2];
        pos[w + 3] = this.trail[ob];
        pos[w + 4] = this.trail[ob + 1];
        pos[w + 5] = this.trail[ob + 2];
        const ta = 1 - k / (L - 1);
        const tb = 1 - (k + 1) / (L - 1);
        const fa = Math.pow(ta, 1.3) * bright;
        const fb = Math.pow(tb, 1.3) * bright;
        let r1: number, g1: number, b1: number, r2: number, g2: number, b2: number;
        if (mode === "smoke") {
          const va = 0.75 + 0.25 * Math.min(1, this.trR[sa]);
          r1 = 0.8 * va;
          g1 = 0.92 * va;
          b1 = 1.0 * va;
          r2 = r1;
          g2 = g1;
          b2 = b1;
        } else {
          let ia: number;
          let ib: number;
          let lut: Float32Array;
          if (mode === "velocity") {
            lut = LUT_VEL;
            ia = Math.min(255, Math.max(0, Math.round((this.trR[sa] / 1.8) * 255)));
            ib = Math.min(255, Math.max(0, Math.round((this.trR[sb] / 1.8) * 255)));
          } else if (mode === "pressure") {
            lut = LUT_CP;
            const ca = 1 - this.trR[sa] * this.trR[sa];
            const cb = 1 - this.trR[sb] * this.trR[sb];
            ia = Math.min(255, Math.max(0, Math.round(((ca - CP_MIN) / (CP_MAX - CP_MIN)) * 255)));
            ib = Math.min(255, Math.max(0, Math.round(((cb - CP_MIN) / (CP_MAX - CP_MIN)) * 255)));
          } else {
            lut = LUT_TURB;
            ia = Math.min(255, Math.max(0, Math.round((this.trT[sa] / 1.1) * 255)));
            ib = Math.min(255, Math.max(0, Math.round((this.trT[sb] / 1.1) * 255)));
          }
          r1 = lut[ia * 3];
          g1 = lut[ia * 3 + 1];
          b1 = lut[ia * 3 + 2];
          r2 = lut[ib * 3];
          g2 = lut[ib * 3 + 1];
          b2 = lut[ib * 3 + 2];
        }
        col[w] = r1 * fa;
        col[w + 1] = g1 * fa;
        col[w + 2] = b1 * fa;
        col[w + 3] = r2 * fb;
        col[w + 4] = g2 * fb;
        col[w + 5] = b2 * fb;
        w += 6;
      }
    }
    const g = this.lines!.geometry;
    (g.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  }
}

/* ------------------------------------------------------------ rain + spray */
function softSprite(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.4, "rgba(255,255,255,0.4)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export class Weather {
  group = new THREE.Group();
  rainN = 1600;
  sprayN = 1600;
  rain: THREE.LineSegments;
  rp: Float32Array;
  rv: Float32Array;
  rainPos: Float32Array;
  spray: THREE.Points;
  sp: Float32Array;
  sv: Float32Array;
  sl: Float32Array;
  sc: Float32Array;
  sPos: Float32Array;
  sCur = 0;
  carrier = new THREE.Object3D();

  constructor() {
    this.rp = new Float32Array(this.rainN * 3);
    this.rv = new Float32Array(this.rainN);
    this.rainPos = new Float32Array(this.rainN * 6);
    for (let i = 0; i < this.rainN; i++) {
      this.rp[i * 3] = -8 + Math.random() * 17;
      this.rp[i * 3 + 1] = Math.random() * 4.2;
      this.rp[i * 3 + 2] = (Math.random() - 0.5) * 7.6;
      this.rv[i] = 0.8 + Math.random() * 0.5;
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.BufferAttribute(this.rainPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.LineSegments(
      rg,
      new THREE.LineBasicMaterial({ color: 0x9cc8ff, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    this.rain.frustumCulled = false;
    this.group.add(this.rain);

    this.sp = new Float32Array(this.sprayN * 3);
    this.sv = new Float32Array(this.sprayN * 3);
    this.sl = new Float32Array(this.sprayN);
    this.sc = new Float32Array(this.sprayN * 3);
    this.sPos = this.sp;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(this.sp, 3).setUsage(THREE.DynamicDrawUsage));
    sg.setAttribute("color", new THREE.BufferAttribute(this.sc, 3).setUsage(THREE.DynamicDrawUsage));
    this.spray = new THREE.Points(
      sg,
      new THREE.PointsMaterial({
        size: 0.3,
        map: softSprite(),
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.spray.frustumCulled = false;
    this.group.add(this.spray);
    for (let i = 0; i < this.sprayN; i++) this.sp[i * 3 + 1] = -50;
  }

  update(dt: number, wet: boolean, vis: number, yaw: number, yOff: number, speedNorm: number) {
    this.group.visible = wet;
    if (!wet) return;
    const dtc = Math.min(dt, 1 / 30);
    const wind = vis;
    for (let i = 0; i < this.rainN; i++) {
      let x = this.rp[i * 3];
      let y = this.rp[i * 3 + 1];
      const z = this.rp[i * 3 + 2];
      const k = this.rv[i];
      x += wind * 0.9 * dtc * k;
      y -= 5.5 * k * dtc;
      if (y < 0 || x > 8.9) {
        y = 4.2;
        x = -8.8 + Math.random() * 3;
        if (y < 0) y = 4.2;
      }
      this.rp[i * 3] = x;
      this.rp[i * 3 + 1] = y;
      const o = i * 6;
      this.rainPos[o] = x;
      this.rainPos[o + 1] = y;
      this.rainPos[o + 2] = z;
      this.rainPos[o + 3] = x - wind * 0.9 * 0.03 * k;
      this.rainPos[o + 4] = y + 5.5 * 0.03 * k;
      this.rainPos[o + 5] = z;
    }
    (this.rain.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;

    // spray emission from the four tyres
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const rate = 220 * (0.25 + speedNorm);
    let n = Math.floor(rate * dtc + Math.random());
    const wheels: [number, number][] = [
      [-1.65, 0.85],
      [-1.65, -0.85],
      [1.95, 0.85],
      [1.95, -0.85],
    ];
    while (n-- > 0) {
      const w = wheels[(Math.random() * 4) | 0];
      const lx = w[0] + 0.3 + Math.random() * 0.1;
      const lz = w[1] + (Math.random() - 0.5) * 0.3;
      const i = this.sCur;
      this.sCur = (this.sCur + 1) % this.sprayN;
      this.sp[i * 3] = lx * c + lz * s;
      this.sp[i * 3 + 1] = 0.03 + yOff;
      this.sp[i * 3 + 2] = -lx * s + lz * c;
      this.sv[i * 3] = wind * (0.5 + Math.random() * 0.4);
      this.sv[i * 3 + 1] = 0.8 + Math.random() * 2.2;
      this.sv[i * 3 + 2] = (Math.sign(w[1]) * 0.3 + (Math.random() - 0.5)) * 0.9;
      this.sl[i] = 1;
    }
    for (let i = 0; i < this.sprayN; i++) {
      if (this.sl[i] <= 0) {
        this.sp[i * 3 + 1] = -50;
        continue;
      }
      this.sl[i] -= dtc * 0.55;
      this.sv[i * 3] += (wind - this.sv[i * 3]) * dtc * 1.4;
      this.sv[i * 3 + 1] -= 1.4 * dtc;
      this.sp[i * 3] += this.sv[i * 3] * dtc;
      this.sp[i * 3 + 1] += this.sv[i * 3 + 1] * dtc;
      this.sp[i * 3 + 2] += this.sv[i * 3 + 2] * dtc;
      if (this.sp[i * 3 + 1] < 0.02) {
        this.sp[i * 3 + 1] = 0.02;
        this.sv[i * 3 + 1] *= -0.2;
      }
      const f = Math.max(0, this.sl[i]);
      const b = 0.11 * f * f;
      this.sc[i * 3] = b * 0.8;
      this.sc[i * 3 + 1] = b * 0.9;
      this.sc[i * 3 + 2] = b;
    }
    (this.spray.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.spray.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  }
}
