import type { ReactElement } from "react";
import type { Chapter } from "./data";

const W = 1600;
const H = 420;

function mk(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grass(seed: number, n: number, hMin: number, hMax: number) {
  const r = mk(seed);
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const h = hMin + r() * (hMax - hMin);
    const bend = (r() - 0.5) * 90;
    const w = 4 + r() * 9;
    d += `M${(x - w).toFixed(0)} ${H + 4}Q${(x - w * 0.3 + bend * 0.3).toFixed(0)} ${(H - h * 0.55).toFixed(0)} ${(x + bend).toFixed(0)} ${(H - h).toFixed(0)}Q${(x + w * 0.3 + bend * 0.3).toFixed(0)} ${(H - h * 0.5).toFixed(0)} ${(x + w).toFixed(0)} ${H + 4}Z`;
  }
  return d;
}

function star(cx: number, cy: number, s: number, rot: number, lobes = 5) {
  let d = "";
  for (let k = 0; k < lobes * 2; k++) {
    const a = rot + (k * Math.PI) / lobes;
    const rr = k % 2 === 0 ? s : s * 0.42;
    d += `${k === 0 ? "M" : "L"}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  return d + "Z";
}

function bez(p: number[], t: number): [number, number] {
  const u = 1 - t;
  return [
    u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6],
    u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7],
  ];
}

function Branch({ seed, p, leaf, colors }: { seed: number; p: number[]; leaf: "maple" | "sakura"; colors: string[] }) {
  const r = mk(seed);
  const leaves: { d: string; c: string }[] = [];
  for (let i = 0; i < 46; i++) {
    const t = 0.25 + r() * 0.75;
    const [x, y] = bez(p, t);
    const ox = (r() - 0.5) * 90,
      oy = (r() - 0.3) * 80;
    const s = 26 + r() * 26;
    leaves.push({
      d: leaf === "maple" ? star(x + ox, y + oy, s, r() * 6.28) : star(x + ox, y + oy, s * 0.5, r() * 6.28, 5),
      c: colors[Math.floor(r() * colors.length)],
    });
  }
  return (
    <g>
      <path d={`M${p[0]} ${p[1]}C${p[2]} ${p[3]} ${p[4]} ${p[5]} ${p[6]} ${p[7]}`} stroke="#0a0706" strokeWidth="14" strokeLinecap="round" fill="none" />
      {leaves.map((l, i) => (
        <path key={i} d={l.d} fill={l.c} />
      ))}
    </g>
  );
}

function Bamboo({ seed }: { seed: number }) {
  const r = mk(seed);
  const stalks: ReactElement[] = [];
  for (let i = 0; i < 14; i++) {
    const x = r() * W;
    const w = 12 + r() * 16;
    const lean = (r() - 0.5) * 40;
    stalks.push(
      <g key={i}>
        <path d={`M${x} ${H + 10}L${x + lean} -20`} stroke={i % 3 === 0 ? "#0b1a14" : "#050c0a"} strokeWidth={w} />
        {Array.from({ length: 6 }).map((_, k) => (
          <path key={k} d={`M${x + lean * (k / 6) - w / 2 - 2} ${H - k * 70 - 20}h${w + 4}`} stroke="#10261d" strokeWidth="3" />
        ))}
        {Array.from({ length: 5 }).map((_, k) => {
          const yy = 40 + k * 60 + r() * 30;
          const xx = x + lean * (1 - yy / H) + (r() - 0.5) * 10;
          const dir = r() < 0.5 ? -1 : 1;
          return <path key={"l" + k} d={`M${xx} ${yy}Q${xx + dir * 60} ${yy - 14} ${xx + dir * 120} ${yy + 34}Q${xx + dir * 60} ${yy + 6} ${xx} ${yy}Z`} fill="#050c0a" />;
        })}
      </g>
    );
  }
  return <g>{stalks}</g>;
}

function Palm({ x, y, seed, scale = 1 }: { x: number; y: number; seed: number; scale?: number }) {
  const r = mk(seed);
  const fr: ReactElement[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * 0.95 + (i / (n - 1)) * Math.PI * 0.9 + (r() - 0.5) * 0.2;
    const L = (320 + r() * 160) * scale;
    const ex = x + Math.cos(a) * L,
      ey = y + Math.sin(a) * L * 0.75 + L * 0.35;
    const cx = x + Math.cos(a) * L * 0.55,
      cy = y + Math.sin(a) * L * 0.9 - 40 * scale;
    const nx = -Math.sin(a) * 26 * scale,
      ny = Math.cos(a) * 26 * scale;
    fr.push(<path key={i} d={`M${x} ${y}Q${cx + nx} ${cy + ny} ${ex} ${ey}Q${cx - nx} ${cy - ny} ${x} ${y}Z`} fill="#050b07" />);
  }
  return <g>{fr}</g>;
}

function Rocks({ seed }: { seed: number }) {
  const r = mk(seed);
  let d = "";
  for (let i = 0; i < 9; i++) {
    const cx = r() * W,
      w = 90 + r() * 200,
      h = 60 + r() * 110;
    d += `M${cx - w} ${H + 4}L${cx - w * 0.7} ${H - h * 0.5}L${cx - w * 0.2} ${H - h}L${cx + w * 0.3} ${H - h * 0.8}L${cx + w * 0.75} ${H - h * 0.35}L${cx + w} ${H + 4}Z`;
  }
  return <path d={d} fill="#07070b" />;
}

function FlagLine({ seed }: { seed: number }) {
  const r = mk(seed);
  const cols = ["#2b6cc4", "#e9e9e9", "#c0392b", "#2e9b5a", "#e8b923"];
  const flags: ReactElement[] = [];
  const n = 34;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = -20 + t * (W + 40);
    const y = 70 + Math.sin(t * Math.PI) * 60 - (1 - t) * 28;
    const sk = Math.sin(t * 18 + r()) * 6;
    flags.push(
      <path key={i} d={`M${x - 20} ${y}L${x + 20} ${y + 2}L${x + 20 + sk} ${y + 46}L${x - 20 + sk} ${y + 44}Z`} fill={cols[i % 5]} opacity="0.78" />
    );
  }
  return (
    <g>
      <path d={`M-20 42Q${W / 2} 190 ${W + 20} 28`} stroke="#0a0a0f" strokeWidth="3" fill="none" />
      {flags}
    </g>
  );
}

function Pine() {
  return (
    <g fill="#040806">
      <path d="M1290 430C1300 330 1270 250 1300 160C1310 120 1330 100 1340 70L1362 74C1352 110 1350 150 1340 190C1324 260 1350 340 1346 430Z" />
      <ellipse cx="1350" cy="60" rx="250" ry="52" />
      <ellipse cx="1250" cy="90" rx="160" ry="36" />
      <ellipse cx="1470" cy="95" rx="150" ry="32" />
      <path d="M150 430C140 330 160 220 190 120C200 80 210 40 214 -10C218 40 226 80 234 120C250 220 262 330 250 430Z" />
      <path d="M330 430C324 350 336 260 358 180C368 140 376 100 380 50C384 100 392 140 400 180C418 260 424 350 418 430Z" />
    </g>
  );
}

function Dunes() {
  const d1 = `M0 ${H}L0 300Q200 240 420 290T820 280T1220 300T${W} 270L${W} ${H}Z`;
  const d2 = `M0 ${H}L0 350Q260 310 520 350T1040 340T${W} 330L${W} ${H}Z`;
  return (
    <g>
      <path d={d1} fill="#0a0907" />
      <path d={d2} fill="#050504" />
      <Palm x={220} y={H - 40} seed={3} scale={0.55} />
      <Palm x={1380} y={H - 30} seed={8} scale={0.7} />
    </g>
  );
}

export default function Foreground({ kind }: { kind: Chapter["fg"] }) {
  const gr = (seed: number, n: number, a: number, b: number, fill = "#040605") => <path d={grass(seed, n, a, b)} fill={fill} />;
  let content: ReactElement;
  switch (kind) {
    case "maple":
      content = (
        <>
          <Branch seed={4} p={[-40, 200, 260, 330, 520, 120, 900, 40]} leaf="maple" colors={["#3a0e08", "#22090a", "#4a1408", "#170606"]} />
          <Branch seed={9} p={[W + 40, 260, 1300, 320, 1150, 160, 960, 110]} leaf="maple" colors={["#2a0a08", "#3e1008", "#1a0706"]} />
          {gr(2, 120, 60, 180, "#050706")}
        </>
      );
      break;
    case "marigold": {
      const r = mk(12);
      content = (
        <>
          {gr(5, 90, 50, 150, "#060504")}
          {Array.from({ length: 70 }).map((_, i) => {
            const x = r() * W;
            const y = H - 10 - r() * 90;
            const rr = 10 + r() * 14;
            return <circle key={i} cx={x} cy={y} r={rr} fill={["#8a3d05", "#a65208", "#6e2d04", "#c26a0a"][i % 4]} />;
          })}
          <Palm x={90} y={H - 10} seed={5} scale={0.85} />
        </>
      );
      break;
    }
    case "bamboo":
      content = (
        <>
          <Bamboo seed={6} />
          {gr(8, 70, 40, 120, "#040a08")}
        </>
      );
      break;
    case "tibet":
      content = (
        <>
          <FlagLine seed={3} />
          <Rocks seed={7} />
          {gr(9, 80, 40, 120, "#05050a")}
        </>
      );
      break;
    case "palm":
      content = (
        <>
          <Palm x={1420} y={H + 10} seed={2} scale={1.05} />
          <Palm x={140} y={H + 30} seed={7} scale={0.85} />
          {gr(4, 90, 40, 130, "#040805")}
        </>
      );
      break;
    case "pine":
      content = (
        <>
          <Pine />
          {gr(1, 70, 30, 90, "#050706")}
        </>
      );
      break;
    default:
      content = <Dunes />;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="h-full w-full" aria-hidden="true">
      {content}
    </svg>
  );
}
