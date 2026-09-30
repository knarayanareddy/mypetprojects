import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  Temple,
  Item,
  TAU,
  std,
  glow,
  gold,
  box,
  cyl,
  cone,
  ball,
  taper,
  inst,
  rng,
  enableShadows,
  ringMountains,
  windowTex,
} from "../helpers";

function ringLines(radii: number[], color: number, opacity: number, y: number) {
  const lp: number[] = [];
  for (const R of radii) {
    const n = Math.max(60, Math.floor(R * 3));
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU,
        a1 = ((i + 1) / n) * TAU;
      lp.push(Math.cos(a0) * R, y, Math.sin(a0) * R, Math.cos(a1) * R, y, Math.sin(a1) * R);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  l.frustumCulled = false;
  l.userData.noShadow = true;
  return l;
}

export function buildMecca(): Temple {
  const g = new THREE.Group();
  const r = rng(101);
  const marble = std(0xcfcac0, { emissive: 0x3a3832, emissiveIntensity: 0.85, roughness: 0.6, flatShading: false });
  const cream = std(0xd8c9a8, { emissive: 0x3a2c18, emissiveIntensity: 0.8 });
  cream.side = THREE.DoubleSide;
  const goldM = gold(1.3);
  const black = std(0x0b0b0d, { roughness: 0.5, metalness: 0.1, emissive: 0x050506, emissiveIntensity: 0.5 });

  // ---- floors
  const floorBig = new THREE.Mesh(new THREE.CircleGeometry(100, 96), std(0x8f8a7e, { emissive: 0x24221e, emissiveIntensity: 0.8, flatShading: false, roughness: 0.9 }));
  floorBig.rotation.x = -Math.PI / 2;
  floorBig.position.y = 0.02;
  floorBig.userData.noShadow = true;
  g.add(floorBig);
  const mataf = new THREE.Mesh(new THREE.CircleGeometry(49, 96), marble);
  mataf.rotation.x = -Math.PI / 2;
  mataf.position.y = 0.06;
  g.add(mataf);
  g.add(ringLines([12, 19, 27, 36, 45], 0xb59a52, 0.6, 0.1));
  g.add(ringLines([48.6, 49.0], 0xe8b64a, 0.9, 0.12));

  // ---- Kaaba
  const kg = new THREE.Group();
  kg.position.y = 0.06;
  g.add(kg);
  box(14, 15.4, 12, black, 0, 0, 0, kg);
  box(14.3, 0.9, 12.3, black, 0, 0, 0, kg);
  box(14.28, 2.4, 12.28, goldM, 0, 9.2, 0, kg); // hizam
  for (const f of [0, 1, 2, 3]) {
    const hold = new THREE.Group();
    hold.rotation.y = (f * Math.PI) / 2;
    const dz = f % 2 === 0 ? 6.15 : 7.15;
    const wd = f % 2 === 0 ? 11 : 9;
    kg.add(hold);
    for (let k = 0; k < 4; k++) box(0.5, 6.6, 0.06, goldM, -wd / 2 + 0.9 + k * ((wd - 1.8) / 3), 1.4, dz + 0.02, hold);
    if (f === 0) {
      box(3.0, 5.4, 0.3, glow(0xe8b040, 1.8), 0, 2.4, dz + 0.1, hold);
      box(3.6, 0.35, 0.4, goldM, 0, 7.9, dz + 0.12, hold);
      box(0.35, 5.4, 0.4, goldM, -1.65, 2.4, dz + 0.12, hold);
      box(0.35, 5.4, 0.4, goldM, 1.65, 2.4, dz + 0.12, hold);
    }
  }
  box(14.2, 0.35, 12.2, std(0x1a1a1e), 0, 15.3, 0, kg);
  const hajar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 6, 14), std(0xbfc3c8, { metalness: 0.8, roughness: 0.3 }));
  hajar.position.set(-7.1, 1.6, 6.1);
  hajar.rotation.y = Math.PI / 4;
  kg.add(hajar);
  // hatim
  const hatim = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 1.5, 32, 1, true, Math.PI / 2, Math.PI),
    std(0xe8e4da, { side: THREE.DoubleSide, emissive: 0x2a2822, emissiveIntensity: 0.8 })
  );
  hatim.position.set(0, 0.75, -6.05);
  kg.add(hatim);
  // maqam ibrahim
  box(3.0, 2.6, 3.0, goldM, 9, 0, 19, kg);
  box(2.6, 2.2, 2.6, glow(0xffd99a, 1.6), 9, 0.2, 19, kg);
  cone(2.2, 2.4, goldM, 9, 2.6, 19, kg, 4).rotation.y = Math.PI / 4;
  // zamzam-ish canopy lights
  for (const [x, z] of [
    [-16, 24],
    [18, -22],
  ])
    ball(0.6, glow(0xfff0c8, 3), x, 3.5, z, kg, 8);

  // ---- pilgrims (tawaf): counter-clockwise bands
  const figure = mergeGeometries([
    new THREE.CylinderGeometry(0.3, 0.38, 1.45, 6).translate(0, 0.72, 0),
    new THREE.SphereGeometry(0.26, 7, 5).translate(0, 1.72, 0),
  ])!;
  const pilMat = std(0xffffff, { emissive: 0x262626, emissiveIntensity: 0.7 });
  const bands: { mesh: THREE.InstancedMesh; w: number }[] = [];
  const radii = [13, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46];
  radii.forEach((R, bi) => {
    const n = Math.floor((TAU * R) / 1.05);
    const items: Item[] = [];
    for (let i = 0; i < n; i++) {
      const a = ((i + r() * 0.6) / n) * TAU;
      const rr = R + (r() - 0.5) * 1.6;
      const dark = r() < 0.27;
      items.push({
        p: [Math.cos(a) * rr, 0.08, Math.sin(a) * rr],
        r: -a + Math.PI * (1 + 0.0),
        s: 0.9 + r() * 0.25,
        c: dark ? 0x18181c : 0xf4f1ea,
      });
    }
    const m = inst(figure, pilMat, items, g);
    m.castShadow = false;
    m.receiveShadow = false;
    bands.push({ mesh: m, w: (1.5 + (bi % 3) * 0.12) / R });
  });

  // ---- arcaded mosque ring
  const Ri = 51,
    Ro = 67;
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(Ro, Ro, 27.6, 96, 1, true),
    std(0xe2d2ac, { side: THREE.DoubleSide, emissive: 0x7a5a30, emissiveIntensity: 1.1, flatShading: false })
  );
  wall.position.y = 13.8;
  g.add(wall);
  for (const h of [9, 18, 27]) {
    const s = new THREE.Mesh(new THREE.RingGeometry(Ri - 0.4, Ro + 0.6, 96, 1), cream);
    s.rotation.x = -Math.PI / 2;
    s.position.y = h + (h === 27 ? 0.2 : 0);
    g.add(s);
    const e = new THREE.Mesh(new THREE.CylinderGeometry(Ri - 0.4, Ri - 0.4, 0.9, 96, 1, true), cream);
    e.position.y = h - 0.45;
    g.add(e);
  }
  const bays = 72;
  const piers: Item[] = [],
    arches: Item[] = [],
    rails: Item[] = [];
  for (let lv = 0; lv < 3; lv++)
    for (let k = 0; k < bays; k++) {
      const a = (k / bays) * TAU;
      const ry = Math.PI / 2 - a;
      piers.push({ p: [Math.cos(a) * (Ri + 0.4), lv * 9 + 3.1, Math.sin(a) * (Ri + 0.4)], r: ry, s: [1.3, 6.2, 1.6] });
      const b = a + TAU / bays / 2;
      arches.push({ p: [Math.cos(b) * (Ri + 0.4), lv * 9 + 6.2, Math.sin(b) * (Ri + 0.4)], r: Math.PI / 2 - b });
      if (lv > 0) rails.push({ p: [Math.cos(b) * (Ri + 0.3), lv * 9 + 0.7, Math.sin(b) * (Ri + 0.3)], r: Math.PI / 2 - b, s: [(TAU * Ri) / bays, 1.0, 0.25] });
    }
  inst(new THREE.BoxGeometry(1, 1, 1), cream, piers, g);
  const archW = (TAU * Ri) / bays / 2 - 0.35;
  inst(new THREE.TorusGeometry(archW, 0.3, 6, 10, Math.PI), cream, arches, g);
  inst(new THREE.BoxGeometry(1, 1, 1), std(0xbfb092), rails, g);
  // roof domes
  const domes: Item[] = [];
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * TAU;
    domes.push({ p: [Math.cos(a) * 59, 27.3, Math.sin(a) * 59], s: [3.2, 2.6, 3.2] });
  }
  inst(new THREE.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI / 2), std(0xece6d6, { emissive: 0x3a3020, emissiveIntensity: 0.9, flatShading: false }), domes, g);
  inst(new THREE.ConeGeometry(0.22, 1.4, 5), goldM, domes.map((d) => ({ p: [d.p[0], 27.3 + 2.9, d.p[2]] as [number, number, number] })), g);

  // ---- minarets
  const greenCap = std(0x0c6a44, { emissive: 0x0a7a4a, emissiveIntensity: 1.2, roughness: 0.4 });
  const band = glow(0x7dffc0, 2.4);
  [12, 52, 98, 142, 188, 232, 270, 310, 350].forEach((deg) => {
    const a = (deg / 180) * Math.PI;
    const mg = new THREE.Group();
    mg.position.set(Math.cos(a) * 70, 0, Math.sin(a) * 70);
    g.add(mg);
    box(5, 12, 5, cream, 0, 0, 0, mg);
    cyl(2.3, 3.0, 50, cream, 0, 12, 0, mg, 8);
    for (const y of [40, 54]) cyl(3.7, 3.2, 0.9, cream, 0, y, 0, mg, 8);
    for (const y of [26, 34, 47]) cyl(2.55, 2.55, 0.5, band, 0, y, 0, mg, 8);
    cyl(2.0, 2.3, 7, cream, 0, 62, 0, mg, 8);
    cyl(2.45, 2.45, 1.0, band, 0, 66, 0, mg, 8);
    cone(2.4, 10, greenCap, 0, 69, 0, mg, 8);
    const cr = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.22, 6, 16, Math.PI * 1.45), goldM);
    cr.position.set(0, 81.4, 0);
    cr.rotation.z = Math.PI * 0.27;
    mg.add(cr);
    ball(0.3, goldM, 0, 79.6, 0, mg, 8);
  });

  // ---- clock tower & city
  const tex = windowTex(14, 40, 5, 0.5);
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x3a3832,
    roughness: 0.8,
    flatShading: true,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 1.5,
  });
  const tg = new THREE.Group();
  tg.position.set(-112, 0, -104);
  g.add(tg);
  taper(40, 32, 150, 40, 32, towerMat, 0, 0, 0, tg);
  box(46, 46, 46, std(0xcfc6b0, { emissive: 0x8a7a50, emissiveIntensity: 1.0 }), 0, 150, 0, tg);
  for (let f = 0; f < 4; f++) {
    const hold = new THREE.Group();
    hold.rotation.y = (f * Math.PI) / 2;
    tg.add(hold);
    const face = new THREE.Mesh(new THREE.CircleGeometry(16, 40), glow(0xe8fff0, 2.2));
    face.position.set(0, 173, 23.3);
    hold.add(face);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(16.4, 0.9, 6, 40), std(0x0c6a44, { emissive: 0x0a8a52, emissiveIntensity: 1.4 }));
    ring.position.set(0, 173, 23.3);
    hold.add(ring);
    box(0.7, 12, 0.3, black, 0, 173, 23.6, hold);
    const h2 = box(0.7, 8, 0.3, black, 0, 173, 23.65, hold);
    h2.rotation.z = -1.9;
  }
  box(36, 9, 36, cream, 0, 196, 0, tg);
  cone(11, 36, goldM, 0, 205, 0, tg, 4).rotation.y = Math.PI / 4;
  ball(1.4, goldM, 0, 242, 0, tg, 8);
  const cr = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.5, 6, 18, Math.PI * 1.5), goldM);
  cr.position.set(0, 246, 0);
  cr.rotation.z = Math.PI * 0.25;
  tg.add(cr);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.3;
    const h = 70 + r() * 70;
    box(22, h, 22, towerMat, Math.cos(a) * 46, 0, Math.sin(a) * 46, tg);
    box(24, 3, 24, cream, Math.cos(a) * 46, h, Math.sin(a) * 46, tg);
  }

  const cityTex = windowTex(6, 12, 9, 0.42);
  const cityMat = new THREE.MeshStandardMaterial({
    color: 0x55504a,
    roughness: 0.9,
    flatShading: true,
    emissive: 0xffffff,
    emissiveMap: cityTex,
    emissiveIntensity: 1.3,
  });
  const city: Item[] = [];
  const tone = [0x6a645a, 0x807868, 0x5a5650, 0x756a58];
  for (let i = 0; i < 70; i++) {
    const a = r() * TAU;
    const rad = 135 + r() * 150;
    const x = Math.cos(a) * rad,
      z = Math.sin(a) * rad;
    if (z > 20 && x > -90) continue;
    if (Math.hypot(x + 112, z + 104) < 70) continue;
    const w = 14 + r() * 16,
      h = 25 + r() * 90,
      d = 14 + r() * 16;
    city.push({ p: [x, h / 2, z], r: r() * 3, s: [w, h, d], c: tone[Math.floor(r() * tone.length)] });
  }
  inst(new THREE.BoxGeometry(1, 1, 1), cityMat, city, g);

  ringMountains(g, {
    n: 40,
    rMin: 300,
    rMax: 420,
    hMin: 40,
    hMax: 110,
    wMin: 60,
    wMax: 130,
    low: 0x120f0c,
    high: 0x2c2620,
    seed: 37,
    maxZ: 500,
  });

  enableShadows(g);
  floorBig.castShadow = false;
  tg.traverse((o) => {
    (o as THREE.Mesh).castShadow = false;
  });

  return {
    group: g,
    a: { pos: [64, 42, 124], look: [0, 8, 0] },
    b: { pos: [24, 46, 52], look: [0, 6, 0] },
    outro: [
      { pos: [10, 120, 38], look: [0, 2, 0] },
      { pos: [2, 205, 18], look: [0, 0, -4] },
    ],
    anchors: [
      { pos: [0, 24, 0], color: 0xffe3a8, intensity: 1500, distance: 100 },
      { pos: [32, 18, 32], color: 0xfff0d0, intensity: 800, distance: 90 },
      { pos: [-32, 18, -32], color: 0xffe0b0, intensity: 800, distance: 90 },
      { pos: [0, 40, 0], color: 0xffffff, intensity: 500, distance: 120 },
    ],
    shadowR: 110,
    update: (t) => {
      bands.forEach((b) => {
        b.mesh.rotation.y = b.w * t;
      });
    },
  };
}
