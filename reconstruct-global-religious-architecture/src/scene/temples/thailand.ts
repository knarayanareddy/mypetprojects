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
  lathe,
  inst,
  eastRoof,
  rng,
  enableShadows,
  ringMountains,
} from "../helpers";
import { palms } from "../trees";

function prang(scale: number, layers = 14) {
  const g = new THREE.Group();
  const cream = std(0xe9e1cc, { emissive: 0x241e14, emissiveIntensity: 0.6 });
  const teal = std(0x2fa59a, { emissive: 0x0a3a34, emissiveIntensity: 0.6 });
  const pink = std(0xd98aa0, { emissive: 0x3a1420, emissiveIntensity: 0.5 });
  const goldM = gold(0.9);
  const niche = glow(0xffb04a, 1.7);
  let y = 0;
  let w = 13;
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    w = 13 * (1 - 0.8 * Math.pow(t, 0.95));
    const h = 3.3;
    const body = i % 4 === 3 ? pink : cream;
    taper(w, w * 0.92, h, w, w * 0.92, body, 0, y, 0, g);
    box(w + 0.9, 0.5, w + 0.9, i % 3 === 0 ? teal : goldM, 0, y + h, 0, g);
    if (i % 2 === 0 && w > 2.5) {
      for (let k = 0; k < 4; k++) {
        const hold = new THREE.Group();
        hold.rotation.y = (k * Math.PI) / 2;
        box(w * 0.26, h * 0.56, 0.2, niche, 0, y + h * 0.22, w * 0.46 + 0.04, hold);
        g.add(hold);
      }
    }
    y += h + 0.5;
  }
  cone(w * 0.62, 7, cream, 0, y, 0, g, 8);
  cyl(0.16, 0.22, 4, goldM, 0, y + 6, 0, g, 8);
  for (const a of [-0.35, 0, 0.35]) {
    cone(0.22, 2.6, goldM, Math.sin(a) * 1.1, y + 9.6, 0, g, 6).rotation.z = -a;
  }
  ball(0.35, glow(0xffd27a, 3), 0, y + 12.4, 0, g, 8);
  g.scale.setScalar(scale);
  return g;
}

export function buildThailand(): Temple {
  const g = new THREE.Group();
  const r = rng(61);
  const stone = std(0x6b6558, { roughness: 0.9 });
  const white = std(0xece4d2, { emissive: 0x241e14, emissiveIntensity: 0.6 });
  const goldM = gold(1.0);
  const redM = std(0xa0231a, { emissive: 0x2a0806, emissiveIntensity: 0.6 });
  const orange = std(0xd9541e, { roughness: 0.4, metalness: 0.15, emissive: 0x3a1004, emissiveIntensity: 0.7, flatShading: false });
  const green = std(0x1d7a55, { roughness: 0.4, metalness: 0.15, emissive: 0x06281c, emissiveIntensity: 0.7, flatShading: false });
  const warm = glow(0xffb04a, 1.9);

  // courtyard + river
  box(230, 0.4, 170, std(0x4e493f, { roughness: 1 }), 0, 0, -15, g);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 200),
    new THREE.MeshStandardMaterial({
      color: 0x0a1420,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x0a1830,
      emissiveIntensity: 0.55,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.05, 170);
  water.userData.noShadow = true;
  g.add(water);
  box(230, 1.2, 4, stone, 0, 0, 71, g);

  // central prang
  const pg = new THREE.Group();
  pg.position.set(0, 0, -18);
  g.add(pg);
  taper(46, 44, 3.4, 46, 44, white, 0, 0.3, 0, pg);
  taper(38, 36, 3.4, 38, 36, white, 0, 3.7, 0, pg);
  taper(30, 28, 3.4, 30, 28, white, 0, 7.1, 0, pg);
  box(47, 0.5, 47, goldM, 0, 3.6, 0, pg);
  box(39, 0.5, 39, goldM, 0, 7.0, 0, pg);
  const main = prang(1, 14);
  main.position.y = 10.5;
  pg.add(main);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const p = prang(0.42, 11);
      p.position.set(sx * 17, 7.1, sz * 17);
      pg.add(p);
    }
  // steep stairways on four sides
  for (let q = 0; q < 4; q++) {
    const hold = new THREE.Group();
    hold.rotation.y = (q * Math.PI) / 2;
    pg.add(hold);
    for (let s = 0; s < 22; s++) {
      const top = 0.3 + (s + 1) * 0.47;
      box(9, top - 0.3, 0.66, white, 0, 0.3, 11 - s * 0.64 - 0.32 + 0, hold);
    }
    box(9.6, 0.4, 0.4, goldM, 0, 10.5, -3.2, hold);
  }

  // ubosot (ordination hall)
  {
    const ug = new THREE.Group();
    ug.position.set(-60, 0, 24);
    g.add(ug);
    box(42, 1.6, 24, stone, 0, 0.3, 0, ug);
    box(31, 9, 14, white, 0, 1.9, 0, ug);
    box(31.6, 0.7, 14.6, goldM, 0, 4.2, 0, ug);
    box(31.6, 0.7, 14.6, goldM, 0, 10.0, 0, ug);
    for (let i = 0; i < 4; i++) box(2.6, 4.4, 0.25, warm, -10.2 + i * 6.8, 3.4, 7.05, ug);
    box(4.4, 6.6, 0.3, glow(0xffc870, 2.2), 0, 2.0, 7.1, ug);
    const cols: Item[] = [],
      caps: Item[] = [];
    for (let i = 0; i < 7; i++) {
      cols.push({ p: [-18 + i * 6, 1.9 + 4.6, 9.4] });
      caps.push({ p: [-18 + i * 6, 1.9 + 9.2, 9.4] });
    }
    inst(new THREE.CylinderGeometry(0.62, 0.7, 9.2, 10), redM, cols, ug);
    inst(new THREE.BoxGeometry(1.6, 0.7, 1.6), goldM, caps, ug);
    const defs: [number, number, number, number, THREE.Material][] = [
      [40, 22, 6.2, 11.0, orange],
      [32, 15, 5.6, 14.6, green],
      [23, 8.4, 4.8, 18.2, orange],
    ];
    defs.forEach(([w, d, h, y, m]) => {
      const rf = eastRoof(w, d, h, { top: m, curve: 1.3, up: 1.2, under: std(0x5a2a14, { side: THREE.BackSide }) });
      rf.position.set(0, y, 0);
      ug.add(rf);
      for (const sx of [-1, 1]) {
        const c = cone(0.4, 4.2, goldM, sx * (w / 2 - 0.1), y + 0.5, 0, ug, 6);
        c.rotation.z = -sx * 0.55;
        const c2 = cone(0.3, 3.2, goldM, sx * (w / 2 - 0.1), y + 0.5, (d / 2) * 0.96, ug, 6);
        c2.rotation.z = -sx * 0.45;
        const c3 = cone(0.3, 3.2, goldM, sx * (w / 2 - 0.1), y + 0.5, -(d / 2) * 0.96, ug, 6);
        c3.rotation.z = -sx * 0.45;
      }
    });
  }

  // golden chedi
  {
    const cg = new THREE.Group();
    cg.position.set(56, 0, 6);
    g.add(cg);
    box(36, 1.2, 36, stone, 0, 0.3, 0, cg);
    cyl(14.2, 15, 1.8, white, 0, 1.5, 0, cg, 8);
    cyl(12.4, 13.2, 1.8, goldM, 0, 3.3, 0, cg, 8);
    cyl(10.6, 11.4, 1.8, white, 0, 5.1, 0, cg, 8);
    const pts: [number, number][] = [
      [0.01, 0],
      [7.8, 0],
      [7.6, 1.2],
      [6.8, 3.4],
      [5.4, 6.0],
      [3.8, 8.6],
      [2.8, 10.4],
      [2.3, 12],
      [0.01, 12],
    ];
    lathe(pts, goldM, 0, 6.9, 0, cg, 32);
    for (let i = 0; i < 9; i++) cyl(2.3 - i * 0.14, 2.4 - i * 0.14, 0.55, goldM, 0, 18.9 + i * 0.55, 0, cg, 12);
    cone(1.0, 11, goldM, 0, 23.8, 0, cg, 10);
    ball(0.45, glow(0xffd27a, 3), 0, 35.3, 0, cg, 8);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      cone(1.0, 7, goldM, Math.cos(a) * 13.5, 6.9, Math.sin(a) * 13.5, cg, 8);
    }
  }

  // floating lanterns (khom loi)
  const N = 150;
  const lanternGeo = new THREE.CylinderGeometry(0.5, 0.65, 1.1, 8);
  const lanternMat = glow(0xff9a30, 3.4);
  const lanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, N);
  lanterns.frustumCulled = false;
  lanterns.userData.noShadow = true;
  const ld = Array.from({ length: N }, () => ({
    x: (r() - 0.5) * 300,
    z: -60 + r() * 200,
    y: r() * 140,
    sp: 1.0 + r() * 1.5,
    ph: r() * 6.28,
    s: 0.8 + r() * 0.8,
  }));
  g.add(lanterns);

  // krathongs on the river
  const kra: Item[] = [],
    kraFlame: Item[] = [];
  for (let i = 0; i < 90; i++) {
    const x = (r() - 0.5) * 240,
      z = 76 + r() * 110;
    kra.push({ p: [x, 0.25, z], r: r() * 6, s: 0.8 + r() * 0.6 });
    kraFlame.push({ p: [x, 0.95, z], s: [1, 1.8, 1] });
  }
  inst(new THREE.CylinderGeometry(1.1, 0.9, 0.5, 8), std(0x5f8a3a), kra, g);
  const kf = inst(new THREE.SphereGeometry(0.22, 6, 5), glow(0xffb347, 4.4), kraFlame, g);
  kf.castShadow = false;

  // trees
  const spots = [];
  for (let i = 0; i < 26; i++) {
    const x = (r() - 0.5) * 220,
      z = -70 + r() * 135;
    if (Math.abs(x) < 34 && z > -50 && z < 20) continue;
    if (Math.abs(x + 60) < 28 && Math.abs(z - 24) < 16) continue;
    if (Math.abs(x - 56) < 24 && Math.abs(z - 6) < 22) continue;
    spots.push({ x, z, y: 0.3 });
  }
  palms(g, spots, 9, 0x24512b, 0x5f5140, 9);
  const fTrunk: Item[] = [],
    fCrown: Item[] = [];
  for (let i = 0; i < 28; i++) {
    const x = (r() - 0.5) * 240,
      z = -80 + r() * 140;
    if (Math.abs(x) < 36 && z > -56 && z < 22) continue;
    if (Math.abs(x + 60) < 30 && Math.abs(z - 24) < 18) continue;
    if (Math.abs(x - 56) < 26 && Math.abs(z - 6) < 24) continue;
    const s = 1 + r() * 0.8;
    fTrunk.push({ p: [x, 1.6 * s, z], s: [s, s, s] });
    fCrown.push({ p: [x, 4.4 * s, z], r: r() * 6, s: [4 * s, 2.2 * s, 4 * s], c: r() < 0.4 ? 0x3f7a3a : 0x2c5a30 });
  }
  inst(new THREE.CylinderGeometry(0.3, 0.45, 3.2, 6), std(0x4a3a2c), fTrunk, g);
  inst(new THREE.IcosahedronGeometry(1, 1), std(0xffffff, { emissive: 0x0a1a08, emissiveIntensity: 0.5 }), fCrown, g);

  ringMountains(g, {
    n: 14,
    rMin: 260,
    rMax: 340,
    hMin: 16,
    hMax: 38,
    wMin: 90,
    wMax: 160,
    low: 0x0c1610,
    high: 0x1c2a1f,
    seed: 41,
    maxZ: -10,
  });

  enableShadows(g);
  lanterns.castShadow = false;
  water.castShadow = false;
  kf.castShadow = false;

  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    p = new THREE.Vector3(),
    s3 = new THREE.Vector3();
  const setLanterns = (t: number) => {
    for (let i = 0; i < N; i++) {
      const d = ld[i];
      const y = 2 + ((d.y + t * d.sp) % 140);
      p.set(d.x + Math.sin(t * 0.25 + d.ph) * 4, y, d.z + Math.cos(t * 0.2 + d.ph) * 3);
      s3.setScalar(d.s);
      m4.compose(p, q, s3);
      lanterns.setMatrixAt(i, m4);
    }
    lanterns.instanceMatrix.needsUpdate = true;
  };
  setLanterns(0);
  const kfMat = kf.material as THREE.MeshStandardMaterial;

  return {
    group: g,
    a: { pos: [-42, 14, 152], look: [0, 34, -12] },
    b: { pos: [26, 18, 88], look: [-2, 38, -10] },
    anchors: [
      { pos: [0, 14, 14], color: 0xffc070, intensity: 900, distance: 110 },
      { pos: [-60, 12, 40], color: 0xffa040, intensity: 560, distance: 90 },
      { pos: [56, 14, 24], color: 0xffd080, intensity: 560, distance: 90 },
      { pos: [0, 6, 84], color: 0xff9a30, intensity: 320, distance: 80 },
    ],
    shadowR: 120,
    update: (t) => {
      setLanterns(t);
      kfMat.emissiveIntensity = 4.2 + Math.sin(t * 8) * 0.5;
    },
  };
}
