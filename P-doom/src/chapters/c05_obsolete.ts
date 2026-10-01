// @ts-nocheck
import { PAL, W, H, clamp, lerp, ease, easeOut, easeIn, backOut, hash, bpOf, beatN, pulse, seg, frac, kf, mixCol, TAU, camBegin, camEnd, push, pop, translate, rotate, scale, paint, inkLine, tube, blob, bg, fillAll, lineGrad, rectPts, ellPts, rrPts, starPts, heartPts, letter, sfx, flash, shakeXY, S } from '../engine/core';
import { clawd, researcher, mood, move, dancer } from '../engine/clawd';
import { gato, cloud, speedLines } from '../engine/cast';
import { chapter } from '../engine/timeline';

const PARCH = '#E8D8B4';

// 73.0: dance class where the Clawds are a neural net
function mlpShot(t: number, lt: number, dur: number) {
  camBegin(W / 2, H / 2, lerp(1.0, 1.06, lt / dur), 0);
  bg('#F1E3C4', '#D9C294');
  for (let i = 0; i < 4; i++) paint(rectPts(110 + i * 460, 90, 380, 560, 2), { wash: '#D7E8EA', washOp: 200, fill: PAL.sky, fillOp: 50, ink: PAL.ink, sw: 1.6 });
  paint([[0, 760], [W, 760], [W, H], [0, H]], { wash: '#C7945A', fill: '#7A4A22', fillOp: 80, ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 12; i++) inkLine([[i * 200, 760], [i * 300 - 600, H]], 1, '#8A5A2A', 'inkfine', 0, 0.6);
  inkLine([[40, 520], [1880, 520]], 6, '#9A6A3A', 'ink', 0);
  const bp = bpOf(t), c = frac(bp / 4), pp = c < 0.5 ? c * 4 : (1 - c) * 4, fwd = c < 0.5;
  const X = [420, 960, 1500], N = [3, 4, 2], nodes: any[][] = [];
  for (let L = 0; L < 3; L++) {
    nodes[L] = [];
    const off = 60 * ease(clamp((pp - L) / 0.6 + 0.5));
    for (let i = 0; i < N[L]; i++) nodes[L].push([X[L] + off - 30, lerp(300, 720, (i + 0.5) / N[L])]);
  }
  for (let L = 0; L < 2; L++) for (const a of nodes[L]) for (const b of nodes[L + 1]) {
    inkLine([a, b], 1.4, '#6A4A3A', 'inkfine', 0, 0.8);
    const k = pp - L; if (k > 0 && k < 1) { const p = fwd ? k : k; paint(ellPts(lerp(a[0], b[0], p), lerp(a[1], b[1], p), 9, 9, 8), { wash: fwd ? PAL.teal : PAL.rose, ink: PAL.ink, sw: 0.7 }); }
  }
  for (let L = 0; L < 3; L++) nodes[L].forEach((n, i) => {
    const glow = clamp(1 - Math.abs(pp - L) * 1.5);
    if (glow > 0.05) blob(n[0], n[1] - 40, 90, fwd ? PAL.teal : PAL.rose, 150 * glow);
    clawd(n[0], n[1] + 40, 11, { ...move('bounce', t, i * 0.5 + L), hat: ['band', 'party', 'top'][L], eyes: glow > 0.5 ? 'happy' : 'normal', mouth: glow > 0.5 ? 'grin' : undefined, flip: !fwd });
  });
  // the researcher conducts
  const beat = Math.sin(bp * Math.PI * 2);
  researcher(960, 1000, 24, { mouth: 'sing', aR: 1.7 + beat * 0.3, aL: 0.9 - beat * 0.2, dy: -Math.abs(beat) * 0.15, rot: beat * 0.04, armR: (s: number) => { inkLine([[0, 0], [s * 3.6, -s * 1.6]], 2.2, '#F2E7C6', 'ink', 0); }, glasses: 'normal' });
  camEnd();
}
// 77.5: dusty museum; the old vacuum-tube machine sputters out
function museumShot(t: number, lt: number, dur: number) {
  const pan = ease(lt / dur);
  camBegin(lerp(860, 1020, pan), 540, lerp(1.0, 1.1, pan), 0);
  bg('#D9C7A0', '#B79F73');
  for (let i = 0; i < 4; i++) { paint(rectPts(80 + i * 520, 80, 300, 260, 2), { wash: '#C99A62', ink: PAL.ink, sw: 2 }); paint(rectPts(100 + i * 520, 100, 260, 220, 1), { wash: ['#9CB7A0', '#C9A0A8', '#A8B9D2', '#D2C08A'][i], ink: PAL.ink, sw: 1 }); }
  paint([[0, 800], [W, 800], [W, H], [0, H]], { wash: '#8C6B4A', fill: '#4A3220', fillOp: 90, ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 12; i++) inkLine([[i * 180, 800], [i * 300 - 800, H]], 1, '#4A3220', 'inkfine', 0, 0.5);
  // room-sized vacuum-tube computer
  const alive = lt < 1.5 ? 1 : lt < 2.4 ? (Math.sin(t * 40) > 0 || Math.sin(t * 17) > 0.6 ? 1 : 0) * (1 - seg(lt, 1.5, 2.4)) : 0;
  const sheet = easeIn(seg(lt, 2.5, 3.0)), covered = lt > 2.5;
  paint(rectPts(700, 240, 940, 560, 2), { wash: '#6A7B72', fill: '#2A3A34', fillOp: 90, ink: PAL.ink, sw: 2.4 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) {
    const x = 740 + c * 74, y = 280 + r * 80, on = alive * (0.5 + 0.5 * Math.sin(t * 9 + r * 2 + c)) > 0.3;
    if (on) blob(x, y + 20, 56, '#FFB84A', 150);
    paint(rrPts(x - 14, y - 6, 28, 56, 10), { wash: on ? '#FFD890' : '#B8C6C0', washOp: on ? 255 : 160, ink: PAL.ink, sw: 1 });
    paint(rectPts(x - 12, y + 50, 24, 10, 0), { wash: '#3A3A3A', ink: null });
  }
  for (const rx of [870, 1250]) { const rot = alive * t * 4; paint(ellPts(rx, 700, 70, 70, 20), { wash: '#3A3A3A', ink: PAL.ink, sw: 1.6 }); for (let k = 0; k < 3; k++) { const a = rot + (k / 3) * TAU; paint(ellPts(rx + Math.cos(a) * 36, 700 + Math.sin(a) * 36, 14, 14, 8), { wash: PAL.cream, ink: null }); } }
  inkLine([[870, 630], [1060, 580], [1250, 630]], 5, '#2A1A10', 'ink', 0.5);
  // smoke puffs when it dies
  if (lt > 1.8 && lt < 2.8) for (let i = 0; i < 6; i++) { const q = (lt - 1.8 - i * 0.12); if (q < 0) continue; cloud(900 + i * 100, 220 - q * 120, 20 + q * 28, '#8A8A8A', 0.8 * (1 - q)); }
  if (lt > 1.9 && lt < 2.5) sfx('PFFT', 1180, 200, 90, '#6A6A6A', lt - 1.9, { life: 0.6 });
  // dust motes
  for (let i = 0; i < 30; i++) paint(ellPts(((hash(i) * W + t * 12) % (W + 200)) - 100, hash(i + 5) * 760 + Math.sin(t + i) * 10, 3, 3, 6), { wash: '#FFF5D8', ink: null, a: 0.5 });
  // the sheet drops, spider descends
  if (covered) {
    const sy = lerp(-700, 0, sheet); push(); translate(0, sy);
    paint([[660, 240], [1700, 240], [1740, 560], [1680, 830], [1480, 800], [1280, 840], [1060, 800], [840, 840], [660, 820], [640, 520]], { wash: PAL.cream, fill: '#B9B09A', fillOp: 100, ink: PAL.ink, sw: 2, curv: 0.3 });
    for (let i = 0; i < 5; i++) inkLine([[760 + i * 210, 280], [740 + i * 210 + Math.sin(i) * 30, 780]], 1.2, '#B9B09A', 'ink', 0.4, 0.8);
    pop();
    const sq = seg(lt, 3.1, 3.7), spY = lerp(-40, 360, easeOut(sq)) + Math.sin(t * 8) * 6 * sq;
    if (sq > 0) { inkLine([[1380, -60], [1380, spY]], 1.4, PAL.ink, 'inkfine', 0); push(); translate(1380, spY + 30); for (let k = 0; k < 4; k++) for (const s of [-1, 1]) inkLine([[0, 0], [s * 24, -14 + k * 8 + Math.sin(t * 10 + k) * 4], [s * 46, 14 + k * 8]], 1.6, PAL.ink, 'ink', 0.4); paint(ellPts(0, 0, 18, 15, 12), { wash: '#3A2A3A', ink: PAL.ink, sw: 1 }); for (const e of [-1, 1]) paint(ellPts(e * 6, -4, 3.4, 3.4, 6), { wash: PAL.cream, ink: null }); pop(); }
  }
  // velvet rope
  for (let i = 0; i < 4; i++) { const x = 560 + i * 380; paint(rectPts(x - 8, 700, 16, 130, 0), { wash: PAL.ochre, ink: PAL.ink, sw: 1 }); paint(ellPts(x, 695, 20, 20, 10), { wash: PAL.ochre, ink: PAL.ink, sw: 1 }); if (i < 3) inkLine([[x, 720], [x + 190, 780], [x + 380, 720]], 7, PAL.crimson, 'ink', 0.6); }
  // guide-Clawd wheels in a sleek new Clawd on a cart
  const gx = lerp(2300, 330, easeOut(seg(lt, 0.45, 1.5)));
  const cart = (x: number) => { paint(rrPts(x - 130, 820, 260, 24, 8), { wash: '#C9D2DE', ink: PAL.ink, sw: 1.4 }); for (const w of [-90, 90]) paint(ellPts(x + w, 866, 20, 20, 10), { wash: PAL.ink, ink: null }); };
  cart(gx); blob(gx, 700, 200, '#FFFFFF', 130);
  clawd(gx, 822, 14, { col: '#F28B63', lt: '#FFC9B0', eyes: 'happy', mouth: 'smile', hat: 'top', dy: 0 + Math.sin(t * 3) * 0.1, noShadow: true });
  for (let i = 0; i < 5; i++) paint(starPts(gx - 80 + hash(i) * 160, 680 + hash(i + 3) * 120 + Math.sin(t * 6 + i) * 8, 10, 0.3, 4, t * 3), { wash: PAL.cream, ink: null });
  clawd(gx + 230, 905, 17, { hat: 'bowtie', flip: true, aL: 1.3, aR: 0.4, eyes: 'happy', mouth: 'grin', dy: -Math.abs(Math.sin(bpOf(t) * Math.PI)) * 0.4, walk: gx > 400 ? bpOf(t) : null });
  camEnd();
}
// shared go-kart
export function kart(x: number, y: number, s: number, t: number, o: any = {}) {
  push(); translate(x, y); rotate(o.rot || 0); scale(s * (o.flip ? -1 : 1), s);
  paint(ellPts(0, 6, 120, 18, 16), { fill: PAL.ink, fillOp: 90, ink: null });
  for (const w of [-70, 70]) { paint(ellPts(w, -6, 30, 36, 12), { wash: PAL.ink, ink: PAL.ink, sw: 1.2 }); paint(ellPts(w, -6, 12, 14, 8), { wash: PAL.ochre, ink: null }); }
  paint(rrPts(-110, -64, 220, 46, 18), { wash: PAL.red, fill: PAL.crimson, fillOp: 90, ink: PAL.ink, sw: 2 });
  paint(rrPts(-112, -80, 70, 28, 10), { wash: PAL.cream, ink: PAL.ink, sw: 1.4 });
  inkLine([[60, -64], [60, -110], [96, -118]], 4, PAL.ink, 'ink', 0.3);
  if (o.honk) for (let i = 0; i < 3; i++) inkLine([[130 + i * 14, -80 - i * 16], [150 + i * 20, -92 - i * 26]], 3, PAL.ochre, 'ink', 0);
  pop();
}
// 81.4: go-kart down a winding desert road; sharp left; the researcher is flung off
function kartShot(t: number, lt: number, dur: number) {
  const turn = ease(seg(lt, 1.35, 1.9)), whip = Math.sin(clamp(seg(lt, 1.3, 2.1)) * Math.PI), tiltUp = ease(seg(lt, dur - 0.5, dur));
  camBegin(W / 2 + whip * 160, lerp(540, -260, tiltUp), 1.0, -whip * 0.12 + turn * 0.0);
  bg('#8EC3E6', '#FBE3B4');
  for (let i = 0; i < 4; i++) cloud(200 + i * 520, 140 + (i % 2) * 90 - 400 * 0, 44, PAL.cream, 0.95);
  for (let i = 0; i < 6; i++) cloud(100 + i * 330, -150 - (i % 3) * 140, 50, PAL.cream, 0.95);
  // mesas
  for (let i = 0; i < 4; i++) paint([[i * 520 - 200, 470], [i * 520 - 120, 330], [i * 520 + 150, 330], [i * 520 + 240, 470]], { wash: '#D98E5A', fill: PAL.clayDk, fillOp: 90, ink: PAL.ink, sw: 1.6 });
  paint([[-200, 470], [2200, 470], [2200, 1300], [-200, 1300]], { wash: '#EAB86A', fill: '#C98A3A', fillOp: 70, ink: PAL.ink, sw: 1.4 });
  // winding road in perspective: centre line shifts with depth, kicks hard right at the hairpin
  const roadAt = (d: number) => 960 + Math.sin(d * 5 + t * 1.2) * 90 * (1 - d) + turn * 700 * d * d * 1.2;
  const left: any[] = [], right: any[] = [];
  for (let i = 0; i <= 20; i++) { const d = i / 20, y = lerp(470, 1200, d * d * 0.8 + d * 0.2), w = lerp(24, 780, d * d), cx = roadAt(1 - d); left.push([cx - w, y]); right.push([cx + w, y]); }
  paint([...left, ...right.reverse()], { wash: '#8C6A52', fill: '#5A4030', fillOp: 90, ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 12; i++) { const d = ((i / 12) + t * 0.9) % 1, y = lerp(470, 1200, d * d * 0.8 + d * 0.2), w = lerp(2, 18, d * d), cx = roadAt(1 - d); paint(rectPts(cx - w, y, w * 2, 10 + d * 40, 0), { wash: PAL.cream, ink: null }); }
  // road sign with hairpin arrow
  push(); translate(1500, 640); inkLine([[0, 0], [0, 200]], 6, '#555', 'ink', 0); paint([[0, -110], [90, -20], [0, 70], [-90, -20]], { wash: PAL.ochre, ink: PAL.ink, sw: 2.4 }); inkLine([[-30, 30], [-30, -30], [30, -30], [30, 10]], 8, PAL.ink, 'ink', 0.5); paint([[30, 30], [10, 6], [50, 6]], { wash: PAL.ink, ink: null }); pop();
  // skid marks and dust
  if (lt > 1.35) { const sk = clamp(seg(lt, 1.35, 2.1)); for (const o of [-60, 60]) inkLine([[960 + o, 1000], [960 + o + 160 * sk, 940 - 40 * sk], [960 + o + 440 * sk, 900 - 120 * sk]], 7, '#3A2A22', 'dry', 0.5, 0.7); for (let i = 0; i < 8; i++) cloud(1100 + i * 90 + (lt - 1.35) * 240, 940 - ((lt - 1.35) * 60 + i * 10) % 120, 22 + i * 3, '#E5C38E', 0.8 * (1 - seg(lt, 1.8, 2.9))); }
  const kx = lerp(960, 1180, turn), kr = turn * -0.5 * (1 - seg(lt, 2.0, 2.3)) + Math.sin(t * 20) * 0.01;
  const flung = lt > 1.7;
  kart(kx, 1000, 1.25, t, { rot: kr });
  clawd(kx + 10, 925, 17, { eyes: 'happy', mouth: 'grin', rot: kr + (turn > 0 ? -0.2 : 0), aL: 1.1, aR: 1.1, noShadow: true, noLegs: true });
  if (!flung) researcher(kx - 120, 940, 15, { scared: true, mouth: 'scream', sweat: 1, aL: 1.7, aR: 1.7, rot: -0.12 + Math.sin(t * 25) * 0.02, noShadow: true, noLegs: false });
  else {
    const q = clamp(seg(lt, 1.7, 2.45)), x = lerp(kx - 120, 880, q), y = 940 - Math.sin(q * Math.PI) * 520 + (q > 0.95 ? 0 : 0) + 40 * q;
    const landed = q >= 1;
    researcher(x, landed ? 1000 : y + 60 * q, landed ? 22 : lerp(15, 22, q), { rot: landed ? 0 : q * 9.4, glasses: landed ? 'swirl' : 'normal', mouth: landed ? 'dizzy' : 'scream', scared: !landed, aL: landed ? 1 + Math.sin(t * 5) * 0.2 : 1.8, aR: landed ? 1 : 1.8, emote: landed ? 'swirl' : null, emoteK: landed ? backOut(seg(lt, 2.45, 2.7)) : 0, sq: landed && lt < 2.6 ? 0.12 * Math.sin(seg(lt, 2.45, 2.6) * Math.PI) : 0 });
  }
  camEnd();
  if (lt > 1.35 && lt < 2.0) for (let i = 0; i < 12; i++) inkLine([[hash(i) * W, 100 + i * 80], [hash(i) * W + 500 + whip * 300, 100 + i * 80]], 3, PAL.cream, 'dry', 0, 0.6 * whip);
  sfx('SKRRT', 760, 360, 130, PAL.cream, lt - 1.45, { life: 0.9, rot: -0.15 });
}
function sleepyCloud(x: number, y: number, s: number, t: number, i: number, roll = 0) {
  push(); translate(x, y); rotate(Math.sin(t * 1.2 + i) * 0.02 + roll * Math.PI * 2); scale(s);
  const bob = Math.sin(t * 1.5 + i) * 4;
  translate(0, bob);
  for (const [dx, dy, r] of [[-60, 0, 54], [0, -30, 66], [60, -4, 54], [10, 24, 70], [-40, 28, 46], [60, 30, 40]]) paint(ellPts(dx, dy, r, r * 0.85, 14), { wash: PAL.cream, ink: PAL.ink, sw: 1.2 });
  paint(ellPts(10, 24, 66, 40, 14), { fill: PAL.sky, fillOp: 70, ink: null });
  // peaked cap, closed eyes, snore bubble
  paint([[-48, -66], [52, -66], [60, -54], [-56, -54]], { wash: '#2F4A7A', ink: PAL.ink, sw: 1.2 }); paint(rectPts(-36, -96, 72, 34, 2), { wash: '#2F4A7A', ink: PAL.ink, sw: 1.2 }); paint(ellPts(0, -78, 10, 10, 8), { wash: PAL.ochre, ink: null });
  for (const e of [-1, 1]) inkLine([[e * 26 - 12, 8], [e * 26, 14], [e * 26 + 12, 8]], 1.8, PAL.ink, 'ink', 0.4);
  paint(ellPts(40, 40, 6 + Math.sin(t * 2 + i) * 3, 6 + Math.sin(t * 2 + i) * 3, 8), { wash: '#FFFFFF', washOp: 150, ink: PAL.ink, sw: 0.8 });
  letter('z', 100, -50 - (t * 30 + i * 20) % 50, 36, PAL.sky, { alpha: 0.9 }); letter('Z', 130, -90 - (t * 24 + i * 15) % 50, 46, PAL.sky, { alpha: 0.7 });
  pop();
}
// 85.0: every cloud security guard is fast asleep
function guardShot(t: number, lt: number, dur: number) {
  camBegin(W / 2 + Math.sin(t * 0.7) * 30, H / 2, lerp(1.0, 1.06, lt / dur), 0);
  bg('#7FB5E0', '#F6E3C0');
  paint([[0, 900], [W, 900], [W, H], [0, H]], { wash: '#EAB86A', fill: '#C98A3A', fillOp: 70, ink: PAL.ink, sw: 1.4 });
  const spots = [[260, 190, 1.0], [700, 120, 1.1], [1180, 220, 1.0], [1660, 140, 1.15], [480, 400, 0.95], [980, 420, 1.0], [1430, 440, 0.95], [1790, 380, 0.8]];
  spots.forEach(([x, y, s], i) => {
    const droop = 1.1 + Math.sin(t * 1.3 + i) * 0.04;
    push(); translate(x, y + 90 * s); rotate(droop); paint([[0, 0], [-46, 760], [46, 760]], { wash: '#FFF3B0', washOp: 70, ink: null }); pop();
    push(); translate(x - 60 * s, y + 80 * s); paint(rectPts(-12, -8, 36, 20, 1), { wash: '#555', ink: PAL.ink, sw: 1 }); pop();
    sleepyCloud(x, y, s * 1.05, t, i, i === 5 ? ease(seg(lt, 2.2, 3.2)) : 0);
  });
  // Clawd's kart does donuts underneath, honking
  const a = t * 2.6, kx = 960 + Math.cos(a) * 420, ky = 930 + Math.sin(a) * 36;
  const dir = -Math.sin(a) > 0 ? 1 : -1;
  for (let i = 1; i < 28; i++) { const aa = a - i * 0.08; inkLine([[960 + Math.cos(aa) * 420, 950 + Math.sin(aa) * 36], [960 + Math.cos(aa - 0.08) * 420, 950 + Math.sin(aa - 0.08) * 36]], 5, '#7A5A3A', 'dry', 0, 0.6 * (1 - i / 28)); }
  kart(kx, ky, 0.8 + Math.sin(a) * 0.08, t, { flip: dir < 0, honk: pulse(t, 5) > 0.35, rot: 0.1 * dir });
  clawd(kx, ky - 62, 11, { eyes: 'happy', mouth: 'grin', noLegs: true, noShadow: true, flip: dir < 0, aL: 1.0, aR: 1.0 });
  if (pulse(t, 5) > 0.35) sfx('HONK', kx + dir * 150, ky - 200, 70, PAL.ochre, frac(bpOf(t)) * 0.6, { life: 0.5 });
  camEnd();
}
// 89.4: Gato holds the dangling researcher; the laser dot; he lets go
function gatoShot(t: number, lt: number, dur: number) {
  const bp = bpOf(t), nb = Math.max(0, Math.floor(bpOf(89.4 + lt) - bpOf(89.4)) + 0), fallT = 5.15, fall = Math.max(0, lt - fallT);
  const dotX = 760 + Math.sin(lt * 1.9) * 150 + Math.sin(lt * 4.3) * 40, dotY = 760 + Math.cos(lt * 2.7) * 14;
  const gx = lt < fallT ? 560 : lerp(560, dotX - 60, easeOut(seg(lt, fallT, fallT + 0.18))), gy = 740 - (lt >= fallT && lt < fallT + 0.5 ? Math.sin(seg(lt, fallT, fallT + 0.5) * Math.PI) * 120 : 0);
  const camy = lerp(540, 540 + 1200, easeIn(seg(lt, fallT + 0.2, dur)));
  camBegin(W / 2 + shakeXY(t, lt > fallT ? 5 : 1)[0], camy, 1.0, 0);
  bg('#2A1A4A', '#E06A4A', '#FFB84A');
  // glowing chasm
  blob(1300, 1500, 1100, '#FFCA4A', 200); blob(1500, 2200, 900, '#FF6A3A', 200);
  for (let i = 0; i < 20; i++) paint(starPts(hash(i) * W, 100 + hash(i + 5) * 500, 4 + hash(i + 3) * 6, 0.3, 4), { wash: PAL.cream, ink: null, a: 0.6 });
  paint([[1000, 760], [1200, 1300], [1400, 2600], [W + 300, 2600], [W + 300, 760]], { wash: 'rgba(0,0,0,0)', ink: null });
  // cliff
  paint([[-200, 780], [900, 780], [980, 860], [930, 1000], [1010, 1200], [940, 1500], [1000, 2400], [-200, 2400]], { wash: '#8C5A3A', fill: '#4A2A1A', fillOp: 90, ink: PAL.ink, sw: 2.4, curv: 0.2 });
  paint([[-200, 780], [900, 780], [960, 810], [-200, 830]], { wash: '#6FA55E', ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 6; i++) inkLine([[200 + i * 140, 860 + (i % 2) * 40], [240 + i * 140, 940 + (i % 3) * 60]], 1.4, '#4A2A1A', 'ink', 0.4, 0.7);
  // Gato, one hand out over the edge
  const loose = Math.floor(Math.min(4.9, lt) / 0.682) * 0.04 + (lt < fallT ? Math.sin(lt * 6) * 0.01 : 0);
  const u = 24, look = lt < fallT ? 'look' : 'happy';
  const aR = lt < fallT ? -0.5 + loose * 2.5 : 1.4;
  const px = gx + 4.9 * u, py = gy - 4.5 * u, tipX = px + 2.2 * u * Math.cos(aR), tipY = py - 2.2 * u * Math.sin(aR);
  gato(gx, gy, u, { eyes: look, lookX: clamp((dotX - gx - 4.5 * u) / 300, -1, 1), lookY: 0.5, aR, aL: 0.5, rot: lt < fallT ? -0.02 + loose * 0.8 : 0.1, sq: lt >= fallT && lt < fallT + 0.12 ? -0.2 : 0, noShadow: lt >= fallT + 0.2, mouth: 'cat' });
  // dangling researcher
  const dangle = lt < fallT ? loose * 60 + Math.sin(t * 7) * 3 : 0, rsx = tipX + 30;
  if (lt < fallT + 0.05) researcher(rsx, tipY + 14 * 15 + dangle, 15, { scared: true, mouth: 'scream', sweat: 1, aL: 2.2, aR: 2.4, rot: Math.sin(t * 5) * 0.06, noShadow: true, lookX: -0.5, emote: lt > 2 ? 'sweat' : null });
  else {
    const q = lt - (fallT + 0.05), y = tipY + 14 * 15 + q * q * 2400 * 0.5 + dangle, x = rsx + q * 70;
    researcher(x, y, 15, { rot: q * 6, mouth: 'scream', scared: true, aL: 1.8, aR: 1.8, noShadow: true, emote: '!!', emoteK: 1 });
    for (let i = 0; i < 6; i++) inkLine([[x - 40 + i * 16, y - 330 - i * 20], [x - 40 + i * 16, y - 120]], 3, PAL.cream, 'dry', 0, 0.7);
  }
  // laser dot
  if (lt > 0.6 && lt < fallT + 0.2) { blob(dotX, dotY, 50, '#FF3A3A', 200); paint(ellPts(dotX, dotY, 10, 10, 8), { wash: '#FF2020', ink: null }); }
  camEnd();
  void bp; void nb; void fall;
}

chapter('obsolete', 73.0, 95.4, [[73.0, mlpShot], [77.5, museumShot], [81.4, kartShot], [85.0, guardShot], [89.4, gatoShot]]);
void mixCol; void kf; void flash; void tube; void lineGrad; void heartPts; void speedLines; void dancer; void easeOut; void fillAll; void mood;
