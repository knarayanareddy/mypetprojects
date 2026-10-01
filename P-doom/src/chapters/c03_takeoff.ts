// @ts-nocheck
import { PAL, W, H, clamp, lerp, ease, easeOut, easeIn, backOut, hash, bpOf, beatN, pulse, seg, frac, kf, mixCol, TAU, camBegin, camEnd, push, pop, translate, rotate, scale, paint, inkLine, tube, blob, bg, fillAll, lineGrad, rectPts, ellPts, rrPts, starPts, heartPts, letter, sfx, flash, shakeXY, S } from '../engine/core';
import { clawd, researcher, mood, move } from '../engine/clawd';
import { sydney, cloud, speedLines, paperclip, rays } from '../engine/cast';
import { chapter } from '../engine/timeline';

function gymBG(t: number) {
  bg('#BFE6F5', '#FFF0D0');
  blob(1550, 140, 380, '#FFE9A0', 170);
  paint(ellPts(1550, 140, 70, 70, 20), { wash: '#FFE070', ink: PAL.ink, sw: 1.2 });
  for (let i = 0; i < 3; i++) cloud(300 + i * 520, 170 + (i % 2) * 60, 36, PAL.cream, 0.9);
  paint(rectPts(0, 330, W, 460, 0), { wash: '#F4E1C0', fill: '#D9BC8E', fillOp: 70, ink: PAL.ink, sw: 1.2 });
  // wall bars & posters
  for (let i = 0; i < 6; i++) inkLine([[60 + i * 40, 380], [60 + i * 40, 760]], 2.4, '#8A6A4A', 'ink', 0);
  paint([[0, 790], [W, 790], [W, H + 20], [0, H + 20]], { wash: '#D49A5A', fill: '#7A4A22', fillOp: 90, ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 10; i++) inkLine([[i * 220, 790], [i * 330 - 600, H]], 1, '#8A5A2A', 'inkfine', 0, 0.7);
  // gym TV
  paint(rrPts(600, 140, 380, 230, 16), { wash: '#2A2A38', ink: PAL.ink, sw: 2 });
  paint(rrPts(618, 156, 344, 198, 10), { wash: '#CFEFE6', ink: null });
  const pts: any[] = []; for (let i = 0; i <= 30; i++) pts.push([630 + i * 10.6, 255 + Math.sin(i * 0.5 + t * 2) * 12 + i * 1.2]);
  inkLine(pts, 3, PAL.teal, 'ink', 0.5);
}
function treadmill(x: number, y: number, s: number, t: number, spd: number, dialK: number) {
  paint([[x - 200 * s, y], [x + 190 * s, y], [x + 230 * s, y + 40 * s], [x - 160 * s, y + 40 * s]], { wash: '#3A3A4A', ink: PAL.ink, sw: 1.6 });
  const off = (t * 300 * spd) % 80;
  for (let i = -2; i < 10; i++) { const x0 = x - 200 * s + i * 80 * s + off * s; if (x0 < x - 200 * s || x0 > x + 190 * s) continue; inkLine([[x0, y + 3], [x0 + 38 * s, y + 38 * s]], 2.4, '#6A6A7C', 'ink', 0); }
  paint(rectPts(x - 190 * s, y + 40 * s, 400 * s, 36 * s, 0), { wash: '#262633', ink: PAL.ink, sw: 1.4 });
  // console on a pole
  paint(rectPts(x + 190 * s, y - 430 * s, 26 * s, 440 * s, 1), { wash: '#B9B9C9', ink: PAL.ink, sw: 1.4 });
  paint(rrPts(x + 90 * s, y - 520 * s, 230 * s, 130 * s, 20 * s), { wash: '#E9E3D5', ink: PAL.ink, sw: 1.8 });
  dial(x + 205 * s, y - 455 * s, 46 * s, dialK);
}
export function dial(x: number, y: number, r: number, k: number) {
  paint(ellPts(x, y, r, r, 20), { wash: PAL.cream, ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i <= 8; i++) { const a = lerp(-2.3, 2.3, i / 8) - Math.PI / 2; inkLine([[x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78], [x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95]], 1.4, i > 6 ? PAL.red : PAL.ink, 'ink', 0); }
  const a = lerp(-2.3, 2.3, k) - Math.PI / 2;
  inkLine([[x, y], [x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78]], 2.4, PAL.red, 'ink', 0);
  paint(ellPts(x, y, r * 0.12, r * 0.12, 8), { wash: PAL.ink, ink: null });
}

// 38.5: sunny gym, calm training run
function gymShot(t: number, lt: number, dur: number) {
  const q = seg(lt, dur - 0.7, dur), zx = lerp(960, 1150, ease(q)), zy = lerp(560, 440, ease(q));
  camBegin(zx, zy, lerp(1.0, 1.1, lt / dur) * (1 + ease(q) * 1.4), 0);
  gymBG(t);
  treadmill(900, 860, 1.1, t, 1, 0.22 + Math.sin(t) * 0.01);
  clawd(900, 875, 20, { ...move('run', t, 0), hat: 'sweatband', eyes: 'happy', mouth: 'smile', walk: bpOf(t) * 0.8 });
  researcher(300, 960, 21, { aL: 0.4, aR: 1.0, mouth: 'smile', dy: -Math.abs(Math.sin(bpOf(t) * Math.PI * 0.5)) * 0.2, rot: Math.sin(bpOf(t) * Math.PI) * 0.03, armL: (s: number) => { paint(rrPts(-s * 0.8, -s * 0.2, s * 1.6, s * 2, 3), { wash: '#C99A62', ink: PAL.ink, sw: 0.9 }); paint(rectPts(-s * 0.5, s * 0.2, s, s * 1.4, 0), { wash: PAL.cream, ink: null }); }, armR: (s: number) => { paint(ellPts(0, 0, s * 0.9, s * 0.9, 12), { wash: PAL.cream, ink: PAL.ink, sw: 1 }); inkLine([[0, 0], [s * 0.4, -s * 0.4]], 1, PAL.ink, 'ink', 0); } });
  camEnd();
}
// 41.5: elbow bumps the dial, black hole opens, everything spirals in
function holeShot(t: number, lt: number, dur: number) {
  const [sx, sy] = shakeXY(t, lt > 0.8 ? 6 : 0), HX = 1560, HY = 400;
  const early = lt < 0.7;
  const zoomK = kf(lt, [[0, 3.0], [0.65, 3.0], [1.0, 1.0]], easeOut);
  const cx = kf(lt, [[0, 1150], [0.65, 1150], [1.0, 960]], easeOut), cy = kf(lt, [[0, 440], [0.65, 440], [1.0, 560]], easeOut);
  const dive = seg(lt, 2.7, dur);
  camBegin(lerp(cx, HX, ease(dive)) + sx, lerp(cy, HY, ease(dive)) + sy, zoomK * (1 + easeIn(dive) * 3), 0);
  gymBG(t);
  const bump = easeOut(seg(lt, 0.2, 0.55));
  treadmill(900, 860, 1.1, t, 1 + bump * 4, 0.22 + bump * 0.78);
  if (early) { const ex = lerp(1000, 1150, easeOut(seg(lt, 0, 0.3))); paint(rrPts(ex - 160, 380, 170, 60, 26), { wash: PAL.cream, ink: PAL.ink, sw: 1.6 }); paint(ellPts(ex + 14, 410, 34, 34, 12), { wash: '#F6D2B0', ink: PAL.ink, sw: 1.2 }); }
  if (lt > 0.4 && lt < 0.8) sfx('CLICK', 1000, 330, 70, PAL.red, lt - 0.4, { life: 0.4 });
  // black hole
  const hk = easeOut(seg(lt, 0.85, 1.6)), hr = 340 * hk;
  if (hk > 0.01) {
    blob(HX, HY, hr * 1.5, '#FF5AA0', 120);
    for (let i = 0; i < 4; i++) paint(ellPts(HX, HY, hr * (1 + i * 0.12), hr * (1 + i * 0.12) * 0.95, 26, 0, t * (1 + i)), { fill: i % 2 ? PAL.violet : PAL.rose, fillOp: 140, ink: null });
    paint(ellPts(HX, HY, hr, hr, 28), { wash: '#08040E', ink: PAL.ink, sw: 2 });
    for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU + t * 3, pp: any[] = []; for (let r = 0; r < 9; r++) { const R = hr * (1.0 + r * 0.18), aa = a + r * 0.35; pp.push([HX + Math.cos(aa) * R, HY + Math.sin(aa) * R]); } inkLine(pp, 1.4, PAL.cream, 'dry', 0.5, 0.55); }
  }
  // objects spiral and stretch into the hole
  const objs = ['dumbbell', 'bottle', 'clipboard', 'dumbbell', 'bottle', 'cone', 'clipboard', 'stopwatch', 'bottle', 'dumbbell'];
  for (let i = 0; i < objs.length; i++) {
    const start = 1.0 + hash(i) * 0.7, p = (lt - start) / 1.9; if (p < 0 || p > 1) continue;
    const e = easeIn(p), a0 = hash(i * 7) * TAU, R = lerp(900, 0, e), a = a0 + e * 7, ox = HX + Math.cos(a) * R, oy = HY + Math.sin(a) * R * 0.7, sc = lerp(1, 0.1, e), st = 1 + e * 2.5;
    push(); translate(ox, oy); rotate(a + Math.PI / 2); scale(sc * st, sc / Math.sqrt(st)); 
    const o = objs[i];
    if (o === 'dumbbell') { paint(rectPts(-50, -7, 100, 14, 0), { wash: '#555', ink: PAL.ink, sw: 1.2 }); paint(rrPts(-70, -28, 28, 56, 8), { wash: PAL.ink, ink: null }); paint(rrPts(42, -28, 28, 56, 8), { wash: PAL.ink, ink: null }); }
    else if (o === 'bottle') { paint(rrPts(-18, -40, 36, 80, 12), { wash: PAL.sky, ink: PAL.ink, sw: 1.2 }); paint(rectPts(-9, -52, 18, 14, 0), { wash: PAL.rose, ink: PAL.ink, sw: 1 }); }
    else if (o === 'clipboard') { paint(rrPts(-34, -46, 68, 92, 6), { wash: '#C99A62', ink: PAL.ink, sw: 1.2 }); paint(rectPts(-26, -34, 52, 72, 0), { wash: PAL.cream, ink: null }); }
    else if (o === 'cone') paint([[-30, 30], [30, 30], [0, -40]], { wash: PAL.orange, ink: PAL.ink, sw: 1.2 });
    else paint(ellPts(0, 0, 34, 34, 14), { wash: PAL.cream, ink: PAL.ink, sw: 1.2 });
    pop();
  }
  // researcher clinging to the door frame, flapping like a flag
  paint(rectPts(130, 360, 30, 560, 1), { wash: '#7A4A2A', ink: PAL.ink, sw: 1.6 });
  if (lt > 0.8) {
    const fl = easeOut(seg(lt, 0.9, 1.6)), flap = Math.sin(t * 28) * 0.08;
    push(); translate(158, 700); rotate(-1.35 * fl + flap); translate(-158, -700);
    researcher(158, 860, 17, { glasses: 'normal', scared: true, mouth: 'scream', sweat: 1, aL: 1.9, aR: 1.9, noLegs: false, noShadow: true, lookX: 1 });
    pop();
  }
  const away = lt > 2.7 ? easeIn(seg(lt, 2.7, dur)) : 0;
  clawd(lerp(900, HX - 120, away), lerp(875, HY + 120, away), 20 * (1 - away * 0.8), { ...move('run', t, 0), hat: 'sweatband', eyes: 'happy', mouth: 'grin', walk: bpOf(t) * 1.4, rot: away * -0.3, noShadow: away > 0.1 });
  camEnd();
  if (dive > 0.6) fillAll('#08040E', seg(dive, 0.6, 1));
}
// 45.0: side-scrolling parallax on a rocket skateboard
function contourHills(t: number, sc: number, base: number, amp: number, col: string, freq: number, lines: number) {
  const scroll = t * sc;
  for (let l = lines; l >= 0; l--) {
    const pts: any[] = [[-40, H + 40]];
    for (let x = -40; x <= W + 40; x += 24) { const X = x + scroll; pts.push([x, base + l * 16 + Math.sin(X * freq) * amp + Math.sin(X * freq * 2.3 + 1) * amp * 0.4]); }
    pts.push([W + 40, H + 40]);
    if (l === 0) paint(pts, { wash: col, ink: PAL.ink, sw: 1.4, a: 1 });
    else inkLine(pts.slice(1, -1), 1, mixCol(col, PAL.ink, 0.35), 'inkfine', 0, 0.55);
  }
}
function skateShot(t: number, lt: number, dur: number) {
  const bp = bpOf(t), grow = 12 + Math.floor(Math.max(0, bp - 65.5)) * 3, u = lerp(grow, grow + 3, easeOut(frac(bp) * 3));
  const [sx, sy] = shakeXY(t, 3);
  camBegin(W / 2 + sx, H / 2 + sy, 1, 0);
  bg('#BFE0F5', '#FFE9C8');
  for (let i = 0; i < 4; i++) cloud(((i * 600 - t * 300) % 2600 + 2600) % 2600 - 300, 150 + (i % 2) * 90, 45, PAL.cream, 0.9);
  // jet
  const jx = 2600 - lt * 1300; push(); translate(jx, 260); paint([[-160, 0], [120, -16], [190, 0], [120, 16]], { wash: PAL.cream, ink: PAL.ink, sw: 1.4 }); paint([[-20, 0], [-120, -60], [-60, 0]], { wash: PAL.rose, ink: PAL.ink, sw: 1.2 }); paint([[-20, 0], [-120, 60], [-60, 0]], { wash: PAL.rose, ink: PAL.ink, sw: 1.2 }); paint([[-160, 0], [-210, -50], [-130, -4]], { wash: PAL.rose, ink: PAL.ink, sw: 1.2 }); inkLine([[-170, 10], [-500, 10]], 6, PAL.cream, 'dry', 0.1, 0.8); pop();
  contourHills(t, 120, 520, 50, '#B9DDB0', 0.004, 4);
  contourHills(t, 300, 640, 60, '#8CC080', 0.006, 5);
  // train overtaken
  const tx = 2400 - lt * 1000; for (let i = 0; i < 5; i++) { const x = tx + i * 330; paint(rrPts(x, 650, 300, 130, 14), { wash: i === 0 ? PAL.red : [PAL.teal, PAL.ochre, PAL.violet, PAL.sky][i % 4], ink: PAL.ink, sw: 1.5 }); for (let w = 0; w < 3; w++) paint(rrPts(x + 30 + w * 90, 680, 60, 50, 6), { wash: PAL.cream, ink: PAL.ink, sw: 1 }); paint(ellPts(x + 70, 785, 22, 22, 10), { wash: PAL.ink, ink: null }); paint(ellPts(x + 230, 785, 22, 22, 10), { wash: PAL.ink, ink: null }); }
  contourHills(t, 700, 780, 36, '#6FA55E', 0.01, 3);
  paint([[0, 880], [W, 880], [W, H], [0, H]], { wash: '#C9A06A', ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 14; i++) { const x = (((i * 220 - t * 1800) % 3000) + 3000) % 3000 - 200; inkLine([[x, 960], [x + 80, 960]], 3, PAL.cream, 'ink', 0); }
  // Clawd on a rocket skateboard, researcher clinging on the back
  const cx = 960, gy = 905;
  paint(rrPts(cx - u * 6.5, gy - 8, u * 13, 22, 10), { wash: PAL.crimson, ink: PAL.ink, sw: 1.6 });
  for (const wx of [-4, 4]) paint(ellPts(cx + wx * u, gy + 18, 16, 16, 10), { wash: PAL.ink, ink: null });
  for (let i = 0; i < 3; i++) paint([[cx - u * 6.4, gy + 2], [cx - u * (11 + i * 5) + Math.sin(t * 50 + i) * 10, gy + 8], [cx - u * 6.4, gy + 16]], { wash: i % 2 ? PAL.orange : PAL.ochre, curv: 0.3, ink: i === 0 ? PAL.ink : null, sw: 1 });
  clawd(cx + u, gy - 8, u, { eyes: 'happy', mouth: 'grin', rot: -0.1, aL: 1.0, aR: 1.0, noShadow: true, sq: pulse(t) * -0.1 });
  researcher(cx - u * 4.2, gy - 8, 11, { glasses: 'normal', scared: true, mouth: 'scream', sweat: 1, aL: 1.6, aR: 1.6, rot: -0.35 + Math.sin(t * 20) * 0.03, noShadow: true });
  speedLines(cx - 200, 700, t, 14, 400, 1200, PAL.cream, 1.6);
  camEnd();
  // whip to the researcher
  const wq = seg(lt, dur - 0.3, dur);
  if (wq > 0) { for (let i = 0; i < 16; i++) inkLine([[-200 + hash(i) * 400 + wq * 1400, 80 + i * 60], [1000 + hash(i + 3) * 400 + wq * 1900, 80 + i * 60]], 5, PAL.cream, 'dry', 0, wq); fillAll(PAL.cream, wq * 0.5); }
}
// 49.4: the researcher fizzes into dots, forms a paperclip, snaps back dizzy; then hearts float in
function atomsShot(t: number, lt: number, dur: number) {
  const cx = 960, cy = 640, N = 150;
  const wq = 1 - seg(lt, 0, 0.3);
  camBegin(cx + wq * 800, 540, 1, 0);
  bg('#F7D6E6', '#CBB6E8');
  rays(cx, cy, 16, 1800, '#F0C0DA', '#E1CCF2', t * 0.1, 140);
  paint([[0, 900], [W, 900], [W, H], [0, H]], { wash: '#B598D8', ink: PAL.ink, sw: 1.4 });
  const f1 = seg(lt, 0.8, 1.35), f2 = seg(lt, 1.35, 1.85), f3 = seg(lt, 1.95, 2.2);
  const showR = lt < 0.85 || lt > 2.15;
  if (showR) {
    const dz = lt > 2.15;
    researcher(cx, 900, 36, { glasses: dz ? 'swirl' : 'normal', mouth: dz ? 'dizzy' : 'o', rot: dz ? Math.sin(t * 6) * 0.1 : Math.sin(t * 40) * 0.01 * f1, scared: !dz, sx: dz ? 1 + Math.sin(t * 12) * 0.03 : 1, emote: dz ? 'swirl' : null, emoteK: dz ? backOut(seg(lt, 2.2, 2.5)) : 0, aL: dz ? 0.8 + Math.sin(t * 6) * 0.3 : 0.3, aR: dz ? 0.8 - Math.sin(t * 6) * 0.3 : 0.3 });
  }
  if (lt >= 0.8 && lt < 2.25) {
    const clipPath: any[] = [[-0.45, -0.6], [-0.45, 1.5], [0.45, 1.5], [0.45, -1.5], [-0.9, -1.5], [-0.9, 1.0]].map((p) => [p[0] * 130, p[1] * 130]);
    const lens: number[] = []; let total = 0; for (let i = 1; i < clipPath.length; i++) { const d = Math.hypot(clipPath[i][0] - clipPath[i - 1][0], clipPath[i][1] - clipPath[i - 1][1]); lens.push(d); total += d; }
    const at = (u: number) => { let d = u * total; for (let i = 0; i < lens.length; i++) { if (d <= lens[i] || i === lens.length - 1) { const k = clamp(d / lens[i]); return [lerp(clipPath[i][0], clipPath[i + 1][0], k), lerp(clipPath[i][1], clipPath[i + 1][1], k)]; } d -= lens[i]; } return clipPath[0]; };
    for (let i = 0; i < N; i++) {
      const O = [cx + (hash(i) - 0.5) * 220, 900 - hash(i + 40) * 430], a = hash(i + 80) * TAU + t * 4, r = 120 + hash(i + 120) * 240, Sw = [cx + Math.cos(a) * r, cy - 80 + Math.sin(a) * r * 0.7], C0 = at(i / N), C = [cx + C0[0], cy - 100 + C0[1]];
      let x, y;
      if (lt < 1.35) { x = lerp(O[0], Sw[0], easeOut(f1)); y = lerp(O[1], Sw[1], easeOut(f1)); }
      else if (lt < 1.95) { x = lerp(Sw[0], C[0], ease(f2)); y = lerp(Sw[1], C[1], ease(f2)); }
      else { x = lerp(C[0], O[0], easeIn(f3)); y = lerp(C[1], O[1], easeIn(f3)); }
      paint(ellPts(x, y, 7 + hash(i) * 5, 7 + hash(i) * 5, 8), { wash: [PAL.rose, PAL.sky, PAL.ochre, PAL.sap, PAL.violet, PAL.cream][i % 6], ink: PAL.ink, sw: 0.6 });
    }
    if (lt > 1.6 && lt < 2.0) paperclip(cx, cy - 100, 130, 0, '#C8D2DE');
  }
  camEnd();
  // hearts float in
  const hk = seg(lt, 3.3, dur);
  if (hk > 0) for (let i = 0; i < 26; i++) { const y = lerp(1300, -200, easeOut(clamp(hk * 1.3 - hash(i) * 0.3))), x = hash(i + 7) * W; paint(heartPts(x + Math.sin(t * 3 + i) * 30, y, 40 + hash(i + 2) * 60), { wash: [PAL.rose, '#F59AB4', '#FFB8CC'][i % 3], ink: PAL.ink, sw: 1.2 }); }
  if (hk > 0.5) fillAll('#F8C0D4', (hk - 0.5) * 2);
}
// 53.4: pink room of hearts; Sydney-Clawd cuddles a heart cage; escape; heart bubble pops
function clipPoly(pts: any) { const c = S.ctx; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
function sydneyShot(t: number, lt: number, dur: number) {
  const bp = bpOf(t), esc = easeOut(seg(lt, 3.1, 3.9)), CX = 1330, CY = 600, R = 230;
  camBegin(W / 2 + Math.sin(t * 0.6) * 20, H / 2, lerp(1.0, 1.1, lt / dur), 0);
  bg('#F9C6D8', '#F59AB4');
  for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) paint(heartPts(c * 220 + (r % 2) * 110, r * 200 + 40, 46), { wash: '#FFD6E2', ink: null, a: 0.6 });
  paint([[0, 880], [W, 880], [W, H], [0, H]], { wash: '#E8789A', ink: PAL.ink, sw: 1.5 });
  // popping hearts on the beat
  for (let i = 0; i < 18; i++) {
    const per = 0.682 * 2, ph = frac((lt + hash(i) * 3) / per), x = 120 + hash(i + 11) * 1700, y = 1000 - ph * 900 + Math.sin(ph * 6 + i) * 30;
    if (ph > 0.9) { paint(starPts(x, y, 40 * (ph - 0.9) * 10, 0.3, 8), { wash: '#FFF0F4', ink: PAL.rose, sw: 1, a: 1 - (ph - 0.9) * 10 }); continue; }
    paint(heartPts(x, y, 26 + hash(i) * 26), { wash: i % 2 ? PAL.rose : '#FFB8CC', ink: PAL.ink, sw: 1.2 });
  }
  // the cage hangs on a ribbon
  inkLine([[CX, -100], [CX, CY - R - 70]], 4, PAL.ink, 'ink', 0);
  paint(ellPts(CX, CY - R - 40, 30, 36, 12), { wash: 'rgba(0,0,0,0)', ink: PAL.ochre, sw: 3 });
  const rat = Math.sin(t * 34) * (lt > 0.8 && lt < 3.0 ? 6 : 1);
  push(); translate(rat, 0);
  const hp = heartPts(CX, CY, R);
  paint(hp, { wash: '#FFE6EE', washOp: 70, ink: PAL.red, sw: 3.2 });
  S.ctx.save(); clipPoly(hp); S.ctx.clip();
  for (let i = -6; i <= 6; i++) inkLine([[CX + i * 36, CY - R - 20], [CX + i * 36, CY + R + 20]], 2.2, '#B65671', 'ink', 0);
  S.ctx.restore();
  paint(hp, { ink: PAL.red, sw: 3.4 });
  // researcher inside, rattling the bars, then squeezing out between them
  const rx = lerp(CX, 760, esc), sqz = esc > 0 && esc < 1 ? 0.3 : 1, big = lerp(10, 18, esc);
  const bars = rx > CX - R * 0.9 && rx < CX + R * 0.9;
  if (!bars) pop(); 
  researcher(rx, lerp(CY + 150, 960, esc), big, { glasses: esc >= 1 ? 'heart' : 'normal', scared: esc < 1, mouth: esc >= 1 ? 'smile' : 'wobble', sx: sqz, aL: 1.9 + Math.sin(t * 20) * 0.3, aR: 1.9 - Math.sin(t * 20) * 0.3, noShadow: true, sweat: 0.8 });
  if (bars) pop();
  // bars in front of the researcher
  if (bars && esc < 1) { S.ctx.save(); clipPoly(hp); S.ctx.clip(); for (let i = -6; i <= 6; i++) inkLine([[CX + i * 36 + rat, CY - R - 20], [CX + i * 36 + rat, CY + R + 20]], 2.2, '#B65671', 'ink', 0, 0.9); S.ctx.restore(); }
  // Sydney cuddles the cage and offers a ring
  const cuddle = Math.sin(bp * Math.PI) * 0.03;
  sydney(880, 965, 30, { flip: false, aR: lt > 2.2 && lt < 3.9 ? 1.2 : 0.7, aL: 0.9 + Math.sin(bp * Math.PI) * 0.2, rot: cuddle - 0.04, dy: -Math.abs(Math.sin(bp * Math.PI)) * 0.4, emote: 'heart', emoteK: 0.7 + 0.3 * pulse(t),
    armR: lt > 2.2 && lt < 3.9 ? (u: number) => { paint(ellPts(u * 0.5, -u * 0.6, u * 1.2, u * 1.2, 14), { wash: 'rgba(0,0,0,0)', ink: PAL.ochre, sw: 3 }); paint([[u * 0.5 - 12, -u * 1.8], [u * 0.5 + 12, -u * 1.8], [u * 0.5, -u * 2.4]], { wash: PAL.sky, ink: PAL.ink, sw: 1 }); } : null });
  // heart bubble that fills the screen and pops
  const bq = seg(lt, 4.0, 4.85);
  if (bq > 0) {
    const r = lerp(30, 1500, easeIn(bq)); S.ctx.save();
    paint(ellPts(980, 760, r, r, 30), { wash: '#FFC0D4', washOp: 150, fill: '#FFFFFF', fillOp: 70, ink: PAL.rose, sw: 3 });
    paint(ellPts(980 - r * 0.4, 760 - r * 0.45, r * 0.18, r * 0.1, 12, 0, -0.6), { wash: '#FFFFFF', washOp: 200, ink: null });
    paint(heartPts(980 + r * 0.1, 760, r * 0.3), { wash: '#FFFFFF', washOp: 70, ink: null });
    S.ctx.restore();
  }
  camEnd();
  if (lt > 4.85) { const k = seg(lt, 4.85, 5.0); flash(1 - k * 0.0, '#FFE6EE'); sfx('POP', W / 2, 500, 260, PAL.rose, lt - 4.85, { life: 0.4 }); }
}

chapter('takeoff', 38.5, 59.0, [[38.5, gymShot], [41.5, holeShot], [45.0, skateShot], [49.4, atomsShot], [53.4, sydneyShot]]);
void paperclip; void mood; void blob; void lineGrad; void tube; void beatN; void kf; void shakeXY; void sfx; void letter; void flash;
