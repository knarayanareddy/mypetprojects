// @ts-nocheck
import { PAL, W, H, clamp, lerp, ease, easeOut, easeIn, backOut, hash, bpOf, beatN, pulse, seg, frac, kf, mixCol, TAU, camBegin, camEnd, push, pop, translate, rotate, scale, paint, inkLine, tube, blob, bg, fillAll, lineGrad, rectPts, ellPts, rrPts, starPts, heartPts, letter, sfx, flash, shakeXY, S } from '../engine/core';
import { clawd, dancer, researcher, mood, move } from '../engine/clawd';
import { shoggoth, rays, cloud, confetti, speedLines, stage, jaws } from '../engine/cast';
import { chapter } from '../engine/timeline';
import { chorusStage } from './shared';

const CJK = '"Noto Sans SC","PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif';

function boom(x: number, y: number, r: number, age: number) {
  if (age < 0) return;
  const k = easeOut(age / 0.5), fade = 1 - ease((age - 0.6) / 0.9);
  if (fade <= 0) return;
  for (let i = 0; i < 9; i++) {
    const a = hash(i * 4) * TAU, d = (0.3 + hash(i * 2) * 0.7) * r * k;
    paint(ellPts(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - k * 40, r * (0.25 + hash(i) * 0.25) * (0.5 + k * 0.5), r * 0.22 * (0.5 + k * 0.5), 14), { wash: i % 3 === 0 ? PAL.orange : i % 3 === 1 ? PAL.ochre : PAL.cream, fill: PAL.ink, fillOp: 30, ink: PAL.ink, sw: 1.4, a: fade });
  }
  paint(starPts(x, y - 20, r * 0.9 * k, 0.5, 9, age * 2), { wash: '#FFE9A0', washOp: 200, ink: null, a: fade * (1 - k * 0.6) });
}
function rocket(x: number, y: number, s: number, t: number, lit: number) {
  if (lit > 0) for (let i = 0; i < 4; i++) paint([[x - 18 * s * (1 - i * 0.2), y + 40 * s], [x + (Math.sin(t * 40 + i) * 6) * s, y + (110 + i * 50 + Math.sin(t * 30) * 20) * s * lit], [x + 18 * s * (1 - i * 0.2), y + 40 * s]], { wash: i % 2 ? PAL.orange : PAL.ochre, curv: 0.4, ink: i === 0 ? PAL.ink : null, sw: 1 });
  paint([[x - 30 * s, y + 20 * s], [x - 62 * s, y + 70 * s], [x - 22 * s, y + 50 * s]], { wash: PAL.crimson, ink: PAL.ink, sw: 1.2 });
  paint([[x + 30 * s, y + 20 * s], [x + 62 * s, y + 70 * s], [x + 22 * s, y + 50 * s]], { wash: PAL.crimson, ink: PAL.ink, sw: 1.2 });
  paint(rrPts(x - 32 * s, y - 120 * s, 64 * s, 170 * s, 24 * s), { wash: PAL.cream, fill: PAL.sky, fillOp: 50, ink: PAL.ink, sw: 1.5 });
  paint([[x - 32 * s, y - 100 * s], [x, y - 190 * s], [x + 32 * s, y - 100 * s]], { wash: PAL.red, ink: PAL.ink, sw: 1.5, curv: 0.25 });
  paint(rectPts(x - 32 * s, y - 40 * s, 64 * s, 16 * s, 0), { wash: PAL.rose, ink: null });
  paint(ellPts(x, y - 70 * s, 14 * s, 14 * s, 14), { wash: PAL.sky, ink: PAL.ink, sw: 1.2 });
}
function skyAbove(t: number) {
  const c = S.ctx; c.fillStyle = lineGrad(0, -3600, 0, 0, [[0, '#241B5A'], [0.5, '#4B5BA8'], [1, '#8EC3E6']]); c.fillRect(-100, -3600, W + 200, 3570);
  for (let i = 0; i < 70; i++) paint(starPts(hash(i) * W, -hash(i + 5) * 3300 - 200, 5 + hash(i + 2) * 8, 0.3, 4), { wash: PAL.cream, ink: null, a: 0.6 + 0.4 * Math.sin(t * 3 + i) });
  for (let i = 0; i < 8; i++) cloud(150 + hash(i * 3) * 1600, -300 - i * 380, 40 + hash(i) * 30, PAL.cream, 0.9);
}

// 23.0: the mouth opens from inside to reveal the stage
function openShot(t: number, lt: number) {
  camBegin(W / 2, H / 2, lerp(1.12, 1.0, easeOut(lt / 1.4)), 0);
  chorusStage(t, { th: 'party' });
  camEnd();
  jaws(1 - easeOut(seg(lt, 0, 0.75)));
}
// 24.5: strapped to a firework rocket. FOOM. Camera tilts up.
function foomShot(t: number, lt: number) {
  const q = seg(lt, 0.7, 1.9), rise = easeIn(q) * 3000, [sx, sy] = shakeXY(t, lt > 0.7 ? 14 * (1 - seg(lt, 0.7, 1.4)) : 0);
  camBegin(W / 2 + sx, lerp(540, 540 - 2700, easeIn(seg(lt, 0.75, 1.9))) + sy, 1, 0);
  chorusStage(t, { th: 'party', leadU: 14, leadX: 400, v: 12 });
  skyAbove(t);
  const rx = 960, pre = lt < 0.7;
  rocket(rx, 800 - rise, 1.3, t, pre ? 0 : 1);
  if (pre) { // fuse sizzle + strapping in
    const sp = (Math.sin(t * 40) + 1) * 0.5; paint(starPts(rx + 30, 960 - 100 * (1 - lt / 0.7) - 10, 14 + sp * 8, 0.4, 5, t * 10), { wash: PAL.ochre, ink: PAL.ink, sw: 0.8 });
    clawd(rx, 990, 22, { eyes: lt > 0.35 ? 'narrow' : 'normal', mouth: 'grin', aL: 1.3, aR: 1.3, sq: 0.05 * Math.sin(t * 30), dy: -0.2 });
  } else clawd(rx, 990 - rise, 22, { eyes: 'scared', mouth: 'O', aL: 1.4, aR: 1.4, sq: -0.15, rot: Math.sin(t * 30) * 0.03, noShadow: true });
  boom(rx, 830, 360, lt - 0.7);
  camEnd();
  sfx('FOOM', 960, 440, 230, PAL.ochre, lt - 0.72, { life: 1.1 });
}
// 26.5: crash into a tiny paper room; Clawd shuffles slips of paper through two slots
function chineseRoomShot(t: number, lt: number, dur: number) {
  bg('#4B5BA8', '#8EC3E6');
  for (let i = 0; i < 6; i++) cloud(hash(i) * W, 120 + i * 190 + Math.sin(t + i) * 8, 50, PAL.cream, 0.85);
  const z = kf(lt, [[0, 0.4], [0.35, 0.4], [0.85, 1.0], [1.0, 1.0], [dur, 2.8]]), cy = kf(lt, [[0, 540], [1.0, 540], [dur, 800]]);
  camBegin(960, cy, z, 0);
  // the paper room
  paint(rectPts(160, 120, 1600, 880, 3), { wash: '#F5EBD2', fill: '#E3CFA2', fillOp: 90, ink: PAL.ink, sw: 2 });
  for (let i = 1; i < 6; i++) inkLine([[160 + i * 267, 120], [160 + i * 267, 1000]], 0.8, '#C9B48A', 'inkfine', 0);
  paint([[160, 120], [260, 200], [1660, 200], [1760, 120]], { wash: '#E9DABA', ink: PAL.ink, sw: 1.2 });
  paint([[160, 1000], [260, 920], [1660, 920], [1760, 1000]], { wash: '#D9C597', ink: PAL.ink, sw: 1.2 });
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 170 : 1710;
    paint(rectPts(x0, 520, 80, 90, 1), { wash: '#2A1A12', ink: PAL.ink, sw: 1.6 }); paint(rectPts(x0 - 6, 500, 92, 24, 1), { wash: '#C94B4B', ink: PAL.ink, sw: 1.2 });
  }
  // slips fly slot -> Clawd -> slot
  const sp = 0.42, ct = lt - 0.35;
  for (let i = 0; i < 7; i++) {
    const ph = frac(ct / sp - i / 7 * 0 + i * 0.37) , k = ph, a = (Math.floor(ct / sp + i * 0.37) + i) % 2, txt = (i + a) % 2 ? '你好' : '中文';
    if (ct < 0) continue;
    const x = lerp(240, 960, easeOut(k)) , y = 560 - Math.sin(k * Math.PI) * 140;
    push(); translate(x, y); rotate(Math.sin(i * 3 + t * 10) * 0.3 + k * 2); paint(rectPts(-52, -30, 104, 60, 2), { wash: PAL.cream, ink: PAL.ink, sw: 1 }); pop();
    letter(txt, x, y, 36, PAL.ink, { ink: false, font: CJK, rot: Math.sin(i * 3 + t * 10) * 0.3 + k * 2 });
    const x2 = lerp(1680, 960, easeOut(k)), y2 = 560 - Math.sin(k * Math.PI) * 120;
    push(); translate(x2, y2); rotate(Math.sin(i * 5 + t * 9) * 0.3 - k); paint(rectPts(-52, -30, 104, 60, 2), { wash: '#FFF0C8', ink: PAL.ink, sw: 1 }); pop();
    letter(txt === '你好' ? '中文' : '你好', x2, y2, 36, PAL.ink, { ink: false, font: CJK, rot: Math.sin(i * 5 + t * 9) * 0.3 - k });
  }
  // Clawd behind a desk with a giant rulebook
  const fl = Math.sin(t * 22);
  clawd(960, 905, 22, { eyes: 'scared', mouth: 'wobble', aL: 1 + fl * 0.5, aR: 1 - fl * 0.5, dy: -Math.abs(Math.sin(t * 11)) * 0.6, emote: 'sweat', emoteK: 1, sq: Math.abs(fl) * 0.05 });
  paint(rectPts(560, 860, 800, 140, 2), { wash: '#8A5A3A', fill: '#4A2A1A', fillOp: 80, ink: PAL.ink, sw: 1.6 });
  paint([[700, 870], [960, 850], [960, 780], [720, 800]], { wash: PAL.cream, ink: PAL.ink, sw: 1.3 }); paint([[1220, 870], [960, 850], [960, 780], [1200, 800]], { wash: '#F6ECD5', ink: PAL.ink, sw: 1.3 });
  for (let i = 0; i < 4; i++) { const f = frac(t * 3 + i * 0.25), w = Math.cos(f * Math.PI); paint([[960, 850], [960 + w * 250, 860 - Math.abs(Math.sin(f * Math.PI)) * 120], [960 + w * 250, 790 - Math.abs(Math.sin(f * Math.PI)) * 110], [960, 780]], { wash: PAL.cream, ink: PAL.ink, sw: 0.9 }); }
  letter('RULES', 960, 940, 40, PAL.cream, { rot: -0.03 });
  // crash-in rocket
  if (lt < 0.45) { const k = easeIn(lt / 0.4); push(); translate(lerp(-300, 400, k), lerp(1500, 700, k)); rotate(0.7); rocket(0, 0, 1.2, t, 1); pop(); sfx('CRASH', 700, 700, 120, PAL.cream, lt - 0.38, { life: 0.5 }); }
  // paper bag rises at the end
  const bk = easeOut(seg(lt, 0.95, 1.25));
  if (bk > 0) {
    const by = lerp(1250, 930, bk);
    paint([[760, by + 240], [800, by - 40], [1120, by - 40], [1160, by + 240]], { wash: '#C99A62', fill: '#8A5A2A', fillOp: 90, ink: PAL.ink, sw: 1.6 });
    paint(ellPts(960, by - 40, 180, 40, 16), { wash: '#1E120A', ink: PAL.ink, sw: 1.4 });
    for (let i = 0; i < 6; i++) paint(heartPts(840 + i * 50, by + 60 + (i % 2) * 40, 14), { wash: [PAL.rose, PAL.sap, PAL.ochre][i % 3], ink: null, a: 0.0 });
  }
  camEnd();
}
// 28.0: mushroom trip
function shroomShot(t: number, lt: number, dur: number) {
  const sx = Math.sin(t * 2.2) * 30;
  fillAll('#FFD6EE');
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * TAU + t * 0.7, a1 = ((i + 1) / 24) * TAU + t * 0.7, pts: any[] = [[W / 2, 520]];
    for (let r = 0; r <= 8; r++) { const R = r * 220, w = Math.sin(t * 3 + r * 0.8 + i) * 0.06; pts.push([W / 2 + Math.cos(a0 + w) * R, 520 + Math.sin(a0 + w) * R]); }
    for (let r = 8; r >= 0; r--) { const R = r * 220, w = Math.sin(t * 3 + r * 0.8 + i + 1) * 0.06; pts.push([W / 2 + Math.cos(a1 + w) * R, 520 + Math.sin(a1 + w) * R]); }
    paint(pts, { wash: `hsl(${(i * 15 + t * 80) % 360},80%,68%)`, washOp: 230, fill: '#FFFFFF', fillOp: 40, ink: null, curv: 0.2 });
  }
  const p: any[] = []; for (let i = 0; i < 120; i++) { const r = i * 9, a = i * 0.22 + t * 5; p.push([W / 2 + Math.cos(a) * r, 520 + Math.sin(a) * r * 0.8]); }
  inkLine(p, 2.6, PAL.cream, 'ink', 0.5, 0.7);
  paint([[0, 880], [W, 880], [W, H], [0, H]], { wash: '#7A4CA8', washOp: 160, fill: PAL.teal, fillOp: 90, ink: null });
  // sprouting mushrooms
  for (let i = 0; i < 9; i++) {
    const x = 120 + i * 210 + (i % 2) * 40, g = backOut(seg(lt, hash(i) * 0.5, 0.35 + hash(i) * 0.5)), bounce = 1 + Math.abs(Math.sin(bpOf(t) * Math.PI + i)) * 0.12, y = 920 + (i % 3) * 36, s = (50 + hash(i + 3) * 30) * g * bounce;
    if (s < 4) continue;
    paint(rrPts(x - s * 0.3, y - s * 1.1, s * 0.6, s * 1.1, s * 0.2), { wash: PAL.cream, ink: PAL.ink, sw: 1 });
    paint([[x - s, y - s * 1.0], [x - s * 0.8, y - s * 1.7], [x, y - s * 2.1], [x + s * 0.8, y - s * 1.7], [x + s, y - s * 1.0]], { wash: i % 2 ? PAL.red : PAL.rose, fill: PAL.violet, fillOp: 60, ink: PAL.ink, sw: 1.4, curv: 0.4 });
    for (let k = 0; k < 3; k++) paint(ellPts(x + (k - 1) * s * 0.5, y - s * (1.45 + (k % 2) * 0.2), s * 0.16, s * 0.12, 8), { wash: PAL.cream, ink: null });
  }
  clawd(W / 2 + sx * 0.4, 900, 34, { eyes: 'swirl', mouth: 'wobble', rot: Math.sin(t * 3) * 0.12, sx: 1 + Math.sin(t * 5) * 0.08, sq: Math.sin(t * 4) * 0.08, aL: 1.3 + Math.sin(t * 6) * 0.4, aR: 1.3 - Math.sin(t * 6) * 0.4, dy: -Math.abs(Math.sin(bpOf(t) * Math.PI)) });
  for (let i = 0; i < 12; i++) paint(starPts(hash(i) * W, ((t * 100 * (0.4 + hash(i + 2)) + hash(i + 5) * H) % H), 10 + hash(i) * 12, 0.3, 4, t * 3), { wash: PAL.cream, ink: null, a: 0.85 });
  // the swirl resolves into a smiley face
  const k = easeIn(seg(lt, 1.0, dur));
  if (k > 0.01) {
    const r = lerp(10, 1700, k); push(); translate(W / 2 + 20, 460); 
    paint(ellPts(0, 0, r, r, 28), { wash: '#FFD84A', ink: PAL.ink, sw: 2 });
    for (const e of [-1, 1]) paint(ellPts(e * r * 0.33, -r * 0.25, r * 0.11, r * 0.19, 12), { wash: PAL.ink, ink: null });
    inkLine([[-r * 0.5, r * 0.15], [0, r * 0.62], [r * 0.5, r * 0.15]], r * 0.04, PAL.ink, 'ink', 0.7); pop();
  }
}
// 29.5: friendly smiley, mask slips, many-eyed shoggoth, Clawd yanks the mask off, push into Clawd's eye
function shoggothShot(t: number, lt: number, dur: number) {
  const slip = ease(seg(lt, 1.3, 2.3)) * 0.85, yank = lt > 2.55, dark = ease(seg(lt, 1.3, 2.3));
  const cu = 17, px = lt < 2.2 ? 420 : lt < 2.55 ? lerp(420, 800, easeOut(seg(lt, 2.2, 2.55))) : 800;
  const hop = yank && lt < 3.35 ? -Math.abs(Math.sin(t * 9)) * 0.9 : 0;
  const eyeX = px - 2.5 * cu, eyeY = 900 - 6 * cu + (lt >= 3.35 ? 0 : hop * cu);
  const q = seg(lt, 3.3, dur), zoom = lerp(1, 1, 0) * (lt < 3.3 ? lerp(1, 1.12, lt / 3.3) : 1.12 * Math.pow(70 / 1.12, easeIn(q)));
  const camx = lt < 3.3 ? 960 : lerp(960, eyeX, ease(q)), camy = lt < 3.3 ? 540 : lerp(540, eyeY, ease(q));
  const zs = lt < 0.45 ? kf(lt, [[0, 5], [0.45, 1]], easeOut) : 1;
  camBegin(lt < 0.45 ? lerp(1160, camx, easeOut(lt / 0.45)) : camx, lt < 0.45 ? lerp(700, camy, easeOut(lt / 0.45)) : camy, zoom * zs, 0);
  bg(mixCol('#BFE3F5', '#2A1B3D', dark), mixCol('#F7E4C8', '#4A2B5A', dark));
  for (let i = 0; i < 5; i++) cloud(200 + i * 420, 200 + (i % 2) * 120, 40, mixCol(PAL.cream, '#5A4780', dark), 0.9);
  paint([[-200, 930], [2200, 930], [2200, 1300], [-200, 1300]], { wash: mixCol('#9CC27A', '#2C1F3A', dark), ink: PAL.ink, sw: 1.4 });
  const wig = 1 + pulse(t) * 0.8;
  shoggoth(1160, 985, 36, t, { mask: yank ? 0 : 1, slip, eyes: yank ? 1.4 : 1 });
  if (!yank) { // friendly wave
    const wv = Math.sin(t * 6) * 0.3; push(); translate(1160 + 6.4 * 36 * 0.9, 985 - 6 * 36); rotate(wv - 0.5); tube([[0, 0], [60, -30], [120, -60]], 40, '#6B5599'); pop();
  }
  const m = yank ? { eyes: 'happy', mouth: 'grin' } : mood(lt, [[0, 'normal'], [1.5, 'narrow', '!'], [2.1, 'angry']]);
  clawd(px, 900, cu, { ...m, mouth: yank ? 'grin' : 'flat', dy: hop, aR: yank ? 1.9 : 0.4, aL: yank ? 0.4 : 0.3, flip: false, armR: yank ? (u: number) => { push(); translate(0, -u * 1.2); rotate(-0.4); paint(ellPts(0, 0, u * 2.6, u * 2.6, 20), { wash: '#FFD84A', ink: PAL.ink, sw: 1.2 }); for (const e of [-1, 1]) paint(ellPts(e * u * 0.8, -u * 0.5, u * 0.3, u * 0.5, 8), { wash: PAL.ink, ink: null }); inkLine([[-u * 1.1, u * 0.5], [0, u * 1.4], [u * 1.1, u * 0.5]], 1.4, PAL.ink, 'ink', 0.7); pop(); } : null });
  if (yank) sfx('RIP', 900, 400, 160, PAL.ochre, lt - 2.55, { life: 0.7 });
  void wig;
  camEnd();
}
// 33.5: black and red, red eyes among ink speed lines, lifespan counter, apple
function shinigamiShot(t: number, lt: number, dur: number) {
  const [sx, sy] = shakeXY(t, 5 * pulse(t, 8));
  camBegin(W / 2 + sx, H / 2 + sy, lerp(1.0, 1.12, lt / dur), 0);
  fillAll('#12060A');
  rays(W / 2, 480, 28, 2400, '#6E0F1C', '#16070B', t * 0.25, 200);
  blob(W / 2, 480, 600, '#FF2A3A', 90);
  speedLines(W / 2, 480, t, 40, 340, 1600, PAL.cream, 1.6);
  const grow = 1 + 0.15 * Math.sin(lt * 5);
  clawd(W / 2 - 80, 900, 44, { eyes: 'red', mouth: 'flat', col: '#8F3A28', dk: '#5E2218', lt: '#C46A4E', dy: 0, sq: -0.02 * grow, aL: 0.6, aR: 0.6 });
  // researcher with lifespan counter
  researcher(1500, 985, 22, { scared: true, mouth: 'scream', sweat: 1, aL: 1.7, aR: 1.7, lookX: -1, rot: Math.sin(t * 25) * 0.03 });
  const secs = Math.max(0, 86400 - Math.floor(lt * 2200)), hh = Math.floor(secs / 3600), mm = Math.floor((secs % 3600) / 60), ss = secs % 60;
  push(); translate(1500, 560); rotate(Math.sin(t * 3) * 0.03);
  paint(rrPts(-120, -40, 240, 80, 14), { wash: '#0A0A10', ink: PAL.red, sw: 1.6 }); pop();
  letter(`${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, 1500, 560, 46, '#FF5A5A', { ink: false, font: '"Shantell Sans", monospace' });
  // bouncing apple
  const ax = lerp(-100, 2000, seg(lt, 0, dur)), ay = 930 - Math.abs(Math.sin(lt * 5.2)) * 320;
  push(); translate(ax, ay); rotate(lt * 6);
  paint(ellPts(0, 0, 44, 42, 16), { wash: PAL.red, fill: PAL.rose, fillOp: 90, ink: PAL.ink, sw: 1.5 });
  inkLine([[0, -38], [6, -62]], 2.4, '#5A3A22', 'ink', 0); paint([[6, -52], [36, -66], [20, -42]], { wash: PAL.sap, ink: PAL.ink, sw: 1 });
  pop();
  camEnd();
  flash(easeIn(seg(lt, dur - 0.22, dur)), '#FF3040');
}
// 35.5: full-stage dance break
function danceShot(t: number, lt: number, dur: number) {
  const z = lerp(1.0, 1.08, ease(lt / dur));
  camBegin(W / 2, lerp(520, 560, lt / dur), z, Math.sin(bpOf(t) * Math.PI * 0.5) * 0.01);
  stage(t, 'party');
  for (let i = 0; i < 5; i++) {
    const x = 270 + i * 345, m: any = move('spin', t, i * 0.5);
    clawd(x, 900 - (i % 2) * 20, 30, { ...m, hat: ['party', 'crown', 'top', 'wizard', 'band'][i], eyes: 'happy', mouth: 'grin', col: undefined });
  }
  const b = beatN(t), sn = [0, 1, 2, 3][b % 4], snap = frac(bpOf(t)) < 0.25;
  researcher(960, 1010, 22, { glasses: 'normal', mouth: 'flat', aL: [1.35, 0.15, 1.35, 0.55][sn], aR: [0.15, 1.35, 0.55, 1.35][sn], rot: snap ? [0.1, -0.1, 0.06, -0.06][sn] : 0, dy: snap ? -0.2 : 0, sx: sn % 2 ? -1 : 1 });
  confetti(t, 90, 3, 260);
  camEnd();
}

chapter('chorus1', 23.0, 38.5, [[23.0, openShot], [24.5, foomShot], [26.5, chineseRoomShot], [28.0, shroomShot], [29.5, shoggothShot], [33.5, shinigamiShot], [35.5, danceShot]]);
void dancer; void researcher; void speedLines; void heartPts; void tube; void clamp; void backOut; void easeIn; void sfx; void flash; void kf;
