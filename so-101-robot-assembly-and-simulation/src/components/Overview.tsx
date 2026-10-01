import { ALL_SCENARIOS } from '../scenarios';

interface Props {
  go: (tab: 'exploded' | 'build' | 'playground', scenario?: string) => void;
}

function HeroArm() {
  return (
    <svg viewBox="0 0 540 380" className="h-full w-full">
      <defs>
        <linearGradient id="amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#f59e0b" stopOpacity="0.28" />
          <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="270" cy="190" rx="260" ry="180" fill="url(#glow)" />
      {/* grid floor */}
      <g stroke="#334155" strokeWidth="1" opacity="0.6">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={40 + i * 55} y1="334" x2={110 + i * 40} y2="372" />
        ))}
        <line x1="40" y1="334" x2="500" y2="334" />
      </g>
      {/* base */}
      <rect x="100" y="300" width="130" height="24" rx="9" fill="url(#amber)" />
      <rect x="132" y="262" width="62" height="42" rx="9" fill="#1d2025" />
      <rect x="140" y="226" width="44" height="42" rx="12" fill="#fbbf24" />
      {/* upper arm */}
      <line x1="162" y1="248" x2="282" y2="140" stroke="url(#amber)" strokeWidth="30" strokeLinecap="round" />
      <line x1="162" y1="248" x2="282" y2="140" stroke="#fde68a" strokeWidth="6" strokeLinecap="round" opacity="0.6" />
      <circle cx="162" cy="248" r="20" fill="#1d2025" stroke="#e5e7eb" strokeWidth="3" />
      <circle cx="282" cy="140" r="20" fill="#1d2025" stroke="#e5e7eb" strokeWidth="3" />
      {/* forearm + gripper, swinging gently */}
      <g>
        <animateTransform attributeName="transform" type="rotate" values="0 282 140; 7 282 140; -3 282 140; 0 282 140" dur="6s" repeatCount="indefinite" />
        <line x1="282" y1="140" x2="418" y2="176" stroke="url(#amber)" strokeWidth="26" strokeLinecap="round" />
        <line x1="282" y1="140" x2="418" y2="176" stroke="#fde68a" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
        <circle cx="418" cy="176" r="17" fill="#1d2025" stroke="#e5e7eb" strokeWidth="3" />
        <g>
          <animateTransform attributeName="transform" type="rotate" values="0 418 176; 14 418 176; 0 418 176" dur="4s" repeatCount="indefinite" />
          <rect x="426" y="162" width="44" height="30" rx="8" fill="#1d2025" />
          <circle cx="470" cy="177" r="9" fill="#fbbf24" />
          <g>
            <line x1="470" y1="177" x2="508" y2="150" stroke="#fbbf24" strokeWidth="11" strokeLinecap="round">
              <animate attributeName="y2" values="150;160;150" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="x2" values="508;510;508" dur="2.4s" repeatCount="indefinite" />
            </line>
            <line x1="470" y1="190" x2="508" y2="212" stroke="#f97316" strokeWidth="11" strokeLinecap="round" />
          </g>
        </g>
      </g>
      {/* joint tags */}
      {[
        ['J1', 160, 296],
        ['J2', 162, 214],
        ['J3', 282, 104],
        ['J4', 418, 140],
        ['J5', 444, 232],
        ['J6', 520, 120],
      ].map(([t, x, y]) => (
        <g key={t as string}>
          <rect x={(x as number) - 14} y={(y as number) - 10} width="28" height="20" rx="10" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
          <text x={x as number} y={(y as number) + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fbbf24" fontFamily="ui-monospace, monospace">
            {t}
          </text>
        </g>
      ))}
    </svg>
  );
}

const PLAN = [
  ['Hour 0–1', 'Unbox, check parts against the BOM, find ports, set motor IDs on both arms.'],
  ['Hour 1–3', 'Assemble follower and leader (joint by joint). Test every motor before closing it up.'],
  ['Hour 3–4', 'Calibrate, teleoperate, fix any mirrored / reversed joints. Mount cameras.'],
  ['Hour 4–8', 'Pick ONE use case from the Playground. Record 30–50 clean demonstrations.'],
  ['Hour 8–12', 'Train an ACT policy, evaluate, record recovery data where it fails.'],
  ['Final hour', 'Rehearse the demo 5×. Have a scripted fallback ready – judges love a robot that works.'],
];

export default function Overview({ go }: Props) {
  const categories = Array.from(new Set(ALL_SCENARIOS.map((s) => s.category)));
  return (
    <div className="mx-auto max-w-[1300px] px-4 pb-16">
      {/* hero */}
      <section className="grid items-center gap-6 pb-10 pt-10 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
            🤗 LeRobot · SO-101 · hackathon companion
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
            Explode it. Build it.
            <br />
            <span className="bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">Simulate {ALL_SCENARIOS.length} wild ideas.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
            Everything you need for your two SO-101 arms in one place: a 3D exploded view that explains every part, a step-by-step setup and build guide, and a playground where virtual twins of your robots try out
            {' '}
            {ALL_SCENARIOS.length - 2} novel use cases – before you burn a single hackathon hour on the wrong idea.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => go('exploded')} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300">
              Open the exploded view
            </button>
            <button onClick={() => go('playground')} className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
              Jump into the playground →
            </button>
          </div>
          <dl className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['6', 'servo joints'],
              ['17', 'explained parts'],
              [String(ALL_SCENARIOS.length), 'use cases'],
              ['≈36 cm', 'reach (incl. gripper)'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <dt className="text-xl font-bold text-white">{n}</dt>
                <dd className="text-[11px] uppercase tracking-wider text-slate-400">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="aspect-[540/380] w-full rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-2">
          <HeroArm />
        </div>
      </section>

      {/* three pillars */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            t: '1 · Exploded view',
            d: 'Orbit a real 3D model of the follower or leader arm. Slide it apart, click any numbered part and learn what it does, which screws hold it and what to watch out for.',
            b: 'Explore the parts',
            tab: 'exploded' as const,
            e: '🔩',
          },
          {
            t: '2 · Build & set-up',
            d: 'From installing LeRobot and setting motor IDs to assembling every joint, calibrating and recording your first dataset. Copy-paste commands, a progress tracker and BOM included.',
            b: 'Follow the guide',
            tab: 'build' as const,
            e: '🛠️',
          },
          {
            t: '3 · Playground',
            d: 'Two virtual arms with working inverse kinematics, grasping, stacking and sound. Run scripted demos, or take over with sliders and clicks – and even record teleop episodes.',
            b: 'Play with the robots',
            tab: 'playground' as const,
            e: '🕹️',
          },
        ].map((c) => (
          <button key={c.t} onClick={() => go(c.tab)} className="group rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-5 text-left transition hover:border-amber-400/40">
            <div className="text-3xl">{c.e}</div>
            <h3 className="mt-3 text-lg font-semibold text-white">{c.t}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{c.d}</p>
            <span className="mt-3 inline-block text-sm font-medium text-amber-300 transition group-hover:translate-x-1">{c.b} →</span>
          </button>
        ))}
      </section>

      {/* use-case mosaic */}
      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">{ALL_SCENARIOS.length} things your arms can do</h2>
            <p className="text-sm text-slate-400">From robotic pianists to zero-gravity satellite capture. Click any card to run it.</p>
          </div>
        </div>
        {categories.map((cat) => (
          <div key={cat} className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{cat}</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {ALL_SCENARIOS.filter((s) => s.category === cat).map((s) => (
                <button key={s.id} onClick={() => go('playground', s.id)} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-amber-400/40 hover:bg-white/[0.07]">
                  <span className="text-2xl leading-none">{s.emoji}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{s.title}</span>
                    <span className="block text-xs leading-snug text-slate-400">{s.tagline}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* plan */}
      <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold text-white">A realistic hackathon game plan</h2>
        <p className="text-sm text-slate-400">Adapt to your event length – the order matters more than the hours.</p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {PLAN.map(([t, d], i) => (
            <li key={t} className="flex gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900">{i + 1}</span>
              <div>
                <div className="text-sm font-semibold text-white">{t}</div>
                <div className="text-xs leading-relaxed text-slate-400">{d}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
