import type { ReactNode } from "react";

/** Shared gradients, patterns and filters used by every camera drawing. */
export const Defs = () => (
  <defs>
    <linearGradient id="gMetal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#f5f5f3" />
      <stop offset=".35" stopColor="#c9cacc" />
      <stop offset=".55" stopColor="#9a9da1" />
      <stop offset="1" stopColor="#d8d9db" />
    </linearGradient>
    <linearGradient id="gMetalH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#85888c" />
      <stop offset=".22" stopColor="#e9eaec" />
      <stop offset=".5" stopColor="#b1b3b7" />
      <stop offset=".78" stopColor="#eeeeef" />
      <stop offset="1" stopColor="#7d8085" />
    </linearGradient>
    <linearGradient id="gChrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset=".2" stopColor="#d5d8db" />
      <stop offset=".5" stopColor="#767a80" />
      <stop offset=".53" stopColor="#b8bbbf" />
      <stop offset=".82" stopColor="#eef0f2" />
      <stop offset="1" stopColor="#8d9196" />
    </linearGradient>
    <linearGradient id="gDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#4c4d52" />
      <stop offset=".5" stopColor="#242427" />
      <stop offset="1" stopColor="#0e0e10" />
    </linearGradient>
    <linearGradient id="gDarkH" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#0b0b0d" />
      <stop offset=".3" stopColor="#3b3b40" />
      <stop offset=".5" stopColor="#1c1c1f" />
      <stop offset=".8" stopColor="#38383c" />
      <stop offset="1" stopColor="#09090a" />
    </linearGradient>
    <linearGradient id="gBrass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#f4df9f" />
      <stop offset=".5" stopColor="#b48a3c" />
      <stop offset="1" stopColor="#7a5a22" />
    </linearGradient>
    <linearGradient id="gCopper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#f3b184" />
      <stop offset=".55" stopColor="#b5622f" />
      <stop offset="1" stopColor="#7c3d18" />
    </linearGradient>
    <linearGradient id="gWhite" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset=".6" stopColor="#ece7dc" />
      <stop offset="1" stopColor="#c9c2b3" />
    </linearGradient>
    <linearGradient id="gPcb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#23805a" />
      <stop offset="1" stopColor="#135238" />
    </linearGradient>
    <linearGradient id="gPcbDark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#1c2233" />
      <stop offset="1" stopColor="#0c0f18" />
    </linearGradient>
    <linearGradient id="gMirror" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#f4f8fb" />
      <stop offset=".35" stopColor="#9fb4c4" />
      <stop offset=".6" stopColor="#dbe6ee" />
      <stop offset="1" stopColor="#6e8597" />
    </linearGradient>
    <linearGradient id="gSensor" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#6a2aa8" stopOpacity=".75" />
      <stop offset=".5" stopColor="#1f7a8c" stopOpacity=".55" />
      <stop offset="1" stopColor="#b5337f" stopOpacity=".7" />
    </linearGradient>
    <linearGradient id="gFilm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#f7b23b" />
      <stop offset="1" stopColor="#c8741c" />
    </linearGradient>
    <linearGradient id="gGloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff" stopOpacity=".55" />
      <stop offset=".5" stopColor="#fff" stopOpacity=".05" />
      <stop offset="1" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
    <radialGradient id="gGlass" cx=".4" cy=".35" r=".8">
      <stop offset="0" stopColor="#3b6a86" />
      <stop offset=".55" stopColor="#0f1c27" />
      <stop offset="1" stopColor="#04070a" />
    </radialGradient>
    <radialGradient id="gCoatP" cx=".5" cy=".5" r=".5">
      <stop offset=".55" stopColor="#0a0f1a" stopOpacity="0" />
      <stop offset=".85" stopColor="#6b3fd6" stopOpacity=".75" />
      <stop offset="1" stopColor="#0a0a16" stopOpacity=".9" />
    </radialGradient>
    <radialGradient id="gCoatG" cx=".5" cy=".5" r=".5">
      <stop offset=".5" stopColor="#0a0f1a" stopOpacity="0" />
      <stop offset=".85" stopColor="#2fd39a" stopOpacity=".65" />
      <stop offset="1" stopColor="#051a14" stopOpacity=".9" />
    </radialGradient>
    <radialGradient id="gCoatA" cx=".5" cy=".5" r=".5">
      <stop offset=".5" stopColor="#0a0f1a" stopOpacity="0" />
      <stop offset=".85" stopColor="#ffb347" stopOpacity=".6" />
      <stop offset="1" stopColor="#1a0f05" stopOpacity=".9" />
    </radialGradient>
    <radialGradient id="gLed" cx=".5" cy=".5" r=".5">
      <stop offset="0" stopColor="#fff" />
      <stop offset=".4" stopColor="#ff6b57" />
      <stop offset="1" stopColor="#ff6b57" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="gBtnRed" cx=".4" cy=".35" r=".75">
      <stop offset="0" stopColor="#ff8a78" />
      <stop offset=".55" stopColor="#d6281a" />
      <stop offset="1" stopColor="#7d0f08" />
    </radialGradient>

    <pattern id="pLeather" width="7" height="7" patternUnits="userSpaceOnUse">
      <rect width="7" height="7" fill="#151516" />
      <circle cx="1.5" cy="1.5" r="1.1" fill="#2c2c2e" />
      <circle cx="5" cy="5" r="1.1" fill="#242426" />
      <circle cx="5.2" cy="1.2" r=".5" fill="#0a0a0a" />
      <circle cx="1.2" cy="5.3" r=".5" fill="#0a0a0a" />
    </pattern>
    <pattern id="pLeatherB" width="7" height="7" patternUnits="userSpaceOnUse">
      <rect width="7" height="7" fill="#5a3a22" />
      <circle cx="1.5" cy="1.5" r="1.1" fill="#75502f" />
      <circle cx="5" cy="5" r="1.1" fill="#6a4629" />
      <circle cx="5.2" cy="1.2" r=".5" fill="#3a2414" />
    </pattern>
    <pattern id="pGrip" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="#19191b" />
      <rect width="3" height="3" fill="#2a2a2d" />
      <rect x="3" y="3" width="3" height="3" fill="#232326" />
    </pattern>
    <pattern id="pKnurl" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="4" height="4" fill="#9c9ea2" />
      <rect width="2" height="4" fill="#e3e4e6" />
    </pattern>
    <pattern id="pKnurlD" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect width="3" height="3" fill="#111" />
      <rect width="1.4" height="3" fill="#3c3c40" />
    </pattern>
    <pattern id="pSlat" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="#232326" />
      <rect width="4" height="1.6" fill="#47474d" />
    </pattern>
    <pattern id="pMesh" width="5" height="5" patternUnits="userSpaceOnUse">
      <rect width="5" height="5" fill="#d9d4c8" />
      <circle cx="2.5" cy="2.5" r="1.3" fill="#2a2a2a" />
    </pattern>
    <pattern id="pBayer" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="#d8453a" />
      <rect x="4" width="4" height="4" fill="#3faa57" />
      <rect y="4" width="4" height="4" fill="#3faa57" />
      <rect x="4" y="4" width="4" height="4" fill="#3a66d1" />
    </pattern>
    <pattern id="pCarbon" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="#121214" />
      <rect width="3" height="6" fill="#26262a" />
    </pattern>
    <pattern id="pFres" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect width="3" height="3" fill="#f3efe4" />
      <rect width="1.2" height="3" fill="#d8d2c0" />
    </pattern>

    <filter id="ds" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="9" stdDeviation="9" floodColor="#000" floodOpacity=".55" />
    </filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" />
    </filter>
  </defs>
);

export const Screw = ({ x, y, r = 4, a = 25 }: { x: number; y: number; r?: number; a?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="url(#gMetalH)" stroke="#2d2d2f" strokeWidth=".7" />
    <line
      x1={x - r * 0.7}
      y1={y}
      x2={x + r * 0.7}
      y2={y}
      stroke="#2a2a2c"
      strokeWidth={Math.max(0.8, r * 0.28)}
      transform={`rotate(${a} ${x} ${y})`}
    />
  </g>
);

export const Knurl = ({
  cx,
  cy,
  r,
  w = 6,
  dash = "1.6 2.4",
  c = "#000",
  o = 0.6,
}: {
  cx: number;
  cy: number;
  r: number;
  w?: number;
  dash?: string;
  c?: string;
  o?: number;
}) => <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth={w} strokeDasharray={dash} opacity={o} />;

export function gearPath(cx: number, cy: number, r: number, n: number, depth = 0.14) {
  const ri = r * (1 - depth);
  const s = (Math.PI * 2) / n;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * s;
    const k: [number, number][] = [
      [ri, a],
      [r, a + s * 0.14],
      [r, a + s * 0.4],
      [ri, a + s * 0.54],
    ];
    k.forEach(([rad, ang]) => pts.push(`${(cx + Math.cos(ang) * rad).toFixed(2)} ${(cy + Math.sin(ang) * rad).toFixed(2)}`));
  }
  return "M" + pts.join("L") + "Z";
}

export const Gear = ({
  cx,
  cy,
  r,
  n,
  rot = 0,
  fill = "url(#gBrass)",
  stroke = "#3a2c10",
  holes = 5,
}: {
  cx: number;
  cy: number;
  r: number;
  n: number;
  rot?: number;
  fill?: string;
  stroke?: string;
  holes?: number;
}) => (
  <g transform={`rotate(${rot} ${cx} ${cy})`}>
    <path d={gearPath(cx, cy, r, n)} fill={fill} stroke={stroke} strokeWidth=".9" strokeLinejoin="round" />
    <circle cx={cx} cy={cy} r={r * 0.74} fill="none" stroke="rgba(0,0,0,.28)" strokeWidth="1" />
    {Array.from({ length: holes }).map((_, i) => {
      const a = (i / holes) * Math.PI * 2;
      return (
        <circle
          key={i}
          cx={cx + Math.cos(a) * r * 0.5}
          cy={cy + Math.sin(a) * r * 0.5}
          r={r * 0.15}
          fill="#1b1b1c"
          stroke="rgba(255,255,255,.25)"
          strokeWidth=".6"
        />
      );
    })}
    <circle cx={cx} cy={cy} r={r * 0.2} fill="#2b2b2d" stroke="rgba(255,255,255,.35)" strokeWidth=".8" />
    <circle cx={cx} cy={cy} r={r * 0.08} fill="#d0d0d0" />
  </g>
);

/** Iris diaphragm: n blades tangent to an opening of radius `a` inside outer radius R. */
export const Iris = ({ cx, cy, R, a, n = 9, rot = 0 }: { cx: number; cy: number; R: number; a: number; n?: number; rot?: number }) => {
  const blades = Array.from({ length: n }).map((_, i) => {
    const th = (i / n) * Math.PI * 2 + (rot * Math.PI) / 180;
    const nx = Math.cos(th);
    const ny = Math.sin(th);
    const dx = -ny;
    const dy = nx;
    const L = a * Math.tan(Math.PI / n) * 1.9 + 4;
    const tx = cx + nx * a;
    const ty = cy + ny * a;
    const d = R - a - 2;
    const P = [
      [tx - dx * L * 0.55, ty - dy * L * 0.55],
      [tx + dx * L * 1.25, ty + dy * L * 1.25],
      [tx + dx * L * 1.25 + nx * d, ty + dy * L * 1.25 + ny * d],
      [tx - dx * L * 0.55 + nx * d, ty - dy * L * 0.55 + ny * d],
    ];
    return (
      <g key={i}>
        <path d={"M" + P.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z"} fill="#26262a" stroke="#0a0a0a" strokeWidth=".8" />
        <path
          d={`M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}L${P[1][0].toFixed(1)} ${P[1][1].toFixed(1)}`}
          stroke="rgba(255,255,255,.35)"
          strokeWidth=".8"
        />
        <circle cx={cx + nx * (R - 6) + dx * 2} cy={cy + ny * (R - 6) + dy * 2} r="1.8" fill="#9a9a9e" />
      </g>
    );
  });
  return (
    <g>
      <circle cx={cx} cy={cy} r={R} fill="#050505" />
      {blades}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="url(#gMetal)" strokeWidth="5" />
      <circle cx={cx} cy={cy} r={R - 3} fill="none" stroke="rgba(0,0,0,.6)" strokeWidth="1" />
    </g>
  );
};

/** Concentric optical element with multi-coating reflections. */
export const LensGlass = ({ cx, cy, r, rot = 0 }: { cx: number; cy: number; r: number; rot?: number }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="#0c0f14" stroke="#555" strokeWidth="1" />
    <circle cx={cx} cy={cy} r={r * 0.94} fill="url(#gGlass)" />
    <circle cx={cx} cy={cy} r={r * 0.9} fill="url(#gCoatP)" />
    <circle cx={cx} cy={cy} r={r * 0.68} fill="url(#gCoatG)" />
    <circle cx={cx} cy={cy} r={r * 0.46} fill="url(#gCoatA)" />
    <circle cx={cx} cy={cy} r={r * 0.22} fill="url(#gGlass)" stroke="rgba(120,180,220,.4)" strokeWidth=".8" />
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      <path
        d={`M${cx - r * 0.62} ${cy - r * 0.3}A${r * 0.7} ${r * 0.7} 0 0 1 ${cx - r * 0.12} ${cy - r * 0.68}`}
        stroke="#fff"
        strokeOpacity=".5"
        strokeWidth={Math.max(1.5, r * 0.06)}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + r * 0.3} ${cy + r * 0.58}A${r * 0.6} ${r * 0.6} 0 0 0 ${cx + r * 0.58} ${cy + r * 0.26}`}
        stroke="#9fd8ff"
        strokeOpacity=".35"
        strokeWidth={Math.max(1, r * 0.04)}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.34} r={r * 0.07} fill="#fff" opacity=".75" />
    </g>
  </g>
);

export const Coil = ({ x, y, w, h, n = 7, color = "url(#gCopper)" }: { x: number; y: number; w: number; h: number; n?: number; color?: string }) => {
  const pts: string[] = [];
  for (let i = 0; i <= n * 2; i++) pts.push(`${(x + (i / (n * 2)) * w).toFixed(1)} ${(y + (i % 2 ? h : 0)).toFixed(1)}`);
  return <path d={"M" + pts.join("L")} fill="none" stroke={typeof color === "string" && color.startsWith("url") ? "#c9763a" : color} strokeWidth="2.2" strokeLinejoin="round" />;
};

export const Spiral = ({ cx, cy, r, turns = 4, color = "#c9cbd0", sw = 1.6 }: { cx: number; cy: number; r: number; turns?: number; color?: string; sw?: number }) => {
  const pts: string[] = [];
  const steps = turns * 28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    const rad = r * (0.15 + 0.85 * t);
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return <path d={"M" + pts.join("L")} fill="none" stroke={color} strokeWidth={sw} />;
};

export const T = ({
  x,
  y,
  children,
  s = 8,
  fill = "#222",
  anchor = "middle",
  w = 500,
  ls = 0,
  rot,
  f = "JetBrains Mono, monospace",
  o = 1,
}: {
  x: number;
  y: number;
  children: ReactNode;
  s?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  w?: number;
  ls?: number;
  rot?: number;
  f?: string;
  o?: number;
}) => (
  <text
    x={x}
    y={y}
    fontSize={s}
    fill={fill}
    textAnchor={anchor}
    fontWeight={w}
    letterSpacing={ls}
    fontFamily={f}
    opacity={o}
    transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}
  >
    {children}
  </text>
);

/** Lightening-hole / chip helpers */
export const Chip = ({ x, y, w, h, label, fill = "#0d0d10" }: { x: number; y: number; w: number; h: number; label?: string; fill?: string }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="1.5" fill={fill} stroke="#3a3a40" strokeWidth=".6" />
    {Array.from({ length: Math.floor(w / 4) }).map((_, i) => (
      <g key={i}>
        <line x1={x + 3 + i * 4} y1={y - 2} x2={x + 3 + i * 4} y2={y} stroke="#cfcfd2" strokeWidth="1" />
        <line x1={x + 3 + i * 4} y1={y + h} x2={x + 3 + i * 4} y2={y + h + 2} stroke="#cfcfd2" strokeWidth="1" />
      </g>
    ))}
    <circle cx={x + 3} cy={y + 3} r="1" fill="#777" />
    {label && (
      <text x={x + w / 2} y={y + h / 2 + 2} fontSize="5" fill="#9aa" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
        {label}
      </text>
    )}
  </g>
);
