import { useMemo, useState } from 'react';
import { Card, CodeBlock, H2, Pill } from './ui';

type Go = (page: string, o?: { policy?: string; scenario?: string }) => void;

function binom(n: number, k: number) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}
function bestOfN(p: number, N: number, a: number) {
  let s = 0;
  for (let k = 1; k <= N; k++) s += binom(N, k) * Math.pow(p, k) * Math.pow(1 - p, N - k) * (a + (1 - a) * (k / N));
  return s;
}

const PATTERNS = [
  { name: 'Dream-evaluate checkpoints', how: 'Roll each candidate policy inside the world model on held-out start states and rank them before touching hardware.', effort: 3, payoff: 4, risk: 'Model errors compound over long rollouts; needs fine-tuning to your cameras/workspace.', tone: 'emerald' as const },
  { name: 'Best-of-N imagination planner', how: 'Sample N action chunks from ACT / SmolVLA, imagine each future, score with a reward model (Robometer / TOPReward), execute the winner.', effort: 5, payoff: 5, risk: 'Adds seconds of latency; only as good as the scorer; most engineering of all options.', tone: 'violet' as const },
  { name: 'Synthetic-data flywheel', how: 'Generate imagined rollouts, filter with a reward model, add the good ones to fine-tuning data (and use DAgger corrections on real failures).', effort: 4, payoff: 3, risk: 'Physics hallucinations can poison data if you don’t filter hard.', tone: 'sky' as const },
  { name: 'Failure foresight / safety gate', how: 'Predict a few steps ahead and veto actions that the model imagines knocking things over or leaving the workspace.', effort: 3, payoff: 3, risk: 'False vetoes make the robot hesitant.', tone: 'amber' as const },
  { name: '“Robot imagination” demo overlay', how: 'Show the imagined video next to the real camera feed during the live demo. Judges instantly understand that the robot predicts consequences.', effort: 2, payoff: 4, risk: 'Only works if you can get working SO-101 weights or train/fine-tune your own.', tone: 'rose' as const },
];

const EXTRAS = [
  ['Robometer-4B / TOPReward', 'Zero-shot reward & progress models in LeRobot v0.6 – auto-label success, filter bad demos, drive best-of-N.', 'https://huggingface.co/blog/lerobot-release-v060'],
  ['VLA-JEPA · FastWAM · LingBot-VA', 'World-model policies in LeRobot v0.6 that learn to imagine the future during training – no separate simulator needed.', 'https://huggingface.co/blog/lerobot-release-v060'],
  ['lerobot-rollout --strategy dagger', 'Human-in-the-loop corrections: grab the leader arm the moment the policy errs, record, fine-tune, repeat.', 'https://huggingface.co/blog/lerobot-release-v060'],
  ['LeLab', 'Browser UI for calibrate → teleoperate → record → train → deploy on the SO-ARM101. Saves hours of CLI debugging.', 'https://github.com/huggingface/leLab'],
  ['Isaac Teleop (VR)', 'Teleoperate the SO-101 with a VR controller – useful if both of your robots are followers.', 'https://huggingface.co/docs/lerobot/v0.6.0/isaac_teleop'],
  ['strands-robots', 'Drive the arm from an LLM agent (“pick up the red block”) with MuJoCo twin, LeRobot and GR00T policy providers.', 'https://github.com/Vivek0712/robots'],
  ['ArmnetBench SO-101', '2,499 labelled episodes, 7 policies × 8 tasks – real numbers to calibrate your expectations and a ready-made reward-model training set.', 'https://huggingface.co/datasets/armnet/armnetbench_v01_lerobot_so101'],
  ['MolmoAct2 SO-100/101 dataset', 'The community SO-101 data that Visionary’s world model was trained on – also great pretraining data for your own policy.', 'https://huggingface.co/datasets/allenai/MolmoAct2-SO100_101-Dataset'],
];

const PHASES = [
  { n: 'Assemble, set IDs, calibrate, teleop sanity check', f: 0.12, c: 'bg-orange-500' },
  { n: 'Cameras, workspace, record 50 varied demos (ACT task)', f: 0.15, c: 'bg-amber-500' },
  { n: 'Train + deploy ACT baseline = guaranteed demo', f: 0.17, c: 'bg-emerald-500' },
  { n: 'VLA layer: MolmoAct2 zero-shot / SmolVLA fine-tune + language', f: 0.18, c: 'bg-sky-500' },
  { n: 'Second robot: bimanual / DAgger / leader as human fallback', f: 0.1, c: 'bg-indigo-500' },
  { n: 'Stretch: world-model foresight (Visionary-style) – time-boxed', f: 0.1, c: 'bg-violet-500' },
  { n: 'Demo hardening, backup video, pitch, slides', f: 0.18, c: 'bg-rose-500' },
];

export default function Strategy({ go }: { go: Go }) {
  const [p, setP] = useState(0.55);
  const [a, setA] = useState(0.8);
  const [tImg, setTImg] = useState(0.8);
  const [hours, setHours] = useState(36);
  const [N, setN] = useState(8);
  const curves = useMemo(() => [0.5, 0.7, 0.9, 1].map((acc) => ({ acc, pts: Array.from({ length: 16 }, (_, i) => [i + 1, bestOfN(p, i + 1, acc)] as [number, number]) })), [p]);
  const eff = bestOfN(p, N, a);
  const W = 520, Hh = 220, px = (x: number) => 36 + ((x - 1) / 15) * (W - 50), py = (y: number) => Hh - 24 - y * (Hh - 40);
  const colors = ['#f87171', '#fbbf24', '#34d399', '#a78bfa'];

  return (
    <div className="mx-auto max-w-[1300px] space-y-8 px-4 py-6">
      <H2 sub="An honest assessment of james0248/visionary for your SO-101 robots, and a battle plan for the hackathon.">Visionary & Hackathon Strategy</H2>

      {/* verdict */}
      <Card className="border-violet-400/30 bg-gradient-to-br from-violet-500/10 to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h3 className="text-xl font-bold text-white">Is Visionary relevant? <span className="text-violet-300">Yes – as a learned simulator, not as a controller.</span></h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              <b>visionary</b> is a research repo for “training general-purpose agents inside world models”, built on the <b>Dreamer 4</b> architecture (video tokenizer + action-conditioned dynamics model on a spatio-temporal transformer).
              Its <b>SO-101 world model</b> is a ~300 M-parameter model trained on community SO-101 datasets and co-trained on SOAR and BridgeData V2 so physics learned in data-rich fixed setups transfers to noisy SO-101 scenes.
              It shows rigid-body interactions (pushing objects with a tool), opening doors/shelves and handling cloth.
            </p>
          </div>
          <div className="min-w-[220px] rounded-xl bg-black/30 p-4 text-sm">
            <div className="mb-2 text-xs uppercase tracking-wider text-slate-400">Fit for your hackathon</div>
            {[['Relevance to SO-101', 5], ['Drop-in robot controller', 1], ['Wow-factor / story', 5], ['Integration risk', 4]].map(([l, v]) => (
              <div key={l as string} className="mb-1.5"><div className="flex justify-between text-xs text-slate-300"><span>{l}</span><span>{v}/5</span></div><div className="h-1.5 rounded bg-white/10"><div className="h-full rounded bg-violet-400" style={{ width: `${(v as number) * 20}%` }} /></div></div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-50"><b className="text-emerald-300">What it can do for you</b><ul className="mt-1 list-disc pl-4 text-[13px]"><li>Predict how the scene will change if the arm executes an action sequence.</li><li>Act as a cheap, parallel evaluator/“sim” for policies on your SO-101 scenes.</li><li>Back a best-of-N planner or generate extra training data.</li></ul></div>
          <div className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-50"><b className="text-rose-300">What it is NOT</b><ul className="mt-1 list-disc pl-4 text-[13px]"><li>Not a policy: it does not output joint commands from a task description.</li><li>Not plug-and-play with <code>lerobot-rollout</code>.</li><li>Its imagination drifts over long horizons and on scenes unlike its training data.</li></ul></div>
          <div className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-50"><b className="text-amber-300">Check before you commit</b><ul className="mt-1 list-disc pl-4 text-[13px]"><li>I could not confirm from the README whether the SO-101 weights are publicly downloadable – check the repo/Hub first.</li><li>Inference cost of a 300 M video model vs your GPU and latency budget.</li><li>Whether your camera angles match its training data (it expects community-style views).</li></ul></div>
        </div>
        <p className="mt-4 rounded-lg bg-black/30 p-3 text-sm text-slate-200"><b className="text-white">Would it improve your chances?</b> Only on top of a working baseline. Judges reward a reliable live demo, a clear problem and visible technical depth. Visionary adds depth and a great story (“our robot imagines the outcome before it moves”), but it adds integration risk. Treat it as a <b>time-boxed stretch goal (~10 % of your time)</b> after an ACT baseline and a VLA layer are solid, and keep a fallback you can run when the world model misbehaves on stage.</p>
      </Card>

      {/* patterns */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-white">Five ways to use a world model with your robots</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PATTERNS.map((x) => (
            <Card key={x.name}>
              <div className="flex items-start justify-between gap-2"><h4 className="font-semibold text-white">{x.name}</h4><Pill tone={x.tone}>payoff {x.payoff}/5</Pill></div>
              <p className="mt-2 text-sm text-slate-300">{x.how}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">effort {'●'.repeat(x.effort)}<span className="text-slate-700">{'●'.repeat(5 - x.effort)}</span></div>
              <p className="mt-1 text-xs text-slate-500">Risk: {x.risk}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* calculator */}
      <Card>
        <h3 className="text-lg font-semibold text-white">🔮 Imagine-before-acting calculator <span className="text-xs font-normal text-slate-500">(illustrative math, not a measurement)</span></h3>
        <p className="mt-1 text-sm text-slate-400">Your policy proposes N different action chunks, the world model imagines each outcome, a reward model scores them, and you execute the best. How much does that help?</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4 text-sm text-slate-300">
            <Sl label="Base policy success rate" v={p} set={setP} min={0.05} max={0.95} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} />
            <Sl label="Candidates N" v={N} set={setN} min={1} max={16} step={1} fmt={(v) => String(v)} />
            <Sl label="Scorer / world-model accuracy" v={a} set={setA} min={0} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} />
            <Sl label="Imagination time per candidate (s)" v={tImg} set={setTImg} min={0.1} max={3} step={0.1} fmt={(v) => `${v.toFixed(1)} s`} />
            <div className="rounded-xl bg-violet-500/10 p-4">
              <div className="text-xs text-slate-400">Effective success with planner</div>
              <div className="text-3xl font-bold text-violet-200">{Math.round(eff * 100)}%</div>
              <div className="text-xs text-slate-400">vs {Math.round(p * 100)}% without · decision latency ≈ {(N * tImg).toFixed(1)} s per chunk (sequential; parallel GPUs divide this)</div>
              <div className="mt-2 text-xs text-amber-200">{N * tImg > 6 ? '⚠ Too slow for contact-rich real-time tasks; fine for pick-and-place with pauses.' : eff - p < 0.05 ? 'Little gain – scorer is too weak or N too small.' : 'Reasonable trade-off for a slow, careful task.'}</div>
            </div>
          </div>
          <div>
            <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full rounded-xl bg-black/30">
              {[0, 0.25, 0.5, 0.75, 1].map((y) => <g key={y}><line x1={36} x2={W - 14} y1={py(y)} y2={py(y)} stroke="#1e293b" /><text x={4} y={py(y) + 3} fontSize="9" fill="#64748b">{Math.round(y * 100)}%</text></g>)}
              {[1, 4, 8, 12, 16].map((x) => <text key={x} x={px(x)} y={Hh - 8} fontSize="9" fill="#64748b" textAnchor="middle">N={x}</text>)}
              <line x1={36} x2={W - 14} y1={py(p)} y2={py(p)} stroke="#64748b" strokeDasharray="4 4" />
              {curves.map((c, i) => <polyline key={c.acc} fill="none" stroke={colors[i]} strokeWidth="2" points={c.pts.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')} />)}
              <circle cx={px(N)} cy={py(eff)} r="4" fill="#fff" />
            </svg>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">{curves.map((c, i) => <span key={c.acc}><span className="mr-1 inline-block h-2 w-4 rounded" style={{ background: colors[i] }} />scorer {Math.round(c.acc * 100)}%</span>)}<span><span className="mr-1 inline-block h-0 w-4 border-t border-dashed border-slate-500" />base policy</span></div>
            <p className="mt-2 text-xs text-slate-500">Takeaway: gains come almost entirely from <b>scorer quality</b>. A weak reward model barely beats the base policy no matter how many futures you imagine – so invest in Robometer/TOPReward validation first.</p>
          </div>
        </div>
      </Card>

      {/* integration sketch */}
      <Card>
        <h3 className="mb-2 text-lg font-semibold text-white">Integration sketch (pseudo-code)</h3>
        <CodeBlock label="best-of-N with a world model + reward model" code={`policy   = load_policy("YOUR/act_so101_task")          # ACT / SmolVLA via LeRobot
world    = load_world_model("visionary/so101")          # check weights availability!
reward   = load_reward("lerobot/Robometer-4B")          # progress / success scorer

while not done:
    obs    = robot.get_observation()                    # cameras + joint state
    chunks = [policy.sample_chunk(obs, temperature=0.7) for _ in range(N)]
    futures = world.rollout(obs.images, chunks)         # imagined video per chunk
    scores  = reward.score(futures, task="pick the red block")
    robot.execute(chunks[argmax(scores)])               # act, then re-observe`} />
      </Card>

      {/* plan */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Time plan for your hackathon</h3>
          <div className="flex items-center gap-2 text-sm text-slate-300">Length:
            {[24, 36, 48].map((h) => <button key={h} onClick={() => setHours(h)} className={`rounded-lg px-3 py-1 ${hours === h ? 'bg-orange-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}>{h} h</button>)}
          </div>
        </div>
        <div className="mb-4 flex h-3 overflow-hidden rounded-full">{PHASES.map((x) => <div key={x.n} className={x.c} style={{ width: `${x.f * 100}%` }} title={x.n} />)}</div>
        <ol className="space-y-2">
          {(() => { let t = 0; return PHASES.map((x, i) => { const d = x.f * hours; const s = t; t += d; return (
            <li key={x.n} className="flex items-center gap-3 text-sm"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${x.c}`} /><span className="w-28 shrink-0 font-mono text-xs text-slate-400">h{s.toFixed(1)} → h{t.toFixed(1)}</span><span className="text-slate-200">{i + 1}. {x.n}</span><span className="ml-auto text-xs text-slate-500">{d.toFixed(1)} h</span></li>
          ); }); })()}
        </ol>
        <p className="mt-3 text-xs text-slate-500">Rule of thumb: freeze features at ~80 % of the clock. Everything after that is reliability work and rehearsal.</p>
      </Card>

      {/* two robots */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-lg font-semibold text-white">What to do with your TWO robots</h3>
          <ul className="space-y-3 text-sm text-slate-300">
            <li><Pill tone="emerald">Case A · leader + follower</Pill><p className="mt-1">The standard kit. The leader is your data-collection and <b>DAgger-correction</b> device; the follower does the autonomous work. Keep the leader hand-ready on stage as an instant human fallback.</p></li>
            <li><Pill tone="sky">Case B · two followers</Pill><p className="mt-1">You can do bimanual work (handover, co-lift, barista – see Playground), but you need a way to teleoperate: ask the organisers for a leader, 3-D print/build one (leader gearing differs!), or use VR (Isaac Teleop). Bimanual data is 2× harder to collect – only pick it if the story demands it.</p></li>
            <li><Pill tone="violet">Case C · mix</Pill><p className="mt-1">Follower #1 runs the autonomous policy; follower #2 is a second “camera-holder/fixture” arm that presents objects or holds a wrist camera at the right angle – a cheap way to look dramatically more advanced.</p></li>
          </ul>
          <button onClick={() => go('playground', { scenario: 'handover' })} className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400">Try the dual-arm demos →</button>
        </Card>
        <Card>
          <h3 className="mb-2 text-lg font-semibold text-white">Judging checklist</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {['A problem a human recognises in 10 seconds (pick from the Playground “real-world use” lines).', 'A live autonomous run that works 4 out of 5 times – measure it, show the number.', 'One clearly novel idea (e.g. world-model foresight, language-driven multi-task, bimanual).', 'A visible failure-recovery story: retry, DAgger correction, human takeover.', 'Honest metrics: success rate over ≥ 20 rollouts, with failure categories.', 'A recorded backup video of the best run, in case hardware misbehaves.', 'Safety: clamp max_relative_target, clear workspace, power switch within reach.'].map((x, i) => <li key={i} className="flex gap-2"><span className="text-emerald-400">✓</span>{x}</li>)}
          </ul>
        </Card>
      </div>

      {/* extras */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-white">Other models & tools worth pulling in</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {EXTRAS.map(([t, d, l]) => (
            <a key={t} href={l} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-orange-400/40 hover:bg-white/[0.06]">
              <div className="font-semibold text-white">{t} <span className="text-slate-500">↗</span></div>
              <p className="mt-1 text-xs text-slate-400">{d}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sl({ label, v, set, min, max, step, fmt }: { label: string; v: number; set: (n: number) => void; min: number; max: number; step: number; fmt: (n: number) => string }) {
  return (
    <label className="block text-xs text-slate-400">
      <span className="flex justify-between"><span>{label}</span><span className="font-mono text-slate-200">{fmt(v)}</span></span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(+e.target.value)} className="w-full accent-violet-500" />
    </label>
  );
}
