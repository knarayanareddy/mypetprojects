import {
  g, W, H, PAL, TAU, bg, rect, ell, rr, poly, line, inkLine, letter, sfx, camBegin, camEnd, lerp, ease, easeOut, backOut, seg, hash, frac, mixCol, glow, wob, pulse, heartPts,
} from '../engine/core';
import { bit, human, mini } from '../engine/chars';
import { stars, speech, confetti, cat, sparkle } from '../engine/props';
import type { ShotFn } from './types';

// 2017 — "Attention Is All You Need": arcs of attention between words
export const transformer: ShotFn = (t, lt) => {
  bg('#1b1f3f', '#3b4284');
  stars(t, 70, 600);
  glow(960, 700, 900, '#7a5ae0', 0.18);
  letter('ATTENTION', 960, 175, 140, PAL.ochre, { pop: seg(lt, 0.1, 0.6), rot: -0.02 });
  letter('IS ALL YOU NEED', 960, 295, 70, PAL.cream, { pop: seg(lt, 0.5, 1.0), rot: 0.01 });
  const words = ['THE', 'CAT', 'SAT', 'ON', 'THE', 'MAT'];
  const cx = (i: number) => 960 + (i - 2.5) * 290;
  const heads: { c: string; pairs: [number, number, number][]; off: number }[] = [
    { c: '#ffd24a', pairs: [[1, 2, 1], [2, 5, 0.5]], off: 0 },
    { c: '#ff7a9a', pairs: [[0, 1, 0.9], [4, 5, 0.9], [1, 5, 0.4]], off: 30 },
    { c: '#5ad8c8', pairs: [[3, 5, 1], [2, 3, 0.8], [1, 3, 0.3]], off: 60 },
  ];
  heads.forEach((h, hi) => {
    h.pairs.forEach(([a, b, w], pi) => {
      const k = easeOut(seg(lt, 0.9 + hi * 0.45 + pi * 0.2, 1.5 + hi * 0.45 + pi * 0.2));
      if (k <= 0) return;
      const x0 = cx(a);
      const x1 = cx(b);
      const mid = (x0 + x1) / 2;
      const hgt = 640 - Math.abs(x1 - x0) * 0.55 - h.off;
      g.globalAlpha = 0.25 * k;
      g.strokeStyle = h.c;
      g.lineWidth = 22 * w + 6 + pulse(t, 5) * 6;
      g.beginPath();
      g.moveTo(x0, 650);
      g.quadraticCurveTo(mid, hgt, lerp(x0, x1, k), lerp(650, 650, k));
      g.stroke();
      g.globalAlpha = 0.95 * k;
      g.lineWidth = 6 * w + 2;
      g.stroke();
      g.globalAlpha = 1;
    });
  });
  words.forEach((w, i) => {
    const k = backOut(seg(lt, i * 0.07, i * 0.07 + 0.35));
    g.save();
    g.translate(cx(i), 765);
    g.scale(k, k);
    rr(-115, -90, 230, 180, 22, '#fff3da', { sw: 4, lit: true });
    letter(w, 0, 4, 78, PAL.indigo, { ink: false });
    g.restore();
  });
  // multi-head Bit: three eyes on stalks, each one watching a different head
  bit(cx(2), 674, 9, {
    hat: 'phones',
    eyes: 'happy',
    mouth: 'grin',
    noShadow: true,
    dy: -Math.abs(Math.sin(t * 6)) * 0.5,
    draw: (u) => {
      [-1, 0, 1].forEach((k) => {
        const ex = k * 3.2 * u;
        const ey = -16 * u + Math.sin(t * 3 + k) * u * 0.4;
        inkLine([[k * 1.5 * u, -10.5 * u], [ex, ey + 1.2 * u]], 3.5);
        ell(ex, ey, 1.35 * u, 1.5 * u, '#fffaf0', { sw: 2.4, lit: false });
        ell(ex + Math.cos(t * 2 + k * 2) * 0.5 * u, ey + 0.1 * u, 0.55 * u, 0.7 * u, heads[k + 1].c, { sw: 1.4, lit: false });
      });
    },
  });
};

// 2020 — read the whole web; Bit grows and grows (scaling laws)
export const scaleShot: ShotFn = (t, lt) => {
  bg('#143f48', '#2a7a80');
  // data-centre racks multiply
  const nr = 3 + Math.floor(seg(lt, 0, 3.6) * 5);
  for (let i = 0; i < nr; i++) {
    for (const side of [0, 1]) {
      const x = side ? 1480 + i * 70 - 120 : 40 + i * 70;
      if (side && x > 1860) continue;
      const k = backOut(seg(lt, i * 0.3, i * 0.3 + 0.4));
      g.save();
      g.translate(x + 30, 960);
      g.scale(1, k);
      rr(-30, -520, 60, 520, 8, '#222c45', { sw: 3, lit: false });
      for (let r = 0; r < 14; r++) ell(-14, -500 + r * 36, 4, 4, hash(i * 9 + r + Math.floor(t * 5) + side) > 0.45 ? PAL.sap : '#7a8a9a', { ink: null, lit: false });
      g.restore();
    }
  }
  // the river of everything flows into Bit
  const u = lerp(13, 36, ease(seg(lt, 0, 4.6))) * (1 + pulse(t, 6) * 0.04);
  const bx = 1250;
  const by = 990;
  for (let i = 0; i < 44; i++) {
    const p = frac(t * 0.5 + i / 44);
    const x = lerp(-80, bx - 160, p);
    const y = 640 + Math.sin(p * TAU * 2 + i) * 70 + p * 150;
    const sc = p > 0.82 ? 1 - seg(p, 0.82, 1) : 1;
    if (sc <= 0.02) continue;
    g.save();
    g.translate(x, y);
    g.rotate(Math.sin(i + t * 2) * 0.5);
    g.scale(sc, sc);
    const kind = i % 4;
    if (kind === 0) {
      rect(-24, -32, 48, 64, '#fffaf0', { sw: 2.5, lit: false });
      for (let q = 0; q < 4; q++) line(-16, -20 + q * 12, 16, -20 + q * 12, 2.5, '#8a8a9a');
    } else if (kind === 1) rr(-22, -30, 44, 60, 5, ['#e86a7e', '#4fb3c8', '#eab04a'][i % 3], { sw: 2.5, lit: false });
    else if (kind === 2) {
      rr(-30, -24, 60, 48, 6, '#fffaf0', { sw: 2.5, lit: false });
      ell(-6, -4, 10, 10, '#eab04a', { ink: null, lit: false });
      poly([[-26, 18], [-6, -2], [8, 12], [20, 2], [28, 18]], '#7db56a', { ink: null, lit: false });
    } else letter('</>', 0, 0, 36, '#ffd24a', { ink: false });
    g.restore();
  }
  const m = pulse(t, 5);
  bit(bx, by, u, { eyes: 'happy', mouth: 'O', mouthK: 0.7 + m * 0.7, hat: 'phones', aL: 0.9, aR: 0.9, blush: true, noShadow: true });
  // parameter counter
  const params = Math.floor(Math.pow(10, lerp(8.07, 11.24, ease(seg(lt, 0.2, 4.5)))));
  letter(params.toLocaleString('en-US'), 960, 120, 100, PAL.ochre, { rot: -0.015 });
  letter('PARAMETERS', 960, 205, 50, PAL.cream, { rot: 0.01 });
  if (lt > 3.9) sfx('GULP!', 650, 420, 120, PAL.rose, lt - 3.9, { life: 1.1 });
};

// 2022 — diffusion: a painting condenses out of noise
export const diffusion: ShotFn = (t, lt) => {
  bg('#f5ebd8', '#e8d2b0');
  const z = lerp(1, 1.1, ease(seg(lt, 0, 5)));
  camBegin(960, 560, z, 0);
  // easel
  line(560, 780, 480, 1000, 12, PAL.wood);
  line(1360, 780, 1440, 1000, 12, PAL.wood);
  const cx0 = 460;
  const cy0 = 300;
  const cw = 1000;
  const ch = 520;
  rr(cx0 - 20, cy0 - 20, cw + 40, ch + 40, 14, '#c98f55', { sw: 5 });
  // painted scene
  g.save();
  g.beginPath();
  g.rect(cx0, cy0, cw, ch);
  g.clip();
  const gr = g.createLinearGradient(0, cy0, 0, cy0 + ch);
  gr.addColorStop(0, '#2a2060');
  gr.addColorStop(0.55, '#8a4a9a');
  gr.addColorStop(1, '#f2907a');
  g.fillStyle = gr;
  g.fillRect(cx0, cy0, cw, ch);
  for (let i = 0; i < 40; i++) {
    g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i);
    g.fillStyle = '#fff6c8';
    g.beginPath();
    g.arc(cx0 + hash(i) * cw, cy0 + hash(i + 7) * ch * 0.55, 2 + hash(i + 3) * 3, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  ell(cx0 + 780, cy0 + 150, 90, 90, '#ffd9a0', { sw: 3 });
  ell(cx0 + 780, cy0 + 150, 130, 20, null, { ink: '#fff3da', sw: 4, rot: -0.3, lit: false });
  poly([[cx0, cy0 + ch], [cx0 + 180, cy0 + 330], [cx0 + 340, cy0 + 440], [cx0 + 560, cy0 + 300], [cx0 + 780, cy0 + 430], [cx0 + 1000, cy0 + 340], [cx0 + 1000, cy0 + ch]], '#4a2a6a', { sw: 3, lit: false });
  cat(cx0 + 440, cy0 + 300 + Math.sin(t * 2) * 12, 34, { helmet: true, eyes: 'happy', tail: 0.4 });
  g.restore();
  // noise condenses away
  const nk = 1 - ease(seg(lt, 0.4, 4.2));
  const q = Math.round(nk * 10) / 10;
  const cell = 34;
  const st = Math.floor(t * 10);
  for (let cy = 0; cy < ch / cell; cy++)
    for (let cx = 0; cx < cw / cell; cx++) {
      if (hash(cx * 17.3 + cy * 5.9) < q) {
        g.fillStyle = `hsl(${Math.floor(hash(cx * 3 + cy * 11 + st) * 360)},50%,${50 + hash(cy * 5 + cx * 3 + st) * 35}%)`;
        g.fillRect(cx0 + cx * cell, cy0 + cy * cell, cell + 1, cell + 1);
      }
    }
  rr(cx0 - 20, cy0 - 20, cw + 40, ch + 40, 14, null, { sw: 5 });
  // painter Bit
  bit(300, 960, 19, {
    hat: 'beret',
    eyes: 'happy',
    mouth: 'smile',
    aR: 1.0 + Math.sin(t * 9) * 0.45,
    armR: (u) => {
      line(0, 0, u * 2.8, -u * 1.5, 4, PAL.wood);
      ell(u * 2.9, -u * 1.55, u * 0.5, u * 0.5, PAL.rose, { sw: 2, lit: false });
    },
    armL: (u) => ell(0, 0, u * 1.5, u * 1.1, '#e8c07a', { sw: 2.5, lit: false }),
  });
  sparkle(560 + Math.sin(t * 4) * 40, 560 + Math.cos(t * 3) * 50, 18 + pulse(t, 5) * 10, '#fff', t * 3);
  camEnd();
  // prompt bar
  const full = 'A CAT ASTRONAUT, WATERCOLOR';
  rr(360, 70, 1200, 100, 50, '#fffaf0', { sw: 4, lit: false });
  letter(full.slice(0, Math.floor(seg(lt, 0, 1.6) * full.length)) + (lt < 1.7 && Math.floor(t * 6) % 2 ? '|' : ''), 960, 122, 54, PAL.indigo, { ink: false });
};

// Nov 2022 — hello, world: a hundred million friends
export const chatgpt: ShotFn = (t, lt) => {
  bg('#e6f4f0', '#bde2da');
  glow(960, 400, 900, '#ffffff', 0.4);
  // chat window
  rr(540, 170, 840, 560, 28, '#fffdf8', { sw: 5 });
  rect(540, 170, 840, 70, '#3fa7a0', { sw: 4, lit: false });
  ell(590, 205, 12, 12, '#fff', { ink: null, lit: false });
  ell(625, 205, 12, 12, '#fff', { ink: null, lit: false });
  speech(840, 270, 480, 100, 'HELLO!', { size: 50, tx: 1340, ty: 400, pop: seg(lt, 0.3, 0.6), col: '#ffe0a8' });
  const tw = 'HELLO, WORLD!';
  speech(590, 410, 640, 110, tw, { size: 50, tx: 640, ty: 575, chars: seg(lt, 1.2, 2.2) * tw.length, pop: seg(lt, 1.0, 1.3), col: '#cfeee9' });
  if (lt > 0.9 && lt < 1.3) for (let i = 0; i < 3; i++) ell(640 + i * 40, 470 + Math.sin(t * 10 + i) * 8, 10, 10, '#6a7a8a', { ink: null, lit: false });
  // characters beside the window
  human(300, 760, 19, { era: 4, seed: 9, eyes: 'star', mouth: 'grin', aL: 1.7, aR: 1.7, dy: -Math.abs(Math.sin((t / 0.625) * Math.PI)) * 0.7 });
  bit(1660, 760, 20, { eyes: 'happy', mouth: 'grin', hat: 'phones', blush: true, aR: 1.5 + Math.sin(t * 14) * 0.5, dy: -Math.abs(Math.sin((t / 0.625) * Math.PI)) * 0.9 });
  // the crowd arrives
  const n = Math.floor(seg(lt, 0.4, 4.4) * 66);
  for (let i = 0; i < n; i++) {
    const row = i % 3;
    const x = 40 + hash(i * 3.7) * 1840;
    const y = [868, 912, 956][row];
    const s = [9, 10.5, 12][row];
    const k = backOut(seg(lt, 0.4 + (i / 66) * 4, 0.6 + (i / 66) * 4));
    mini(x, y + (1 - k) * 160, s, i + 3, { cheer: 1 });
  }
  // counter
  const users = Math.floor(lerp(0, 100e6, ease(seg(lt, 0.3, 4.4))));
  letter(users.toLocaleString('en-US'), 960, 790, 86, PAL.rose, { rot: -0.015 });
  if (lt > 1.5) confetti(t, 40, 0, W, -50, 800, 8, 200);
  for (let i = 0; i < 5; i++) {
    const k = (t * 0.45 + i / 5) % 1;
    poly(heartPts(1500 + Math.sin(i * 3 + t) * 140, 620 - k * 460, 20), PAL.rose, { sw: 2, curv: true, lit: false, op: 1 - k });
  }
  if (lt > 4.1) sfx('100M!', 960, 420, 130, PAL.ochre, lt - 4.1, { life: 0.9 });
  void camBegin;
  void camEnd;
  void easeOut;
  void mixCol;
  void wob;
  void H;
};
