// @ts-nocheck
import { PAL, W, H, clamp, lerp, ease, easeOut, easeIn, backOut, hash, bpOf, beatN, pulse, seg, frac, kf, mixCol, TAU, BEAT, jit, shakeXY, camBegin, camEnd, push, pop, translate, rotate, scale, paint, inkLine, tube, blob, bg, fillAll, rectPts, ellPts, rrPts, starPts, heartPts, letter, sfx, flash, iris, S } from '../engine/core';
import { clawd, researcher, mood, move } from '../engine/clawd';
import { mug, jaws, speedLines } from '../engine/cast';
import { chapter } from '../engine/timeline';

const MX = 960, MY = 430;

function lab(t: number) {
  bg('#1F2550', '#2F3C7A', '#3B3560');
  // window with moon
  paint(rrPts(140, 120, 300, 360, 14), { wash: '#12163A', ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 14; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2); paint(starPts(165 + hash(i) * 250, 150 + hash(i + 9) * 150, 5 + tw * 4, 0.3, 4), { wash: PAL.cream, washOp: 150 + tw * 100, ink: null }); }
  paint(ellPts(350, 240, 44, 44, 20), { wash: PAL.cream, ink: null }); paint(ellPts(335, 225, 40, 40, 20), { wash: '#12163A', washOp: 150, ink: null });
  inkLine([[290, 120], [290, 480]], 2, PAL.ink, 'ink', 0); inkLine([[140, 300], [440, 300]], 2, PAL.ink, 'ink', 0);
  paint(rectPts(120, 480, 340, 26, 2), { wash: '#6B4B3A', ink: PAL.ink, sw: 1.2 });
  // shelves & books
  for (let r = 0; r < 3; r++) {
    const y = 250 + r * 150;
    for (let i = 0; i < 9; i++) { const bh = 70 + hash(i + r * 7) * 40, bw = 28 + hash(i * 3 + r) * 12; paint(rectPts(1450 + i * 44, y - bh, bw, bh, 1), { wash: [PAL.rose, PAL.teal, PAL.ochre, PAL.violet, PAL.sap][(i + r) % 5], washOp: 230, ink: PAL.ink, sw: 0.9 }); }
    paint(rectPts(1430, y, 450, 18, 1), { wash: '#6B4B3A', ink: PAL.ink, sw: 1.1 });
  }
  // desk
  paint([[0, 760], [W, 760], [W, H + 20], [0, H + 20]], { wash: '#5A3A2E', fill: '#2B1A18', fillOp: 90, ink: PAL.ink, sw: 1.5 });
  inkLine([[0, 760], [W, 760]], 2.4, PAL.ink, 'ink', 0);
  // lamp
  blob(1640, 520, 520, PAL.ochre, 90 + Math.sin(t * 7) * 5);
  inkLine([[1640, 760], [1600, 560], [1690, 440]], 4, PAL.ink, 'ink', 0.6);
  paint([[1650, 430], [1760, 470], [1700, 530], [1620, 480]], { wash: PAL.ochre, ink: PAL.ink, sw: 1.4 });
}

function circuits(t: number, prog: number, ox: number, oy: number, n = 9, col = '#5FE0D6') {
  for (let i = 0; i < n; i++) {
    const pts: any[] = [[ox, oy]]; let x = ox, y = oy, dir = hash(i * 3.3) * TAU;
    for (let k = 0; k < 9; k++) { dir = Math.round((dir + (hash(i * 7 + k) - 0.5) * 2.4) / (Math.PI / 4)) * (Math.PI / 4); const L = 90 + hash(i * 11 + k) * 120; x += Math.cos(dir) * L; y += Math.sin(dir) * L; pts.push([x, y]); }
    const tot = pts.length - 1, f = clamp(prog * 1.2 - hash(i) * 0.2) * tot;
    const draw: any[] = [pts[0]];
    for (let k = 1; k <= Math.ceil(f) && k < pts.length; k++) { const a = pts[k - 1], b = pts[k], q = Math.min(1, f - (k - 1)); draw.push([lerp(a[0], b[0], q), lerp(a[1], b[1], q)]); }
    if (draw.length > 1) {
      inkLine(draw, 4.5, '#1B6B66', 'ink', 0, 0.9); inkLine(draw, 2.2, col, 'ink', 0);
      for (let k = 1; k < draw.length; k++) paint(ellPts(draw[k][0], draw[k][1], 7, 7, 8), { wash: col, ink: PAL.ink, sw: 0.7 });
    }
  }
}

function monitor(t: number, content: any, glow = 1) {
  blob(MX, MY, 560, '#5FE0D6', 70 * glow);
  paint(rrPts(MX - 340, MY - 260, 680, 520, 40, 2), { wash: '#D8CBB0', fill: '#8F7F66', fillOp: 70, ink: PAL.ink, sw: 1.8 });
  paint([[MX - 120, MY + 255], [MX + 120, MY + 255], [MX + 170, 770], [MX - 170, 770]], { wash: '#BDAE92', ink: PAL.ink, sw: 1.5 });
  paint(rrPts(MX - 480, 780, 960, 56, 14), { wash: '#CFC3A8', ink: PAL.ink, sw: 1.4 });
  for (let i = 0; i < 20; i++) paint(rectPts(MX - 450 + i * 46, 790, 36, 14, 0), { wash: PAL.cream, ink: PAL.ink, sw: 0.5 });
  const sx = MX - 290, sy = MY - 215, sw2 = 580, sh = 430;
  paint(rrPts(sx, sy, sw2, sh, 30, 1), { wash: '#0E2E36', ink: PAL.ink, sw: 1.6 });
  const c = S.ctx; c.save(); c.beginPath(); c.roundRect(sx, sy, sw2, sh, 30); c.clip();
  blob(MX, MY, 340, '#5FE0D6', 90 * glow);
  content && content();
  for (let y = sy; y < sy + sh; y += 10) { c.globalAlpha = 0.07; c.fillStyle = '#000'; c.fillRect(sx, y, sw2, 3); }
  c.globalAlpha = 1; c.restore();
  paint(ellPts(MX - 190, MY - 140, 80, 28, 12, 0, -0.5), { wash: PAL.cream, washOp: 60, ink: null });
  paint(ellPts(MX + 290, MY + 225, 9, 9, 8), { wash: PAL.sap, ink: null });
}

function chair(x: number, y: number, s: number, sx = 1, back = true, col = '#3C4A6B') {
  push(); translate(x, y); scale(sx * s, s);
  for (let i = -2; i <= 2; i++) { inkLine([[0, -4], [i * 5, 0]], 1.4, PAL.ink, 'ink', 0); paint(ellPts(i * 5.2, 1, 1.4, 1.4, 8), { wash: PAL.ink, ink: null }); }
  paint(rectPts(-0.9, -9, 1.8, 6, 0), { wash: '#555', ink: PAL.ink, sw: 0.6 });
  paint(rrPts(-7, -12, 14, 4, 1.8), { wash: col, ink: PAL.ink, sw: 0.8 });
  if (back) paint(rrPts(-6, -28, 12, 16, 3), { wash: col, fill: PAL.violet, fillOp: 60, ink: PAL.ink, sw: 0.8 });
  pop();
}
function researcherBack(x: number, y: number, s: number) {
  paint([[x - 2.6 * s, y - 9 * s], [x + 2.6 * s, y - 9 * s], [x + 3.4 * s, y - 3.4 * s], [x - 3.4 * s, y - 3.4 * s]], { wash: PAL.cream, fill: PAL.indigo, fillOp: 80, ink: PAL.ink, sw: 1.4 });
  paint(ellPts(x, y - 11.4 * s, 2.6 * s, 2.7 * s, 20), { wash: '#4A3A44', ink: PAL.ink, sw: 1.4 });
  for (let i = 0; i < 9; i++) { const a = -Math.PI + (i / 8) * Math.PI; inkLine([[x + Math.cos(a) * 2.2 * s, y - 11.4 * s + Math.sin(a) * 2.2 * s], [x + Math.cos(a) * 3.2 * s, y - 11.4 * s + Math.sin(a) * 3.3 * s]], 1.2, '#4A3A44', 'ink', 0); }
  paint(ellPts(x - 2.6 * s, y - 11.4 * s, 0.6 * s, 0.9 * s, 8), { wash: '#F6D2B0', ink: PAL.ink, sw: 0.6 });
}

// ---- shot 1: tiny Clawd asleep, then eyes blink open ----
function sleepShot(t: number, lt: number, dur: number) {
  const p = lt / dur;
  camBegin(lerp(800, 940, ease(p)), lerp(600, 470, ease(p)), lerp(1, 1.5, ease(p)), 0);
  lab(t);
  const m = mood(lt, [[0, 'closed', 'zzz'], [1.4, 'normal', '!']]);
  monitor(t, () => { clawd(MX, MY + 130, 15, { ...m, mouth: lt < 1.4 ? 'o' : 'smile', sq: Math.sin(t * 2.5) * 0.03, aL: 0.15, aR: 0.15 }); });
  researcherBack(300, 1090, 52);
  chair(300, 1090, 14, 1, true);
  camEnd();
}
// ---- shot 2: push into the face, eyes become stars, sparks burst out ----
function sparksShot(t: number, lt: number, dur: number) {
  const z = kf(lt, [[0, 1.5], [1.1, 2.5], [dur, 1.35]]);
  camBegin(MX, MY + 40, z, 0);
  lab(t);
  const m = mood(lt, [[0, 'normal'], [0.55, 'spark', 'spark']]);
  monitor(t, () => { clawd(MX, MY + 130, 17 + (lt > 0.55 ? Math.sin(lt * 14) * 0.4 : 0), { ...m, mouth: lt > 0.55 ? 'O' : undefined, aL: lt > 0.55 ? 1.2 : 0.2, aR: lt > 0.55 ? 1.2 : 0.2 }); }, 1 + Math.max(0, lt - 0.7));
  // fireworks burst out of the screen
  for (let i = 0; i < 18; i++) {
    const t0 = 0.75 + hash(i) * 0.7, q = (lt - t0) / 1.0; if (q < 0 || q > 1.4) continue;
    const a = hash(i * 5 + 1) * TAU, R = easeOut(q) * (300 + hash(i * 3) * 700), x = MX + Math.cos(a) * R, y = MY + Math.sin(a) * R * 0.8 + q * q * 80;
    const col = [PAL.ochre, PAL.rose, PAL.sky, PAL.cream, PAL.sap][i % 5], k = 1 - ease((q - 0.7) / 0.7);
    inkLine([[MX + Math.cos(a) * R * 0.55, MY + Math.sin(a) * R * 0.44], [x, y]], 2, col, 'dry', 0, k);
    paint(starPts(x, y, (16 + hash(i * 9) * 26) * k, 0.3, i % 2 ? 4 : 5, q * 4), { wash: col, ink: PAL.ink, sw: 0.8, a: k });
  }
  camEnd();
  // reflection of stars in the researcher's glasses
  const k = backOut((lt - 1.3) / 0.4);
  if (k > 0.02) {
    push(); translate(1640, 760); scale(k);
    paint(ellPts(0, 0, 200, 200, 30), { wash: '#2F3C7A', ink: PAL.ink, sw: 2.2 });
    researcher(0, 190, 26, { glasses: 'stars', mouth: 'o', noLegs: true, noShadow: true });
    pop();
  }
}
// ---- shot 3: reverse shot, nervous researcher, circuits crawl over the walls ----
function nervousShot(t: number, lt: number, dur: number) {
  const p = lt / dur;
  camBegin(W / 2 + Math.sin(t * 20) * 2 * (lt > 0.4 ? 1 : 0), H / 2, lerp(1, 1.15, ease(p)), 0);
  lab(t);
  circuits(t, easeOut(seg(lt, 0, dur)), W + 60, 520, 11); circuits(t, easeOut(seg(lt, 0.2, dur)), W + 60, 900, 7);
  const cx = lerp(980, 640, easeOut(seg(lt, 0.5, 1.4))), sw = backOut(seg(lt, 0.45, 0.8));
  chair(cx, 1010, 22, 1, true);
  researcher(cx, 990, 38, { glasses: lt < 0.4 ? 'stars' : 'normal', scared: lt > 0.4, mouth: lt < 0.4 ? 'o' : 'wobble', sweat: sw, lookX: 1, rot: -0.04 * seg(lt, 0.5, 1.2), noLegs: true, aL: 1.5, aR: 1.4, emote: lt > 0.55 ? 'sweat' : null });
  camEnd();
  const k = seg(lt, dur - 0.4, dur);
  if (k > 0) { // circuits reach the lens
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; inkLine([[W / 2 + Math.cos(a) * 1400 * (1 - k * 0.9), H / 2 + Math.sin(a) * 900 * (1 - k * 0.9)], [W / 2 + Math.cos(a) * 1600, H / 2 + Math.sin(a) * 1100]], 8, '#5FE0D6', 'ink', 0); }
    fillAll('#0E2E36', k * 0.7);
  }
}
// ---- shot 4: shrug and wink ----
function shrugShot(t: number, lt: number, dur: number) {
  camBegin(MX, MY + 40, lerp(1.6, 1.9, ease(lt / dur)), 0);
  lab(t);
  const sh = Math.sin(clamp(lt / 0.5) * Math.PI);
  monitor(t, () => {
    clawd(MX, MY + 130, 17, { eyes: lt > 0.35 ? 'wink' : 'normal', mouth: 'smile', aL: 0.3 + sh * 1.1, aR: 0.3 + sh * 1.1, dy: -sh * 0.5, sq: -sh * 0.05 });
    const k = backOut(seg(lt, 0.6, 0.9)); if (k > 0.01) { push(); translate(MX, MY); scale(k * 0.95); lossChart(0, 0, 520, 380, 0.05, PAL.cream); pop(); }
  });
  camEnd();
}

function lossY(p: number) { return 200 + Math.sin(p * 18) * 28 * (1 - p * 0.7) + 70 * p + 520 * ease(seg(p, 0.5, 0.67)); }
function lossChart(cx: number, cy: number, w: number, h: number, prog: number, bgc = '#FFF5E2') {
  paint(rrPts(cx - w / 2, cy - h / 2, w, h, 14), { wash: bgc, ink: PAL.ink, sw: 1.4 });
  for (let i = 1; i < 8; i++) inkLine([[cx - w / 2 + (w * i) / 8, cy - h / 2], [cx - w / 2 + (w * i) / 8, cy + h / 2]], 0.6, '#9FB7C4', 'inkfine', 0);
  for (let i = 1; i < 5; i++) inkLine([[cx - w / 2, cy - h / 2 + (h * i) / 5], [cx + w / 2, cy - h / 2 + (h * i) / 5]], 0.6, '#9FB7C4', 'inkfine', 0);
  const pts: any[] = [];
  for (let i = 0; i <= 40; i++) { const p = i / 40; pts.push([cx - w / 2 + 20 + p * (w - 40), cy - h / 2 + 20 + ((lossY(p) - 200) / 700) * (h - 40) * 0.95 + 20]); }
  inkLine(pts, 2.4, PAL.red, 'ink', 0.5); void prog;
}

// ---- shot 5: loss curve sled ride, then Clawd bursts out of the monitor ----
function sledShot(t: number, lt: number, dur: number) {
  const tBurst = 2.65;
  if (lt < tBurst) {
    const p = ease(seg(lt, 0.25, 2.0)), X0 = 220, X1 = 1700;
    const px = (q: number) => X0 + q * (X1 - X0), py = (q: number) => 140 + lossY(q) * 0.9;
    const cx = px(p), cy = py(p), cliff = ease(seg(p, 0.45, 0.7));
    const [sx, sy] = shakeXY(t, cliff * 6 * (1 - ease(seg(lt, 2.0, 2.3))));
    camBegin(lerp(cx, 960, 0.35) + sx, lerp(cy, 540, 0.3) + sy, 1.15 + cliff * 0.5 - ease(seg(lt, 2.0, 2.6)) * 0.3, cliff * -0.12 * (1 - seg(lt, 2.0, 2.5)));
    bg('#E7D9BC', '#D2C09A');
    for (let i = 0; i < 20; i++) inkLine([[i * 100, -300], [i * 100, 1400]], 0.7, '#9FB7C4', 'inkfine', 0, 0.7);
    for (let i = 0; i < 14; i++) inkLine([[-300, i * 90], [2400, i * 90]], 0.7, '#9FB7C4', 'inkfine', 0, 0.7);
    inkLine([[X0 - 60, 80], [X0 - 60, 960], [X1 + 160, 960]], 3.4, PAL.ink, 'ink', 0);
    const pts: any[] = []; for (let i = 0; i <= 120; i++) { const q = (i / 120) * Math.min(1, p + 0.02 + (p < 1 ? 0 : 0)); pts.push([px(q), py(q)]); }
    const full: any[] = []; for (let i = 0; i <= 120; i++) { const q = i / 120; full.push([px(q), py(q)]); }
    inkLine(full, 3, '#B07B6B', 'dry', 0.5, 0.35); inkLine(pts, 5, PAL.red, 'ink', 0.5);
    const dx = px(Math.min(1, p + 0.01)) - px(p), dy2 = py(Math.min(1, p + 0.01)) - py(p), ang = Math.atan2(dy2, dx || 1);
    // splash at the bottom
    const ti = lt - 1.55;
    if (ti > 0) {
      const ix = px(0.67), iy = py(0.67);
      const sp: any[] = []; for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, r = (i % 2 ? 50 : 120 + hash(i) * 60) * easeOut(ti / 0.4); sp.push([ix + 60 + Math.cos(a) * r * 1.6, iy + 40 + Math.sin(a) * r * 0.7]); }
      paint(sp, { wash: PAL.sky, fill: PAL.teal, fillOp: 100, ink: PAL.ink, sw: 1.2, a: 1 - ease(ti / 1.4) });
      for (let i = 0; i < 12; i++) { const a = hash(i * 4) * Math.PI + Math.PI, v = 300 + hash(i) * 400; paint(ellPts(ix + 60 + Math.cos(a) * v * ti * 0.8, iy + Math.sin(a) * v * ti + 900 * ti * ti, 12, 12, 8), { wash: [PAL.sky, PAL.rose, PAL.ochre][i % 3], ink: PAL.ink, sw: 0.7 }); }
    }
    clawd(cx, cy + 6, 11, { rot: ang * 0.8, eyes: cliff > 0.1 && p < 0.7 ? 'scared' : 'happy', mouth: cliff > 0.1 && p < 0.7 ? 'O' : 'grin', sq: cliff > 0.1 ? -0.1 : 0, aL: 1.3, aR: 1.3, noLegs: false });
    paint(rectPts(cx - 62, cy + 6, 124, 10, 2), { wash: PAL.sky, ink: PAL.ink, sw: 1 });
    camEnd();
  } else {
    // burst out of the monitor: glass cracks, shards fly, Clawd grows person-sized
    const q = seg(lt, tBurst, dur), [sx, sy] = shakeXY(t, 8 * (1 - q));
    camBegin(MX + sx, MY + 100 + sy, lerp(1.7, 1.0, easeOut(q)), 0);
    lab(t);
    monitor(t, () => { lossChart(MX, MY, 570, 420, 1); });
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; inkLine([[MX, MY], [MX + Math.cos(a) * 340, MY + Math.sin(a) * 260]], 2, PAL.cream, 'ink', 0, 1 - q); }
    const u = lerp(6, 24, backOut(q)), gy = lerp(MY + 80, 880, easeOut(q));
    for (let i = 0; i < 10; i++) { const a = hash(i) * TAU, v = 300 + hash(i + 4) * 500; paint(starPts(MX + Math.cos(a) * v * q, MY + Math.sin(a) * v * q * 0.7 + 900 * q * q * 0.4, 18, 0.5, 3, q * 6), { wash: PAL.cream, washOp: 200, ink: PAL.ink, sw: 0.7, a: 1 - q * 0.7 }); }
    clawd(MX, gy, u, { eyes: 'happy', mouth: 'grin', aL: 1.3, aR: 1.3, dy: -q * (1 - q) * 4, sq: -0.1 * (1 - q) });
    camEnd();
    sfx('POP!', 1400, 300, 110, PAL.ochre, lt - tBurst, { life: 0.8 });
  }
}

// ---- shot 6: villain chair-spin; servant researcher brings mug after mug ----
function bossShot(t: number, lt: number, dur: number) {
  camBegin(lerp(900, 980, ease(lt / dur)), lerp(560, 520, ease(lt / dur)), lerp(1, 1.18, ease(lt / dur)), 0);
  lab(t);
  blob(960, 600, 700, PAL.ochre, 80);
  const spin = seg(lt, 0.3, 1.3), sx = Math.cos(spin * Math.PI * 3), showBack = sx > 0 && spin < 1 ? sx : spin >= 1 ? 1 : sx;
  const faceFront = spin > 0.5 || spin >= 1;
  chair(960, 900, 24, Math.max(0.12, Math.abs(showBack)), true, '#7B2A3C');
  if (faceFront) {
    clawd(960, 880, 18, { hat: 'crown', eyes: 'narrow', mouth: 'smile', col: PAL.clay, aL: 0.5, aR: 0.5, sx: Math.max(0.15, Math.abs(Math.cos(spin * Math.PI * 3))), noLegs: true, dy: 0 });
    chair(960, 900, 24, 1, false, '#7B2A3C');
  }
  // mug pile on the right
  const bp = bpOf(t), cnt = Math.min(12, Math.max(0, Math.floor(bp) - 17));
  for (let i = 0; i < cnt; i++) mug(1400 + (i % 3) * 66 - (Math.floor(i / 3) % 2) * 30, 790 - Math.floor(i / 3) * 56, 20, i % 2 ? PAL.cream : '#F0D4B0', t, i === cnt - 1);
  // researcher shuttle
  const c = bp / 2 - 9, ph = frac(c + 100);
  const runIn = ph < 0.5, rx = runIn ? lerp(-100, 1250, ease(ph / 0.5)) : ph < 0.75 ? 1250 : lerp(1250, 1250, 0);
  const fan = ph >= 0.5 && ph < 1;
  if (lt > 0.9) researcher(fan ? 1160 : rx, 860, 19, { bowtie: true, walk: runIn ? bp * 1.0 : null, mouth: 'smile', aL: runIn ? 0.8 : 0.3, aR: fan ? 1.5 + Math.sin(t * 22) * 0.25 : 0.8, sweat: 0.7, armR: fan ? (s: number) => { paint(ellPts(s * 2, -s * 1.5, s * 2.2, s * 1.6, 10), { wash: PAL.ochre, ink: PAL.ink, sw: 0.9 }); } : null, armL: runIn ? (s: number) => { mug(0, -s * 0.2, s * 0.75, PAL.cream, t, true); } : null });
  letter('♪', 600, 420, 60, PAL.ochre, { rot: -0.2, alpha: 0.7 + Math.sin(t * 4) * 0.2 });
  camEnd();
}

// ---- shot 7: lunchbox chase through three doors, then CHOMP to black ----
function chaseShot(t: number, lt: number, dur: number) {
  const bp = bpOf(t), lap = Math.floor((lt - 0.0) / (BEAT * 2)), lp = frac((lt - 0.0) / (BEAT * 2));
  const [sx, sy] = shakeXY(t, 2 + pulse(t) * 4);
  camBegin(W / 2 + sx, H / 2 + sy, 1.0 + 0.03 * Math.sin(t * 3), 0);
  bg('#6E5B8A', '#3A3560');
  // hallway
  paint([[0, 760], [W, 760], [W, H], [0, H]], { wash: '#8C5A3F', fill: '#3A2018', fillOp: 80, ink: PAL.ink, sw: 1.4 });
  for (let i = 0; i < 12; i++) inkLine([[i * 200 - 100, 760], [i * 300 - 560, H]], 1, PAL.ink, 'inkfine', 0, 0.5);
  paint(rectPts(0, 700, W, 60, 0), { wash: '#6A4A38', ink: PAL.ink, sw: 1.2 });
  for (let d = 0; d < 3; d++) {
    const dx = 330 + d * 630, openK = (lap % 3 === d || (lap + 1) % 3 === d) ? Math.sin(lp * Math.PI) : 0, open = clamp(openK * 1.6);
    paint(rrPts(dx - 150, 250, 300, 510, 20), { wash: '#4A2E52', ink: PAL.ink, sw: 2 });
    paint(rrPts(dx - 120, 280, 240, 480, 14), { wash: open > 0.1 ? '#1A0F22' : '#7B4F8C', ink: PAL.ink, sw: 1.4 });
    if (open > 0.1) { blob(dx, 520, 200, PAL.ochre, 100 * open); paint([[dx - 120, 280], [dx - 120 + 240 * (1 - open) * 0.5, 300], [dx - 120 + 240 * (1 - open) * 0.5, 740], [dx - 120, 760]], { wash: '#7B4F8C', ink: PAL.ink, sw: 1.2 }); }
    else { paint(rrPts(dx - 100, 310, 90, 160, 8), { fill: PAL.violet, fillOp: 120, ink: PAL.ink, sw: 0.8 }); paint(rrPts(dx + 10, 310, 90, 160, 8), { fill: PAL.violet, fillOp: 120, ink: PAL.ink, sw: 0.8 }); }
    paint(ellPts(dx + 90, 540, 12, 12, 8), { wash: PAL.ochre, ink: PAL.ink, sw: 0.8 });
    paint(ellPts(dx, 220, 60, 36, 12), { wash: PAL.cream, ink: PAL.ink, sw: 1 });
    // a peeking eye on the open doors
    if (open > 0.4) for (const e of [-1, 1]) paint(ellPts(dx + e * 30, 470, 12, 18, 8), { wash: PAL.cream, ink: PAL.ink, sw: 0.6 });
  }
  // the chase: researcher in front, Clawd (lid chomping) right behind, bigger every lap
  const rxp = lerp(-350, W + 350, ease(lp * 1.0 > 1 ? 1 : lp)), u = 12 + lap * 3.3 + (lt > dur - 1.1 ? 0 : 0);
  if (lt < dur - 1.0) {
    researcher(rxp, 905, 16, { walk: bp * 1.5, scared: true, mouth: 'scream', sweat: 1, aL: 1.6, aR: 1.6, rot: 0.08 });
    clawd(rxp - 250 - u * 2, 905, u, { walk: bp * 1.5, lid: 0.5 + 0.5 * Math.abs(Math.sin(bp * Math.PI * 2)), eyes: 'angry', dy: -Math.abs(Math.sin(bp * 3)) * 0.6, hat: null });
    speedLines(rxp - 320, 840, t, 5, 20, 120, PAL.cream, 1.2);
  } else {
    // final lunge at the camera
    const q = seg(lt, dur - 1.0, dur - 0.1), uu = lerp(u, 80, easeIn(q));
    clawd(W / 2, lerp(905, 1080, easeIn(q)), uu, { lid: 0.9 - 0.2 * Math.abs(Math.sin(q * 20)), eyes: 'angry', noShadow: true, dy: 0 });
  }
  camEnd();
  const j = seg(lt, dur - 0.55, dur - 0.1);
  if (lt > dur - 0.55) { jaws(easeIn(j)); }
  if (lt > dur - 0.15) fillAll('#2A0E1A', 1);
  sfx('CHOMP', W / 2, 520, 200, PAL.ochre, lt - (dur - 0.45), { life: 0.5, rot: -0.1 });
}

chapter('lab', 1.5, 23.0, [[1.5, sleepShot], [3.6, sparksShot], [6.0, nervousShot], [8.0, shrugShot], [9.0, sledShot], [13.0, bossShot], [17.9, chaseShot]]);
void mixCol; void TAU; void beatN; void heartPts; void letter; void iris; void flash; void tube; void easeOut; void move; void jit; void kf; void clamp; void seg; void speedLines; void researcher; void lerp; void backOut; void pulse; void S; void fillAll; void rotate;
