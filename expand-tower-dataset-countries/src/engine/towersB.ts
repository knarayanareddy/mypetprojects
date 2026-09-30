import { M, T, curve, domeRings, type Ring } from './helpers';

const DARK = M('none', 0x1e1b19, { rough: 0.9 });
const GOLD = M('none', 0xd9ab3c, { metal: 0.85, rough: 0.32 });
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ USA */
export function usa(t: T) {
  const lime = M('plaster', 0xddd5c2, { tile: 2.5, rough: 0.7 });
  const glass = M('glass', 0xc3cedc, { tile: 2.4, rough: 0.3, metal: 0.25 });
  const steel = M('none', 0xbfc8d2, { metal: 0.9, rough: 0.22 });

  const tiers = [
    { hw: 7.2, h: 7 },
    { hw: 6.0, h: 9 },
    { hw: 4.8, h: 8 },
    { hw: 3.6, h: 5.5 },
    { hw: 2.6, h: 4.5 },
  ];
  let y = 0;
  tiers.forEach((T0, i) => {
    t.box(glass, T0.hw * 2, T0.h, T0.hw * 2, 0, y, 0);
    const per = Math.max(4, Math.round(T0.hw * 1.3));
    t.around(lime, { apothem: T0.hw, y, w: 0.4, h: T0.h, d: 0.4, per, gap: (T0.hw * 2 - 1.4) / (per - 1) });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) t.box(lime, 1.0, T0.h, 1.0, sx * (T0.hw - 0.4), y, sz * (T0.hw - 0.4));
    t.box(lime, T0.hw * 2 + 0.4, 0.5, T0.hw * 2 + 0.4, 0, y + T0.h, 0);
    if (i === 0) {
      t.around(lime, { apothem: T0.hw, y: 0, w: 3.6, h: 4.0, d: 0.7, per: 1 });
      t.around(DARK, { apothem: T0.hw + 0.2, y: 0, w: 2.6, h: 3.2, d: 0.5, per: 1 });
    }
    y += T0.h + 0.5;
  });
  // stepped crown
  t.loft(lime, [[y, 1.9], [y + 2.2, 1.9]], { sides: 4 });
  t.loft(glass, [[y + 2.2, 1.45], [y + 4.0, 1.45]], { sides: 4 });
  t.loft(lime, [[y + 4.0, 1.7], [y + 4.4, 1.7], [y + 4.4, 1.0], [y + 6.2, 0.9]], { sides: 4 });
  t.loft(lime, [[y + 6.2, 0.5], [y + 7.4, 0.3]], { sides: 4 });
  t.cyl(steel, 0.22, 6.5, { y: y + 7.4, sides: 10 });
  t.cone(steel, 0.12, 1.4, { y: y + 13.9, sides: 8 });
  t.ball(M('none', 0xff5a3c, { glow: true }), 0.18, 0, y + 15.2, 0);
}

/* --------------------------------------------------------------- RUSSIA */
export function russia(t: T) {
  const brick = M('brick', 0xa6382b, { tile: 1.6 });
  const white = M('ashlar', 0xeee8da, { tile: 1.8 });
  const green = M('scale', 0x2f7d5c, { tile: 1.3, rough: 0.35 });
  const red = M('none', 0xc2272d, { rough: 0.4 });

  t.box(brick, 10.8, 11.5, 10.8);
  t.box(white, 11.1, 0.35, 11.1, 0, 4.0, 0);
  t.box(white, 11.1, 0.35, 11.1, 0, 10.6, 0);
  t.around(white, { apothem: 5.4, y: 6.0, w: 1.6, h: 2.8, d: 0.25, per: 1 });
  t.around(DARK, { apothem: 5.45, y: 6.4, w: 1.1, h: 2.1, d: 0.3, per: 1 });
  t.around(DARK, { apothem: 5.4, y: 0, w: 2.8, h: 3.6, d: 0.5, per: 1 });
  t.box(brick, 11.6, 0.9, 11.6, 0, 11.5, 0);
  t.around(brick, { apothem: 5.55, y: 12.4, w: 0.95, h: 1.1, d: 0.6, per: 6, gap: 1.75 });

  t.box(brick, 8.6, 5.2, 8.6, 0, 11.5, 0);
  t.box(white, 8.9, 0.3, 8.9, 0, 11.7, 0);
  t.box(white, 8.9, 0.3, 8.9, 0, 16.4, 0);
  t.around(white, { apothem: 4.3, y: 12.6, w: 2.8, h: 2.8, d: 0.22, per: 1 });
  t.around(DARK, { apothem: 4.3, y: 12.85, w: 2.3, h: 2.3, d: 0.3, per: 1 });
  t.around(GOLD, { apothem: 4.3, y: 14.0, w: 0.12, h: 0.95, d: 0.36, per: 1 });
  t.around(GOLD, { apothem: 4.3, y: 14.0, w: 0.8, h: 0.12, d: 0.36, per: 1 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      t.box(white, 1.3, 2.2, 1.3, sx * 3.8, 16.6, sz * 3.8);
      t.cone(green, 1.0, 2.2, { x: sx * 3.8, z: sz * 3.8, y: 18.8, sides: 4, smooth: false });
    }
  }
  t.loft(white, [[16.6, 3.3], [20.2, 3.3]], { sides: 8 });
  t.around(DARK, { sides: 8, apothem: 3.3, y: 17.4, w: 1.0, h: 2.2, d: 0.2, per: 1 });
  t.loft(white, [[20.0, 3.8], [20.4, 3.8]], { sides: 8 });
  t.loft(green, curve(10, (u) => [20.4 + u * 10.5, Math.max(0, 3.7 * Math.pow(1 - u, 1.15))]), { sides: 8 });
  t.around(white, { sides: 8, apothem: 3.05, y: 21.6, w: 0.9, h: 1.3, d: 0.3, per: 1 });
  t.cyl(GOLD, 0.12, 1.4, { y: 30.6, sides: 8 });
  t.ball(GOLD, 0.45, 0, 31.6, 0);
  t.cone(red, 0.9, 2.4, { y: 32.0, sides: 5, smooth: false });
}

/* -------------------------------------------------------------- GERMANY */
export function germany(t: T) {
  const stone = M('ashlar', 0xa79f8d, { tile: 2.4 });
  const stone2 = M('ashlar', 0x9a9282, { tile: 2.2 });
  const slate = M('scale', 0x6f7478, { tile: 1.4, rough: 0.6 });

  t.box(stone, 9, 9.2, 9);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      t.box(stone2, 1.7, 11.6, 1.7, sx * 4.5, 0, sz * 4.5);
      t.cone(stone2, 1.1, 1.8, { x: sx * 4.5, z: sz * 4.5, y: 11.6, sides: 4, smooth: false });
    }
  }
  t.around(DARK, { apothem: 4.5, y: 0, w: 2.6, h: 4.6, d: 0.5, per: 1 });
  t.around(stone2, { apothem: 4.5, y: 4.6, w: 3.0, h: 0.5, d: 0.5, per: 1 });
  t.around(DARK, { apothem: 4.5, y: 6.0, w: 2.0, h: 2.0, d: 0.3, per: 1 });
  t.box(stone2, 9.7, 0.45, 9.7, 0, 9.0, 0);

  t.box(stone, 7.6, 9.2, 7.6, 0, 9.2, 0);
  t.around(DARK, { apothem: 3.8, y: 11.4, w: 0.8, h: 4.8, d: 0.3, per: 2, gap: 2.1 });
  t.box(stone2, 8.3, 0.45, 8.3, 0, 18.2, 0);

  t.box(stone, 6.2, 7.4, 6.2, 0, 18.4, 0);
  t.around(DARK, { apothem: 3.1, y: 19.8, w: 1.2, h: 4.4, d: 0.3, per: 2, gap: 2.0 });
  t.box(stone2, 6.9, 0.5, 6.9, 0, 25.4, 0);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      t.box(stone2, 1.1, 3.0, 1.1, sx * 2.75, 25.8, sz * 2.75);
      t.cone(stone2, 0.85, 4.2, { x: sx * 2.75, z: sz * 2.75, y: 28.8, sides: 4, smooth: false });
    }
  }
  // octagonal spire
  const y0 = 25.8;
  const H = 22;
  const ap = (u: number) => 2.7 * Math.pow(1 - u, 1.05);
  t.loft(stone, curve(14, (u) => [y0 + u * H, ap(u)]), { sides: 8 });
  // crockets up each ridge
  const Rc = 1 / Math.cos(Math.PI / 8);
  for (let k = 0; k < 8; k++) {
    const a = (k + 0.5) * (TAU / 8);
    for (let j = 1; j < 11; j++) {
      const u = j / 12;
      const rr = ap(u) * Rc + 0.05;
      t.box(stone2, 0.36, 0.6, 0.36, Math.cos(a) * rr, y0 + u * H - 0.2, Math.sin(a) * rr, Math.PI / 2 - a);
    }
  }
  t.ball(stone2, 0.4, 0, y0 + H - 0.2, 0);
  t.box(GOLD, 0.14, 1.8, 0.14, 0, y0 + H + 0.5, 0);
  t.box(GOLD, 0.8, 0.14, 0.14, 0, y0 + H + 1.3, 0);
  void slate;
}

/* ---------------------------------------------------------------- EGYPT */
export function egypt(t: T) {
  const sand = M('ashlar', 0xd9c49b, { tile: 2.6 });
  const granite = M('ashlar', 0xb36d56, { tile: 3, rough: 0.55 });
  const carve = M('none', 0x7d3f31, { rough: 0.9 });

  t.box(sand, 15, 0.8, 15);
  t.box(sand, 12, 0.8, 12, 0, 0.8, 0);
  t.box(sand, 9, 0.8, 9, 0, 1.6, 0);
  const y0 = 2.4;
  const H = 19.6;
  const a = (y: number) => 2.1 - 0.85 * ((y - y0) / H);
  t.loft(granite, [[y0, 2.1], [y0 + H, 1.25]], { sides: 4 });
  for (let e = 0; e < 4; e++) {
    t.under((e * Math.PI) / 2, () => {
      for (const off of [-0.5, 0, 0.5]) {
        t.strut(carve, [off, y0 + 2.2, a(y0 + 2.2) + 0.02], [off, y0 + H - 1.6, a(y0 + H - 1.6) + 0.02], 0.14, 0.06);
      }
      for (let k = 0; k < 6; k++) {
        const yy = y0 + 2.8 + k * 2.9;
        t.box(carve, 1.7 * (a(yy) / 2.1) + 0.2, 0.12, 0.06, 0, yy, a(yy) + 0.02);
      }
    });
  }
  t.loft(GOLD, [[y0 + H, 1.25], [y0 + H + 2.3, 0]], { sides: 4 });
}

/* --------------------------------------------------------------- MEXICO */
export function mexico(t: T) {
  const lime = M('ashlar', 0xd9cdb0, { tile: 2.6 });
  const lime2 = M('ashlar', 0xc9bc9b, { tile: 2.6 });

  let y = 0;
  let hw = 9.2;
  for (let i = 0; i < 9; i++) {
    t.box(i % 2 ? lime2 : lime, hw * 2, 1.0, hw * 2, 0, y, 0);
    hw -= 0.46;
    y += 1;
  }
  const top = y;
  for (let e = 0; e < 4; e++) {
    t.under((e * Math.PI) / 2, () => {
      t.stair(lime2, { w: 3.4, y0: 0, y1: top, zIn: 5.4, zOut: 10.6, n: 24 });
      for (const sx of [-1, 1]) {
        t.strut(lime, [sx * 1.95, 0.2, 10.8], [sx * 1.95, top + 0.4, 5.4], 0.6, 0.7);
        t.box(lime, 1.0, 1.0, 1.5, sx * 1.95, 0, 10.9);
      }
    });
  }
  // temple
  t.box(lime, 6.4, 3.4, 6.4, 0, top, 0);
  t.around(DARK, { apothem: 3.2, y: top, w: 2.4, h: 2.6, d: 0.4, per: 1 });
  t.around(lime2, { apothem: 3.2, y: top + 2.6, w: 0.8, h: 0.6, d: 0.15, per: 4, gap: 1.3 });
  t.box(lime2, 7.2, 0.5, 7.2, 0, top + 3.4, 0);
  t.box(lime, 5.8, 0.8, 5.8, 0, top + 3.9, 0);
  t.box(lime2, 3.6, 1.8, 3.6, 0, top + 4.7, 0);
}

/* --------------------------------------------------------------- BRAZIL */
export function brazil(t: T) {
  const concrete = M('concrete', 0xe3dfd5, { tile: 2.4, rough: 0.7 });
  const glass = M('glass', 0xa3c6d8, { tile: 2.6, rough: 0.15, metal: 0.3 });

  t.cyl(concrete, 11.5, 0.6, { sides: 48 });
  const R0 = 8.5;
  const R1 = 6;
  const tw = 1.35;
  const H = 20;
  const y0 = 0.6;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const A: [number, number, number] = [R0 * Math.cos(a), y0, R0 * Math.sin(a)];
    const B: [number, number, number] = [R1 * Math.cos(a + tw), y0 + H, R1 * Math.sin(a + tw)];
    t.strut(concrete, A, B, 0.7, 0.9);
    const B2: [number, number, number] = [(R1 + 1.7) * Math.cos(a + tw + 0.1), y0 + H + 1.3, (R1 + 1.7) * Math.sin(a + tw + 0.1)];
    t.strut(concrete, B, B2, 0.6, 0.8);
  }
  t.loft(
    glass,
    curve(12, (u) => {
      const c = (1 - u) * R0 + u * R1 * Math.cos(tw);
      const s = u * R1 * Math.sin(tw);
      return [y0 + u * H, Math.hypot(c, s) * 0.95] as Ring;
    }),
    { sides: 32, smooth: true },
  );
  t.cyl(concrete, 5.9, 0.35, { y: y0 + H, sides: 32 });
  t.dome(glass, 4.4, 0.9, { y: y0 + H + 0.3 });
}

/* ------------------------------------------------------------- DR CONGO */
export function congo(t: T) {
  const concrete = M('concrete', 0xbfbbb0, { tile: 2.6 });
  const band = M('glass', 0x86bccb, { tile: 2.2, rough: 0.2 });
  const red = M('none', 0xc8362b, { rough: 0.5 });
  const white = M('none', 0xf3f1ec, { rough: 0.5 });
  const beacon = M('none', 0xff4a30, { glow: true });

  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    t.strut(concrete, [Math.cos(a) * 8, 0, Math.sin(a) * 8], [Math.cos(a) * 1.2, 10, Math.sin(a) * 1.2], 1.1, 1.7);
  }
  const H = 27;
  t.frustum(concrete, 2.0, 1.35, H, { sides: 12 });
  const y = H;
  t.loft(concrete, [[y - 3.0, 1.35], [y - 0.6, 3.6], [y, 5.6]], { sides: 28, smooth: true });
  t.loft(band, [[y, 5.65], [y + 1.7, 5.65]], { sides: 28, smooth: true });
  t.loft(concrete, [[y + 1.7, 5.7], [y + 2.1, 5.7], [y + 2.1, 4.6], [y + 2.5, 4.6]], { sides: 28, smooth: true });
  t.loft(band, [[y + 2.5, 4.3], [y + 3.8, 4.3]], { sides: 28, smooth: true });
  t.loft(concrete, [[y + 3.8, 4.6], [y + 4.3, 4.6], [y + 4.3, 2.0], [y + 5.6, 1.6]], { sides: 28, smooth: true });
  for (let k = 0; k < 7; k++) {
    t.cyl(k % 2 ? white : red, 0.3 - k * 0.025, 1.6, { y: y + 5.5 + k * 1.6, sides: 10 });
  }
  t.ball(beacon, 0.28, 0, y + 16.6, 0);
}

/* ------------------------------------------------------------- ETHIOPIA */
export function ethiopia(t: T) {
  const granite = M('ashlar', 0x8d8e85, { tile: 2.6, rough: 0.9 });
  const dk = M('ashlar', 0x6f716b, { tile: 2.4, rough: 0.9 });

  t.box(granite, 18, 0.7, 9);
  t.box(granite, 15, 0.7, 7, 0, 0.7, 0);
  // companion plain stelae
  for (const sx of [-6, 6]) {
    const h = sx < 0 ? 6.4 : 8.2;
    t.box(dk, 1.9, h, 1.3, sx, 1.4, 0);
    t.cyl(dk, 0.65, 1.9, { rz: Math.PI / 2, x: sx + 0.95, y: 1.4 + h, sy: 1, sx: 1, sides: 20 });
  }
  let y = 1.4;
  let w = 3.2;
  let d = 2.0;
  for (let i = 0; i < 9; i++) {
    const h = 1.75;
    t.box(granite, w, h, d, 0, y, 0);
    for (const sg of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        t.box(dk, 0.3, 0.3, 0.36, (k - 2) * (w / 5.4), y + h - 0.4, sg * (d / 2 + 0.06));
      }
      for (const px of [-w * 0.24, w * 0.24]) {
        t.box(DARK, 0.5, 0.8, 0.14, px, y + 0.35, sg * (d / 2 + 0.02));
      }
    }
    y += h;
    w *= 0.975;
    d *= 0.985;
  }
  // rounded crown with sun disc
  t.cyl(granite, d / 2, w, { rz: Math.PI / 2, x: w / 2, y, sides: 26 });
  for (const sg of [-1, 1]) {
    t.cyl(dk, 0.78, 0.26, { rx: (sg * Math.PI) / 2, y: y + 0.15, z: sg * (d / 2 - 0.1), sides: 24 });
  }
  t.box(DARK, 1.1, 1.5, 0.2, 0, 1.4, d / 2 + 0.0);
  t.ball(GOLD, 0.12, 0, 2.6, d / 2 + 0.12);
}

/* --------------------------------------------------------------- TURKEY */
function minaret(t: T, x: number, z: number) {
  const limestone = M('ashlar', 0xe2dac8, { tile: 2.4 });
  const lead = M('scale', 0x8f9ca2, { tile: 1.4, metal: 0.35, rough: 0.5 });
  t.box(limestone, 1.9, 3.2, 1.9, x, 0, z);
  t.loft(limestone, [[3, 0.78], [17, 0.6]], { sides: 16, smooth: true, x, z });
  for (const [yb, r] of [
    [11.4, 1.35],
    [14.9, 1.15],
  ] as [number, number][]) {
    t.loft(limestone, [[yb, 0.9], [yb + 0.2, r], [yb + 0.75, r], [yb + 0.95, r - 0.1]], { sides: 16, smooth: true, x, z });
    t.around(limestone, { sides: 16, apothem: r - 0.08, y: yb + 0.95, w: 0.18, h: 0.5, d: 0.08, per: 1, x, z });
  }
  t.cone(lead, 0.85, 4.4, { x, z, y: 17, sides: 16 });
  t.cone(GOLD, 0.09, 1.2, { x, z, y: 21.3, sides: 8 });
}

export function turkey(t: T) {
  const limestone = M('ashlar', 0xe2dac8, { tile: 2.4 });
  const lead = M('scale', 0x8f9ca2, { tile: 1.4, metal: 0.35, rough: 0.5 });
  const tileBlue = M('plaster', 0x2c7fa6, { tile: 2, rough: 0.3 });

  t.box(limestone, 15, 6, 15);
  t.box(limestone, 15.6, 0.45, 15.6, 0, 6, 0);
  t.around(DARK, { apothem: 7.5, y: 0, w: 2.2, h: 3.4, d: 0.4, per: 1 });
  t.around(tileBlue, { apothem: 7.5, y: 3.5, w: 2.2, h: 0.8, d: 0.2, per: 1 });
  t.around(DARK, { apothem: 7.5, y: 1.0, w: 0.9, h: 2.0, d: 0.3, per: 2, gap: 4.6, skip: (_f, k) => k === 99 });
  t.around(DARK, { apothem: 7.5, y: 4.0, w: 0.8, h: 1.4, d: 0.3, per: 5, gap: 2.6 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      t.cyl(limestone, 2.3, 1.3, { x: sx * 5.3, z: sz * 5.3, y: 6.4, sides: 24 });
      t.dome(lead, 2.45, 1.8, { x: sx * 5.3, z: sz * 5.3, y: 7.7 });
      t.cone(GOLD, 0.07, 0.9, { x: sx * 5.3, z: sz * 5.3, y: 9.4, sides: 8 });
    }
  }
  t.cyl(limestone, 4.7, 2.4, { y: 6.4, sides: 32 });
  t.around(DARK, { sides: 16, apothem: 4.65, y: 7.1, w: 0.7, h: 1.3, d: 0.2, per: 1 });
  t.loft(limestone, [[8.7, 4.8], [9.0, 5.0]], { sides: 32, smooth: true });
  t.loft(lead, domeRings(5.0, 9.0, 4.8, 12), { sides: 40, smooth: true });
  t.cone(GOLD, 0.14, 1.8, { y: 13.6, sides: 10 });
  t.ball(GOLD, 0.26, 0, 15.3, 0);
  minaret(t, -8.9, 8.2);
  minaret(t, 8.9, 8.2);
}

/* -------------------------------------------------------------- NIGERIA */
export function nigeria(t: T) {
  const mud = M('mud', 0xbf9265, { tile: 3, rough: 1 });
  const mud2 = M('mud', 0xc9a074, { tile: 3, rough: 1 });
  const wood = M('wood', 0x5b3a22, { tile: 1 });
  const egg = M('none', 0xf0e8d6, { rough: 0.3 });

  t.box(mud, 16, 1.2, 16);
  const a1 = (y: number) => 6.4 - ((y - 1.2) / 12) * 1.6;
  t.loft(mud, curve(6, (u) => [1.2 + u * 12, 6.4 - u * 1.6]), { sides: 4 });
  t.box(mud2, 7.4, 3.2, 7.4, 0, 13.0, 0);
  t.box(mud, 8.0, 0.5, 8.0, 0, 16.0, 0);

  const pylon = (x: number, z: number, y0: number, h: number, r0: number) => {
    t.loft(mud2, [[y0, r0], [y0 + h, r0 * 0.58]], { sides: 4, x, z });
    t.cone(mud2, r0 * 0.6, r0 * 1.8, { x, z, y: y0 + h, sides: 4, smooth: false });
    t.ball(egg, 0.3, x, y0 + h + r0 * 1.8 - 0.1, z);
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pylon(sx * 5.6, sz * 5.6, 1.2, 15.4, 1.3);
  pylon(0, 5.9, 1.2, 11, 1.05);
  pylon(0, -5.9, 1.2, 11, 1.05);
  pylon(5.9, 0, 1.2, 11, 1.05);
  pylon(-5.9, 0, 1.2, 11, 1.05);

  // central tower
  const a2 = (y: number) => 2.7 - ((y - 16.2) / 10) * 1.0;
  t.loft(mud2, [[16.2, 2.7], [26.2, 1.7]], { sides: 4 });
  t.cone(mud2, 1.75, 3.2, { y: 26.2, sides: 4, smooth: false });
  t.ball(egg, 0.42, 0, 29.2, 0);

  // toron beams
  for (let e = 0; e < 4; e++) {
    t.under((e * Math.PI) / 2, () => {
      for (let r = 0; r < 7; r++) {
        const y = 3 + r * 1.65;
        for (let k = 0; k < 5; k++) t.box(wood, 0.18, 0.18, 1.0, (k - 2) * 1.35, y, a1(y) + 0.3);
      }
      for (let r = 0; r < 6; r++) {
        const y = 17.2 + r * 1.55;
        for (let k = 0; k < 3; k++) t.box(wood, 0.16, 0.16, 0.9, (k - 1) * 0.9, y, a2(y) + 0.25);
      }
    });
  }
}
