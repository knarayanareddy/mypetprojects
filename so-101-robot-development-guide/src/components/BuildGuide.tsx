import { useEffect, useState } from 'react';
import { ASSEMBLY, BOM_TOTAL, BOM_TWO_ARMS, PRINT_SETTINGS, SETUP_COMMANDS, TROUBLESHOOTING } from '../robot/partsInfo';
import { Card, CodeBlock, H2, Pill } from './ui';

type Go = (page: string, o?: { policy?: string; scenario?: string }) => void;

const STAGES = [
  { id: 'source', t: 'Source parts' },
  { id: 'print', t: 'Print' },
  { id: 'software', t: 'Install & configure' },
  { id: 'assemble', t: 'Assemble' },
  { id: 'calibrate', t: 'Calibrate & teleop' },
  { id: 'ai', t: 'Record · train · deploy' },
];

export default function BuildGuide({ go }: { go: Go }) {
  const [done, setDone] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('so101-checklist') ?? '{}'); } catch { return {}; } });
  useEffect(() => { try { localStorage.setItem('so101-checklist', JSON.stringify(done)); } catch { /* ignore */ } }, [done]);
  const items = [
    ...BOM_TWO_ARMS.map((b) => 'bom:' + b.part),
    ...PRINT_SETTINGS.map((p) => 'print:' + p[0]),
    ...SETUP_COMMANDS.slice(0, 4).map((c) => 'cmd:' + c.title),
    ...ASSEMBLY.map((a) => 'asm:' + a.title),
    ...SETUP_COMMANDS.slice(4).map((c) => 'cmd:' + c.title),
  ];
  const n = items.filter((i) => done[i]).length;
  const tog = (k: string) => setDone((d) => ({ ...d, [k]: !d[k] }));
  const Check = ({ k }: { k: string }) => (
    <button onClick={() => tog(k)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${done[k] ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-white/25 text-transparent hover:border-white/50'}`}>✓</button>
  );

  return (
    <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-6">
      <H2 sub={<>Condensed from the official <a className="underline" href="https://huggingface.co/docs/lerobot/en/so101" target="_blank" rel="noreferrer">LeRobot SO-101 guide</a> and the <a className="underline" href="https://github.com/TheRobotStudio/SO-ARM100" target="_blank" rel="noreferrer">SO-ARM100 repo</a>, with a progress checklist that is saved in your browser.</>}>Build & Setup Guide</H2>

      <Card>
        <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-white">Your progress</span><span className="font-mono text-slate-300">{n}/{items.length}</span></div>
        <div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-400 transition-all" style={{ width: `${(n / items.length) * 100}%` }} /></div>
        <div className="mt-3 flex flex-wrap gap-2">{STAGES.map((s, i) => <a key={s.id} href={`#${s.id}`} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10">{i + 1}. {s.t}</a>)}</div>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-xl bg-black/30 p-3"><div className="text-xs text-slate-500">Follower arm</div><div className="text-slate-200">6 × STS3215, all 1/345 gearing – needs torque to carry itself and a payload.</div></div>
          <div className="rounded-xl bg-black/30 p-3"><div className="text-xs text-slate-500">Leader arm</div><div className="text-slate-200">6 × STS3215 with 3 gear ratios (1/191, 1/345, 1/147) so it holds its weight yet moves with a light touch.</div></div>
          <div className="rounded-xl bg-black/30 p-3"><div className="text-xs text-slate-500">Software</div><div className="text-slate-200">Everything runs through 🤗 LeRobot: setup-motors, calibrate, teleoperate, record, train, rollout.</div></div>
        </div>
      </Card>

      <section id="source" className="scroll-mt-20 space-y-3">
        <h3 className="text-lg font-semibold text-white">1 · Source the parts <Pill tone="orange">leader + follower</Pill></h3>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-slate-500"><tr><th /><th className="py-1">Part</th><th>Qty</th><th>Unit (US)</th><th>Notes</th></tr></thead>
            <tbody>{BOM_TWO_ARMS.map((b) => (
              <tr key={b.part} className="border-t border-white/5 text-slate-300"><td className="py-2 pr-2"><Check k={'bom:' + b.part} /></td><td>{b.part}</td><td className="font-mono">{b.qty}</td><td className="font-mono">{b.cost}</td><td className="text-xs text-slate-500">{b.note}</td></tr>
            ))}</tbody>
          </table>
          <p className="mt-3 text-sm text-slate-300">Total: <b className="text-white">{BOM_TOTAL}</b>. The 7.4 V servos are sufficient for most tasks; the 12 V (30 kg·cm) option needs a 12 V / 5 A+ supply. At the hackathon the arms are provided – use this list to check nothing is missing from the box.</p>
        </Card>
      </section>

      <section id="print" className="scroll-mt-20 space-y-3">
        <h3 className="text-lg font-semibold text-white">2 · Print the parts <span className="text-xs font-normal text-slate-500">(skip if printed arms are provided)</span></h3>
        <Card>
          <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
            {PRINT_SETTINGS.map(([k, v]) => <div key={k} className="flex items-start gap-3"><Check k={'print:' + k} /><div><dt className="text-xs text-slate-500">{k}</dt><dd className="text-slate-200">{v}</dd></div></div>)}
          </dl>
          <p className="mt-3 text-xs text-slate-400">Print the “Leader” and “Follower” variants – they differ at the gripper/handle and in the leader’s motor mounts. Add optional upgrades: compliant TPU gripper, wrist-camera mount, overhead camera mount, raised leader base.</p>
        </Card>
      </section>

      <section id="software" className="scroll-mt-20 space-y-3">
        <h3 className="text-lg font-semibold text-white">3 · Install LeRobot & configure motors</h3>
        {SETUP_COMMANDS.slice(0, 3).map((c) => (
          <Card key={c.title}>
            <div className="mb-1 flex items-center gap-3"><Check k={'cmd:' + c.title} /><h4 className="font-semibold text-white">{c.title}</h4></div>
            <p className="mb-2 text-sm text-slate-400">{c.why}</p>
            <CodeBlock code={c.code} />
          </Card>
        ))}
        <Card className="border-amber-400/30 bg-amber-400/[0.05]">
          <p className="text-sm text-amber-100"><b>Motor-ID sequence:</b> the script asks for <b>gripper (6) → wrist_roll (5) → wrist_flex (4) → elbow_flex (3) → shoulder_lift (2) → shoulder_pan (1)</b>. Plug in only one motor at a time. When finished, daisy-chain the motors and connect shoulder_pan to the controller board. Do the leader the same way with <code>--teleop.type=so101_leader</code>.</p>
        </Card>
      </section>

      <section id="assemble" className="scroll-mt-20 space-y-3">
        <h3 className="flex flex-wrap items-center gap-3 text-lg font-semibold text-white">4 · Assemble joint by joint <button onClick={() => go('exploded')} className="rounded-lg bg-orange-500 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-400">Open 3D exploded view →</button></h3>
        <div className="space-y-3">
          {ASSEMBLY.map((a) => (
            <Card key={a.title}>
              <div className="mb-2 flex items-center gap-3"><Check k={'asm:' + a.title} /><h4 className="font-semibold text-white">{a.title}</h4></div>
              <ul className="list-disc space-y-1 pl-9 text-sm text-slate-300">{a.actions.map((x, i) => <li key={i}>{x}</li>)}</ul>
              {a.warn && <p className="ml-9 mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-xs text-amber-200">⚠ {a.warn}</p>}
            </Card>
          ))}
        </div>
        <Card><p className="text-sm text-slate-300"><b className="text-white">Screw cheat-sheet:</b> M2×6 mm = motor bodies (smallest). M3×6 mm = horns and printed-part joints. Over-tightening cracks PLA – snug is enough.</p></Card>
      </section>

      <section id="calibrate" className="scroll-mt-20 space-y-3">
        <h3 className="text-lg font-semibold text-white">5 · Calibrate & teleoperate</h3>
        {SETUP_COMMANDS.slice(3, 5).map((c) => (
          <Card key={c.title}>
            <div className="mb-1 flex items-center gap-3"><Check k={'cmd:' + c.title} /><h4 className="font-semibold text-white">{c.title}</h4></div>
            <p className="mb-2 text-sm text-slate-400">{c.why}</p>
            <CodeBlock code={c.code} />
          </Card>
        ))}
        <Card><p className="text-sm text-slate-300">Calibration is what lets a policy trained on one arm work on another: both arms report the <i>same numbers</i> in the same physical pose. Do the “middle of range” pose carefully, then sweep every joint through its full range except the roll joint, which spins freely.</p>
          <button onClick={() => go('playground', {})} className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/5">Rehearse in the Leader → Follower sandbox →</button></Card>
      </section>

      <section id="ai" className="scroll-mt-20 space-y-3">
        <h3 className="text-lg font-semibold text-white">6 · Record · train · deploy</h3>
        {SETUP_COMMANDS.slice(5).map((c) => (
          <Card key={c.title}>
            <div className="mb-1 flex items-center gap-3"><Check k={'cmd:' + c.title} /><h4 className="font-semibold text-white">{c.title}</h4></div>
            <p className="mb-2 text-sm text-slate-400">{c.why}</p>
            <CodeBlock code={c.code} />
          </Card>
        ))}
        <div className="grid gap-3 md:grid-cols-2">
          <Card><h4 className="mb-2 font-semibold text-white">Data-collection rules that matter</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300"><li>≈ 50 episodes per task as a starting point.</li><li>Vary object position/orientation on purpose.</li><li>Fix camera positions; add a wrist camera.</li><li>Keep the task string identical at record and rollout time.</li><li>Trim idle frames; delete bad episodes.</li><li>Good lighting; avoid shiny/transparent objects at first.</li></ul></Card>
          <Card><h4 className="mb-2 font-semibold text-white">Safety on the day</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300"><li>Keep Ctrl+C and the power plug within reach.</li><li>Stop immediately on reversed motion or joint-limit buzzing.</li><li>Use max_relative_target clamps for diffusion/VLA policies.</li><li>Clamp both bases; keep fingers out of the gripper.</li><li>Test checkpoint loading before letting it move the arm.</li></ul></Card>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Troubleshooting</h3>
        <Card className="divide-y divide-white/5 p-0">
          {TROUBLESHOOTING.map(([q, a]) => <div key={q} className="p-4"><div className="text-sm font-semibold text-white">{q}</div><p className="mt-1 text-sm text-slate-400">{a}</p></div>)}
        </Card>
      </section>
    </div>
  );
}
