import {
  g, W, H, PAL, BEAT, beginFrame, finishFrame, brushWipe, flash, rr, poly, line, ell, letter, FONT, lerp, ease, seg, clamp, backOut, bg,
} from '../engine/core';
import { bit } from '../engine/chars';
import { stamp } from '../engine/props';
import { SONG_END, WIPES, CHORUS_STARTS, lineAt } from '../engine/lyrics';
import type { Shot } from './types';
import { intro, chorus, finale } from './stage';
import { dartmouth, eliza, shakeyShot, halShot } from './ch1';
import { winter, expert, seed } from './ch2';
import { deepBlueShot, roombaShot, watsonShot } from './ch3';
import { imagenet, alphago, ganNet } from './ch4';
import { transformer, scaleShot, diffusion, chatgpt } from './ch5';
import { multimodal, science, future } from './ch6';

export const SHOTS: Shot[] = [
  { a: 0, fn: intro },
  { a: 5, fn: dartmouth, year: '1956' },
  { a: 10, fn: eliza, year: '1966' },
  { a: 15, fn: shakeyShot, year: '1958\u201369' },
  { a: 20, fn: halShot, year: '1968' },
  { a: 27.5, fn: chorus(0, 0) },
  { a: 35, fn: chorus(0, 1) },
  { a: 40, fn: winter, year: '1974' },
  { a: 45, fn: expert, year: '1980s' },
  { a: 50, fn: seed, year: '1986' },
  { a: 55, fn: deepBlueShot, year: '1997' },
  { a: 60, fn: roombaShot, year: '2005' },
  { a: 65, fn: watsonShot, year: '2011' },
  { a: 70, fn: chorus(1, 0) },
  { a: 77.5, fn: chorus(1, 1) },
  { a: 82.5, fn: imagenet, year: '2012' },
  { a: 87.5, fn: alphago, year: '2016' },
  { a: 92.5, fn: ganNet, year: '2014' },
  { a: 100, fn: transformer, year: '2017' },
  { a: 105, fn: scaleShot, year: '2020' },
  { a: 110, fn: diffusion, year: '2022' },
  { a: 115, fn: chatgpt, year: '2022' },
  { a: 120, fn: chorus(2, 0) },
  { a: 127.5, fn: chorus(2, 1) },
  { a: 132.5, fn: multimodal, year: '2023' },
  { a: 137.5, fn: science, year: '2024' },
  { a: 142.5, fn: future, year: 'NOW' },
  { a: 147.5, fn: chorus(3, 0) },
  { a: 155, fn: chorus(3, 1) },
  { a: 160, fn: finale },
];

export interface Chapter {
  a: number;
  title: string;
  sub: string;
}
export const CHAPTERS: Chapter[] = [
  { a: 0, title: 'CURTAIN UP', sub: '' },
  { a: 5, title: 'THE SPARK', sub: '1956\u20131968' },
  { a: 27.5, title: 'CHORUS', sub: '' },
  { a: 40, title: 'THE WINTERS', sub: '1974\u20131989' },
  { a: 55, title: 'GAMES & DATA', sub: '1997\u20132011' },
  { a: 70, title: 'CHORUS', sub: '' },
  { a: 82.5, title: 'DEEP LEARNING', sub: '2012\u20132016' },
  { a: 100, title: 'THE TRANSFORMER ERA', sub: '2017\u20132022' },
  { a: 120, title: 'CHORUS', sub: '' },
  { a: 132.5, title: 'EVERYWHERE', sub: '2023\u2013NOW' },
  { a: 147.5, title: 'FINAL CHORUS', sub: '' },
  { a: 160, title: 'CURTAIN CALL', sub: '' },
];
const BANNERS = CHAPTERS.filter((c) => c.sub);

const WIPE_COLS: string[][] = [
  ['#e86a7e', '#eab04a'],
  ['#8ecae6', '#e8eff4'],
  ['#8a6fc7', '#3fa7a0'],
  ['#eab04a', '#e86a7e'],
  ['#3fa7a0', '#8a6fc7'],
  ['#e86a7e', '#8ecae6'],
  ['#c23b4e', '#eab04a'],
];

function yearPos(y: number) {
  return clamp((y - 1956) / (2026 - 1956));
}

function ribbon(t: number, ci: number) {
  const prev = [1956, 1968, 2011, 2022][ci];
  const cur = [1968, 2011, 2022, 2026][ci];
  const start = CHORUS_STARTS[ci];
  const k = ease(seg(t, start, start + 4));
  const x0 = 200;
  const x1 = W - 200;
  const y = 62;
  rr(x0 - 60, y - 34, x1 - x0 + 120, 68, 34, 'rgba(255,246,226,.82)', { sw: 3.5, lit: false, edge: 0 });
  line(x0, y, x1, y, 5, PAL.indigo);
  [1960, 1980, 2000, 2020].forEach((yr) => {
    const x = lerp(x0, x1, yearPos(yr));
    line(x, y - 14, x, y + 14, 4, PAL.indigo);
    letter(String(yr), x, y + 40, 26, PAL.indigo, { ink: false });
  });
  const mx = lerp(x0, x1, yearPos(lerp(prev, cur, k)));
  // painted progress
  line(x0, y, mx, y, 12, PAL.rose);
  bit(mx, y + 22, 3.6, { eyes: 'happy', mouth: 'grin', noShadow: true, noLegs: true, aL: 1.6, aR: 1.6 });
}

function banner(t: number, c: Chapter) {
  const age = t - c.a;
  if (age < 0.5 || age > 3.4) return;
  const k = backOut(seg(age, 0.5, 0.95)) * (1 - seg(age, 3.0, 3.4));
  if (k <= 0.01) return;
  g.save();
  g.translate(W / 2, 80);
  g.scale(k, k);
  g.font = `64px ${FONT}`;
  const w = Math.max(g.measureText(c.title).width, 400) + 120;
  poly([[-w / 2 - 30, -50], [w / 2 + 30, -50], [w / 2 + 6, 0], [w / 2 + 30, 50], [-w / 2 - 30, 50], [-w / 2 - 6, 0]], '#fff3da', { sw: 4, lit: false });
  letter(c.title, 0, -6, 58, PAL.indigo, { ink: false });
  letter(c.sub, 0, 30, 30, PAL.rose, { ink: false });
  g.restore();
}

function karaoke(t: number) {
  const l = lineAt(t);
  if (!l) return;
  const a = Math.min(seg(t, l.a - 0.15, l.a + 0.05), 1 - seg(t, l.b + 0.15, l.b + 0.5));
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  const size = 54;
  g.font = `${size}px ${FONT}`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  const w = g.measureText(l.text).width;
  const x0 = W / 2 - w / 2;
  const y = 1024;
  g.fillStyle = 'rgba(28,22,48,.74)';
  g.beginPath();
  g.roundRect(x0 - 46, y - 50, w + 92, 100, 50);
  g.fill();
  g.fillStyle = 'rgba(255,243,218,.62)';
  g.fillText(l.text, x0, y);
  // sung progress
  let chars = 0;
  for (const s of l.syl) {
    if (t >= s.b) chars = s.ci + s.len + (s.wordEnd ? 1 : 0);
    else if (t >= s.a) {
      chars = s.ci + s.len * seg(t, s.a, s.b);
      break;
    } else break;
  }
  chars = Math.min(chars, l.text.length);
  const f0 = Math.floor(chars);
  const w0 = g.measureText(l.text.slice(0, f0)).width;
  const w1 = g.measureText(l.text.slice(0, f0 + 1)).width;
  const wd = lerp(w0, w1, chars - f0);
  g.save();
  g.beginPath();
  g.rect(x0 - 6, y - 60, wd + 6, 120);
  g.clip();
  g.fillStyle = '#ffd24a';
  g.fillText(l.text, x0, y);
  g.restore();
  g.restore();
  g.globalAlpha = 1;
}

export function renderFrame(ctx: CanvasRenderingContext2D, t: number, scale: number, cw: number, ch: number) {
  t = clamp(t, 0, SONG_END - 0.001);
  beginFrame(ctx, t, scale);
  let i = 0;
  for (let k = 0; k < SHOTS.length; k++) if (SHOTS[k].a <= t) i = k;
  const shot = SHOTS[i];
  const end = i + 1 < SHOTS.length ? SHOTS[i + 1].a : SONG_END;
  bg(PAL.paper);
  shot.fn(t, t - shot.a, end - shot.a);
  // chorus ribbon
  const ci = CHORUS_STARTS.findIndex((s) => t >= s && t < s + 12.5);
  if (ci >= 0) ribbon(t, ci);
  // year stamp
  if (shot.year && t - shot.a > 0.15) {
    const k = backOut(seg(t - shot.a, 0.15, 0.55));
    g.save();
    g.translate(176, 74);
    g.scale(k, k);
    stamp(0, 0, shot.year, 46, -0.07, PAL.red, 0.88);
    g.restore();
  }
  for (const c of BANNERS) banner(t, c);
  // brush-stroke chapter wipes
  WIPES.forEach((w, idx) => {
    if (Math.abs(t - w) < 0.5) brushWipe(t, w, 0.9, WIPE_COLS[idx % WIPE_COLS.length]);
  });
  karaoke(t);
  if (t > SONG_END - 1.4) flash(seg(t, SONG_END - 1.4, SONG_END - 0.1), '#1b1030');
  finishFrame(cw, ch);
  void H;
  void ell;
  void BEAT;
}
