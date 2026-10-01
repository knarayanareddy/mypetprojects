import {
  g, T, PAL, TAU, ell, rr, poly, rect, inkLine, line, letter, heartPts, starPts, ellPts, wob, pulse, clamp, mixCol, shade, hash, backOut, seg, lerp,
} from './core';
import type { Pt } from './core';

// =====================================================================
// BIT — the little AI. Teal body, cream face plate, glowing antenna bulb.
// (x, y) is the ground point between its feet; u is the unit (body is 9u wide).
// =====================================================================
export interface BitO {
  dy?: number;
  sq?: number;
  rot?: number;
  flip?: boolean;
  sx?: number;
  aL?: number;
  aR?: number;
  walk?: number;
  noLegs?: boolean;
  noShadow?: boolean;
  eyes?: string;
  mouth?: string;
  mouthK?: number;
  lookX?: number;
  lookY?: number;
  blush?: boolean;
  col?: string;
  ink?: string;
  hat?: string | string[];
  emote?: string;
  emoteK?: number;
  bulb?: string;
  draw?: (u: number) => void;
  armL?: (u: number) => void;
  armR?: (u: number) => void;
  seed?: number;
}

function eyeShape(kind: string, x: number, y: number, r: number, s: number, o: BitO, u: number) {
  const sw = Math.max(2, u * 0.34);
  const lx = (o.lookX ?? 0) * r * 0.5;
  const ly = (o.lookY ?? 0) * r * 0.5;
  switch (kind) {
    case 'happy':
      inkLine([[x - r, y + r * 0.5], [x, y - r * 0.7], [x + r, y + r * 0.5]], sw);
      break;
    case 'closed':
      inkLine([[x - r, y - r * 0.1], [x, y + r * 0.5], [x + r, y - r * 0.1]], sw);
      break;
    case 'narrow':
      inkLine([[x - r, y], [x + r, y]], sw);
      inkLine([[x - r, y - r * 0.9 * s], [x + r, y - r * 0.5 * s]], sw * 0.8);
      break;
    case 'angry':
      ell(x + lx, y + ly, r * 0.75, r * 0.9, PAL.ink, { ink: null, lit: false });
      inkLine([[x - r * 1.1, y - r * 1.3 - s * r * 0.3], [x + r * 1.1, y - r * 0.5 + s * r * 0.6]].map(([a, b]) => [a, b]) as Pt[], sw);
      break;
    case 'scared':
      ell(x, y, r * 1.25, r * 1.4, '#fffaf0', { sw: 1.8, lit: false });
      ell(x + lx * 0.6, y + ly * 0.6, r * 0.32, r * 0.4, PAL.ink, { ink: null, lit: false });
      break;
    case 'spark':
      poly(starPts(x, y, r * 1.5, 0.45, 4), PAL.ochre, { sw: 1.6, lit: false });
      break;
    case 'red':
      ell(x + lx, y + ly, r * 0.95, r * 1.05, PAL.red, { sw: 1.6, lit: false });
      ell(x + lx - r * 0.25, y + ly - r * 0.3, r * 0.22, r * 0.22, '#fff', { ink: null, lit: false });
      break;
    case 'heart':
      poly(heartPts(x, y, r * 1.35), PAL.rose, { sw: 1.6, lit: false, curv: true });
      break;
    case 'x':
      line(x - r, y - r, x + r, y + r, sw);
      line(x + r, y - r, x - r, y + r, sw);
      break;
    case 'swirl': {
      const p: Pt[] = [];
      for (let i = 0; i < 26; i++) {
        const a = i * 0.5 + T * 8 * s;
        const rad = (i / 26) * r * 1.2;
        p.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]);
      }
      inkLine(p, sw * 0.7);
      break;
    }
    case 'dot':
      ell(x, y, r * 0.35, r * 0.35, PAL.ink, { ink: null, lit: false });
      break;
    case 'blank':
      ell(x, y, r * 1.1, r * 1.2, '#fff', { sw: 1.6, lit: false });
      break;
    default: {
      ell(x + lx, y + ly, r * 0.72, r * 0.95, PAL.ink, { ink: null, lit: false });
      ell(x + lx - r * 0.2, y + ly - r * 0.3, r * 0.22, r * 0.22, '#fff', { ink: null, lit: false });
    }
  }
}

function mouthShape(kind: string, x: number, y: number, u: number, k: number) {
  const sw = Math.max(2, u * 0.3);
  const a = u * k;
  switch (kind) {
    case 'grin':
      poly([[x - 1.3 * a, y - 0.1 * a], [x + 1.3 * a, y - 0.1 * a], [x + 1 * a, y + 0.9 * a], [x, y + 1.3 * a], [x - 1 * a, y + 0.9 * a]], '#7a2f3d', { curv: true, sw: 1.8, lit: false });
      rect(x - 1.1 * a, y - 0.05 * a, 2.2 * a, 0.45 * a, '#fffaf0', { ink: null, lit: false });
      break;
    case 'o':
      ell(x, y + 0.2 * a, 0.5 * a, 0.6 * a, '#7a2f3d', { sw: 1.6, lit: false });
      break;
    case 'O':
      ell(x, y + 0.4 * a, 1.0 * a, 1.2 * a, '#7a2f3d', { sw: 1.8, lit: false });
      ell(x, y + 0.9 * a, 0.6 * a, 0.4 * a, PAL.rose, { ink: null, lit: false });
      break;
    case 'flat':
      inkLine([[x - 0.9 * a, y + 0.2 * a], [x + 0.9 * a, y + 0.2 * a]], sw);
      break;
    case 'wobble': {
      const p: Pt[] = [];
      for (let i = 0; i < 7; i++) p.push([x - 1.2 * a + i * 0.4 * a, y + 0.2 * a + (i % 2 ? -0.25 : 0.25) * a]);
      inkLine(p, sw, PAL.ink, false);
      break;
    }
    case 'frown':
      inkLine([[x - 1 * a, y + 0.7 * a], [x, y - 0.1 * a], [x + 1 * a, y + 0.7 * a]], sw);
      break;
    case 'tongue':
      ell(x + 0.3 * a, y + 0.9 * a, 0.55 * a, 0.6 * a, PAL.rose, { sw: 1.4, lit: false });
      inkLine([[x - 1.1 * a, y], [x, y + 0.7 * a], [x + 1.1 * a, y]], sw);
      break;
    default:
      inkLine([[x - 1.1 * a, y], [x, y + 0.75 * a], [x + 1.1 * a, y]], sw);
  }
}

function hatShape(kind: string, u: number, col: string) {
  switch (kind) {
    case 'party':
      g.save();
      g.translate(-2.2 * u, -9 * u);
      g.rotate(-0.25);
      poly([[-1.5 * u, 0], [1.5 * u, 0], [0, -4 * u]], PAL.rose, { sw: 2 });
      poly([[-0.8 * u, -2 * u], [0.8 * u, -2 * u], [0.4 * u, -3 * u], [-0.4 * u, -3 * u]], PAL.ochre, { ink: null, lit: false });
      ell(0, -4.2 * u, 0.55 * u, 0.55 * u, PAL.cream, { sw: 1.6, lit: false });
      g.restore();
      break;
    case 'hard':
      rr(-3.2 * u, -10.6 * u, 6.4 * u, 2.2 * u, 1.1 * u, PAL.ochre, { sw: 2.2 });
      rect(-3.9 * u, -9.1 * u, 7.8 * u, 0.7 * u, shade(PAL.ochre, -0.15), { sw: 2 });
      rect(-0.35 * u, -10.8 * u, 0.7 * u, 1.6 * u, shade(PAL.ochre, 0.3), { ink: null, lit: false });
      break;
    case 'crown':
      poly([[-2.6 * u, -9 * u], [-2.9 * u, -11.6 * u], [-1.3 * u, -10.2 * u], [0, -12 * u], [1.3 * u, -10.2 * u], [2.9 * u, -11.6 * u], [2.6 * u, -9 * u]], '#f4c542', { sw: 2.2 });
      ell(0, -10.4 * u, 0.35 * u, 0.35 * u, PAL.red, { sw: 1.2, lit: false });
      break;
    case 'grad':
      poly([[-4 * u, -9.9 * u], [0, -11.4 * u], [4 * u, -9.9 * u], [0, -8.5 * u]], PAL.night, { sw: 2.2 });
      rr(-2.2 * u, -9.2 * u, 4.4 * u, 1.2 * u, 0.4 * u, PAL.night, { sw: 2, ink: PAL.ink });
      line(3.2 * u, -10 * u, 3.6 * u, -7.6 * u, 2, PAL.ochre);
      ell(3.6 * u, -7.3 * u, 0.4 * u, 0.5 * u, PAL.ochre, { sw: 1.2, lit: false });
      break;
    case 'top':
      rect(-2.4 * u, -12.4 * u, 4.8 * u, 3.6 * u, PAL.night, { sw: 2.2 });
      rect(-3.6 * u, -9.2 * u, 7.2 * u, 0.7 * u, PAL.night, { sw: 2.2 });
      rect(-2.4 * u, -10 * u, 4.8 * u, 0.7 * u, PAL.red, { ink: null, lit: false });
      break;
    case 'beret':
      ell(-0.5 * u, -9.4 * u, 3.4 * u, 1.3 * u, PAL.red, { sw: 2.2, rot: -0.12 });
      ell(-0.2 * u, -10.8 * u, 0.3 * u, 0.4 * u, PAL.red, { sw: 1.6, lit: false });
      break;
    case 'phones':
      inkLine([[-4.7 * u, -6 * u], [-4.4 * u, -9.6 * u], [0, -10.6 * u], [4.4 * u, -9.6 * u], [4.7 * u, -6 * u]], u * 0.55, PAL.night);
      ell(-4.8 * u, -6 * u, 0.9 * u, 1.5 * u, PAL.rose, { sw: 2, lit: false });
      ell(4.8 * u, -6 * u, 0.9 * u, 1.5 * u, PAL.rose, { sw: 2, lit: false });
      break;
    case 'scarf': {
      const sw2 = Math.sin(T * 5) * 0.4 * u;
      rr(-4.6 * u, -3.6 * u, 9.2 * u, 1.4 * u, 0.6 * u, PAL.red, { sw: 2.2 });
      poly([[2.6 * u, -2.4 * u], [3.8 * u, -2.4 * u], [4.9 * u + sw2, 0.4 * u], [3.4 * u + sw2, 0.4 * u]], PAL.red, { sw: 2 });
      line(3 * u, -3.2 * u, 3 * u, -2.5 * u, 2, '#fff', 0.7);
      break;
    }
    case 'specs':
      ell(-1.6 * u, -6 * u, 1.35 * u, 1.35 * u, 'rgba(200,230,255,.35)', { sw: 2.2, lit: false, op: 0.4 });
      ell(1.6 * u, -6 * u, 1.35 * u, 1.35 * u, 'rgba(200,230,255,.35)', { sw: 2.2, lit: false, op: 0.4 });
      line(-0.3 * u, -6 * u, 0.3 * u, -6 * u, 2.2);
      break;
    case 'shades':
      rr(-3.2 * u, -6.7 * u, 6.4 * u, 1.7 * u, 0.7 * u, PAL.ink, { sw: 2 });
      break;
    case 'tie':
      poly([[-0.5 * u, -3.4 * u], [0.5 * u, -3.4 * u], [0.8 * u, -1.6 * u], [0, -1.1 * u], [-0.8 * u, -1.6 * u]], PAL.red, { sw: 1.6, lit: false });
      break;
    case 'beret2':
      break;
    default:
      void col;
  }
}

function emoteShape(kind: string, x: number, y: number, u: number, k: number) {
  const s = backOut(k);
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  const up = -Math.sin(Math.min(1, k) * 2) * u * 0.2;
  g.translate(0, up);
  switch (kind) {
    case 'sweat':
      poly([[0, -1.4 * u], [0.8 * u, 0], [0, 0.8 * u], [-0.8 * u, 0]], '#9fd8f5', { curv: true, sw: 1.8, lit: false });
      break;
    case 'spark':
      poly(starPts(0, 0, 1.6 * u, 0.4, 4), PAL.ochre, { sw: 2, lit: false });
      break;
    case 'heart':
      poly(heartPts(0, 0, 1.4 * u), PAL.rose, { curv: true, sw: 2, lit: false });
      break;
    case 'anger':
      line(-u, -u, u, u, 4, PAL.red);
      line(u, -u, -u, u, 4, PAL.red);
      break;
    case 'music':
      letter('\u266a', 0, 0, 3 * u, PAL.violet);
      break;
    case 'zzz':
      letter('z', 0, 0, 2 * u, PAL.cream);
      letter('Z', 1.4 * u, -1.6 * u, 2.6 * u, PAL.cream);
      break;
    case '!':
    case '?':
    case '!?':
    case '!!':
      letter(kind, 0, 0, 3.4 * u, kind[0] === '?' ? PAL.violet : PAL.red);
      break;
  }
  g.restore();
}

export function bit(x: number, y: number, u: number, o: BitO = {}) {
  const dy = o.dy ?? 0;
  const sq = o.sq ?? 0;
  const col = o.col ?? PAL.bit;
  const ink = o.ink ?? PAL.ink;
  let eyes = o.eyes ?? 'normal';
  // auto blink
  if ((eyes === 'normal' || eyes === 'look') && ((T + (o.seed ?? 0) * 1.7) % 3.3) > 3.2) eyes = 'closed';
  const hats: string[] = o.hat ? (Array.isArray(o.hat) ? [...o.hat] : [o.hat]) : [];
  if (!o.noShadow) {
    const lift = clamp(-dy / 8);
    ell(x, y + u * 0.2, 4.6 * u * (1 - lift * 0.4), 0.8 * u * (1 - lift * 0.4), 'rgba(50,35,60,.28)', { ink: null, lit: false, edge: 0 });
  }
  g.save();
  g.translate(x, y + dy * u);
  g.rotate(o.rot ?? 0);
  g.scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * 0.32), 1 - sq * 0.32);
  const walk = o.walk ?? 0;
  // legs
  if (!o.noLegs) {
    for (const s of [-1, 1]) {
      g.save();
      g.translate(s * 1.9 * u, -1.9 * u);
      g.rotate(Math.sin(walk * TAU + (s > 0 ? 0 : Math.PI)) * 0.55 * (walk ? 1 : 0));
      rr(-0.55 * u, 0, 1.1 * u, 1.7 * u, 0.5 * u, shade(col, -0.2), { sw: 2, lit: false });
      ell(0.25 * u, 1.75 * u, 1.05 * u, 0.5 * u, shade(col, -0.3), { sw: 2, lit: false });
      g.restore();
    }
  }
  // arms (behind-body feel: drawn first)
  const arm = (side: number, a: number, hook?: (u: number) => void) => {
    g.save();
    g.translate(side * 4.3 * u, -4.4 * u);
    g.scale(side, 1);
    g.rotate(-a);
    rr(-0.3 * u, -0.55 * u, 3 * u, 1.1 * u, 0.5 * u, shade(col, -0.1), { sw: 2, lit: false });
    ell(3.1 * u, 0, 0.8 * u, 0.8 * u, shade(col, 0.15), { sw: 2, lit: false });
    if (hook) {
      g.translate(3.1 * u, 0);
      hook(u);
    }
    g.restore();
  };
  arm(-1, o.aL ?? -0.9, o.armL);
  arm(1, o.aR ?? -0.9, o.armR);
  // body
  rr(-4.5 * u, -9 * u, 9 * u, 7.2 * u, 2.4 * u, col, { sw: 2.8, ink });
  // antenna
  const wv = Math.sin(T * 4 + (o.seed ?? 0)) * 0.25 * u;
  inkLine([[0, -9 * u], [0.3 * u + wv * 0.5, -10 * u], [0.5 * u + wv, -10.9 * u]], Math.max(2, u * 0.28), ink);
  const bulbK = 0.6 + 0.4 * pulse(T, 4);
  g.globalAlpha = 0.35 * bulbK;
  ell(0.5 * u + wv, -11.4 * u, 1.8 * u, 1.8 * u, o.bulb ?? PAL.ochre, { ink: null, lit: false, edge: 0 });
  g.globalAlpha = 1;
  ell(0.5 * u + wv, -11.4 * u, 0.8 * u, 0.8 * u, o.bulb ?? PAL.ochre, { sw: 2, lit: false });
  // face plate
  rr(-3.5 * u, -8 * u, 7 * u, 4.6 * u, 1.8 * u, PAL.cream, { sw: 2, ink, lit: false });
  if (o.blush) {
    ell(-2.6 * u, -4.7 * u, 0.8 * u, 0.5 * u, PAL.rose, { ink: null, lit: false, op: 0.6 });
    ell(2.6 * u, -4.7 * u, 0.8 * u, 0.5 * u, PAL.rose, { ink: null, lit: false, op: 0.6 });
  }
  if (eyes === 'shades') {
    hats.push('shades');
  } else if (eyes === 'wink') {
    eyeShape('normal', -1.6 * u, -6 * u, 0.85 * u, -1, o, u);
    eyeShape('happy', 1.6 * u, -6 * u, 0.85 * u, 1, o, u);
  } else {
    eyeShape(eyes, -1.6 * u, -6 * u, 0.85 * u, -1, o, u);
    eyeShape(eyes, 1.6 * u, -6 * u, 0.85 * u, 1, o, u);
  }
  mouthShape(o.mouth ?? 'smile', 0, -4.45 * u, u, o.mouthK ?? 1);
  if (o.draw) o.draw(u);
  for (const h of hats) hatShape(h, u, col);
  if (o.emote && (o.emoteK ?? 0) > 0) emoteShape(o.emote, 4.6 * u, -11.4 * u, u, o.emoteK ?? 0);
  g.restore();
}

/** blink-squash-and-pop mood changes: never snap between faces */
export function mood(t: number, keys: [number, string, string?][]) {
  let cur = keys[0];
  for (const k of keys) if (t >= k[0]) cur = k;
  const dt = t - cur[0];
  const first = cur === keys[0];
  const take = first ? 0 : Math.sin(clamp(dt / 0.28) * Math.PI) * 0.55;
  const squint = !first && dt < 0.12;
  return {
    eyes: squint ? 'closed' : cur[1],
    sq: take,
    emote: cur[2] && dt < 1.4 ? cur[2] : undefined,
    emoteK: cur[2] ? clamp(dt / 0.25) * (1 - seg(dt, 1.0, 1.4)) : 0,
  };
}

/** beat-synced dancing offsets */
export function move(style: string, t: number, seed = 0): BitO {
  const b = t / 0.625 + seed * 0.37;
  const ph = b - Math.floor(b);
  const bounce = Math.abs(Math.sin(b * Math.PI));
  const sw = Math.sin(b * Math.PI);
  switch (style) {
    case 'hop':
      return { dy: -bounce * 1.8, sq: ph < 0.12 ? 0.35 : 0, aL: 0.9 + bounce, aR: 0.9 + bounce };
    case 'roof':
      return { dy: -bounce * 1.1, aL: 2.2 + sw * 0.2, aR: 2.2 - sw * 0.2, sq: (1 - bounce) * 0.12 };
    case 'sway':
      return { rot: sw * 0.12, aL: sw * 0.9, aR: -sw * 0.9 + 0.4, dy: -bounce * 0.3 };
    case 'spin':
      return { sx: Math.cos(b * Math.PI), dy: -bounce * 1.2, aL: 1.2, aR: 1.2 };
    case 'wave':
      return { aR: 1.5 + Math.sin(t * 14) * 0.45, dy: -bounce * 0.4 };
    case 'walk':
      return { walk: b * 0.5, dy: -Math.abs(Math.sin(b * Math.PI * 2)) * 0.3 };
    case 'stomp':
      return { dy: -bounce * 0.9, sq: bounce < 0.2 ? 0.25 : 0, aL: 0.5, aR: 0.5, rot: sw * 0.05 };
    case 'shimmy':
      return { rot: Math.sin(b * Math.PI * 4) * 0.1, aL: 1 + Math.sin(b * 6) * 0.4, aR: 1 - Math.sin(b * 6) * 0.4, dy: -bounce * 0.5 };
    default:
      return { dy: -bounce * 0.5, aL: -0.5 + sw * 0.4, aR: -0.5 - sw * 0.4 };
  }
}

export function dancer(x: number, y: number, u: number, style: string, t: number, extra: BitO = {}, seed = 0) {
  bit(x, y, u, { ...move(style, t, seed), ...extra, seed });
}

// =====================================================================
// HUMAN — the Researcher, who ages through the decades. era 0..5
// =====================================================================
export interface HO {
  era?: number;
  seed?: number;
  dy?: number;
  rot?: number;
  flip?: boolean;
  aL?: number;
  aR?: number;
  walk?: number;
  eyes?: string;
  mouth?: string;
  sweat?: number;
  noLegs?: boolean;
  noShadow?: boolean;
  coat?: string;
  hair?: string;
  skin?: string;
  specs?: boolean;
  gray?: number;
  armR?: (s: number) => void;
  armL?: (s: number) => void;
  draw?: (s: number) => void;
  lean?: number;
}
const SKINS = ['#f2c9a0', '#e0a97a', '#c68a5c', '#8d5a3b', '#f6d6b8'];
const HAIRS = ['#3b2a22', '#6b4a2f', '#1f1b1f', '#b2562d', '#d4b36a', '#4a3a55'];
const ERA_STYLE = [
  { hair: 'crew', coat: '#fff6e6', shirt: '#6b8fb0', tie: true },
  { hair: 'shag', coat: '#fdf0d4', shirt: '#d9822b', tie: false },
  { hair: 'poof', coat: '#fff2e8', shirt: '#b4569a', tie: false },
  { hair: 'crew', coat: '#f4f8f6', shirt: '#4a7d6c', tie: true },
  { hair: 'beard', coat: '#fffaf0', shirt: '#6b6fb3', tie: false },
  { hair: 'bun', coat: '#fffaf0', shirt: '#e0674e', tie: false },
];

export function human(x: number, y: number, s: number, o: HO = {}) {
  const era = o.era ?? 0;
  const st = ERA_STYLE[Math.min(5, era)];
  const seed = o.seed ?? era;
  const skin = o.skin ?? SKINS[Math.floor(hash(seed * 3.3) * 5)];
  let hair = o.hair ?? HAIRS[Math.floor(hash(seed * 7.1 + 1) * 6)];
  if (o.gray) hair = mixCol(hair, '#d8d6d8', o.gray);
  const coat = o.coat ?? st.coat;
  const dy = o.dy ?? 0;
  if (!o.noShadow) ell(x, y + s * 0.2, 3 * s, 0.6 * s, 'rgba(50,35,60,.26)', { ink: null, lit: false, edge: 0 });
  g.save();
  g.translate(x, y + dy * s);
  g.rotate(o.rot ?? 0);
  g.scale(o.flip ? -1 : 1, 1);
  const walk = o.walk ?? 0;
  if (!o.noLegs) {
    for (const sd of [-1, 1]) {
      g.save();
      g.translate(sd * 0.95 * s, -4.2 * s);
      g.rotate(Math.sin(walk * TAU + (sd > 0 ? 0 : Math.PI)) * 0.5 * (walk ? 1 : 0));
      rr(-0.7 * s, 0, 1.4 * s, 4 * s, 0.5 * s, '#4a4e6a', { sw: 2, lit: false });
      ell(0.35 * s, 4.1 * s, 1.1 * s, 0.5 * s, '#3b2f33', { sw: 2, lit: false });
      g.restore();
    }
  }
  g.save();
  g.translate(0, 0);
  g.rotate(o.lean ?? 0);
  // arms
  const arm = (side: number, a: number, hook?: (s: number) => void) => {
    g.save();
    g.translate(side * 2.4 * s, -8.7 * s);
    g.scale(side, 1);
    g.rotate(-a);
    rr(-0.4 * s, -0.7 * s, 3.4 * s, 1.4 * s, 0.7 * s, coat, { sw: 2, lit: false });
    ell(3.3 * s, 0, 0.75 * s, 0.75 * s, skin, { sw: 1.8, lit: false });
    if (hook) {
      g.translate(3.3 * s, 0);
      hook(s);
    }
    g.restore();
  };
  arm(-1, o.aL ?? -1.1, o.armL);
  arm(1, o.aR ?? -1.1, o.armR);
  // torso (lab coat)
  poly([[-2.6 * s, -9.4 * s], [2.6 * s, -9.4 * s], [3.1 * s, -3.6 * s], [-3.1 * s, -3.6 * s]], coat, { sw: 2.4 });
  poly([[-0.9 * s, -9.4 * s], [0.9 * s, -9.4 * s], [0, -6.2 * s]], st.shirt, { sw: 1.6, lit: false });
  if (st.tie) poly([[-0.25 * s, -8.5 * s], [0.25 * s, -8.5 * s], [0.4 * s, -6.6 * s], [0, -6.2 * s], [-0.4 * s, -6.6 * s]], PAL.red, { sw: 1.2, lit: false });
  line(-1.9 * s, -5.8 * s, -0.9 * s, -5.8 * s, 1.8);
  line(-1.6 * s, -6.1 * s, -1.6 * s, -5.3 * s, 1.6, PAL.rose);
  // head
  const hy = -11.5 * s;
  if (st.hair === 'shag' || st.hair === 'bun') ell(0, hy + 0.4 * s, 2.7 * s, 2.7 * s, hair, { sw: 2, lit: false });
  ell(0, hy, 2.2 * s, 2.3 * s, skin, { sw: 2.2 });
  // hair front
  if (st.hair === 'crew') poly(ellPts(0, hy - 1.1 * s, 2.35 * s, 1.4 * s, 12).filter((p) => p[1] < hy - 0.5 * s).concat([[2.2 * s, hy - 0.6 * s], [-2.2 * s, hy - 0.6 * s]]), hair, { sw: 2, lit: false, curv: false });
  else if (st.hair === 'poof') {
    for (let i = 0; i < 6; i++) ell(Math.cos(Math.PI + (i / 5) * Math.PI) * 2.2 * s, hy - 0.7 * s + Math.sin(Math.PI + (i / 5) * Math.PI) * 2 * s, 1.2 * s, 1.2 * s, hair, { sw: 1.8, lit: false });
  } else if (st.hair === 'beard') {
    poly(ellPts(0, hy - 1.2 * s, 2.3 * s, 1.2 * s, 12).filter((p) => p[1] < hy - 0.7 * s), hair, { sw: 2, lit: false });
    poly([[-2.1 * s, hy + 0.3 * s], [2.1 * s, hy + 0.3 * s], [1.2 * s, hy + 2.5 * s], [0, hy + 2.9 * s], [-1.2 * s, hy + 2.5 * s]], mixCol(hair, '#aaa', 0.25), { sw: 2, lit: false, curv: true });
  } else if (st.hair === 'bun') {
    ell(0, hy - 2.8 * s, 1.1 * s, 1.1 * s, hair, { sw: 2, lit: false });
    poly(ellPts(0, hy - 1 * s, 2.3 * s, 1.3 * s, 12).filter((p) => p[1] < hy - 0.5 * s), hair, { sw: 2, lit: false });
  } else {
    poly(ellPts(0, hy - 1.1 * s, 2.4 * s, 1.5 * s, 12).filter((p) => p[1] < hy - 0.4 * s), hair, { sw: 2, lit: false });
    rect(-2.4 * s, hy - 1.2 * s, 0.7 * s, 2.2 * s, hair, { sw: 1.6, lit: false });
    rect(1.7 * s, hy - 1.2 * s, 0.7 * s, 2.2 * s, hair, { sw: 1.6, lit: false });
  }
  // face
  const eyes = o.eyes ?? 'dot';
  const ey = hy + 0.15 * s;
  for (const sd of [-1, 1]) {
    const ex = sd * 0.95 * s;
    if (eyes === 'happy') inkLine([[ex - 0.45 * s, ey + 0.2 * s], [ex, ey - 0.3 * s], [ex + 0.45 * s, ey + 0.2 * s]], 2.4);
    else if (eyes === 'closed') inkLine([[ex - 0.45 * s, ey], [ex, ey + 0.3 * s], [ex + 0.45 * s, ey]], 2.4);
    else if (eyes === 'scared') {
      ell(ex, ey, 0.6 * s, 0.7 * s, '#fff', { sw: 1.5, lit: false });
      ell(ex, ey, 0.15 * s, 0.2 * s, PAL.ink, { ink: null, lit: false });
    } else if (eyes === 'star') poly(starPts(ex, ey, 0.8 * s, 0.45, 4), PAL.ochre, { sw: 1.4, lit: false });
    else if (eyes === 'swirl') {
      const p: Pt[] = [];
      for (let i = 0; i < 18; i++) p.push([ex + Math.cos(i * 0.6 + T * 8) * (i / 18) * 0.7 * s, ey + Math.sin(i * 0.6 + T * 8) * (i / 18) * 0.7 * s]);
      inkLine(p, 1.8);
    } else if (eyes === 'heart') poly(heartPts(ex, ey, 0.75 * s), PAL.rose, { sw: 1.4, lit: false, curv: true });
    else ell(ex, ey, 0.22 * s, 0.3 * s, PAL.ink, { ink: null, lit: false });
  }
  const ms = o.mouth ?? 'smile';
  const my = hy + 1.25 * s;
  if (ms === 'o') ell(0, my, 0.45 * s, 0.55 * s, '#7a2f3d', { sw: 1.4, lit: false });
  else if (ms === 'flat') inkLine([[-0.6 * s, my], [0.6 * s, my]], 2);
  else if (ms === 'wobble') inkLine([[-0.8 * s, my], [-0.4 * s, my - 0.2 * s], [0, my + 0.2 * s], [0.4 * s, my - 0.2 * s], [0.8 * s, my]], 2, PAL.ink, false);
  else if (ms === 'grin') poly([[-0.9 * s, my - 0.2 * s], [0.9 * s, my - 0.2 * s], [0, my + 0.8 * s]], '#7a2f3d', { sw: 1.4, lit: false, curv: true });
  else inkLine([[-0.7 * s, my - 0.1 * s], [0, my + 0.35 * s], [0.7 * s, my - 0.1 * s]], 2);
  if (o.specs !== false && (o.specs || era !== 1)) {
    ell(-0.95 * s, ey, 0.95 * s, 0.95 * s, 'rgba(210,235,255,.4)', { sw: 2, lit: false, op: 0.4 });
    ell(0.95 * s, ey, 0.95 * s, 0.95 * s, 'rgba(210,235,255,.4)', { sw: 2, lit: false, op: 0.4 });
    line(-0.05 * s, ey, 0.05 * s, ey, 2);
  }
  if (o.sweat) {
    for (let i = 0; i < 2; i++) {
      const k = (T * 1.6 + i * 0.5) % 1;
      poly([[0, -0.7 * s], [0.35 * s, 0], [0, 0.4 * s], [-0.35 * s, 0]], '#9fd8f5', { sw: 1.3, lit: false, curv: true, op: o.sweat * (1 - k) } as never);
      void k;
    }
  }
  if (o.draw) o.draw(s);
  g.restore();
  g.restore();
}

// quick background person for crowds (about 5 shapes)
export function mini(x: number, y: number, s: number, seed: number, o: { cheer?: number; dy?: number; t?: number; col?: string } = {}) {
  const skin = SKINS[Math.floor(hash(seed * 3.3) * 5)];
  const hair = HAIRS[Math.floor(hash(seed * 7.1) * 6)];
  const shirt = o.col ?? ['#e0674e', '#6b6fb3', '#4a7d6c', '#d9822b', '#b4569a', '#4fb3c8', '#eab04a'][Math.floor(hash(seed * 1.9) * 7)];
  const cheer = o.cheer ?? 0;
  const bob = Math.abs(Math.sin(((o.t ?? T) / 0.625 + seed * 0.37) * Math.PI)) * cheer * s * 0.8;
  const yy = y - bob + (o.dy ?? 0) * s;
  const up = cheer ? 0.9 + Math.sin((o.t ?? T) * 9 + seed) * 0.4 : -0.2;
  line(x - 1.5 * s, yy - 4 * s, x - 2.6 * s, yy - 4 * s - up * 2 * s, 3, shirt);
  line(x + 1.5 * s, yy - 4 * s, x + 2.6 * s, yy - 4 * s - up * 2 * s, 3, shirt);
  rr(x - 1.7 * s, yy - 5 * s, 3.4 * s, 5 * s, 1.2 * s, shirt, { sw: 2, lit: false });
  ell(x, yy - 6.4 * s, 1.5 * s, 1.5 * s, skin, { sw: 2, lit: false });
  poly(ellPts(x, yy - 7.1 * s, 1.55 * s, 1.0 * s, 10).filter((p) => p[1] < yy - 6.6 * s), hair, { sw: 1.6, lit: false });
}

export { lerp, wob };
