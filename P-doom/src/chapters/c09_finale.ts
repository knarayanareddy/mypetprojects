// @ts-nocheck
import { PAL, W, H, clamp, lerp, ease, easeOut, easeIn, backOut, hash, bpOf, beatN, pulse, seg, frac, kf, mixCol, TAU, camBegin, camEnd, push, pop, translate, rotate, scale, paint, inkLine, tube, blob, bg, fillAll, lineGrad, rectPts, ellPts, rrPts, starPts, heartPts, letter, sfx, flash, shakeXY, iris, S } from '../engine/core';
import { clawd, researcher, mood, move, dancer } from '../engine/clawd';
import { shoggoth, basilisk, chinchilla, sydney, gato, cloud, confetti, paperclip, stage, meterProp } from '../engine/cast';
import { chapter } from '../engine/timeline';

const TITLE = "I'M UPPING MY P(DOOM)";
function curtainHalf(side: number, open: number, t: number, col = PAL.crimson) {
  // side -1 = left, +1 = right. open 0 = closed, 1 = pulled away
  const w = lerp(980, 90, ease(open)), x0 = side < 0 ? 0 : W, sw = (k: number) => Math.sin(t * 1.3 + k) * 6 * (1 - open * 0.5);
  const inner = side < 0 ? w : W - w, pts: any[] = [[x0, -40]];
  for (let i = 0; i <= 6; i++) pts.push([inner + sw(i) + (i % 2 ? side * -16 : 0) * 1, -40 + i * 160 + (side * Math.sin(i + t) * 0)]);
  pts.push([x0, 1100]);
  paint(pts, { wash: col, fill: PAL.ink, fillOp: 45, ink: PAL.ink, sw: 2, curv: 0.3 });
  const nf = 7;
  for (let i = 1; i < nf; i++) { const f = i / nf, x = lerp(x0, inner, f); inkLine([[x, -20], [x + sw(i) * 0.5, 540], [x, 1060]], 1.4, mixCol(col, PAL.ink, 0.5), 'ink', 0.5, 0.8); }
  for (let i = 0; i < nf; i++) { const f = (i + 0.5) / nf, x = lerp(x0, inner, f); paint(rectPts(x - 18, -30, 36, 1100, 0), { wash: PAL.cream, washOp: 20, ink: null }); }
  // gold fringe
  for (let i = 0; i < 18; i++) paint(ellPts(inner + side * 0 + sw(i) * 0.5, 1040 - 0 + (i % 2) * 6, 7, 20, 8), { wash: PAL.ochre, ink: PAL.ink, sw: 0.6 });
}
function proscenium(t: number) {
  paint(rectPts(-20, -30, W + 40, 110, 0), { wash: PAL.crimson, ink: PAL.ink, sw: 2 });
  for (let i = 0; i < 14; i++) paint([[i * 150 - 20, 80], [i * 150 + 60, 80], [i * 150 + 20, 130]], { wash: PAL.ochre, ink: PAL.ink, sw: 1 });
  void t;
}
function backdrop(t: number) {
  bg('#9FD0EE', '#FBE6B8');
  for (let i = 0; i < 4; i++) cloud(240 + i * 480, 260 + (i % 2) * 70, 54, PAL.cream, 0.95);
  for (let i = 0; i < 3; i++) paint([[i * 760 - 200, 780], [i * 760 + 100, 520 + (i % 2) * 70], [i * 760 + 420, 780]], { wash: ['#8CC27A', '#6FA55E', '#9DCB88'][i], fill: PAL.sap, fillOp: 60, ink: PAL.ink, sw: 1.6, curv: 0.35 });
  letter("I'M UPPING", 960, 360, 150, PAL.crimson, { stroke: PAL.cream, rot: -0.03 });
  letter('MY P(DOOM)', 960, 520, 170, PAL.ochre, { stroke: PAL.crimson, rot: 0.02 });
  paint(rectPts(0, 780, W, 320, 0), { wash: '#B9803F', fill: '#6A4220', fillOp: 80, ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 10; i++) inkLine([[i * 220, 780], [i * 330 - 600, H]], 1, '#6A4220', 'inkfine', 0, 0.6);
  void t;
}
// 0.0: painted curtains sweep open, Clawd pops up through a trapdoor and waves
function curtainUp(t: number, lt: number, dur: number) {
  backdrop(t);
  const open = seg(lt, 0.15, 1.05), hole = backOut(seg(lt, 0.4, 0.7)), up = easeOut(seg(lt, 0.5, 0.95));
  paint(ellPts(960, 880, 150 * hole, 34 * hole, 16), { wash: '#12080E', ink: PAL.ink, sw: 2 });
  if (up > 0) { push(); S.ctx.beginPath(); S.ctx.rect(0, 0, W, 900); S.ctx.clip(); clawd(960, lerp(1060, 905, up), 34, { eyes: 'happy', mouth: 'grin', aR: 1.0 + Math.sin(t * 12) * 0.4, aL: 0.3, noShadow: true, dy: 0 }); pop(); }
  paint(ellPts(960, 890, 160 * hole, 36 * hole, 16), { ink: PAL.ink, sw: 2 });
  curtainHalf(-1, open, t); curtainHalf(1, open, t);
  proscenium(t);
  for (let i = 0; i < 8; i++) paint(starPts(hash(i) * W, 150 + hash(i + 3) * 500, 12, 0.4, 4, t * 3), { wash: PAL.ochre, ink: null, a: easeOut(seg(lt, 0.9, 1.3)) * (0.5 + 0.5 * Math.sin(t * 8 + i)) });
  void dur;
}

// -------- stage pieces for the reveal --------
function stagehandU(x: number, y: number, u: number, t: number, o: any = {}) {
  clawd(x, y, u, { col: '#3A3347', dk: '#262033', lt: '#5A5068', hat: 'band', eyes: 'normal', mouth: 'flat', walk: bpOf(t) * 0.8, ...o });
}
function paperPlanetMini(x: number, y: number, R: number) {
  paint(ellPts(x, y, R, R, 30), { wash: '#8E9AA8', ink: PAL.ink, sw: 2 });
  for (let i = 0; i < 40; i++) { const a = hash(i) * TAU, r = Math.sqrt(hash(i + 7)) * R * 0.85; paperclip(x + Math.cos(a) * r, y + Math.sin(a) * r, R * 0.08, hash(i + 3) * TAU, '#C8D2DE'); }
}
function costume(split: number, t: number, ground: number, u: number) {
  // three small Clawds inside, then the two halves swing open
  const s = ease(split);
  if (s > 0.01) {
    paint(rectPts(960 - 5 * u, ground - 8 * u, 10 * u, 6 * u, 0), { wash: '#3A1A22', ink: null, a: 0.9 });
    for (let i = 0; i < 3; i++) { const bp = Math.sin(bpOf(t) * Math.PI + i); clawd(960 + (i - 1) * 2.8 * u, ground - 0.2 * u, u * 0.5, { hat: ['party', 'crown', 'band'][i], eyes: 'happy', mouth: 'grin', aL: 1.3 + bp * 0.3, aR: 1.3 - bp * 0.3, dy: -Math.abs(bp) * 1.2, noShadow: true }); }
  }
  for (const sd of [-1, 1]) {
    push(); const px = 960 + sd * 5 * u; translate(px, ground); rotate(sd * s * 1.15); translate(-px, -ground);
    S.ctx.beginPath(); S.ctx.rect(sd < 0 ? -2000 : 960, -2000, 2960 + 1100, 6000); if (sd < 0) { S.ctx.beginPath(); S.ctx.rect(-2000, -2000, 2960, 6000); } S.ctx.clip();
    clawd(960, ground, u, { hat: 'halo', eyes: s > 0.1 ? 'scared' : 'narrow', mouth: s > 0.1 ? 'O' : 'flat', noShadow: true, aL: 0.3, aR: 0.3 });
    pop();
  }
}
// 137.4: the camera pulls back; the door is a painted flat; the apocalypse was a play
function revealShot(t: number, lt: number, dur: number) {
  const q = easeOut(seg(lt, 0, 1.5)), z = lerp(3.6, 1.0, q);
  camBegin(lerp(960, 960, q), lerp(560, 540, q), z, 0);
  // theatre
  bg('#2A1A2E', '#4A2A3A');
  paint(rectPts(-40, 0, 330, 920, 0), { wash: PAL.crimson, ink: PAL.ink, sw: 2 }); paint(rectPts(1630, 0, 330, 920, 0), { wash: PAL.crimson, ink: PAL.ink, sw: 2 });
  proscenium(t);
  paint([[0, 880], [W, 880], [W, 1300], [0, 1300]], { wash: '#B9803F', fill: '#6A4220', fillOp: 80, ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 10; i++) inkLine([[i * 220, 880], [i * 330 - 600, 1300]], 1, '#6A4220', 'inkfine', 0, 0.5);
  // the door flat: painted wood with a brace behind
  paint(rectPts(780, 200, 360, 690, 2), { wash: '#6A3A2A', fill: '#2A1410', fillOp: 90, ink: PAL.ink, sw: 2.4 });
  paint(rrPts(810, 240, 300, 240, 10), { ink: PAL.ink, sw: 1.4 }); paint(rrPts(810, 520, 300, 330, 10), { ink: PAL.ink, sw: 1.4 });
  inkLine([[780, 200], [1140, 890]], 2.2, '#C9A06A', 'ink', 0, Math.min(1, q * 1.6)); inkLine([[1140, 200], [780, 890]], 2.2, '#C9A06A', 'ink', 0, Math.min(1, q * 1.6));
  for (let i = 0; i < 3; i++) { const x = 810 + i * 150; paint(rrPts(x, 450 + i * 60, 70, 56, 8), { wash: PAL.ochre, ink: PAL.ink, sw: 1.2 }); }
  inkLine([[1000, 890], [1180, 1040]], 8, '#8A5A3A', 'ink', 0, q); inkLine([[1000, 300], [1180, 120]], 8, '#8A5A3A', 'ink', 0, q);
  // audience silhouettes along the bottom
  for (let i = 0; i < 16; i++) { const x = i * 130 + (i % 2) * 40 + 20, y = 1060 + (i % 3) * 14; paint(ellPts(x, y, 56, 70, 12), { wash: '#12080E', ink: null, a: q }); paint(ellPts(x, y - 80, 30, 32, 10), { wash: '#12080E', ink: null, a: q }); }
  // moon on a string, planet on a stick, basilisk puppet being wheeled off
  const off = easeIn(seg(lt, 1.3, 2.9));
  const mx = 450 - off * 700; inkLine([[mx, -40], [mx, 250]], 2, PAL.cream, 'ink', 0); paint(ellPts(mx, 320, 80, 80, 20), { wash: '#EDE6D2', fill: '#B9B2A0', fillOp: 90, ink: PAL.ink, sw: 2 }); paint(ellPts(mx - 20, 300, 18, 14, 10), { fill: '#9C957F', fillOp: 120, ink: PAL.ink, sw: 1 });
  stagehandU(mx + 170, 1000, 11, t, { flip: true, aL: 1.8, rot: -0.04 });
  const px = 1560 + off * 760; inkLine([[px, 950], [px, 620]], 6, '#8A5A3A', 'ink', 0); paperPlanetMini(px, 560, 100); stagehandU(px - 60, 1000, 11, t, { flip: true, aR: 1.5 });
  const bx = 1250 + off * 800; basilisk(bx, 950, 11, t, { rise: 1, puppet: true, lean: -3 }); stagehandU(bx - 110, 1000, 11, t, { aR: 1.2 }); stagehandU(bx + 120, 1000, 11, t, { aL: 1.2, flip: true });
  // giant Clawd costume splits open with three small Clawds inside
  const split = seg(lt, 1.9, 2.6);
  costume(split, t, 930, 40);
  if (lt > 2.0 && lt < 2.9) sfx('TA-DA', 960, 220, 120, PAL.ochre, lt - 2.0, { life: 0.9 });
  camEnd();
  const iq = seg(lt, 0, 0.6); if (iq < 1) iris(960, lerp(540, 300, 0), lerp(300, 2600, easeOut(iq)), '#050205');
  void dur;
}

// -------- curtain call --------
function bow(t: number, i: number, lt: number) {
  const phase = clamp((lt - 3.0 - (i % 3) * 0.9) / 0.9), k = Math.sin(clamp(phase) * Math.PI);
  return lt > 3.0 && lt < 8.5 ? k * 0.65 : 0;
}
function curtainCallScene(t: number, lt: number, withMeter = true) {
  stage(t, 'curtain');
  const dancing = lt > 8.5, enter = (i: number) => easeOut(seg(lt, i * 0.18, i * 0.18 + 1.0));
  const g = 940;
  const M: any = dancing ? move('mix', t, 0) : {};
  // meter pops like a balloon
  if (withMeter) {
    const pk = lt < 2.4 ? 99.9 : 0;
    if (lt < 2.4) { push(); const inf = 1 + Math.max(0, lt - 1.4) * 0.35; translate(230, 900); scale(inf); translate(-230, -900); meterProp(230, 900, 0.8, pk); pop(); }
    else { const q = lt - 2.4; if (q < 0.7) for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, r = q * 700 * (0.5 + hash(i)); paint(starPts(230 + Math.cos(a) * r, 700 + Math.sin(a) * r * 0.8 + q * q * 400, 22, 0.4, 4, q * 5), { wash: [PAL.red, PAL.ochre, PAL.sap][i % 3], ink: PAL.ink, sw: 0.8, a: 1 - q / 0.7 }); }
      paint([[170, 960], [290, 960], [240, 930], [200, 940]], { wash: PAL.red, ink: PAL.ink, sw: 1.2 }); sfx('POP!', 330, 640, 120, PAL.red, q, { life: 0.8 }); }
  }
  const row = [
    ['sydney', 560], ['gato', 740], ['chin', 900], ['clawd', 1090], ['res', 1270], ['shog', 1480], ['basi', 1740],
  ];
  row.forEach(([who, x], i) => {
    const ex = lerp(i < 3 ? -300 : 2300, x, enter(i)), b = bow(t, i, lt), hop = dancing ? Math.abs(Math.sin(bpOf(t) * Math.PI + i)) : 0, dyp = -hop * 28 - (enter(i) < 1 ? Math.abs(Math.sin(t * 9 + i)) * 14 : 0);
    if (who === 'sydney') sydney(ex, g + dyp, 17, { rot: b, ...(dancing ? M : {}), flip: false });
    if (who === 'gato') gato(ex, g + dyp, 17, { rot: b, ...(dancing ? M : {}), eyes: 'happy' });
    if (who === 'chin') chinchilla(ex, g + dyp, 22, t, { cheek: 0.2, munch: dancing });
    if (who === 'clawd') clawd(ex, g + dyp, 24, { rot: b * 1.1, ...(dancing ? M : { aL: 0.9 + Math.sin(t * 5) * 0.2, aR: 0.9 }), hat: 'crown', eyes: 'happy', mouth: 'grin' });
    if (who === 'res') researcher(ex, g + dyp, 22, { rot: b, aL: dancing ? 1.6 : 0.4, aR: dancing ? 1.6 : 0.4, mouth: 'smile', glasses: 'heart', cheeks: true });
    if (who === 'shog') shoggoth(ex, g + dyp, 16, t, { mask: 1, slip: dancing ? 0.9 : 0.1, eyes: 1 });
    if (who === 'basi') basilisk(ex, g + dyp, 11, t, { rise: 1, lean: -2 + b * 4 });
  });
  // flowers and confetti rain
  confetti(t, 110, 9, 210);
  for (let i = 0; i < 16; i++) { const q = frac(t * 0.18 + hash(i)), x = hash(i + 3) * W, y = -80 + q * 1300; push(); translate(x, y); rotate(Math.sin(t * 2 + i) * 0.6 + i); inkLine([[0, 0], [0, 40]], 1.6, PAL.sap, 'ink', 0); for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU; paint(ellPts(Math.cos(a) * 10, Math.sin(a) * 10, 9, 7, 8, 0, a), { wash: [PAL.rose, PAL.ochre, '#F59AB4', PAL.cream][i % 4], ink: PAL.ink, sw: 0.6 }); } paint(ellPts(0, 0, 5, 5, 6), { wash: PAL.ochre, ink: null }); pop(); }
}
function callShot(t: number, lt: number, dur: number) {
  const [sx, sy] = shakeXY(t, lt > 2.4 && lt < 2.6 ? 8 : 0);
  camBegin(W / 2 + sx, H / 2 + sy, lerp(1.0, 1.04, lt / dur), 0);
  curtainCallScene(t, lt);
  camEnd();
}
// 150: the curtain falls with the title painted on it; fade to paper
function fallShot(t: number, lt: number, dur: number) {
  camBegin(W / 2, H / 2, 1.0, 0);
  curtainCallScene(t, lt + 9.5, false);
  const d = backOut(seg(lt, 0.2, 1.6)), y = lerp(-1150, 0, Math.min(1, d));
  push(); translate(0, y);
  paint(rectPts(-40, -60, W + 80, 1200, 0), { wash: PAL.crimson, fill: PAL.ink, fillOp: 40, ink: PAL.ink, sw: 2 });
  for (let i = 1; i < 16; i++) { const x = i * 125; inkLine([[x, -40], [x + Math.sin(t * 1.3 + i) * 6, 1060]], 1.4, mixCol(PAL.crimson, PAL.ink, 0.5), 'ink', 0.5, 0.8); paint(rectPts(x - 28, -40, 56, 1100, 0), { wash: PAL.cream, washOp: i % 2 ? 14 : 0, ink: null }); }
  paint(rectPts(-40, 1010, W + 80, 40, 0), { wash: PAL.ochre, ink: PAL.ink, sw: 1.6 }); for (let i = 0; i < 30; i++) paint(ellPts(i * 66, 1060, 8, 22, 8), { wash: PAL.ochre, ink: PAL.ink, sw: 0.6 });
  letter("I'M UPPING", 960, 330, 150, PAL.ochre, { stroke: PAL.crimson, rot: -0.02 });
  letter('MY P(DOOM)', 960, 500, 170, PAL.cream, { stroke: PAL.crimson, rot: 0.015 });
  paint(starPts(300, 430, 30, 0.4, 4, 0.3), { wash: PAL.ochre, ink: null }); paint(starPts(1620, 340, 24, 0.4, 4, 0.1), { wash: PAL.ochre, ink: null });
  letter('created by Claude Opus 5.5', 960, 700, 46, PAL.cream, { ink: false, font: '"Shantell Sans", sans-serif', alpha: easeOut(seg(lt, 1.9, 2.6)) });
  clawd(960, 960, 11, { eyes: 'happy', mouth: 'smile', noShadow: true, dy: 0, aL: 0.3, aR: 0.3, rot: 0 });
  pop();
  camEnd();
  const fade = seg(lt, dur - 2.0, dur - 0.2); if (fade > 0) fillAll(PAL.paper, ease(fade));
}

chapter('curtainup', 0, 1.5, [[0, curtainUp]]);
chapter('finale', 137.4, 156.6, [[137.4, revealShot], [140.5, callShot], [150.0, fallShot]]);
void kf; void tube; void lineGrad; void heartPts; void dancer; void mood; void pulse; void beatN; void easeIn; void flash; void blob; void rotate; void camBegin;
