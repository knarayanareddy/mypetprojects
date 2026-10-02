"use client";

import { forward, type Geometry, type Pose } from "@/lib/kinematics";
import { BIN, BIN_B, type SimWorld } from "@/lib/sim";

interface Props {
  pose: Pose | null;
  geometry: Geometry;
  gripperPct?: number;
  world?: SimWorld | null;
  trail?: [number, number, number][];
  ghost?: Pose | null;
  accent?: string;
}

const REST: Pose = { pan: 0, lift: 0, elbow: 90, wrist: 0 };

export function ArmView({ pose, geometry, gripperPct = 50, world, trail = [], ghost, accent = "#22d3ee" }: Props) {
  const p = pose ?? REST;
  const fk = forward(geometry, p);
  const gk = ghost ? forward(geometry, ghost) : null;

  // side view: x forward (right), z up
  const sx = (x: number) => 20 + x * 9;
  const sz = (z: number) => 330 - z * 9;
  const r = (v: [number, number, number]) => Math.hypot(v[0], v[1]) * (Math.cos((p.pan * Math.PI) / 180) >= 0 ? 1 : -1);
  const chain = [fk.shoulder, fk.elbow, fk.wrist, fk.tip];

  // top view: x up, y left
  const tx = (y: number) => 200 - y * 9;
  const ty = (x: number) => 330 - x * 9;

  const open = Math.min(100, Math.max(0, gripperPct));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <svg viewBox="0 0 400 350" className="w-full rounded-lg border border-slate-700 bg-slate-950">
        <text x="8" y="16" fontSize="11" fill="#64748b">SIDE (x→, z↑ cm)</text>
        {[0, 10, 20, 30].map((c) => (
          <g key={c}>
            <line x1={sx(c)} y1={sz(0)} x2={sx(c)} y2={sz(0) + 5} stroke="#475569" />
            <text x={sx(c) - 6} y={sz(0) + 16} fontSize="9" fill="#64748b">{c}</text>
          </g>
        ))}
        <line x1="0" y1={sz(0)} x2="400" y2={sz(0)} stroke="#475569" strokeWidth="2" />
        <rect x={sx(-4)} y={sz(5)} width={9 * 8} height={9 * 5} fill="#1e293b" stroke="#334155" />
        {gk && <polyline fill="none" stroke="#a78bfa" strokeDasharray="4 3" strokeWidth="3" points={[gk.shoulder, gk.elbow, gk.wrist, gk.tip].map((v) => `${sx(Math.hypot(v[0], v[1]))},${sz(v[2])}`).join(" ")} />}
        <polyline fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" points={chain.map((v) => `${sx(r(v))},${sz(v[2])}`).join(" ")} />
        {chain.map((v, i) => (
          <circle key={i} cx={sx(r(v))} cy={sz(v[2])} r={i === 3 ? 4 : 6} fill={i === 3 ? "#f43f5e" : "#0f172a"} stroke="#e2e8f0" strokeWidth="2" />
        ))}
        {world?.objects.map((o) => (
          <rect key={o.id} x={sx(o.x) - (o.w * 9) / 2} y={sz(o.z + o.h)} width={o.w * 9} height={o.h * 9} fill={`rgb(${o.rgb.join(",")})`} stroke="#fff" strokeOpacity={0.3} opacity={0.9} />
        ))}
        <text x="8" y="344" fontSize="10" fill="#94a3b8">
          tip ({fk.tip[0].toFixed(1)}, {fk.tip[1].toFixed(1)}, {fk.tip[2].toFixed(1)}) cm · pitch {fk.pitch.toFixed(0)}° · grip {open.toFixed(0)}%
        </text>
      </svg>

      <svg viewBox="0 0 400 350" className="w-full rounded-lg border border-slate-700 bg-slate-950">
        <text x="8" y="16" fontSize="11" fill="#64748b">TOP (x↑, y← cm)</text>
        <rect x="8" y="24" width="384" height="300" fill="#2a2418" opacity="0.25" />
        {[10, 20, 30].map((c) => (
          <g key={c}>
            <circle cx={tx(0)} cy={ty(0)} r={c * 9} fill="none" stroke="#334155" strokeDasharray="2 4" />
            <text x={tx(0) + 3} y={ty(c) - 2} fontSize="9" fill="#64748b">{c}</text>
          </g>
        ))}
        <circle cx={tx(BIN.y)} cy={ty(BIN.x)} r={BIN.r * 9} fill="#e9e9ec" opacity="0.25" stroke="#e9e9ec" />
        <circle cx={tx(BIN_B.y)} cy={ty(BIN_B.x)} r={BIN_B.r * 9} fill="#c9d6e8" opacity="0.25" stroke="#c9d6e8" />
        <text x={tx(BIN.y) - 4} y={ty(BIN.x) + 3} fontSize="9" fill="#e2e8f0">A</text>
        <text x={tx(BIN_B.y) - 4} y={ty(BIN_B.x) + 3} fontSize="9" fill="#e2e8f0">B</text>
        {trail.length > 1 && <polyline fill="none" stroke="#f472b6" strokeWidth="2" points={trail.map((t) => `${tx(t[1])},${ty(t[0])}`).join(" ")} />}
        {world?.objects.map((o) => (
          <rect key={o.id} x={tx(o.y) - (o.w * 9) / 2} y={ty(o.x) - (o.w * 9) / 2} width={o.w * 9} height={o.w * 9} fill={`rgb(${o.rgb.join(",")})`} stroke={o.held ? "#fff" : "#000"} strokeWidth={o.held ? 2 : 0.5} />
        ))}
        <rect x={tx(0) - 16} y={ty(0) - 8} width="32" height="28" fill="#334155" rx="4" />
        <line x1={tx(0)} y1={ty(0)} x2={tx(fk.tip[1])} y2={ty(fk.tip[0])} stroke={accent} strokeWidth="8" strokeLinecap="round" />
        <circle cx={tx(fk.tip[1])} cy={ty(fk.tip[0])} r="6" fill="#f43f5e" stroke="#fff" strokeWidth="2" />
      </svg>
    </div>
  );
}
