import { useMemo, useState } from 'react';
import { POLICIES, SKILLS, predictSuccess } from '../sim/policies';
import { SCENARIOS } from '../sim/scenarios';
import { Card, CodeBlock, H2, Pill } from './ui';

type Go = (page: string, o?: { policy?: string; scenario?: string }) => void;

const heat = (v: number) => {
  const h = Math.round(v * 120); // 0 red → 120 green
  return `hsl(${h} 70% ${18 + v * 14}%)`;
};

export default function Models({ go }: { go: Go }) {
  const [demos, setDemos] = useState(50);
  const [fore, setFore] = useState(0);
  const [sel, setSel] = useState('act');
  const sp = POLICIES.find((p) => p.id === sel)!;
  const real = POLICIES.filter((p) => p.id !== 'oracle' && p.id !== 'human');

  // model chooser
  const [gpu, setGpu] = useState<'none' | 'mid' | 'big'>('mid');
  const [tasks, setTasks] = useState<'one' | 'few' | 'many'>('one');
  const [lang, setLang] = useState(false);
  const [novel, setNovel] = useState(false);
  const [hours, setHours] = useState<'small' | 'big'>('small');

  const rec = useMemo(() => {
    const scored = real.map((p) => {
      let s = 0;
      const why: string[] = [];
      const heavy = ['pi0', 'pi05', 'groot', 'molmoact2'].includes(p.id);
      if (gpu === 'none') { if (p.id === 'act') { s += 4; why.push('trains on Apple-silicon/small GPU or HF Jobs, runs on CPU'); } if (heavy) s -= 4; }
      if (gpu === 'mid') { if (heavy && p.id !== 'molmoact2') s -= 2; if (['act', 'smolvla', 'evo1', 'mtdit', 'diffusion'].includes(p.id)) s += 1; }
      if (gpu === 'big') { if (heavy) { s += 1.5; why.push('you have the VRAM for a 3 B+ foundation model'); } }
      if (tasks === 'one') { if (p.id === 'act') { s += 3; why.push('single task: ACT is the most reliable with ~50 demos'); } }
      if (tasks !== 'one') { s += p.skills.language * 3; if (p.id === 'mtdit') { s += 1.5; why.push('one checkpoint, many tasks via language'); } if (p.id === 'act') s -= 2; }
      if (lang) { s += p.skills.language * 4; if (p.skills.language > 0.65) why.push('follows natural-language instructions'); }
      if (novel) { s += p.skills.generalization * 4; if (p.skills.generalization > 0.75) why.push('best generalisation to unseen objects'); s += p.zeroShot * 6; if (p.zeroShot > 0.3) why.push('works zero-shot while your model trains'); }
      if (hours === 'small') { s -= p.dataNeed / 60; s += p.skills.precision * 1.2; }
      if (hours === 'big') s += p.skills.contact * 1.5;
      return { p, s, why };
    }).sort((a, b) => b.s - a.s);
    return scored.slice(0, 3);
  }, [gpu, tasks, lang, novel, hours, real]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-6">
      <H2 sub="Every policy family that has a documented path onto the SO-101 through LeRobot, how it behaves, what it needs, and how it would perform on each of the 25 playground use cases.">AI Models & how the robot performs with each</H2>

      <Card className="border-amber-400/30 bg-amber-400/[0.06]">
        <p className="text-sm text-amber-100">
          <b>Read this first:</b> the “skill” scores and success predictions below are <b>illustrative heuristics</b> encoding published qualitative findings (e.g. ACT is the most reliable grasper with ~50 demos but can’t generalise; SmolVLA handles novel shapes but is less precise;
          Diffusion Policy is data-hungry; MolmoAct 2 works zero-shot on SO-100/101). They are not measured results. For real numbers see the open
          {' '}<a className="underline" href="https://huggingface.co/datasets/armnet/armnetbench_v01_lerobot_so101" target="_blank" rel="noreferrer">ArmnetBench v0.1 SO-101 dataset</a>
          {' '}(8 tasks × 7 policies with human-labelled successes) and run <code className="rounded bg-black/30 px-1">lerobot-eval</code> yourself. Flags in the commands may shift between LeRobot releases – confirm in each model’s doc page.
        </p>
      </Card>

      {/* chooser */}
      <Card>
        <h3 className="mb-3 text-lg font-semibold text-white">🧭 Which model should I use at the hackathon?</h3>
        <div className="grid gap-3 text-sm md:grid-cols-5">
          <Sel label="Compute" value={gpu} set={setGpu} opts={[['none', 'Laptop / Mac only'], ['mid', 'One 12–24 GB GPU or HF Jobs'], ['big', '24 GB+ / multi-GPU']]} />
          <Sel label="How many tasks?" value={tasks} set={setTasks} opts={[['one', 'One polished task'], ['few', '2–4 tasks'], ['many', 'Many / open-ended']]} />
          <Sel label="Demo-recording time" value={hours} set={setHours} opts={[['small', '≤ 2 hours'], ['big', 'Plenty']]} />
          <label className="flex items-center gap-2 pt-5 text-slate-300"><input type="checkbox" checked={lang} onChange={(e) => setLang(e.target.checked)} className="accent-orange-500" /> Need language commands</label>
          <label className="flex items-center gap-2 pt-5 text-slate-300"><input type="checkbox" checked={novel} onChange={(e) => setNovel(e.target.checked)} className="accent-orange-500" /> Unseen objects on stage</label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {rec.map((r, i) => (
            <div key={r.p.id} className={`rounded-xl border p-3 ${i === 0 ? 'border-orange-400/50 bg-orange-500/10' : 'border-white/10 bg-black/20'}`}>
              <div className="flex items-center justify-between"><span className="font-semibold text-white">{i + 1}. {r.p.name}</span>{i === 0 && <Pill tone="orange">best fit</Pill>}</div>
              <ul className="mt-1 list-disc pl-4 text-xs text-slate-300">{(r.why.length ? r.why : [r.p.bestFor]).slice(0, 3).map((w, j) => <li key={j}>{w}</li>)}</ul>
              <button onClick={() => { setSel(r.p.id); document.getElementById('model-detail')?.scrollIntoView({ behavior: 'smooth' }); }} className="mt-2 text-xs text-orange-300 hover:underline">details →</button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Pro tip: always run the <b>two-model strategy</b> – a boring, reliable ACT checkpoint for the guaranteed demo, plus a VLA (MolmoAct 2 zero-shot / SmolVLA fine-tune) for the “wow, it understood me” moment.</p>
      </Card>

      {/* zoo */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-white">Model zoo</h3>
        <div className="mb-4 flex flex-wrap gap-2">
          {real.map((p) => (
            <button key={p.id} onClick={() => setSel(p.id)} className={`rounded-full border px-3 py-1 text-sm ${sel === p.id ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'}`} style={{ borderLeft: `4px solid ${p.color}` }}>{p.short}</button>
          ))}
        </div>
        <Card>
          <div id="model-detail" className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xl font-bold text-white">{sp.name}</h4>
                <Pill tone="sky">{sp.family}</Pill><Pill>{sp.params}</Pill>
              </div>
              <p className="mt-2 text-sm text-slate-200">{sp.summary}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-emerald-500/10 p-3"><div className="mb-1 text-xs font-semibold uppercase text-emerald-300">Strengths</div><ul className="list-disc pl-4 text-sm text-emerald-50/90">{sp.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                <div className="rounded-xl bg-rose-500/10 p-3"><div className="mb-1 text-xs font-semibold uppercase text-rose-300">Weaknesses</div><ul className="list-disc pl-4 text-sm text-rose-50/90">{sp.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                <div><span className="text-slate-500">Inference:</span> {sp.hz}</div>
                <div><span className="text-slate-500">Hardware:</span> {sp.hardware}</div>
                <div><span className="text-slate-500">Data to reach ~63 % potential:</span> ≈ {sp.dataNeed} demos</div>
                <div><span className="text-slate-500">Zero-shot success:</span> {Math.round(sp.zeroShot * 100)} %</div>
              </div>
              <p className="mt-3 text-sm"><span className="text-slate-500">Best for:</span> <b className="text-orange-200">{sp.bestFor}</b></p>
              <div className="mt-3"><CodeBlock code={sp.cmd} label="starting point (verify flags in docs)" /></div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <button onClick={() => go('playground', { policy: sp.id })} className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-400">Try {sp.short} in the playground →</button>
                <a href={sp.link} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-4 py-2 text-slate-200 hover:bg-white/5">Docs / model card ↗</a>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-white">Capability profile</div>
              <div className="space-y-2">
                {SKILLS.map((s) => (
                  <div key={s.key} title={s.hint}>
                    <div className="flex justify-between text-xs text-slate-400"><span>{s.label}</span><span className="font-mono">{Math.round(sp.skills[s.key] * 100)}</span></div>
                    <div className="h-2 rounded bg-white/10"><div className="h-full rounded" style={{ width: `${sp.skills[s.key] * 100}%`, background: sp.color }} /></div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-500">latency</div><div className="font-mono text-base text-white">{sp.latencyMs}ms</div></div>
                <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-500">pos. error</div><div className="font-mono text-base text-white">{(sp.sigmaCm * 10).toFixed(1)}mm</div></div>
                <div className="rounded-lg bg-black/30 p-2"><div className="text-slate-500">retries</div><div className="font-mono text-base text-white">{sp.retries}</div></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* skills matrix */}
      <Card>
        <h3 className="mb-3 text-lg font-semibold text-white">Capability matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-center text-xs">
            <thead><tr className="text-slate-400"><th className="p-2 text-left">Model</th>{SKILLS.map((s) => <th key={s.key} className="p-2" title={s.hint}>{s.label}</th>)}<th className="p-2">Latency</th><th className="p-2">Params</th></tr></thead>
            <tbody>
              {POLICIES.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="p-2 text-left"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} /><button onClick={() => { setSel(p.id); document.getElementById('model-detail')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-slate-100 hover:underline">{p.name}</button></td>
                  {SKILLS.map((s) => <td key={s.key} className="p-1"><div className="rounded py-1 font-mono text-white" style={{ background: heat(p.skills[s.key]) }}>{Math.round(p.skills[s.key] * 100)}</div></td>)}
                  <td className="p-2 font-mono text-slate-300">{p.latencyMs} ms</td><td className="p-2 text-slate-300">{p.params}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* heatmap */}
      <Card>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">How each model performs on each use case</h3>
            <p className="text-xs text-slate-400">Predicted task success. Click any cell to open that exact pairing in the Playground and watch it run.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-300">
            <label>Demos: <span className="font-mono">{demos}</span><input type="range" min={0} max={200} step={5} value={demos} onChange={(e) => setDemos(+e.target.value)} className="ml-2 w-32 align-middle accent-orange-500" /></label>
            <label>🔮 Foresight: <span className="font-mono">{fore}%</span><input type="range" min={0} max={100} step={10} value={fore} onChange={(e) => setFore(+e.target.value)} className="ml-2 w-28 align-middle accent-violet-500" /></label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-[3px] text-center text-[10px]">
            <thead>
              <tr>
                <th />
                {SCENARIOS.map((s) => <th key={s.id} className="w-9 min-w-9 pb-1 align-bottom" title={s.title}><div className="text-base leading-none">{s.emoji}</div></th>)}
                <th className="pl-2 text-slate-400">avg</th>
              </tr>
            </thead>
            <tbody>
              {POLICIES.map((p) => {
                const vals = SCENARIOS.map((s) => predictSuccess(p, s.demand, { demos, foresight: fore / 100 }));
                const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap pr-2 text-left text-xs text-slate-200"><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />{p.short}</td>
                    {vals.map((v, i) => (
                      <td key={i}><button onClick={() => go('playground', { policy: p.id, scenario: SCENARIOS[i].id })} title={`${p.short} × ${SCENARIOS[i].title}: ${Math.round(v * 100)}%`} className="h-8 w-9 rounded font-mono text-white hover:ring-2 hover:ring-white/60" style={{ background: heat(v) }}>{Math.round(v * 100)}</button></td>
                    ))}
                    <td className="pl-2 font-mono text-sm text-white">{Math.round(avg * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid gap-x-6 gap-y-1 text-[11px] text-slate-400 sm:grid-cols-2 lg:grid-cols-5">
          {SCENARIOS.map((s) => <div key={s.id}>{s.emoji} {s.title}</div>)}
        </div>
        <div className="mt-4 rounded-lg bg-black/30 p-3 text-xs text-slate-300">
          <b className="text-white">Reading the map:</b> with few demos <b>ACT</b> dominates narrow precision tasks (pills, plugs, dominoes); <b>π0.5 / MolmoAct 2 / SmolVLA</b> win whenever novelty, language or reasoning matter (recycling, dig-out, shelf fetch);
          <b> bimanual</b> tasks favour ACT’s ALOHA heritage; and sliding Demos to 0 shows why only zero-shot models (MolmoAct 2) survive a surprise task.
        </div>
      </Card>
    </div>
  );
}

function Sel<T extends string>({ label, value, set, opts }: { label: string; value: T; set: (v: T) => void; opts: [T, string][] }) {
  return (
    <label className="block text-xs text-slate-400">
      {label}
      <select value={value} onChange={(e) => set(e.target.value as T)} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-sm text-white focus:border-orange-400 focus:outline-none">
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
