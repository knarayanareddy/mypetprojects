"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SimView from "./SimView";
import { Sim } from "@/lib/sim";
import { CATEGORIES, SCENARIOS, SCENARIO_BY_ID } from "@/lib/scenarios";
import { ACTING_MODELS, MODEL_BY_ID, limits, profileFor, score } from "@/lib/models";
import { setMuted } from "@/lib/audio";

const CAT_COLOR: Record<string, string> = {
  "Music & Art": "#f472b6",
  "Home & Care": "#34d399",
  "Games & Magic": "#a78bfa",
  "Industry & Lab": "#60a5fa",
  "Out-of-the-box": "#fbbf24",
};
type Tab = "story" | "build" | "code" | "models";

export default function Playground() {
  const [sid, setSid] = useState("piano");
  const [mid, setMid] = useState("scripted");
  const [tab, setTab] = useState<Tab>("story");
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [paused, setPaused] = useState(false);
  const [mute, setMute] = useState(false);
  const [cat, setCat] = useState<string>("All");
  const [hud, setHud] = useState({ grabs: 0, misses: 0, loops: 0, hits: 0, cycle: 0, err: 0, say: "", t: 0 });

  const scn = SCENARIO_BY_ID[sid];
  const model = MODEL_BY_ID[mid];
  const sim = useRef<Sim | null>(null);
  if (!sim.current) sim.current = new Sim(SCENARIOS[0], profileFor(MODEL_BY_ID.scripted, SCENARIOS[0]));

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("scenario");
    if (p && SCENARIO_BY_ID[p]) setSid(p);
  }, []);

  useEffect(() => {
    sim.current!.load(scn, profileFor(model, scn));
    sim.current!.speed = speed;
    sim.current!.loop = loop;
    sim.current!.paused = false;
    setPaused(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid, mid]);
  useEffect(() => {
    if (sim.current) {
      sim.current.speed = speed;
      sim.current.loop = loop;
      sim.current.paused = paused;
    }
  }, [speed, loop, paused]);
  useEffect(() => setMuted(mute), [mute]);

  useEffect(() => {
    const id = setInterval(() => {
      const s = sim.current!;
      setHud({ grabs: s.stats.grabs, misses: s.stats.misses, loops: s.stats.loops, hits: s.stats.hits, cycle: s.stats.cycle, err: s.stats.trackErr, say: s.sayT > 0 ? s.say : "", t: s.t });
    }, 250);
    return () => clearInterval(id);
  }, []);

  const restart = useCallback(() => {
    sim.current!.load(scn, profileFor(model, scn));
  }, [scn, model]);

  const list = useMemo(() => SCENARIOS.filter((s) => cat === "All" || s.category === cat), [cat]);
  const est = score(model, scn.needs);
  const lim = limits(model, scn.needs);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-3 p-3 lg:grid-cols-[290px_minmax(0,1fr)_380px]" style={{ height: "calc(100vh - 56px)" }}>
      {/* ---------------- use-case list ---------------- */}
      <aside className="card flex min-h-0 flex-col overflow-hidden">
        <div className="border-b border-slate-800 p-3">
          <div className="text-sm font-semibold">{SCENARIOS.length} use cases</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {["All", ...CATEGORIES].map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`chip ${cat === c ? "!border-[#ff7a1a] !text-white" : ""}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="scroll-thin flex-1 space-y-1.5 overflow-y-auto p-2">
          {list.map((s) => (
            <button key={s.id} onClick={() => setSid(s.id)} className={`w-full rounded-xl border p-2.5 text-left transition ${sid === s.id ? "border-[#ff7a1a] bg-slate-800/80" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{s.title}</div>
                  <div className="truncate text-xs text-slate-400">{s.tagline}</div>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: CAT_COLOR[s.category] }} />
                {s.category}
                <span className="ml-auto">{"●".repeat(s.difficulty)}{"○".repeat(3 - s.difficulty)}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ---------------- 3D view ---------------- */}
      <section className="card relative min-h-[420px] overflow-hidden">
        <SimView sim={sim.current} rev={sid} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
          <div className="rounded-xl bg-slate-950/80 px-3 py-2 backdrop-blur">
            <div className="text-lg font-bold">
              {scn.emoji} {scn.title}
            </div>
            <div className="text-xs text-slate-400">
              {model.name} · {scn.arms === 2 ? "2 arms" : "1 arm"}
            </div>
          </div>
          {hud.say && <div className="max-w-md rounded-xl border border-[#ff7a1a]/50 bg-slate-950/85 px-3 py-2 text-sm">{hud.say}</div>}
        </div>
        <div className="pointer-events-none absolute right-3 top-3 grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-xl bg-slate-950/80 px-3 py-2 text-xs backdrop-blur">
          <span className="text-slate-400">grasps</span>
          <span className="text-right tabular-nums">{hud.grabs}</span>
          <span className="text-slate-400">missed</span>
          <span className={`text-right tabular-nums ${hud.misses ? "text-amber-300" : ""}`}>{hud.misses}</span>
          <span className="text-slate-400">hits</span>
          <span className="text-right tabular-nums">{hud.hits}</span>
          <span className="text-slate-400">tracking err</span>
          <span className="text-right tabular-nums">{hud.err.toFixed(2)} cm</span>
          <span className="text-slate-400">cycle</span>
          <span className="text-right tabular-nums">{hud.cycle ? hud.cycle.toFixed(1) + " s" : "…"}</span>
          <span className="text-slate-400">loops</span>
          <span className="text-right tabular-nums">{hud.loops}</span>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-950/85 px-3 py-2 backdrop-blur">
          <button className="btn btn-primary" onClick={() => setPaused((p) => !p)}>
            {paused ? "▶ Play" : "⏸ Pause"}
          </button>
          <button className="btn" onClick={restart}>
            ↺ Restart
          </button>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            speed
            <input type="range" min={0.25} max={3} step={0.25} value={speed} onChange={(e) => setSpeed(+e.target.value)} />
            <span className="w-8 tabular-nums">{speed}×</span>
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-300">
            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> loop
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-300">
            <input type="checkbox" checked={mute} onChange={(e) => setMute(e.target.checked)} /> mute
          </label>
          <select className="input !w-auto" value={mid} onChange={(e) => setMid(e.target.value)}>
            {ACTING_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <Link href={`/control?scenario=${scn.id}`} className="btn ml-auto">
            🎮 Run on real arms →
          </Link>
        </div>
      </section>

      {/* ---------------- info ---------------- */}
      <aside className="card flex min-h-0 flex-col overflow-hidden">
        <div className="flex border-b border-slate-800 text-sm">
          {(["story", "build", "code", "models"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 px-3 py-2.5 capitalize ${tab === t ? "border-b-2 border-[#ff7a1a] text-white" : "text-slate-400 hover:text-white"}`}>
              {t === "build" ? "How to build" : t}
            </button>
          ))}
        </div>
        <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4 text-sm">
          {tab === "story" && (
            <>
              <div className="flex flex-wrap gap-1.5">
                <span className="chip" style={{ borderColor: CAT_COLOR[scn.category] }}>{scn.category}</span>
                <span className="chip">difficulty {"●".repeat(scn.difficulty)}{"○".repeat(3 - scn.difficulty)}</span>
                <span className="chip">{scn.arms === 2 ? "needs both arms" : "1 arm"}</span>
              </div>
              <p className="text-slate-200">{scn.story}</p>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-300">Why it’s novel</div>
                <p className="mt-1 text-slate-200">{scn.novelty}</p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Try this instruction in the Control Center</div>
                <code className="mt-1 block rounded-lg bg-slate-900 p-2 text-[#fdba74]">“{scn.prompt}”</code>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Props & hardware</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-300">
                  {scn.hardware.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Extra sensors</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-300">
                  {scn.sensors.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
          {tab === "build" && (
            <>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Approach</div>
                <p className="mt-1 text-slate-200">{scn.approach}</p>
              </div>
              <ol className="list-decimal space-y-2 pl-5 text-slate-300">
                {scn.howTo.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ol>
              <p className="text-xs text-slate-500">The simulated motion above is the same Cartesian program the Control Center streams to real arms (scripted IK skill).</p>
            </>
          )}
          {tab === "code" && <pre className="code whitespace-pre-wrap">{scn.code}</pre>}
          {tab === "models" && (
            <>
              <p className="text-xs text-slate-400">
                Estimated first-try success per model for this use case. A transparent capability-gap heuristic (not a benchmark) — it also drives the simulated lag, jitter, stalls and missed grasps when you select a model.
              </p>
              <div className="space-y-1.5">
                {ACTING_MODELS.map((m) => {
                  const sc = score(m, scn.needs);
                  return (
                    <button key={m.id} onClick={() => setMid(m.id)} className={`w-full rounded-lg border p-2 text-left ${mid === m.id ? "border-[#ff7a1a]" : "border-slate-800 hover:border-slate-600"}`}>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{m.name}</span>
                        <span className="tabular-nums text-slate-300">{Math.round(sc * 100)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded bg-slate-800">
                        <div className="h-1.5 rounded" style={{ width: `${sc * 100}%`, background: sc > 0.75 ? "#34d399" : sc > 0.5 ? "#fbbf24" : "#f87171" }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="border-t border-slate-800 p-3 text-xs">
          <span className="text-slate-400">Selected model estimate: </span>
          <span className="font-semibold">{Math.round(est * 100)}%</span>
          {lim.length > 0 && <span className="text-slate-400"> · limited by {lim.join(" & ")}</span>}
        </div>
      </aside>
    </div>
  );
}
