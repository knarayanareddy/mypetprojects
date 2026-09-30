import * as THREE from "three";
import { box, cyl, extrudePoly, loft, sphere, strut, tube, wingElement, type Sec } from "./geo";

export type Phase = "skeleton" | "muscle" | "skin";

interface MatRec {
  m: THREE.MeshStandardMaterial;
  base: THREE.Color;
  emBase: THREE.Color;
}

const HL = new THREE.Color(0xff3a2a);

export class Mats {
  list: MatRec[] = [];
  make(
    color: number,
    o: { metal?: number; rough?: number; opacity?: number; emissive?: number; emI?: number; clear?: boolean } = {},
  ): THREE.MeshStandardMaterial {
    const opts = {
      color,
      metalness: o.metal ?? 0.3,
      roughness: o.rough ?? 0.5,
      side: THREE.DoubleSide,
    } as THREE.MeshPhysicalMaterialParameters;
    if (o.clear) {
      opts.clearcoat = 1;
      opts.clearcoatRoughness = 0.12;
    }
    if (o.opacity !== undefined && o.opacity < 1) {
      opts.transparent = true;
      opts.opacity = o.opacity;
      opts.depthWrite = false;
    }
    const m = new THREE.MeshPhysicalMaterial(opts);
    if (o.emissive !== undefined) {
      m.emissive = new THREE.Color(o.emissive);
      m.emissiveIntensity = o.emI ?? 1;
    }
    this.list.push({ m, base: m.color.clone(), emBase: m.emissive.clone().multiplyScalar(m.emissiveIntensity) });
    return m;
  }
  apply(dim: number, hl: number) {
    for (const r of this.list) {
      r.m.color.copy(r.base).multiplyScalar(dim);
      r.m.emissive.copy(r.emBase).lerp(HL, hl * 0.2);
      r.m.emissiveIntensity = 1;
    }
  }
}

export interface PartSub {
  obj: THREE.Object3D;
  base: THREE.Vector3;
  off: THREE.Vector3;
}

export interface CarPart {
  id: string;
  phase: Phase;
  root: THREE.Group;
  mats: Mats;
  assembled: THREE.Vector3;
  offset: THREE.Vector3;
  subs: PartSub[];
  tumble: THREE.Vector3;
  focusCenter: THREE.Vector3;
  focusRadius: number;
  spin: boolean;
  spinY: number;
}

export interface CarRig {
  group: THREE.Group;
  parts: CarPart[];
  wheels: { spin: THREE.Group; front: boolean }[];
  fwFlaps: { mesh: THREE.Object3D; base: number; k: number }[];
  rwMain: { mesh: THREE.Object3D; base: number };
  rwFlap: { pivot: THREE.Object3D; base: number };
}

const C = {
  carbon: 0x17181c,
  carbon2: 0x262830,
  red: 0xd0121c,
  white: 0xf2f2ee,
  ti: 0x8e9096,
  alu: 0xbfc2c8,
  gold: 0xc9a227,
  copper: 0xb8733a,
  rubber: 0x0c0c0d,
  inconel: 0x55586c,
  orange: 0xff8a1f,
  blue: 0x2f6de0,
  dark: 0x060607,
  wood: 0xb08a5a,
};

type V3 = [number, number, number];

interface Build {
  g: THREE.Group;
  mats: Mats;
  subs?: { obj: THREE.Object3D; off: V3 }[];
}

/* ------------------------------------------------------------------ parts */

function buildFloor(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const carbon = m.make(C.carbon, { metal: 0.5, rough: 0.42 });
  const carb2 = m.make(C.carbon2, { metal: 0.5, rough: 0.4 });
  const wood = m.make(C.wood, { metal: 0, rough: 0.8 });

  const half: [number, number][] = [
    [-1.55, 0.3],
    [-1.25, 0.52],
    [-0.6, 0.72],
    [0.2, 0.8],
    [0.9, 0.72],
    [1.5, 0.62],
    [2.05, 0.56],
    [2.72, 0.52],
  ];
  const sh = new THREE.Shape();
  sh.moveTo(half[0][0], half[0][1]);
  for (let i = 1; i < half.length; i++) sh.lineTo(half[i][0], half[i][1]);
  for (let i = half.length - 1; i >= 0; i--) sh.lineTo(half[i][0], -half[i][1]);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.05, 0);
  const floor = new THREE.Mesh(geo, carbon);
  floor.castShadow = true;
  floor.receiveShadow = true;
  g.add(floor);

  g.add(box(3.1, 0.012, 0.28, wood, 0.35, 0.044, 0));

  // floor edge fences & bargeboard fins
  for (const s of [1, -1]) {
    for (let i = 0; i < 5; i++) {
      const f = box(0.3, 0.2, 0.008, carb2, -1.0 + i * 0.06, 0.17, s * (0.3 + i * 0.085));
      f.rotation.y = -s * 0.45;
      g.add(f);
    }
    for (let i = 0; i < 4; i++) {
      const e = box(0.35, 0.05, 0.008, carb2, 0.0 + i * 0.4, 0.105, s * (0.78 - i * 0.03));
      g.add(e);
    }
  }
  // diffuser
  const dif = extrudePoly(
    [
      [1.9, 0.085],
      [2.72, 0.36],
      [2.72, 0.395],
      [1.9, 0.12],
    ],
    1.0,
    carb2,
  );
  g.add(dif);
  for (const z of [-0.5, -0.17, 0.17, 0.5]) {
    const st = extrudePoly(
      [
        [1.92, 0.085],
        [2.72, 0.09],
        [2.72, 0.36],
      ],
      0.012,
      carbon,
    );
    st.position.z = z;
    g.add(st);
  }
  return { g, mats: m };
}

function buildMonocoque(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const tubMat = m.make(0x2a2f3a, { metal: 0.6, rough: 0.35, opacity: 0.62 });
  const dark = m.make(C.dark, { metal: 0.2, rough: 0.7 });
  const red = m.make(C.red, { metal: 0.3, rough: 0.3, clear: true });
  const secs: Sec[] = [
    { x: -1.55, y0: 0.13, y1: 0.44, hw: 0.18 },
    { x: -1.2, y0: 0.12, y1: 0.46, hw: 0.21 },
    { x: -0.8, y0: 0.1, y1: 0.54, hw: 0.27 },
    { x: -0.45, y0: 0.1, y1: 0.62, hw: 0.29 },
    { x: 0.0, y0: 0.1, y1: 0.65, hw: 0.27 },
    { x: 0.35, y0: 0.1, y1: 0.66, hw: 0.25 },
    { x: 0.68, y0: 0.12, y1: 0.6, hw: 0.22 },
  ];
  g.add(loft(secs, tubMat, 32));
  // cockpit opening
  g.add(box(0.72, 0.012, 0.34, dark, -0.4, 0.622, 0));
  g.add(box(0.05, 0.05, 0.3, red, -0.06, 0.66, 0)); // headrest surround
  // bulkhead ribs
  for (const x of [-1.2, -0.8, -0.45, 0.0, 0.35]) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.006, 6, 28),
      m.make(0xff6a4a, { metal: 0.2, rough: 0.5, emissive: 0xff3a1a, emI: 0.5 }),
    );
    r.rotation.y = Math.PI / 2;
    r.scale.set(1, 0.95, 1);
    r.position.set(x, 0.36, 0);
    g.add(r);
  }
  return { g, mats: m };
}

function buildHalo(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const ti = m.make(C.ti, { metal: 1, rough: 0.28 });
  for (const s of [1, -1]) {
    g.add(
      tube(
        [
          [-0.1, 0.6, s * 0.27],
          [-0.14, 0.76, s * 0.3],
          [-0.45, 0.83, s * 0.22],
          [-0.88, 0.75, s * 0.03],
        ],
        0.019,
        ti,
        40,
      ),
    );
    g.add(box(0.06, 0.05, 0.06, ti, -0.1, 0.6, s * 0.27));
    g.add(strut([-0.16, 0.62, s * 0.28], [-0.05, 0.6, s * 0.2], 0.012, ti));
  }
  g.add(sphere(0.03, ti, -0.88, 0.75, 0));
  g.add(strut([-0.88, 0.75, 0], [-0.94, 0.5, 0], 0.026, ti));
  g.add(box(0.1, 0.03, 0.08, ti, -0.95, 0.49, 0));
  return { g, mats: m };
}

function buildFrontSusp(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const carbon = m.make(C.carbon2, { metal: 0.6, rough: 0.35 });
  const alu = m.make(C.alu, { metal: 1, rough: 0.3 });
  const red = m.make(C.red, { metal: 0.4, rough: 0.3 });
  const gold = m.make(C.gold, { metal: 1, rough: 0.3 });
  const subs: { obj: THREE.Object3D; off: V3 }[] = [];
  for (const s of [1, -1]) {
    const side = new THREE.Group();
    const up: V3 = [-1.65, 0.36, s * 0.7];
    side.add(box(0.06, 0.26, 0.05, alu, up[0], up[1], up[2]));
    // upper wishbone
    side.add(strut([-1.85, 0.4, s * 0.16], [-1.65, 0.48, s * 0.7], 0.013, carbon));
    side.add(strut([-1.35, 0.44, s * 0.16], [-1.65, 0.48, s * 0.7], 0.013, carbon));
    // lower wishbone
    side.add(strut([-1.9, 0.14, s * 0.18], [-1.65, 0.23, s * 0.7], 0.014, carbon));
    side.add(strut([-1.3, 0.16, s * 0.2], [-1.65, 0.23, s * 0.7], 0.014, carbon));
    // pushrod
    side.add(strut([-1.66, 0.26, s * 0.69], [-1.5, 0.54, s * 0.13], 0.011, gold));
    // tie rod
    side.add(strut([-1.25, 0.3, s * 0.14], [-1.58, 0.36, s * 0.69], 0.008, alu));
    // rocker
    const r = box(0.09, 0.09, 0.03, red, -1.5, 0.55, s * 0.13);
    r.rotation.z = 0.6;
    side.add(r);
    // spring
    side.add(cyl(0.022, 0.2, "x", alu, -1.38, 0.5, s * 0.1, 14));
    subs.push({ obj: side, off: [0, 0, s * 1.7] });
    g.add(side);
  }
  g.add(cyl(0.02, 0.36, "z", gold, -1.45, 0.5, 0, 14)); // torsion bar
  g.add(cyl(0.03, 0.34, "z", alu, -1.25, 0.3, 0, 16)); // steering rack
  return { g, mats: m, subs };
}

function buildRearSusp(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const carbon = m.make(C.carbon2, { metal: 0.6, rough: 0.35 });
  const alu = m.make(C.alu, { metal: 1, rough: 0.3 });
  const red = m.make(C.red, { metal: 0.4, rough: 0.3 });
  const gold = m.make(C.gold, { metal: 1, rough: 0.3 });
  const subs: { obj: THREE.Object3D; off: V3 }[] = [];
  for (const s of [1, -1]) {
    const side = new THREE.Group();
    side.add(box(0.07, 0.28, 0.05, alu, 1.95, 0.36, s * 0.7));
    side.add(strut([1.75, 0.46, s * 0.17], [1.95, 0.5, s * 0.7], 0.013, carbon));
    side.add(strut([2.2, 0.48, s * 0.17], [1.95, 0.5, s * 0.7], 0.013, carbon));
    side.add(strut([1.7, 0.16, s * 0.2], [1.95, 0.24, s * 0.7], 0.014, carbon));
    side.add(strut([2.22, 0.16, s * 0.2], [1.95, 0.24, s * 0.7], 0.014, carbon));
    // pullrod
    side.add(strut([1.96, 0.5, s * 0.69], [2.15, 0.54, s * 0.14], 0.011, gold));
    // toe link
    side.add(strut([2.3, 0.3, s * 0.15], [2.05, 0.34, s * 0.69], 0.009, alu));
    const r = box(0.09, 0.08, 0.03, red, 2.15, 0.55, s * 0.14);
    r.rotation.z = -0.5;
    side.add(r);
    side.add(cyl(0.024, 0.22, "x", alu, 2.0, 0.54, s * 0.12, 14));
    subs.push({ obj: side, off: [0, 0, s * 1.7] });
    g.add(side);
  }
  g.add(cyl(0.022, 0.32, "z", gold, 2.15, 0.56, 0, 14));
  return { g, mats: m, subs };
}

function makeWheel(
  w: number,
  s: number,
  m: Mats,
  rig: CarRig,
  front: boolean,
  x: number,
): THREE.Group {
  const g = new THREE.Group();
  const rubber = m.make(C.rubber, { metal: 0, rough: 0.92 });
  const rim = m.make(0x2a2b30, { metal: 0.9, rough: 0.3 });
  const cover = m.make(0x3c3f48, { metal: 0.7, rough: 0.35 });
  const slot = m.make(0x0b0b0e, { metal: 0.2, rough: 0.6 });
  const band = m.make(0xffd21f, { metal: 0.1, rough: 0.5 });
  const gold = m.make(C.gold, { metal: 1, rough: 0.3 });
  const prof = [
    [0.232, -0.45],
    [0.3, -0.49],
    [0.345, -0.46],
    [0.358, -0.3],
    [0.362, 0],
    [0.358, 0.3],
    [0.345, 0.46],
    [0.3, 0.49],
    [0.232, 0.45],
  ].map(([r, k]) => new THREE.Vector2(r, k * w));
  const geo = new THREE.LatheGeometry(prof, 56);
  geo.rotateX(Math.PI / 2);
  const tyre = new THREE.Mesh(geo, rubber);
  tyre.castShadow = true;
  tyre.receiveShadow = true;
  g.add(tyre);

  const spin = new THREE.Group();
  const rimGeo = new THREE.CylinderGeometry(0.232, 0.232, w * 0.92, 36, 1, true);
  rimGeo.rotateX(Math.PI / 2);
  spin.add(new THREE.Mesh(rimGeo, rim));
  const cov = new THREE.Mesh(new THREE.CircleGeometry(0.224, 40), cover);
  cov.position.z = s * w * 0.46;
  if (s < 0) cov.rotation.y = Math.PI;
  spin.add(cov);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const b = box(0.11, 0.03, 0.006, slot, Math.cos(a) * 0.14, Math.sin(a) * 0.14, s * (w * 0.46 + 0.004));
    b.rotation.z = a;
    spin.add(b);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.0045, 6, 56), band);
  ring.position.z = s * (w * 0.49 + 0.001);
  spin.add(ring);
  spin.add(cyl(0.035, 0.02, "z", gold, 0, 0, s * (w * 0.46 + 0.01), 16));
  g.add(spin);
  g.position.set(x, 0.36, s * 0.85);
  rig.wheels.push({ spin, front });
  return g;
}

function buildTyres(rig: CarRig): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const subs: { obj: THREE.Object3D; off: V3 }[] = [];
  const defs: [number, number, boolean, number, V3][] = [
    [-1.65, 1, true, 0.305, [-1.5, 0.2, 1.7]],
    [-1.65, -1, true, 0.305, [-1.5, 0.2, -1.7]],
    [1.95, 1, false, 0.405, [1.5, 0.2, 1.7]],
    [1.95, -1, false, 0.405, [1.5, 0.2, -1.7]],
  ];
  for (const [x, s, front, w, off] of defs) {
    const wh = makeWheel(w, s, m, rig, front, x);
    g.add(wh);
    subs.push({ obj: wh, off });
  }
  return { g, mats: m, subs };
}

function buildBrakes(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const discM = m.make(0x34353b, { metal: 0.8, rough: 0.35, emissive: 0xff5a10, emI: 0.25 });
  const hub = m.make(C.alu, { metal: 1, rough: 0.3 });
  const cal = m.make(C.red, { metal: 0.5, rough: 0.3 });
  const duct = m.make(C.carbon2, { metal: 0.6, rough: 0.4 });
  const subs: { obj: THREE.Object3D; off: V3 }[] = [];
  const defs: [number, number, number, V3][] = [
    [-1.65, 1, 0.305, [-0.3, -0.7, 1.5]],
    [-1.65, -1, 0.305, [-0.3, -0.7, -1.5]],
    [1.95, 1, 0.405, [0.3, -0.7, 1.5]],
    [1.95, -1, 0.405, [0.3, -0.7, -1.5]],
  ];
  for (const [x, s, , off] of defs) {
    const b = new THREE.Group();
    const cz = s * 0.78;
    b.add(cyl(0.155, 0.028, "z", discM, x, 0.36, cz, 48));
    // drilled ring
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const h = cyl(0.007, 0.03, "z", m.make(0x050506, { metal: 0, rough: 1 }), x + Math.cos(a) * 0.125, 0.36 + Math.sin(a) * 0.125, cz, 6);
      b.add(h);
    }
    b.add(cyl(0.055, 0.14, "z", hub, x, 0.36, s * 0.74, 20));
    const c = box(0.08, 0.05, 0.08, cal, x + 0.08, 0.36 + 0.12, cz);
    c.rotation.z = -0.65;
    b.add(c);
    b.add(cyl(0.012, 0.09, "y", hub, x + 0.12, 0.36 + 0.17, cz, 8));
    b.add(box(0.16, 0.07, 0.03, duct, x - 0.12, 0.36 - 0.05, s * 0.66));
    subs.push({ obj: b, off });
    g.add(b);
  }
  return { g, mats: m, subs };
}

function buildPU(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const block = m.make(0x3a3d46, { metal: 0.85, rough: 0.4 });
  const alu = m.make(C.alu, { metal: 1, rough: 0.3 });
  const red = m.make(0xb01018, { metal: 0.4, rough: 0.35 });
  const gold = m.make(C.gold, { metal: 1, rough: 0.28 });
  const inc = m.make(C.inconel, { metal: 0.9, rough: 0.4, emissive: 0xff5a10, emI: 0.15 });
  const carbon = m.make(C.carbon2, { metal: 0.5, rough: 0.4 });
  g.add(box(0.62, 0.16, 0.34, block, 1.25, 0.24, 0));
  for (const s of [1, -1]) {
    const bank = new THREE.Group();
    bank.position.set(1.25, 0.3, 0);
    bank.rotation.x = s * (Math.PI / 4);
    for (let i = -1; i <= 1; i++) {
      bank.add(cyl(0.056, 0.16, "y", alu, i * 0.2, 0.12, 0, 24));
      bank.add(cyl(0.012, 0.06, "y", gold, i * 0.2, 0.25, 0, 8));
    }
    bank.add(box(0.6, 0.04, 0.14, red, 0, 0.22, 0));
    g.add(bank);
    // exhaust manifold
    g.add(
      tube(
        [
          [1.0, 0.36, s * 0.2],
          [1.4, 0.44, s * 0.2],
          [1.68, 0.45, s * 0.1],
          [1.8, 0.44, s * 0.04],
        ],
        0.022,
        inc,
        30,
      ),
    );
  }
  g.add(box(0.5, 0.07, 0.3, carbon, 1.25, 0.5, 0));
  // turbo: compressor / MGU-H / turbine
  g.add(cyl(0.09, 0.09, "x", alu, 1.64, 0.46, 0, 28, 0.055));
  g.add(cyl(0.045, 0.1, "x", gold, 1.74, 0.46, 0, 20));
  g.add(cyl(0.075, 0.08, "x", inc, 1.84, 0.46, 0, 28, 0.085));
  // intake pipe compressor -> plenum
  g.add(
    tube(
      [
        [1.6, 0.48, 0.0],
        [1.5, 0.56, 0.0],
        [1.3, 0.54, 0.0],
      ],
      0.022,
      alu,
      16,
    ),
  );
  // tailpipe
  g.add(
    tube(
      [
        [1.9, 0.46, 0],
        [2.3, 0.44, 0],
        [2.68, 0.41, 0],
      ],
      0.036,
      inc,
      20,
    ),
  );
  // MGU-K
  g.add(cyl(0.065, 0.12, "x", gold, 0.95, 0.26, 0, 24));
  g.add(cyl(0.03, 0.1, "x", alu, 0.88, 0.26, 0, 12));
  // engine mounts
  g.add(strut([1.0, 0.17, 0.17], [0.85, 0.12, 0.25], 0.012, alu));
  g.add(strut([1.0, 0.17, -0.17], [0.85, 0.12, -0.25], 0.012, alu));
  return { g, mats: m, subs: undefined };
}

function buildES(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const body = m.make(0x1a2a4a, { metal: 0.7, rough: 0.35 });
  const lid = m.make(0x2b3a5a, { metal: 0.8, rough: 0.3 });
  const glow = m.make(0x36d6ff, { metal: 0, rough: 0.4, emissive: 0x36d6ff, emI: 1.2 });
  const cable = m.make(C.orange, { metal: 0.3, rough: 0.5 });
  g.add(box(0.26, 0.32, 0.44, body, 0.8, 0.3, 0));
  g.add(box(0.28, 0.02, 0.46, lid, 0.8, 0.47, 0));
  for (let i = 0; i < 7; i++) g.add(box(0.012, 0.03, 0.36, lid, 0.7 + i * 0.03, 0.495, 0));
  for (const s of [1, -1]) g.add(box(0.2, 0.008, 0.02, glow, 0.8, 0.3, s * 0.221));
  g.add(box(0.008, 0.2, 0.3, glow, 0.673, 0.3, 0));
  g.add(
    tube(
      [
        [0.92, 0.34, 0.12],
        [0.95, 0.3, 0.06],
        [0.96, 0.27, 0.0],
      ],
      0.014,
      cable,
      12,
    ),
  );
  g.add(
    tube(
      [
        [0.92, 0.46, -0.12],
        [1.2, 0.58, -0.16],
        [1.6, 0.56, -0.08],
        [1.74, 0.5, -0.02],
      ],
      0.014,
      cable,
      24,
    ),
  );
  return { g, mats: m };
}

function buildGearbox(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const casing = m.make(0x4a4e5a, { metal: 0.7, rough: 0.35, opacity: 0.42 });
  const alu = m.make(C.alu, { metal: 1, rough: 0.28 });
  const ti = m.make(C.ti, { metal: 1, rough: 0.3 });
  const gold = m.make(C.gold, { metal: 1, rough: 0.28 });
  const carbon = m.make(C.carbon2, { metal: 0.6, rough: 0.35 });
  g.add(
    loft(
      [
        { x: 1.82, y0: 0.18, y1: 0.52, hw: 0.18 },
        { x: 2.05, y0: 0.16, y1: 0.54, hw: 0.2 },
        { x: 2.4, y0: 0.2, y1: 0.48, hw: 0.15 },
        { x: 2.74, y0: 0.22, y1: 0.44, hw: 0.1 },
      ],
      casing,
    ),
  );
  const radii = [0.11, 0.098, 0.088, 0.08, 0.074, 0.068, 0.063, 0.058];
  radii.forEach((r, i) => {
    g.add(cyl(r, 0.2, "z", i % 2 ? ti : alu, 1.88 + i * 0.065, 0.36, 0, 36));
    g.add(cyl(r * 0.45, 0.24, "z", carbon, 1.88 + i * 0.065, 0.36, 0, 12));
  });
  g.add(cyl(0.012, 0.52, "x", gold, 2.15, 0.49, 0, 10));
  g.add(sphere(0.085, alu, 1.95, 0.36, 0));
  for (const s of [1, -1]) {
    g.add(cyl(0.022, 0.48, "z", ti, 1.95, 0.36, s * 0.42, 14));
    g.add(sphere(0.035, gold, 1.95, 0.36, s * 0.67));
  }
  g.add(box(0.26, 0.1, 0.22, carbon, 2.6, 0.33, 0)); // crash structure
  return { g, mats: m };
}

function buildCooling(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const copper = m.make(C.copper, { metal: 1, rough: 0.35 });
  const alu = m.make(C.alu, { metal: 1, rough: 0.3 });
  const blue = m.make(C.blue, { metal: 0.8, rough: 0.3 });
  const carbon = m.make(C.carbon2, { metal: 0.6, rough: 0.4 });
  const subs: { obj: THREE.Object3D; off: V3 }[] = [];
  for (const s of [1, -1]) {
    const side = new THREE.Group();
    const rad = new THREE.Group();
    for (let i = 0; i < 14; i++) rad.add(box(0.007, 0.3, 0.3, i % 2 ? copper : alu, i * 0.02, 0, 0));
    rad.add(box(0.3, 0.02, 0.32, carbon, 0.13, 0.16, 0));
    rad.add(box(0.3, 0.02, 0.32, carbon, 0.13, -0.16, 0));
    rad.position.set(0.05, 0.36, s * 0.42);
    rad.rotation.z = 0.45;
    side.add(rad);
    side.add(
      tube(
        [
          [0.3, 0.3, s * 0.36],
          [0.6, 0.26, s * 0.3],
          [0.95, 0.3, s * 0.2],
          [1.1, 0.3, s * 0.12],
        ],
        0.022,
        blue,
        24,
      ),
    );
    side.add(
      tube(
        [
          [0.3, 0.44, s * 0.46],
          [0.7, 0.4, s * 0.34],
          [1.0, 0.4, s * 0.2],
        ],
        0.018,
        alu,
        24,
      ),
    );
    side.add(box(0.2, 0.14, 0.14, copper, 1.35, 0.2, s * 0.3)); // oil cooler
    side.add(box(0.14, 0.1, 0.1, alu, 1.75, 0.22, s * 0.28)); // gearbox cooler
    subs.push({ obj: side, off: [0, 0, s * 1.4] });
    g.add(side);
  }
  return { g, mats: m, subs };
}

function buildFuel(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const fuel = m.make(0xff9a2a, { metal: 0.1, rough: 0.35, opacity: 0.86, emissive: 0xff6a00, emI: 0.25 });
  const alu = m.make(C.alu, { metal: 1, rough: 0.3 });
  const rub = m.make(0x1b1b1e, { metal: 0, rough: 0.8 });
  g.add(
    loft(
      [
        { x: -0.05, y0: 0.15, y1: 0.46, hw: 0.2, n: 2.6 },
        { x: 0.25, y0: 0.13, y1: 0.54, hw: 0.23, n: 2.6 },
        { x: 0.58, y0: 0.15, y1: 0.48, hw: 0.2, n: 2.6 },
      ],
      fuel,
    ),
  );
  g.add(cyl(0.05, 0.05, "y", alu, 0.2, 0.56, 0, 20));
  g.add(cyl(0.012, 0.3, "y", alu, 0.1, 0.42, 0.12, 8));
  g.add(
    tube(
      [
        [0.25, 0.58, 0],
        [0.5, 0.62, 0.05],
        [0.85, 0.6, 0.02],
        [1.2, 0.56, 0],
      ],
      0.013,
      rub,
      24,
    ),
  );
  return { g, mats: m };
}

function buildCockpit(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const helmet = m.make(C.white, { metal: 0.3, rough: 0.2, clear: true });
  const visor = m.make(0x0a0a10, { metal: 0.9, rough: 0.1 });
  const red = m.make(C.red, { metal: 0.2, rough: 0.4 });
  const suit = m.make(0xc01018, { metal: 0, rough: 0.7 });
  const carbon = m.make(C.carbon, { metal: 0.6, rough: 0.35 });
  const screen = m.make(0x36d6ff, { metal: 0, rough: 0.4, emissive: 0x36d6ff, emI: 1.4 });
  const colors = [0xff3030, 0x30ff60, 0xffd21f, 0x3090ff, 0xffffff, 0xff30c0];
  g.add(sphere(0.125, helmet, -0.4, 0.78, 0, 1.05, 1.05, 0.95));
  g.add(sphere(0.13, visor, -0.475, 0.785, 0, 0.5, 0.36, 0.95));
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.011, 8, 36), red);
  stripe.position.set(-0.4, 0.78, 0);
  g.add(stripe);
  g.add(sphere(1, suit, -0.15, 0.58, 0, 0.26, 0.15, 0.2));
  for (const s of [1, -1]) {
    g.add(strut([-0.28, 0.62, s * 0.2], [-0.74, 0.6, s * 0.12], 0.04, suit));
    g.add(sphere(0.045, helmet, -0.75, 0.6, s * 0.12));
  }
  const wheel = box(0.025, 0.12, 0.28, carbon, -0.78, 0.6, 0);
  wheel.rotation.z = 0.5;
  g.add(wheel);
  for (const s of [1, -1]) {
    const grip = cyl(0.022, 0.12, "y", carbon, -0.78, 0.6, s * 0.15, 12);
    grip.rotation.z = 0.5;
    g.add(grip);
  }
  g.add(box(0.008, 0.05, 0.1, screen, -0.765, 0.615, 0).rotateZ(0.5));
  colors.forEach((c, i) => {
    const b = cyl(0.012, 0.008, "x", m.make(c, { metal: 0.1, rough: 0.5, emissive: c, emI: 0.6 }), -0.765, 0.585, -0.1 + i * 0.04, 10);
    b.rotation.z = 0.5;
    g.add(b);
  });
  g.add(strut([-0.8, 0.56, 0], [-0.95, 0.42, 0], 0.02, carbon));
  return { g, mats: m };
}

function buildSidepods(): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const red = m.make(C.red, { metal: 0.35, rough: 0.28, clear: true });
  const white = m.make(C.white, { metal: 0.2, rough: 0.4 });
  const dark = m.make(C.dark, { metal: 0.3, rough: 0.6 });
  const carbon = m.make(C.carbon2, { metal: 0.6, rough: 0.35 });
  const subs: { obj: THREE.Object3D; off: V3 }[] = [];
  for (const s of [1, -1]) {
    const pod = new THREE.Group();
    pod.add(
      loft(
        [
          { x: -0.72, y0: 0.2, y1: 0.5, hw: 0.17, zc: s * 0.4 },
          { x: -0.25, y0: 0.17, y1: 0.56, hw: 0.21, zc: s * 0.42 },
          { x: 0.5, y0: 0.15, y1: 0.55, hw: 0.21, zc: s * 0.4 },
          { x: 1.1, y0: 0.13, y1: 0.43, hw: 0.17, zc: s * 0.34 },
          { x: 1.7, y0: 0.12, y1: 0.31, hw: 0.12, zc: s * 0.25 },
          { x: 2.1, y0: 0.12, y1: 0.25, hw: 0.085, zc: s * 0.18 },
        ],
        red,
      ),
    );
    pod.add(box(0.03, 0.2, 0.26, dark, -0.735, 0.35, s * 0.4));
    pod.add(box(0.5, 0.012, 0.03, white, 0.0, 0.565, s * 0.42));
    // mirror
    pod.add(strut([-0.84, 0.56, s * 0.3], [-0.78, 0.69, s * 0.54], 0.01, carbon));
    pod.add(box(0.06, 0.06, 0.14, white, -0.78, 0.7, s * 0.56));
    subs.push({ obj: pod, off: [0, 0.5, s * 1.8] });
    g.add(pod);
  }
  const cover = new THREE.Group();
  const cs: Sec[] = [
    { x: -0.12, y0: 0.52, y1: 0.82, hw: 0.11 },
    { x: 0.3, y0: 0.45, y1: 0.8, hw: 0.16 },
    { x: 0.9, y0: 0.35, y1: 0.68, hw: 0.15 },
    { x: 1.6, y0: 0.27, y1: 0.52, hw: 0.1 },
    { x: 2.3, y0: 0.25, y1: 0.42, hw: 0.05 },
  ];
  cover.add(loft(cs, red));
  cover.add(
    loft(
      cs.map((s) => ({ x: s.x, y0: s.y1 - 0.004, y1: s.y1 + 0.005, hw: 0.028 })),
      white,
      12,
    ),
  );
  cover.add(box(0.02, 0.16, 0.14, dark, -0.125, 0.68, 0));
  subs.push({ obj: cover, off: [0, 1.9, 0] });
  g.add(cover);
  return { g, mats: m, subs };
}

function buildFrontWing(rig: CarRig): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const red = m.make(C.red, { metal: 0.35, rough: 0.28, clear: true });
  const white = m.make(C.white, { metal: 0.2, rough: 0.4 });
  const carbon = m.make(C.carbon, { metal: 0.6, rough: 0.35 });
  // nose
  g.add(
    loft(
      [
        { x: -2.15, y0: 0.14, y1: 0.3, hw: 0.1 },
        { x: -1.85, y0: 0.13, y1: 0.36, hw: 0.14 },
        { x: -1.55, y0: 0.13, y1: 0.44, hw: 0.18 },
      ],
      red,
    ),
  );
  g.add(
    loft(
      [
        { x: -2.62, y0: 0.17, y1: 0.21, hw: 0.035 },
        { x: -2.4, y0: 0.15, y1: 0.26, hw: 0.07 },
        { x: -2.15, y0: 0.14, y1: 0.3, hw: 0.1 },
      ],
      white,
    ),
  );
  for (const s of [1, -1]) g.add(box(0.26, 0.09, 0.03, carbon, -2.6, 0.15, s * 0.09));
  // wing elements
  const els: [number, number, number, number, number, number, number, THREE.Material, number][] = [
    // chord, x, y, aoa(deg), camber, span, thickness, mat, k
    [0.36, -2.8, 0.095, 4, 0.055, 1.86, 0.1, carbon, 0],
    [0.28, -2.56, 0.165, 14, 0.07, 1.82, 0.09, carbon, 0.4],
    [0.24, -2.4, 0.225, 22, 0.07, 1.76, 0.08, carbon, 0.8],
    [0.2, -2.3, 0.29, 30, 0.07, 1.7, 0.07, red, 1.0],
  ];
  for (const [c, x, y, aoa, cam, span, th, mat, k] of els) {
    const e = wingElement(c, span, th, cam, mat);
    e.position.set(x, y, 0);
    e.rotation.z = (aoa * Math.PI) / 180;
    g.add(e);
    rig.fwFlaps.push({ mesh: e, base: e.rotation.z, k });
  }
  // endplates
  for (const s of [1, -1]) {
    const ep = extrudePoly(
      [
        [-3.0, 0.03],
        [-2.15, 0.03],
        [-2.12, 0.38],
        [-2.6, 0.36],
        [-3.0, 0.18],
      ],
      0.018,
      s > 0 ? red : white,
    );
    ep.position.z = s * 0.94;
    g.add(ep);
    g.add(box(0.6, 0.012, 0.1, carbon, -2.6, 0.03, s * 0.89));
    const cw = wingElement(0.16, 0.28, 0.07, 0.06, carbon);
    cw.position.set(-2.4, 0.42, s * 0.78);
    cw.rotation.z = 0.35;
    g.add(cw);
  }
  return { g, mats: m };
}

function buildRearWing(rig: CarRig): Build {
  const m = new Mats();
  const g = new THREE.Group();
  const carbon = m.make(C.carbon, { metal: 0.6, rough: 0.35 });
  const white = m.make(C.white, { metal: 0.2, rough: 0.4 });
  const red = m.make(C.red, { metal: 0.35, rough: 0.3, clear: true });
  const light = m.make(0xff1010, { metal: 0, rough: 0.4, emissive: 0xff0000, emI: 0.9 });
  const main = wingElement(0.36, 0.92, 0.1, 0.07, carbon);
  main.position.set(2.5, 0.8, 0);
  main.rotation.z = (10 * Math.PI) / 180;
  g.add(main);
  rig.rwMain = { mesh: main, base: main.rotation.z };

  const pivot = new THREE.Group();
  pivot.position.set(2.78, 1.02, 0);
  const flap = wingElement(0.3, 0.92, 0.08, 0.08, red);
  flap.position.x = -0.15;
  pivot.add(flap);
  pivot.rotation.z = (24 * Math.PI) / 180;
  g.add(pivot);
  rig.rwFlap = { pivot, base: pivot.rotation.z };

  for (let i = 0; i < 2; i++) {
    const bw = wingElement(0.22, 0.8, 0.07, 0.05, carbon);
    bw.position.set(2.45 + i * 0.08, 0.4 - i * 0.05, 0);
    bw.rotation.z = (8 * Math.PI) / 180;
    g.add(bw);
  }
  for (const s of [1, -1]) {
    const ep = extrudePoly(
      [
        [2.15, 0.55],
        [2.92, 0.55],
        [2.95, 1.06],
        [2.45, 1.02],
        [2.15, 0.7],
      ],
      0.014,
      white,
    );
    ep.position.z = s * 0.46;
    g.add(ep);
  }
  g.add(box(0.24, 0.3, 0.03, carbon, 2.5, 0.6, 0));
  g.add(box(0.04, 0.1, 0.06, light, 2.94, 0.6, 0));
  return { g, mats: m };
}

/* ------------------------------------------------------------------ assembly */

interface Def {
  id: string;
  phase: Phase;
  build: Build;
  offset: V3;
  focusSubs?: number[];
  spin?: boolean;
}

function finalize(d: Def, index: number): CarPart {
  const { g, mats } = d.build;
  g.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(g);
  const c = bb.getCenter(new THREE.Vector3());
  const root = new THREE.Group();
  root.position.copy(c);
  const kids = [...g.children];
  kids.forEach((k) => {
    k.position.sub(c);
    root.add(k);
  });
  const subs: PartSub[] = (d.build.subs ?? []).map((s) => ({
    obj: s.obj,
    base: s.obj.position.clone(),
    off: new THREE.Vector3(...s.off),
  }));
  const offset = new THREE.Vector3(...d.offset);
  // compute exploded focus
  root.position.copy(c).add(offset);
  subs.forEach((s) => s.obj.position.copy(s.base).add(s.off));
  root.updateMatrixWorld(true);
  let fb = new THREE.Box3();
  if (d.focusSubs && subs.length) {
    d.focusSubs.forEach((i) => fb.expandByObject(subs[i].obj));
  } else fb = new THREE.Box3().setFromObject(root);
  const fc = fb.getCenter(new THREE.Vector3());
  const fr = fb.getSize(new THREE.Vector3()).length() / 2;
  root.position.copy(c);
  subs.forEach((s) => s.obj.position.copy(s.base));

  const a = index * 2.399;
  const tumble = new THREE.Vector3(Math.sin(a) * 0.22, Math.cos(a * 1.3) * 0.3, Math.sin(a * 0.7) * 0.18);
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return {
    id: d.id,
    phase: d.phase,
    root,
    mats,
    assembled: c,
    offset,
    subs,
    tumble,
    focusCenter: fc,
    focusRadius: fr,
    spin: !!d.spin,
    spinY: 0,
  };
}

export function buildCar(): CarRig {
  const rig: CarRig = {
    group: new THREE.Group(),
    parts: [],
    wheels: [],
    fwFlaps: [],
    rwMain: { mesh: new THREE.Object3D(), base: 0 },
    rwFlap: { pivot: new THREE.Object3D(), base: 0 },
  };
  const defs: Def[] = [
    { id: "frontwing", phase: "skin", build: buildFrontWing(rig), offset: [-2.2, 0.6, 0], spin: true },
    { id: "sidepods", phase: "skin", build: buildSidepods(), offset: [0.3, 0.3, 0], focusSubs: [0, 1, 2] },
    { id: "rearwing", phase: "skin", build: buildRearWing(rig), offset: [2.0, 0.8, 0], spin: true },
    { id: "tyres", phase: "skin", build: buildTyres(rig), offset: [0, -0.3, 0], focusSubs: [0, 1] },
    { id: "powerunit", phase: "muscle", build: buildPU(), offset: [0.8, 0.5, 0], spin: true },
    { id: "energystore", phase: "muscle", build: buildES(), offset: [0.3, 1.1, 0], spin: true },
    { id: "gearbox", phase: "muscle", build: buildGearbox(), offset: [1.6, -0.3, 0], spin: true },
    { id: "cooling", phase: "muscle", build: buildCooling(), offset: [0.2, 1.3, 0], focusSubs: [0, 1] },
    { id: "fuelcell", phase: "muscle", build: buildFuel(), offset: [-0.5, 0.9, 0], spin: true },
    { id: "brakes", phase: "muscle", build: buildBrakes(), offset: [0, 0, 0], focusSubs: [0, 1] },
    { id: "cockpit", phase: "muscle", build: buildCockpit(), offset: [-1.0, 1.5, 0], spin: true },
    { id: "monocoque", phase: "skeleton", build: buildMonocoque(), offset: [-0.9, 0.2, 0], spin: true },
    { id: "halo", phase: "skeleton", build: buildHalo(), offset: [-0.4, 2.7, 0], spin: true },
    { id: "floor", phase: "skeleton", build: buildFloor(), offset: [0.3, -1.6, 0], spin: true },
    { id: "frontsusp", phase: "skeleton", build: buildFrontSusp(), offset: [-1.2, -0.4, 0], focusSubs: [0, 1] },
    { id: "rearsusp", phase: "skeleton", build: buildRearSusp(), offset: [1.2, -0.4, 0], focusSubs: [0, 1] },
  ];
  defs.forEach((d, i) => {
    const p = finalize(d, i);
    rig.parts.push(p);
    rig.group.add(p.root);
  });
  return rig;
}
