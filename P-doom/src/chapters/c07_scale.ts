// @ts-nocheck
import { PAL, W, H, clamp, lerp, ease, easeOut, easeIn, backOut, hash, bpOf, beatN, pulse, seg, frac, kf, mixCol, TAU, camBegin, camEnd, push, pop, translate, rotate, scale, paint, inkLine, tube, blob, bg, fillAll, lineGrad, rectPts, ellPts, rrPts, starPts, heartPts, letter, sfx, flash, shakeXY, iris, S } from '../engine/core';
import { clawd, researcher, mood, move, dancer } from '../engine/clawd';
import { chinchilla, cloud, speedLines, rays } from '../engine/cast';
import { chapter } from '../engine/timeline';

const HATS = ['party', 'crown', 'hard', 'wizard', 'top', 'band', 'halo', 'fedora', 'sweatband', 'cat'];
// 109.4: turtles all the way down, but Clawds, with attention arcs looping between them
function towerShot(t: number, lt: number, dur: number) {
  const U = 26, SP = 7 * U, cy = lerp(300, 300 + SP * 17, ease(lt / dur));
  camBegin(W / 2, cy + 240, 1.0, 0);
  const depth = clamp((cy - 300) / (SP * 17));
  bg(mixCol('#8EC3E6', '#DCE9F2', depth), mixCol('#FBEFD0', '#F5F7FA', depth));
  for (let i = 0; i < 40; i++) cloud(hash(i) * W, 200 + i * 260 + hash(i + 3) * 80, 60 + hash(i) * 40, PAL.cream, 0.5 + depth * 0.4);
  // attention arcs between nearby Clawds
  const first = Math.max(0, Math.floor((cy - 700) / SP)), last = Math.min(24, Math.floor((cy + 1000) / SP));
  for (let i = first; i <= last; i++) {
    const y = 560 + i * SP;
    for (let j = 1; j <= 3; j++) {
      const k = (Math.sin(t * 3 + i * 1.7 + j * 2.1) + 1) / 2, y2 = y + j * SP;
      const pts: any[] = []; for (let s = 0; s <= 12; s++) { const f = s / 12; pts.push([W / 2 + 260 + Math.sin(f * Math.PI) * (110 + j * 70), lerp(y - 100, y2 - 100, f)]); }
      inkLine(pts, 1.8 + k * 2, [PAL.teal, PAL.rose, PAL.ochre][j - 1], 'ink', 0.5, 0.35 + k * 0.5);
      const f = frac(t * 0.9 + i * 0.3 + j * 0.2); paint(ellPts(...pts[Math.floor(f * 12)], 8, 8, 8), { wash: PAL.cream, ink: PAL.ink, sw: 0.7 });
    }
  }
  for (let i = first; i <= last; i++) {
    const y = 560 + i * SP + 8;
    clawd(W / 2, y, U, { ...move('sway', t, i * 0.5), hat: HATS[i % HATS.length], eyes: 'happy', mouth: 'smile', noShadow: true, col: i % 3 === 1 ? '#E5876A' : undefined });
  }
  camEnd();
}
// 113.5: clicker training, then Clawd turns around and puts on shades
function puppyShot(t: number, lt: number, dur: number) {
  camBegin(W / 2, H / 2, lerp(1.0, 1.08, lt / dur), 0);
  bg('#BFE0D6', '#F6EBC8');
  paint([[0, 800], [W, 800], [W, H], [0, H]], { wash: '#8CC27A', fill: PAL.sap, fillOp: 80, ink: PAL.ink, sw: 1.5 });
  for (let i = 0; i < 12; i++) inkLine([[i * 170, 810], [i * 170 + 20, 790]], 2, PAL.sap, 'ink', 0);
  cloud(300, 180, 50); cloud(1500, 250, 60);
  // the trick sequence
  const sit = Math.sin(clamp(seg(lt, 0.1, 0.5)) * Math.PI), spin = seg(lt, 0.55, 1.0), paw = seg(lt, 1.0, 1.35), turn = seg(lt, 1.35, 1.65), pop2 = seg(lt, 1.7, 1.9);
  const cl = (lt > 0.1 && lt < 0.18) || (lt > 0.55 && lt < 0.62) || (lt > 1.0 && lt < 1.07);
  let o: any = { sq: sit * 0.28, eyes: 'happy', mouth: 'smile', aL: 0.4, aR: 0.4 };
  if (spin > 0 && spin < 1) o = { sx: Math.cos(spin * TAU * 2), dy: -Math.sin(spin * Math.PI) * 1.4, eyes: 'happy', mouth: 'grin', aL: 1, aR: 1 };
  if (paw > 0 && lt < 1.35) o = { aR: 1.1 + Math.sin(paw * 18) * 0.35, eyes: 'happy', mouth: 'grin', aL: 0.3 };
  if (lt >= 1.35) o = { sx: turn < 1 ? Math.cos(turn * Math.PI) : -1, eyes: turn < 0.5 ? 'happy' : 'narrow', aL: -0.7, aR: -0.7, mouth: 'flat', dy: 0 };
  const shades = lt > 1.7;
  clawd(1160, 960, 26, { ...o, eyes: shades ? 'shades' : o.eyes, mouth: shades ? 'smile' : o.mouth, emote: lt >= 1.7 && lt < 2.0 ? '!' : null, emoteK: backOut(pop2), sx: turn >= 1 ? 1 : o.sx });
  if (shades && pop2 > 0) sfx('SWAG', 1500, 400, 80, PAL.ochre, lt - 1.7, { life: 0.5, rot: 0.1 });
  // trainer
  researcher(560, 975, 27, { mouth: lt < 1.7 ? 'smile' : 'wobble', glasses: 'normal', sweat: lt > 1.7 ? backOut(pop2) : 0, aL: 0.3, aR: cl ? 1.4 : 1.0, scared: lt > 1.7,
    armR: (s: number) => { paint(rrPts(-s * 0.7, -s * 0.5, s * 1.5, s * 1.1, s * 0.3), { wash: PAL.red, ink: PAL.ink, sw: 1 }); if (cl) for (let i = 0; i < 3; i++) inkLine([[s * 0.9 + i * 8, -s * 0.9 - i * 6], [s * 1.5 + i * 14, -s * 1.5 - i * 10]], 2, PAL.ochre, 'ink', 0); } });
  if (cl) sfx('CLICK', 760, 560, 54, PAL.ochre, frac(lt * 0), { life: 0.5 });
  // treats
  if (lt > 0.1) for (const [a, b] of [[0.18, 0.5], [0.62, 0.95], [1.07, 1.4]]) if (lt > a && lt < b) { const q = (lt - a) / (b - a), x = lerp(640, 1060, q), y = 800 - Math.sin(q * Math.PI) * 120; paint(ellPts(x, y, 14, 10, 8), { wash: '#B3763C', ink: PAL.ink, sw: 1 }); }
  camEnd();
}
// 115.5: the chinchilla stuffs its cheeks with tokens; Clawd squashes into a dense glowing cube that drops through the floor
function chinchillaShot(t: number, lt: number, dur: number) {
  const sq = ease(seg(lt, 0.15, 0.95)), drop = easeIn(seg(lt, 1.15, dur));
  const [sx, sy] = shakeXY(t, lt > 1.1 ? 8 : 0);
  camBegin(W / 2 + sx, H / 2 + sy + drop * 300, 1.0, 0);
  bg('#2C7C80', '#0F3A44');
  for (let i = 0; i < 6; i++) paint(rrPts(60 + i * 330, 120, 260, 360, 14), { wash: '#1A5058', fill: PAL.teal, fillOp: 50, ink: PAL.ink, sw: 1.4 });
  // floor with a hole it falls through
  const hole = seg(lt, 1.15, 1.45) * 150;
  paint([[0, 860], [W, 860], [W, H + 600], [0, H + 600]], { wash: '#6A5A44', fill: '#2A2218', fillOp: 90, ink: PAL.ink, sw: 1.6 });
  if (hole > 2) { paint(ellPts(1180, 880, hole * 1.2, hole * 0.3, 16), { wash: '#06110F', ink: PAL.ink, sw: 1.6 }); for (let i = 0; i < 5; i++) inkLine([[1180, 880], [1180 + Math.cos(i * 1.3) * hole * 1.8, 880 + Math.sin(i * 1.3) * hole * 0.5]], 2, PAL.ink, 'ink', 0); }
  // chinchilla munching
  const mun = Math.floor(lt * 7);
  chinchilla(520, 930, 36, t, { cheek: ease(seg(lt, 0, 1.2)), munch: true });
  for (let i = 0; i < 5; i++) { const q = frac(lt * 2.4 + i * 0.2), x = lerp(220 + hash(i) * 120, 480, easeIn(q)), y = lerp(260, 800, q * q) - Math.sin(q * Math.PI) * 40; paint(ellPts(x, y, 22, 22, 10), { wash: PAL.ochre, ink: PAL.ink, sw: 1.2 }); letter('T', x, y, 24, PAL.ink, { ink: false }); }
  void mun;
  // Clawd compresses into a tiny, glowing, ultra-heavy cube
  const cu = 22, cx = 1180;
  if (sq < 0.9) clawd(cx, 960, cu, { sx: 1 + sq * 0.2, sq: sq * 0.9, eyes: 'scared', mouth: 'wobble', emote: 'sweat', emoteK: 1 - sq });
  else {
    const f = 0.9, S2 = 96, gy = 960 - S2 / 2 + (lt > 1.15 ? easeIn(seg(lt, 1.15, 1.9)) * 900 : 0);
    blob(cx, gy, 180, '#FFD84A', 160 + Math.sin(t * 20) * 30);
    paint(rrPts(cx - S2 / 2, gy - S2 / 2, S2, S2, 12), { wash: PAL.clay, fill: PAL.clayDk, fillOp: 140, ink: PAL.ink, sw: 2.4 });
    paint(rectPts(cx - 28, gy - 18, 12, 30, 0), { wash: PAL.ink, ink: null }); paint(rectPts(cx + 14, gy - 18, 12, 30, 0), { wash: PAL.ink, ink: null });
    for (let i = 0; i < 6; i++) paint(starPts(cx + Math.cos(t * 3 + i) * 90, gy + Math.sin(t * 3 + i) * 90, 8, 0.4, 4, t * 4), { wash: PAL.cream, ink: null });
    void f;
  }
  camEnd();
  if (lt > 0.95 && lt < 1.6) sfx('DENSE', 1180, 560, 90, PAL.ochre, lt - 0.95, { life: 0.7 });
}
// 117.0: the dense cube rolls through fence after fence
function fenceShot(t: number, lt: number, dur: number) {
  const vx = 1000, cubeX = 500 + lt * vx, rot = lt * 7;
  camBegin(cubeX + 380, 560, 1.0, 0);
  bg('#1E6A70', '#0E3038');
  for (let i = 0; i < 14; i++) paint(rrPts(cubeX - 1200 + i * 320 - ((cubeX * 0.4) % 320), 160, 220, 420, 12), { wash: '#16535A', fill: PAL.teal, fillOp: 40, ink: PAL.ink, sw: 1.2, a: 0.8 });
  paint([[cubeX - 1400, 860], [cubeX + 1600, 860], [cubeX + 1600, 1200], [cubeX - 1400, 1200]], { wash: '#4A4038', ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 20; i++) inkLine([[cubeX - 1400 + i * 170, 905], [cubeX - 1330 + i * 170, 905]], 3, PAL.cream, 'ink', 0, 0.6);
  const fences = [1000, 1480, 1960, 2400, 2780];
  fences.forEach((fx, k) => {
    const broke = cubeX > fx, q = broke ? clamp((cubeX - fx) / 600) : 0, kind = k % 3;
    if (!broke) {
      if (kind === 0) for (let i = 0; i < 6; i++) { paint([[fx - 70 + i * 28, 860], [fx - 70 + i * 28, 700], [fx - 56 + i * 28, 680], [fx - 42 + i * 28, 700], [fx - 42 + i * 28, 860]], { wash: PAL.cream, ink: PAL.ink, sw: 1.4 }); } 
      else if (kind === 1) { paint(rrPts(fx - 120, 720, 240, 70, 8), { wash: PAL.cream, ink: PAL.ink, sw: 1.6 }); for (let i = 0; i < 5; i++) paint([[fx - 120 + i * 50, 720], [fx - 90 + i * 50, 720], [fx - 70 + i * 50, 790], [fx - 100 + i * 50, 790]], { wash: PAL.orange, ink: null }); paint(rectPts(fx - 90, 790, 12, 70, 0), { wash: '#555', ink: PAL.ink, sw: 1 }); paint(rectPts(fx + 80, 790, 12, 70, 0), { wash: '#555', ink: PAL.ink, sw: 1 }); }
      else { paint(rectPts(fx - 100, 600, 16, 260, 1), { wash: '#555', ink: PAL.ink, sw: 1.2 }); paint(rectPts(fx + 100, 600, 16, 260, 1), { wash: '#555', ink: PAL.ink, sw: 1.2 }); paint([[fx - 90, 690], [fx + 110, 700], [fx + 110, 760], [fx - 90, 750]], { wash: PAL.ochre, ink: PAL.ink, sw: 1.4 }); for (let i = 0; i < 4; i++) paint([[fx - 70 + i * 52, 700], [fx - 40 + i * 52, 700], [fx - 62 + i * 52, 758], [fx - 92 + i * 52, 752]], { wash: PAL.ink, washOp: 200, ink: null }); letter('SAFETY', fx, 725, 36, PAL.ink, { ink: false, rot: 0.02 }); }
    } else {
      for (let i = 0; i < 9; i++) { const a = -0.6 - hash(i + k * 9) * 2.2, v = 500 + hash(i + k) * 700, x = fx + Math.cos(a) * v * q * 0.6 + q * 300, y = 800 + Math.sin(a) * v * q + 2200 * q * q * 0.5, ro = q * (4 + hash(i) * 9); push(); translate(x, y); rotate(ro); if (kind === 2 && i > 4) paint(rectPts(-60, -10, 120, 20, 1), { wash: PAL.ochre, ink: PAL.ink, sw: 1 }); else paint(rectPts(-10, -50, 20, 100, 1), { wash: kind === 1 && i % 2 ? PAL.orange : PAL.cream, ink: PAL.ink, sw: 1.2 }); pop(); }
    }
  });
  // cube
  push(); translate(cubeX, 812); blob(0, 0, 200, '#FFD84A', 150); rotate(rot); paint(rrPts(-48, -48, 96, 96, 12), { wash: PAL.clay, fill: PAL.clayDk, fillOp: 140, ink: PAL.ink, sw: 2.4 }); paint(rectPts(-28, -18, 12, 30, 0), { wash: PAL.ink, ink: null }); paint(rectPts(14, -18, 12, 30, 0), { wash: PAL.ink, ink: null }); pop();
  const bt = frac(bpOf(t));
  if (bt < 0.25) for (let i = 0; i < 7; i++) paint(starPts(cubeX + 70 + hash(i + beatN(t)) * 140, 760 + hash(i + 4) * 80, 10, 0.4, 4, i), { wash: PAL.cream, ink: PAL.ink, sw: 0.6 });
  camEnd();
  const close = seg(lt, dur - 0.6, dur); if (close > 0) iris(W / 2 - 240, 760, lerp(1500, 0, easeIn(close)), '#04100F');
}
// 119.0: down an endless data-center aisle
function aisleShot(t: number, lt: number, dur: number) {
  const VX = 960 + Math.sin(t * 0.8) * 24, VY = 480, K = 760, zOff = lt * 7;
  const P = (x: number, y: number, z: number) => [VX + (x / z) * K, VY + (y / z) * K];
  bg('#06201F', '#0B3A3A');
  paint([[0, VY], [W, VY], [W, H], [0, H]], { wash: '#0E2C2E', ink: null });
  const fadeCol = (z: number, c: string) => mixCol(c, '#06201F', clamp((z - 2) / 16));
  for (let zi = 26; zi >= 0; zi--) {
    const z0 = zi + 0.4 - frac(zOff) + 0.0, z1 = z0 + 0.92; if (z0 < 0.35) continue;
    // ceiling light strip & floor tiles
    const c1 = P(-0.5, -1.7, z0), c2 = P(0.5, -1.7, z0), c3 = P(0.5, -1.7, z1), c4 = P(-0.5, -1.7, z1);
    paint([c1, c2, c3, c4], { wash: mixCol('#FFB060', '#06201F', clamp((z0 - 2) / 12)), ink: null });
    const fz = [P(-1, 0.9, z0), P(1, 0.9, z0), P(1, 0.9, z1), P(-1, 0.9, z1)];
    paint(fz, { wash: zi % 2 ? fadeCol(z0, '#134A4A') : fadeCol(z0, '#0F3C3E'), ink: null });
    for (const sd of [-1, 1]) {
      const face = [P(sd, -1.6, z0), P(sd, 0.9, z0), P(sd, 0.9, z1), P(sd, -1.6, z1)];
      paint(face, { wash: fadeCol(z0, '#1F5A5E'), ink: PAL.ink, sw: clamp(1.8 / z0, 0.2, 2) });
      const front = [P(sd, -1.6, z0), P(sd * 1.5, -1.6, z0), P(sd * 1.5, 0.9, z0), P(sd, 0.9, z0)];
      paint(front, { wash: fadeCol(z0, '#0E3436'), ink: PAL.ink, sw: clamp(1.4 / z0, 0.2, 2) });
      for (let j = 0; j < 8; j++) for (let l = 0; l < 3; l++) {
        const on = hash(zi * 31 + j * 7 + l + sd * 3 + Math.floor(bpOf(t) * (l + 1) * 0.5) * 5) > 0.45, p = P(sd * 0.98, -1.4 + j * 0.3, z0 + 0.2 + l * 0.3), r = clamp(9 / z0, 0.6, 14);
        if (r < 1) continue;
        paint(ellPts(p[0], p[1], r, r, 6), { wash: on ? [PAL.orange, '#7DFFB0', '#5FE0D6'][(j + l) % 3] : '#0A2020', ink: null });
        if (on && z0 < 8) blob(p[0], p[1], r * 3, [PAL.orange, '#7DFFB0', '#5FE0D6'][(j + l) % 3], 60);
      }
    }
  }
  blob(VX, VY, 220, '#FFB060', 120);
  for (let i = 0; i < 10; i++) inkLine([[VX + (hash(i) - 0.5) * 80, VY], [VX + (hash(i) - 0.5) * 2400, VY + (hash(i + 4) - 0.5) * 1800]], 1.2, PAL.cream, 'dry', 0, 0.12);
  void dur;
}
function thumb(x: number, y: number, s: number, up: boolean, rot = 0) {
  push(); translate(x, y); rotate(rot); scale(s, up ? s : -s);
  paint(rrPts(-22, -4, 44, 40, 10), { wash: up ? '#7DFFB0' : '#FF8A8A', ink: PAL.ink, sw: 1.4 });
  paint(rrPts(-10, -40, 20, 40, 9), { wash: up ? '#7DFFB0' : '#FF8A8A', ink: PAL.ink, sw: 1.4 });
  pop();
}
// 120.9: a panel of researcher clones with thumbs up/down paddles; the reward goes haywire
function rlhfShot(t: number, lt: number, dur: number) {
  const chaos = ease(seg(lt, 0.9, dur - 0.2)), slide = easeIn(seg(lt, 1.3, dur)), bp = bpOf(t);
  camBegin(W / 2, H / 2, 1.0 + chaos * 0.1, chaos * 0.9 * (hash(3) > 0 ? 1 : -1) * 0.6);
  bg('#2C7C80', '#0F3A44');
  rays(W / 2, 500, 18, 2400, '#2F8A8A', '#2C7C80', t * 0.3 * (1 + chaos * 6), 70);
  paint([[0, 800], [W, 800], [W, H + 400], [0, H + 400]], { wash: '#5A4A38', ink: PAL.ink, sw: 1.6 });
  push(); translate(-slide * 1500, slide * 900); 
  paint(rectPts(260, 560, 1400, 90, 2), { wash: '#B3763C', fill: '#6A4220', fillOp: 90, ink: PAL.ink, sw: 2 });
  for (let i = 0; i < 6; i++) {
    const x = 380 + i * 230, up = Math.floor(bp / 2 + i * 0.7) % 2 === 0, spin = chaos * t * (14 + i * 3) * (i % 2 ? 1 : -1);
    researcher(x, 650, 13, { glasses: chaos > 0.4 ? 'swirl' : 'normal', mouth: chaos > 0.4 ? 'scream' : 'smile', scared: chaos > 0.4, noLegs: true, noShadow: true, aR: 2.0, aL: 0.5, dy: -pulse(t) * 0.1, armR: (s: number) => { inkLine([[0, 0], [0, -s * 3]], 1.6, '#C9A06A', 'ink', 0); thumb(0, -s * 3.4, s * 0.06 * 8, chaos > 0.4 ? (Math.floor(t * 9 + i) % 2 === 0) : up, spin); } });
  }
  pop();
  // the dancing AI in the middle
  push(); translate(slide * 600, slide * 1200); rotate(chaos * 0.8);
  clawd(W / 2, 960, 26, { ...move('mix', t, 0), eyes: chaos > 0.4 ? 'swirl' : 'happy', mouth: chaos > 0.4 ? 'wobble' : 'grin', hat: 'party' });
  pop();
  camEnd();
  fillAll('#B01C2A', easeIn(seg(lt, dur - 0.6, dur)));
}

chapter('scale', 109.4, 123.5, [[109.4, towerShot], [113.5, puppyShot], [115.5, chinchillaShot], [117.0, fenceShot], [119.0, aisleShot], [120.9, rlhfShot]]);
void kf; void flash; void tube; void lineGrad; void heartPts; void speedLines; void dancer; void mood; void easeOut; void lerp; void backOut; void researcher; void scale; void rotate; void lineGrad;
