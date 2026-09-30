import * as THREE from "three";
import {
  Temple,
  V3,
  Item,
  std,
  glow,
  gold,
  box,
  cyl,
  cone,
  ball,
  torus,
  inst,
  slab,
  masonry,
  eastRoof,
  ringMountains,
  heightMesh,
  rng,
  smooth,
  fbm,
  lerp,
  enableShadows,
} from "../helpers";

const PROFILE: [number, number][] = [
  [90, 0],
  [50, 0.6],
  [16, 12],
  [14, 12.4],
  [-2, 12.4],
  [-3, 20.5],
  [-44, 20.5],
  [-60, 34],
  [-100, 62],
  [-160, 76],
];
function P(z: number) {
  if (z >= PROFILE[0][0]) return 0;
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [z0, y0] = PROFILE[i],
      [z1, y1] = PROFILE[i + 1];
    if (z <= z0 && z >= z1) return y0 + ((y1 - y0) * (z0 - z)) / (z0 - z1);
  }
  return PROFILE[PROFILE.length - 1][1];
}
function T(x: number, z: number) {
  const ax = Math.abs(x);
  const front = 1 - smooth(90, 150, z);
  const side = smooth(46, 84, ax) * front;
  const rough = smooth(44, 70, ax);
  return (
    P(z) + side * (10 + fbm(x * 0.05, z * 0.05) * 26) + (fbm(x * 0.11 + 3, z * 0.11) - 0.4) * 5 * rough
  );
}

export function buildKyoto(): Temple {
  const g = new THREE.Group();
  const r = rng(7);

  // ---- materials
  const red = std(0xb8301c, { roughness: 0.6, emissive: 0x2a0804, emissiveIntensity: 0.7 });
  const darkRed = std(0x6b1c12, { roughness: 0.7 });
  const black = std(0x15120f);
  const wood = std(0x3a2a20);
  const plaster = std(0xcfc6b2, { emissive: 0x1d1812, emissiveIntensity: 0.35 });
  const stone = std(0x55524f);
  const roofTile = std(0x262b31, { roughness: 0.5, metalness: 0.15, flatShading: false });
  const shoji = glow(0xffa24a, 1.9);
  const lampMat = glow(0xff5a2a, 2.6);

  // ---- terrain
  const mossLow = new THREE.Color(0x1a2a20),
    mossHigh = new THREE.Color(0x2d3b2c),
    rock = new THREE.Color(0x3c3a3c),
    tmp = new THREE.Color();
  const terrain = heightMesh(
    340,
    340,
    136,
    136,
    T,
    (x, y, z) => {
      tmp.copy(mossLow).lerp(mossHigh, smooth(0, 60, y) * 0.8 + fbm(x * 0.2, z * 0.2) * 0.3);
      const flat = Math.abs(x) < 46 && z < 16 && z > -44 ? 1 : 0;
      if (flat) tmp.lerp(new THREE.Color(0x3c3a39), 0.75);
      if (y > 50) tmp.lerp(rock, smooth(50, 75, y) * 0.6);
      return tmp;
    },
    0,
    -30
  );
  terrain.userData.noShadow = false;
  g.add(terrain);

  // ---- stone plaza surface + retaining wall
  box(88, 0.25, 18, std(0x4a4846), 0, 12.3, 6, g);
  masonry(g, -44, 44, 11.6, 20.6, -0.8, 2.6, 1.05, 0x5b5855, 2.2, 4);
  box(88, 9, 1.4, std(0x2b2a29), 0, 11.6, -2.2, g);

  // ---- main stair
  const steps: Item[] = [];
  for (let z = 50; z > 15.5; z -= 0.85) steps.push({ p: [0, P(z) + 0.15 - 0.6, z], s: [8, 1.2, 0.9] });
  inst(new THREE.BoxGeometry(1, 1, 1), std(0x6a6662), steps, g);
  // parapets
  const ang = Math.atan2(12 - 0.6, 34);
  for (const sx of [-1, 1]) {
    const w = box(0.7, 1.3, 36, stone, sx * 4.4, 0, 0, g);
    w.position.set(sx * 4.4, (12 + 0.6) / 2 + 0.6, 33);
    w.rotation.x = ang;
  }

  // ---- side stairs up to the hall terrace (built on the plaza)
  for (const sx of [-1, 1]) {
    const st: Item[] = [];
    for (let i = 0; i < 17; i++) {
      const top = 12.4 + (i + 1) * 0.5;
      st.push({ p: [sx * 30, (12.4 + top) / 2, 11 - i * 0.8], s: [6, top - 12.4, 0.82] });
    }
    inst(new THREE.BoxGeometry(1, 1, 1), std(0x6a6662), st, g);
  }

  // ---- Nio-mon gate
  {
    const z0 = 56,
      y0 = 0.4;
    const gate = new THREE.Group();
    gate.position.set(0, y0, z0);
    g.add(gate);
    box(32, 1.6, 15, std(0x5a5754), 0, 0, 0, gate);
    for (const x of [-12.5, -4, 4, 12.5])
      for (const z of [-4.8, 4.8]) cyl(0.8, 0.85, 8.2, red, x, 1.6, z, gate, 12);
    for (const sx of [-1, 1]) {
      box(8, 7.4, 9.6, darkRed, sx * 8.25, 1.8, 0, gate);
      box(7.2, 2.4, 0.3, glow(0xff7a30, 0.7), sx * 8.25, 3.6, 4.9, gate);
    }
    box(30, 1.1, 12.5, wood, 0, 9.8, 0, gate);
    for (let i = 0; i < 5; i++) box(0.9, 1.0, 12.6, black, -12 + i * 6, 9.0, 0, gate);
    const lower = eastRoof(36, 19, 4.4, { top: roofTile });
    lower.position.set(0, 10.6, 0);
    gate.add(lower);
    box(23, 5.4, 8.4, plaster, 0, 11.0, 0, gate);
    for (const x of [-11.5, -5.75, 0, 5.75, 11.5]) cyl(0.5, 0.5, 5.6, red, x, 11.0, 4.3, gate, 10);
    for (let i = 0; i < 4; i++) box(3.6, 3.1, 0.25, shoji, -8.6 + i * 5.75, 12.2, 4.4, gate);
    const upper = eastRoof(32, 15.5, 6.2, { top: roofTile });
    upper.position.set(0, 16.6, 0);
    gate.add(upper);
    for (const x of [-2.8, 2.8]) {
      ball(0.9, lampMat, x, 7.4, 0, gate);
      cyl(0.05, 0.05, 2, black, x, 7.8, 0, gate, 4);
    }
  }

  // ---- torii corridor
  const toriiItems: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const z = 46 - i * 4.5;
    toriiItems.push({ x: 0, y: P(z) + 0.15, z });
  }
  const pillarGeo = new THREE.CylinderGeometry(0.42, 0.5, 6.8, 12);
  pillarGeo.translate(0, 3.4, 0);
  const pillars: Item[] = [],
    caps: Item[] = [],
    kasagi: Item[] = [],
    shimaki: Item[] = [],
    nuki: Item[] = [],
    plaque: Item[] = [],
    tips: Item[] = [];
  toriiItems.forEach((t) => {
    for (const sx of [-1, 1]) {
      pillars.push({ p: [sx * 2.9, t.y, t.z] });
      caps.push({ p: [sx * 2.9, t.y, t.z], s: [1, 1, 1] });
      tips.push({ p: [sx * 4.1, t.y + 7.05, t.z], rz: sx * 0.22, s: [1.4, 1, 1] });
    }
    kasagi.push({ p: [0, t.y + 6.95, t.z], s: [8.0, 0.55, 0.75] });
    shimaki.push({ p: [0, t.y + 6.45, t.z], s: [7.0, 0.36, 0.58] });
    nuki.push({ p: [0, t.y + 5.2, t.z], s: [6.4, 0.42, 0.36] });
    plaque.push({ p: [0, t.y + 5.75, t.z], s: [0.55, 1.1, 0.4] });
  });
  const unit = new THREE.BoxGeometry(1, 1, 1);
  inst(pillarGeo, red, pillars, g);
  inst(new THREE.CylinderGeometry(0.56, 0.6, 0.7, 12), black, caps, g);
  inst(unit, red, kasagi, g);
  inst(unit, black, shimaki, g);
  inst(unit, red, nuki, g);
  inst(unit, black, plaque, g);
  inst(unit, red, tips, g);

  // ---- stone lanterns
  const lanternSpots: V3[] = [];
  for (let i = 0; i < 6; i++) {
    const z = 47 - i * 6.2;
    lanternSpots.push([-5.6, P(z) + 0.15, z], [5.6, P(z) + 0.15, z]);
  }
  for (const x of [-12, 12, -24, 24, -38, 38]) lanternSpots.push([x, 12.4, 9]);
  for (const x of [-20, 20, -8, 8]) lanternSpots.push([x, 20.5, -8]);
  const L = (fn: (p: V3) => Item) => lanternSpots.map(fn);
  inst(new THREE.BoxGeometry(1, 0.5, 1), stone, L((p) => ({ p: [p[0], p[1], p[2]], s: 1.05 })), g).translateY(0.25);
  inst(new THREE.CylinderGeometry(0.22, 0.26, 1.3, 8), stone, L((p) => ({ p: [p[0], p[1] + 1.15, p[2]] })), g);
  const fire = inst(new THREE.BoxGeometry(0.72, 0.72, 0.72), glow(0xffa048, 2.8), L((p) => ({ p: [p[0], p[1] + 2.2, p[2]] })), g);
  fire.castShadow = false;
  const capGeo = new THREE.ConeGeometry(1.1, 0.8, 4);
  capGeo.rotateY(Math.PI / 4);
  inst(capGeo, stone, L((p) => ({ p: [p[0], p[1] + 2.95, p[2]] })), g);
  inst(new THREE.SphereGeometry(0.17, 8, 6), stone, L((p) => ({ p: [p[0], p[1] + 3.45, p[2]] })), g);

  // ---- main hall (hondo) + stage
  {
    const yb = 21.7;
    box(34, 1.2, 26, std(0x444240), 0, 20.5, -15, g);
    box(24, 6.2, 20, plaster, 0, yb, -16, g);
    for (let i = 0; i < 9; i++) cyl(0.42, 0.45, 6.4, red, -12 + i * 3, yb, -5.9, g, 10);
    for (let i = 0; i < 8; i++) box(2.4, 4.2, 0.22, shoji, -10.5 + i * 3, yb + 0.9, -5.85, g);
    box(25.5, 0.6, 0.7, darkRed, 0, yb + 5.6, -5.85, g);
    box(25.5, 0.45, 0.6, darkRed, 0, yb + 0.25, -5.85, g);
    const roof = eastRoof(38, 30, 10.4, { top: roofTile });
    roof.position.set(0, yb + 6.0, -16);
    g.add(roof);
    // stage deck
    box(31, 0.7, 15, std(0x4d3a2c), 0, 21.0, 1.5, g);
    // stilts
    const zs = [8, 4.6, 1.2];
    const xs = [-13.5, -9, -4.5, 0, 4.5, 9, 13.5];
    const stilts: Item[] = [];
    for (const z of zs) for (const x of xs) stilts.push({ p: [x, 12.4 + 4.3, z], s: [0.95, 8.6, 0.95] });
    inst(new THREE.BoxGeometry(1, 1, 1), wood, stilts, g);
    for (const z of zs)
      for (const y of [15.2, 18.6]) box(28.5, 0.45, 0.5, wood, 0, y, z, g);
    for (const x of xs)
      for (const y of [15.6, 18.2]) box(0.45, 0.45, 6.8, wood, x, y, 4.6, g);
    // braces
    for (const x of [-13.5, 13.5])
      for (const z of [4.6]) {
        const br = box(0.3, 7, 0.3, wood, x, 12.4, z, g);
        br.rotation.x = 0.55;
      }
    // railing
    const posts: Item[] = [];
    for (let x = -15; x <= 15.01; x += 1.5) posts.push({ p: [x, 21.35 + 0.55, 9] });
    for (let z = -5; z <= 9; z += 1.5) {
      posts.push({ p: [-15, 22.0, z] });
      posts.push({ p: [15, 22.0, z] });
    }
    inst(new THREE.BoxGeometry(0.22, 1.1, 0.22), darkRed, posts, g);
    box(30.4, 0.2, 0.26, darkRed, 0, 22.4, 9, g);
    box(0.26, 0.2, 14.4, darkRed, -15, 22.4, 2, g);
    box(0.26, 0.2, 14.4, darkRed, 15, 22.4, 2, g);
    for (const x of [-15, 15]) {
      ball(0.7, lampMat, x, 20.2, 9.3, g);
    }
  }

  // ---- three-story pagoda
  {
    const px = 34,
      pz = -17;
    const pg = new THREE.Group();
    pg.position.set(px, 20.5, pz);
    g.add(pg);
    box(22, 1.4, 22, std(0x4a4846), 0, 0, 0, pg);
    let y = 1.4;
    const ws = [9, 7.8, 6.6],
      hs = [6.6, 5.6, 5];
    for (let i = 0; i < 3; i++) {
      const w = ws[i],
        h = hs[i];
      box(w, h, w, darkRed, 0, y, 0, pg);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) cyl(0.35, 0.35, h, red, (sx * w) / 2, y, (sz * w) / 2, pg, 8);
      for (const k of [0, 1, 2, 3]) {
        const a = (k * Math.PI) / 2;
        const gl = box(w * 0.42, h * 0.52, 0.22, shoji, 0, y + h * 0.22, w / 2 + 0.03, pg);
        const hold = new THREE.Group();
        hold.rotation.y = a;
        hold.add(gl);
        pg.add(hold);
      }
      const roof = eastRoof(w + 8.6 - i * 0.6, w + 8.6 - i * 0.6, 3.4, { top: roofTile, curve: 1.6, up: 0.6 });
      roof.position.set(0, y + h, 0);
      pg.add(roof);
      y += h + 1.0;
    }
    y += 2.4;
    cyl(0.18, 0.22, 10, goldMat(), 0, y - 1.2, 0, pg, 8);
    for (let i = 0; i < 7; i++) torus(0.75 - i * 0.05, 0.1, goldMat(), 0, y + i * 0.95, 0, pg);
    ball(0.45, glow(0xffd27a, 2.4), 0, y + 7.4, 0, pg);
  }

  // ---- bell tower
  {
    const bg = new THREE.Group();
    bg.position.set(-36, 12.4, 6);
    g.add(bg);
    box(12, 1, 12, std(0x4a4846), 0, 0, 0, bg);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) cyl(0.4, 0.45, 6, red, sx * 3.6, 1, sz * 3.6, bg, 10);
    box(9, 0.5, 0.5, darkRed, 0, 6.2, 3.6, bg);
    box(9, 0.5, 0.5, darkRed, 0, 6.2, -3.6, bg);
    const roof = eastRoof(12, 12, 4.6, { top: roofTile });
    roof.position.set(0, 7.0, 0);
    bg.add(roof);
    cyl(1.0, 1.25, 2.5, std(0x2a2620, { metalness: 0.6, roughness: 0.5 }), 0, 3.0, 0, bg, 14);
    box(0.25, 0.25, 5, wood, 0, 6.0, 0, bg);
  }

  // ---- trees
  const mapleCols = [0xd6401f, 0xe8652a, 0xc2281c, 0xf09a35, 0x8a1d18, 0xff5a2e];
  const mapleTrunk: Item[] = [],
    mapleCrown: Item[] = [],
    pineTrunk: Item[] = [],
    pineA: Item[] = [],
    pineB: Item[] = [],
    pineC: Item[] = [];
  const addMaple = (x: number, z: number, s: number, y?: number) => {
    const yy = y ?? T(x, z) - 0.3;
    mapleTrunk.push({ p: [x, yy + 1.6 * s, z], s: [s, s, s] });
    mapleCrown.push({
      p: [x, yy + 4.4 * s, z],
      r: r() * 6,
      s: [3.6 * s, 2.7 * s, 3.6 * s],
      c: mapleCols[Math.floor(r() * mapleCols.length)],
    });
    mapleCrown.push({
      p: [x + 1.3 * s, yy + 3.4 * s, z + 0.8 * s],
      r: r() * 6,
      s: [2.4 * s, 1.9 * s, 2.4 * s],
      c: mapleCols[Math.floor(r() * mapleCols.length)],
    });
  };
  const addPine = (x: number, z: number, s: number) => {
    const yy = T(x, z) - 0.4;
    pineTrunk.push({ p: [x, yy + 2 * s, z], s: [s, s * 1.2, s] });
    pineA.push({ p: [x, yy + 3.2 * s, z], s: s });
    pineB.push({ p: [x, yy + 5.4 * s, z], s: s });
    pineC.push({ p: [x, yy + 7.5 * s, z], s: s });
  };
  for (let i = 0; i < 7; i++) {
    const z = 48 - i * 5.4;
    addMaple(-10.8, z, 1.3, P(z));
    addMaple(10.8, z, 1.3, P(z));
  }
  for (const [x, z] of [
    [-44, 6],
    [44, 4],
    [-46, -16],
    [-28, -36],
    [10, -42],
    [-10, -42],
    [46, -34],
    [-48, 30],
    [50, 34],
    [24, 4],
    [-22, 2],
  ])
    addMaple(x, z, 1.5 + r() * 0.6, x === 24 || x === -22 ? 12.4 : undefined);
  for (let i = 0; i < 170; i++) {
    const x = (r() - 0.5) * 300,
      z = 100 - r() * 200;
    if (Math.abs(x) < 50 && z > -50 && z < 66) continue;
    if (r() < 0.45) addMaple(x, z, 1.6 + r() * 1.4);
    else addPine(x, z, 1.4 + r() * 1.6);
  }
  inst(new THREE.CylinderGeometry(0.28, 0.4, 3.2, 6), std(0x2a1d16), mapleTrunk, g);
  inst(
    new THREE.IcosahedronGeometry(1, 1),
    std(0xffffff, { emissive: 0x2a0a02, emissiveIntensity: 0.45 }),
    mapleCrown,
    g
  );
  const pineMat = std(0x12301f);
  inst(new THREE.CylinderGeometry(0.22, 0.32, 4, 6), std(0x231812), pineTrunk, g);
  inst(new THREE.ConeGeometry(2.8, 4.2, 7).translate(0, 2, 0), pineMat, pineA, g);
  inst(new THREE.ConeGeometry(2.2, 3.8, 7).translate(0, 1.9, 0), pineMat, pineB, g);
  inst(new THREE.ConeGeometry(1.4, 3.2, 7).translate(0, 1.6, 0), pineMat, pineC, g);

  // ---- backdrop
  ringMountains(g, {
    n: 46,
    rMin: 170,
    rMax: 290,
    hMin: 50,
    hMax: 120,
    wMin: 50,
    wMax: 110,
    low: 0x0a1513,
    high: 0x1c2b2a,
    seed: 5,
    maxZ: 10,
  });

  // ---- distant lantern fireflies along the road
  const flick = [lampMat, fire.material as THREE.MeshStandardMaterial, shoji];
  const base = flick.map((m) => (m as THREE.MeshStandardMaterial).emissiveIntensity);

  enableShadows(g);
  terrain.castShadow = false;

  return {
    group: g,
    a: { pos: [-30, 9, 88], look: [0, 14, 30] },
    b: { pos: [-16, 15.5, 38], look: [6, 23, -14] },
    hero: [
      { pos: [-92, 74, 205], look: [10, 62, -80] },
      { pos: [-50, 42, 140], look: [6, 34, -24] },
    ],
    anchors: [
      { pos: [0, 15, 42], color: 0xff9448, intensity: 420, distance: 90 },
      { pos: [0, 28, -2], color: 0xffb060, intensity: 380, distance: 80 },
      { pos: [30, 30, -8], color: 0xff8a40, intensity: 260, distance: 70 },
      { pos: [-28, 18, 10], color: 0xff7a3a, intensity: 200, distance: 60 },
    ],
    shadowR: 120,
    update: (t) => {
      flick.forEach((m, i) => {
        (m as THREE.MeshStandardMaterial).emissiveIntensity =
          base[i] * (0.92 + 0.08 * Math.sin(t * 7 + i * 2) + 0.05 * Math.sin(t * 13.3 + i));
      });
    },
  };
}

function goldMat() {
  return gold(0.9);
}
void lerp;
void slab;
void cone;
