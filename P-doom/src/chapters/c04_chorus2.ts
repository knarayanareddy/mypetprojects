// @ts-nocheck
import { PAL, W, H, clamp, lerp, ease, easeOut, easeIn, backOut, hash, bpOf, beatN, pulse, seg, frac, kf, mixCol, TAU, camBegin, camEnd, push, pop, translate, rotate, scale, paint, inkLine, tube, blob, bg, fillAll, lineGrad, rectPts, ellPts, rrPts, starPts, heartPts, letter, sfx, flash, shakeXY, S } from '../engine/core';
import { clawd, dancer, researcher, move } from '../engine/clawd';
import { basilisk, cloud, rays, speedLines, stage, meterProp } from '../engine/cast';
import { chapter, pdoomAt } from '../engine/timeline';
import { chorusStage } from './shared';

function gpuCard(x: number, y: number, s: number) {
  push(); translate(x, y); scale(s);
  paint(rrPts(-640, -330, 1280, 640, 36), { wash: '#16282A', fill: PAL.teal, fillOp: 50, ink: PAL.ink, sw: 2 });
  paint(rectPts(-560, 300, 1120, 50, 0), { wash: PAL.ochre, ink: PAL.ink, sw: 1.5 });
  for (let i = 0; i < 28; i++) paint(rectPts(-540 + i * 40, 306, 24, 40, 0), { wash: '#C98A1E', ink: null });
  for (let i = 0; i < 14; i++) inkLine([[-600, -280 + i * 40], [-480 - hash(i) * 120, -280 + i * 40], [-420, -240 + i * 40]], 1.2, '#5FE0D6', 'inkfine', 0, 0.6);
  pop();
}
function galaxyFan(x: number, y: number, r: number, rot: number) {
  paint(ellPts(x, y, r, r, 26), { wash: '#0E1522', ink: PAL.ink, sw: 2.4 });
  for (let a = 0; a < 5; a++) {
    const pts: any[] = []; for (let i = 0; i < 16; i++) { const rr = (i / 15) * r * 0.9, an = rot + (a / 5) * TAU + i * 0.18; pts.push([x + Math.cos(an) * rr, y + Math.sin(an) * rr]); }
    inkLine(pts, r * 0.07, [PAL.violet, PAL.rose, PAL.sky, PAL.ochre, PAL.cream][a], 'ink', 0.5);
  }
  paint(ellPts(x, y, r * 0.16, r * 0.16, 12), { wash: PAL.cream, ink: PAL.ink, sw: 1.2 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; paint(ellPts(x + Math.cos(a) * r * 0.97, y + Math.sin(a) * r * 0.97, 5, 5, 6), { wash: PAL.steel, ink: null }); }
}
function space(t: number, cy = 0, hue = 0) {
  bg(mixCol('#0B0A2A', '#2A1650', hue), mixCol('#1B1650', '#4A2B7A', hue));
  for (let i = 0; i < 90; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 3 + i); paint(starPts(hash(i) * W, hash(i + 9) * H + cy, 3 + hash(i + 3) * 7, 0.3, 4), { wash: PAL.cream, ink: null, a: 0.5 + tw * 0.5 }); }
}

// 59.0: the arena, building-sized Clawd works two pumps
function arenaShot(t: number, lt: number) {
  camBegin(W / 2, H / 2, lerp(1.0, 1.1, lt / 1.5), 0);
  chorusStage(t, { th: 'pyro', leadU: 52, leadX: 1000, troupeU: 14, pumpRate: 1.0, meterS: 1.1, leadStyle: 'bounce' });
  // second pump on the left side of the meter, both arms pumping
  const bp = bpOf(t), pm = 0.5 + 0.5 * Math.sin(bp * Math.PI + Math.PI);
  paint(rrPts(1330, 700, 36, 150, 8), { wash: PAL.teal, ink: PAL.ink, sw: 1.4 }); inkLine([[1348, 730 - pm * 90], [1348, 710]], 5, '#C9C9D2', 'ink', 0);
  inkLine([[1310, 640 - pm * 90 + 60], [1386, 640 - pm * 90 + 60]], 8, PAL.ink, 'ink', 0);
  for (const sx of [380, 1540]) { const k = 0.4 + 0.6 * pulse(t, 3); paint([[sx - 40, 0], [sx, 760], [sx + 40, 0]], { wash: PAL.cream, washOp: 40 + k * 30, ink: null }); }
  camEnd();
}
// 60.5: BOOM, the basilisk bursts through the floor; GPUs as offerings
function basiliskShot(t: number, lt: number, dur: number) {
  const bt = 0.35, [sx, sy] = shakeXY(t, lt > bt ? 16 * (1 - seg(lt, bt, 1.6)) : 2);
  camBegin(W / 2 + sx, H / 2 + sy, 1.0 + 0.05 * easeOut(seg(lt, bt, 0.6)), 0);
  stage(t, 'pyro');
  // hole in the floor
  const hk = easeOut(seg(lt, bt, bt + 0.15));
  paint(ellPts(960, 900, 330 * hk, 70 * hk, 22), { wash: '#12080E', ink: PAL.ink, sw: 2 });
  // troupe falls over
  for (let i = 0; i < 6; i++) {
    const x = 170 + i * 316, f = easeOut(seg(lt, bt, bt + 0.4 + i * 0.03)), ex = x + (x < 960 ? -1 : 1) * f * 60;
    clawd(ex, 790 + f * 30, 13, { ...(f < 0.02 ? move('mix', t, i * 0.5) : {}), rot: f * (x < 960 ? -1.5 : 1.5), eyes: f > 0.1 ? 'x' : 'happy', hat: ['party', 'band', 'crown', 'wizard', 'top', 'hard'][i], mouth: f > 0.1 ? 'O' : 'smile', dy: -Math.sin(f * Math.PI) * 6 });
  }
  const rise = easeOut(seg(lt, bt, 1.0));
  basilisk(960, 910, 24, t, { rise, lean: Math.sin(t * 2) * 1.5 });
  // planks flying
  if (lt > bt) for (let i = 0; i < 12; i++) { const q = lt - bt, vx = (hash(i) - 0.5) * 1400, vy = -900 - hash(i + 4) * 700, x = 960 + vx * q * 0.6, y = 880 + vy * q + 1800 * q * q; if (y > 1300) continue; push(); translate(x, y); rotate(q * (4 + hash(i) * 6)); paint(rectPts(-60, -12, 120, 24, 1), { wash: '#B3763C', ink: PAL.ink, sw: 1.2 }); pop(); }
  // the researcher frantically throws GPUs
  const gt = lt - 1.0;
  researcher(380, 985, 24, { glasses: 'normal', scared: true, mouth: 'scream', sweat: 1, aR: gt > 0 ? 1.9 + Math.sin(gt * 18) * 0.4 : 1, aL: 1.5, dy: -Math.abs(Math.sin(t * 10)) * 0.4, rot: 0.05 });
  if (gt > 0) for (let i = 0; i < 6; i++) {
    const per = 0.34, k = frac((gt - i * per * 0.5) / (per * 3)), x = lerp(430, 900, k), y = 800 - Math.sin(k * Math.PI) * 340;
    if (gt - i * per * 0.5 < 0) continue;
    push(); translate(x, y); rotate(k * 9); paint(rrPts(-40, -22, 80, 44, 5), { wash: '#1E3A32', ink: PAL.ink, sw: 1.1 }); paint(ellPts(0, 0, 14, 14, 10), { wash: PAL.steel, ink: PAL.ink, sw: 0.8 }); paint(rectPts(-30, 16, 60, 6, 0), { wash: PAL.ochre, ink: null }); pop();
  }
  camEnd();
  sfx('BOOM', 960, 360, 260, PAL.orange, lt - bt, { life: 1.0 });
  void dur;
}
// 63.0: a green stock line rockets off its chart; Clawd rides it to the moon
function moonShot(t: number, lt: number, dur: number) {
  const p = ease(seg(lt, 0, 1.0)), pathX = (q: number) => 300 + q * 880, pathY = (q: number) => 880 - 2750 * Math.pow(q, 2.2);
  const cyBase = lerp(540, -1500, easeIn(seg(lt, 0.15, 1.1))), zoomOut = easeOut(seg(lt, 1.15, dur));
  camBegin(lerp(960, 1050, p), lerp(cyBase, -1450, zoomOut), lerp(1.0, 0.62, zoomOut), 0);
  const c = S.ctx; c.fillStyle = lineGrad(0, -2600, 0, 900, [[0, '#07061E'], [0.45, '#2B3C86'], [0.75, '#8EC3E6'], [1, '#10261C']]); c.fillRect(-1500, -2600, W + 3000, 3500);
  for (let i = 0; i < 80; i++) paint(starPts(hash(i) * W, -hash(i + 5) * 2000 - 300, 4 + hash(i + 2) * 8, 0.3, 4), { wash: PAL.cream, ink: null, a: 0.8 });
  // chart panel
  paint(rrPts(120, 120, 1680, 780, 20), { wash: '#0F1F18', ink: PAL.ink, sw: 2 });
  for (let i = 1; i < 10; i++) inkLine([[120 + i * 168, 120], [120 + i * 168, 900]], 0.7, '#2F5A44', 'inkfine', 0);
  for (let i = 1; i < 6; i++) inkLine([[120, 120 + i * 130], [1800, 120 + i * 130]], 0.7, '#2F5A44', 'inkfine', 0);
  const pts: any[] = []; for (let i = 0; i <= 50; i++) { const q = (i / 50) * p; pts.push([pathX(q), pathY(q) + Math.sin(i * 1.7) * 16 * (1 - q)]); }
  const up: any[] = []; for (let i = 0; i <= 50; i++) { const q = (i / 50) * clamp(p * 1.0); up.push([pathX(q), pathY(q)]); }
  inkLine(pts, 6, '#42E58A', 'ink', 0.5);
  // clouds the line passes through
  for (let i = 0; i < 8; i++) cloud(300 + hash(i) * 1500, -200 - i * 120, 60 + hash(i + 3) * 40, PAL.cream, 0.95);
  // the moon
  push(); translate(1100, -1900); paint(ellPts(0, 0, 360, 360, 36), { wash: '#EDE6D2', fill: '#B9B2A0', fillOp: 90, ink: PAL.ink, sw: 2.4 }); for (const [cx, cy, r] of [[-120, -80, 60], [100, 40, 90], [-40, 140, 44], [150, -150, 40]]) paint(ellPts(cx, cy, r, r * 0.8, 14), { fill: '#9C957F', fillOp: 120, ink: PAL.ink, sw: 1 }); pop();
  const qx = pathX(p), qy = pathY(p), landed = lt > 1.1;
  const plant = backOut(seg(lt, 1.2, 1.5));
  const gx = landed ? 1140 : qx, gy = landed ? -1550 : qy;
  clawd(gx, gy, landed ? 30 : 16, { eyes: 'happy', mouth: 'grin', aL: 1.4, aR: landed ? 1.9 : 1.3, rot: landed ? 0 : -0.5, noShadow: !landed, sq: landed ? 0 : -0.1, hat: null });
  if (landed) { inkLine([[1010, -1550], [1010, -1900 * 0 - 1950]], 5, '#E9E3D5', 'ink', 0); paint([[1010, -1950], [1010 + 180 * plant, -1920 + Math.sin(t * 6) * 8], [1010, -1860]], { wash: '#42E58A', ink: PAL.ink, sw: 1.6, curv: 0.3 }); paint(starPts(1090, -1910, 22 * plant, 0.4, 4), { wash: PAL.cream, ink: null }); }
  camEnd();
  sfx('WHOOSH', 700, 700, 120, PAL.cream, lt - 0.1, { life: 0.8, rot: -0.3 });
}
// 64.5: galaxies spiral inward and converge into one blinding point
function omegaShot(t: number, lt: number, dur: number) {
  const p = lt / dur, cx = W / 2, cy = 500;
  camBegin(cx, cy, 1 + easeIn(p) * 0.4, 0);
  space(t, 0, 0.5);
  for (let g = 0; g < 9; g++) {
    const a = (g / 9) * TAU + 0.4, R = 1200 * (1 - easeIn(clamp(p * 1.1 - hash(g) * 0.1))), gx = cx + Math.cos(a) * R, gy = cy + Math.sin(a) * R * 0.7, sz = (200 + hash(g + 3) * 120) * (1 - easeIn(p) * 0.7);
    for (let arm = 0; arm < 3; arm++) { const pts: any[] = []; for (let i = 0; i < 24; i++) { const rr = (i / 23) * sz, an = t * 1.5 * (g % 2 ? 1 : -1) + (arm / 3) * TAU + i * 0.17; pts.push([gx + Math.cos(an) * rr, gy + Math.sin(an) * rr * 0.55]); } inkLine(pts, sz * 0.05, [PAL.violet, PAL.rose, PAL.sky, PAL.ochre][g % 4], 'ink', 0.5, 0.9); }
    blob(gx, gy, sz * 0.4, PAL.cream, 200);
  }
  // swirling inward lines
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU + t * 1.2, pts: any[] = []; for (let k = 0; k < 10; k++) { const rr = lerp(1000, 20, k / 9) * (1 - p * 0.3), aa = a + k * 0.28; pts.push([cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr * 0.7]); } inkLine(pts, 1.2, PAL.cream, 'dry', 0.5, 0.4); }
  blob(cx, cy, 80 + easeIn(p) * 900, '#FFFFFF', 255 * easeIn(p) + 30);
  paint(starPts(cx, cy, 20 + easeIn(p) * 260, 0.18, 8, t), { wash: '#FFFFFF', ink: null, a: easeIn(p) });
  clawd(cx, cy + 260, 20, { dy: -1 - Math.sin(t * 2) * 0.6, eyes: 'happy', mouth: 'smile', aL: 0.05, aR: 0.05, rot: Math.sin(t * 1.5) * 0.08, noShadow: true });
  camEnd();
}
// 66.0: a planet-sized GPU; zeros overflow the odometer like gumballs
function gpuShot(t: number, lt: number, dur: number) {
  const z = lerp(0.8, 1.05, ease(lt / dur));
  camBegin(W / 2, H / 2 + 20, z, Math.sin(t * 0.5) * 0.02);
  space(t, 0, 0.2);
  blob(W / 2, 600, 900, PAL.teal, 90);
  gpuCard(960, 600, 1);
  galaxyFan(620, 640, 230, t * 3); galaxyFan(1300, 640, 230, -t * 3.4);
  // odometer on the top edge
  paint(rrPts(380, 120, 1160, 160, 18), { wash: '#08110F', ink: PAL.ochre, sw: 3 });
  const cells = 12, over = easeIn(seg(lt, 1.2, 3.0));
  for (let i = 0; i < cells; i++) {
    const x = 450 + i * 90, spin = (i === 0 ? 1 : 2 + i * 0.9) * lt * 10, d = lt > 3.1 ? 0 : Math.floor(spin + hash(i) * 10) % 10, dd = i === 0 ? 1 : i === 1 ? 0 : d;
    paint(rrPts(x - 34, 140, 68, 120, 10), { wash: '#1B2B27', ink: PAL.ink, sw: 1.2 });
    letter(i === 0 ? '1' : lt > 1.2 + i * 0.12 ? '0' : String(dd), x, 202, 84, i === 0 ? PAL.ochre : '#7DFFB0', { ink: false, font: '"Shantell Sans", monospace' });
  }
  // zeros pour out of the right end like gumballs, bouncing through space
  const nz = 26;
  for (let i = 0; i < nz; i++) {
    const t0 = 1.5 + i * 0.1, s = lt - t0; if (s < 0) continue;
    const x0 = 1540, vx = -120 - hash(i) * 520, per = 0.7 + hash(i + 5) * 0.5, x = x0 + vx * s + (hash(i + 9) - 0.5) * 80, fl = 960, r = 36 + hash(i + 2) * 16, tf = 0.45;
    const ss = Math.max(0, s - tf), nb = Math.floor(ss / per), y2 = s < tf ? lerp(240, fl, easeIn(s / tf)) : fl - Math.abs(Math.sin((ss / per) * Math.PI)) * 460 * Math.pow(0.62, nb);
    paint(ellPts(x, clamp(y2, 100, 980) - r, r, r, 14), { wash: [PAL.rose, PAL.sky, PAL.ochre, PAL.sap, PAL.violet][i % 5], fill: '#FFFFFF', fillOp: 70, ink: PAL.ink, sw: 1.4 });
    letter('0', x, clamp(y2, 100, 980) - r, r * 1.2, PAL.cream);
  }
  void over;
  camEnd();
  if (lt > 3.0 && lt < 3.7) sfx('DING', 1150, 330, 120, PAL.ochre, lt - 3.0, { life: 0.7 });
  // drop back to Earth
  const dq = seg(lt, dur - 0.7, dur);
  if (dq > 0) { fillAll('#8EC3E6', ease(dq)); for (let i = 0; i < 18; i++) { const x = hash(i) * W; inkLine([[x, -200 + dq * 2400 * (0.5 + hash(i + 3))], [x, -900 + dq * 2400 * (0.5 + hash(i + 3))]], 5, PAL.cream, 'dry', 0, 0.9); } }
}
function glowMonster(x: number, y: number, s: number, t: number, wave: number) {
  blob(x, y - 5 * s, 9 * s, '#FFD84A', 150 + Math.sin(t * 8) * 20);
  paint(ellPts(x, y - 5 * s, 5.6 * s, 5 * s, 22, s * 0.1), { wash: '#FF8A4A', fill: PAL.red, fillOp: 90, ink: PAL.ink, sw: 1.6 });
  for (const e of [-1, 1]) { paint([[x + e * 3 * s, y - 9 * s], [x + e * 4 * s, y - 12 * s], [x + e * 2 * s, y - 9.6 * s]], { wash: PAL.cream, ink: PAL.ink, sw: 1 }); paint(ellPts(x + e * 1.9 * s, y - 6.4 * s, 1.3 * s, 1.5 * s, 10), { wash: PAL.cream, ink: PAL.ink, sw: 0.9 }); paint(ellPts(x + e * 1.9 * s + Math.sin(t * 3) * 0.3 * s, y - 6.2 * s, 0.5 * s, 0.7 * s, 8), { wash: PAL.ink, ink: null }); }
  paint([[x - 2.8 * s, y - 3.4 * s], [x, y - 2.2 * s], [x + 2.8 * s, y - 3.4 * s], [x, y - 4.2 * s]], { wash: '#2A0E1A', ink: PAL.ink, sw: 1, curv: 0.4 });
  for (let i = -2; i <= 2; i++) paint([[x + i * 0.9 * s - 0.3 * s, y - 3.6 * s], [x + i * 0.9 * s + 0.3 * s, y - 3.6 * s], [x + i * 0.9 * s, y - 2.9 * s]], { wash: PAL.cream, ink: null });
  tube([[x + 4.8 * s, y - 4 * s], [x + (6.4 + Math.sin(t * 12) * 0.8 * wave) * s, y - 6 * s], [x + (7.2 + Math.sin(t * 12) * 1.2 * wave) * s, y - (8.5 + wave) * s]], 1.4 * s, '#FF8A4A');
}
// 70.0: hard-hat Clawds shove a vault door shut; the camera orbits to the back: no back wall
function vaultShot(t: number, lt: number, dur: number) {
  bg('#7E8FA6', '#46566E');
  paint([[0, 860], [W, 860], [W, H], [0, H]], { wash: '#5E6A7C', ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 12; i++) inkLine([[i * 200, 860], [i * 280 - 400, H]], 1, PAL.ink, 'inkfine', 0, 0.4);
  const th = lt < 1.9 ? 0 : easeOut(seg(lt, 1.9, 3.0)) * Math.PI, c = Math.cos(th), sn = Math.sin(th), D = 220, VW = 700, VH = 620, VY = 540;
  const shut = ease(seg(lt, 0.1, 0.85)), doorAng = (1 - shut) * 1.3;
  const faceX = (side: number) => 960 + side * sn * D, fx = (side: number, dx: number) => faceX(side) + dx * c;
  const drawFront = () => {
    // vault front face: frame + (open or shut) round door
    paint([[fx(-1, -VW / 2), VY - VH / 2], [fx(-1, VW / 2), VY - VH / 2], [fx(-1, VW / 2), VY + VH / 2], [fx(-1, -VW / 2), VY + VH / 2]], { wash: '#8A98AE', fill: '#4A5568', fillOp: 90, ink: PAL.ink, sw: 2.2 });
    const ix = fx(-1, 0), iw = 520 * c;
    paint(rectPts(Math.min(ix - iw / 2, ix + iw / 2), VY - 240, Math.abs(iw), 480, 2), { wash: '#10161F', ink: PAL.ink, sw: 1.6 });
    if (th < Math.PI / 2) {
      if (shut < 0.99) { blob(ix, VY, 300, '#FFD84A', 120 * (1 - shut)); glowMonster(ix, VY + 200, 38 * Math.abs(c) + 4, t, 1); }
      const dr = 250 * Math.abs(c), rx = Math.max(6, dr * Math.cos(doorAng)), hinge = ix - dr;
      paint(ellPts(hinge + rx, VY, rx, 250, 26), { wash: '#9AA8BC', fill: '#5E6A7C', fillOp: 100, ink: PAL.ink, sw: 2.4 });
      paint(ellPts(hinge + rx, VY, rx * 0.8, 200, 24), { ink: '#46566E', sw: 1.6 });
      if (shut > 0.95) { const spin = easeOut(seg(lt, 0.95, 1.5)) * 9; push(); translate(ix, VY); scale(Math.abs(c), 1); paint(ellPts(0, 0, 70, 70, 16), { wash: PAL.cream, ink: PAL.ink, sw: 2 }); for (let k = 0; k < 4; k++) { const a = spin + (k / 4) * TAU; inkLine([[0, 0], [Math.cos(a) * 110, Math.sin(a) * 110]], 5, PAL.ink, 'ink', 0); paint(ellPts(Math.cos(a) * 110, Math.sin(a) * 110, 12, 12, 8), { wash: PAL.ochre, ink: PAL.ink, sw: 1 }); } pop(); }
    }
  };
  const drawBack = () => { // open frame: no back wall
    const hw = VW / 2 * c, rim = 60 * Math.abs(c);
    const bx = faceX(1), L = bx - Math.abs(hw), Rr = bx + Math.abs(hw);
    paint([[L, VY - VH / 2], [Rr, VY - VH / 2], [Rr, VY - VH / 2 + 60], [L, VY - VH / 2 + 60]], { wash: '#8A98AE', ink: PAL.ink, sw: 2 });
    paint([[L, VY + VH / 2 - 60], [Rr, VY + VH / 2 - 60], [Rr, VY + VH / 2], [L, VY + VH / 2]], { wash: '#8A98AE', ink: PAL.ink, sw: 2 });
    paint([[L, VY - VH / 2], [L + rim, VY - VH / 2], [L + rim, VY + VH / 2], [L, VY + VH / 2]], { wash: '#8A98AE', ink: PAL.ink, sw: 2 });
    paint([[Rr - rim, VY - VH / 2], [Rr, VY - VH / 2], [Rr, VY + VH / 2], [Rr - rim, VY + VH / 2]], { wash: '#8A98AE', ink: PAL.ink, sw: 2 });
  };
  const drawSides = () => {
    const fl = faceX(-1), bk = faceX(1), hw = (VW / 2) * c;
    const lf = fl - hw * Math.sign(c || 1), rf = fl + hw * Math.sign(c || 1), lb = bk - hw * Math.sign(c || 1), rb = bk + hw * Math.sign(c || 1);
    paint([[lf, VY - VH / 2], [rf, VY - VH / 2], [rb, VY - VH / 2], [lb, VY - VH / 2]], { wash: '#A9B6CA', ink: PAL.ink, sw: 2 });
    paint([[sn > 0.02 ? (c > 0 ? rf : lf) : rf, VY - VH / 2], [c > 0 ? rb : lb, VY - VH / 2], [c > 0 ? rb : lb, VY + VH / 2], [c > 0 ? rf : lf, VY + VH / 2]], { wash: '#6E7B90', fill: '#3A4658', fillOp: 90, ink: PAL.ink, sw: 2 });
  };
  if (c >= 0) { drawSides(); drawFront(); }
  else {
    drawFront();
    const mx = (faceX(-1) + faceX(1)) / 2; glowMonster(mx, VY + 220, 40 * Math.abs(c) + 6, t, 2.4);
    drawBack(); drawSides();
    if (c < -0.3) sfx('HI!', 960, 220, 90, PAL.ochre, lt - 2.5, { life: 1.2 });
  }
  // hard-hat Clawds
  if (th < 0.3) {
    for (let i = 0; i < 3; i++) clawd(300 + i * 140 + shut * 400, 900, 15, { hat: 'hard', rot: 0.18 * (1 - shut) + 0.04, aL: 0.9, eyes: lt > 1.4 ? 'happy' : 'narrow', mouth: lt > 1.4 ? 'grin' : 'flat', dy: lt > 1.45 && lt < 1.8 ? -Math.sin(seg(lt, 1.45, 1.8) * Math.PI) * 2.2 : 0, aR: lt > 1.4 && lt < 1.9 && i < 2 ? 1.4 : 0.9, flip: false });
  }
  void dur;
}

chapter('chorus2', 59.0, 73.0, [[59.0, arenaShot], [60.5, basiliskShot], [63.0, moonShot], [64.5, omegaShot], [66.0, gpuShot], [70.0, vaultShot]]);
void clamp; void kf; void beatN; void flash; void rays; void speedLines; void meterProp; void pdoomAt; void dancer; void heartPts; void rotate; void camBegin;
