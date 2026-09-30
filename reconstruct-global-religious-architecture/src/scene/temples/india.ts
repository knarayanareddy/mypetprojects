import * as THREE from "three";
import {
  Temple,
  Item,
  std,
  glow,
  gold,
  box,
  cyl,
  cone,
  ball,
  taper,
  inst,
  masonry,
  ringMountains,
  rng,
  enableShadows,
} from "../helpers";
import { palms } from "../trees";

const NICHE_COLS = [0xe85d3a, 0x2f9e8f, 0xf2c14e, 0xd94f8a, 0xf4ede0, 0x4c7bd9, 0x8bc34a];

function gopuram(scale: number, seed: number) {
  const g = new THREE.Group();
  const r = rng(seed);
  const stone = std(0x7c6652);
  const cream = [0xcfb28c, 0xc9a27a, 0xd9bf9a, 0xbf9870];
  const goldM = gold(0.8);

  // gateway base
  for (const sx of [-1, 1]) {
    box(13.5, 11, 16, stone, sx * 10.25, 0, 0, g);
    masonry(g, sx * 10.25 - 6.75, sx * 10.25 + 6.75, 0, 11, 8.1, 2.2, 1.0, 0x86705a, 0.6, seed);
  }
  box(34, 3.4, 16, stone, 0, 8.6, 0, g);
  masonry(g, -17, 17, 8.6, 12, 8.1, 2.2, 1.1, 0x8d775f, 0.6, seed + 1);
  box(7.2, 8.6, 0.5, glow(0xff9a3c, 1.5), 0, 0, -2, g);
  for (const sx of [-1, 1]) box(0.8, 8.8, 0.8, goldM, sx * 3.7, 0, 8.3, g);
  box(8.2, 0.8, 0.8, goldM, 0, 8.6, 8.3, g);

  // tiers
  const niches: Item[] = [];
  const pilasters: Item[] = [];
  for (let i = 0; i < 7; i++) {
    const wB = 31.5 - i * 3.5,
      wT = wB - 1.4,
      dB = 14.5 - i * 1.4,
      dT = dB - 1.0;
    const y = 12 + i * 5.0;
    taper(wB, wT, 4.4, dB, dT, std(cream[i % cream.length], { emissive: 0x24140a, emissiveIntensity: 0.5 }), 0, y, 0, g);
    box(wB + 1.4, 0.6, dB + 1.4, std(0xe8d7b9), 0, y + 4.4, 0, g);
    const mid = (wB + wT) / 4;
    const dMid = (dB + dT) / 4;
    const n = Math.max(3, Math.floor((wB - 2) / 2.5));
    for (let k = 0; k < n; k++) {
      const x = -((n - 1) * 2.5) / 2 + k * 2.5;
      const c = NICHE_COLS[Math.floor(r() * NICHE_COLS.length)];
      for (const sz of [-1, 1]) niches.push({ p: [x, y + 2.1, sz * (dMid + 0.12)], s: [1.45, 2.7, 0.55], c });
      pilasters.push({ p: [x + 1.25, y + 2.2, dMid + 0.05], s: [0.35, 4.0, 0.4] });
    }
    void mid;
  }
  inst(
    new THREE.BoxGeometry(1, 1, 1),
    std(0xffffff, { emissive: 0x3a1c0c, emissiveIntensity: 0.6 }),
    niches,
    g
  );
  inst(new THREE.BoxGeometry(1, 1, 1), std(0xf3e9d6), pilasters, g);

  // barrel crown
  const yTop = 12 + 7 * 5.0;
  const barrel = new THREE.CylinderGeometry(1, 1, 1, 22, 1, false, 0, Math.PI);
  barrel.rotateZ(Math.PI / 2);
  barrel.scale(9.4, 3.4, 2.7);
  const b = new THREE.Mesh(barrel, std(0xb8805a, { flatShading: false }));
  b.position.set(0, yTop + 0.3, 0);
  g.add(b);
  for (let k = 0; k < 7; k++) {
    const x = -4 + k * (8 / 6);
    cone(0.45, 1.6, goldM, x, yTop + 3.5, 0, g, 6);
    ball(0.3, goldM, x, yTop + 5.2, 0, g, 8);
  }
  for (const sx of [-1, 1]) {
    cone(0.6, 2.2, goldM, sx * 4.9, yTop + 0.6, 0, g, 6);
  }
  g.scale.setScalar(scale);
  return g;
}

function ringSlab(
  parent: THREE.Object3D,
  o: [number, number, number, number],
  h: [number, number, number, number],
  top: number,
  mat: THREE.Material
) {
  const [x0, x1, z0, z1] = o,
    [hx0, hx1, hz0, hz1] = h;
  box(x1 - x0, top, hz0 - z0, mat, (x0 + x1) / 2, 0, (z0 + hz0) / 2, parent);
  box(x1 - x0, top, z1 - hz1, mat, (x0 + x1) / 2, 0, (hz1 + z1) / 2, parent);
  box(hx0 - x0, top, hz1 - hz0, mat, (x0 + hx0) / 2, 0, (hz0 + hz1) / 2, parent);
  box(x1 - hx1, top, hz1 - hz0, mat, (hx1 + x1) / 2, 0, (hz0 + hz1) / 2, parent);
}

export function buildIndia(): Temple {
  const g = new THREE.Group();
  const r = rng(21);
  const sand = std(0x47382c, { roughness: 1 });
  const stone = std(0x7c6652);
  const goldM = gold(0.9);
  const terracotta = std(0xb5552e, { emissive: 0x30120a, emissiveIntensity: 0.5 });

  // plaza with stepped tank
  ringSlab(g, [-110, 110, -100, 100], [-33, 33, 49, 91], 0.6, sand);
  ringSlab(g, [-33, 33, 49, 91], [-31.5, 31.5, 50.5, 89.5], 0.4, std(0x5a4838));
  ringSlab(g, [-31.5, 31.5, 50.5, 89.5], [-30, 30, 52, 88], 0.2, std(0x6a5644));
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 36),
    new THREE.MeshStandardMaterial({
      color: 0x0c1830,
      roughness: 0.12,
      metalness: 0.7,
      emissive: 0x1a1030,
      emissiveIntensity: 0.5,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.06, 70);
  water.userData.noShadow = true;
  g.add(water);

  // main gopuram + secondary gopurams
  const main = gopuram(1, 3);
  main.position.set(0, 0.6, 30);
  g.add(main);
  const gl = gopuram(0.55, 8);
  gl.position.set(-78, 0.6, -38);
  g.add(gl);
  const gr = gopuram(0.55, 9);
  gr.position.set(78, 0.6, -38);
  g.add(gr);
  const gb = gopuram(0.75, 10);
  gb.position.set(0, 0.6, -98);
  gb.rotation.y = Math.PI;
  g.add(gb);

  // compound wall with stripes
  const stripes: Item[] = [];
  for (const sx of [-1, 1])
    for (let i = 0; i < 41; i++) {
      const x = sx * (18.5 + i * 2);
      stripes.push({ p: [x, 0.6 + 3.5, 30 + 1.51], s: [1, 7, 0.1], c: i % 2 ? 0xe9dcc6 : 0xbd4a22 });
    }
  inst(new THREE.BoxGeometry(1, 1, 1), std(0xffffff, { roughness: 0.9 }), stripes, g);
  for (const sx of [-1, 1]) {
    box(83, 7, 3, std(0xd4c2a2), sx * 59.5, 0.6, 30, g);
    box(83.6, 0.8, 3.6, std(0xf0e6d0), sx * 59.5, 7.6, 30, g);
    box(3, 7, 130, std(0xd4c2a2), sx * 101, 0.6, -35, g);
  }
  const pots: Item[] = [];
  for (const sx of [-1, 1]) for (let i = 0; i < 21; i++) pots.push({ p: [sx * (19 + i * 4), 8.4, 30], s: 1 });
  inst(new THREE.ConeGeometry(0.6, 1.5, 6), goldM, pots, g).translateY(0.75);

  // mandapa (pillared hall)
  {
    const z0 = -6;
    box(42, 1.4, 20, std(0x6e5a48), 0, 0.6, z0, g);
    box(38, 6.8, 0.4, glow(0xffa24a, 1.4), 0, 2.0, z0 - 8.6, g);
    const cols: Item[] = [],
      caps: Item[] = [];
    for (const z of [-6, 6])
      for (let i = 0; i < 9; i++) {
        const x = -16 + i * 4;
        cols.push({ p: [x, 2 + 3.8, z0 + z], s: 1 });
        caps.push({ p: [x, 2 + 7.65, z0 + z], s: 1 });
      }
    inst(new THREE.CylinderGeometry(0.62, 0.72, 7.6, 10), std(0xbfa07a), cols, g);
    inst(new THREE.BoxGeometry(1.8, 0.7, 1.8), std(0xd9bf9a), caps, g);
    box(43, 1.3, 21, std(0xc9a27a), 0, 9.6, z0, g);
    box(44, 0.7, 22, std(0xe8d7b9), 0, 10.9, z0, g);
    const vault = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false, 0, Math.PI);
    vault.rotateZ(Math.PI / 2);
    vault.scale(24, 3.6, 7);
    const v = new THREE.Mesh(vault, std(0xb8805a, { flatShading: false }));
    v.position.set(0, 11.6, z0);
    g.add(v);
    for (let k = 0; k < 9; k++) cone(0.4, 1.4, goldM, -10 + k * 2.5, 15.2, z0, g, 6);
  }

  // vimana (sanctum tower)
  {
    const vg = new THREE.Group();
    vg.position.set(0, 0.6, -36);
    g.add(vg);
    box(24, 7, 24, std(0xbfa07a), 0, 0, 0, vg);
    box(25, 0.8, 25, std(0xe8d7b9), 0, 7, 0, vg);
    masonry(vg, -12, 12, 0, 7, 12.1, 2.2, 1.0, 0xb9996f, 0.5, 14);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        cone(2, 4, goldM, sx * 10.2, 7.8, sz * 10.2, vg, 4).rotation.y = Math.PI / 4;
      }
    let y = 7.8;
    for (let i = 0; i < 6; i++) {
      const w = 17 - i * 2.4;
      taper(w, w - 1.1, 3.6, w, w - 1.1, goldM, 0, y, 0, vg);
      box(w + 1.0, 0.45, w + 1.0, goldM, 0, y + 3.6, 0, vg);
      for (const k of [0, 1, 2, 3]) {
        const hold = new THREE.Group();
        hold.rotation.y = (k * Math.PI) / 2;
        box(w * 0.3, 1.8, 0.3, glow(0xffb04a, 1.6), 0, y + 0.8, w / 2 + 0.05, hold);
        vg.add(hold);
      }
      y += 4.05;
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), goldM);
    dome.scale.set(1, 0.9, 1);
    dome.position.set(0, y - 0.3, 0);
    vg.add(dome);
    cyl(0.25, 0.3, 4.4, goldM, 0, y + 2.6, 0, vg, 8);
    cone(0.9, 1.8, goldM, 0, y + 6.4, 0, vg, 8);
    ball(0.4, glow(0xffd27a, 2.6), 0, y + 8.6, 0, vg, 8);
  }

  // pillars with marigold garlands around the tank
  const poleSpots: [number, number][] = [
    [-32, 49],
    [-11, 49],
    [11, 49],
    [32, 49],
  ];
  const marigoldA: Item[] = [],
    marigoldB: Item[] = [];
  poleSpots.forEach(([x, z]) => cyl(0.25, 0.3, 7, stone, x, 0.6, z, g, 8));
  for (let s = 0; s < poleSpots.length - 1; s++) {
    const [x0, z0] = poleSpots[s],
      [x1, z1] = poleSpots[s + 1];
    for (let k = 0; k <= 34; k++) {
      const t = k / 34;
      const y = 6.8 - Math.sin(t * Math.PI) * 2.2;
      const it: Item = { p: [x0 + (x1 - x0) * t, y + 0.6, z0 + (z1 - z0) * t + Math.sin(k) * 0.12], s: 0.55 + (k % 3) * 0.05 };
      (k % 2 ? marigoldA : marigoldB).push(it);
    }
  }
  const flower = new THREE.SphereGeometry(0.42, 7, 5);
  inst(flower, std(0xff8c12, { emissive: 0xc85a00, emissiveIntensity: 0.9 }), marigoldA, g);
  inst(flower, std(0xffc21a, { emissive: 0xd08a00, emissiveIntensity: 0.9 }), marigoldB, g);

  // diyas
  const cups: Item[] = [],
    flames: Item[] = [];
  const addDiya = (x: number, y: number, z: number) => {
    cups.push({ p: [x, y + 0.11, z] });
    flames.push({ p: [x, y + 0.42, z], s: [1, 1.7, 1] });
  };
  for (let x = -30; x <= 30; x += 2.4) {
    addDiya(x, 0.2, 51.2);
    addDiya(x, 0.2, 88.8);
  }
  for (let z = 52; z <= 88; z += 2.4) {
    addDiya(-30.8, 0.2, z);
    addDiya(30.8, 0.2, z);
  }
  for (let i = 0; i < 140; i++) addDiya((r() - 0.5) * 56, 0.06, 54 + r() * 32);
  for (let i = 0; i < 60; i++) {
    const x = (r() - 0.5) * 150,
      z = 40 + r() * 6;
    addDiya(x, 0.6, z);
  }
  inst(new THREE.CylinderGeometry(0.36, 0.22, 0.22, 8), terracotta, cups, g);
  const fl = inst(new THREE.SphereGeometry(0.17, 6, 5), glow(0xffb347, 4), flames, g);
  fl.castShadow = false;

  // palms
  const spots = [];
  for (let i = 0; i < 26; i++) {
    const x = (r() - 0.5) * 300,
      z = 100 - r() * 220;
    if (Math.abs(x) < 70 && z > 20 && z < 100) continue;
    if (Math.abs(x) < 110 && z < 34 && z > -105) continue;
    spots.push({ x, z });
  }
  for (const x of [-46, -40, 40, 46]) spots.push({ x, z: 56 });
  palms(g, spots, 6, 0x1f4426, 0x5a4a38);

  ringMountains(g, {
    n: 22,
    rMin: 240,
    rMax: 340,
    hMin: 20,
    hMax: 50,
    wMin: 80,
    wMax: 160,
    low: 0x120c12,
    high: 0x2a1a22,
    seed: 13,
    maxZ: 0,
  });

  enableShadows(g);
  water.castShadow = false;
  fl.castShadow = false;

  const flameMat = fl.material as THREE.MeshStandardMaterial;
  return {
    group: g,
    a: { pos: [-78, 11, 142], look: [0, 22, 20] },
    b: { pos: [-30, 13, 88], look: [2, 30, 24] },
    anchors: [
      { pos: [0, 6, 46], color: 0xff8a2a, intensity: 520, distance: 90 },
      { pos: [0, 16, 26], color: 0xffa040, intensity: 420, distance: 80 },
      { pos: [0, 10, -10], color: 0xffa24a, intensity: 380, distance: 70 },
      { pos: [0, 24, -34], color: 0xffc070, intensity: 320, distance: 70 },
    ],
    shadowR: 130,
    update: (t) => {
      flameMat.emissiveIntensity = 3.6 + Math.sin(t * 9) * 0.5 + Math.sin(t * 17.3) * 0.25;
    },
  };
}
