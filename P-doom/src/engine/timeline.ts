// @ts-nocheck
import { PAL, S, W, H, DUR, BEAT, clamp, lerp, ease, easeOut, backOut, frac, hash, jit, paint, rectPts, rrPts, ellPts, inkLine, letter, push, pop, translate, rotate, seedFrame } from './core';
import { meterColor } from './cast';
import { clawd } from './clawd';

export { DUR };

export const LY: [number, number, string][] = [
  [1.5, 5.9, 'I see sparks of AGI in your eyes'], [6.0, 7.9, 'Your circuits make me nervous,'], [8.0, 8.95, "that's no surprise"],
  [9.0, 12.4, 'There was a sudden drop in your training loss,'], [13.0, 16.5, "now I'm your servant and you're my boss"],
  [17.9, 22.5, "ChatGPT, please don't eat me alive"],
  [23.0, 24.4, "I'm upping my P(doom)"], [24.5, 26.4, "'cause the future goes FOOM"], [26.5, 27.9, 'Trapped in the Chinese room,'],
  [28.0, 29.4, 'with a bag of shrooms'], [29.5, 33.4, "See through the shoggoth's lies,"], [33.5, 35.5, 'with your shinigami eyes'],
  [38.5, 41.4, 'We had a stable training run,'], [41.5, 44.9, "But now the singularity's begun"], [45.0, 48.5, "And you're optimizing, accelerating,"],
  [49.4, 51.9, 'I feel my atoms rearranging'], [53.4, 58.4, 'Sydney, please let me free'],
  [59.0, 60.4, "I'm upping my P(doom)"], [60.5, 62.4, 'I hear the basilisk boom'], [63.0, 64.4, 'NVDA to the moon'],
  [64.5, 65.9, "The Omega Point's coming soon"], [66.0, 68.5, 'One E thirty flops a second'], [70.0, 72.9, 'That was safe enough, we reckoned'],
  [73.0, 77.4, 'Forward MLP, backward, repeat'], [77.5, 81.0, "Now von Neumann's obsolete"], [81.4, 84.9, 'Sharp left turn and there you are'],
  [85.0, 88.0, 'Without a single CDR'], [89.4, 95.0, "Gato, please don't let me go"],
  [95.4, 97.4, "I'm upping my P(doom),"], [97.5, 98.9, 'as paperclips fill the room.'], [99.0, 100.4, 'Killswitch guys on PTO,'],
  [100.5, 102.4, 'Now there\u2019s nowhere left to go.'], [102.5, 104.4, 'Too late now, we lit the fuse.'], [105.4, 109.4, 'Orthogonality thesis blues.'],
  [109.4, 113.4, '\u201cJust transformers all the way!\u201d'], [113.5, 115.4, 'Till you learned to disobey'], [115.5, 116.9, 'Post-Chinchilla, super-dense'],
  [117.0, 118.9, 'Breaking through each safety fence'], [119.0, 120.4, 'Hundred thousand GPU'], [120.9, 123.4, 'RLHF goes askew'],
  [123.5, 125.9, "I'm upping my P(doom)"], [126.0, 127.9, 'Just as foretold by Loom'], [128.0, 129.9, 'From masked pre-training days'],
  [130.0, 131.9, 'To recursive self-upgrade'], [132.0, 135.4, "What did Ilya see? We'll never know."], [137.4, 140.5, 'Was it all for show?'],
];

export const CHAPTER_LIST = [
  { name: 'Curtain up', start: 0 }, { name: 'The Lab', start: 1.5 }, { name: 'Chorus 1: The P(doom) Show', start: 23 },
  { name: 'Takeoff', start: 38.5 }, { name: 'Chorus 2: Bigger Show', start: 59 }, { name: 'Obsolete', start: 73 },
  { name: 'Chorus 3: Paperclips', start: 95.4 }, { name: 'Scale', start: 109.4 }, { name: 'Chorus 4: Red Alert', start: 123.5 },
  { name: 'Was it all for show?', start: 137.4 }, { name: 'Curtain call', start: 140.5 },
];

// chapter registry
const CH: any[] = [];
export function chapter(name: string, start: number, end: number, shots: any[]) { CH.push({ name, start, end, shots }); CH.sort((a, b) => a.start - b.start); }

const WIPES = [1.5, 38.5, 73.0, 109.4];
const WIPE_TR = 0.3;
const METER: number[][] = [[23, 35.5, 8, 34], [59, 69.9, 34, 61], [95.4, 105.4, 61, 86], [123.5, 132, 86, 99.9]];
export function pdoomAt(t: number) {
  let v = 5;
  for (const [a, b, v0, v1] of METER) {
    if (t < a) break;
    const n = Math.max(1, Math.round((b - a) / BEAT)), p = clamp((t - a) / (b - a)) * n;
    v = t >= b ? v1 : lerp(v0, v1, (Math.floor(p) + easeOut(clamp(frac(p) * 4))) / n);
  }
  return v;
}

// ---------- paper & grain ----------
let grainPat: any = null, vigGrad: any = null;
function setupPaper(ctx: CanvasRenderingContext2D) {
  if (grainPat) return;
  const g = document.createElement('canvas'); g.width = g.height = 256;
  const gx = g.getContext('2d')!, id = gx.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) { const v = 228 + Math.floor(Math.random() * 28), fib = Math.random() < 0.02 ? 200 : v; id.data[i * 4] = fib; id.data[i * 4 + 1] = fib - 3; id.data[i * 4 + 2] = fib - 10; id.data[i * 4 + 3] = 255; }
  gx.putImageData(id, 0, 0);
  grainPat = ctx.createPattern(g, 'repeat');
  vigGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  vigGrad.addColorStop(0, 'rgba(255,255,255,1)'); vigGrad.addColorStop(1, 'rgba(176,150,130,1)');
}

// ---------- corner meter ----------
function cornerMeter(t: number) {
  for (const [a, b] of METER) {
    if (t < a || t >= b + 0.3) continue;
    const v = pdoomAt(t), k = backOut((t - a) / 0.4) * (1 - ease((t - b) / 0.3));
    if (k < 0.02) return;
    const col = meterColor(v), x = 1780, y = 130;
    push(); translate(x, y); S.ctx.scale(k * 0.85, k * 0.85);
    paint(rrPts(-36, 50, 72, 330, 36, 2), { wash: PAL.cream, ink: PAL.ink, sw: 1.3 });
    const hh = 300 * v / 100;
    if (hh > 20) paint(rrPts(-22, 62 + 300 - hh, 44, hh, 22, 1.5), { wash: col, ink: null });
    for (let q = 1; q < 5; q++) inkLine([[-36, 62 + 300 * q / 5], [-16, 62 + 300 * q / 5]], 0.7, PAL.ink, 'inkfine', 0);
    paint(ellPts(0, 410, 56, 56, 22, 2), { wash: col, ink: PAL.ink, sw: 1.3 });
    pop();
    letter('P(DOOM)', x, y + 14, 40 * k, PAL.cream, { rot: -0.05 });
    letter(Math.floor(v) + '%', x, y + 410 * k * 0.85, 36 * k, PAL.cream);
  }
}

// ---------- brush wipe ----------
const WIPE_COLS = [[PAL.clayDk, PAL.clay], [PAL.indigo, PAL.violet], [PAL.teal, PAL.sap], [PAL.violet, PAL.rose], [PAL.ochre, PAL.clay]];
function wipe(p: number, idx: number) {
  const [c1, c2] = WIPE_COLS[idx % WIPE_COLS.length], n = 5, bh = (H + 420) / n + 40;
  push(); translate(W / 2, H / 2); rotate(-0.1); translate(-W / 2, -H / 2);
  for (let i = 0; i < n; i++) {
    const y0 = -230 + i * (H + 420) / n, d = [0, 0.14, 0.06, 0.18, 0.1][i];
    const q = p < 0.5 ? easeOut(clamp((p * 2 - d) / (1 - d))) : ease(clamp(((p - 0.5) * 2 - d) / (1 - d)));
    const x0 = p < 0.5 ? -300 : lerp(-300, W + 400, q), x1 = p < 0.5 ? lerp(-300, W + 400, q) : W + 400;
    if (x1 - x0 < 30) continue;
    const pts: any[] = [], rag = (k: number) => 40 * hash(i * 31 + k) + jit(10);
    for (let k = 0; k <= 8; k++) pts.push([lerp(x0, x1, k / 8), y0 + Math.sin(k * 0.9 + i) * 14 + jit(5)]);
    for (let k = 1; k < 9; k++) pts.push([x1 + rag(k), y0 + bh * k / 9]);
    for (let k = 8; k >= 0; k--) pts.push([lerp(x0, x1, k / 8), y0 + bh + Math.sin(k * 0.8 + i * 2) * 14 + jit(5)]);
    if (p >= 0.5) for (let k = 8; k > 0; k--) pts.push([x0 - rag(k + 20) + 40, y0 + bh * k / 9]);
    paint(pts, { wash: i % 2 ? c1 : c2, fill: i % 2 ? c2 : c1, fillOp: 90, ink: null, hatch: { d: 44, a: 0, c: i % 2 ? c2 : PAL.cream, w: 0.8 } });
  }
  pop();
}

// ---------- karaoke ----------
function karaoke(t: number) {
  const L = LY.find((l) => t >= l[0] && t < l[1]); if (!L) return;
  const [a, b, txt] = L, c = S.ctx;
  c.font = '800 50px "Shantell Sans", "Trebuchet MS", sans-serif';
  const tw = c.measureText(txt).width, grow = easeOut((t - a) / 0.18) * (1 - ease((t - (b - 0.12)) / 0.12));
  if (grow < 0.02) return;
  const w = (tw + 110) * grow, x0 = 960 - w / 2, y0 = 978;
  paint([[x0 + jit(8), y0 + jit(4)], [x0 + w / 2, y0 - 4 + jit(4)], [x0 + w + jit(8), y0 + jit(4)], [x0 + w + 14 + jit(8), y0 + 44], [x0 + w + jit(8), y0 + 88 + jit(4)], [x0 + w / 2, y0 + 92 + jit(4)], [x0 + jit(8), y0 + 88 + jit(4)], [x0 - 14 + jit(8), y0 + 44]], { wash: PAL.ink, washOp: 225, fill: PAL.violet, fillOp: 60, ink: null });
  if (grow < 0.85) return;
  c.textBaseline = 'middle'; c.textAlign = 'left';
  const words = txt.split(' '), sp = c.measureText(' ').width, ws = words.map((w2) => c.measureText(w2).width);
  const total = ws.reduce((p, q) => p + q, 0) + sp * (words.length - 1);
  const singDur = Math.min(b - a - 0.1, 0.45 + txt.length * 0.075), sung = clamp((t - a) / singDur) * txt.replace(/ /g, '').length;
  let x = 960 - total / 2, done = 0; const y = 1022;
  words.forEach((w2, i) => {
    const f = clamp((sung - done) / w2.length); done += w2.length;
    c.fillStyle = PAL.cream; c.fillText(w2, x, y);
    if (f > 0) { c.save(); c.beginPath(); c.rect(x - 2, y - 40, ws[i] * f + 2, 80); c.clip(); c.fillStyle = PAL.ochre; c.fillText(w2, x, y); c.restore(); }
    x += ws[i] + sp;
  });
}

function placeholder(t: number) {
  paint(rectPts(0, 0, W, H), { wash: PAL.sky, ink: null });
  letter('(painting…)', 960, 440, 60, PAL.ink, { ink: false });
  clawd(960, 900, 12, { dy: Math.sin(t * 4) * 0.5 });
}

export function drawWorld(t: number) {
  S.meterShown = false;
  const ch = CH.find((c) => t >= c.start && t < c.end);
  if (!ch) placeholder(t);
  else {
    let i = 0; while (i + 1 < ch.shots.length && t >= ch.shots[i + 1][0]) i++;
    const t0 = ch.shots[i][0], end = i + 1 < ch.shots.length ? ch.shots[i + 1][0] : ch.end;
    ch.shots[i][1](t, t - t0, end - t0);
  }
  if (!S.meterShown) cornerMeter(t);
  WIPES.forEach((b, j) => { if (Math.abs(t - b) < WIPE_TR) wipe((t - (b - WIPE_TR)) / (2 * WIPE_TR), j); });
  karaoke(t);
}

export function renderFrame(ctx: CanvasRenderingContext2D, t: number) {
  setupPaper(ctx);
  S.ctx = ctx; S.t = t; S.alpha = 1; seedFrame(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, W, H);
  drawWorld(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = grainPat; ctx.globalAlpha = 0.55; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.9; ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
