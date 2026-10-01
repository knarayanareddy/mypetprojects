// @ts-nocheck
import { PAL, W, H, clamp, lerp, ease, easeOut, easeIn, backOut, hash, bpOf, beatN, pulse, seg, frac, kf, mixCol, TAU, camBegin, camEnd, push, pop, translate, rotate, scale, paint, inkLine, tube, blob, bg, fillAll, lineGrad, rectPts, ellPts, rrPts, starPts, heartPts, letter, sfx, flash, shakeXY, S } from '../engine/core';
import { clawd, researcher, mood, move, dancer } from '../engine/clawd';
import { cloud, paperclip, stage, rays } from '../engine/cast';
import { chapter } from '../engine/timeline';
import { chorusStage } from './shared';

function clipHeap(x: number, y: number, w: number, h: number, n: number, t = 0) {
  paint([[x - w, y], [x - w * 0.7, y - h * 0.5], [x - w * 0.3, y - h * 0.9], [x + w * 0.2, y - h], [x + w * 0.6, y - h * 0.6], [x + w, y]], { wash: '#9AA6B4', fill: PAL.steel, fillOp: 100, ink: PAL.ink, sw: 1.4, curv: 0.4 });
  for (let i = 0; i < n; i++) { const px = x + (hash(i) - 0.5) * w * 1.8, py = y - hash(i + 5) * h * 0.9 * (1 - Math.abs(px - x) / w * 0.7); paperclip(px, py, 22 + hash(i + 2) * 14, hash(i + 8) * TAU + Math.sin(t + i) * 0.05, i % 3 ? '#C8D2DE' : '#E2B64A'); }
}
function paperclipMachine(x: number, y: number, t: number, rate = 1) {
  paint(rrPts(x - 80, y - 210, 160, 210, 14), { wash: '#6A7B8A', fill: '#2A3A44', fillOp: 90, ink: PAL.ink, sw: 2 });
  paint([[x - 70, y - 210], [x + 70, y - 210], [x + 40, y - 270], [x - 40, y - 270]], { wash: '#8FA0AE', ink: PAL.ink, sw: 1.6 });
  paint(rrPts(x - 130, y - 100, 60, 30, 8), { wash: '#4A5A66', ink: PAL.ink, sw: 1.4 });
  paint(ellPts(x, y - 140, 34, 34, 14), { wash: '#B9C6D2', ink: PAL.ink, sw: 1.6 });
  for (let k = 0; k < 4; k++) { const a = t * 5 * rate + (k / 4) * TAU; inkLine([[x, y - 140], [x + Math.cos(a) * 34, y - 140 + Math.sin(a) * 34]], 2.4, PAL.ink, 'ink', 0); }
  for (let i = 0; i < 7; i++) { const q = frac(t * 2.2 * rate + i / 7); paperclip(x - 110 - q * 240, y - 85 + Math.sin(q * Math.PI) * -80 + q * q * 160, 22, q * 7 + i, i % 2 ? '#C8D2DE' : '#E2B64A'); }
}
// 95.4: the researcher lands in a heap of paperclips; the pump is now a paperclip machine
function landShot(t: number, lt: number, dur: number) {
  const [sx, sy] = shakeXY(t, lt > 0.5 && lt < 0.8 ? 12 : 0);
  camBegin(W / 2 + sx, H / 2 + sy, 1.0, 0);
  chorusStage(t, { th: 'flood', leadU: 38, leadX: 1130, noResearcher: true, leadEyes: 'narrow', leadMouth: 'smile', troupeU: 12, pumpRate: 1 });
  paint(rrPts(1560 - 100, 560, 400, 330, 10), { wash: '#4B535F', washOp: 0, ink: null });
  paperclipMachine(1700, 840, t, 1.3);
  clipHeap(560, 990, 330, 160, 34, t);
  const q = seg(lt, 0, 0.5), land = lt >= 0.5;
  const y = land ? 975 : lerp(-300, 975, easeIn(q)), rot = land ? lerp(1.3, 0, easeOut(seg(lt, 0.9, 1.7))) : q * 5;
  researcher(560, y - 30, 24, { rot, glasses: land && lt < 1.3 ? 'x' : 'normal', mouth: land && lt < 1.3 ? 'dizzy' : 'o', scared: !land, aL: land ? 1.2 : 1.9, aR: land ? 1.2 : 1.9, noShadow: true, sq: land && lt < 0.7 ? 0.15 : 0 });
  if (land) for (let i = 0; i < 8; i++) { const qq = lt - 0.5, a = hash(i) * Math.PI + Math.PI, v = 300 + hash(i + 3) * 300; paperclip(560 + Math.cos(a) * v * qq, 930 + Math.sin(a) * v * qq + 1400 * qq * qq, 24, qq * 8 + i); }
  camEnd();
  sfx('THUD', 560, 740, 100, PAL.cream, lt - 0.5, { life: 0.6 });
}
const waveY = (x: number, t: number, lv: number) => lv + Math.sin(x * 0.006 + t * 3) * 34 + Math.sin(x * 0.013 - t * 2) * 16;
// 97.5: a flood of paperclips; Clawd surfs a wave
function floodShot(t: number, lt: number, dur: number) {
  const lv = lerp(980, 640, ease(lt / dur));
  camBegin(W / 2, H / 2 + Math.sin(t * 2) * 8, 1.0, Math.sin(t * 1.7) * 0.012);
  stage(t, 'flood');
  const pts: any[] = [[-60, H + 60]]; for (let x = -60; x <= W + 60; x += 30) pts.push([x, waveY(x, t, lv)]); pts.push([W + 60, H + 60]);
  // back waves of clips
  for (let L = 0; L < 3; L++) {
    const p2: any[] = [[-60, H + 60]]; for (let x = -60; x <= W + 60; x += 30) p2.push([x, waveY(x + 200 * L, t + L, lv - 70 + L * 20)]); p2.push([W + 60, H + 60]);
    paint(p2, { wash: ['#7C8794', '#98A4B2', '#B7C2CF'][L], ink: PAL.ink, sw: 1.4 });
    for (let i = 0; i < 26; i++) { const x = hash(i + L * 9) * W; paperclip(x, waveY(x + 200 * L, t + L, lv - 70 + L * 20) + 20 + hash(i + 2) * 120, 20 + L * 4, hash(i) * TAU + t * (L + 1) * 0.3, '#C8D2DE'); }
  }
  // bobbing troupe
  for (let i = 0; i < 5; i++) { const x = 220 + i * 360, y = waveY(x, t, lv - 70 + 20) + 10; clawd(x, y, 11, { hat: ['party', 'band', 'hard', 'wizard', 'top'][i], eyes: 'scared', mouth: 'O', rot: Math.sin(t * 3 + i) * 0.15, aL: 1.6 + Math.sin(t * 6 + i) * 0.3, aR: 1.6, noLegs: true, noShadow: true, dy: -0.4 }); }
  researcher(430, waveY(430, t, lv - 30) + 30, 20, { scared: true, mouth: 'scream', aL: 1.9, aR: 1.5, rot: Math.sin(t * 4) * 0.15, noLegs: true, noShadow: true, sweat: 1 });
  // Clawd surfs on a crest
  const sxp = 1250 + Math.sin(t * 1.5) * 260, sy2 = waveY(sxp, t, lv - 70 + 40), slope = Math.atan2(waveY(sxp + 20, t, lv - 70 + 40) - sy2, 20);
  push(); translate(sxp, sy2 + 6); rotate(slope); paint(rrPts(-170, -10, 340, 24, 12), { wash: PAL.ochre, ink: PAL.ink, sw: 1.8 }); clawd(0, -8, 30, { eyes: 'shades', mouth: 'grin', aL: 1.1, aR: 1.1, rot: -0.1, noShadow: true, noLegs: true, dy: -Math.abs(Math.sin(bpOf(t) * Math.PI)) * 0.3 }); pop();
  for (let i = 0; i < 20; i++) { const q = frac(t * 0.8 + hash(i)), x = hash(i + 4) * W; paperclip(x, waveY(x, t, lv) - q * 220, 20, q * 9 + i, '#E2B64A'); }
  pts.length = 0;
  camEnd();
}
// 99.0: the killswitch and an empty chair, then a beach
function killswitchShot(t: number, lt: number, dur: number) {
  const cut = 0.8;
  if (lt < cut) {
    camBegin(lerp(900, 1000, lt / cut), 540, lerp(1.0, 1.1, lt / cut), 0);
    bg('#9AA0AA', '#6F7683');
    paint([[0, 800], [W, 800], [W, H], [0, H]], { wash: '#555C6A', ink: PAL.ink, sw: 1.6 });
    for (let i = 0; i < 4; i++) paint(rectPts(100 + i * 460, 120, 300, 340, 2), { wash: '#B9D1DE', fill: PAL.sky, fillOp: 60, ink: PAL.ink, sw: 1.6 });
    // killswitch
    paint(rrPts(1090, 600, 320, 200, 16), { wash: '#C9CED6', ink: PAL.ink, sw: 2 }); paint(ellPts(1250, 600, 120, 36, 16), { wash: '#4A5058', ink: PAL.ink, sw: 2 });
    paint([[1160, 600], [1340, 600], [1320, 500], [1180, 500]], { wash: PAL.red, fill: PAL.crimson, fillOp: 80, ink: PAL.ink, sw: 2.4, curv: 0.2 });
    paint(ellPts(1250, 500, 70, 22, 14), { wash: '#E5454F', ink: PAL.ink, sw: 2 });
    letter('KILLSWITCH', 1250, 710, 44, PAL.red, { rot: -0.02 });
    // empty chair spinning slowly
    push(); translate(640, 800); paint(rectPts(-5, -160, 10, 150, 0), { wash: '#444', ink: PAL.ink, sw: 1 }); const sx = Math.cos(t * 1.4); paint(rrPts(-90 * sx, -230, 180 * sx, 70, 20), { wash: '#4B5E8A', ink: PAL.ink, sw: 1.6 }); paint(rrPts(-70 * sx, -420, 140 * sx, 200, 30), { wash: '#4B5E8A', ink: PAL.ink, sw: 1.6 }); for (let i = -2; i <= 2; i++) inkLine([[0, -20], [i * 60, 14]], 3, PAL.ink, 'ink', 0); pop();
    // out-of-office note
    push(); translate(900, 330); rotate(-0.06 + Math.sin(t * 2) * 0.01); paint(rectPts(-110, -80, 220, 160, 2), { wash: '#FFF3A8', ink: PAL.ink, sw: 1.4 }); inkLine([[-70, -40], [70, -40]], 3, PAL.ink, 'ink', 0); inkLine([[-70, -10], [50, -10]], 3, PAL.ink, 'ink', 0); inkLine([[-70, 20], [30, 20]], 3, PAL.ink, 'ink', 0); paint(ellPts(0, -92, 12, 12, 8), { wash: PAL.red, ink: PAL.ink, sw: 1 }); pop();
    camEnd();
    flash(easeIn(seg(lt, cut - 0.1, cut)), '#FFF8E0');
  } else {
    const q = lt - cut;
    camBegin(W / 2, H / 2, lerp(1.15, 1.0, easeOut(q / 0.5)), 0);
    bg('#7EC8F0', '#FFF0C8');
    blob(1600, 180, 360, '#FFE070', 200); paint(ellPts(1600, 180, 70, 70, 20), { wash: '#FFD84A', ink: PAL.ink, sw: 1.4 });
    paint([[0, 520], [W, 520], [W, 700], [0, 700]], { wash: '#3AA6C9', ink: PAL.ink, sw: 1.4 });
    for (let i = 0; i < 10; i++) inkLine([[i * 220 + Math.sin(t * 2 + i) * 30, 560 + (i % 3) * 40], [i * 220 + 120 + Math.sin(t * 2 + i) * 30, 560 + (i % 3) * 40]], 2, PAL.cream, 'ink', 0.4);
    paint([[0, 690], [W, 690], [W, H], [0, H]], { wash: '#F2D9A0', fill: '#D2B070', fillOp: 70, ink: PAL.ink, sw: 1.4 });
    // palm tree
    tube([[200, 960], [230, 760], [280, 600], [360, 480]], 40, '#9A6A3A'); for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.5; tube([[360, 480], [360 + Math.cos(a) * 130, 480 + Math.sin(a) * 60 - 20], [360 + Math.cos(a) * 250, 480 + Math.sin(a) * 140 + 30 + Math.sin(t * 2 + i) * 6]], 22, PAL.sap); }
    // towel & buzzing phone
    paint([[640, 930], [1340, 930], [1400, 1000], [580, 1000]], { wash: PAL.rose, ink: PAL.ink, sw: 1.6 }); for (let i = 0; i < 6; i++) inkLine([[700 + i * 110, 935], [680 + i * 120, 998]], 5, PAL.cream, 'ink', 0, 0.7);
    const buz = Math.sin(t * 60) * 5 * (frac(bpOf(t)) < 0.6 ? 1 : 0);
    push(); translate(1500 + buz, 960); rotate(0.1); paint(rrPts(-34, -66, 68, 130, 10), { wash: PAL.ink, ink: PAL.ink, sw: 1.4 }); paint(rrPts(-28, -56, 56, 100, 6), { wash: PAL.red, ink: null }); letter('!', 0, -6, 60, PAL.cream, { ink: false }); pop();
    for (let i = 0; i < 3; i++) inkLine([[1570 + i * 18, 900 - i * 6], [1600 + i * 22, 880 - i * 14]], 3, PAL.red, 'ink', 0, frac(bpOf(t)) < 0.6 ? 1 : 0);
    // two Clawds in sunglasses sip coconuts
    for (const [x, fl] of [[860, false], [1150, true]]) clawd(x, 930, 22, { eyes: 'shades', mouth: 'smile', flip: fl, rot: Math.sin(t * 1.5 + x) * 0.04, aL: 0.4, aR: 1.0, armR: (u: number) => { paint(ellPts(u * 0.6, -u * 0.6, u * 1.3, u * 1.3, 12), { wash: '#7A5A3A', ink: PAL.ink, sw: 1.2 }); paint(ellPts(u * 0.6, -u * 1.6, u * 0.5, u * 0.3, 8), { wash: PAL.cream, ink: null }); inkLine([[u * 0.8, -u * 1.9], [u * 1.2, -u * 3]], 2, PAL.rose, 'ink', 0); } });
    letter('z', 1000, 780 - (t * 40) % 60, 40, PAL.cream, { alpha: 0.6 });
    camEnd();
  }
  void dur;
}
function paperPlanet(cx: number, cy: number, R: number, t: number, n = 220) {
  paint(ellPts(cx, cy, R, R, 40), { wash: '#8E9AA8', ink: PAL.ink, sw: 3 });
  const c = S.ctx; c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
  for (let i = 0; i < n; i++) { const a = hash(i) * TAU, r = Math.sqrt(hash(i + 7)) * R, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; paperclip(x, y, R * 0.07 * (0.8 + hash(i + 2) * 0.5), hash(i + 4) * TAU, i % 4 ? '#C8D2DE' : '#E2B64A'); }
  paint(ellPts(cx - R * 0.35, cy - R * 0.4, R * 0.5, R * 0.3, 14), { wash: '#FFFFFF', washOp: 50, ink: null });
  paint(ellPts(cx + R * 0.4, cy + R * 0.4, R, R, 30), { fill: PAL.ink, fillOp: 90, ink: null });
  c.restore();
  paint(ellPts(cx, cy, R, R, 40), { ink: PAL.ink, sw: 3 });
}
function spaceBG(t: number) {
  bg('#0B0A2A', '#1B1650');
  for (let i = 0; i < 80; i++) paint(starPts(hash(i) * W, hash(i + 9) * H, 3 + hash(i + 3) * 7, 0.3, 4), { wash: PAL.cream, ink: null, a: 0.5 + 0.5 * Math.sin(t * 3 + i) });
}
// 100.5: zoom out from the room to the whole Earth, now a ball of paperclips
function earthShot(t: number, lt: number, dur: number) {
  const q = ease(seg(lt, 0, dur * 0.95)), R = 400;
  camBegin(lerp(960 + 20, 960, q), lerp(180 - 8, 540, q), Math.exp(lerp(Math.log(10), Math.log(1.0), q)), 0);
  spaceBG(t);
  paperPlanet(960, 540, R, t);
  // tiny room at the top of the world
  paint(rectPts(930, 130, 60, 40, 0.3), { wash: PAL.cream, ink: PAL.ink, sw: 0.4 }); paint([[925, 130], [960, 112], [995, 130]], { wash: PAL.rose, ink: PAL.ink, sw: 0.4 });
  // last tiny island with the researcher
  const ix = 960 + Math.cos(0.9) * R * 0.68, iy = 540 + Math.sin(0.9) * R * 0.68;
  paint(ellPts(ix, iy, 24, 9, 12), { wash: '#6FA55E', ink: PAL.ink, sw: 0.6 });
  researcher(ix, iy, 1.6, { scared: true, mouth: 'o', aL: 1.9, aR: 1.9, noShadow: true });
  const ring = 1 + Math.sin(t * 5) * 0.25; paint(ellPts(ix, iy - 10, 34 * ring, 34 * ring, 16), { ink: PAL.red, sw: 0.9 });
  camEnd();
}
// 102.5: a match, a fuse across the paperclip planet to a cartoon bomb. WHITE FLASH BOOM.
function fuseShot(t: number, lt: number, dur: number) {
  const prog = seg(lt, 0.7, 2.35), bombX = 1500, bombY = 600;
  camBegin(lerp(760, 1180, ease(prog)), 540, 1.0 + 0.06 * Math.sin(t), 0);
  spaceBG(t);
  paperPlanet(640, 640, 340, t, 180);
  const pts = [[560, 306], [720, 250], [900, 330], [1040, 520], [1180, 700], [1320, 640], [1440, 650]];
  const n = pts.length - 1, f = prog * n, i0 = Math.min(n - 1, Math.floor(f)), k = f - i0, head = [lerp(pts[i0][0], pts[i0 + 1][0], k), lerp(pts[i0][1], pts[i0 + 1][1], k)];
  inkLine(pts, 4, '#C9B48A', 'ink', 0.5); inkLine(pts.slice(0, i0 + 1).concat([head]), 5, '#3A2A22', 'ink', 0.5);
  // bomb
  const flare = lt > 2.35 ? Math.sin((lt - 2.35) * 30) * 6 : 0;
  push(); translate(bombX + flare, bombY); paint(ellPts(0, 0, 130, 130, 28), { wash: '#1E1E26', fill: PAL.violet, fillOp: 70, ink: PAL.ink, sw: 2.4 }); paint(ellPts(-44, -44, 36, 24, 12, 0, -0.6), { wash: PAL.cream, washOp: 130, ink: null }); paint(rectPts(-24, -148, 48, 26, 1), { wash: '#3A3A44', ink: PAL.ink, sw: 1.6 }); for (const e of [-1, 1]) paint(ellPts(e * 40, 6, 16, lt > 2.35 ? 26 : 16, 10), { wash: PAL.cream, ink: PAL.ink, sw: 1 }); inkLine([[-40, 60], [0, 44], [40, 60]], 4, PAL.cream, 'ink', 0.5); pop();
  inkLine([[bombX, bombY - 148], [bombX - 20, bombY - 190], [bombX - 60, bombY - 200]], 4, '#C9B48A', 'ink', 0.5);
  if (prog < 1) { paint(starPts(head[0], head[1], 20 + Math.sin(t * 40) * 6, 0.4, 6, t * 8), { wash: PAL.ochre, ink: PAL.ink, sw: 0.8 }); paint(starPts(head[0], head[1], 9, 0.5, 5, -t * 6), { wash: PAL.cream, ink: null }); for (let i = 0; i < 5; i++) paint(ellPts(head[0] + Math.sin(t * 30 + i * 2) * 24, head[1] - 14 - ((t * 120 + i * 30) % 60), 4, 4, 6), { wash: PAL.orange, ink: null }); }
  // Clawd strikes a match
  const strike = Math.sin(clamp(lt / 0.7) * Math.PI * 2);
  clawd(560, 330, 12, { rot: -0.3, eyes: 'narrow', mouth: 'grin', aR: 1.2 + strike * 0.3, noShadow: true, noLegs: true, armR: lt < 1.0 ? (u: number) => { inkLine([[0, 0], [u * 1.6, -u * 0.6]], 1.6, '#C9B48A', 'ink', 0); paint(ellPts(u * 1.7, -u * 0.65, u * 0.3, u * 0.3, 8), { wash: PAL.red, ink: null }); if (lt > 0.4) paint(starPts(u * 1.7, -u * 1.1, u * 0.7, 0.4, 5, t * 6), { wash: PAL.orange, ink: PAL.ink, sw: 0.6 }); } : null });
  camEnd();
  sfx('FSSS', 900, 210, 80, PAL.ochre, lt - 1.0, { life: 1.0 });
  if (lt > 2.4) { flash(easeIn(seg(lt, 2.4, 2.75)), '#FFFFFF'); sfx('BOOM', W / 2, 440, 320, PAL.red, lt - 2.55, { life: 0.4 }); }
  void dur;
}
// 105.4: smoky blue jazz club, two crossing spotlights
function jazzShot(t: number, lt: number, dur: number) {
  const bp = bpOf(t), bob = Math.sin(bp * Math.PI * 2);
  camBegin(W / 2, H / 2, lerp(1.0, 1.08, lt / dur), 0);
  bg('#0F1B33', '#2C4A7C', '#1B2A4A');
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) paint(rectPts(c * 250 - (r % 2) * 120, 60 + r * 120, 240, 110, 1), { wash: '#25395E', ink: '#0F1B33', sw: 1.2 });
  paint([[0, 790], [W, 790], [W, H], [0, H]], { wash: '#2A2236', fill: '#14101C', fillOp: 100, ink: PAL.ink, sw: 1.6 });
  paint(rectPts(480, 740, 960, 60, 2), { wash: '#4A3A56', ink: PAL.ink, sw: 1.6 });
  // two spotlights crossing at 90 degrees like axes
  for (const [sx, ang] of [[300, -0.78], [1620, 0.78]]) { push(); translate(sx, 0); rotate(ang); paint([[0, 0], [-170, 1450], [170, 1450]], { wash: '#CFE4FF', washOp: 65, ink: null }); pop(); }
  blob(960, 900, 380, '#CFE4FF', 90);
  inkLine([[480, 900], [1440, 900]], 2, PAL.cream, 'ink', 0, 0.6); inkLine([[960, 800], [960, 150]], 2, PAL.cream, 'ink', 0, 0.6);
  paint([[1440, 900], [1420, 890], [1420, 910]], { wash: PAL.cream, ink: null }); paint([[960, 150], [950, 170], [970, 170]], { wash: PAL.cream, ink: null });
  // saxophone Clawd in a fedora
  const cx = 640, cy = 965;
  clawd(cx, cy, 30, { hat: 'fedora', eyes: 'closed', mouth: 'o', rot: bob * 0.04, dy: -Math.abs(bob) * 0.15, aL: 0.8, aR: 0.8, noLegs: false });
  tube([[cx + 40, cy - 190], [cx + 40, cy - 90], [cx + 100, cy - 20], [cx + 190, cy - 40], [cx + 210, cy - 130]], 30, PAL.ochre, PAL.ink);
  paint(ellPts(cx + 210, cy - 140, 42, 22, 14), { wash: '#F2C45E', ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 4; i++) paint(ellPts(cx + 70 + i * 24, cy - 70 + (i % 2) * 8, 6, 6, 8), { wash: PAL.cream, ink: PAL.ink, sw: 0.7 });
  // researcher at an old mic
  const rx = 1340;
  inkLine([[rx - 150, 1000], [rx - 150, 740]], 6, '#555', 'ink', 0); paint(ellPts(rx - 150, 725, 22, 28, 10), { wash: '#444', ink: PAL.ink, sw: 1.6 }); for (let i = -2; i <= 2; i++) inkLine([[rx - 165, 725 + i * 7], [rx - 135, 725 + i * 7]], 1, '#999', 'ink', 0);
  researcher(rx, 995, 26, { mouth: 'sing', glasses: 'normal', aL: 1.4, aR: 0.4 + bob * 0.2, rot: -0.03 + bob * 0.03, dy: -Math.abs(bob) * 0.1, cheeks: true });
  // notes drift up, smoke drifts through
  for (let i = 0; i < 9; i++) { const q = frac(t * 0.35 + hash(i)), x = 800 + hash(i + 3) * 700 + Math.sin(q * 8 + i) * 40; letter(i % 2 ? '♪' : '♫', x, 780 - q * 700, 56, [PAL.ochre, PAL.sky, PAL.rose][i % 3], { alpha: 1 - q, rot: Math.sin(q * 6 + i) * 0.3 }); }
  for (let i = 0; i < 8; i++) cloud(((hash(i) * W + t * 20 * (i % 3 + 1)) % (W + 600)) - 300, 560 + hash(i + 3) * 400, 80, '#9FB8E0', 0.18);
  camEnd();
}

chapter('chorus3', 95.4, 109.4, [[95.4, landShot], [97.5, floodShot], [99.0, killswitchShot], [100.5, earthShot], [102.5, fuseShot], [105.4, jazzShot]]);
void mixCol; void kf; void dancer; void mood; void move; void rays; void backOut; void clamp; void heartPts; void starPts; void beatN; void easeOut;
