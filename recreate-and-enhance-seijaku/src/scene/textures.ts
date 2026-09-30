// Procedural, seamless canvas textures. Shared by the 3D scene and the materials gallery.

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cv(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

/** draw a shape at (x,y) and any wrapped copies so the texture tiles seamlessly */
function wrap(w: number, h: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) {
  for (const dx of [-w, 0, w]) {
    for (const dy of [-h, 0, h]) {
      const px = x + dx;
      const py = y + dy;
      if (px + rad < 0 || px - rad > w || py + rad < 0 || py - rad > h) continue;
      fn(px, py);
    }
  }
}

function blotches(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  r: () => number,
  n: number,
  colors: string[],
  rMin: number,
  rMax: number,
  alpha: number,
) {
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = rMin + r() * (rMax - rMin);
    const col = colors[Math.floor(r() * colors.length)];
    wrap(w, h, x, y, rad, (px, py) => {
      const gr = g.createRadialGradient(px, py, 0, px, py, rad);
      gr.addColorStop(0, col);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = alpha * (0.4 + r() * 0.6);
      g.fillStyle = gr;
      g.beginPath();
      g.arc(px, py, rad, 0, Math.PI * 2);
      g.fill();
    });
  }
  g.globalAlpha = 1;
}

function rotate90(src: HTMLCanvasElement) {
  const { c, g } = cv(src.height, src.width);
  g.translate(c.width, 0);
  g.rotate(Math.PI / 2);
  g.drawImage(src, 0, 0);
  return c;
}

export function wood(size = 512, base = "#d9b98a", dark = "#8f6a3f", seed = 1, vertical = false, planks = 0) {
  const r = rng(seed);
  const { c, g } = cv(size);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  blotches(g, size, size, r, 40, [dark, "#ffffff"], size * 0.08, size * 0.25, 0.08);
  const lines = Math.floor(size * 0.35);
  for (let i = 0; i < lines; i++) {
    const y0 = r() * size;
    const amp = 2 + r() * 10;
    const k = 1 + Math.floor(r() * 3);
    const ph = r() * 6.28;
    g.strokeStyle = r() > 0.25 ? dark : "#ffffff";
    g.globalAlpha = 0.04 + r() * 0.2;
    g.lineWidth = 0.5 + r() * 2;
    g.beginPath();
    for (let x = 0; x <= size; x += 8) {
      const y = y0 + amp * Math.sin((k * 2 * Math.PI * x) / size + ph) + 3 * Math.sin((7 * 2 * Math.PI * x) / size + ph * 2);
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  // a few knots
  for (let i = 0; i < 2; i++) {
    const x = r() * size;
    const y = r() * size;
    for (let k = 6; k > 0; k--) {
      wrap(size, size, x, y, 30, (px, py) => {
        g.strokeStyle = dark;
        g.globalAlpha = 0.12;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(px, py, k * 5, k * 2, 0, 0, Math.PI * 2);
        g.stroke();
      });
    }
  }
  g.globalAlpha = 1;
  if (planks > 0) {
    const ph = size / planks;
    for (let i = 0; i < planks; i++) {
      g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(60,30,10,0.07)";
      g.fillRect(0, i * ph, size, ph);
      g.fillStyle = "rgba(40,22,8,0.45)";
      g.fillRect(0, i * ph, size, 2);
    }
  }
  return vertical ? rotate90(c) : c;
}

export function tatami(size = 512, seed = 3) {
  const r = rng(seed);
  const { c, g } = cv(size);
  const band = size / 2;
  for (let b = 0; b < 2; b++) {
    const y0 = b * band;
    g.fillStyle = b === 0 ? "#b3b577" : "#a9ac6d";
    g.fillRect(0, y0, size, band);
    const step = Math.max(2, size / 170);
    for (let y = y0; y < y0 + band; y += step) {
      g.fillStyle = r() > 0.5 ? "rgba(255,255,220,0.12)" : "rgba(40,50,10,0.12)";
      g.globalAlpha = 0.4 + r() * 0.6;
      g.fillRect(0, y, size, step * 0.6);
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 220; i++) {
      g.strokeStyle = r() > 0.5 ? "rgba(255,255,230,0.25)" : "rgba(50,55,20,0.25)";
      g.lineWidth = 1;
      const x = r() * size;
      const y = y0 + r() * band;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 20 + r() * 50, y);
      g.stroke();
    }
    // heri (cloth border)
    const hh = size * 0.022;
    g.fillStyle = "#26301f";
    g.fillRect(0, y0, size, hh);
    g.fillRect(0, y0 + band - hh, size, hh);
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(0, y0 + hh, size, 1.5);
    g.fillRect(0, y0 + band - hh - 1.5, size, 1.5);
    g.fillStyle = "rgba(20,25,10,0.5)";
    g.fillRect(0, y0, 2, band);
    g.fillRect(size - 2, y0, 2, band);
  }
  return c;
}

export function shoji(w = 256, h = 512, seed = 5) {
  const r = rng(seed);
  const { c, g } = cv(w, h);
  g.fillStyle = "#f4ecdb";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 320; i++) {
    g.strokeStyle = r() > 0.5 ? "rgba(190,175,140,0.3)" : "rgba(255,255,255,0.6)";
    g.lineWidth = 0.8;
    const x = r() * w;
    const y = r() * h;
    const a = r() * 6.28;
    const l = 6 + r() * 22;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  const wood = "#77532f";
  const hi = "rgba(255,220,170,0.35)";
  // frame
  g.fillStyle = wood;
  g.fillRect(0, 0, w, 7);
  g.fillRect(0, h - 7, w, 7);
  g.fillRect(0, 0, 7, h);
  g.fillRect(w - 7, 0, 7, h);
  // mullions 3 x 7
  for (let i = 1; i < 3; i++) {
    g.fillStyle = wood;
    g.fillRect((i * w) / 3 - 2.5, 0, 5, h);
    g.fillStyle = hi;
    g.fillRect((i * w) / 3 - 2.5, 0, 1.2, h);
  }
  for (let j = 1; j < 7; j++) {
    g.fillStyle = wood;
    g.fillRect(0, (j * h) / 7 - 2, w, 4);
    g.fillStyle = hi;
    g.fillRect(0, (j * h) / 7 - 2, w, 1);
  }
  return c;
}

export function washi(size = 512, seed = 9, fiber = 1) {
  const r = rng(seed);
  const { c, g } = cv(size);
  g.fillStyle = "#f3ead7";
  g.fillRect(0, 0, size, size);
  blotches(g, size, size, r, 60, ["#e3d6b8", "#ffffff", "#d8c9a4"], size * 0.05, size * 0.2, 0.18);
  const n = Math.floor(size * 2.2 * fiber);
  for (let i = 0; i < n; i++) {
    const x = r() * size;
    const y = r() * size;
    const a = r() * 6.28;
    const l = (8 + r() * 40) * fiber;
    g.strokeStyle = r() > 0.45 ? "rgba(255,255,255,0.75)" : "rgba(165,140,95,0.38)";
    g.lineWidth = 0.6 + r() * 1.3 * fiber;
    wrap(size, size, x, y, l, (px, py) => {
      g.beginPath();
      g.moveTo(px, py);
      g.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + r() * 4, py + Math.sin(a) * l * 0.5 + r() * 4, px + Math.cos(a) * l, py + Math.sin(a) * l);
      g.stroke();
    });
  }
  return c;
}

export function plaster(size = 512, seed = 11, base = "#d8ccb4") {
  const r = rng(seed);
  const { c, g } = cv(size);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  blotches(g, size, size, r, 70, ["#ffffff", "#9b8a6c", "#c7b899"], size * 0.05, size * 0.22, 0.14);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.35)" : "rgba(70,55,30,0.3)";
    const s = 0.6 + r() * 1.6;
    g.fillRect(r() * size, r() * size, s, s);
  }
  return c;
}

export function earth(size = 512, seed = 13) {
  const r = rng(seed);
  const c = plaster(size, seed, "#b79e78");
  const g = c.getContext("2d")!;
  for (let i = 0; i < 520; i++) {
    g.strokeStyle = "rgba(85,62,35,0.45)";
    g.lineWidth = 0.8;
    const x = r() * size;
    const y = r() * size;
    const a = (r() - 0.5) * 1.6;
    const l = 4 + r() * 10;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return c;
}

export function gravel(size = 512, seed = 17) {
  const r = rng(seed);
  const { c, g } = cv(size);
  g.fillStyle = "#a9a59b";
  g.fillRect(0, 0, size, size);
  blotches(g, size, size, r, 50, ["#8b877e", "#cbc6b9"], size * 0.05, size * 0.2, 0.12);
  const cols = ["#c9c4b8", "#8f8b82", "#d9d3c5", "#77736c", "#b6b0a2", "#e3ded2"];
  for (let i = 0; i < 4200; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = 1.2 + r() * 2.6;
    wrap(size, size, x, y, rad, (px, py) => {
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      g.globalAlpha = 0.6 + r() * 0.4;
      g.beginPath();
      g.ellipse(px, py, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2);
      g.fill();
    });
  }
  g.globalAlpha = 1;
  return c;
}

export function rake(size = 512, seed = 19) {
  const r = rng(seed);
  const c = gravel(size, seed);
  const g = c.getContext("2d")!;
  const sp = size / 24;
  for (let i = 0; i < 24; i++) {
    const y0 = i * sp;
    g.fillStyle = "rgba(255,255,250,0.32)";
    g.fillRect(0, y0, size, sp * 0.22);
    g.fillStyle = "rgba(40,36,30,0.38)";
    g.fillRect(0, y0 + sp * 0.3, size, sp * 0.2);
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(0, y0 + sp * 0.55, size, sp * 0.15);
  }
  for (let i = 0; i < 600; i++) {
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.fillRect(r() * size, r() * size, 1.5, 1.5);
  }
  return c;
}

export function moss(size = 512, seed = 23) {
  const r = rng(seed);
  const { c, g } = cv(size);
  g.fillStyle = "#c2c4b0";
  g.fillRect(0, 0, size, size);
  blotches(g, size, size, r, 180, ["#ffffff", "#8a8c78", "#e8ead0", "#6f7262"], size * 0.02, size * 0.1, 0.35);
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = r() > 0.5 ? "rgba(255,255,230,0.3)" : "rgba(30,50,10,0.3)";
    const s = 1 + r() * 2;
    g.fillRect(r() * size, r() * size, s, s);
  }
  return c;
}

export function roofTile(size = 512, seed = 29) {
  const r = rng(seed);
  const { c, g } = cv(size);
  const bands = 8;
  const bh = size / bands;
  for (let b = 0; b < bands; b++) {
    const y0 = b * bh;
    const gr = g.createLinearGradient(0, y0, 0, y0 + bh);
    gr.addColorStop(0, "#1f2429");
    gr.addColorStop(0.28, "#69737e");
    gr.addColorStop(0.55, "#3b434b");
    gr.addColorStop(1, "#171b1f");
    g.fillStyle = gr;
    g.fillRect(0, y0, size, bh);
    const seg = size / 4;
    const off = b % 2 ? seg / 2 : 0;
    for (let i = 0; i < 5; i++) {
      const x = i * seg + off;
      g.fillStyle = "rgba(0,0,0,0.6)";
      g.fillRect(x, y0, 3, bh);
      g.fillStyle = "rgba(255,255,255,0.08)";
      g.fillRect(x + 3, y0, 1.5, bh);
    }
    g.fillStyle = `rgba(${Math.floor(r() * 40)},${Math.floor(r() * 40)},${Math.floor(r() * 50)},0.12)`;
    g.fillRect(0, y0, size, bh);
  }
  blotches(g, size, size, r, 40, ["#000000", "#8a949e"], size * 0.05, size * 0.15, 0.12);
  return c;
}

export function stone(size = 512, seed = 31, base = "#8d8b84") {
  const r = rng(seed);
  const { c, g } = cv(size);
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  blotches(g, size, size, r, 90, ["#5e5c57", "#b9b7af", "#7a8189", "#a69b8a"], size * 0.05, size * 0.22, 0.22);
  for (let i = 0; i < 3200; i++) {
    g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.3)" : "rgba(20,20,20,0.3)";
    const s = 0.8 + r() * 2.2;
    g.fillRect(r() * size, r() * size, s, s);
  }
  for (let i = 0; i < 8; i++) {
    g.strokeStyle = "rgba(255,255,255,0.12)";
    g.lineWidth = 1 + r() * 2;
    g.beginPath();
    let x = r() * size;
    let y = r() * size;
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (r() - 0.2) * 80;
      y += (r() - 0.5) * 60;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return c;
}

export function linen(size = 512, seed = 37, step = 4) {
  const r = rng(seed);
  const { c, g } = cv(size);
  g.fillStyle = "#26385f";
  g.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += step) {
    g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.1)" : "rgba(0,0,20,0.18)";
    g.fillRect(0, y, size, step * 0.55);
  }
  for (let x = 0; x < size; x += step) {
    g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,20,0.16)";
    g.fillRect(x, 0, step * 0.55, size);
  }
  for (let i = 0; i < size * 1.2; i++) {
    g.strokeStyle = r() > 0.5 ? "rgba(170,190,235,0.35)" : "rgba(10,15,40,0.4)";
    g.lineWidth = 0.8 + r() * 1.2;
    const x = r() * size;
    const y = r() * size;
    const l = 10 + r() * 30;
    g.beginPath();
    if (r() > 0.5) {
      g.moveTo(x, y);
      g.lineTo(x + l, y);
    } else {
      g.moveTo(x, y);
      g.lineTo(x, y + l);
    }
    g.stroke();
  }
  blotches(g, size, size, r, 30, ["#0d1630", "#4d6aa8"], size * 0.08, size * 0.25, 0.15);
  return c;
}

export function scrollPainting(w = 256, h = 640) {
  const { c, g } = cv(w, h);
  g.fillStyle = "#e9dfc6";
  g.fillRect(0, 0, w, h);
  const r = rng(77);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = "rgba(150,125,80,0.08)";
    g.fillRect(r() * w, r() * h, 1 + r() * 10, 1);
  }
  g.lineCap = "round";
  g.strokeStyle = "#191815";
  g.lineWidth = 16;
  g.beginPath();
  g.arc(w / 2, h * 0.42, w * 0.3, 0.3, Math.PI * 2 - 0.25);
  g.stroke();
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(25,24,21,${0.1 + r() * 0.2})`;
    g.lineWidth = 1 + r() * 2.4;
    g.beginPath();
    g.arc(w / 2, h * 0.42, w * 0.3 + (r() - 0.5) * 14, 0.4 + r() * 0.3, Math.PI * 2 - 0.3 - r() * 0.3);
    g.stroke();
  }
  g.fillStyle = "#a8301f";
  g.fillRect(w * 0.68, h * 0.78, 22, 22);
  g.fillStyle = "#e9dfc6";
  g.fillRect(w * 0.68 + 5, h * 0.78 + 5, 5, 12);
  return c;
}

export function halo(size = 128) {
  const { c, g } = cv(size);
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.25, "rgba(255,255,255,0.5)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return c;
}

// ---- gallery sized versions (large close-ups) ----
export const gallery = {
  hinoki: () => wood(1024, "#e4c896", "#9c7447", 101, false, 0),
  tatami: () => tatami(1024, 103),
  washi: () => washi(1024, 105, 2),
  stone: () => stone(1024, 107, "#8a8880"),
  linen: () => linen(1024, 109, 9),
};
