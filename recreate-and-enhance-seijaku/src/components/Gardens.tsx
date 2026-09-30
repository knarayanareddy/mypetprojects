import { useState } from "react";
import { SEASONS, HOURS, type Season, type Hour } from "../scene/layout";
import { useApp } from "../ctx";
import { Reveal } from "./Reveal";

const PAL: Record<Season, { sky: [string, string]; hill: [string, string]; leaf: string; leaf2: string; ground: string; water: string; trunk: string }> = {
  spring: { sky: ["#9cc6e4", "#f6e6e4"], hill: ["#bdd2a0", "#94b47c"], leaf: "#f4b3c6", leaf2: "#9cc75a", ground: "#d9d6b8", water: "#9fc4cc", trunk: "#5a4232" },
  summer: { sky: ["#5fa6de", "#e2f0f3"], hill: ["#82b86c", "#529c50"], leaf: "#3f8035", leaf2: "#4c8c3a", ground: "#cfd2a8", water: "#7fb5bb", trunk: "#4e3a2b" },
  autumn: { sky: ["#8fb0cc", "#f6dcbd"], hill: ["#d3a56b", "#a9743f"], leaf: "#d2341c", leaf2: "#e2902e", ground: "#dacdb0", water: "#a0b8b8", trunk: "#4e3a2b" },
  winter: { sky: ["#b3c3d4", "#eef2f6"], hill: ["#e0e7ef", "#c4cfdb"], leaf: "#f4f6fa", leaf2: "#9a8a78", ground: "#eef1f5", water: "#c7d6e0", trunk: "#5a4d44" },
};

const OVERLAY: Record<Hour, [string, number]> = {
  dawn: ["#f2a6a0", 0.2],
  noon: ["#ffffff", 0],
  dusk: ["#e5683f", 0.26],
  night: ["#0b1230", 0.62],
};

function Art({ kind, season, hour, hovered }: { kind: "front" | "court" | "back"; season: Season; hour: Hour; hovered: boolean }) {
  const p = PAL[season];
  const [ov, oa] = OVERLAY[hour];
  const id = `${kind}-${season}`;
  const winter = season === "winter";
  const Tree = ({ x, y, s, c = p.leaf }: { x: number; y: number; s: number; c?: string }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-4 0 L-2 -38 L2 -38 L4 0 Z" fill={p.trunk} />
      <path d="M0 -30 L-16 -52 M0 -34 L14 -56" stroke={p.trunk} strokeWidth="3" fill="none" />
      {!winter && (
        <>
          <circle cx="-16" cy="-56" r="15" fill={c} />
          <circle cx="14" cy="-60" r="16" fill={c} opacity=".95" />
          <circle cx="0" cy="-68" r="17" fill={c} />
          <circle cx="-4" cy="-48" r="12" fill={p.leaf2} opacity=".7" />
        </>
      )}
    </g>
  );
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#sky-${id})`} />
      <circle cx={hour === "night" ? 310 : 300} cy={hour === "night" ? 60 : hour === "dusk" ? 130 : 70} r={hour === "night" ? 18 : 24} fill={hour === "night" ? "#f3f0dd" : "#fff6e2"} opacity={hour === "night" ? 0.95 : 0.85} />
      <path d="M0 170 Q70 110 150 150 T300 140 T400 160 V300 H0Z" fill={p.hill[0]} />
      <path d="M0 195 Q90 150 190 180 T400 175 V300 H0Z" fill={p.hill[1]} />
      <rect y="210" width="400" height="90" fill={p.ground} />

      {kind === "front" && (
        <g>
          <g transform="translate(200 158)">
            <rect x="-42" y="-8" width="6" height="56" fill={p.trunk} />
            <rect x="36" y="-8" width="6" height="56" fill={p.trunk} />
            <rect x="-48" y="-14" width="96" height="6" fill={p.trunk} />
            <path d="M-58 -14 L0 -36 L58 -14 Z" fill="#3c444d" />
            <path d="M-58 -14 L58 -14" stroke={winter ? "#fff" : "#2a3037"} strokeWidth={winter ? 4 : 1} />
          </g>
          <path d="M-20 240 L150 215 L250 215 L420 240Z" fill={p.ground} opacity=".0" />
          {[[200, 222, 11], [196, 236, 15], [206, 252, 19], [198, 270, 24]].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.36} fill="#8a877f" />
          ))}
          <Tree x={70} y={235} s={1.1} />
          <Tree x={330} y={232} s={1.0} c={p.leaf2} />
          <g transform="translate(120 220)">
            <ellipse cx="0" cy="-20" rx="26" ry="9" fill="#2e4a33" />
            <ellipse cx="18" cy="-32" rx="20" ry="7" fill="#2e4a33" />
            <rect x="-1.5" y="-20" width="3" height="20" fill={p.trunk} />
            {winter && <ellipse cx="0" cy="-26" rx="22" ry="4" fill="#fff" />}
          </g>
        </g>
      )}

      {kind === "court" && (
        <g>
          <rect x="60" y="100" width="280" height="6" fill="#2a2a27" opacity=".7" />
          <rect x="60" y="106" width="280" height="110" fill="#e9e3d2" opacity=".55" />
          <rect x="50" y="216" width="300" height="70" fill={winter ? "#f4f6fa" : "#d9d4c3"} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <ellipse key={i} cx={235} cy={252} rx={14 + i * 9} ry={4 + i * 2.2} fill="none" stroke={winter ? "#c9d3de" : "#b9b3a2"} strokeWidth="1" opacity=".9" />
          ))}
          <ellipse cx="235" cy="252" rx="7" ry="3" fill="#7d7a73" />
          <Tree x={115} y={236} s={1.5} c={p.leaf} />
          <g transform="translate(300 245)">
            <ellipse cx="0" cy="0" rx="14" ry="6" fill="#8a877f" />
            <rect x="-16" y="-7" width="32" height="7" fill="#9c9990" />
            <ellipse cx="0" cy="-7" rx="14" ry="4" fill="#2b3a3d" />
            <rect x="-2" y="-34" width="3" height="28" fill="#b9b36a" transform="rotate(25)" />
          </g>
        </g>
      )}

      {kind === "back" && (
        <g>
          <ellipse cx="200" cy="248" rx="170" ry="42" fill={p.water} />
          <ellipse cx="200" cy="248" rx="170" ry="42" fill="none" stroke="#6f6c65" strokeWidth="5" strokeDasharray="14 6" opacity=".6" />
          <ellipse cx="170" cy="242" rx="60" ry="10" fill="#fff" opacity=".18" />
          <g style={{ transformOrigin: "200px 248px", animation: hovered ? "koi 6s linear infinite" : "koi 18s linear infinite" }}>
            <g transform="translate(270 248)">
              <ellipse rx="13" ry="4.5" fill="#e8521c" />
              <ellipse cx="-2" cy="-1" rx="5" ry="2.4" fill="#fff" />
              <path d="M-11 0 L-20 -4 L-20 4Z" fill="#e8521c" />
            </g>
          </g>
          <g style={{ transformOrigin: "200px 250px", animation: hovered ? "koi 8s linear infinite reverse" : "koi 26s linear infinite reverse" }}>
            <g transform="translate(140 252)">
              <ellipse rx="12" ry="4" fill="#f2f0e8" />
              <ellipse cx="3" cy="0" rx="4" ry="2.3" fill="#e8521c" />
              <path d="M-10 0 L-18 -4 L-18 4Z" fill="#f2f0e8" />
            </g>
          </g>
          {[[52, 240, 13], [340, 232, 15], [90, 268, 10], [300, 276, 12]].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.6} fill="#7d7a73" />
          ))}
          <Tree x={60} y={225} s={1.3} c={p.leaf} />
          <Tree x={345} y={222} s={1.1} c={p.leaf2} />
        </g>
      )}

      <rect width="400" height="300" fill={ov} opacity={oa} />
      <style>{`@keyframes koi{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </svg>
  );
}

const GARDENS = [
  {
    kind: "front" as const,
    jp: "前庭",
    name: "Front garden",
    kf: 2,
    body: "Gravel combed into lines, a path of stepping stones and pines clipped into clouds. The first thing you feel is how far the street has gone.",
    plants: ["Black pine", "Japanese maple", "Moss", "Stone lanterns"],
  },
  {
    kind: "court" as const,
    jp: "中庭",
    name: "Courtyard",
    kf: 7,
    body: "Open to the sky and enclosed on four sides. A single maple, concentric rakings around one stone, and a bamboo spout filling a basin.",
    plants: ["Acer palmatum", "Raked gravel", "Tsukubai basin", "Bamboo fence"],
  },
  {
    kind: "back" as const,
    jp: "裏庭",
    name: "Back garden & pond",
    kf: 13,
    body: "The house ends at a veranda and the land falls away to a pond of koi. Touch the water in the walk — they come to feed.",
    plants: ["Yoshino cherry", "Koi × 7", "Lily pads", "River stones"],
  },
];

export function Gardens() {
  const { season, setSeason, hour, setHour, jumpKf } = useApp();
  const [hover, setHover] = useState<string | null>(null);

  return (
    <section id="gardens" className="relative bg-washi px-6 py-28 text-sumi sm:px-10 md:py-40">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
          <div>
            <Reveal>
              <p className="eyebrow mb-8 flex items-center gap-4 text-sumi/60">
                <span>05</span>
                <span className="h-px w-10 bg-sumi/30" />
                Gardens
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="max-w-[14ch] font-serif text-[clamp(44px,7vw,100px)] leading-[0.95] tracking-[-0.025em]">
                Three gardens, four <em className="text-shu">seasons.</em>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={120} className="w-full max-w-[420px]">
            <p className="eyebrow mb-3 text-[10px] text-sumi/50">Season &amp; hour — changes the walk too</p>
            <div className="grid grid-cols-4 gap-2">
              {SEASONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSeason(s.id)}
                  aria-pressed={season === s.id}
                  className={`flex flex-col items-center rounded-2xl border py-3 transition ${season === s.id ? "border-sumi bg-sumi text-washi" : "border-sumi/20 hover:border-sumi/60"}`}
                >
                  <span className="font-jp text-2xl leading-none">{s.jp}</span>
                  <span className="eyebrow mt-1.5 text-[9px] opacity-70">{s.en}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {HOURS.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setHour(h.id)}
                  aria-pressed={hour === h.id}
                  className={`eyebrow rounded-xl border py-2.5 text-[9.5px] transition ${hour === h.id ? "border-shu bg-shu text-white" : "border-sumi/20 hover:border-sumi/60"}`}
                >
                  {h.en}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {GARDENS.map((g, i) => (
            <Reveal key={g.kind} delay={i * 110}>
              <article
                onMouseEnter={() => setHover(g.kind)}
                onMouseLeave={() => setHover(null)}
                className="group overflow-hidden rounded-[22px] border border-sumi/10 bg-white/40 transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-30px_rgba(26,25,22,.45)]"
              >
                <div className="relative aspect-[4/3.1] overflow-hidden">
                  <div className="h-full w-full transition-transform duration-[1200ms] group-hover:scale-[1.06]">
                    <Art kind={g.kind} season={season} hour={hour} hovered={hover === g.kind} />
                  </div>
                  <span className="font-jp absolute left-4 top-3 text-[22px] text-white mix-blend-difference">{g.jp}</span>
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-[30px] leading-none">{g.name}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-sumi/70">{g.body}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {g.plants.map((pl) => (
                      <li key={pl} className="rounded-full border border-sumi/15 px-2.5 py-1 text-[11px] text-sumi/70">
                        {pl}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => jumpKf(g.kf)} className="eyebrow mt-6 flex items-center gap-2 text-[10.5px] text-shu transition group-hover:gap-3">
                    Walk here
                    <svg width="18" height="8" viewBox="0 0 18 8" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M0 4h17M13 1l4 3-4 3" />
                    </svg>
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
