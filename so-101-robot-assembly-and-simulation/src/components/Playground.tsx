import { useEffect, useMemo, useRef, useState } from 'react';
import { Sim } from '../sim/engine';
import type { Telemetry, ArmTelemetry } from '../sim/types';
import { ALL_SCENARIOS, CATEGORY_ORDER, CATEGORY_ICON, CODE_HEADER, DEFAULT_SCENARIO } from '../scenarios';

const DIFF = ['Easy', 'Medium', 'Hard'];
const DIFF_COLOR = ['text-emerald-300 bg-emerald-400/10', 'text-amber-300 bg-amber-400/10', 'text-rose-300 bg-rose-400/10'];

function Slider({ label, value, min, max, step = 1, unit = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-200">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} onChange={(e) => onChange(parseFloat(e.target.value))} className="h-1.5 w-full cursor-pointer accent-amber-400" />
    </label>
  );
}

function ArmHud({ name, color, a }: { name: string; color: string; a: ArmTelemetry }) {
  const rows: [string, string][] = [
    ['pan', `${a.pan.toFixed(0)}°`],
    ['lift', `${a.lift.toFixed(0)}°`],
    ['elbow', `${a.elbow.toFixed(0)}°`],
    ['wrist', `${a.wrist.toFixed(0)}°`],
    ['roll', `${a.roll.toFixed(0)}°`],
    ['grip', `${Math.round(a.grip * 100)}`],
  ];
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/75 p-2 backdrop-blur">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {name}
        </span>
        {!a.reached && <span className="rounded bg-rose-500/20 px-1 text-[9px] font-semibold text-rose-300">limit</span>}
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 font-mono text-[10px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-1">
            <span className="text-slate-500">{k}</span>
            <span className="text-slate-200">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400">
        <span>
          tip {a.tip[0].toFixed(0)},{a.tip[1].toFixed(0)},{a.tip[2].toFixed(0)}
        </span>
        <span className={a.holding ? 'text-emerald-300' : ''}>{a.holding ? `✊ ${a.holding}` : '—'}</span>
      </div>
    </div>
  );
}

export default function Playground({ initial }: { initial?: string }) {
  const mount = useRef<HTMLDivElement>(null);
  const simRef = useRef<Sim | null>(null);
  const logId = useRef(0);
  const dragging = useRef(false);
  const [ready, setReady] = useState(false);
  const [selId, setSelId] = useState(initial && ALL_SCENARIOS.some((s) => s.id === initial) ? initial : DEFAULT_SCENARIO);
  const scenario = useMemo(() => ALL_SCENARIOS.find((s) => s.id === selId)!, [selId]);
  const [tele, setTele] = useState<Telemetry | null>(null);
  const [log, setLog] = useState<{ id: number; msg: string }[]>([]);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [manual, setManual] = useState(false);
  const [finished, setFinished] = useState(false);
  const [selArm, setSelArm] = useState(0);
  const [tab, setTab] = useState<'about' | 'build'>('about');
  const [ctl, setCtl] = useState<'ik' | 'joint'>('ik');
  const [hud, setHud] = useState(true);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');
  const [ik, setIk] = useState({ x: 0, y: 10, z: 0, pitch: -90, roll: 0, grip: 1 });
  const [jf, setJf] = useState<number[]>([0, 0, 0, 0, 0, 0.5]);

  // ---- create the simulator once
  useEffect(() => {
    const sim = new Sim(mount.current!, {
      onTelemetry: setTele,
      onLog: (msg) => setLog((l) => [...l.slice(-40), { id: ++logId.current, msg }]),
      onFinish: () => setFinished(true),
    });
    simRef.current = sim;
    setReady(true);
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointerup', up);
      sim.dispose();
      simRef.current = null;
      setReady(false);
    };
  }, []);

  // ---- load scenario
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    setLog([]);
    setFinished(false);
    setSelArm(0);
    setPlaying(true);
    sim.selectArm(0);
    sim.setPlaying(true);
    sim.load(scenario);
    setManual(scenario.program.kind === 'manual');
  }, [ready, scenario]);

  useEffect(() => {
    simRef.current?.setSpeed(speed);
  }, [speed, ready]);
  useEffect(() => {
    simRef.current?.setMuted(muted);
  }, [muted, ready]);

  // ---- keep manual forms in sync with the simulator
  useEffect(() => {
    const sim = simRef.current;
    if (!sim || !tele || !manual || dragging.current) return;
    const m = sim.getManual(selArm);
    setIk({ x: m.p[0], y: m.p[1], z: m.p[2], pitch: m.pitch, roll: m.roll, grip: m.grip });
    const a = tele.arms[selArm];
    setJf([a.pan, a.lift, a.elbow, a.wrist, a.roll, a.grip]);
  }, [tele, manual, selArm]);

  const sim = () => simRef.current;
  const mutateIk = (patch: Partial<typeof ik>) => {
    const f = { ...ik, ...patch };
    setIk(f);
    sim()?.setManualPose(selArm, { p: [f.x, f.y, f.z], pitch: f.pitch, roll: f.roll, grip: f.grip });
  };
  const mutateJoint = (i: number, v: number) => {
    const j = [...jf];
    j[i] = v;
    setJf(j);
    sim()?.setManualJoints(selArm, j);
  };

  const filtered = ALL_SCENARIOS.filter((s) => (cat === 'All' || s.category === cat) && (query === '' || (s.title + s.tagline + s.category).toLowerCase().includes(query.toLowerCase())));
  const progress = tele && tele.phaseCount > 0 ? Math.min(100, ((tele.phase - 1) / tele.phaseCount) * 100) : 0;
  const isManualScenario = scenario.program.kind === 'manual';

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-14 pt-6" onPointerDown={() => sim()?.ensureAudio()}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Playground</h2>
          <p className="max-w-3xl text-sm text-slate-400">
            Two virtual SO-101 arms on a shared table. Pick one of <span className="font-semibold text-amber-300">{ALL_SCENARIOS.length} use cases</span>, watch it run, then take over and drive the arms yourself. Drag to orbit, scroll to zoom.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">
        {/* ------------------------------------------------ gallery */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search use cases…"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/50 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {['All', ...CATEGORY_ORDER].map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-full px-2 py-1 text-[11px] font-medium transition ${cat === c ? 'bg-amber-400 text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                >
                  {c === 'All' ? 'All' : `${CATEGORY_ICON[c]} ${c}`}
                </button>
              ))}
            </div>
            <div className="mt-3 max-h-[340px] space-y-1.5 overflow-y-auto pr-1 lg:max-h-[calc(100vh-290px)]">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelId(s.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-2.5 text-left transition ${selId === s.id ? 'border-amber-400/50 bg-amber-400/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.07]'}`}
                >
                  <span className="mt-0.5 text-2xl leading-none">{s.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{s.title}</span>
                    <span className="block text-[11px] leading-snug text-slate-400">{s.tagline}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[10px]">
                      <span className={`rounded px-1.5 py-0.5 font-medium ${DIFF_COLOR[s.difficulty - 1]}`}>{DIFF[s.difficulty - 1]}</span>
                      <span className="text-slate-500">{s.arms === 2 ? '2 arms' : '1 arm'}</span>
                      <span className="truncate text-slate-600">· {s.category}</span>
                    </span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 && <div className="py-6 text-center text-sm text-slate-500">No matches</div>}
            </div>
          </div>
        </aside>

        {/* ------------------------------------------------ main */}
        <main className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl">{scenario.emoji}</span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-semibold text-white">{scenario.title}</h3>
              <p className="text-sm text-slate-400">{scenario.tagline}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${DIFF_COLOR[scenario.difficulty - 1]}`}>{DIFF[scenario.difficulty - 1]}</span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">{scenario.arms === 2 ? '🦾🦾 dual-arm' : '🦾 single arm'}</span>
          </div>

          {/* canvas */}
          <div className="relative h-[56vh] min-h-[400px] overflow-hidden rounded-2xl border border-white/10 bg-black">
            <div ref={mount} className="absolute inset-0" />

            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-slate-950/80 px-2.5 py-1 font-medium text-slate-200 backdrop-blur">
                {manual ? '🕹 manual control' : finished ? '✓ finished' : playing ? '● running' : '⏸ paused'}
              </span>
              {tele && !manual && tele.phaseCount > 0 && <span className="rounded-full bg-slate-950/80 px-2.5 py-1 text-slate-300 backdrop-blur">step {tele.phase}/{tele.phaseCount} · episode {tele.episode}</span>}
              {tele && tele.triggers > 0 && <span className="rounded-full bg-slate-950/80 px-2.5 py-1 text-slate-300 backdrop-blur">⚡ {tele.triggers} events</span>}
            </div>

            {hud && tele && (
              <div className="pointer-events-none absolute right-3 top-3 hidden w-[250px] space-y-2 md:block">
                <ArmHud name="Arm A" color="#f59e0b" a={tele.arms[0]} />
                <ArmHud name={scenario.mirror ? 'Arm B (follower)' : 'Arm B'} color="#22d3ee" a={tele.arms[1]} />
              </div>
            )}

            <div className="pointer-events-none absolute bottom-16 left-3 max-w-[60%] space-y-1">
              {log.slice(-3).map((l, i, arr) => (
                <div key={l.id} className="w-fit max-w-full rounded-lg bg-slate-950/80 px-2.5 py-1 text-xs text-slate-100 backdrop-blur transition-opacity" style={{ opacity: 0.45 + 0.55 * ((i + 1) / arr.length) }}>
                  {l.msg}
                </div>
              ))}
            </div>

            {/* transport */}
            <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 backdrop-blur">
              {!isManualScenario && (
                <>
                  <button
                    onClick={() => {
                      const p = !playing;
                      setPlaying(p);
                      sim()?.setPlaying(p);
                    }}
                    disabled={manual}
                    className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-40"
                  >
                    {playing ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <button
                    onClick={() => {
                      setLog([]);
                      setFinished(false);
                      sim()?.restart();
                      sim()?.setPlaying(true);
                      setPlaying(true);
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-white/10"
                  >
                    ↻ Restart
                  </button>
                  <select value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-slate-100">
                    {[0.5, 1, 1.5, 2, 3].map((s) => (
                      <option key={s} value={s}>
                        {s}× speed
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (manual) {
                        sim()?.setManual(false);
                        setManual(false);
                        setFinished(false);
                        setPlaying(true);
                        sim()?.setPlaying(true);
                      } else {
                        sim()?.setManual(true);
                        setManual(true);
                      }
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${manual ? 'border-sky-400/50 bg-sky-400/15 text-sky-200' : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'}`}
                  >
                    {manual ? '↩ Back to demo' : '🕹 Try it yourself'}
                  </button>
                </>
              )}
              {isManualScenario && (
                <button
                  onClick={() => {
                    setLog([]);
                    sim()?.restart();
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-white/10"
                >
                  ↻ Reset scene
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setMuted(!muted)} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-100 hover:bg-white/10" title="Toggle sound">
                  {muted ? '🔇' : '🔊'}
                </button>
                <button onClick={() => setHud(!hud)} className={`hidden rounded-lg border px-2.5 py-1.5 text-sm md:block ${hud ? 'border-amber-400/40 bg-amber-400/10 text-amber-200' : 'border-white/10 bg-white/5 text-slate-100'}`} title="Toggle joint telemetry">
                  📊
                </button>
                <button onClick={() => sim()?.resetCamera()} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-100 hover:bg-white/10" title="Reset camera">
                  🎥
                </button>
              </div>
            </div>
            {progress > 0 && !manual && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/10">
                <div className="h-full bg-amber-400" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>

          {/* manual controls */}
          {manual && (
            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.04] p-4" onPointerDown={() => (dragging.current = true)}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold text-white">Manual control</h4>
                <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
                  {[0, 1].map((i) => (
                    <button
                      key={i}
                      disabled={scenario.mirror && i === 1}
                      onClick={() => {
                        setSelArm(i);
                        sim()?.selectArm(i);
                      }}
                      className={`rounded-md px-2.5 py-1 font-medium disabled:opacity-30 ${selArm === i ? (i === 0 ? 'bg-amber-400 text-slate-900' : 'bg-cyan-400 text-slate-900') : 'text-slate-300'}`}
                    >
                      Arm {i === 0 ? 'A' : 'B'}
                      {scenario.mirror ? (i === 0 ? ' (leader)' : ' (follower)') : ''}
                    </button>
                  ))}
                </div>
                <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
                  {(['ik', 'joint'] as const).map((c) => (
                    <button key={c} onClick={() => setCtl(c)} className={`rounded-md px-2.5 py-1 font-medium ${ctl === c ? 'bg-white/15 text-white' : 'text-slate-300'}`}>
                      {c === 'ik' ? 'Cartesian (IK)' : 'Joint space'}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400">💡 Tip: click on the table to send the gripper there.</span>
                {tele && !tele.arms[selArm].reached && <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[11px] font-semibold text-rose-300">target outside workspace</span>}
              </div>

              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {ctl === 'ik' ? (
                  <>
                    <Slider label="X (left ↔ right)" value={ik.x} min={-35} max={35} step={0.5} unit=" cm" onChange={(v) => mutateIk({ x: v })} />
                    <Slider label="Height" value={ik.y} min={0.3} max={30} step={0.1} unit=" cm" onChange={(v) => mutateIk({ y: v })} />
                    <Slider label="Z (back ↔ front)" value={ik.z} min={-14} max={26} step={0.5} unit=" cm" onChange={(v) => mutateIk({ z: v })} />
                    <Slider label="Tool pitch (−90 = down)" value={ik.pitch} min={-120} max={30} step={1} unit="°" onChange={(v) => mutateIk({ pitch: v })} />
                    <Slider label="Wrist roll" value={ik.roll} min={-180} max={180} step={1} unit="°" onChange={(v) => mutateIk({ roll: v })} />
                    <Slider label="Gripper (0 closed – 1 open)" value={ik.grip} min={0} max={1} step={0.01} onChange={(v) => mutateIk({ grip: v })} />
                  </>
                ) : (
                  <>
                    <Slider label="1 · shoulder_pan" value={jf[0]} min={-180} max={180} unit="°" onChange={(v) => mutateJoint(0, v)} />
                    <Slider label="2 · shoulder_lift" value={jf[1]} min={-10} max={190} unit="°" onChange={(v) => mutateJoint(1, v)} />
                    <Slider label="3 · elbow_flex" value={jf[2]} min={-168} max={10} unit="°" onChange={(v) => mutateJoint(2, v)} />
                    <Slider label="4 · wrist_flex" value={jf[3]} min={-118} max={118} unit="°" onChange={(v) => mutateJoint(3, v)} />
                    <Slider label="5 · wrist_roll" value={jf[4]} min={-180} max={180} unit="°" onChange={(v) => mutateJoint(4, v)} />
                    <Slider label="6 · gripper" value={jf[5]} min={0} max={1} step={0.01} onChange={(v) => mutateJoint(5, v)} />
                  </>
                )}
              </div>

              {scenario.mirror && tele && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
                  <span className="text-xs font-semibold text-white">🎬 Dataset recorder</span>
                  {!tele.rec.recording ? (
                    <button onClick={() => sim()?.startRecording()} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400">
                      ● Record episode
                    </button>
                  ) : (
                    <button onClick={() => sim()?.stopRecording()} className="animate-pulse rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white">
                      ■ Stop
                    </button>
                  )}
                  {!tele.rec.replaying ? (
                    <button disabled={tele.rec.frames === 0 || tele.rec.recording} onClick={() => sim()?.playRecording()} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-white/10 disabled:opacity-40">
                      ▶ Replay as “policy”
                    </button>
                  ) : (
                    <button onClick={() => sim()?.stopReplay()} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100">
                      ■ Stop replay
                    </button>
                  )}
                  <button onClick={() => sim()?.clearRecording()} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">
                    Clear
                  </button>
                  <span className="font-mono text-[11px] text-slate-400">
                    {tele.rec.frames} frames · {(tele.rec.frames / 30).toFixed(1)} s @30 fps · action[6] / observation.state[6]
                  </span>
                </div>
              )}
            </div>
          )}

          {/* details */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-5">
            <div className="mb-4 inline-flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-sm">
              {(['about', 'build'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 font-medium ${tab === t ? 'bg-amber-400 text-slate-900' : 'text-slate-300'}`}>
                  {t === 'about' ? 'About this use case' : 'Build it on the real robot'}
                </button>
              ))}
            </div>

            {tab === 'about' ? (
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-slate-200">{scenario.story}</p>
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm leading-relaxed text-amber-100">
                    <span className="font-semibold">Why it’s out-of-the-box · </span>
                    {scenario.novelty}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Add-on hardware</h5>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                    {scenario.hardware.map((h) => (
                      <li key={h} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-100">
                    <span className="font-semibold">Approach · </span>
                    {scenario.approach}
                  </div>
                  <ol className="mt-3 space-y-2">
                    {scenario.howTo.map((h, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-200">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-semibold text-amber-300">{i + 1}</span>
                        {h}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="min-w-0">
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs text-slate-400">
                      <span>python · core idea</span>
                      <button onClick={() => navigator.clipboard?.writeText(CODE_HEADER + '\n' + scenario.code).catch(() => {})} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 hover:bg-white/10">
                        Copy with setup
                      </button>
                    </div>
                    <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-emerald-200">{scenario.code}</pre>
                  </div>
                  <details className="mt-2 rounded-xl border border-white/10 bg-black/30">
                    <summary className="cursor-pointer px-3 py-2 text-xs text-slate-400">Show shared setup boilerplate</summary>
                    <pre className="overflow-x-auto border-t border-white/10 p-3 font-mono text-[11px] leading-relaxed text-slate-300">{CODE_HEADER}</pre>
                  </details>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500">
            The simulator is a kinematic model of the SO-101 (link lengths ≈ 11.6 cm upper arm, 13.5 cm forearm, gripper opening ≈ 4 cm) with simple grasp / stacking physics – ideal for planning motions and choreography, not for torque or contact accuracy. Sounds are generated live in your browser.
          </p>
        </main>
      </div>
    </div>
  );
}
