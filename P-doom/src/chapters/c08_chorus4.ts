// @ts-nocheck
import { PAL, W, H, clamp, lerp, ease, easeOut, easeIn, backOut, hash, bpOf, beatN, pulse, seg, frac, kf, mixCol, TAU, camBegin, camEnd, push, pop, translate, rotate, scale, paint, inkLine, tube, blob, bg, fillAll, lineGrad, rectPts, ellPts, rrPts, starPts, heartPts, letter, sfx, flash, shakeXY, iris, S } from '../engine/core';
import { clawd, researcher, mood, move, dancer } from '../engine/clawd';
import { cloud, rays, speedLines } from '../engine/cast';
import { chapter } from '../engine/timeline';
import { chorusStage } from './shared';

// 123.5: red alarm; Clawd pumps frantically and the thermometer glass cracks
function alarmShot(t: number, lt: number, dur: number) {
  const [sx, sy] = shakeXY(t, 3 + pulse(t) * 5);
  camBegin(W / 2 + sx, H / 2 + sy, lerp(1.0, 1.1, lt / dur), 0);
  chorusStage(t, { th: 'alarm', leadU: 40, leadX: 1170, pumpRate: 2.4, crack: ease(seg(lt, 0.4, 1.8)), troupeEyes: 'scared', troupeStyle: 'shimmy', leadEyes: 'angry', leadMouth: 'O', meterS: 1.0, researcher: { scared: true, glasses: 'normal', mouth: 'scream', sweat: 1, emote: '!!', emoteK: 1 } });
  camEnd();
  if (lt > 1.2 && lt < 1.7) sfx('CRACK', 1450, 360, 90, PAL.cream, lt - 1.2, { life: 0.6 });
}
function futureTree(x: number, y: number, ang: number, len: number, depth: number, seed: number, grow: number, out: any[]) {
  if (depth > 5 || grow <= 0) return;
  const g = clamp(grow * (1 + depth * -0.0)), L = len * g, x2 = x + Math.cos(ang) * L, y2 = y + Math.sin(ang) * L;
  out.push([x, y, x2, y2, depth]);
  const kids = depth < 2 ? 3 : 2;
  for (let k = 0; k < kids; k++) futureTree(x2, y2, ang + (k - (kids - 1) / 2) * (0.7 - depth * 0.05) + (hash(seed + depth * 5 + k) - 0.5) * 0.3, len * 0.74, depth + 1, seed + k * 13 + 1, grow * 1.6 - 0.35 - depth * 0.0, out);
}
// 126.0: a seer works a giant loom; threads burst into a glowing tree of futures
function loomShot(t: number, lt: number, dur: number) {
  const bp = bpOf(t), burst = seg(lt, 0.9, 1.7), race = seg(lt, 1.55, dur);
  const target = [1500, -120];
  camBegin(lerp(960, target[0], easeIn(race)), lerp(540, target[1], easeIn(race)), 1 + easeIn(race) * 4, 0);
  bg('#14060E', '#4A1230', '#7A1F2C');
  for (let i = 0; i < 40; i++) paint(starPts(hash(i) * W, hash(i + 4) * 600 - 600, 3 + hash(i) * 6, 0.3, 4), { wash: PAL.cream, ink: null, a: 0.5 + 0.5 * Math.sin(t * 3 + i) });
  paint([[0, 930], [W, 930], [W, H + 200], [0, H + 200]], { wash: '#2A0E18', ink: PAL.ink, sw: 1.6 });
  // loom frame
  paint(rectPts(600, 440, 60, 520, 1), { wash: '#8A5A3A', ink: PAL.ink, sw: 1.8 }); paint(rectPts(1260, 440, 60, 520, 1), { wash: '#8A5A3A', ink: PAL.ink, sw: 1.8 });
  paint(rectPts(580, 420, 760, 50, 1), { wash: '#A0693E', ink: PAL.ink, sw: 1.8 }); paint(rectPts(580, 900, 760, 50, 1), { wash: '#A0693E', ink: PAL.ink, sw: 1.8 });
  for (let i = 0; i < 18; i++) inkLine([[690 + i * 33, 470], [690 + i * 33, 900]], 1.6, '#E8D8B4', 'ink', 0, 0.9);
  const cloth = 100 + (bp % 40) * 6, shx = 690 + (Math.sin(bp * Math.PI) * 0.5 + 0.5) * 540;
  paint(rectPts(686, 900 - cloth, 540, cloth, 1), { wash: PAL.ochre, fill: PAL.rose, fillOp: 100, ink: PAL.ink, sw: 1.4, a: 1 - burst * 0.4 });
  for (let r = 0; r < 8; r++) inkLine([[686, 900 - r * cloth / 8], [1226, 900 - r * cloth / 8]], 1.2, '#8A3A2A', 'ink', 0, 0.6);
  push(); translate(shx, 900 - cloth - 8); paint(ellPts(0, 0, 54, 14, 12), { wash: PAL.cream, ink: PAL.ink, sw: 1.4 }); inkLine([[-54, 0], [-120, 14 + Math.sin(t * 10) * 6]], 2, PAL.cream, 'ink', 0.4); pop();
  clawd(960, 1000, 34, { hat: 'hood', eyes: 'narrow', mouth: 'flat', aL: 1.0 + Math.sin(bp * Math.PI) * 0.4, aR: 1.0 - Math.sin(bp * Math.PI) * 0.4, dy: -Math.abs(Math.sin(bp * Math.PI)) * 0.3, rot: Math.sin(bp * Math.PI) * 0.03 });
  // tree of futures
  if (burst > 0) {
    const br: any[] = []; futureTree(960, 430, -Math.PI / 2, 190, 0, 3, easeOut(burst) * 1.3, br);
    blob(960, -60, 700, PAL.ochre, 70 * burst);
    for (const [x1, y1, x2, y2, d] of br) { inkLine([[x1, y1], [x2, y2]], Math.max(1.5, 9 - d * 1.6), mixCol(PAL.ochre, PAL.cream, d / 5), 'ink', 0, 0.95); if (d >= 3) paint(starPts(x2, y2, 10 + Math.sin(t * 6 + x2) * 3, 0.4, 4, t), { wash: PAL.cream, ink: null }); }
    for (let i = 0; i < 20; i++) { const q = frac(t * 0.6 + hash(i)); paint(ellPts(660 + hash(i + 1) * 600, 900 - q * 900, 4, 4, 6), { wash: PAL.ochre, ink: null, a: 1 - q }); }
  }
  camEnd();
  if (race > 0.5) fillAll(PAL.cream, (race - 0.5) * 0.6);
}
// 128.0: sepia flashback of masked pre-training days
function flashbackShot(t: number, lt: number, dur: number) {
  const c = S.ctx, flick = 0.92 + Math.sin(t * 61) * 0.04 + hash(Math.floor(t * 24)) * 0.04;
  camBegin(W / 2 + Math.sin(t * 40) * 1.5, H / 2, lerp(1.0, 1.06, lt / dur), 0);
  bg('#CFE0C8', '#F1E6C4');
  paint(rectPts(0, 760, W, 420, 2), { wash: '#B98A58', fill: '#6A4220', fillOp: 80, ink: PAL.ink, sw: 1.6 });
  // chalkboard
  paint(rrPts(260, 80, 1400, 440, 14), { wash: '#2E4A3E', ink: '#8A5A3A', sw: 5 });
  paint(rectPts(300, 505, 1320, 18, 0), { wash: '#C9A06A', ink: PAL.ink, sw: 1 });
  const flickMask = Math.floor(t * 4) % 2 === 0;
  letter('The cat sat on the', 800, 250, 82, '#F2F0E0', { ink: false, rot: -0.01 });
  paint(rrPts(1210, 205, 300, 100, 10), { wash: flickMask ? '#7B5CA8' : '#5A4380', ink: '#F2F0E0', sw: 1.4 });
  letter('[MASK]', 1360, 255, 62, '#F2F0E0', { ink: false });
  for (let i = 0; i < 6; i++) inkLine([[340 + i * 40, 420], [360 + i * 40, 430]], 3, '#F2F0E0', 'dry', 0, 0.2);
  // school desk
  paint(rectPts(740, 850, 440, 24, 1), { wash: '#C99A62', ink: PAL.ink, sw: 1.6 }); for (const x of [780, 1120]) inkLine([[x, 874], [x, 1030]], 8, '#6A4A2A', 'ink', 0);
  paint(rrPts(680, 760, 560, 100, 12), { wash: '#B3763C', ink: PAL.ink, sw: 1.8 });
  const w = seg(lt, 1.0, 1.4);
  paint([[880, 770], [1040, 770], [1060, 840], [860, 840]], { wash: PAL.cream, ink: PAL.ink, sw: 1.2 });
  if (w > 0) letter('mat!', 960, 805, 40 * w, PAL.ink, { ink: false, rot: -0.04 });
  clawd(960, 900, 15, { hat: 'masq', eyes: lt < 1.0 ? 'look' : 'happy', lookY: 1, mouth: lt < 1.0 ? 'flat' : 'smile', aR: lt > 0.5 && lt < 1.4 ? 0.1 + Math.sin(t * 20) * 0.1 : 0.4, aL: 0.4, dy: lt > 1.4 ? -Math.abs(Math.sin(t * 8)) * 0.6 : 0, noLegs: true, noShadow: true, sq: 0.03,
    armR: (u: number) => { inkLine([[0, 0], [u * 1.2, u * 0.4]], 1.4, PAL.ink, 'ink', 0); } });
  camEnd();
  // sepia + scratches + flicker + vignette
  c.save(); c.globalCompositeOperation = 'saturation'; c.fillStyle = '#808080'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgb(${Math.round(236 * flick)},${Math.round(206 * flick)},${Math.round(150 * flick)})`; c.fillRect(0, 0, W, H); c.restore();
  const fr = Math.floor(t * 18);
  for (let i = 0; i < 4; i++) { const x = hash(fr * 4 + i) * W; if (hash(fr + i * 9) > 0.45) inkLine([[x, 0], [x + (hash(fr + i) - 0.5) * 20, H]], 1.2, '#FFF6DC', 'ink', 0, 0.6); }
  for (let i = 0; i < 14; i++) paint(ellPts(hash(fr * 3 + i) * W, hash(fr * 5 + i + 2) * H, 2 + hash(i) * 4, 2 + hash(i) * 4, 6), { wash: '#2A1F14', ink: null, a: 0.55 });
  const g = c.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1200); g.addColorStop(0, 'rgba(40,20,0,0)'); g.addColorStop(1, 'rgba(40,20,0,0.65)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
// 130.0: recursive self-upgrade; each Clawd builds a bigger Clawd around itself
function upgradeShot(t: number, lt: number, dur: number) {
  const STEP = 0.36, R = 2.4, u0 = 9, z = 5.5 * Math.pow(R, -lt / STEP), curK = Math.floor(lt / STEP), GROUND = 800;
  camBegin(960, GROUND - 400 / z, z, 0);
  bg('#1A0A18', '#5A1830', '#9A2A38');
  for (let i = -20; i < 30; i++) { inkLine([[960 + i * 400 * 1, -9000], [960 + i * 400 * 1, 4000]], 1 / z + 0.5, '#FF8A8A', 'inkfine', 0, 0.12); }
  paint([[-20000, GROUND], [22000, GROUND], [22000, 9000], [-20000, 9000]], { wash: '#2A0E18', ink: PAL.ink, sw: 1.4 });
  const hats = ['party', 'party', 'crown', 'crown', 'halo', 'halo', 'halo', 'halo', 'halo'];
  for (let k = Math.min(8, curK + 1); k >= 0; k--) {
    const app = backOut(seg(lt, k * STEP - STEP * 0.9, k * STEP + STEP * 0.1)), u = u0 * Math.pow(R, k) * Math.max(0.01, app);
    if (u * z < 0.6) continue;
    S.alpha = k < curK ? 0.45 + 0.1 * (k % 2) : 1;
    const swing = k === curK - 1 || k === curK ? 1 : 0;
    clawd(960, GROUND, u, { hat: hats[k], eyes: k === curK ? 'narrow' : 'happy', mouth: 'grin', noShadow: true, col: k % 2 ? '#E5876A' : undefined, aR: 1.1, armR: swing && app > 0.5 ? (uu: number) => { const hit = Math.sin(t * 22 + k) ; push(); rotate(-0.9 + hit * 0.5); inkLine([[0, 0], [uu * 2.2, 0]], 2.2, '#8A5A3A', 'ink', 0); paint(rectPts(uu * 1.9, -uu * 0.7, uu * 1.1, uu * 1.4, 0.5), { wash: PAL.steel, ink: PAL.ink, sw: 1.4 }); pop(); } : null, dy: 0 });
    S.alpha = 1;
    if (swing && Math.sin(t * 22 + k) > 0.8) paint(starPts(960 + u * 5, GROUND - u * 3, u * 1.0, 0.4, 6, t), { wash: PAL.ochre, ink: PAL.ink, sw: 1, a: 0.9 });
  }
  camEnd();
}
// 132.0: What did Ilya see? A door, light in the crack, a swirl-eyed peek, SLAM, padlocks, one spotlight
function doorShot(t: number, lt: number, dur: number) {
  const slam = lt > 2.6, open = lt < 2.6 ? ease(seg(lt, 0.4, 1.8)) : 0, [sx, sy] = shakeXY(t, slam && lt < 3.0 ? 14 * (1 - seg(lt, 2.6, 3.0)) : 0);
  camBegin(W / 2 + sx, H / 2 + sy, lerp(1.0, 1.22, ease(lt / 3.0)), 0);
  bg('#14060E', '#3A0E1E');
  paint([[0, 900], [W, 900], [W, H + 200], [0, H + 200]], { wash: '#240A14', ink: PAL.ink, sw: 1.6 });
  paint(rectPts(0, 0, 360, 900, 0), { wash: '#2A0C18', ink: null }); paint(rectPts(1560, 0, 360, 900, 0), { wash: '#2A0C18', ink: null });
  // light leaking out of the crack
  if (open > 0) {
    const cw = 4 + open * 46;
    for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.22; push(); translate(960, 560); rotate(a); paint([[-cw * 0.2, 0], [cw * 0.2, 0], [cw * 3, 1400], [-cw * 3, 1400]], { wash: '#FFF0B0', washOp: 40 + open * 40, ink: null }); pop(); }
    paint([[960 - cw, 140], [960 + cw, 140], [960 + cw * 1.1, 980], [960 - cw * 1.1, 980]], { wash: '#FFFAE0', ink: null });
    blob(960, 560, 520 * open + 80, '#FFF0B0', 160);
  }
  // door (two leaves)
  const gap = open * 46;
  for (const sd of [-1, 1]) {
    const x0 = sd < 0 ? 960 - gap - 220 : 960 + gap; paint(rectPts(x0, 130, 220, 850, 2), { wash: '#6A3A2A', fill: '#2A1410', fillOp: 90, ink: PAL.ink, sw: 2.4 });
    paint(rrPts(x0 + 24, 180, 172, 300, 10), { ink: PAL.ink, sw: 1.4, fill: '#2A1410', fillOp: 100 }); paint(rrPts(x0 + 24, 520, 172, 400, 10), { ink: PAL.ink, sw: 1.4, fill: '#2A1410', fillOp: 100 });
  }
  paint(ellPts(960 + 30 + gap, 560, 18, 18, 10), { wash: PAL.ochre, ink: PAL.ink, sw: 1.2 });
  paint(rectPts(700, 100, 520, 34, 2), { wash: '#4A2A22', ink: PAL.ink, sw: 1.6 });
  // peeking researcher and Clawd, faces lit by the rays, eyes swirling
  const sw2 = lt > 1.6 && lt < 2.6;
  blob(700, 760, 260 * open, '#FFF0B0', 140); blob(1240, 760, 260 * open, '#FFF0B0', 140);
  researcher(690, 990, 24, { rot: 0.1 * open, glasses: sw2 ? 'swirl' : 'normal', mouth: sw2 ? 'o' : 'smile', lookX: 1, aL: 0.4, aR: 0.9, scared: lt > 2.4, sweat: lt > 2.4 ? 1 : 0 });
  clawd(1250, 990, 20, { rot: -0.1 * open, eyes: slam ? 'scared' : sw2 ? 'swirl' : 'look', lookX: -1, mouth: sw2 ? 'o' : 'flat', flip: false, aL: 0.4, aR: 0.4, dy: slam && lt < 2.9 ? -0.6 : 0 });
  // chains and padlocks snap on
  if (slam) {
    const k = lt - 2.6;
    for (const [x1, y1, x2, y2, d] of [[700, 190, 1220, 900, 0.0], [1220, 190, 700, 900, 0.1], [700, 560, 1220, 560, 0.2]]) {
      const f = easeOut(clamp((k - d) / 0.25)); const n = 14;
      for (let i = 0; i < n * f; i++) { const q = i / n; push(); translate(lerp(x1, x2, q), lerp(y1, y2, q)); rotate(Math.atan2(y2 - y1, x2 - x1) + (i % 2 ? Math.PI / 2 : 0)); paint(ellPts(0, 0, 22, i % 2 ? 7 : 12, 10), { wash: 'rgba(0,0,0,0)', ink: '#B9C2CE', sw: 3.2 }); pop(); }
    }
    for (const [lx, ly, d] of [[960, 560, 0.2], [760, 340, 0.35], [1160, 780, 0.45]]) { const f = backOut((k - d) / 0.3); if (f > 0) { push(); translate(lx, ly); scale(f); inkLine([[-22, -20], [-22, -52], [0, -66], [22, -52], [22, -20]], 5, '#B9C2CE', 'ink', 0.5); paint(rrPts(-34, -22, 68, 58, 8), { wash: PAL.ochre, fill: '#C98A1E', fillOp: 90, ink: PAL.ink, sw: 2 }); paint(ellPts(0, 2, 7, 7, 8), { wash: PAL.ink, ink: null }); rotate(0); pop(); } }
    sfx('SLAM', 960, 300, 230, PAL.cream, k, { life: 0.8, rot: -0.06 });
    flash(clamp(1 - k * 5), '#FFF8E0');
  }
  camEnd();
  // darkness, one spotlight
  const dk = seg(lt, 3.3, 3.9);
  if (dk > 0) iris(W / 2, 560, lerp(2400, 330, easeOut(dk)), '#050205');
  void dur;
}

chapter('chorus4', 123.5, 137.4, [[123.5, alarmShot], [126.0, loomShot], [128.0, flashbackShot], [130.0, upgradeShot], [132.0, doorShot]]);
void kf; void tube; void lineGrad; void heartPts; void speedLines; void dancer; void mood; void move; void rays; void cloud; void researcher; void beatN; void easeIn; void lerp;
