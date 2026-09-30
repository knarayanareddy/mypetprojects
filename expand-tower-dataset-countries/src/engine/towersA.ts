import { M, T, curve, domeRings, profileRings, ONION } from './helpers';

const DARK = M('none', 0x1e1b19, { rough: 0.9 });
const GOLD = M('none', 0xd9ab3c, { metal: 0.85, rough: 0.32 });
const TAU = Math.PI * 2;

/* ---------------------------------------------------------------- JAPAN */
export function japan(t: T) {
  const stone = M('ashlar', 0x8f8c84, { rough: 0.95, tile: 2.6 });
  const plaster = M('plaster', 0xf4efe3, { tile: 3 });
  const timber = M('wood', 0x2b2622, { tile: 1.5 });
  const kawara = M('tile', 0x50565c, { tile: 1.6, rough: 0.55 });

  // ishigaki: stone base with a concave batter
  t.loft(stone, curve(10, (u) => [u * 5, 6.4 + 3.6 * Math.pow(1 - u, 2.2)]), { sides: 4 });

  let y = 5;
  const levels = [
    { hw: 5.4, h: 2.9 },
    { hw: 4.4, h: 2.6 },
    { hw: 3.4, h: 2.4 },
    { hw: 2.5, h: 2.1 },
  ];
  let apex = 0;
  levels.forEach((L, i) => {
    t.box(plaster, L.hw * 2, L.h, L.hw * 2, 0, y, 0);
    t.box(timber, L.hw * 2 + 0.12, 0.55, L.hw * 2 + 0.12, 0, y, 0);
    t.around(timber, { apothem: L.hw, y: y + L.h * 0.38, w: 0.9, h: 1.0, d: 0.14, per: 3, gap: L.hw * 0.62 });
    const eave = 1.55 - i * 0.12;
    const rh = 1.25 + (i === 3 ? 0.5 : 0);
    t.roof(kawara, { y: y + L.h, w: L.hw, e: eave, h: rh, lift: 0.55 });
    apex = y + L.h + 0.22 + rh;
    y += L.h + 0.75;
  });
  // gilt shachi finials on the ridge
  t.cone(GOLD, 0.2, 1.6, { y: apex - 0.15, sides: 12 });
  t.ball(GOLD, 0.22, 0, apex + 1.35, 0);
}

/* ---------------------------------------------------------------- CHINA */
export function china(t: T) {
  const lacquer = M('plaster', 0xb3261e, { rough: 0.45, tile: 2 });
  const glaze = M('tile', 0x2f8463, { rough: 0.3, tile: 1.4 });
  const marble = M('ashlar', 0xdad4c5, { tile: 2.4 });

  t.loft(marble, [[0, 10.5], [1.0, 10.5]], { sides: 8 });
  t.loft(marble, [[1.0, 9.2], [1.9, 9.2]], { sides: 8 });
  let y = 1.9;
  let topA = 0;
  for (let i = 0; i < 9; i++) {
    const a = 5.0 - i * 0.42;
    const h = 2.3 - i * 0.08;
    t.loft(lacquer, [[y, a], [y + h, a]], { sides: 8 });
    t.around(GOLD, { sides: 8, apothem: a, y: y + h * 0.3, w: 0.6, h: 0.95, d: 0.12, per: 1 });
    t.loft(marble, [[y - 0.02, a + 0.55], [y + 0.16, a + 0.55]], { sides: 8 });
    t.around(lacquer, { sides: 8, apothem: a + 0.5, y: y + 0.16, w: 0.3, h: 0.45, d: 0.1, per: 3, gap: 0.55 });
    t.roof(glaze, { y: y + h, w: a, e: 1.25 - i * 0.04, h: 0.95, lift: 0.6, sides: 8, sub: 4 });
    topA = a;
    y += h + 0.62;
  }
  y -= 0.15;
  t.loft(GOLD, [[y, 0.8], [y + 0.35, 0.8]], { sides: 8 });
  t.cyl(GOLD, 0.22, 2.2, { y: y + 0.3, sides: 12 });
  for (let k = 0; k < 5; k++) t.cyl(GOLD, 0.6 - k * 0.08, 0.14, { y: y + 0.6 + k * 0.32, sides: 16 });
  t.cone(GOLD, 0.28, 1.4, { y: y + 2.4, sides: 12 });
  void topA;
}

/* -------------------------------------------------------------- VIETNAM */
export function vietnam(t: T) {
  const lime = M('plaster', 0xf0e6cd, { tile: 2.2 });
  const orange = M('tile', 0xc9652b, { tile: 1.4, rough: 0.6 });
  const brick = M('brick', 0x9a4b33, { tile: 1.6 });

  t.loft(brick, [[0, 7], [0.7, 7]], { sides: 8 });
  t.loft(brick, [[0.7, 6], [1.5, 6]], { sides: 8 });
  // lotus petals around the base
  t.around(lime, { sides: 8, apothem: 5.9, y: 1.5, w: 1.2, h: 0.5, d: 0.3, per: 3, gap: 1.8 });
  let y = 1.5;
  for (let i = 0; i < 7; i++) {
    const a = 3.6 - i * 0.3;
    const h = 3.1 - i * 0.1;
    t.loft(lime, [[y, a], [y + h, a * 0.97]], { sides: 8 });
    t.around(DARK, { sides: 8, apothem: a, y: y + 0.2, w: 0.9, h: 1.7, d: 0.14, per: 1 });
    t.around(brick, { sides: 8, apothem: a, y: y + h * 0.72, w: 0.6, h: 0.6, d: 0.1, per: 1 });
    t.roof(orange, { y: y + h, w: a, e: 0.6, h: 0.75, lift: 0.3, sides: 8, sub: 4 });
    y += h + 0.4;
  }
  t.cyl(lime, 0.6, 0.8, { y: y - 0.1, sides: 8 });
  t.ball(GOLD, 0.6, 0, y + 0.6, 0);
  t.cone(GOLD, 0.22, 2.2, { y: y + 1.7, sides: 10 });
}

/* ------------------------------------------------------------- THAILAND */
function prang(t: T, x: number, z: number, s: number, yb: number, tiers: number) {
  const white = M('plaster', 0xf4f0e6, { tile: 2 });
  const mosaic = M('scale', 0x3f9aa6, { tile: 1.2, rough: 0.4 });
  const pink = M('plaster', 0xd9748a, { tile: 1.5 });
  let y = yb;
  let a = 0;
  for (let i = 0; i < tiers; i++) {
    a = (3.0 - i * 0.27) * s;
    const h = 1.3 * s;
    t.loft(white, [[y, a], [y + h, a * 0.94]], { sides: 4, x, z });
    t.loft(i % 2 ? pink : mosaic, [[y + h * 0.78, a * 0.955], [y + h * 0.95, a * 0.955]], { sides: 4, x, z });
    t.loft(mosaic, [[y + h, a], [y + h + 0.13 * s, a]], { sides: 4, x, z });
    t.around(DARK, { apothem: a * 0.95, y: y + h * 0.2, w: 0.6 * s, h: 0.75 * s, d: 0.12 * s, per: 1, x, z });
    y += h + 0.13 * s;
  }
  const r0 = a * 0.85;
  t.loft(white, curve(10, (u) => [y + u * 6.2 * s, Math.max(0, r0 * Math.pow(1 - u, 1.35))]), {
    sides: 8,
    smooth: true,
    x,
    z,
  });
  t.cyl(GOLD, 0.06 * s + 0.03, 1.6 * s, { x, z, y: y + 6.1 * s, sides: 8 });
  t.cone(GOLD, 0.25 * s, 1.0 * s, { x, z, y: y + 7.0 * s, sides: 8 });
}

export function thailand(t: T) {
  const platform = M('ashlar', 0xd8d0bd, { tile: 2.6 });
  t.loft(platform, [[0, 11.5], [1.2, 11.5]], { sides: 4 });
  t.loft(platform, [[1.2, 10.2], [2.2, 10.2]], { sides: 4 });
  prang(t, 0, 0, 1, 2.2, 8);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) prang(t, sx * 7.1, sz * 7.1, 0.36, 2.2, 7);
}

/* ---------------------------------------------------------------- INDIA */
export function india(t: T) {
  const sand = M('ashlar', 0xc8b388, { tile: 2.4 });
  const coral = M('plaster', 0xd8855a, { tile: 2.5 });
  const cream = M('plaster', 0xeee0c4, { tile: 2.5 });
  const teal = M('plaster', 0x3a9aa2, { tile: 2 });

  t.box(sand, 17, 1, 11.5);
  t.box(sand, 13.6, 5.6, 8.8, 0, 1, 0);
  // gateway passage
  t.box(DARK, 3.2, 4.2, 0.5, 0, 1, 4.45);
  t.box(DARK, 3.2, 4.2, 0.5, 0, 1, -4.45);
  t.box(teal, 4.0, 0.4, 0.7, 0, 5.2, 4.4);
  t.box(teal, 4.0, 0.4, 0.7, 0, 5.2, -4.4);
  t.box(sand, 14.2, 0.4, 9.4, 0, 6.6, 0);

  let y = 7;
  let w = 12;
  let d = 7.6;
  let h = 2.2;
  for (let i = 0; i < 7; i++) {
    h = 2.2 - i * 0.12;
    t.box(i % 2 ? cream : coral, w, h, d, 0, y, 0);
    // pilasters on the long faces
    const n = Math.max(3, Math.floor(w / 1.4));
    for (let k = 0; k < n; k++) {
      const px = (k - (n - 1) / 2) * (w / n);
      for (const sg of [-1, 1]) {
        t.box(teal, 0.3, h * 0.78, 0.2, px, y + h * 0.1, sg * (d / 2 + 0.05));
      }
    }
    t.box(sand, w + 0.5, 0.25, d + 0.5, 0, y + h, 0);
    // miniature shrines along the cornice
    const m = Math.max(2, Math.floor(w / 1.7));
    for (let k = 0; k < m; k++) {
      const px = (k - (m - 1) / 2) * (w / m);
      for (const sg of [-1, 1]) {
        const zz = sg * (d / 2 + 0.05);
        t.box(cream, 0.7, 0.55, 0.7, px, y + h + 0.25, zz);
        t.cone(GOLD, 0.5, 0.55, { x: px, z: zz, y: y + h + 0.8, sides: 4, smooth: false });
      }
    }
    y += h + 0.25;
    w *= 0.84;
    d *= 0.84;
  }
  // wagon-vault crown (shikhara), with kalasha finials
  const len = w * 1.05;
  t.cyl(coral, d * 0.5, len, { rz: Math.PI / 2, x: len / 2, y: y - 0.05, sx: 0.8, sides: 24 });
  for (let k = -1; k <= 1; k++) {
    const px = k * (len / 2 - 0.5);
    t.ball(GOLD, 0.34, px, y + d * 0.4 - 0.1, 0);
    t.cone(GOLD, 0.16, 0.7, { x: px, y: y + d * 0.4 + 0.5, sides: 10 });
  }
}

/* ------------------------------------------------------------ INDONESIA */
function bell(t: T, spec: ReturnType<typeof M>, x: number, y: number, z: number, r: number) {
  t.loft(
    spec,
    [
      [0, r],
      [r * 0.3, r],
      [r * 0.9, r * 0.86],
      [r * 1.4, r * 0.52],
      [r * 1.72, r * 0.2],
      [r * 1.9, 0],
    ],
    { sides: 14, smooth: true, x, y, z },
  );
}

export function indonesia(t: T) {
  const vol = M('ashlar', 0x7e766b, { tile: 2.6 });
  const vol2 = M('ashlar', 0x8e8678, { tile: 2.6 });
  const moss = M('ashlar', 0x6a6f5a, { tile: 2.6 });

  t.box(vol, 25, 1.2, 25);
  const hws = [11, 9.5, 8.1, 6.9, 5.7];
  let y = 1.2;
  hws.forEach((hw, i) => {
    const h = 1.5;
    t.box(i % 2 ? vol2 : vol, hw * 2, h, hw * 2, 0, y, 0);
    t.box(vol2, hw * 2 + 0.3, 0.2, hw * 2 + 0.3, 0, y + h, 0);
    const n = Math.floor((hw * 2) / 2.3);
    for (let e = 0; e < 4; e++) {
      t.under((e * Math.PI) / 2, () => {
        for (let k = 0; k < n; k++) {
          const px = (k - (n - 1) / 2) * ((hw * 2 - 1.4) / n);
          const zz = hw - 0.55;
          t.box(moss, 0.8, 0.5, 0.8, px, y + h + 0.2, zz);
          bell(t, vol2, px, y + h + 0.7, zz, 0.42);
        }
      });
    }
    y += h + 0.2;
  });
  // four central stairways
  for (let e = 0; e < 4; e++) {
    t.under((e * Math.PI) / 2, () => {
      t.stair(vol2, { w: 3.0, y0: 0, y1: y, zIn: 5.6, zOut: 12.6, n: 26 });
    });
  }
  // three round terraces with perforated stupas
  const rt = [
    { r: 4.4, n: 16 },
    { r: 3.4, n: 12 },
    { r: 2.4, n: 8 },
  ];
  rt.forEach((L) => {
    t.cyl(vol, L.r, 0.7, { y, sides: 40 });
    for (let k = 0; k < L.n; k++) {
      const a = (k / L.n) * TAU;
      bell(t, vol2, Math.cos(a) * (L.r - 0.75), y + 0.7, Math.sin(a) * (L.r - 0.75), 0.6);
      t.around(DARK, {
        apothem: 0.5,
        y: y + 1.0,
        w: 0.22,
        h: 0.3,
        d: 0.06,
        per: 1,
        x: Math.cos(a) * (L.r - 0.75),
        z: Math.sin(a) * (L.r - 0.75),
      });
    }
    y += 0.7;
  });
  bell(t, vol2, 0, y, 0, 1.9);
  t.cone(vol, 0.45, 2.6, { y: y + 3.4, sides: 8 });
  t.ball(GOLD, 0.2, 0, y + 5.9, 0);
}

/* ----------------------------------------------------------- BANGLADESH */
export function bangladesh(t: T) {
  const terra = M('brick', 0xb5573a, { tile: 1.8 });
  const terra2 = M('plaster', 0xc86b46, { tile: 2 });
  const band = M('ashlar', 0xdbb88c, { tile: 2 });

  t.box(band, 15, 1, 15);
  t.box(band, 12.8, 0.8, 12.8, 0, 1, 0);
  let y = 1.8;
  const storeys = [
    { hw: 5.0, h: 4.2, e: 1.1, rh: 2.3, lift: 1.4 },
    { hw: 3.6, h: 3.2, e: 0.95, rh: 2.0, lift: 1.1 },
    { hw: 2.4, h: 2.6, e: 0.8, rh: 1.8, lift: 0.85 },
  ];
  storeys.forEach((S, i) => {
    t.box(terra, S.hw * 2, S.h, S.hw * 2, 0, y, 0);
    t.box(band, S.hw * 2 + 0.25, 0.3, S.hw * 2 + 0.25, 0, y + S.h * 0.55, 0);
    t.box(band, S.hw * 2 + 0.25, 0.3, S.hw * 2 + 0.25, 0, y, 0);
    if (i === 0) {
      t.around(DARK, { apothem: S.hw, y: y + 0.0, w: 1.1, h: 2.4, d: 0.3, per: 3, gap: 2.8 });
      t.around(band, { apothem: S.hw, y: y + S.h * 0.66, w: 1.6, h: 1.1, d: 0.15, per: 3, gap: 2.8 });
    } else {
      t.around(DARK, { apothem: S.hw, y: y + 0.3, w: 0.8, h: 1.8, d: 0.25, per: 3, gap: S.hw * 0.7 });
    }
    t.roof(terra2, { y: y + S.h, w: S.hw, e: S.e, h: S.rh, lift: S.lift, sub: 8, concave: 0.9 });
    // corner turrets (ratna) on the two lower roofs
    if (i < 2) {
      const c = S.hw - 0.6;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const by = y + S.h + 0.25;
          t.box(terra, 1.4, 2.0, 1.4, sx * c, by, sz * c);
          t.box(band, 1.6, 0.2, 1.6, sx * c, by + 1.0, sz * c);
          t.roof(terra2, { y: by + 2.0, w: 0.7, e: 0.35, h: 0.9, lift: 0.35, sub: 6, x: sx * c, z: sz * c, thick: 0.15 });
          t.cone(GOLD, 0.1, 0.5, { x: sx * c, z: sz * c, y: by + 3.1, sides: 8 });
        }
      }
    }
    y += S.h + S.rh * 0.35;
  });
  // crowning shikhara
  t.loft(terra, curve(8, (u) => [y + u * 3.2, 1.3 * (1 - u * 0.5)]), { sides: 4 });
  t.roof(terra2, { y: y + 3.0, w: 1.3, e: 0.5, h: 1.4, lift: 0.5, sub: 6, thick: 0.15 });
  t.cyl(GOLD, 0.12, 1.4, { y: y + 4.5, sides: 10 });
  t.ball(GOLD, 0.3, 0, y + 5.4, 0);
  t.cone(GOLD, 0.12, 0.8, { y: y + 5.9, sides: 8 });
}

/* ------------------------------------------------------------- PAKISTAN */
function chhatri(t: T, x: number, y: number, z: number, r: number) {
  const marble = M('plaster', 0xf1ecdf, { rough: 0.4, tile: 2 });
  const h = r * 1.7;
  t.loft(marble, [[y, r * 1.2], [y + 0.14, r * 1.2]], { sides: 8, x, z });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    t.cyl(marble, 0.1 + r * 0.04, h, { x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, y: y + 0.14, sides: 10 });
  }
  t.loft(marble, [[y + h + 0.1, r * 1.25], [y + h + 0.4, r * 1.25]], { sides: 8, x, z });
  t.loft(marble, profileRings(ONION, y + h + 0.4, r * 1.45, r * 1.0), { sides: 16, smooth: true, x, z });
  t.cone(GOLD, 0.06 + r * 0.05, r * 0.9, { x, z, y: y + h + 0.4 + r * 1.35, sides: 8 });
  t.ball(GOLD, 0.09 + r * 0.06, x, y + h + 0.4 + r * 1.35 + r * 0.8, z);
}

export function pakistan(t: T) {
  const red = M('ashlar', 0xa6452e, { tile: 1.8 });
  const marble = M('plaster', 0xf1ecdf, { rough: 0.4, tile: 2 });

  t.box(red, 10, 1.2, 10);
  t.box(red, 8.2, 3.2, 8.2, 0, 1.2, 0);
  t.box(marble, 8.45, 0.25, 8.45, 0, 2.9, 0);
  t.box(marble, 8.45, 0.25, 8.45, 0, 4.2, 0);
  t.around(marble, { apothem: 4.1, y: 1.7, w: 1.3, h: 1.8, d: 0.14, per: 3, gap: 2.4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) chhatri(t, sx * 3.5, 4.4, sz * 3.5, 0.8);

  let y = 4.4;
  const stages = [
    { a: 2.6, h: 5.8 },
    { a: 2.25, h: 4.6 },
    { a: 1.9, h: 3.8 },
  ];
  stages.forEach((S) => {
    t.loft(red, [[y, S.a], [y + S.h, S.a * 0.93]], { sides: 8 });
    t.loft(marble, [[y + S.h * 0.3, S.a * 0.985], [y + S.h * 0.36, S.a * 0.985]], { sides: 8 });
    t.loft(marble, [[y + S.h * 0.62, S.a * 0.96 + 0.03], [y + S.h * 0.68, S.a * 0.96 + 0.03]], { sides: 8 });
    t.loft(marble, [[y + S.h - 0.2, S.a + 0.75], [y + S.h + 0.1, S.a + 0.75]], { sides: 8 });
    t.around(marble, {
      sides: 8,
      apothem: S.a + 0.7,
      y: y + S.h + 0.1,
      w: 0.22,
      h: 0.5,
      d: 0.12,
      per: 3,
      gap: 0.6,
    });
    y += S.h + 0.1;
  });
  chhatri(t, 0, y, 0, 1.5);
}

/* ---------------------------------------------------------- PHILIPPINES */
export function philippines(t: T) {
  const coral = M('ashlar', 0xcdb68a, { tile: 2.2 });
  const coral2 = M('ashlar', 0xbca574, { tile: 2.2 });
  const roofc = M('scale', 0xa84b2a, { tile: 1.4, rough: 0.6 });

  t.loft(coral, [[0, 5.0], [6.5, 4.3]], { sides: 4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) t.box(coral2, 1.3, 6.4, 1.3, sx * 4.25, 0, sz * 4.25);
  t.around(DARK, { apothem: 4.7, y: 0, w: 1.9, h: 3.4, d: 0.5, per: 1 });
  t.around(coral2, { apothem: 4.75, y: 3.4, w: 2.6, h: 0.35, d: 0.5, per: 1 });
  t.around(DARK, { apothem: 4.6, y: 4.2, w: 0.8, h: 1.4, d: 0.3, per: 2, gap: 2.4 });
  t.box(coral2, 10.6, 0.4, 10.6, 0, 6.3, 0);

  t.loft(coral, [[6.7, 3.9], [11.0, 3.4]], { sides: 4 });
  t.around(DARK, { apothem: 3.6, y: 8.0, w: 1.0, h: 2.0, d: 0.3, per: 2, gap: 1.7 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) t.box(coral2, 0.8, 4.2, 0.8, sx * 3.2, 6.7, sz * 3.2);
  t.box(coral2, 7.8, 0.35, 7.8, 0, 10.8, 0);

  // open belfry
  const yb = 11.15;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) t.box(coral, 1.1, 3.6, 1.1, sx * 2.35, yb, sz * 2.35);
  t.box(coral, 6.0, 0.25, 0.6, 0, yb + 1.0, 0);
  t.box(coral2, 6.8, 0.5, 6.8, 0, yb + 3.6, 0);
  t.loft(
    GOLD,
    [[0, 0.9], [0.3, 0.76], [1.0, 0.56], [1.4, 0.4], [1.48, 0]],
    { sides: 16, smooth: true, y: yb + 1.5 },
  );

  // octagonal lantern and dome
  const y4 = yb + 4.1;
  t.loft(coral2, [[y4, 2.3], [y4 + 2.1, 2.0]], { sides: 8 });
  t.around(DARK, { sides: 8, apothem: 2.1, y: y4 + 0.6, w: 0.6, h: 1.1, d: 0.2, per: 1 });
  t.loft(coral, [[y4 + 2.0, 2.45], [y4 + 2.35, 2.45]], { sides: 8 });
  t.loft(roofc, domeRings(2.3, y4 + 2.35, 2.0, 10), { sides: 24, smooth: true });
  t.box(GOLD, 0.2, 1.5, 0.2, 0, y4 + 4.2, 0);
  t.box(GOLD, 0.9, 0.2, 0.2, 0, y4 + 4.9, 0);
}

/* ----------------------------------------------------------------- IRAN */
export function iran(t: T) {
  const brick = M('brick', 0xb4653f, { tile: 1.7 });
  const brick2 = M('brick', 0xc77b4e, { tile: 1.7 });
  const earth = M('mud', 0x85744f, { tile: 4 });
  const band = M('ashlar', 0xd9bb8c, { tile: 1.6 });

  t.frustum(earth, 11, 7.2, 2.2, { sides: 40 });
  const y0 = 2.2;
  const H = 24;
  t.loft(brick, curve(8, (u) => [y0 + u * H, 5.0 - u * 0.5]), { sides: 40, smooth: true });
  // ten flanges
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const rr = 4.85;
    t.box(brick2, 0.9, H - 1.2, 1.3, Math.cos(a) * rr, y0, Math.sin(a) * rr, Math.PI / 2 - a);
  }
  // inscription bands
  t.loft(band, [[y0 + H * 0.88, 4.72], [y0 + H * 0.94, 4.72]], { sides: 40, smooth: true });
  t.loft(band, [[y0 + H * 0.97, 4.66], [y0 + H * 1.0, 4.66]], { sides: 40, smooth: true });
  // muqarnas cornice
  const yc = y0 + H;
  t.loft(brick2, [[yc - 0.4, 5.3], [yc + 0.3, 5.5], [yc + 0.9, 5.9]], { sides: 40, smooth: true });
  t.around(brick, { sides: 20, apothem: 5.4, y: yc - 0.6, w: 0.8, h: 0.6, d: 0.3, per: 1 });
  // conical roof
  t.loft(brick, curve(10, (u) => [yc + 0.8 + u * 11, 5.9 * Math.pow(1 - u, 0.92)]), { sides: 10, rot: 0 });
  t.ball(GOLD, 0.25, 0, yc + 12, 0);
}
