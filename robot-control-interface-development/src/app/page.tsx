import Link from "next/link";
import ExplodedView from "@/components/ExplodedView";
import { SCENARIOS } from "@/lib/scenarios";

const CARDS = [
  { href: "/explode", icon: "🧩", title: "Exploded view", text: "All 17 parts of the follower and leader arm, with what each does, screws, gear ratios and assembly order." },
  { href: "/build", icon: "🛠️", title: "Build & setup", text: "Parts → motor IDs → assembly → calibration → teleop → dataset → training → deployment, with copy-paste commands." },
  { href: "/playground", icon: "🎮", title: `${SCENARIOS.length}-use-case playground`, text: "Two simulated arms perform piano, drums, Connect-4, EV charging, shell games… switch the model and watch behaviour change." },
  { href: "/models", icon: "🧠", title: "Model hub", text: "ACT, Diffusion, SmolVLA, π0/π0.5, GR00T, MolmoAct 2, Visionary — compared per use case. Register and load your own." },
  { href: "/control", icon: "🕹️", title: "Control center", text: "Drive the real arms from the browser over Web Serial: calibrate, teleop leader→follower, give instructions, run models." },
  { href: "/strategy", icon: "🏆", title: "Hackathon strategy", text: "Is Visionary relevant? Sensors to get, a 24-hour plan, risk list and what to demo to win." },
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 opacity-90">
          <ExplodedView compact />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#070a12] via-[#070a12]/80 to-transparent" />
        <div className="relative mx-auto flex min-h-[520px] max-w-[1500px] items-center px-6 py-16">
          <div className="max-w-xl">
            <span className="chip !border-[#ff7a1a]/60 !text-[#ffb36b]">Hackathon edition · 2 × SO-101</span>
            <h1 className="mt-4 text-5xl font-extrabold leading-tight tracking-tight">
              Build it. Simulate it. <span className="text-[#ff7a1a]">Operate it.</span>
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              One workspace for your SO-101 arms: an interactive exploded view, a step-by-step build guide, a playground with {SCENARIOS.length} unusual use cases, a model hub, and a browser-based control center that talks straight to the servos.
            </p>
            <div className="pointer-events-auto mt-7 flex flex-wrap gap-3">
              <Link href="/playground" className="btn btn-primary !px-5 !py-2.5 !text-base">
                Open the playground
              </Link>
              <Link href="/control" className="btn !px-5 !py-2.5 !text-base">
                Control the robots →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="card group p-5 transition hover:border-[#ff7a1a]/60">
            <div className="text-3xl">{c.icon}</div>
            <div className="mt-2 text-lg font-semibold group-hover:text-[#ff7a1a]">{c.title}</div>
            <p className="mt-1 text-sm text-slate-400">{c.text}</p>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-[1500px] px-6 pb-12">
        <h2 className="mb-3 text-xl font-bold">All {SCENARIOS.length} use cases</h2>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <Link key={s.id} href={`/playground?scenario=${s.id}`} className="chip !px-3 !py-1.5 !text-sm hover:!border-[#ff7a1a]">
              {s.emoji} {s.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
