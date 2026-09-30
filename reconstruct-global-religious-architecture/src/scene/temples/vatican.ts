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
  taper,
  inst,
  rng,
  enableShadows,
  windowTex,
} from "../helpers";

function domeProfile(R: number, H: number, n = 18): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const phi = (i / n) * (Math.PI / 2);
    pts.push([Math.max(0.01, R * Math.cos(phi) * (1 - 0.04 * Math.sin(phi))), H * Math.pow(Math.sin(phi), 0.92)]);
  }
  return pts;
}

export function buildVatican(): Temple {
  const g = new THREE.Group();
  const r = rng(81);
  const trav = std(0xdccfb4, { emissive: 0x2b1d10, emissiveIntensity: 0.9, roughness: 0.8 });
  const travDark = std(0xc2b498, { emissive: 0x24180c, emissiveIntensity: 0.8 });
  const lead = std(0x6b7785, { roughness: 0.45, metalness: 0.35, emissive: 0x10151c, emissiveIntensity: 0.8, flatShading: false, side: THREE.DoubleSide });
  const goldM = gold(1.0);
  const warm = glow(0xffc070, 1.8);

  // paving
  box(340, 0.2, 300, std(0x2e2c2b, { roughness: 1 }), 0, -0.05, 10, g);
  const C: [number, number] = [0, 18];
  const rx = 84,
    rz = 60;
  const oval = new THREE.Mesh(
    new THREE.CircleGeometry(1, 72),
    std(0x43403c, { roughness: 0.95, flatShading: false })
  );
  oval.rotation.x = -Math.PI / 2;
  oval.scale.set(rx * 0.95, rz * 0.95, 1);
  oval.position.set(C[0], 0.08, C[1]);
  oval.userData.noShadow = true;
  g.add(oval);
  // paving lines
  {
    const lp: number[] = [];
    const ring = (s: number) => {
      const n = 90;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU,
          a1 = ((i + 1) / n) * TAU;
        lp.push(C[0] + rx * s * Math.cos(a0), 0.11, C[1] + rz * s * Math.sin(a0), C[0] + rx * s * Math.cos(a1), 0.11, C[1] + rz * s * Math.sin(a1));
      }
    };
    [0.22, 0.4, 0.58, 0.76, 0.93].forEach(ring);
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * TAU;
      lp.push(C[0] + rx * 0.22 * Math.cos(a), 0.11, C[1] + rz * 0.22 * Math.sin(a), C[0] + rx * 0.93 * Math.cos(a), 0.11, C[1] + rz * 0.93 * Math.sin(a));
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    const ls = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x8a7e6c, transparent: true, opacity: 0.55 }));
    ls.frustumCulled = false;
    ls.userData.noShadow = true;
    g.add(ls);
  }

  // ---- basilica body
  box(100, 44, 14, trav, 0, 0, -47, g); // facade block
  for (let k = 0; k < 5; k++) box(108, 0.4 * (5 - k), 1.5, travDark, 0, 0, -39.3 + k * 1.5, g);
  const cols: Item[] = [],
    capsI: Item[] = [];
  for (let i = 0; i < 9; i++) {
    const x = -44 + i * 11;
    cols.push({ p: [x, 2, -38.6] });
    capsI.push({ p: [x, 34, -38.6] });
  }
  const colGeo = new THREE.CylinderGeometry(1.9, 2.1, 32, 14);
  colGeo.translate(0, 16, 0);
  inst(colGeo, trav, cols, g);
  const capGeo = new THREE.BoxGeometry(4.8, 1.6, 4.8);
  capGeo.translate(0, 0.8, 0);
  inst(capGeo, travDark, capsI, g);
  const baseGeo = new THREE.BoxGeometry(4.8, 2, 4.8);
  inst(baseGeo, travDark, cols.map((c) => ({ p: [c.p[0], 1, c.p[2]] as [number, number, number] })), g);
  box(100, 4.4, 16, travDark, 0, 35.6, -46, g);
  box(100, 8, 13, trav, 0, 40, -47.5, g);
  box(101, 1, 14, travDark, 0, 48, -47.5, g);
  // portals
  for (let i = 0; i < 5; i++) {
    const gx = -22 + i * 11;
    box(6, 11, 0.4, glow(0xffc070, 1.6), gx, 2.5, -39.9, g);
    box(6.6, 0.6, 0.6, goldM, gx, 13.6, -39.8, g);
  }
  for (let i = 0; i < 4; i++) box(3, 7, 0.4, glow(0xffb060, 1.3), -16.5 + i * 11, 15, -39.9, g);
  // loggia
  box(17, 5, 1.5, std(0x2a2018), 0, 36, -39.4, g);
  box(14, 3.8, 0.4, glow(0xffcf8a, 2.0), 0, 36.5, -38.7, g);
  // statues
  const stat: Item[] = [],
    head: Item[] = [];
  for (let i = 0; i < 13; i++) {
    const x = -45 + i * 7.5;
    const s = i === 6 ? 1.35 : 1;
    stat.push({ p: [x, 49 + 2.3 * s, -40.8], s: [s, s, s] });
    head.push({ p: [x, 49 + 4.8 * s, -40.8], s: s });
  }
  inst(new THREE.CylinderGeometry(0.75, 1.0, 4.6, 7), trav, stat, g);
  inst(new THREE.SphereGeometry(0.62, 8, 6), trav, head, g);

  // nave
  box(84, 50, 100, trav, 0, 0, -104, g);
  box(76, 6, 96, travDark, 0, 50, -102, g);
  const pil: Item[] = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 12; k++) pil.push({ p: [sx * 42.3, 23, -60 - k * 8], s: [1.6, 46, 2.4] });
  inst(new THREE.BoxGeometry(1, 1, 1), travDark, pil, g);
  // nave windows
  const nw: Item[] = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 11; k++) nw.push({ p: [sx * 42.4, 30, -64 - k * 8], s: [0.3, 9, 3] });
  inst(new THREE.BoxGeometry(1, 1, 1), warm, nw, g).castShadow = false;

  // ---- dome
  {
    const dg = new THREE.Group();
    dg.position.set(0, 56, -98);
    g.add(dg);
    cyl(23.4, 24, 22, trav, 0, -2, 0, dg, 40);
    const win: Item[] = [],
      dcol: Item[] = [];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU;
      win.push({ p: [Math.cos(a) * 23.6, 8, Math.sin(a) * 23.6], r: Math.PI / 2 - a, s: [2.8, 9, 0.6] });
      for (const off of [-0.095, 0.095]) {
        const b = a + off;
        dcol.push({ p: [Math.cos(b) * 24.2, 2, Math.sin(b) * 24.2] });
      }
    }
    inst(new THREE.BoxGeometry(1, 1, 1), warm, win, dg).castShadow = false;
    const dc = new THREE.CylinderGeometry(0.85, 0.95, 15, 8);
    dc.translate(0, 7.5, 0);
    inst(dc, trav, dcol, dg);
    cyl(25.6, 25.6, 2.2, travDark, 0, 18, 0, dg, 40);
    cyl(22.6, 23, 4, trav, 0, 20.2, 0, dg, 40);
    const pts = domeProfile(21.2, 31);
    const dome = new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), 48), lead);
    dome.position.y = 24.2;
    dg.add(dome);
    // ribs
    const ribGeo = new THREE.LatheGeometry(
      pts.map((p) => new THREE.Vector2(p[0] + 0.5, p[1] + 0.05)),
      2,
      -0.04,
      0.08
    );
    const ribs: Item[] = [];
    for (let k = 0; k < 16; k++) ribs.push({ p: [0, 24.2, 0], r: (k / 16) * TAU });
    inst(ribGeo, std(0xdccfb4, { emissive: 0x2b1d10, emissiveIntensity: 0.9, side: THREE.DoubleSide, flatShading: false }), ribs, dg);
    // dormers
    const dorm: Item[] = [];
    for (let k = 0; k < 16; k++) {
      const a = ((k + 0.5) / 16) * TAU;
      dorm.push({ p: [Math.cos(a) * 19.6, 24.2 + 10.2, Math.sin(a) * 19.6], r: Math.PI / 2 - a, s: [1.6, 2.4, 1.2] });
    }
    inst(new THREE.BoxGeometry(1, 1, 1), warm, dorm, dg).castShadow = false;
    // lantern
    const ly = 24.2 + 31 - 0.6;
    cyl(5.6, 6, 10, trav, 0, ly, 0, dg, 16);
    const lc: Item[] = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      lc.push({ p: [Math.cos(a) * 5.4, ly + 0.5, Math.sin(a) * 5.4] });
    }
    const lcg = new THREE.CylinderGeometry(0.4, 0.45, 8.6, 8);
    lcg.translate(0, 4.3, 0);
    inst(lcg, travDark, lc, dg);
    const lw: Item[] = [];
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) / 8) * TAU;
      lw.push({ p: [Math.cos(a) * 5.65, ly + 4.6, Math.sin(a) * 5.65], r: Math.PI / 2 - a, s: [1.6, 5, 0.3] });
    }
    inst(new THREE.BoxGeometry(1, 1, 1), glow(0xffd9a0, 2.4), lw, dg).castShadow = false;
    cyl(5.8, 5.8, 1, travDark, 0, ly + 9.2, 0, dg, 16);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(4.8, 14, 8, 0, TAU, 0, Math.PI / 2), lead);
    cap.position.y = ly + 10.2;
    dg.add(cap);
    ball(1.3, goldM, 0, ly + 15.4, 0, dg, 14);
    box(0.55, 6.6, 0.55, goldM, 0, ly + 16, 0, dg);
    box(3.2, 0.55, 0.55, goldM, 0, ly + 19.6, 0, dg);
  }
  // secondary domes
  for (const [sx, sz] of [
    [-40, -70],
    [40, -70],
    [-40, -130],
    [40, -130],
  ]) {
    const sg = new THREE.Group();
    sg.position.set(sx, 56, sz);
    g.add(sg);
    cyl(9, 9.4, 7, trav, 0, -2, 0, sg, 24);
    const p2 = domeProfile(8.6, 10.5);
    const d2 = new THREE.Mesh(new THREE.LatheGeometry(p2.map((p) => new THREE.Vector2(p[0], p[1])), 28), lead);
    d2.position.y = 5;
    sg.add(d2);
    cyl(1.6, 1.8, 3, trav, 0, 15, 0, sg, 10);
    cone(1.4, 2.2, lead, 0, 18, 0, sg, 10);
    ball(0.35, goldM, 0, 20.4, 0, sg, 8);
  }

  // ---- colonnade
  const colItems: Item[] = [];
  const beams: Item[] = [];
  const beamTop: Item[] = [];
  const saints: Item[] = [],
    saintHeads: Item[] = [];
  const arms: [number, number][] = [
    [-58, 58],
    [122, 238],
  ];
  const rad = Math.PI / 180;
  const rows = [1.0, 0.93, 0.86, 0.79];
  arms.forEach(([a0, a1]) => {
    for (const s of rows)
      for (let d = a0; d <= a1 + 0.001; d += 1.9) {
        const th = d * rad;
        colItems.push({ p: [C[0] + rx * s * Math.cos(th), 0, C[1] + rz * s * Math.sin(th)] });
      }
    let n = 0;
    for (let d = a0; d <= a1 + 0.001; d += 1.5) {
      const th = d * rad;
      const px = C[0] + rx * 0.895 * Math.cos(th),
        pz = C[1] + rz * 0.895 * Math.sin(th);
      const tx = -rx * Math.sin(th),
        tz = rz * Math.cos(th);
      const ry = Math.atan2(tx, tz);
      beams.push({ p: [px, 14.9, pz], r: ry, s: [19.5, 1.8, 3.0] });
      beamTop.push({ p: [px, 16.4, pz], r: ry, s: [12, 1.2, 3.0] });
      if (n % 2 === 0) {
        const ox = C[0] + rx * 1.02 * Math.cos(th),
          oz = C[1] + rz * 1.02 * Math.sin(th);
        saints.push({ p: [ox, 17.6 + 2.2, oz], s: [1, 1.05, 1] });
        saintHeads.push({ p: [ox, 17.6 + 4.6, oz], s: 1 });
      }
      n++;
    }
  });
  const colG = new THREE.CylinderGeometry(0.8, 0.9, 14, 8);
  colG.translate(0, 7, 0);
  inst(colG, trav, colItems, g);
  const beamGeo = new THREE.BoxGeometry(1, 1, 1);
  beamGeo.translate(0, 0.5, 0);
  inst(beamGeo, travDark, beams, g);
  inst(beamGeo, trav, beamTop, g);
  inst(new THREE.CylinderGeometry(0.55, 0.75, 4.4, 6), trav, saints, g);
  inst(new THREE.SphereGeometry(0.55, 7, 5), trav, saintHeads, g);

  // ---- obelisk + fountains
  {
    const og = new THREE.Group();
    og.position.set(C[0], 0, C[1]);
    g.add(og);
    const gran = std(0x8a6a5e, { roughness: 0.6 });
    box(10, 0.6, 10, travDark, 0, 0.1, 0, og);
    box(8, 0.6, 8, trav, 0, 0.7, 0, og);
    box(5.2, 3.2, 5.2, trav, 0, 1.3, 0, og);
    taper(3.6, 2.4, 25, 3.6, 2.4, gran, 0, 4.5, 0, og);
    cone(1.7, 3, gran, 0, 29.5, 0, og, 4).rotation.y = Math.PI / 4;
    ball(0.5, goldM, 0, 32.8, 0, og, 8);
    box(0.25, 1.8, 0.25, goldM, 0, 33, 0, og);
    box(1.0, 0.25, 0.25, goldM, 0, 34.0, 0, og);
    for (const sx of [-1, 1]) {
      const f = new THREE.Group();
      f.position.set(sx * 32, 0, 0);
      og.add(f);
      cyl(6.2, 6.6, 1.3, trav, 0, 0.1, 0, f, 28);
      const wm = new THREE.Mesh(new THREE.CircleGeometry(5.6, 28), new THREE.MeshStandardMaterial({ color: 0x0a1a2a, emissive: 0x16304a, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.5 }));
      wm.rotation.x = -Math.PI / 2;
      wm.position.y = 1.35;
      wm.userData.noShadow = true;
      f.add(wm);
      cyl(0.7, 1.2, 4.6, trav, 0, 1.4, 0, f, 12);
      cyl(3.0, 1.4, 0.9, trav, 0, 4.6, 0, f, 16);
      cyl(0.9, 1.0, 1.8, trav, 0, 5.4, 0, f, 10);
      cyl(1.8, 0.9, 0.6, trav, 0, 7.0, 0, f, 12);
      cyl(0.25, 0.4, 5, glow(0xa8d4ff, 1.2), 0, 7.4, 0, f, 8);
    }
  }

  // lamps
  const lampPost: Item[] = [],
    lampBall: Item[] = [];
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * TAU;
    const x = C[0] + rx * 0.7 * Math.cos(a),
      z = C[1] + rz * 0.7 * Math.sin(a);
    lampPost.push({ p: [x, 2.3, z] });
    lampBall.push({ p: [x, 4.9, z] });
  }
  inst(new THREE.CylinderGeometry(0.12, 0.2, 4.6, 6), std(0x1a1816), lampPost, g);
  inst(new THREE.SphereGeometry(0.5, 8, 6), glow(0xffc070, 3), lampBall, g).castShadow = false;

  // crowd
  const crowd: Item[] = [];
  for (let i = 0; i < 420; i++) {
    const a = r() * TAU,
      s = Math.sqrt(r()) * 0.74;
    const x = C[0] + rx * s * Math.cos(a),
      z = C[1] + rz * s * Math.sin(a);
    if (Math.hypot(x - C[0], z - C[1]) < 7) continue;
    if (Math.abs(Math.abs(x - C[0]) - 32) < 7 && Math.abs(z - C[1]) < 7) continue;
    crowd.push({ p: [x, 0.85, z], s: [1, 0.8 + r() * 0.3, 1], c: [0x1a1a20, 0x3a3030, 0x50463a, 0x262a36][Math.floor(r() * 4)] });
  }
  inst(new THREE.CylinderGeometry(0.3, 0.38, 1.7, 6), std(0xffffff), crowd, g);

  // skyline of Rome
  const tex = windowTex(6, 10, 7, 0.4);
  const cityMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    flatShading: true,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 1.3,
  });
  const bl: Item[] = [];
  const tones = [0xb08a5a, 0xa8714a, 0x9a8468, 0xbfa078, 0x8a6a52];
  for (let i = 0; i < 80; i++) {
    const side = r() < 0.5 ? -1 : 1;
    const x = side * (118 + r() * 110),
      z = -150 + r() * 290;
    if (z < -60 && Math.abs(x) < 130) continue;
    const w = 12 + r() * 14,
      h = 16 + r() * 22,
      d = 12 + r() * 14;
    bl.push({ p: [x, h / 2, z], r: (r() - 0.5) * 0.5, s: [w, h, d], c: tones[Math.floor(r() * tones.length)] });
  }
  for (let i = 0; i < 26; i++) {
    const x = (r() - 0.5) * 120,
      z = 120 + r() * 120;
    const w = 12 + r() * 14,
      h = 16 + r() * 22,
      d = 12 + r() * 14;
    if (Math.abs(x) < 38 && z < 150) continue;
    bl.push({ p: [x, h / 2, z], r: (r() - 0.5) * 0.5, s: [w, h, d], c: tones[Math.floor(r() * tones.length)] });
  }
  bl.push({ p: [82, 17, -100], s: [46, 34, 96], c: 0xc09a6a });
  inst(new THREE.BoxGeometry(1, 1, 1), cityMat, bl, g);
  // umbrella pines
  const pT: Item[] = [],
    pC: Item[] = [];
  for (let i = 0; i < 34; i++) {
    const x = (r() - 0.5) * 340,
      z = -80 + r() * 260;
    if (Math.abs(x) < 112 && z > -150 && z < 100) continue;
    const s = 0.9 + r() * 0.7;
    pT.push({ p: [x, 6 * s, z], s: [s, s, s] });
    pC.push({ p: [x, 13.5 * s, z], s: [6.5 * s, 2.8 * s, 6.5 * s], c: r() < 0.5 ? 0x1f3a26 : 0x274a2c });
  }
  inst(new THREE.CylinderGeometry(0.4, 0.6, 12, 6), std(0x3a2a20), pT, g);
  inst(new THREE.IcosahedronGeometry(1, 1), std(0xffffff), pC, g);

  enableShadows(g);
  oval.castShadow = false;

  return {
    group: g,
    a: { pos: [-98, 44, 204], look: [0, 54, -60] },
    b: { pos: [-36, 27, 100], look: [0, 66, -72] },
    anchors: [
      { pos: [0, 22, -24], color: 0xffd09a, intensity: 1100, distance: 130 },
      { pos: [0, 90, -70], color: 0xffe0b0, intensity: 800, distance: 140 },
      { pos: [0, 10, 34], color: 0xffc07a, intensity: 520, distance: 100 },
      { pos: [0, 3, 18], color: 0xffb060, intensity: 360, distance: 60 },
    ],
    shadowR: 170,
  };
}
