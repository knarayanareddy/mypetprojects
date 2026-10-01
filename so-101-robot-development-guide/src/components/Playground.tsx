import { useEffect, useMemo, useRef, useState } from 'react';
import { Sim, type LogKind, type Report, type EntDef } from '../sim/engine';
import { POLICIES, POLICY_BY_ID, SKILLS, predictSuccess } from '../sim/policies';
import { CATEGORIES, SCENARIOS, SCENARIO_BY_ID } from '../sim/scenarios';
import { mulberry, cube, binE } from '../sim/dsl';
import { D2R, R2D } from '../robot/model';

interface Props { initialPolicy?: string; initialScenario?: string }
interface HistoryRow { scenario: string; policy: string; score: string; ok: boolean; time: number; demos: number }

const kindCls: Record<LogKind, string> = { info: 'text-slate-300', ok: 'text-emerald-300', warn: 'text-amber-300', err: 'text-rose-300', plan: 'text-sky-300', sys: 'text-violet-300' };

export default function Playground({ initialPolicy, initialScenario }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Sim | null>(null);
  const [mode, setMode] = useState<'scenario' | 'teleop'>('scenario');
  const [scenarioId, setScenarioId] = useState(initialScenario ?? 'sorter');
  const [policyId, setPolicyId] = useState(initialPolicy ?? 'act');
  const [demos, setDemos] = useState(50);
  const [foresight, setForesight] = useState(0);
  const [seed, setSeed] = useState(7);
  const [tick, setTick] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [cat, setCat] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState<{ m: string; k: LogKind }[]>([]);
  const [hud, setHud] = useState<{ arms: string[]; time: number; score: string; running: boolean; finished: boolean }>({ arms: [], time: 0, score: '', running: false, finished: false });
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const scn = SCENARIO_BY_ID[scenarioId];
  const pol = POLICY_BY_ID[policyId];

  // teleop state
  const [tl, setTl] = useState({ pan: 0, r: 15, y: 6, pitch: -90, roll: 0, grip: 1 });
  const [joints, setJoints] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [rec, setRec] = useState(false);
  const recData = useRef<{ t: number; state: number[]; action: number[] }[]>([]);
  const [recCount, setRecCount] = useState(0);
  const [episodes, setEpisodes] = useState(0);

  useEffect(() => {
    const sim = new Sim(mountRef.current!);
    simRef.current = sim;
    sim.onLog = (m, k) => setLogs((l) => [...l.slice(-249), { m, k }]);
    sim.onHud = (h) => setHud(h);
    sim.onFinish = (r) => {
      setReport(r);
      const s = SCENARIO_BY_ID[(sim as any).__sid];
      setHistory((h) => [{ scenario: s?.title ?? '', policy: sim.policy.short, score: `${r.score}/${r.max}`, ok: r.success, time: r.time, demos: sim.opts.demos }, ...h].slice(0, 10));
    };
    return () => sim.dispose();
  }, []);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    setLogs([]);
    setReport(null);
    if (mode === 'scenario') {
      (sim as any).__sid = scenarioId;
      const s = SCENARIO_BY_ID[scenarioId];
      sim.load(s.build(mulberry(seed * 977 + scenarioId.length)), POLICY_BY_ID[policyId], s.demand, { demos, foresight: foresight / 100 });
      sim.timeScale = speed;
      if (!first.current) sim.start();
      first.current = false;
    } else {
      const ents: EntDef[] = [
        cube('t1', 5.5, 5.5, '#ef4444', { label: 'Cube 1' }), cube('t2', 2.8, -4.4, '#22c55e', { label: 'Cube 2' }), cube('t3', 4.7, -12.3, '#facc15', { label: 'Cube 3' }), binE('tbin', 12, -11.5, '#14b8a6', 'Bin', 9, 9, 4),
      ];
      sim.loadFree([{ name: 'Leader', x: -15, z: 0, yaw: 0, variant: 'leader', color: '#14b8a6' }, { name: 'Follower', x: 15, z: 0, yaw: Math.PI, color: '#ff7a1a' }], ents, POLICY_BY_ID.human);
      const [lead, fol] = sim.arms;
      fol.mirror = lead;
      fol.auto = true;
      sim.log('Teleop sandbox: move the LEADER (teal) with the sliders – the FOLLOWER (orange) mirrors it. Close the gripper over a cube to pick it up.', 'sys');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, scenarioId, policyId, demos, foresight, seed, tick]);

  useEffect(() => { if (simRef.current) simRef.current.timeScale = speed; }, [speed]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [logs]);

  // teleop leader command
  useEffect(() => {
    const sim = simRef.current;
    if (mode !== 'teleop' || !sim || !sim.arms[0]) return;
    const a = sim.arms[0];
    const p = tl.pan * D2R;
    a.direct = { x: tl.r * Math.cos(p), y: tl.y, z: -tl.r * Math.sin(p), pitch: tl.pitch * D2R, roll: tl.roll * D2R, grip: tl.grip };
  }, [tl, mode]);

  // teleop telemetry + recording
  useEffect(() => {
    if (mode !== 'teleop') return;
    const id = setInterval(() => {
      const sim = simRef.current;
      if (!sim || sim.arms.length < 2) return;
      const j = (a: typeof sim.arms[0]) => [a.actual.pan * R2D, a.actual.a1 * R2D, (a.actual.a2 - a.actual.a1) * R2D, (a.actual.a3 - a.actual.a2) * R2D, a.actual.roll * R2D, a.actual.grip * 100];
      setJoints(j(sim.arms[1]));
      if (rec) recData.current.push({ t: Math.round(sim.time * 1000) / 1000, action: j(sim.arms[0]).map((v) => +v.toFixed(2)), state: j(sim.arms[1]).map((v) => +v.toFixed(2)) });
    }, 33);
    const id2 = setInterval(() => setRecCount(recData.current.length), 300);
    return () => { clearInterval(id); clearInterval(id2); };
  }, [mode, rec]);

  const preds = useMemo(() => POLICIES.map((p) => ({ p, v: predictSuccess(p, scn.demand, { demos, foresight: foresight / 100 }) })).sort((a, b) => b.v - a.v), [scn, demos, foresight]);

  const filtered = SCENARIOS.filter((s) => (cat === 'All' || s.category === cat) && (s.title + s.tagline + s.tags.join(' ')).toLowerCase().includes(query.toLowerCase()));

  const sim = simRef.current;
  const runPause = () => {
    if (!sim) return;
    if (hud.finished) { sim.load(scn.build(mulberry(seed * 977 + scenarioId.length)), pol, scn.demand, { demos, foresight: foresight / 100 }); setLogs([]); setReport(null); sim.timeScale = speed; sim.start(); return; }
    if (sim.running) sim.pause(); else sim.start();
  };
  const reset = (newSeed = false) => { if (newSeed) setSeed((s) => s + 1); else setTick((t) => t + 1); };
  const download = () => {
    const blob = new Blob([JSON.stringify({ fps: 30, task: 'teleop sandbox', frames: recData.current }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'so101_sim_episode.json'; a.click();
  };
  const preset = (p: Partial<typeof tl>) => setTl((t) => ({ ...t, ...p }));

  return (
    <div className="mx-auto max-w-[1700px] px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Playground</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Pick one of {SCENARIOS.length} use cases, choose which controller / model drives the arm(s), and watch how it behaves. Precision, speed, latency, retries and failure modes change with the model.
            <span className="text-amber-300/90"> Model behaviour is a calibrated heuristic, not a benchmark – use it to reason about trade-offs, then verify on hardware.</span>
          </p>
        </div>
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-1 text-sm">
          <button onClick={() => setMode('scenario')} className={`rounded-md px-3 py-1.5 ${mode === 'scenario' ? 'bg-orange-500 text-white' : 'text-slate-300'}`}>Use-case scenarios</button>
          <button onClick={() => setMode('teleop')} className={`rounded-md px-3 py-1.5 ${mode === 'teleop' ? 'bg-teal-500 text-white' : 'text-slate-300'}`}>Leader → Follower sandbox</button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)_380px]">
        {/* LEFT: scenario list */}
        <div className="order-2 flex max-h-[860px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] xl:order-1">
          {mode === 'scenario' ? (
            <>
              <div className="space-y-2 border-b border-white/10 p-3">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${SCENARIOS.length} use cases…`} className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none" />
                <div className="flex flex-wrap gap-1.5">
                  {['All', ...CATEGORIES].map((c) => (
                    <button key={c} onClick={() => setCat(c)} className={`rounded-full px-2.5 py-1 text-[11px] ${cat === c ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <ul className="flex-1 space-y-1 overflow-y-auto p-2">
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => setScenarioId(s.id)} className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${scenarioId === s.id ? 'bg-orange-500/20 ring-1 ring-orange-400/50' : 'hover:bg-white/5'}`}>
                      <span className="text-2xl leading-none">{s.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium text-white">{s.title}{s.arms === 2 && <span className="rounded bg-sky-500/20 px-1.5 text-[10px] text-sky-300">2 arms</span>}</span>
                        <span className="block text-[11px] leading-snug text-slate-400">{s.tagline}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && <li className="p-4 text-sm text-slate-500">No use case matches.</li>}
              </ul>
            </>
          ) : (
            <div className="space-y-3 p-4 text-sm text-slate-300">
              <h3 className="font-semibold text-white">How this sandbox maps to the real thing</h3>
              <p>This is the exact data-collection setup you will use at the hackathon: <b className="text-teal-300">leader</b> (you) → <b className="text-orange-300">follower</b> (the robot that does the work).</p>
              <ul className="list-disc space-y-1.5 pl-5 text-[13px]">
                <li>Sliders drive the leader’s tip in polar coordinates; inverse kinematics turns them into the 6 joint angles.</li>
                <li>The follower copies those joint positions with ~120 ms of servo lag.</li>
                <li>Close the gripper over a cube to grab it; open to release. Drop cubes in the bin.</li>
                <li><b>Record</b> logs state/action at 30 fps – exactly the columns of a LeRobot dataset – and you can download the episode.</li>
              </ul>
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-xs text-amber-200">Tip: vary where objects start in every real episode. Policies trained on 50 identical episodes memorise, they don’t generalise.</p>
            </div>
          )}
        </div>

        {/* CENTER: sim */}
        <div className="order-1 xl:order-2">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e16]">
            <div className="relative h-[56vh] min-h-[420px] xl:h-[640px]">
              <div ref={mountRef} className="absolute inset-0" />
              <div className="pointer-events-none absolute left-3 top-3 space-y-1 text-[11px]">
                <div className="rounded bg-black/60 px-2 py-1 font-mono text-slate-200">t = {hud.time.toFixed(1)} s {hud.score && mode === 'scenario' && <span className="ml-2 text-emerald-300">score {hud.score}</span>}</div>
                {hud.arms.map((a, i) => <div key={i} className="rounded bg-black/60 px-2 py-0.5 text-slate-300">{a}</div>)}
              </div>
              {mode === 'scenario' && !hud.running && !hud.finished && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <button onClick={runPause} className="rounded-2xl bg-orange-500 px-8 py-4 text-lg font-bold text-white shadow-2xl hover:bg-orange-400">▶ Run “{scn.title}” with {pol.short}</button>
                </div>
              )}
              {report && (
                <div className={`absolute bottom-3 left-3 right-3 rounded-xl border p-3 text-sm backdrop-blur ${report.success ? 'border-emerald-400/40 bg-emerald-900/60' : 'border-amber-400/40 bg-amber-900/50'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-white">{report.success ? '✅ Success' : '⚠ Partial / failed'} — {report.msg}</div>
                    <div className="font-mono text-xs text-slate-200">score {report.score}/{report.max} · {report.time.toFixed(1)} s · grasps {report.grasps} · misses {report.misses} · slips {report.slips} · retries {report.retries}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-white/[0.03] p-3 text-sm">
              {mode === 'scenario' && (
                <>
                  <button onClick={runPause} className="rounded-lg bg-orange-500 px-4 py-1.5 font-semibold text-white hover:bg-orange-400">{hud.finished ? '↻ Run again' : hud.running ? '❚❚ Pause' : '▶ Run'}</button>
                  <button onClick={() => reset(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-200 hover:bg-white/5">Reset</button>
                  <button onClick={() => reset(true)} className="rounded-lg border border-white/10 px-3 py-1.5 text-slate-200 hover:bg-white/5">🎲 New layout</button>
                  <div className="ml-2 flex items-center gap-1 text-xs text-slate-400">Speed
                    {[0.5, 1, 2, 4].map((s) => <button key={s} onClick={() => setSpeed(s)} className={`rounded px-2 py-1 ${speed === s ? 'bg-white/15 text-white' : 'hover:bg-white/5'}`}>{s}×</button>)}
                  </div>
                </>
              )}
              <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">Camera
                {(['iso', 'top', 'front', 'side'] as const).map((v) => <button key={v} onClick={() => sim?.setView(v)} className="rounded px-2 py-1 capitalize hover:bg-white/10">{v}</button>)}
              </div>
            </div>
          </div>

          {mode === 'teleop' && (
            <div className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2">
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-white">Leader arm (teal) controls</h3>
                {([['pan', 'Base pan', -90, 90, 1, '°'], ['r', 'Reach', 8, 26, 0.5, ' cm'], ['y', 'Height', 0.5, 24, 0.5, ' cm'], ['pitch', 'Wrist pitch', -90, 0, 1, '°'], ['roll', 'Wrist roll', -90, 90, 1, '°'], ['grip', 'Gripper', 0, 1, 0.01, '']] as const).map(([k, label, mn, mx, st, u]) => (
                  <label key={k} className="block text-xs text-slate-400">
                    <span className="flex justify-between"><span>{label}</span><span className="font-mono text-slate-200">{k === 'grip' ? `${Math.round(tl.grip * 100)} %` : `${(tl as any)[k]}${u}`}</span></span>
                    <input type="range" min={mn} max={mx} step={st} value={(tl as any)[k]} onChange={(e) => setTl({ ...tl, [k]: +e.target.value })} className="w-full accent-teal-400" />
                  </label>
                ))}
                <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
                  <button onClick={() => preset({ pan: 0, r: 15, y: 6, pitch: -90, roll: 0, grip: 1 })} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Home</button>
                  <button onClick={() => preset({ pan: 30, r: 11, y: 1.6, pitch: -90, grip: 1 })} className="rounded bg-red-500/30 px-2 py-1 hover:bg-red-500/50">Aim Cube 1</button>
                  <button onClick={() => preset({ pan: -20, r: 13, y: 1.6, pitch: -90, grip: 1 })} className="rounded bg-green-500/30 px-2 py-1 hover:bg-green-500/50">Aim Cube 2</button>
                  <button onClick={() => preset({ pan: -50, r: 16, y: 1.6, pitch: -90, grip: 1 })} className="rounded bg-yellow-500/30 px-2 py-1 hover:bg-yellow-500/50">Aim Cube 3</button>
                  <button onClick={() => preset({ pan: -75, r: 12, y: 7, pitch: -90 })} className="rounded bg-teal-500/30 px-2 py-1 hover:bg-teal-500/50">Over bin</button>
                  <button onClick={() => preset({ grip: 0.05 })} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Close gripper</button>
                  <button onClick={() => preset({ grip: 1 })} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Open gripper</button>
                  <button onClick={() => preset({ y: 12 })} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Lift</button>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Follower joint state <span className="font-normal text-slate-500">(= LeRobot observation.state)</span></h3>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
                  {['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper'].map((n, i) => (
                    <div key={n} className="flex justify-between rounded bg-black/30 px-2 py-1"><span className="text-slate-400">{n}</span><span className="text-orange-300">{joints[i].toFixed(1)}</span></div>
                  ))}
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
                  <div className="mb-2 flex items-center justify-between text-slate-300"><span>Episode recorder (30 fps)</span><span className="font-mono">{recCount} frames · {episodes} saved</span></div>
                  <div className="flex gap-2">
                    {!rec ? <button onClick={() => { recData.current = []; setRec(true); }} className="rounded bg-rose-500 px-3 py-1.5 font-semibold text-white hover:bg-rose-400">● Record</button>
                      : <button onClick={() => { setRec(false); setEpisodes((e) => e + 1); }} className="rounded bg-slate-600 px-3 py-1.5 font-semibold text-white">■ Stop</button>}
                    <button onClick={download} disabled={recData.current.length === 0} className="rounded border border-white/15 px-3 py-1.5 text-slate-200 hover:bg-white/5 disabled:opacity-40">Download JSON</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === 'scenario' && history.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="mb-2 text-sm font-semibold text-white">Run history <span className="font-normal text-slate-500">– compare models back-to-back</span></h3>
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-slate-500"><tr><th className="py-1">Use case</th><th>Model</th><th>Demos</th><th>Score</th><th>Time</th><th /></tr></thead>
                <tbody>{history.map((h, i) => (
                  <tr key={i} className="border-t border-white/5"><td className="py-1.5">{h.scenario}</td><td>{h.policy}</td><td>{h.demos}</td><td className="font-mono">{h.score}</td><td className="font-mono">{h.time.toFixed(1)}s</td><td>{h.ok ? '✅' : '⚠'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT: details */}
        <div className="order-3 space-y-4">
          {mode === 'scenario' && (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="text-4xl">{scn.emoji}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{scn.title}</h3>
                    <div className="text-[11px] uppercase tracking-wider text-orange-300">{scn.category} · {scn.arms === 2 ? 'dual-arm' : 'single arm'}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-200">{scn.desc}</p>
                <div className="mt-3 space-y-2 text-[13px]">
                  <p className="rounded-lg bg-violet-500/10 p-2 text-violet-100"><b>💡 Why it’s out-of-the-box:</b> {scn.novel}</p>
                  <p className="rounded-lg bg-emerald-500/10 p-2 text-emerald-100"><b>🌍 Real-world use:</b> {scn.real}</p>
                </div>
                <div className="mt-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">What this task demands</div>
                  <div className="space-y-1">
                    {SKILLS.filter((s) => (scn.demand[s.key] ?? 0) > 0).map((s) => (
                      <div key={s.key} className="flex items-center gap-2 text-[11px] text-slate-300" title={s.hint}>
                        <span className="w-24">{s.label}</span>
                        <div className="h-1.5 flex-1 rounded bg-white/10"><div className="h-full rounded bg-orange-400" style={{ width: `${(scn.demand[s.key] ?? 0) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-2 text-sm font-semibold text-white">Controller / model</h3>
                <select value={policyId} onChange={(e) => setPolicyId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none">
                  {POLICIES.map((p) => <option key={p.id} value={p.id}>{p.name} {p.params !== '—' ? `(${p.params})` : ''}</option>)}
                </select>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{pol.summary}</p>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[11px]">
                  <div className="rounded bg-black/30 p-1.5"><div className="text-slate-500">latency</div><div className="font-mono text-slate-200">{pol.latencyMs} ms</div></div>
                  <div className="rounded bg-black/30 p-1.5"><div className="text-slate-500">pos. error σ</div><div className="font-mono text-slate-200">{(pol.sigmaCm * 10).toFixed(1)} mm</div></div>
                  <div className="rounded bg-black/30 p-1.5"><div className="text-slate-500">retries</div><div className="font-mono text-slate-200">{pol.retries}</div></div>
                </div>
                <label className="mt-3 block text-xs text-slate-400">
                  <span className="flex justify-between"><span>Demonstrations collected for this task</span><span className="font-mono text-slate-200">{demos}</span></span>
                  <input type="range" min={0} max={200} step={5} value={demos} onChange={(e) => setDemos(+e.target.value)} className="w-full accent-orange-500" />
                </label>
                <label className="mt-2 block text-xs text-slate-400" title="Hypothetical: sample N candidate action chunks, imagine each with a Visionary-style world model, score with a reward model, execute the best one.">
                  <span className="flex justify-between"><span>🔮 World-model foresight (what-if)</span><span className="font-mono text-slate-200">{foresight}%</span></span>
                  <input type="range" min={0} max={100} step={10} value={foresight} onChange={(e) => setForesight(+e.target.value)} className="w-full accent-violet-500" />
                </label>
                {foresight > 0 && <p className="mt-1 text-[11px] text-violet-300">Hypothetical planner: better contact/long-horizon reliability, but a longer pause before each pick/place while it “imagines”.</p>}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-2 text-sm font-semibold text-white">Predicted success on “{scn.title}”</h3>
                <div className="space-y-1">
                  {preds.map(({ p, v }) => (
                    <button key={p.id} onClick={() => setPolicyId(p.id)} className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-[11px] hover:bg-white/5 ${p.id === policyId ? 'bg-white/10' : ''}`}>
                      <span className="w-20 shrink-0 truncate text-slate-300">{p.short}</span>
                      <span className="h-2 flex-1 rounded bg-white/10"><span className="block h-full rounded" style={{ width: `${v * 100}%`, background: p.color }} /></span>
                      <span className="w-9 text-right font-mono text-slate-200">{Math.round(v * 100)}%</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-500">Heuristic estimate from model traits × task demands × data volume. Not a benchmark.</p>
              </div>
            </>
          )}

          <div className="rounded-2xl border border-white/10 bg-black/40">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-slate-400"><span>Robot console</span><button onClick={() => setLogs([])} className="hover:text-white">clear</button></div>
            <div ref={logRef} className="h-56 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
              {logs.length === 0 && <div className="text-slate-600">waiting for events…</div>}
              {logs.map((l, i) => <div key={i} className={kindCls[l.k]}>{l.m}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
