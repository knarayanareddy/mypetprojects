import * as THREE from 'three';
import type { Tex } from './helpers';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const S = 256;

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  return [c, c.getContext('2d')!];
}

const g = (v: number) => {
  const c = Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${c},${c},${c})`;
};

function grain(ctx: CanvasRenderingContext2D, rand: () => number, amount: number) {
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function blotches(ctx: CanvasRenderingContext2D, rand: () => number, n: number, dark: number) {
  for (let i = 0; i < n; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 10 + rand() * 40;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = rand() > 0.5 ? 255 : 0;
    gr.addColorStop(0, `rgba(${v},${v},${v},${dark})`);
    gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    ctx.fillStyle = gr;
    // wrap so it tiles
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.restore();
      }
    }
  }
}

function make(kind: Tex): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  const rand = rng(kind.length * 977 + kind.charCodeAt(0) * 131);
  ctx.fillStyle = g(238);
  ctx.fillRect(0, 0, S, S);

  switch (kind) {
    case 'ashlar': {
      const rows = 4;
      const h = S / rows;
      for (let r = 0; r < rows; r++) {
        let x = -rand() * 60;
        while (x < S) {
          const w = 50 + rand() * 60;
          ctx.fillStyle = g(205 + rand() * 45);
          ctx.fillRect(x, r * h, w, h);
          ctx.strokeStyle = g(120);
          ctx.lineWidth = 3;
          ctx.strokeRect(x, r * h, w, h);
          x += w;
        }
      }
      blotches(ctx, rand, 14, 0.12);
      grain(ctx, rand, 26);
      break;
    }
    case 'brick': {
      const bh = 16;
      const bw = 42;
      ctx.fillStyle = g(150);
      ctx.fillRect(0, 0, S, S);
      for (let r = 0; r < S / bh; r++) {
        const off = r % 2 ? bw / 2 : 0;
        for (let x = -bw; x < S + bw; x += bw) {
          ctx.fillStyle = g(195 + rand() * 60);
          ctx.fillRect(x + off + 1.5, r * bh + 1.5, bw - 3, bh - 3);
        }
      }
      blotches(ctx, rand, 10, 0.1);
      grain(ctx, rand, 30);
      break;
    }
    case 'tile': {
      const cw = 32;
      for (let x = 0; x < S; x += cw) {
        const gr = ctx.createLinearGradient(x, 0, x + cw, 0);
        gr.addColorStop(0, g(170));
        gr.addColorStop(0.5, g(250));
        gr.addColorStop(1, g(150));
        ctx.fillStyle = gr;
        ctx.fillRect(x, 0, cw, S);
      }
      for (let y = 0; y < S; y += 32) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, y, S, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(0, y + 3, S, 2);
      }
      grain(ctx, rand, 26);
      break;
    }
    case 'scale': {
      ctx.fillStyle = g(150);
      ctx.fillRect(0, 0, S, S);
      const r = 16;
      for (let row = -1; row < S / (r * 0.8) + 1; row++) {
        for (let col = -1; col < S / (r * 2) + 1; col++) {
          const x = col * r * 2 + (row % 2 ? r : 0);
          const y = row * r * 0.8;
          const gr = ctx.createRadialGradient(x, y + r * 0.3, 2, x, y + r * 0.3, r);
          gr.addColorStop(0, g(250));
          gr.addColorStop(0.75, g(215));
          gr.addColorStop(1, g(120));
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(x, y + r * 0.6, r, 0, Math.PI);
          ctx.lineTo(x - r, y - r);
          ctx.lineTo(x + r, y - r);
          ctx.fill();
        }
      }
      grain(ctx, rand, 18);
      break;
    }
    case 'wood': {
      for (let x = 0; x < S; x++) {
        const v = 200 + Math.sin(x * 0.35) * 20 + rand() * 30;
        ctx.fillStyle = g(v);
        ctx.fillRect(x, 0, 1, S);
      }
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(rand() * S, rand() * S, 1 + rand() * 2, 20 + rand() * 80);
      }
      grain(ctx, rand, 20);
      break;
    }
    case 'glass': {
      ctx.fillStyle = g(235);
      ctx.fillRect(0, 0, S, S);
      const cols = 4;
      const rows = 8;
      const cw = S / cols;
      const rh = S / rows;
      for (let r = 0; r < rows; r++) {
        for (let k = 0; k < cols; k++) {
          ctx.fillStyle = g(70 + rand() * 40);
          ctx.fillRect(k * cw + 8, r * rh + 6, cw - 16, rh - 12);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(k * cw + 8, r * rh + 6, cw - 16, 4);
        }
      }
      grain(ctx, rand, 14);
      break;
    }
    case 'mud': {
      ctx.fillStyle = g(215);
      ctx.fillRect(0, 0, S, S);
      blotches(ctx, rand, 60, 0.22);
      for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const x = rand() * S;
        const y = rand() * S;
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - 0.5) * 30, y + (rand() - 0.5) * 30);
        ctx.stroke();
      }
      grain(ctx, rand, 44);
      break;
    }
    case 'concrete': {
      ctx.fillStyle = g(225);
      ctx.fillRect(0, 0, S, S);
      blotches(ctx, rand, 40, 0.14);
      for (let y = 0; y < S; y += 64) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(0, y, S, 2);
      }
      grain(ctx, rand, 34);
      break;
    }
    case 'plaster':
    default: {
      blotches(ctx, rand, 40, 0.1);
      grain(ctx, rand, 16);
      break;
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Window-light mask for the glass texture. */
function makeLit(): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  const rand = rng(4242);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  const cols = 4;
  const rows = 8;
  const cw = S / cols;
  const rh = S / rows;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      if (rand() < 0.6) {
        ctx.fillStyle = g(150 + rand() * 105);
        ctx.fillRect(k * cw + 8, r * rh + 6, cw - 16, rh - 12);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Hatched section colour for the cut plane. */
export function makeHatch(): THREE.CanvasTexture {
  const [c, ctx] = canvas();
  ctx.fillStyle = '#f1e6cc';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(90,60,30,0.55)';
  ctx.lineWidth = 6;
  for (let i = -S; i < S * 2; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, S);
    ctx.lineTo(i + S, 0);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const base = new Map<Tex, THREE.CanvasTexture>();
const variants = new Map<string, THREE.Texture>();
let lit: THREE.CanvasTexture | null = null;

/** Texture whose UVs are in world units, repeated every `tile` units. */
export function getTexture(kind: Tex, tile: number, emissive = false): THREE.Texture | null {
  if (kind === 'none') return null;
  const key = `${kind}|${tile}|${emissive ? 1 : 0}`;
  let t = variants.get(key);
  if (t) return t;
  let src: THREE.CanvasTexture;
  if (emissive) {
    lit = lit ?? makeLit();
    src = lit;
  } else {
    let b = base.get(kind);
    if (!b) {
      b = make(kind);
      base.set(kind, b);
    }
    src = b;
  }
  t = src.clone();
  t.needsUpdate = true;
  t.repeat.set(1 / tile, 1 / tile);
  variants.set(key, t);
  return t;
}
