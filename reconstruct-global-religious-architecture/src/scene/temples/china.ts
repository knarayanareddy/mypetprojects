import * as THREE from "three";
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
  torus,
  lathe,
  inst,
  eastRoof,
  ringMountains,
  rng,
  enableShadows,
} from "../helpers";

/** Round conical roof tier with concave profile and upturned eave. */
function roundRoof(R: number, H: number, mat: THREE.Material, under: THREE.Material) {
  const g = new THREE.Group();
  const pts: [number, number][] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 0 apex -> 1 eave
    pts.push([R * t, H * Math.pow(1 - t, 1.8) + 0.9 * Math.pow(t, 12)]);
  }
  const top = lathe(pts, mat, 0, 0, 0, g, 48);
  (top.material as THREE.Material).side = THREE.DoubleSide;
  (top.material as THREE.Material).shadowSide = THREE.DoubleSide;
  const under1 = new THREE.Mesh(new THREE.CircleGeometry(R * 0.98, 48), under);
  under1.rotation.x = Math.PI / 2;
  under1.position.y = 0.05;
  g.add(under1);
  return g;
}

export function buildChina(): Temple {
  const g = new THREE.Group();
  const r = rng(33);

  const marble = std(0xd9d4c8, { roughness: 0.6, emissive: 0x1a1812, emissiveIntensity: 0.5 });
  const marbleDark = std(0xbbb5a8, { roughness: 0.7 });
  const red = std(0x9a1d16, { roughness: 0.55, emissive: 0x2c0806, emissiveIntensity: 0.6 });
  const darkRed = std(0x6e140f);
  const blueTile = std(0x1b54b0, {
    roughness: 0.3,
    metalness: 0.25,
    emissive: 0x0a2a66,
    emissiveIntensity: 0.55,
    flatShading: false,
  });
  const goldM = gold(0.9);
  const yellowTile = std(0xd9a82a, { roughness: 0.4, metalness: 0.2, emissive: 0x4a3208, emissiveIntensity: 0.6, flatShading: false });
  const lamp = glow(0xff3a1c, 2.8);
  const warm = glow(0xffa84a, 1.8);

  // courtyard paving
  const paving = box(150, 0.3, 150, std(0x3a3a38, { roughness: 1 }), 0, -0.02, 0, g);
  paving.userData.noShadow = false;

  // three-tier circular platform
  const tiers = [
    { R: 31, h: 3.2 },
    { R: 25.5, h: 3.2 },
    { R: 20, h: 3.2 },
  ];
  let y = 0.25;
  const postsAll: Item[] = [];
  tiers.forEach((t, i) => {
    cyl(t.R, t.R + 0.6, t.h, i === 1 ? marbleDark : marble, 0, y, 0, g, 72);
    cyl(t.R + 0.25, t.R + 0.25, 0.3, marble, 0, y + t.h, 0, g, 72);
    const topY = y + t.h + 0.3;
    const n = 64;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      postsAll.push({ p: [Math.cos(a) * (t.R - 0.3), topY + 0.6, Math.sin(a) * (t.R - 0.3)] });
    }
    const rail = torus(t.R - 0.3, 0.16, marble, 0, topY + 1.1, 0, g, 96);
    rail.scale.set(1, 1, 1);
    y += t.h;
  });
  inst(new THREE.BoxGeometry(0.32, 1.2, 0.32), marble, postsAll, g);
  // axis stairways
  for (let q = 0; q < 4; q++) {
    const hold = new THREE.Group();
    hold.rotation.y = (q * Math.PI) / 2;
    g.add(hold);
    let yy = 0.25;
    tiers.forEach((t) => {
      for (let s = 0; s < 9; s++) {
        const top = yy + ((s + 1) * t.h) / 9;
        box(9, top - yy, 0.9, marble, 0, yy, t.R + 4.2 - s * 0.85, hold);
      }
      box(2.6, 0.12, 8, std(0xc2bcae), 0, yy + t.h + 0.02, t.R + 0.2 - 3.6, hold);
      yy += t.h;
    });
  }
  const floorY = y + 0.3; // 9.85

  // hall body
  cyl(12.2, 12.2, 7.2, red, 0, floorY, 0, g, 40);
  const glowRing = cyl(12.3, 12.3, 3.4, warm, 0, floorY + 1.8, 0, g, 40);
  glowRing.userData.noShadow = true;
  // columns ring
  const cols: Item[] = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    cols.push({ p: [Math.cos(a) * 13.6, floorY + 3.6, Math.sin(a) * 13.6] });
  }
  inst(new THREE.CylinderGeometry(0.62, 0.7, 7.2, 10), red, cols, g);
  const colsCap: Item[] = cols.map((c) => ({ p: [c.p[0], c.p[1] + 3.75, c.p[2]] }));
  inst(new THREE.CylinderGeometry(0.85, 0.7, 0.6, 10), goldM, colsCap, g);
  torus(13.6, 0.35, darkRed, 0, floorY + 7.6, 0, g, 72);
  torus(13.6, 0.22, goldM, 0, floorY + 7.2, 0, g, 72);

  // three roofs
  const r1 = roundRoof(19.5, 5.2, blueTile, std(0x4a2a18, { side: THREE.DoubleSide }));
  r1.position.y = floorY + 7.3;
  g.add(r1);
  cyl(10.8, 10.8, 4.2, red, 0, floorY + 7.2, 0, g, 36);
  torus(10.9, 0.4, goldM, 0, floorY + 10.6, 0, g, 60);
  const r2 = roundRoof(15.0, 4.6, blueTile, std(0x4a2a18, { side: THREE.DoubleSide }));
  r2.position.y = floorY + 11.6;
  g.add(r2);
  cyl(8.4, 8.4, 3.8, darkRed, 0, floorY + 11.5, 0, g, 32);
  const gl2 = cyl(8.5, 8.5, 1.4, warm, 0, floorY + 12.4, 0, g, 32);
  gl2.userData.noShadow = true;
  torus(8.5, 0.35, goldM, 0, floorY + 14.9, 0, g, 52);
  const r3 = roundRoof(11.4, 4.4, blueTile, std(0x4a2a18, { side: THREE.DoubleSide }));
  r3.position.y = floorY + 15.4;
  g.add(r3);
  // finial
  cyl(1.6, 2.0, 1.2, goldM, 0, floorY + 19.3, 0, g, 16);
  ball(2.2, goldM, 0, floorY + 21.4, 0, g, 18);
  cone(0.6, 4.2, goldM, 0, floorY + 23.4, 0, g, 10);
  ball(0.7, glow(0xffd27a, 3), 0, floorY + 27.8, 0, g, 10);

  // courtyard walls with gate gap
  const wallH = 6.2;
  const wall = (x: number, z: number, w: number, d: number) => {
    box(w, wallH, d, std(0x8a1a14, { emissive: 0x200603, emissiveIntensity: 0.5 }), x, 0, z, g);
    box(w + 0.8, 0.9, d + 1.0, yellowTile, x, wallH, z, g);
  };
  wall(-37.5, 55, 55, 1.6);
  wall(37.5, 55, 55, 1.6);
  wall(0, -55, 110, 1.6);
  wall(-55, 0, 1.6, 110);
  wall(55, 0, 1.6, 110);
  // gate house
  {
    const gz = 55;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.7, 0.75, 7, red, sx * 6, 0, gz + sz * 3.2, g, 10);
    box(14, 1.2, 8, darkRed, 0, 7, gz, g);
    const roof = eastRoof(20, 12, 4.4, { top: yellowTile, curve: 1.6, up: 0.6 });
    roof.position.set(0, 8.2, gz);
    g.add(roof);
    box(9, 0.9, 0.3, glow(0xffc24a, 1.6), 0, 6.0, gz + 3.5, g);
  }
  // side halls
  for (const sx of [-1, 1]) {
    const hx = sx * 40;
    box(30, 1.2, 14, marbleDark, hx, 0, -8, g);
    box(26, 6, 10, red, hx, 1.2, -8, g);
    for (let i = 0; i < 6; i++) box(2.6, 3.4, 0.3, warm, hx - 10.5 + i * 4.2, 2.2, -2.9, g);
    const roof = eastRoof(34, 18, 5.6, { top: yellowTile, curve: 1.7, up: 0.7 });
    roof.position.set(hx, 7.6, -8);
    g.add(roof);
  }

  // pailou gateway on the approach
  {
    const pz = 88;
    const pg = new THREE.Group();
    pg.position.set(0, 0, pz);
    g.add(pg);
    for (const x of [-9, -3, 3, 9]) {
      cyl(0.6, 0.7, 11, red, x, 0, 0, pg, 10);
      box(1.6, 1.4, 1.6, marble, x, 0, 0, pg);
    }
    box(20.5, 1.1, 1.2, darkRed, 0, 8.2, 0, pg);
    box(13, 1.0, 1.0, darkRed, 0, 10.2, 0, pg);
    box(4.2, 2.0, 0.3, glow(0xffc24a, 1.6), 0, 8.8, 0.7, pg);
    for (const x of [-6, 0, 6]) {
      const rf = eastRoof(x === 0 ? 7 : 5.8, 3.6, x === 0 ? 2.6 : 2.0, { top: blueTile, curve: 1.5, up: 0.4 });
      rf.position.set(x, x === 0 ? 11.2 : 9.4, 0);
      pg.add(rf);
    }
    for (const x of [-9, 9]) {
      const rf = eastRoof(3.6, 3.2, 1.8, { top: blueTile, curve: 1.5, up: 0.3 });
      rf.position.set(x, 11.0, 0);
      pg.add(rf);
    }
  }

  // imperial way
  box(14, 0.4, 62, std(0x55524d), 0, 0.12, 62, g);
  box(3.4, 0.45, 62, std(0x8c877c), 0, 0.14, 62, g);

  // lantern strings
  const redLamps: Item[] = [];
  const poles: Item[] = [];
  for (let i = 0; i < 8; i++) {
    const z = 98 - i * 7.5;
    for (const sx of [-1, 1]) poles.push({ p: [sx * 9.5, 3.5, z], s: 1 });
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      redLamps.push({ p: [-9.5 + 19 * t, 7.0 - Math.sin(t * Math.PI) * 1.3 - 0.6, z], s: [0.95, 1.15, 0.95] });
    }
  }
  inst(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), std(0x2a1a14), poles, g);
  const lampsMesh = inst(new THREE.SphereGeometry(0.62, 10, 8), lamp, redLamps, g);
  lampsMesh.castShadow = false;
  // lanterns along the terrace rails
  const railLamps: Item[] = [];
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * TAU;
    railLamps.push({ p: [Math.cos(a) * 25.2, 6.4 + 3.2 + 1.9, Math.sin(a) * 25.2], s: 0.7 });
  }
  void railLamps;

  // cypresses
  const cyTrunk: Item[] = [],
    cyCrown: Item[] = [];
  for (let i = 0; i < 120; i++) {
    let x = (r() - 0.5) * 240,
      z = 110 - r() * 240;
    if (Math.abs(x) < 34 && Math.abs(z) < 34) continue;
    if (Math.abs(x) < 12 && z > 40) continue;
    if (Math.abs(x) < 50 && z > 40 && z < 60) continue;
    if (Math.abs(x) < 52 && Math.abs(z - 55) < 4) continue;
    if (Math.abs(x) < 50 && Math.abs(z + 8) < 12 && Math.abs(Math.abs(x) - 40) < 18) continue;
    if (Math.abs(x) > 50 && Math.abs(x) < 58) x += 10;
    const s = 1.4 + r() * 1.3;
    cyTrunk.push({ p: [x, 1.5 * s, z], s: [s, s, s] });
    cyCrown.push({ p: [x, 6 * s, z], r: r() * 6, s: [2.4 * s, 6.2 * s, 2.4 * s] });
  }
  inst(new THREE.CylinderGeometry(0.3, 0.45, 3, 6), std(0x2a1d14), cyTrunk, g);
  const cg = new THREE.IcosahedronGeometry(1, 1);
  inst(cg, std(0x12291d), cyCrown, g);

  ringMountains(g, {
    n: 26,
    rMin: 200,
    rMax: 320,
    hMin: 35,
    hMax: 90,
    wMin: 40,
    wMax: 90,
    low: 0x0a1614,
    high: 0x1c3a36,
    seed: 17,
    maxZ: 20,
  });

  enableShadows(g);
  lampsMesh.castShadow = false;
  glowRing.castShadow = false;
  gl2.castShadow = false;

  return {
    group: g,
    a: { pos: [34, 16, 150], look: [0, 20, 0] },
    b: { pos: [16, 26, 78], look: [0, 22, -4] },
    anchors: [
      { pos: [0, 18, 40], color: 0xff6a3a, intensity: 420, distance: 90 },
      { pos: [0, 16, 6], color: 0xffa24a, intensity: 600, distance: 80 },
      { pos: [0, 34, 0], color: 0x6aa0ff, intensity: 360, distance: 70 },
      { pos: [0, 8, 90], color: 0xff3a1c, intensity: 300, distance: 70 },
    ],
    shadowR: 120,
    update: (t) => {
      lamp.emissiveIntensity = 2.6 + Math.sin(t * 1.7) * 0.25;
    },
  };
}
