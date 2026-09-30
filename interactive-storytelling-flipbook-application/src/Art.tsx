import { memo } from 'react';
import { GLYPHS, SCENES } from './motifs';

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const f = (n: number) => Math.round(n * 10) / 10;

function blobPath(cx: number, cy: number, rx: number, ry: number, rand: () => number, n = 9) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.78 + rand() * 0.4;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

type GlyphProps = {
  name: string;
  x: number;
  y: number;
  size: number;
  rot?: number;
  ink: string;
  tint?: string;
  seed?: number;
  px?: number;
};

export function GlyphG({ name, x, y, size, rot = 0, ink, tint, seed = 1, px = 2 }: GlyphProps) {
  const g = GLYPHS[name];
  if (!g) return null;
  const k = size / 100;
  const sw = px / k;
  const reps = g.r || 1;
  const rand = mulberry(seed);
  const paths = (w: number) => (
    <>
      {Array.from({ length: reps }, (_, i) => (
        <path
          key={i}
          d={g.s}
          strokeWidth={w}
          transform={reps > 1 ? `rotate(${(i * 360) / reps} 50 50)` : undefined}
        />
      ))}
      {g.c && <path d={g.c} strokeWidth={w} />}
    </>
  );
  return (
    <g transform={`translate(${f(x - size / 2)} ${f(y - size / 2)}) scale(${f(k * 1000) / 1000}) rotate(${rot} 50 50)`}>
      {tint && (
        <>
          <path d={blobPath(55, 56, 38, 36, rand, 7)} fill={tint} opacity={0.5} />
          <path d={blobPath(52, 52, 27, 26, rand, 7)} fill={tint} opacity={0.3} />
        </>
      )}
      <g fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
        <g opacity={0.3} transform="translate(1.3 1.1)">
          {paths(sw * 0.7)}
        </g>
        <g>{paths(sw)}</g>
      </g>
    </g>
  );
}

export function GlyphSvg({ name, color, size, px = 1.6 }: { name: string; color: string; size: number; px?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', overflow: 'visible' }}>
      <GlyphG name={name} x={50} y={50} size={100} ink={color} px={px * (100 / size)} />
    </svg>
  );
}

type ArtProps = { tokens: string; seed: number; pal: string[]; ink: string; slice?: boolean };

export const Art = memo(function Art({ tokens, seed, pal, ink, slice }: ArtProps) {
  const rand = mulberry(seed);
  const toks = tokens.split(/\s+/).filter(Boolean);
  const has = (t: string) => toks.includes(t);
  const glyphs = toks.filter((t) => GLYPHS[t] && !SCENES.has(t));
  if (!glyphs.length) glyphs.push('sunburst');
  const pick = () => pal[Math.floor(rand() * pal.length)];

  // Watercolour washes
  const c1 = pick();
  let c2 = pick();
  if (c2 === c1) c2 = pal[(pal.indexOf(c1) + 1) % pal.length];
  const cx1 = 195 + (rand() - 0.5) * 50;
  const cy1 = 118 + (rand() - 0.5) * 24;
  const b1 = blobPath(cx1, cy1, 172, 108, rand, 10);
  const cx2 = rand() > 0.5 ? 120 + rand() * 30 : 260 + rand() * 30;
  const cy2 = 140 + rand() * 40;
  const b2 = blobPath(cx2, cy2, 100, 70, rand, 8);
  const layers = [1, 0.86, 0.68];

  // Scene helpers
  const skyY = 54;
  const sunX = 290 + rand() * 60;
  const moonX = 50 + rand() * 60;

  const stars = Array.from({ length: 12 }, () => [10 + rand() * 380, 8 + rand() * 96, 1.6 + rand() * 2.6]);
  const clouds = [0, 1].map(() => [30 + rand() * 300, 24 + rand() * 50, 0.7 + rand() * 0.6]);

  const mtnPts: [number, number][] = [[0, 160 + rand() * 30]];
  let mx = 0;
  while (mx < 400) {
    mx += 40 + rand() * 40;
    mtnPts.push([Math.min(mx, 400), 100 + rand() * 80]);
  }
  const mtnPath = 'M0 250L' + mtnPts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'L400 250Z';
  const mtnPath2 =
    'M0 250L' +
    mtnPts.map((p, i) => `${f(p[0] - 30 + (i % 2) * 20)} ${f(p[1] + 30 + rand() * 12)}`).join('L') +
    'L400 250Z';

  const h1 = 170 + rand() * 25;
  const h2 = 195 + rand() * 18;
  const hillsA = `M0 ${f(h1)}Q${f(80 + rand() * 60)} ${f(h1 - 40 - rand() * 20)} ${f(180 + rand() * 40)} ${f(h1 - 4)}T400 ${f(h1 - 10)}V250H0Z`;
  const hillsB = `M0 ${f(h2)}Q${f(120 + rand() * 60)} ${f(h2 - 28)} ${f(220 + rand() * 40)} ${f(h2 + 2)}T400 ${f(h2 - 6)}V250H0Z`;

  const trees = Array.from({ length: 11 }, (_, i) => [10 + i * 36 + rand() * 16, 214 + rand() * 18, 0.7 + rand() * 0.7]);

  const waveY = [208, 220, 232, 243];
  const wave = (y: number, amp: number) => `M-10 ${y}` + Array.from({ length: 9 }, () => `q25 ${-amp} 50 0`).join('');

  const hatch = Array.from({ length: 16 }, () => {
    const x = rand() * 400;
    const y = 214 + rand() * 32;
    return `M${f(x)} ${f(y)}l${f(6 + rand() * 10)} ${f(rand() * 3)}`;
  }).join('');

  const smoke = Array.from({ length: 6 }, (_, i) => [120 + i * 18 + rand() * 20, 190 - i * 28 + rand() * 8, 12 + i * 6]);

  const hero = glyphs[0];
  const heroX = 200 + (rand() - 0.5) * 16;
  const heroY = 118;
  const heroRot = (rand() - 0.5) * 6;
  const c3 = pick();

  return (
    <svg
      viewBox="0 0 400 250"
      width="100%"
      height="100%"
      preserveAspectRatio={slice ? 'xMidYMid slice' : 'xMidYMid meet'}
      style={{ display: 'block' }}
    >
      {/* washes */}
      <g>
        {layers.map((s, i) => (
          <path
            key={'a' + i}
            d={b1}
            fill={c1}
            opacity={0.17 + i * 0.05}
            stroke={i === 0 ? c1 : 'none'}
            strokeWidth={1.2}
            strokeOpacity={0.45}
            transform={`translate(${cx1} ${cy1}) scale(${s}) translate(${-cx1} ${-cy1})`}
          />
        ))}
        {layers.map((s, i) => (
          <path
            key={'b' + i}
            d={b2}
            fill={c2}
            opacity={0.18 + i * 0.06}
            stroke={i === 0 ? c2 : 'none'}
            strokeWidth={1}
            strokeOpacity={0.4}
            transform={`translate(${cx2} ${cy2}) scale(${s}) translate(${-cx2} ${-cy2})`}
          />
        ))}
      </g>

      {has('glow') && (
        <g>
          <ellipse cx={heroX} cy={heroY} rx={112} ry={90} fill="#ffd574" opacity={0.3} />
          <ellipse cx={heroX} cy={heroY} rx={78} ry={64} fill="#ffe7a0" opacity={0.35} />
        </g>
      )}

      {has('rays') && (
        <g stroke={ink} strokeWidth={1.1} opacity={0.32} strokeLinecap="round">
          {Array.from({ length: 22 }, (_, i) => {
            const a = (i / 22) * Math.PI * 2 + 0.1;
            return (
              <line
                key={i}
                x1={f(heroX + Math.cos(a) * 92)}
                y1={f(heroY + Math.sin(a) * 76)}
                x2={f(heroX + Math.cos(a) * (130 + (i % 3) * 30))}
                y2={f(heroY + Math.sin(a) * (104 + (i % 3) * 24))}
              />
            );
          })}
        </g>
      )}

      {has('stars') && (
        <g stroke={ink} strokeWidth={1.1} strokeLinecap="round" opacity={0.7}>
          {stars.map(([x, y, r], i) => (
            <path key={i} d={`M${f(x - r)} ${f(y)}H${f(x + r)}M${f(x)} ${f(y - r)}V${f(y + r)}`} />
          ))}
        </g>
      )}

      {has('sun') && (
        <g>
          <circle cx={sunX} cy={skyY} r={24} fill="#f2b53f" opacity={0.85} />
          <circle cx={sunX} cy={skyY} r={24} fill="none" stroke={ink} strokeWidth={1.3} opacity={0.75} />
          <g stroke={ink} strokeWidth={1.2} strokeLinecap="round" opacity={0.65}>
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={f(sunX + Math.cos(a) * 30)}
                  y1={f(skyY + Math.sin(a) * 30)}
                  x2={f(sunX + Math.cos(a) * 40)}
                  y2={f(skyY + Math.sin(a) * 40)}
                />
              );
            })}
          </g>
        </g>
      )}

      {has('moon') && (
        <g>
          <circle cx={moonX} cy={skyY - 4} r={22} fill="#f7efcf" opacity={0.95} />
          <circle cx={moonX} cy={skyY - 4} r={22} fill="none" stroke={ink} strokeWidth={1.3} opacity={0.7} />
          <circle cx={moonX - 7} cy={skyY - 10} r={4} fill="none" stroke={ink} strokeWidth={1} opacity={0.4} />
          <circle cx={moonX + 8} cy={skyY + 2} r={3} fill="none" stroke={ink} strokeWidth={1} opacity={0.4} />
        </g>
      )}

      {has('clouds') &&
        clouds.map(([x, y, s], i) => (
          <path
            key={i}
            d="M0 16C-14 16-14 0 0 0 4-12 24-12 28-2 42-4 46 16 30 16Z"
            transform={`translate(${f(x)} ${f(y)}) scale(${f(s * 1.5)})`}
            fill="#fffaf0"
            opacity={0.85}
            stroke={ink}
            strokeWidth={0.9}
            strokeOpacity={0.6}
          />
        ))}

      {has('mountains') && (
        <g>
          <path d={mtnPath2} fill={pal[(pal.indexOf(c1) + 2) % pal.length]} opacity={0.42} stroke={ink} strokeWidth={1} strokeOpacity={0.5} strokeLinejoin="round" />
          <path d={mtnPath} fill={pal[(pal.indexOf(c1) + 1) % pal.length]} opacity={0.5} stroke={ink} strokeWidth={1.3} strokeOpacity={0.7} strokeLinejoin="round" />
        </g>
      )}

      {has('hills') && (
        <g>
          <path d={hillsA} fill={c2} opacity={0.42} stroke={ink} strokeWidth={1.2} strokeOpacity={0.6} />
          <path d={hillsB} fill={c3} opacity={0.5} stroke={ink} strokeWidth={1.2} strokeOpacity={0.6} />
        </g>
      )}

      {has('forest') && (
        <g stroke={ink} strokeWidth={1.1} strokeOpacity={0.75} strokeLinejoin="round">
          {trees.map(([x, y, s], i) => (
            <g key={i} transform={`translate(${f(x)} ${f(y)}) scale(${f(s)})`}>
              <path d="M0 0l-9 -24h18zM0 -14l-8 -18h16zM0 -26l-6 -14h12z" fill={pal[i % pal.length]} fillOpacity={0.6} />
              <path d="M0 0v8" />
            </g>
          ))}
        </g>
      )}

      {has('waves') && (
        <g fill="none" strokeLinecap="round">
          {waveY.map((y, i) => (
            <path key={i} d={wave(y, 7 + (i % 2) * 3)} stroke={i % 2 ? ink : pal[i % pal.length]} strokeWidth={i % 2 ? 1.1 : 2.4} opacity={i % 2 ? 0.55 : 0.6} />
          ))}
        </g>
      )}

      {has('ground') && (
        <g fill="none" stroke={ink} strokeLinecap="round">
          <path d="M0 212C90 206 170 216 260 210S360 208 400 212" strokeWidth={1.4} opacity={0.7} />
          <path d={hatch} strokeWidth={1} opacity={0.5} />
          <path d="M0 212C90 206 170 216 260 210S360 208 400 212V250H0Z" fill={c2} opacity={0.22} stroke="none" />
        </g>
      )}

      {/* hero shadow */}
      <ellipse cx={heroX + 4} cy={heroY + 82} rx={64} ry={7} fill={ink} opacity={0.1} />

      <GlyphG name={hero} x={heroX} y={heroY} size={158} rot={heroRot} ink={ink} tint={c3} seed={seed + 11} px={2.1} />
      {glyphs[1] && (
        <GlyphG name={glyphs[1]} x={330} y={160} size={82} rot={(rand() - 0.5) * 14} ink={ink} tint={pick()} seed={seed + 23} px={1.7} />
      )}
      {glyphs[2] && (
        <GlyphG name={glyphs[2]} x={72} y={164} size={74} rot={(rand() - 0.5) * 14} ink={ink} tint={pick()} seed={seed + 37} px={1.7} />
      )}

      {has('smoke') && (
        <g fill="#6b645c" stroke={ink} strokeWidth={0.9} strokeOpacity={0.4}>
          {smoke.map(([x, y, r], i) => (
            <circle key={i} cx={f(x)} cy={f(y)} r={f(r)} opacity={0.12 + (i % 3) * 0.04} />
          ))}
        </g>
      )}
    </svg>
  );
});
