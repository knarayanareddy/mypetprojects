import {
  g, W, H, PAL, TAU, bg, rect, ell, rr, poly, line, inkLine, letter, sfx, flash, camBegin, camEnd, lerp, ease, easeOut, backOut, seg, kf, hash, frac, mixCol, glow, rgba, starPts, heartPts,
} from '../engine/core';
import { bit, human, mood } from '../engine/chars';
import { cat, sparkle, confetti } from '../engine/props';
import type { ShotFn } from './types';

function icon(kind: number, x: number, y: number, s: number) {
  switch (kind) {
    case 0:
      ell(x, y + s * 0.1, s * 0.85, s * 0.8, '#e8453a', { sw: 3, lit: true });
      line(x, y - s * 0.7, x + s * 0.15, y - s * 1.1, 5, '#5a3a22');
      ell(x + s * 0.4, y - s * 0.95, s * 0.35, s * 0.18, '#5fa860', { sw: 2, lit: false, rot: -0.4 });
      break;
    case 1:
      rr(x - s * 1.2, y - s * 0.2, s * 2.4, s * 0.8, s * 0.3, '#4fb3c8', { sw: 3 });
      rr(x - s * 0.7, y - s * 0.8, s * 1.4, s * 0.7, s * 0.3, '#4fb3c8', { sw: 3 });
      ell(x - s * 0.7, y + s * 0.6, s * 0.35, s * 0.35, '#2b2638', { sw: 2, lit: false });
      ell(x + s * 0.7, y + s * 0.6, s * 0.35, s * 0.35, '#2b2638', { sw: 2, lit: false });
      break;
    case 2:
      for (let i = 0; i < 6; i++) ell(x + Math.cos((i / 6) * TAU) * s * 0.7, y + Math.sin((i / 6) * TAU) * s * 0.7, s * 0.42, s * 0.42, i % 2 ? '#e86a7e' : '#f4a0b0', { sw: 2, lit: false });
      ell(x, y, s * 0.35, s * 0.35, PAL.ochre, { sw: 2, lit: false });
      break;
    case 3:
      rect(x - s, y - s * 0.2, s * 2, s * 1.1, '#f2d9a0', { sw: 3 });
      poly([[x - s * 1.2, y - s * 0.2], [x, y - s * 1.2], [x + s * 1.2, y - s * 0.2]], '#c2503a', { sw: 3 });
      rect(x - s * 0.25, y + s * 0.2, s * 0.5, s * 0.7, '#7a4a30', { sw: 2, lit: false });
      break;
    case 4:
      poly([[x - s * 1.2, y + s * 0.2], [x + s * 1.2, y + s * 0.2], [x + s * 0.8, y + s * 0.8], [x - s * 0.8, y + s * 0.8]], '#8a5a3a', { sw: 3 });
      line(x, y + s * 0.2, x, y - s * 1, 4);
      poly([[x, y - s], [x + s * 0.9, y + s * 0.1], [x, y + s * 0.1]], '#fff3da', { sw: 3 });
      break;
    default:
      ell(x, y, s * 0.9, s * 0.9, '#ffd24a', { sw: 3 });
      ell(x - s * 0.3, y - s * 0.2, s * 0.12, s * 0.12, PAL.ink, { ink: null, lit: false });
      ell(x + s * 0.3, y - s * 0.2, s * 0.12, s * 0.12, PAL.ink, { ink: null, lit: false });
      inkLine([[x - s * 0.4, y + s * 0.25], [x, y + s * 0.55], [x + s * 0.4, y + s * 0.25]], 3);
  }
}

// 2012 — ImageNet: the pictures learn to see (and find the cat)
export const imagenet: ShotFn = (_t, lt) => {
  bg('#e8dcf5', '#cdbde6');
  const cols = 6;
  const catIdx = 7;
  const scanIdx = Math.min(17, Math.floor(seg(lt, 0.2, 3.2) * 18));
  const focus = lt > 3.2;
  const tx = 260 + (catIdx % cols) * 250 + 110;
  const ty = 150 + Math.floor(catIdx / cols) * 230 + 100;
  const z = focus ? lerp(1, 2.2, easeOut(seg(lt, 3.2, 4.2))) : 1.02;
  camBegin(focus ? lerp(960, tx, easeOut(seg(lt, 3.2, 4.2))) : 960, focus ? lerp(520, ty, easeOut(seg(lt, 3.2, 4.2))) : 520, z, 0);
  for (let i = 0; i < 18; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = 260 + c * 250;
    const y = 150 + r * 230;
    const k = backOut(seg(lt, i * 0.03, i * 0.03 + 0.3));
    g.save();
    g.translate(x + 110, y + 100);
    g.scale(k, k);
    g.rotate((hash(i) - 0.5) * 0.08);
    rr(-110, -100, 220, 200, 10, '#fffaf0', { sw: 3.5, lit: false });
    rect(-95, -85, 190, 140, i % 3 === 0 ? '#bfe3f2' : i % 3 === 1 ? '#f9e0a8' : '#d7ecc2', { sw: 2, lit: false });
    if (i === catIdx) cat(0, 50, 17, { eyes: 'happy' });
    else icon(i % 6, 0, -15, 34);
    if (i < scanIdx) {
      inkLine([[-30, 80], [-10, 95], [35, 66]], 9, PAL.sap, true, 1);
    }
    g.restore();
  }
  // Bit hops tile to tile holding a magnifier
  const cur = Math.min(scanIdx, 17);
  const bx = 260 + (cur % cols) * 250 + 150;
  const by = 150 + Math.floor(cur / cols) * 230 + 215;
  if (!focus) {
    bit(bx, by, 8, {
      hat: 'specs',
      eyes: 'happy',
      mouth: 'grin',
      dy: -Math.abs(Math.sin(lt * 12)) * 1.2,
      aR: 1.4,
      armR: (u) => {
        line(0, 0, u * 3, -u * 3, 5, PAL.wood);
        ell(u * 4.2, -u * 4.2, u * 3, u * 3, 'rgba(200,235,255,.35)', { sw: 4, lit: false, op: 0.45 });
      },
    });
  }
  if (focus) {
    const k = seg(lt, 3.5, 4.0);
    poly(starPts(tx, ty - 20, 190 * backOut(k), 0.6, 10, lt), '#ffd24a', { sw: 3, op: 0.5 * (1 - seg(lt, 4.3, 5)), lit: false });
    bit(tx + 150, ty + 150, 10, { hat: 'specs', eyes: 'heart', mouth: 'grin', aL: 1.6, aR: 1.6, dy: -Math.abs(Math.sin(lt * 9)) * 0.6 });
    sparkle(tx - 120, ty - 90, 28, '#fff', lt * 4);
  }
  camEnd();
  if (focus) sfx('CAT!', 960, 310, 140, PAL.rose, lt - 3.6, { life: 1.5 });
};

// 2016 — AlphaGo's move 37
export const alphago: ShotFn = (t, lt) => {
  bg('#e2d6b0', '#c5b283');
  const P = (u: number, v: number): [number, number] => [lerp(lerp(560, 400, v), lerp(1360, 1520, v), u), lerp(330, 820, v)];
  const z = kf(lt, [[0, 1], [2.2, 1.02], [3.2, 1.35]], easeOut);
  const [fx, fy] = P(0.5, 0.6);
  camBegin(lerp(960, fx, seg(lt, 2.2, 3.4)), lerp(560, fy, seg(lt, 2.2, 3.4)), z, kf(lt, [[0, 0], [2.4, 0], [3.2, -0.04]]));
  rect(-100, 860, 2200, 400, '#7a5a3a', { sw: 4, lit: false });
  poly([[540, 310], [1380, 310], [1560, 840], [380, 840]], '#d49a50', { sw: 6, lit: true });
  g.strokeStyle = '#4a3220';
  g.lineWidth = 2.5;
  for (let i = 0; i < 9; i++) {
    const a = P(i / 8, 0);
    const b = P(i / 8, 1);
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
    const c = P(0, i / 8);
    const d = P(1, i / 8);
    g.beginPath();
    g.moveTo(c[0], c[1]);
    g.lineTo(d[0], d[1]);
    g.stroke();
  }
  const stone = (u: number, v: number, white: boolean, dropK = 1) => {
    const [x, y] = P(u, v);
    const r = 20 + v * 14;
    const yy = y - (1 - dropK) * 420;
    ell(x + 3, y + 6, r, r * 0.55, 'rgba(40,25,10,.35)', { ink: null, lit: false, edge: 0 });
    ell(x, yy, r, r * 0.85, white ? '#fffaf0' : '#2b2638', { sw: 2.5, lit: true });
  };
  const pre: [number, number][] = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75], [0.5, 0.25], [0.125, 0.5], [0.875, 0.5], [0.625, 0.375], [0.375, 0.875], [0.625, 0.875], [0.375, 0.375], [0.875, 0.125], [0.125, 0.875], [0.5, 0.875]];
  pre.forEach(([u, v], i) => {
    const k = seg(lt, i * 0.14, i * 0.14 + 0.2);
    if (k > 0) stone(u, v, i % 2 === 1, easeOut(k));
  });
  const place = seg(lt, 2.3, 2.6);
  if (place > 0) {
    const [sx, sy] = P(0.5, 0.62);
    if (place >= 1 && lt < 4.6) {
      glow(sx, sy, 200, '#ffd24a', 0.7 * (1 - seg(lt, 3.0, 4.6)));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const d = 60 + (lt - 2.6) * 170;
        line(sx + Math.cos(a) * d * 0.6, sy + Math.sin(a) * d * 0.4, sx + Math.cos(a) * d, sy + Math.sin(a) * d * 0.66, 5, '#ffd24a', 1 - seg(lt, 2.8, 3.8));
      }
    }
    stone(0.5, 0.62, true, easeOut(place));
  }
  camEnd();
  const shock = lt > 2.6;
  human(240, 960, 19, {
    era: 4,
    seed: 41,
    noLegs: true,
    eyes: shock ? 'scared' : 'dot',
    mouth: shock ? 'o' : 'flat',
    sweat: 1,
    aL: shock ? 2.3 : 0.7,
    aR: shock ? 2.3 : 0.7,
    rot: shock ? Math.sin(t * 25) * 0.04 : 0,
  });
  const m = mood(lt, [[0, 'normal'], [2.6, 'spark', 'spark']]);
  bit(1680, 960, 17, { ...m, hat: 'grad', mouth: 'grin', aL: -0.5, aR: lt < 2.5 ? 0.9 : 0.2, dy: lt > 3 ? -Math.abs(Math.sin(t * 8)) * 0.6 : 0 });
  if (lt > 2.3) letter('37', 960, 200, 200, PAL.cream, { pop: seg(lt, 2.4, 2.9), rot: -0.06 });
};

function portrait(x: number, y: number, s: number, noise: number, t: number) {
  rr(x - s * 3.3, y - s * 4.3, s * 6.6, s * 8.6, 8, '#fffaf0', { sw: 4, lit: false });
  g.save();
  g.beginPath();
  g.rect(x - s * 3, y - s * 4, s * 6, s * 8);
  g.clip();
  rect(x - s * 3, y - s * 4, s * 6, s * 8, '#cfe8f5', { ink: null, lit: false });
  ell(x, y + s * 4, s * 3.2, s * 2.4, '#e0674e', { sw: 3, lit: false });
  ell(x, y - s * 0.4, s * 2.2, s * 2.6, '#f2c9a0', { sw: 3 });
  poly([[x - s * 2.3, y - s * 0.4], [x - s * 1.8, y - s * 2.8], [x, y - s * 3.2], [x + s * 1.8, y - s * 2.8], [x + s * 2.3, y - s * 0.4], [x + s * 1.3, y - s * 1.6], [x - s * 1.3, y - s * 1.6]], '#5a3a2a', { sw: 3, lit: false });
  ell(x - s * 0.8, y - s * 0.4, s * 0.25, s * 0.35, PAL.ink, { ink: null, lit: false });
  ell(x + s * 0.8, y - s * 0.4, s * 0.25, s * 0.35, PAL.ink, { ink: null, lit: false });
  inkLine([[x - s * 0.8, y + s * 0.9], [x, y + s * 1.4], [x + s * 0.8, y + s * 0.9]], 4);
  g.restore();
  // diffusion-like static
  const cell = s * 0.55;
  const st = Math.floor(t * 8);
  for (let cy = 0; cy < 8 / 0.55; cy++)
    for (let cx = 0; cx < 6 / 0.55; cx++) {
      const h = hash(cx * 13.1 + cy * 7.7);
      if (h < noise) {
        g.fillStyle = `hsl(${Math.floor(hash(cx * 3 + cy * 5 + st) * 360)},55%,${55 + hash(cy + cx * 9) * 30}%)`;
        g.globalAlpha = 0.95;
        g.fillRect(x - s * 3 + cx * cell, y - s * 4 + cy * cell, cell + 1, cell + 1);
      }
    }
  g.globalAlpha = 1;
  rr(x - s * 3.3, y - s * 4.3, s * 6.6, s * 8.6, 8, null, { sw: 4, lit: false });
}

// 2014 — GANs: forger vs critic, then we dive into the ever-deeper network
export const ganNet: ShotFn = (t, lt) => {
  if (lt < 4.5) {
    bg('#f0e0f0', '#d8b8e0');
    const stage = Math.floor(lt / 1.0);
    const nz = [1, 0.72, 0.4, 0.14, 0][Math.min(4, stage)];
    const sub = frac(lt / 1.0);
    const zin = lt > 3.7 ? easeOut(seg(lt, 3.7, 4.5)) : 0;
    camBegin(lerp(960, 960 + 6, zin), lerp(520, 480, zin), 1 + Math.pow(zin, 2.5) * 7, 0);
    rect(-100, 900, 2200, 300, '#8a6aa8', { sw: 4, lit: false });
    // easel
    line(820, 760, 760, 960, 9, PAL.wood);
    line(1100, 760, 1160, 960, 9, PAL.wood);
    line(960, 700, 960, 980, 9, PAL.wood);
    portrait(960, 480, 56, nz, lt);
    // forger
    bit(430, 960, 20, {
      hat: 'beret',
      eyes: stage >= 3 ? 'happy' : 'normal',
      mouth: stage >= 3 ? 'grin' : 'smile',
      aR: 1 + Math.sin(t * 14) * 0.4,
      armR: (u) => {
        line(0, 0, u * 2.5, -u * 1.2, 4, PAL.wood);
        ell(u * 2.6, -u * 1.25, u * 0.45, u * 0.45, PAL.rose, { sw: 2, lit: false });
      },
    });
    // critic
    const nope = stage < 4 && sub > 0.25 && sub < 0.8;
    bit(1490, 960, 20, {
      hat: ['top', 'specs'],
      eyes: stage >= 4 ? 'heart' : nope ? 'angry' : 'narrow',
      mouth: stage >= 4 ? 'grin' : 'flat',
      rot: nope ? Math.sin(t * 22) * 0.1 : 0,
      aL: stage >= 4 ? 1.6 : -0.6,
      aR: stage >= 4 ? 1.6 : 0.6,
    });
    if (nope) {
      line(1330, 300, 1460, 430, 18, PAL.red);
      line(1460, 300, 1330, 430, 18, PAL.red);
    }
    if (stage >= 4) {
      for (let i = 0; i < 5; i++) {
        const k = (t * 0.7 + i / 5) % 1;
        poly(heartPts(1490 + (i - 2) * 50, 600 - k * 300, 18), PAL.rose, { sw: 2, curv: true, lit: false, op: 1 - k });
      }
      inkLine([[1360, 330], [1410, 390], [1520, 270]], 24, PAL.sap, true, 1);
    }
    camEnd();
    if (lt > 3.9) flash(seg(lt, 3.9, 4.5), '#1a1440');
  } else {
    // zoomed into the network: layers pile up, a signal carries Bit forward
    const k = lt - 4.5;
    bg('#14123a', '#2a1f5a');
    const L = 3 + Math.floor(seg(k, 0.1, 2.6) * 5);
    const n = 6;
    const px = (l: number) => 200 + (l * 1520) / 7;
    const py = (l: number, i: number) => 200 + (i + 0.5) * (620 / n) + Math.sin(l * 2) * 12;
    glow(960, 520, 900, '#5a3fc8', 0.25);
    for (let l = 0; l < L - 1; l++) {
      const a = Math.min(1, (seg(k, 0.1 + l * 0.3, 0.5 + l * 0.3)));
      g.strokeStyle = `rgba(143,208,255,${0.28 * a})`;
      g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          g.moveTo(px(l), py(l, i));
          g.lineTo(px(l + 1), py(l + 1, j));
        }
      g.stroke();
    }
    for (let l = 0; l < L; l++) {
      const a = backOut(seg(k, l * 0.3, l * 0.3 + 0.4));
      for (let i = 0; i < n; i++) {
        const on = hash(l * 7 + i + Math.floor(t * 3)) > 0.55;
        ell(px(l), py(l, i), 26 * a, 26 * a, on ? '#ffd24a' : mixCol('#4fb3c8', '#8a6fc7', l / 7), { sw: 3, lit: false });
        if (on) glow(px(l), py(l, i), 70, '#ffd24a', 0.5);
      }
    }
    const prog = (k * 0.55) % 1;
    const bl = prog * (L - 1);
    const li = Math.floor(bl);
    const fr = frac(bl);
    const bx = lerp(px(li), px(li + 1), ease(fr));
    const by = lerp(py(li, li % n), py(li + 1, (li * 2 + 1) % n), ease(fr));
    bit(bx, by + 40, 6, { hat: 'party', eyes: 'happy', mouth: 'grin', aL: 1.7, aR: 1.7, noShadow: true });
    glow(bx, by, 90, '#fff6c0', 0.5);
    confetti(t, 0);
  }
  void W;
  void H;
  void rgba;
  void backOut;
  void sparkle;
  void human;
  void seg;
};
