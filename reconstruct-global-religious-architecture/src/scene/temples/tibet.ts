import * as THREE from "three";
import {
  Temple,
  Item,
  V3,
  uTime,
  std,
  glow,
  gold,
  box,
  cyl,
  cone,
  ball,
  taper,
  inst,
  slab,
  eastRoof,
  ringMountains,
  heightMesh,
  rng,
  smooth,
  fbm,
  enableShadows,
} from "../helpers";

function T(x: number, z: number) {
  const d = Math.sqrt((x / 62) * (x / 62) + ((z + 8) / 38) * ((z + 8) / 38));
  const plateau = 30 * (1 - smooth(0.85, 1.5, d));
  const back = 20 * Math.exp(-((x / 70) * (x / 70) + ((z + 58) / 30) * ((z + 58) / 30)));
  const rough = (fbm(x * 0.08, z * 0.08) - 0.35) * 7 * smooth(0.8, 1.05, d) * (1 - smooth(1.45, 1.7, d));
  return Math.max(0, plateau + back + rough);
}

function flagLines(lines: { a: V3; b: V3; sag: number; n: number }[]) {
  const pos: number[] = [],
    col: number[] = [],
    nor: number[] = [],
    sway: number[] = [],
    idx: number[] = [];
  const palette = [0x2b6cc4, 0xf2f2f2, 0xc0392b, 0x2e9b5a, 0xe8b923].map((h) => new THREE.Color(h).multiplyScalar(0.62));
  let v = 0;
  for (const L of lines) {
    const A = new THREE.Vector3(...L.a),
      B = new THREE.Vector3(...L.b);
    const dir = B.clone().sub(A).normalize();
    const nrm = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, -1, 0)).normalize();
    const pt = (t: number) => {
      const p = A.clone().lerp(B, t);
      p.y -= L.sag * 4 * t * (1 - t);
      return p;
    };
    const dt = 1 / L.n;
    for (let i = 0; i < L.n; i++) {
      const t = (i + 0.5) * dt;
      const p0 = pt(t - dt * 0.43),
        p1 = pt(t + dt * 0.43);
      const h = Math.max(0.9, A.distanceTo(B) * dt * 0.95);
      const c = palette[i % palette.length];
      const q = [
        [p0.x, p0.y, p0.z, 0],
        [p1.x, p1.y, p1.z, 0],
        [p0.x, p0.y - h, p0.z, 1],
        [p1.x, p1.y - h, p1.z, 1],
      ];
      q.forEach((k) => {
        pos.push(k[0], k[1], k[2]);
        col.push(c.r, c.g, c.b);
        nor.push(nrm.x, nrm.y, nrm.z);
        sway.push(k[3]);
      });
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      v += 4;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("aSway", new THREE.Float32BufferAttribute(sway, 1));
  g.setIndex(idx);
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = uTime;
    s.vertexShader = s.vertexShader
      .replace("void main() {", "uniform float uTime;\nattribute float aSway;\nvoid main() {")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float ph = position.x * 0.9 + position.z * 0.9 + uTime * 4.2;
        transformed += normal * (sin(ph) * 0.45 + sin(ph * 2.3 + 1.7) * 0.18) * aSway;
        transformed.y += sin(ph * 1.3) * 0.12 * aSway;`
      );
  };
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.userData.noShadow = true;
  return mesh;
}

function chorten(parent: THREE.Object3D, x: number, z: number, s: number, white: THREE.Material, goldM: THREE.Material) {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.scale.setScalar(s);
  box(6.4, 0.9, 6.4, white, 0, 0, 0, c);
  box(5.4, 0.9, 5.4, white, 0, 0.9, 0, c);
  box(4.4, 0.9, 4.4, white, 0, 1.8, 0, c);
  const vase = new THREE.Mesh(new THREE.SphereGeometry(2.1, 14, 10), white);
  vase.scale.set(1, 1.05, 1);
  vase.position.y = 4.6;
  c.add(vase);
  box(2.0, 1.2, 2.0, goldM, 0, 6.5, 0, c);
  box(1.3, 0.35, 0.05, glow(0xffd27a, 1.2), 0, 6.9, 1.03, c);
  for (let i = 0; i < 9; i++) cyl(1.0 - i * 0.09, 1.05 - i * 0.09, 0.42, goldM, 0, 7.7 + i * 0.4, 0, c, 10);
  cone(0.4, 1.0, goldM, 0, 11.4, 0, c, 8);
  ball(0.22, glow(0xffd27a, 2.4), 0, 12.6, 0, c, 8);
  parent.add(c);
}

export function buildTibet(): Temple {
  const g = new THREE.Group();
  const r = rng(51);
  const y0 = 29;

  const white = std(0xe4ddd0, { roughness: 0.85, emissive: 0x242018, emissiveIntensity: 0.55 });
  const redM = std(0x7a1d1a, { roughness: 0.8, emissive: 0x220706, emissiveIntensity: 0.6 });
  const dark = std(0x3a1612);
  const goldM = gold(1.0);
  const windowDark = std(0x0a0a10);
  const windowLit = glow(0xffa24a, 2.2);

  // hill
  const cLow = new THREE.Color(0x3a2f2a),
    cHigh = new THREE.Color(0x5a4c44),
    grass = new THREE.Color(0x2a2f24),
    tmp = new THREE.Color();
  const hill = heightMesh(
    300,
    300,
    150,
    150,
    T,
    (x, y, z) => {
      tmp.copy(cLow).lerp(cHigh, smooth(0, 32, y) * 0.8 + fbm(x * 0.15, z * 0.15) * 0.25);
      tmp.lerp(grass, (1 - smooth(0, 8, y)) * 0.6);
      return tmp;
    },
    0,
    -20
  );
  g.add(hill);

  // white palace
  taper(118, 108, 24, 26, 22, white, 0, y0, -2, g);
  taper(104, 96, 16, 20, 17, white, 0, y0 + 24, -4, g);
  box(98, 1.2, 18.5, white, 0, y0 + 40, -4, g);
  for (const sx of [-1, 1]) {
    taper(22, 19, 16, 19, 16, white, sx * 49, y0 + 24, -4, g);
    box(21, 1.2, 17, dark, sx * 49, y0 + 40, -4, g);
    const rf = eastRoof(10, 8, 2.6, { top: goldM, curve: 1.4, up: 0.5, under: std(0x3a1612, { side: THREE.BackSide }) });
    rf.position.set(sx * 49, y0 + 42.4, -4);
    g.add(rf);
    const rf2 = eastRoof(9, 7, 2.4, { top: goldM, curve: 1.4, up: 0.5 });
    rf2.position.set(sx * 30, y0 + 41.4, -4);
    g.add(rf2);
  }
  // red palace
  taper(46, 40, 34, 28, 25, redM, 0, y0 + 6, -6, g);
  taper(38, 33, 14, 23, 21, redM, 0, y0 + 40, -6, g);
  box(36, 3.4, 22.5, dark, 0, y0 + 54, -6, g);
  const discs: Item[] = [];
  for (let i = 0; i < 7; i++) discs.push({ p: [-13.5 + i * 4.5, y0 + 55.6, 5.4], rx: Math.PI / 2, s: 1 });
  inst(new THREE.CylinderGeometry(1.1, 1.1, 0.35, 14), goldM, discs, g);
  for (const [dx, w, d, h] of [
    [0, 15, 12, 4.6],
    [-12, 9, 8, 3.4],
    [12, 9, 8, 3.4],
  ] as [number, number, number, number][]) {
    const rf = eastRoof(w, d, h, { top: goldM, curve: 1.4, up: 0.55, under: std(0x3a1612, { side: THREE.BackSide }) });
    rf.position.set(dx, y0 + 57.4, -6);
    g.add(rf);
    box(w - 2, 2.6, d - 2, redM, dx, y0 + 57.4 - 2.6, -6, g);
  }
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      cyl(0.7, 0.7, 2.6, goldM, sx * 16, y0 + 57.4, -6 + sz * 9, g, 10);
      cone(0.9, 1.6, goldM, sx * 16, y0 + 60, -6 + sz * 9, g, 10);
    }

  // windows
  const dk: Item[] = [],
    lit: Item[] = [];
  const addWin = (cz: number, yb: number, h: number, dBot: number, dTop: number, rows: number[], x0: number, x1: number, step: number, ww: number, wh: number) => {
    for (const ry of rows) {
      const t = (ry - yb) / h;
      const zf = cz + (dBot + (dTop - dBot) * t) / 2 + 0.06;
      for (let x = x0; x <= x1 + 0.01; x += step) {
        dk.push({ p: [x, ry + wh / 2, zf], s: [ww, wh, 0.3] });
        if (r() < 0.38) lit.push({ p: [x, ry + wh / 2, zf + 0.07], s: [ww * 0.72, wh * 0.8, 0.3] });
      }
    }
  };
  addWin(-2, y0, 24, 26, 22, [y0 + 4, y0 + 9.5, y0 + 15, y0 + 20], -56, 56, 3.2, 1.1, 2.0);
  addWin(-4, y0 + 24, 16, 20, 17, [y0 + 27, y0 + 32, y0 + 36.5], -46, 46, 3.4, 1.1, 1.8);
  addWin(-6, y0 + 6, 34, 28, 25, [y0 + 28, y0 + 33, y0 + 38.5], -15, 15, 3.0, 1.2, 2.4);
  addWin(-6, y0 + 40, 14, 23, 21, [y0 + 42.5, y0 + 47], -12, 12, 4, 1.2, 2.2);
  inst(new THREE.BoxGeometry(1, 1, 1), windowDark, dk, g);
  inst(new THREE.BoxGeometry(1, 1, 1), windowLit, lit, g).castShadow = false;
  // big central door
  box(8, 10, 0.5, dark, 0, y0, 11.3, g);
  box(6, 8, 0.6, glow(0xffa24a, 1.6), 0, y0 + 0.3, 11.45, g);

  // zigzag ramps
  const rampPts: [number, number][] = [
    [-34, 56],
    [-6, 47],
    [-36, 39],
    [-10, 32],
    [-34, 25],
    [-2, 14],
  ];
  const butter: Item[] = [];
  for (const sx of [-1, 1]) {
    const pts = rampPts.map(([x, z]) => new THREE.Vector3(sx * x, T(x, z) + 1.7, z));
    pts[pts.length - 1].y = y0 + 1.4;
    for (let i = 0; i < pts.length - 1; i++) {
      slab(pts[i], pts[i + 1], 5.2, 6, std(0xd9d2c4, { emissive: 0x1f1c16, emissiveIntensity: 0.5 }), g);
      const L = pts[i].distanceTo(pts[i + 1]);
      const n = Math.floor(L / 3.2);
      for (let k = 0; k <= n; k++) {
        const p = pts[i].clone().lerp(pts[i + 1], k / n);
        butter.push({ p: [p.x + 2.5, p.y + 0.55, p.z] });
        butter.push({ p: [p.x - 2.5, p.y + 0.55, p.z] });
      }
    }
  }
  const bl = inst(new THREE.SphereGeometry(0.28, 6, 5), glow(0xffb347, 4), butter, g);
  bl.castShadow = false;

  // foreground chortens
  for (let i = 0; i < 9; i++) chorten(g, -60 + i * 15, 72 + (i % 2) * 4, 1.7, white, goldM);

  // prayer flags
  const poleMat = std(0x3a2a20);
  const poles: [number, number, number, number][] = [
    [0, 78, 0, 26],
    [-55, 62, 0, 7],
    [-38, 96, 0, 6],
    [38, 96, 0, 6],
    [55, 62, 0, 7],
    [-20, 104, 0, 5],
    [20, 104, 0, 5],
    [-64, 30, 1, 18],
    [64, 30, 1, 18],
    [-42, 14, 29, 15],
    [42, 14, 29, 15],
  ];
  poles.forEach(([x, z, y, h]) => cyl(0.3, 0.4, h, poleMat, x, y, z, g, 6));
  g.add(
    flagLines([
      { a: [0, 25.5, 78], b: [-55, 7, 62], sag: 2.2, n: 34 },
      { a: [0, 25.5, 78], b: [-38, 6, 96], sag: 2.0, n: 28 },
      { a: [0, 25.5, 78], b: [38, 6, 96], sag: 2.0, n: 28 },
      { a: [0, 25.5, 78], b: [55, 7, 62], sag: 2.2, n: 34 },
      { a: [0, 25.5, 78], b: [-20, 5, 104], sag: 1.8, n: 24 },
      { a: [0, 25.5, 78], b: [20, 5, 104], sag: 1.8, n: 24 },
      { a: [-64, 19, 30], b: [-42, 44, 14], sag: 1.6, n: 22 },
      { a: [64, 19, 30], b: [42, 44, 14], sag: 1.6, n: 22 },
      { a: [-55, 7, 62], b: [-64, 19, 30], sag: 1.2, n: 22 },
      { a: [55, 7, 62], b: [64, 19, 30], sag: 1.2, n: 22 },
    ])
  );

  // village at the foot of the hill
  const houses: Item[] = [],
    hw: Item[] = [];
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 240,
      z = 92 + r() * 70;
    if (Math.abs(x) < 16 && z < 112) continue;
    const w = 5 + r() * 4,
      h = 4 + r() * 3.5,
      d = 5 + r() * 3;
    houses.push({ p: [x, h / 2, z], r: (r() - 0.5) * 0.4, s: [w, h, d], c: r() < 0.2 ? 0xa83a2a : 0xd8d2c6 });
    if (r() < 0.75) hw.push({ p: [x, h * 0.55, z - d / 2 - 0.05], r: 0, s: [1.0, 1.3, 0.15] });
  }
  inst(new THREE.BoxGeometry(1, 1, 1), std(0xffffff, { emissive: 0x181410, emissiveIntensity: 0.4 }), houses, g);
  inst(new THREE.BoxGeometry(1, 1, 1), glow(0xffb060, 2.0), hw, g).castShadow = false;

  ringMountains(g, {
    n: 34,
    rMin: 230,
    rMax: 360,
    hMin: 110,
    hMax: 220,
    wMin: 80,
    wMax: 150,
    low: 0x1a1a26,
    high: 0x3a3f52,
    snow: 0xe8efff,
    snowLine: 0.42,
    seed: 27,
    maxZ: 40,
  });
  ringMountains(g, {
    n: 18,
    rMin: 150,
    rMax: 230,
    hMin: 50,
    hMax: 100,
    wMin: 50,
    wMax: 90,
    low: 0x2a2424,
    high: 0x4a4240,
    snow: 0xdde6f5,
    snowLine: 0.75,
    seed: 29,
    maxZ: -25,
  });

  enableShadows(g);
  hill.castShadow = false;
  bl.castShadow = false;

  return {
    group: g,
    a: { pos: [-112, 27, 178], look: [0, 50, 0] },
    b: { pos: [-44, 24, 106], look: [0, 54, -4] },
    anchors: [
      { pos: [0, 50, 22], color: 0xffa060, intensity: 900, distance: 120 },
      { pos: [-42, 36, 24], color: 0xff9a50, intensity: 500, distance: 90 },
      { pos: [42, 36, 24], color: 0xff9a50, intensity: 500, distance: 90 },
      { pos: [0, 8, 70], color: 0xffb060, intensity: 340, distance: 80 },
    ],
    shadowR: 140,
  };
}
