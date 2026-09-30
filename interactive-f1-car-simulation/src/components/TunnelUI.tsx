import { useState } from "react";
import { DEFAULTS, PRESETS, type AeroResult, type Params, type ViewName } from "../lib/aero";
import { Section, Seg, Slider, Stat, Toggle } from "./ui";
import { cn } from "../utils/cn";

interface Props {
  params: Params;
  set: (patch: Partial<Params>) => void;
  aero: AeroResult;
  onView: (v: ViewName) => void;
  onZoom: (f: number) => void;
  onResetFlow: () => void;
  onBack: () => void;
}

const f0 = (n: number) => Math.round(n).toLocaleString("en-US");
const f1 = (n: number) => n.toFixed(1);
const f2 = (n: number) => n.toFixed(2);

/* -------------------------------------------------------------- chart */
function Chart({ aero, params }: { aero: AeroResult; params: Params }) {
  const W = 300;
  const H = 120;
  const pad = { l: 34, r: 8, t: 8, b: 20 };
  const maxY = Math.max(...aero.curve.map((c) => Math.max(c.df, c.dr))) / 1000;
  const yMax = Math.max(4, Math.ceil(maxY));
  const x = (v: number) => pad.l + ((v - 40) / 340) * (W - pad.l - pad.r);
  const y = (kn: number) => pad.t + (1 - kn / yMax) * (H - pad.t - pad.b);
  const path = (key: "df" | "dr") =>
    aero.curve.map((c, i) => `${i ? "L" : "M"}${x(c.v).toFixed(1)},${y(c[key] / 1000).toFixed(1)}`).join(" ");
  const vNow = Math.min(380, Math.max(40, aero.vAir * 3.6));
  const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((t) => t <= yMax && (yMax <= 8 || t % 2 === 0));
  void params;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.07)" />
          <text x={pad.l - 5} y={y(t) + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.4)" fontFamily="JetBrains Mono">
            {t}
          </text>
        </g>
      ))}
      {[100, 200, 300].map((v) => (
        <text key={v} x={x(v)} y={H - 6} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.4)" fontFamily="JetBrains Mono">
          {v}
        </text>
      ))}
      <path d={path("df")} fill="none" stroke="#36d6ff" strokeWidth="2" />
      <path d={path("dr")} fill="none" stroke="#ff5a4a" strokeWidth="2" />
      <line x1={x(vNow)} x2={x(vNow)} y1={pad.t} y2={H - pad.b} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" />
      <circle cx={x(vNow)} cy={y(aero.downforce / 1000)} r="3.5" fill="#36d6ff" stroke="#fff" />
      <circle cx={x(vNow)} cy={y(aero.drag / 1000)} r="3.5" fill="#ff5a4a" stroke="#fff" />
      <text x={pad.l} y={8} fontSize="8" fill="rgba(255,255,255,0.4)" fontFamily="JetBrains Mono">
        kN
      </text>
    </svg>
  );
}

/* -------------------------------------------------------------- breakdown */
function Breakdown({ aero }: { aero: AeroResult }) {
  const totCL = aero.comps.reduce((a, c) => a + Math.max(0, c.cl), 0) || 1;
  const totCD = aero.comps.reduce((a, c) => a + c.cd, 0) || 1;
  return (
    <div className="space-y-3">
      {(["cl", "cd"] as const).map((k) => {
        const tot = k === "cl" ? totCL : totCD;
        return (
          <div key={k}>
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.12em] text-white/50">
              <span>{k === "cl" ? "Downforce sources" : "Drag sources"}</span>
              <span className="font-mono normal-case tracking-normal text-white/70">
                {f2(k === "cl" ? aero.cla : aero.cda)} m²
              </span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-white/5">
              {aero.comps.map((c) =>
                Math.max(0, c[k]) > 0 ? (
                  <div
                    key={c.name}
                    style={{ width: `${(Math.max(0, c[k]) / tot) * 100}%`, background: c.color }}
                    className="transition-all duration-300"
                  />
                ) : null,
              )}
            </div>
            <div className="mt-1.5 grid grid-cols-1 gap-y-0.5">
              {aero.comps.map((c) =>
                Math.max(0, c[k]) > 0 ? (
                  <div key={c.name} className="flex items-center justify-between text-[10.5px]">
                    <span className="flex items-center gap-1.5 text-white/60">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="font-mono text-white/80 tabular-nums">
                      {((Math.max(0, c[k]) / tot) * 100).toFixed(0)}%
                      <span className="ml-1.5 text-white/35">{f2(c[k])}</span>
                    </span>
                  </div>
                ) : null,
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- legend */
const GRADS = {
  velocity: "linear-gradient(90deg,#1a1f99,#1a80ff,#1ae6cc,#8cff4d,#ffd91a,#ff2619)",
  pressure: "linear-gradient(90deg,#1f33ff,#4db8ff,#ecf5ff,#ff9940,#ff1a1a)",
  turbulence: "linear-gradient(90deg,#338cff,#9a4dff,#ff4d99,#ffd94d)",
};

function Legend({ params, aero }: { params: Params; aero: AeroResult }) {
  const mode = params.mode;
  const air = aero.vAir * 3.6;
  let ticks: string[] = [];
  let title = "";
  if (mode === "velocity") {
    title = "Local air speed (km/h, in the car's frame)";
    ticks = [0, 0.45, 0.9, 1.35, 1.8].map((t) => f0(t * air));
  } else if (mode === "pressure") {
    title = "Pressure coefficient Cp";
    ticks = ["-2.2", "-1.2", "0", "+0.5", "+1"];
  } else if (mode === "turbulence") {
    title = "Turbulence intensity";
    ticks = ["calm", "", "swirling", "", "chaotic"];
  }
  return (
    <div className="glass w-[min(92vw,440px)] rounded-xl px-4 py-2.5">
      {mode === "smoke" ? (
        <div className="text-center text-[11px] text-white/60">
          Smoke mode: neutral streaklines. Switch to <b className="text-white">Velocity</b> or{" "}
          <b className="text-white">Pressure</b> to read the flow.
        </div>
      ) : (
        <>
          <div className="mb-1 text-center text-[10px] uppercase tracking-[0.14em] text-white/50">{title}</div>
          <div className="h-2 rounded-full" style={{ background: GRADS[mode] }} />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-white/60">
            {ticks.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </>
      )}
      {params.surface && (
        <>
          <div className="mb-1 mt-2 text-center text-[10px] uppercase tracking-[0.14em] text-white/50">
            Surface pressure painted on car (Cp)
          </div>
          <div className="h-2 rounded-full" style={{ background: GRADS.pressure }} />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-white/60">
            <span>suction −2.2</span>
            <span>0</span>
            <span>+1 stagnation</span>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- telemetry */
function Telemetry({ aero, params }: { aero: AeroResult; params: Params }) {
  const warns: { tone: "red" | "amber" | "cyan"; text: string }[] = [];
  const hMean = (params.rideF + params.rideR) / 2;
  if (aero.porpoise > 0.05)
    warns.push({
      tone: "red",
      text: `Porpoising! Mean ride height ${f0(hMean)} mm is too low at this speed. The floor stalls and unstalls ~5 times a second.`,
    });
  else if (aero.stalled) warns.push({ tone: "amber", text: "Floor is close to stalling (< 18 mm). Raise the car before adding speed." });
  if (params.fwAngle > 26) warns.push({ tone: "amber", text: "Front-wing flaps are stalling: more angle now gives less downforce." });
  if (params.rwAngle > 32) warns.push({ tone: "amber", text: "Rear-wing flap is stalling: extra angle only adds drag." });
  if (aero.puTemp > 115) warns.push({ tone: "red", text: `Power unit overheating (${f0(aero.puTemp)} °C). Open the cooling.` });
  else if (aero.puTemp > 108) warns.push({ tone: "amber", text: `Power unit running hot (${f0(aero.puTemp)} °C).` });
  if (params.dirty)
    warns.push({
      tone: "cyan",
      text: `Dirty air at ${f0(params.gap)} m: about ${f0(36 * Math.exp(-params.gap / 14))}% of downforce lost, front wing hit hardest.`,
    });
  if (params.drs) warns.push({ tone: "cyan", text: "DRS open: slot gap cuts rear-wing drag and downforce." });
  if (params.rain) warns.push({ tone: "cyan", text: `Wet track: grip μ drops to ${f2(aero.mu)}. Spray rises behind the tyres.` });
  if (Math.abs(params.yaw) > 6) warns.push({ tone: "cyan", text: `Yaw ${params.yaw}°: the car sees the wind from the side. Drag rises, downforce falls.` });

  const toneCls = { red: "border-red-500/40 bg-red-500/10 text-red-200", amber: "border-amber-400/40 bg-amber-400/10 text-amber-100", cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100" };
  const bal = aero.balanceFront;
  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Stat label="Downforce" value={f2(aero.downforce / 1000)} unit="kN" sub={`≈ ${f0(aero.downforceKg)} kg pressing down`} tone="cyan" big />
        <Stat label="Drag" value={f2(aero.drag / 1000)} unit="kN" sub={`${f0(aero.dragPower)} kW lost to air`} tone="red" big />
        <Stat label="Down : Drag" value={f2(aero.ld)} unit="L/D" sub={`${f2(aero.downforce / (798 * 9.81))}× car weight`} />
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-white/45">Aero balance (front)</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-[22px] font-bold leading-none text-white tabular-nums">{f1(bal)}</span>
            <span className="font-mono text-[10px] text-white/45">%</span>
          </div>
          <div className="relative mt-1.5 h-1.5 rounded-full bg-white/10">
            <div className="absolute inset-y-0 left-[40%] right-[50%] rounded-full bg-emerald-400/40" />
            <div className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded bg-white" style={{ left: `${Math.min(100, Math.max(0, (bal - 30) * (100 / 30)))}%` }} />
          </div>
          <div className="mt-0.5 flex justify-between font-mono text-[9px] text-white/35">
            <span>understeer</span>
            <span>oversteer</span>
          </div>
        </div>
      </div>

      {warns.length > 0 && (
        <div className="space-y-1.5">
          {warns.map((w, i) => (
            <div key={i} className={cn("rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug", toneCls[w.tone])}>
              {w.text}
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/50">
          <span>Forces vs air speed</span>
          <span className="flex gap-3 normal-case tracking-normal">
            <span className="text-cyan-300">● Downforce</span>
            <span className="text-red-300">● Drag</span>
          </span>
        </div>
        <Chart aero={aero} params={params} />
      </div>

      <Breakdown aero={aero} />

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/[0.07] pt-3">
        <Stat label="Top speed" value={f0(aero.topSpeed)} unit="km/h" tone="green" />
        <Stat label="120 m corner" value={f0(aero.cornerSpeed)} unit="km/h" sub={`${f1(aero.latG)} g lateral`} tone="green" />
        <Stat label="Braking" value={f1(aero.brakeG)} unit="g" />
        <Stat label="Side force" value={f2(Math.abs(aero.side) / 1000)} unit="kN" />
        <Stat label="PU coolant" value={f0(aero.puTemp)} unit="°C" sub={`cooling margin ${f0(aero.coolMargin * 100)} %`} tone={aero.puTemp > 115 ? "red" : aero.puTemp > 108 ? "amber" : "white"} />
        <Stat label="Floor efficiency" value={f0(aero.floorFactor * 100)} unit="%" sub={`rake ${f0(aero.rake)} mm`} tone={aero.floorFactor < 0.85 ? "amber" : "white"} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/[0.07] pt-3">
        <Stat label="Air density ρ" value={aero.rho.toFixed(3)} unit="kg/m³" sub={`${f0(aero.pressure / 100)} hPa`} />
        <Stat label="Dynamic pressure q" value={f2(aero.q / 1000)} unit="kPa" />
        <Stat label="Reynolds (5.5 m)" value={(aero.re / 1e6).toFixed(1)} unit="M" />
        <Stat label="Mach" value={aero.mach.toFixed(3)} sub={`air ${f0(aero.vAir * 3.6)} km/h`} />
      </div>
      <p className="text-[10px] leading-snug text-white/30">
        Forces come from a simplified, calibrated component model. Streamlines are a visual flow model built around the
        car's geometry, not full CFD.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- controls */
function Controls({ params, set }: { params: Params; set: (p: Partial<Params>) => void }) {
  const [preset, setPreset] = useState("base");
  const apply = (id: string) => {
    const pr = PRESETS.find((p) => p.id === id)!;
    setPreset(id);
    set({ ...DEFAULTS, mode: params.mode, source: params.source, slice: params.slice, density: params.density, slowmo: params.slowmo, trail: params.trail, vortices: params.vortices, surface: params.surface, labels: params.labels, ...pr.p });
  };
  const ch = <K extends keyof Params>(k: K) => (v: Params[K]) => {
    setPreset("");
    set({ [k]: v } as Partial<Params>);
  };
  return (
    <div className="px-4">
      <Section title="Scenarios" badge="presets">
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => apply(p.id)}
              className={cn(
                "rounded-lg border px-2.5 py-2 text-left transition-colors",
                preset === p.id ? "border-[#ff2b2b] bg-[#ff2b2b]/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.08]",
              )}
            >
              <div className="font-display text-[13px] font-semibold uppercase leading-tight tracking-wide text-white">{p.name}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-white/45">{p.tag}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Speed & air" badge="conditions">
        <Slider label="Car speed" value={params.speed} min={40} max={380} step={5} unit=" km/h" onChange={ch("speed")} fill="#ff2b2b" hint="Airflow speed and downforce scale with the square of speed." />
        <Slider label="Head / tail wind" value={params.headwind} min={-40} max={40} step={1} unit=" km/h" onChange={ch("headwind")} fmt={(v) => (v > 0 ? `+${v} head` : v < 0 ? `${v} tail` : "0")} />
        <Slider label="Yaw / crosswind angle" value={params.yaw} min={-15} max={15} step={0.5} unit="°" onChange={ch("yaw")} fill="#36d6ff" hint="Also simulates the car sliding or cornering." />
        <Slider label="Temperature" value={params.temp} min={-10} max={50} step={1} unit=" °C" onChange={ch("temp")} fill="#ffc23a" />
        <Slider label="Altitude" value={params.altitude} min={0} max={3000} step={50} unit=" m" onChange={ch("altitude")} fill="#ffc23a" hint="Thin air means less downforce, less drag and worse cooling." />
        <Slider label="Humidity" value={params.humidity} min={0} max={100} step={5} unit=" %" onChange={ch("humidity")} fill="#ffc23a" />
        <Toggle label="Rain & wet track" value={params.rain} onChange={ch("rain")} hint="Spray rooster-tails, lower grip" color="#4aa8ff" />
      </Section>

      <Section title="Car setup" badge="aero">
        <Slider label="Front wing flap" value={params.fwAngle} min={0} max={32} step={0.5} unit="°" onChange={ch("fwAngle")} fill="#ff5a4a" hint="Stalls above ~26°." />
        <Slider label="Rear wing flap" value={params.rwAngle} min={0} max={38} step={0.5} unit="°" onChange={ch("rwAngle")} fill="#ffd21f" hint="More angle = more downforce and drag, until it stalls at ~32°." />
        <Toggle label="DRS open" value={params.drs} onChange={ch("drs")} hint="Flips the rear flap open. Watch drag fall." color="#ffd21f" />
        <Slider label="Front ride height" value={params.rideF} min={8} max={80} step={1} unit=" mm" onChange={ch("rideF")} fill="#36d6ff" />
        <Slider label="Rear ride height" value={params.rideR} min={8} max={90} step={1} unit=" mm" onChange={ch("rideR")} fill="#36d6ff" hint="Rake (rear higher than front) deepens the diffuser. Too low and the floor stalls, causing porpoising." />
        <Slider label="Cooling outlets" value={params.cooling} min={0} max={100} step={5} unit=" %" onChange={ch("cooling")} fill="#a78bfa" hint="Open = cooler engine, more drag." />
      </Section>

      <Section title="Traffic" badge="dirty air" defaultOpen={false}>
        <Toggle label="Follow another car" value={params.dirty} onChange={ch("dirty")} hint="Drives into the wake of a leading car" color="#a78bfa" />
        <Slider label="Gap to leader" value={params.gap} min={3} max={50} step={1} unit=" m" onChange={ch("gap")} fill="#a78bfa" hint="Downforce loss falls off rapidly with distance." />
      </Section>

      <Section title="Visualisation" badge="flow">
        <div className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/50">Colour by</div>
        <Seg
          options={[
            { id: "smoke", label: "Smoke" },
            { id: "velocity", label: "Speed" },
            { id: "pressure", label: "Press." },
            { id: "turbulence", label: "Turb." },
          ]}
          value={params.mode}
          onChange={ch("mode")}
        />
        <div className="mb-2 mt-3 text-[10px] uppercase tracking-[0.12em] text-white/50">Smoke source</div>
        <Seg
          cols={4}
          options={[
            { id: "volume", label: "Volume" },
            { id: "side", label: "Side slice" },
            { id: "plan", label: "Plan slice" },
            { id: "wheels", label: "Tyres" },
            { id: "floor", label: "Underfloor" },
            { id: "wings", label: "Wings" },
            { id: "intakes", label: "Intakes" },
          ]}
          value={params.source}
          onChange={ch("source")}
        />
        {(params.source === "side" || params.source === "plan") && (
          <Slider label={params.source === "side" ? "Slice position (left ↔ right)" : "Slice height"} value={params.slice} min={0} max={1} step={0.01} onChange={ch("slice")} fmt={(v) => v.toFixed(2)} fill="#36d6ff" />
        )}
        <div className="mt-2">
          <Slider label="Particle density" value={params.density} min={0.15} max={1} step={0.05} onChange={ch("density")} fmt={(v) => f0(v * 2400)} fill="#36d6ff" />
          <Slider label="Slow motion" value={params.slowmo} min={0.1} max={1.6} step={0.05} onChange={ch("slowmo")} fmt={(v) => v.toFixed(2) + "×"} fill="#36d6ff" />
          <Slider label="Streak length" value={params.trail} min={0.1} max={1} step={0.05} onChange={ch("trail")} fmt={(v) => f0(v * 100) + "%"} fill="#36d6ff" />
        </div>
        <Toggle label="Vortex cores" value={params.vortices} onChange={ch("vortices")} hint="Helical tubes: wingtip, floor-edge, tyre, diffuser" color="#36d6ff" />
        <Toggle label="Surface pressure" value={params.surface} onChange={ch("surface")} hint="Paint Cp on the car body" color="#36d6ff" />
        <Toggle label="Callout labels" value={params.labels} onChange={ch("labels")} color="#36d6ff" />
      </Section>
    </div>
  );
}

/* -------------------------------------------------------------- shell */
export function TunnelUI({ params, set, aero, onView, onZoom, onResetFlow, onBack }: Props) {
  const [hidden, setHidden] = useState(false);
  const [tab, setTab] = useState<"controls" | "telemetry">("controls");
  const views: { id: ViewName; label: string }[] = [
    { id: "iso", label: "3/4" },
    { id: "side", label: "Side" },
    { id: "top", label: "Top" },
    { id: "front", label: "Front" },
    { id: "rear", label: "Rear" },
    { id: "low", label: "Low" },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {/* top bar */}
      <div className="pointer-events-auto absolute left-1/2 top-16 z-10 flex max-w-[96vw] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 md:top-4">
        <div className="glass flex items-center gap-0.5 rounded-xl p-1">
          {views.map((v) => (
            <button key={v.id} type="button" onClick={() => onView(v.id)} className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              {v.label}
            </button>
          ))}
        </div>
        <div className="glass flex items-center gap-0.5 rounded-xl p-1">
          <button type="button" onClick={() => onZoom(0.85)} className="h-8 w-8 rounded-lg text-lg text-white/70 hover:bg-white/10 hover:text-white" aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => onZoom(1.18)} className="h-8 w-8 rounded-lg text-lg text-white/70 hover:bg-white/10 hover:text-white" aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={onResetFlow} className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-white/70 hover:bg-white/10 hover:text-white">
            Re-seed
          </button>
          <button type="button" onClick={() => setHidden(!hidden)} className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-white/70 hover:bg-white/10 hover:text-white">
            {hidden ? "Show UI" : "Hide UI"}
          </button>
        </div>
      </div>

      {/* big speed read-out */}
      {!hidden && (
        <div className="pointer-events-none absolute left-1/2 top-[7.5rem] hidden -translate-x-1/2 text-center md:top-[4.6rem] md:block">
          <div className="font-display text-[56px] font-extrabold italic leading-none text-white drop-shadow-[0_2px_20px_rgba(255,43,43,0.45)] tabular-nums">
            {f0(params.speed)}
            <span className="ml-1 text-[18px] font-semibold not-italic text-white/50">km/h</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            {f0(aero.vAir * 3.6)} km/h air · {aero.rho.toFixed(2)} kg/m³ · {f0(params.temp)} °C
          </div>
        </div>
      )}

      {!hidden && (
        <>
          {/* mobile tabs */}
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 md:hidden">
            <div className="glass rounded-t-2xl">
              <div className="flex border-b border-white/10">
                {(["controls", "telemetry"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} className={cn("flex-1 py-2.5 font-display text-sm font-semibold uppercase tracking-[0.14em]", tab === t ? "text-white" : "text-white/40")}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="scroll-thin max-h-[42vh] overflow-y-auto">
                {tab === "controls" ? <Controls params={params} set={set} /> : <Telemetry aero={aero} params={params} />}
              </div>
            </div>
          </div>

          {/* desktop left: telemetry */}
          <div className="pointer-events-auto absolute bottom-4 left-4 top-4 hidden w-[330px] md:block">
            <div className="glass scroll-thin flex h-full flex-col overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#ff5a4a]">Live</div>
                  <div className="font-display text-lg font-bold uppercase tracking-[0.12em]">Aero telemetry</div>
                </div>
                <button type="button" onClick={onBack} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-white/60 hover:bg-white/10 hover:text-white">
                  ↑ Teardown
                </button>
              </div>
              <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
                <Telemetry aero={aero} params={params} />
              </div>
            </div>
          </div>

          {/* desktop right: controls */}
          <div className="pointer-events-auto absolute bottom-4 right-4 top-4 hidden w-[340px] md:block">
            <div className="glass flex h-full flex-col overflow-hidden rounded-2xl">
              <div className="border-b border-white/10 px-4 py-3">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#36d6ff]">Wind tunnel</div>
                <div className="font-display text-lg font-bold uppercase tracking-[0.12em]">Control room</div>
              </div>
              <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
                <Controls params={params} set={set} />
              </div>
            </div>
          </div>

          {/* legend */}
          <div className="pointer-events-none absolute bottom-[calc(42vh+1.2rem)] left-1/2 -translate-x-1/2 md:bottom-4">
            <Legend params={params} aero={aero} />
          </div>
        </>
      )}
    </div>
  );
}
