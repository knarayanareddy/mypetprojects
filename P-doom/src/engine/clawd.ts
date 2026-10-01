// @ts-nocheck
import { tube, PAL, S, clamp, lerp, ease, easeOut, backOut, hash, bpOf, frac, TAU, paint, inkLine, rectPts, ellPts, rrPts, starPts, heartPts, push, pop, translate, rotate, scale, letter, jit, pulse, mixCol } from './core';

// Clawd: blocky 10x6 body, four stubby legs, two slit eyes. u = body unit; (x, y) = ground point between feet.
export function clawd(x: number, y: number, u: number, o: any = {}) {
  const dy = (o.dy || 0) * u, sq = (o.sq || 0) + (o.take || 0);
  const sw = clamp(u / 15, 0.45, 2.4) * (o.swMul || 1), J = u * 0.07;
  const col = o.col || PAL.clay, dk = o.dk || PAL.clayDk, lt = o.lt || '#F5B394';
  if (!o.noShadow) {
    const f = 1 - Math.min(0.5, Math.abs(o.dy || 0) * 0.06);
    paint(ellPts(x, y + u * 0.15, u * 5.6 * f, u * 1 * f, 22), { fill: PAL.ink, fillOp: 90, ink: null });
  }
  push(); translate(x, y + dy); if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * 0.6), (o.sy ?? 1) * (1 - sq));
  if (!o.noLegs) [-4, -2, 1, 3].forEach((lx, i) => {
    let h = 2.2;
    if (o.walk != null) { const ph = Math.sin((o.walk + (i % 2 ? 0.5 : 0)) * TAU); if (ph > 0) h = 2.2 - ph * 0.9; }
    paint(rectPts(lx * u, -2.4 * u, u, h * u, J * 0.6), { wash: dk, ink: PAL.ink, sw: sw * 0.8 });
  });
  const arm = (side: number, a: number, hook: any) => {
    push(); translate(side * 4.9 * u, -4.5 * u); rotate(side < 0 ? a : -a);
    paint(rectPts(side < 0 ? -2.2 * u : 0, -0.5 * u, 2.2 * u, u, J * 0.6), { wash: col, fill: dk, fillOp: 60, ink: PAL.ink, sw: sw * 0.8 });
    if (hook) { translate(side * 2.2 * u, 0); if (side < 0) scale(-1, 1); hook(u, sw); }
    pop();
  };
  arm(-1, o.aL ?? 0.2, o.armL); arm(1, o.aR ?? 0.2, o.armR);
  const lid = o.lid || 0;
  if (lid > 0.01) {
    const hy = -5.1 * u;
    paint(rectPts(-5 * u, hy, 10 * u, 3.1 * u, J), { wash: col, ink: null });
    paint(rectPts(-4.8 * u, -3.8 * u, 9.6 * u, 1.6 * u, J), { fill: dk, fillOp: 120, ink: null });
    paint(rectPts(-4.4 * u, hy - 0.2 * u, 8.8 * u, 1.3 * u, J * 0.5), { wash: '#4A1F2A', ink: null });
    paint(ellPts(0, hy + 0.6 * u, 2.4 * u, 0.45 * u, 14), { wash: PAL.rose, ink: null });
    for (let i = 0; i < 6; i++) { const tx = -4.2 * u + i * 1.6 * u; paint([[tx, hy - 0.1 * u], [tx + 1.3 * u, hy - 0.1 * u], [tx + 0.65 * u, hy + 0.8 * u]], { wash: PAL.cream, ink: PAL.ink, sw: sw * 0.45 }); }
    paint(rectPts(-5 * u, hy, 10 * u, 3.1 * u, J), { ink: PAL.ink, sw });
    push(); translate(-5 * u, hy); rotate(-lid * 1.25); translate(5 * u, -hy);
    paint(rectPts(-5 * u, -8 * u, 10 * u, 2.9 * u, J), { wash: col, ink: null });
    paint(ellPts(-1.6 * u, -6.9 * u, 3.2 * u, u, 16, J), { fill: lt, fillOp: 110, ink: null });
    for (let i = 0; i < 6; i++) { const tx = -4.2 * u + i * 1.6 * u; paint([[tx, hy + 0.1 * u], [tx + 1.3 * u, hy + 0.1 * u], [tx + 0.65 * u, hy - 0.8 * u]], { wash: PAL.cream, ink: PAL.ink, sw: sw * 0.45 }); }
    paint(rectPts(-5 * u, -8 * u, 10 * u, 2.9 * u, J), { ink: PAL.ink, sw });
    eyes(u, o, sw); hat(u, o.hat, sw);
    pop();
  } else {
    const body = rectPts(-5 * u, -8 * u, 10 * u, 6 * u, J);
    paint(body, { wash: col, ink: null });
    paint(ellPts(-1.6 * u, -6.4 * u, 3.4 * u, 1.5 * u, 18, J * 2, -0.08), { fill: lt, fillOp: 120, border: 0.8, ink: null });
    paint(rectPts(-4.8 * u, -3.8 * u, 9.6 * u, 1.6 * u, J), { fill: dk, fillOp: 120, border: 0.5, ink: null });
    paint(body, { ink: PAL.ink, sw });
    if (o.blush) for (const bx of [-3.6, 3.6]) paint(ellPts(bx * u, -4.6 * u, u * 0.8, u * 0.4, 14), { fill: PAL.rose, fillOp: 150, ink: null });
    if (o.hat === 'mask') paint([[-5.5 * u, -7.7 * u], [5.5 * u, -7.7 * u], [4.4 * u, -4.7 * u], [0.6 * u, -5.4 * u], [-0.6 * u, -5.4 * u], [-4.4 * u, -4.7 * u]], { wash: PAL.violet, ink: PAL.ink, sw: sw * 0.7 });
    eyes(u, o, sw); mouth(u, o.mouth, sw); hat(u, o.hat, sw);
  }
  if (o.draw) o.draw(u, sw);
  pop();
  if (o.emote) emote(o.emote, x + (o.flip ? -1 : 1) * 5.4 * u, y + dy - 8.6 * u, u * 0.9, o.emoteK ?? 1);
}

function mouth(u: number, m: string, sw: number) {
  if (!m) return;
  if (m === 'o') paint(ellPts(0, -4.3 * u, u * 0.45, u * 0.5, 12), { wash: PAL.ink, ink: null });
  else if (m === 'O') paint(ellPts(0, -4.1 * u, u * 0.8, u * 0.95, 14), { wash: '#4A1F2A', ink: PAL.ink, sw: sw * 0.6 });
  else if (m === 'smile') inkLine([[-0.8 * u, -4.6 * u], [0, -4.1 * u], [0.8 * u, -4.6 * u]], sw * 0.8, PAL.ink, 'ink', 0.6);
  else if (m === 'grin') paint([[-1.3 * u, -4.8 * u], [1.3 * u, -4.8 * u], [0.9 * u, -3.9 * u], [-0.9 * u, -3.9 * u]], { wash: '#4A1F2A', ink: PAL.ink, sw: sw * 0.6, curv: 0.3 });
  else if (m === 'flat') inkLine([[-0.7 * u, -4.4 * u], [0.7 * u, -4.4 * u]], sw * 0.8, PAL.ink, 'ink', 0);
  else if (m === 'wobble') inkLine([[-u, -4.4 * u], [-0.5 * u, -4.7 * u], [0, -4.4 * u], [0.5 * u, -4.7 * u], [u, -4.4 * u]], sw * 0.7, PAL.ink, 'ink', 0.3);
  else if (m === 'cat') inkLine([[-0.9 * u, -4.5 * u], [-0.45 * u, -4.1 * u], [0, -4.5 * u], [0.45 * u, -4.1 * u], [0.9 * u, -4.5 * u]], sw * 0.7, PAL.ink, 'ink', 0.5);
}

function eyes(u: number, o: any, sw: number) {
  const e = o.eyes || 'normal', sqz = clamp(o.squint || 0), T = S.t;
  const blink = e === 'normal' && ((T * 0.9 + (o.seed || 0) * 1.7) % 3.3) < 0.12;
  if (sqz > 0.8) { for (const ex of [-3, 2]) inkLine([[ex * u - 0.3 * u, -5.9 * u], [ex * u + 1.3 * u, -5.9 * u]], sw, PAL.ink, 'ink', 0); return; }
  if (sqz > 0) { push(); translate(0, -6 * u); scale(1 + sqz * 0.15, 1 - sqz); translate(0, 6 * u); }
  if (e === 'shades') {
    paint(rrPts(-4.6 * u, -7.5 * u, 9.2 * u, 2.2 * u, 0.6 * u), { wash: PAL.ink, ink: null });
    inkLine([[-3.9 * u, -7 * u], [-2.4 * u, -7.1 * u]], sw * 0.5, PAL.cream, 'inkfine', 0);
  } else for (const ex of [-3, 2]) {
    const X = ex * u, Y = -7 * u, cx = X + 0.5 * u;
    if (e === 'normal' || e === 'look') {
      const lx = e === 'look' ? (o.lookX || 0) * u * 0.5 : 0, ly = e === 'look' ? (o.lookY || 0) * u * 0.4 : 0;
      if (blink) inkLine([[X - 0.2 * u, Y + 1.5 * u], [X + 1.2 * u, Y + 1.5 * u]], sw, PAL.ink, 'ink', 0);
      else {
        paint(rectPts(X + lx, Y + ly, u, 2 * u, u * 0.04), { wash: PAL.ink, ink: null });
        if (u > 9) paint(ellPts(X + lx + 0.32 * u, Y + ly + 0.42 * u, u * 0.17, u * 0.24, 10), { wash: PAL.cream, washOp: 230, ink: null });
      }
    } else if (e === 'happy') inkLine([[X - 0.4 * u, Y + 1.7 * u], [cx, Y + 0.5 * u], [X + 1.4 * u, Y + 1.7 * u]], sw * 1.3, PAL.ink, 'ink', 0.2);
    else if (e === 'closed') inkLine([[X - 0.4 * u, Y + 1.2 * u], [cx, Y + 1.6 * u], [X + 1.4 * u, Y + 1.2 * u]], sw * 1.2, PAL.ink, 'ink', 0.4);
    else if (e === 'wink') { if (ex < 0) inkLine([[X - 0.4 * u, Y + 1.7 * u], [cx, Y + 0.5 * u], [X + 1.4 * u, Y + 1.7 * u]], sw * 1.3, PAL.ink, 'ink', 0.2); else paint(rectPts(X, Y, u, 2 * u, u * 0.04), { wash: PAL.ink, ink: null }); }
    else if (e === 'narrow') paint(rectPts(X - 0.1 * u, Y + 0.9 * u, 1.2 * u, 0.7 * u, u * 0.03), { wash: PAL.ink, ink: null });
    else if (e === 'angry') paint([[X - 0.2 * u, Y + (ex < 0 ? 0.3 : 1) * u], [X + 1.2 * u, Y + (ex < 0 ? 1 : 0.3) * u], [X + 1.2 * u, Y + 2 * u], [X - 0.2 * u, Y + 2 * u]], { wash: PAL.ink, ink: null });
    else if (e === 'scared') {
      paint(ellPts(cx, Y + u, u * 0.95, u * 1.15, 16), { wash: PAL.cream, ink: PAL.ink, sw: sw * 0.6 });
      paint(ellPts(cx + (o.lookX || 0) * u * 0.3, Y + 1.1 * u, u * 0.32, u * 0.42, 10), { wash: PAL.ink, ink: null });
    } else if (e === 'spark') {
      const k = 1 + Math.sin(T * 12 + ex) * 0.15;
      paint(starPts(cx, Y + u, u * 1.5 * k, 0.32, 4), { wash: PAL.ochre, ink: PAL.ink, sw: sw * 0.6 });
    } else if (e === 'red') {
      paint(ellPts(cx, Y + u, u * 1.9, u * 1.9, 16), { fill: '#FF2A3A', fillOp: 90, ink: null });
      paint(rectPts(X - 0.1 * u, Y, 1.2 * u, 2 * u, u * 0.04), { wash: '#FF2A3A', ink: PAL.ink, sw: sw * 0.5 });
    } else if (e === 'heart') {
      const k = 1 + pulse(T, 5) * 0.2;
      paint(heartPts(cx, Y + u * 0.95, u * 1.15 * k), { wash: PAL.rose, ink: PAL.ink, sw: sw * 0.5 });
    } else if (e === 'x') {
      inkLine([[X - 0.1 * u, Y + 0.2 * u], [X + 1.1 * u, Y + 1.8 * u]], sw * 1.1, PAL.ink, 'ink', 0);
      inkLine([[X + 1.1 * u, Y + 0.2 * u], [X - 0.1 * u, Y + 1.8 * u]], sw * 1.1, PAL.ink, 'ink', 0);
    } else if (e === 'swirl') {
      const pts = [], ph = T * 8 * (ex < 0 ? 1 : -1);
      for (let i = 0; i < 26; i++) { const r = (i / 26) * u * 1.1, a = i * 0.55 + ph; pts.push([cx + Math.cos(a) * r, Y + u + Math.sin(a) * r]); }
      paint(ellPts(cx, Y + u, u * 1.15, u * 1.15, 16), { wash: PAL.cream, ink: PAL.ink, sw: sw * 0.5 });
      inkLine(pts, sw * 0.9, PAL.ink, 'ink', 0.5);
    } else if (e === 'dot') paint(rectPts(X + 0.2 * u, Y + 0.7 * u, 0.6 * u, 0.6 * u, 0), { wash: PAL.ink, ink: null });
  }
  if (sqz > 0) pop();
}

function hat(u: number, h: string, sw: number) {
  if (!h) return;
  const ink = { ink: PAL.ink, sw: sw * 0.8 };
  if (h === 'party') {
    paint([[-1.8 * u, -8 * u], [1.8 * u, -8 * u], [0, -12.8 * u]], { wash: PAL.rose, ...ink });
    paint([[-1 * u, -9.8 * u], [1 * u, -9.8 * u], [0.6 * u, -11 * u], [-0.6 * u, -11 * u]], { wash: PAL.ochre, ink: null });
    paint(ellPts(0, -12.9 * u, 0.6 * u, 0.6 * u, 10), { wash: PAL.sky, ...ink });
  } else if (h === 'hard') {
    paint(ellPts(0, -8.3 * u, 3.4 * u, 2.4 * u, 18), { wash: PAL.ochre, ...ink });
    paint(rectPts(-4.2 * u, -8.2 * u, 8.4 * u, 0.7 * u, 0), { wash: '#C98A1E', ...ink });
    paint(rectPts(-0.5 * u, -10.6 * u, u, 2.4 * u, 0), { wash: '#F2C45E', ink: null });
  } else if (h === 'crown') {
    paint([[-2.6 * u, -8 * u], [-2.8 * u, -10.8 * u], [-1.3 * u, -9.4 * u], [0, -11.4 * u], [1.3 * u, -9.4 * u], [2.8 * u, -10.8 * u], [2.6 * u, -8 * u]], { wash: PAL.ochre, ...ink });
    paint(ellPts(0, -8.9 * u, 0.4 * u, 0.4 * u, 8), { wash: PAL.rose, ink: null });
  } else if (h === 'halo') {
    const k = 1 + Math.sin(S.t * 4) * 0.05;
    inkLine([...ellPts(0, -10.3 * u, 3 * u * k, 0.9 * u, 20), [3 * u * k, -10.3 * u]], sw * 3, PAL.ochre, 'ink', 0.6);
    paint(ellPts(0, -10.3 * u, 3 * u * k, 0.9 * u, 20), { fill: '#FFE9A0', fillOp: 60, ink: PAL.ochre, sw: sw * 1.8 });
  } else if (h === 'wizard') {
    paint([[-3 * u, -8 * u], [3 * u, -8 * u], [0.6 * u, -14 * u], [-0.6 * u, -13.6 * u]], { wash: PAL.violet, ...ink });
    paint(rectPts(-3.8 * u, -8.5 * u, 7.6 * u, 0.7 * u, 0), { wash: PAL.violet, ...ink });
    paint(starPts(0.3 * u, -10.8 * u, u * 0.8, 0.4, 5), { wash: PAL.ochre, ink: null });
  } else if (h === 'hood') {
    paint([[-5.6 * u, -3 * u], [-5.4 * u, -9.2 * u], [0, -11 * u], [5.4 * u, -9.2 * u], [5.6 * u, -3 * u], [4.2 * u, -3 * u], [4.2 * u, -8 * u], [-4.2 * u, -8 * u], [-4.2 * u, -3 * u]], { wash: PAL.violet, curv: 0.3, ...ink });
  } else if (h === 'top') {
    paint(rectPts(-2.4 * u, -12 * u, 4.8 * u, 4 * u, 0), { wash: PAL.ink, ink: PAL.ink, sw: sw * 0.6 });
    paint(rectPts(-2.4 * u, -9.2 * u, 4.8 * u, 0.8 * u, 0), { wash: PAL.rose, ink: null });
    paint(ellPts(0, -8 * u, 4 * u, 0.55 * u, 16), { wash: PAL.ink, ink: null });
  } else if (h === 'fedora') {
    paint(ellPts(0, -8 * u, 4.6 * u, 0.9 * u, 18), { wash: '#3C3350', ...ink });
    paint([[-2.6 * u, -8 * u], [-2.2 * u, -10.6 * u], [2.2 * u, -10.6 * u], [2.6 * u, -8 * u]], { wash: '#3C3350', ...ink });
    paint(rectPts(-2.6 * u, -9 * u, 5.2 * u, 0.8 * u, 0), { wash: PAL.rose, ink: null });
  } else if (h === 'band' || h === 'sweatband') {
    paint(rectPts(-5 * u, -7.9 * u, 10 * u, 0.9 * u, 0), { wash: h === 'band' ? PAL.rose : PAL.cream, ...ink });
    if (h === 'sweatband') paint(rectPts(-5 * u, -7.9 * u, 10 * u, 0.9 * u, 0), { fill: PAL.sky, fillOp: 70, ink: null });
  } else if (h === 'cat') {
    paint([[-4.8 * u, -8 * u], [-4.4 * u, -10.6 * u], [-2.2 * u, -8 * u]], { wash: PAL.clay, ...ink });
    paint([[4.8 * u, -8 * u], [4.4 * u, -10.6 * u], [2.2 * u, -8 * u]], { wash: PAL.clay, ...ink });
    paint([[-4.2 * u, -8.2 * u], [-4.1 * u, -9.6 * u], [-3.1 * u, -8.2 * u]], { wash: PAL.rose, ink: null });
    paint([[4.2 * u, -8.2 * u], [4.1 * u, -9.6 * u], [3.1 * u, -8.2 * u]], { wash: PAL.rose, ink: null });
    for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) inkLine([[s * 3.8 * u, -4.4 * u + i * 0.3 * u], [s * 6.2 * u, -4.9 * u + i * 0.9 * u]], sw * 0.4, PAL.ink, 'inkfine', 0);
  } else if (h === 'masq') {
    paint([[-5.4 * u, -7.8 * u], [5.4 * u, -7.8 * u], [4.6 * u, -5 * u], [0.5 * u, -5.8 * u], [-0.5 * u, -5.8 * u], [-4.6 * u, -5 * u]], { wash: PAL.violet, ink: PAL.ink, sw: sw * 0.7 });
    paint([[4.6 * u, -7.4 * u], [7.5 * u, -9.6 * u], [6 * u, -6.6 * u]], { wash: PAL.ochre, ...ink });
    eyes(u, { eyes: 'normal' }, sw);
  } else if (h === 'bowtie') {
    paint([[0, -2.4 * u], [-1.6 * u, -3.2 * u], [-1.6 * u, -1.6 * u]], { wash: PAL.rose, ...ink });
    paint([[0, -2.4 * u], [1.6 * u, -3.2 * u], [1.6 * u, -1.6 * u]], { wash: PAL.rose, ...ink });
    paint(ellPts(0, -2.4 * u, 0.4 * u, 0.4 * u, 8), { wash: PAL.crimson, ink: null });
  }
}

// reaction marks popping beside a head
export function emote(name: string, x: number, y: number, s: number, k: number) {
  if (k <= 0.02) return;
  push(); translate(x, y); scale(k * s / 14);
  const T = S.t;
  if (name === 'sweat') { paint([[0, -14], [9, 4], [0, 10], [-9, 4]], { wash: PAL.sky, curv: 0.5, ink: PAL.ink, sw: 0.8 }); }
  else if (name === 'spark') { paint(starPts(0, 0, 16, 0.3, 4), { wash: PAL.ochre, ink: PAL.ink, sw: 0.8 }); paint(starPts(14, -12, 8, 0.3, 4), { wash: PAL.cream, ink: PAL.ink, sw: 0.6 }); }
  else if (name === 'heart') paint(heartPts(0, 0, 15), { wash: PAL.rose, ink: PAL.ink, sw: 0.8 });
  else if (name === 'anger') { for (const a of [0, Math.PI / 2]) { push(); rotate(a + 0.4); inkLine([[-12, 0], [12, 0]], 3, PAL.red, 'ink', 0); pop(); } }
  else if (name === 'music') { paint(ellPts(0, 8, 7, 5, 10, 0, -0.4), { wash: PAL.ink, ink: null }); inkLine([[6, 6], [6, -16], [14, -10]], 1.6, PAL.ink, 'ink', 0); }
  else if (name === 'swirl') { const p = []; for (let i = 0; i < 22; i++) { const r = i * 0.8, a = i * 0.6 + T * 6; p.push([Math.cos(a) * r, Math.sin(a) * r]); } inkLine(p, 1.4, PAL.violet, 'ink', 0.5); }
  else if (name === 'zzz') { letter('z', 0, 0, 22, PAL.cream); letter('Z', 14, -14, 30, PAL.cream); }
  else letter(name, 0, 0, name.length > 1 ? 30 : 42, PAL.red, { rot: 0.12 });
  pop();
}

// blink-squash-and-pop emotional change: spread the result into clawd()
export function mood(t: number, keys: any[]) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const [t0, eyesN, em] = keys[i], dt = t - t0;
  let eyes = eyesN, squint = 0, take = 0, emote = null, emoteK = 0;
  if (i > 0 && dt < 0.22) squint = 1 - ease(dt / 0.22);
  const nxt = keys[i + 1];
  if (nxt && nxt[0] - t < 0.14 && nxt[0] - t >= 0) squint = ease(1 - (nxt[0] - t) / 0.14);
  if (i > 0) take = 0.22 * Math.sin(clamp((dt + 0.05) / 0.4) * Math.PI);
  if (em && dt < 1.6) { emote = em; emoteK = backOut(dt / 0.3) * (1 - ease((dt - 1.2) / 0.4)); }
  return { eyes, squint, take, emote, emoteK };
}

// beat-synced pose offsets
export function move(style: string, t: number, seed = 0) {
  const bp = bpOf(t) + seed * 0.37, f = frac(bp), s = Math.sin(bp * Math.PI);
  const st = style === 'mix' ? ['bounce', 'roof', 'sway', 'spin', 'hop', 'wave'][Math.floor(bp / 4 + seed) % 6] : style;
  switch (st) {
    case 'bounce': return { dy: -Math.abs(s) * 1.1, sq: Math.abs(Math.cos(bp * Math.PI)) * 0.08 * (1 - Math.abs(s)), aL: 0.4 + s * 0.5, aR: 0.4 - s * 0.5 };
    case 'hop': return { dy: -(1 - Math.pow(f * 2 - 1, 2)) * 2.2, sq: f < 0.12 ? 0.18 : 0, aL: 1 + s * 0.3, aR: 1 - s * 0.3 };
    case 'roof': return { dy: -Math.abs(s) * 0.8, aL: 1.25 + Math.sin(bp * 3) * 0.25, aR: 1.25 - Math.sin(bp * 3) * 0.25 };
    case 'sway': return { rot: Math.sin(bp * Math.PI) * 0.1, dy: -Math.abs(Math.sin(bp * Math.PI * 0.5)) * 0.3, aL: 0.9 + s * 0.4, aR: 0.9 - s * 0.4 };
    case 'spin': return { sx: Math.cos(bp * Math.PI * 0.5), dy: -Math.abs(s) * 0.9, aL: 1.1, aR: 1.1 };
    case 'wave': return { aR: 0.9 + Math.sin(t * 9) * 0.5, aL: 0.1, dy: -Math.abs(s) * 0.3 };
    case 'walk': return { walk: bp * 0.5, dy: -Math.abs(s) * 0.25 };
    case 'run': return { walk: bp, dy: -Math.abs(Math.sin(bp * Math.PI * 2)) * 0.5, aL: -0.5 + s * 0.6, aR: -0.5 - s * 0.6, rot: 0.08 };
    case 'stomp': return { dy: f < 0.2 ? -0.4 : 0, rot: Math.floor(bp) % 2 ? 0.08 : -0.08, sq: f < 0.15 ? 0.15 : 0, aL: 0.8, aR: 0.8 };
    case 'shimmy': return { rot: Math.sin(bp * 8) * 0.07, sx: 1 + Math.sin(bp * 8) * 0.04, dy: -Math.abs(Math.sin(bp * 4)) * 0.3, aL: 0.7, aR: 0.7 };
    default: return { sq: Math.sin(t * 2.5 + seed) * 0.025, aL: 0.15, aR: 0.15 };
  }
}
export function dancer(x: number, y: number, u: number, style: string, t: number, extra: any = {}) {
  const m: any = move(style, t, extra.seed || 0); clawd(x, y, u, { ...m, ...extra, eyes: extra.eyes || (m.dy < -0.5 ? 'happy' : 'normal'), mouth: extra.mouth ?? (m.dy < -0.5 ? 'smile' : undefined) });
}

// The Researcher: small human, cream lab coat, round glasses, scribbly hair. s=1 is ~13s tall (a Clawd is 8u).
export function researcher(x: number, y: number, s: number, o: any = {}) {
  const dy = (o.dy || 0) * s, sw = clamp(s / 7, 0.5, 2), T = S.t;
  push(); translate(x, y + dy); if (o.rot) rotate(o.rot); scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + (o.sq || 0) * 0.5), (o.sy ?? 1) * (1 - (o.sq || 0)));
  if (!o.noShadow) paint(ellPts(0, 0.3 * s - dy, 4.5 * s, 0.9 * s, 16), { fill: PAL.ink, fillOp: 80, ink: null });
  const wk = o.walk != null ? Math.sin(o.walk * TAU) : 0;
  // legs + shoes
  if (!o.noLegs) for (const [lx, sg] of [[-1.6, 1], [1.6, -1]]) {
    const lift = wk * sg * 1.2 * (o.walk != null ? 1 : 0);
    paint(rectPts((lx - 0.55) * s, -3.6 * s, 1.1 * s, 3 * s - Math.max(0, lift) * s * 0.3, 0), { wash: '#4A4458', ink: PAL.ink, sw: sw * 0.7 });
    paint(ellPts(lx * s + 0.3 * s, -0.4 * s - Math.max(0, lift) * s * 0.3, 1.2 * s, 0.6 * s, 10), { wash: PAL.ink, ink: null });
  }
  // arms behind coat
  const arm = (side: number, a: number, hook: any) => {
    // a: arm angle measured from hanging straight down (0) through sideways (~1.25) to overhead (~2.4)
    push(); translate(side * 2.3 * s, -8.4 * s);
    const L = 3.6 * s, th = a * 1.25;
    const ex = side * Math.sin(th) * L, ey = Math.cos(th) * L;
    tube([[0, 0], [ex * 0.5, ey * 0.5], [ex, ey]], 1.3 * s, PAL.cream, PAL.ink);
    paint(ellPts(ex, ey, 0.75 * s, 0.75 * s, 8), { wash: '#F2C9A5', ink: PAL.ink, sw: sw * 0.5 });
    if (hook) { translate(ex, ey); hook(s, sw, side, th); }
    pop();
  };
  // coat
  paint([[-2.5 * s, -9 * s], [2.5 * s, -9 * s], [3.3 * s, -3.4 * s], [-3.3 * s, -3.4 * s]], { wash: PAL.cream, fill: PAL.sky, fillOp: 40, ink: PAL.ink, sw: sw * 0.9 });
  inkLine([[0, -9 * s], [0, -3.6 * s]], sw * 0.5, PAL.ink, 'inkfine', 0);
  paint([[-0.1 * s, -9 * s], [-1 * s, -8 * s], [-0.1 * s, -7 * s]], { wash: '#F2C9A5', ink: PAL.ink, sw: sw * 0.4 });
  paint(rectPts(1.2 * s, -6.8 * s, 1.2 * s, 1 * s, 0), { wash: PAL.cream, ink: PAL.ink, sw: sw * 0.4 });
  inkLine([[1.5 * s, -6.5 * s], [2 * s, -6.5 * s]], sw * 0.4, PAL.rose, 'inkfine', 0);
  if (o.bowtie) { paint([[0, -8.6 * s], [-1.1 * s, -9.2 * s], [-1.1 * s, -8 * s]], { wash: PAL.rose, ink: PAL.ink, sw: sw * 0.5 }); paint([[0, -8.6 * s], [1.1 * s, -9.2 * s], [1.1 * s, -8 * s]], { wash: PAL.rose, ink: PAL.ink, sw: sw * 0.5 }); }
  arm(-1, o.aL ?? 0.25, o.armL); arm(1, o.aR ?? 0.25, o.armR);
  // head
  const hx = 0, hy = -11.4 * s, hr = 2.6 * s;
  paint(ellPts(hx, hy, hr, hr * 1.02, 22), { wash: '#F6D2B0', fill: '#F2A283', fillOp: 40, ink: PAL.ink, sw: sw });
  // scribbly hair
  for (let i = 0; i < 9; i++) { const a = -Math.PI + (i / 8) * Math.PI, r0 = hr * 0.85, r1 = hr * (1.25 + hash(i * 3.3) * 0.5); inkLine([[hx + Math.cos(a) * r0, hy + Math.sin(a) * r0], [hx + Math.cos(a + 0.2) * (r0 + r1) / 2, hy + Math.sin(a + 0.2) * (r0 + r1) / 2], [hx + Math.cos(a - 0.1) * r1, hy + Math.sin(a - 0.1) * r1]], sw * 0.9, '#4A3A44', 'ink', 0.6); }
  // glasses
  const gm = o.glasses || 'normal';
  for (const gx of [-1, 1]) {
    const cx = hx + gx * 1.05 * s, cy = hy + 0.15 * s;
    paint(ellPts(cx, cy, 0.95 * s, 0.95 * s, 14), { wash: PAL.cream, washOp: 230, fill: PAL.sky, fillOp: 60, ink: PAL.ink, sw: sw * 0.8 });
    if (gm === 'stars') { const k = 1 + Math.sin(T * 14 + gx) * 0.15; paint(starPts(cx, cy, 0.8 * s * k, 0.32, 4), { wash: PAL.ochre, ink: null }); }
    else if (gm === 'swirl') { const p = []; for (let i = 0; i < 22; i++) { const r = (i / 22) * 0.85 * s, a = i * 0.6 + T * 8; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } inkLine(p, sw * 0.7, PAL.ink, 'ink', 0.5); }
    else if (gm === 'x') { inkLine([[cx - 0.4 * s, cy - 0.4 * s], [cx + 0.4 * s, cy + 0.4 * s]], sw * 0.8, PAL.ink, 'ink', 0); inkLine([[cx + 0.4 * s, cy - 0.4 * s], [cx - 0.4 * s, cy + 0.4 * s]], sw * 0.8, PAL.ink, 'ink', 0); }
    else if (gm === 'heart') paint(heartPts(cx, cy, 0.7 * s), { wash: PAL.rose, ink: null });
    else {
      const lx = (o.lookX || 0) * 0.25 * s, ly = (o.lookY || 0) * 0.2 * s, sc = o.scared ? 1.3 : 1;
      if (o.blinkClosed) inkLine([[cx - 0.4 * s, cy], [cx + 0.4 * s, cy]], sw * 0.8, PAL.ink, 'ink', 0);
      else paint(ellPts(cx + lx, cy + ly, 0.24 * s * sc, 0.28 * s * sc, 8), { wash: PAL.ink, ink: null });
    }
  }
  inkLine([[hx - 0.2 * s, hy + 0.1 * s], [hx + 0.2 * s, hy + 0.1 * s]], sw * 0.6, PAL.ink, 'ink', 0);
  const mo = o.mouth || 'smile', my = hy + 1.5 * s;
  if (mo === 'smile') inkLine([[hx - 0.7 * s, my - 0.1 * s], [hx, my + 0.35 * s], [hx + 0.7 * s, my - 0.1 * s]], sw * 0.8, PAL.ink, 'ink', 0.6);
  else if (mo === 'flat') inkLine([[hx - 0.6 * s, my], [hx + 0.6 * s, my]], sw * 0.8, PAL.ink, 'ink', 0);
  else if (mo === 'o') paint(ellPts(hx, my, 0.45 * s, 0.5 * s, 10), { wash: '#4A1F2A', ink: PAL.ink, sw: sw * 0.5 });
  else if (mo === 'scream') paint(ellPts(hx, my + 0.1 * s, 0.8 * s, 1.0 * s * (1 + Math.sin(T * 25) * 0.1), 12), { wash: '#4A1F2A', ink: PAL.ink, sw: sw * 0.6 });
  else if (mo === 'sing') paint(ellPts(hx, my, 0.65 * s, 0.35 * s + Math.abs(Math.sin(T * 9)) * 0.5 * s, 12), { wash: '#4A1F2A', ink: PAL.ink, sw: sw * 0.6 });
  else if (mo === 'wobble') inkLine([[hx - s, my], [hx - 0.5 * s, my - 0.3 * s], [hx, my], [hx + 0.5 * s, my - 0.3 * s], [hx + s, my]], sw * 0.7, PAL.ink, 'ink', 0.3);
  else if (mo === 'dizzy') inkLine([[hx - 0.7 * s, my], [hx - 0.3 * s, my + 0.3 * s], [hx + 0.2 * s, my - 0.2 * s], [hx + 0.7 * s, my + 0.1 * s]], sw * 0.7, PAL.ink, 'ink', 0.5);
  if (o.cheeks) for (const c of [-1, 1]) paint(ellPts(hx + c * 1.8 * s, hy + 1 * s, 0.5 * s, 0.3 * s, 10), { fill: PAL.rose, fillOp: 150, ink: null });
  if (o.sweat) { const k = clamp(o.sweat); push(); translate(hx + 2.6 * s, hy - 0.8 * s + (T * 6 % 3) * 0.2 * s); scale(k * s / 7); paint([[0, -9], [6, 2], [0, 7], [-6, 2]], { wash: PAL.sky, curv: 0.5, ink: PAL.ink, sw: 0.7 }); pop(); }
  if (o.hat === 'party') paint([[-1.4 * s, hy - hr * 0.9], [1.4 * s, hy - hr * 0.9], [0, hy - hr * 2.7]], { wash: PAL.rose, ink: PAL.ink, sw: sw * 0.7 });
  if (o.hat === 'hard') paint(ellPts(0, hy - hr * 0.8, 2.7 * s, 1.6 * s, 14), { wash: PAL.ochre, ink: PAL.ink, sw: sw * 0.7 });
  pop();
  if (o.emote) emote(o.emote, x + 3.4 * s * (o.flip ? -1 : 1), y + dy - 13.6 * s, s * 1.4, o.emoteK ?? 1);
}
void lerp; void easeOut; void jit; void mixCol; void pulse;
