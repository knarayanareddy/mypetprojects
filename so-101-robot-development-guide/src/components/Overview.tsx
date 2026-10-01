import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RobotModel, Stage, D2R } from '../robot/model';
import { SCENARIOS } from '../sim/scenarios';
import { POLICIES } from '../sim/policies';
import { PART_INFO } from '../robot/partsInfo';
import { Card } from './ui';

type Go = (page: string, o?: { policy?: string; scenario?: string }) => void;

function HeroRobot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = new Stage(ref.current!, { bg: '#0a0e16' });
    const m = new RobotModel('follower');
    stage.scene.add(m.root);
    const leader = new RobotModel('leader');
    leader.root.position.set(-34, 0, 0);
    stage.scene.add(leader.root);
    m.root.position.set(14, 0, 0);
    const grid = new THREE.GridHelper(140, 28, 0x2a3446, 0x182030);
    stage.scene.add(grid);
    stage.camera.position.set(10, 38, 72);
    stage.controls.target.set(-9, 12, 0);
    stage.controls.autoRotate = true;
    stage.controls.autoRotateSpeed = 0.8;
    stage.controls.enablePan = false;
    let t = 0;
    stage.onFrame = (dt) => {
      t += dt;
      const p = { pan: Math.sin(t * 0.7) * 0.5, a1: (72 + Math.sin(t * 0.9) * 18) * D2R, a2: (-10 + Math.sin(t * 1.3) * 28) * D2R, a3: (-65 + Math.sin(t * 1.1) * 25) * D2R, roll: Math.sin(t * 0.8) * 1.2, grip: 0.5 + 0.5 * Math.sin(t * 1.7) };
      m.setPose(p);
      leader.setPose({ ...p, grip: p.grip });
    };
    return () => stage.dispose();
  }, []);
  return <div ref={ref} className="absolute inset-0" />;
}

export default function Overview({ go }: { go: Go }) {
  const tiles = [
    { page: 'exploded', t: 'Exploded 3-D View', d: `Orbit an interactive exploded model with ${PART_INFO.length} labelled parts; every part explained with specs, fasteners and build tips.`, c: 'from-orange-500/20' },
    { page: 'build', t: 'Build & Setup Guide', d: 'Bill of materials, print settings, motor IDs, calibration, teleop, recording, training and deployment – with copy-paste commands and a checklist.', c: 'from-emerald-500/20' },
    { page: 'playground', t: `Playground · ${SCENARIOS.length} use cases`, d: 'Simulate unconventional applications – barista, domino setter, xylophone duet, rescue dig-out – and choose which AI model drives the arms.', c: 'from-sky-500/20' },
    { page: 'models', t: `AI Models · ${POLICIES.length - 2} policies`, d: 'ACT, Diffusion, SmolVLA, π0, π0.5, GR00T N1.7, MolmoAct 2, Multitask DiT, EVO-1 – compare behaviour on every use case.', c: 'from-violet-500/20' },
    { page: 'strategy', t: 'Visionary & Strategy', d: 'Is the Visionary world model worth it? How to use your two robots, a time plan, and a judging checklist.', c: 'from-rose-500/20' },
  ];
  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(56,189,248,0.15),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-[1400px] items-center gap-6 px-4 py-10 lg:grid-cols-2">
          <div>
            <span className="rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-200">Hackathon companion · SO-101 leader + follower</span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl">Understand it. Build it.<br /><span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">Simulate 25 wild ideas</span> before you touch it.</h1>
            <p className="mt-4 max-w-xl text-slate-300">
              Everything you need for the SO-101 robotic-arm hackathon in one place: an exploded 3-D teardown, a complete build & calibration guide, a browser-based robot playground with out-of-the-box use cases, and a comparison of the AI models that can drive the arms.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => go('playground')} className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400">Open the Playground →</button>
              <button onClick={() => go('exploded')} className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white hover:bg-white/5">See the exploded view</button>
            </div>
            <div className="mt-8 grid max-w-lg grid-cols-4 gap-3 text-center">
              {[[PART_INFO.length, 'parts explained'], [SCENARIOS.length, 'use cases'], [POLICIES.length - 2, 'AI policies'], ['2', 'robots, 2 modes']].map(([n, l]) => (
                <div key={l as string} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-2xl font-bold text-white">{n}</div><div className="text-[11px] text-slate-400">{l}</div></div>
              ))}
            </div>
          </div>
          <div className="relative h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-[#0a0e16] shadow-2xl">
            <HeroRobot />
            <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2 text-[11px]"><span className="rounded bg-teal-500/80 px-2 py-0.5 text-white">leader</span><span className="rounded bg-orange-500/80 px-2 py-0.5 text-white">follower</span><span className="rounded bg-black/50 px-2 py-0.5 text-slate-300">drag to orbit</span></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {tiles.map((t) => (
            <button key={t.page} onClick={() => go(t.page)} className={`group rounded-2xl border border-white/10 bg-gradient-to-br ${t.c} to-transparent p-5 text-left transition hover:-translate-y-0.5 hover:border-white/30`}>
              <h3 className="font-semibold text-white">{t.t}</h3>
              <p className="mt-2 text-sm text-slate-400">{t.d}</p>
              <span className="mt-3 inline-block text-sm text-orange-300 group-hover:translate-x-1 transition">open →</span>
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-lg font-semibold text-white">Quick answers</h3>
            <dl className="space-y-3 text-sm">
              <div><dt className="font-semibold text-orange-200">Is the Visionary world model relevant?</dt><dd className="text-slate-300">Yes, but as a learned <i>simulator / evaluator / planner</i> for the SO-101 – not as a controller. Use it as a time-boxed stretch goal on top of a reliable ACT or VLA baseline. <button onClick={() => go('strategy')} className="text-orange-300 underline">Full analysis</button></dd></div>
              <div><dt className="font-semibold text-orange-200">Which model should I run first?</dt><dd className="text-slate-300">ACT on one task (≈ 50 demos) is the safest guaranteed demo; MolmoAct 2 runs zero-shot on SO-100/101 for a language “wow”. <button onClick={() => go('models')} className="text-orange-300 underline">Compare all</button></dd></div>
              <div><dt className="font-semibold text-orange-200">What about my previous project?</dt><dd className="text-slate-300">The repository page listed only folder names (no readable source), so this app was rebuilt from scratch with a physically-motivated kinematic model, 25 scenarios, model profiles and a teleop sandbox.</dd></div>
            </dl>
          </Card>
          <Card>
            <h3 className="mb-3 text-lg font-semibold text-white">Playground highlights</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {SCENARIOS.slice(0, 25).filter((_, i) => [3, 5, 6, 11, 14, 19, 21, 22, 24, 17].includes(i)).map((s) => (
                <button key={s.id} onClick={() => go('playground', { scenario: s.id })} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-left hover:bg-white/10"><span className="text-xl">{s.emoji}</span><span className="text-slate-200">{s.title}</span></button>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
