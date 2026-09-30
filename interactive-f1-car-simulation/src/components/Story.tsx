import { PARTS } from "../data/parts";
import { ARRIVAL, BEATS, IDX, PART_COUNT } from "../lib/timeline";
import { cn } from "../utils/cn";

const PHASE = {
  skin: { label: "Skin", color: "#ff4d4d" },
  muscle: { label: "Muscle", color: "#ffb020" },
  skeleton: { label: "Skeleton", color: "#36d6ff" },
};

function Card({ side, children, wide }: { side: "left" | "right" | "center"; children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed z-20 inset-x-3 bottom-3 md:inset-x-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2",
        side === "left" && "md:left-10 lg:left-16",
        side === "right" && "md:right-14 lg:right-20",
        side === "center" && "md:left-1/2 md:-translate-x-1/2 md:top-auto md:bottom-14 md:translate-y-0",
      )}
    >
      <div
        className={cn(
          "card-in glass relative max-h-[52vh] overflow-hidden rounded-2xl p-4 md:max-h-none md:p-7",
          wide ? "md:w-[560px]" : "md:w-[430px]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function PartCard({ i }: { i: number }) {
  const p = PARTS[i];
  const ph = PHASE[p.phase];
  const left = i % 2 === 0;
  return (
    <Card side={left ? "left" : "right"}>
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: ph.color }} />
      <div className="flex items-start justify-between">
        <span
          className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: ph.color, borderColor: ph.color + "66", background: ph.color + "14" }}
        >
          {ph.label} layer
        </span>
        <span className="stroke-text font-display text-5xl font-extrabold italic leading-none md:text-6xl">{p.n}</span>
      </div>
      <h2 className="mt-3 font-display text-3xl font-bold uppercase leading-[0.95] tracking-wide text-white md:text-[2.6rem]">
        {p.name}
      </h2>
      <p className="mt-2 font-display text-lg font-medium italic text-white/80 md:text-xl">{p.tagline}</p>
      <p className="mt-3 text-[13.5px] leading-relaxed text-white/65 md:text-sm">{p.body}</p>
      <div className="mt-4 hidden grid-cols-2 gap-2 sm:grid">
        {p.stats.map((s) => (
          <div key={s.k} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">{s.k}</div>
            <div className="font-display text-lg font-semibold leading-tight text-white">{s.v}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 hidden border-t border-white/10 pt-3 text-[12px] italic leading-snug text-white/45 md:block">
        <span className="mr-1.5 not-italic" style={{ color: ph.color }}>
          ◆
        </span>
        {p.fact}
      </p>
    </Card>
  );
}

function Layers({ phase, t }: { phase: "skeleton" | "muscle" | "skin"; t: number }) {
  const ids = ARRIVAL[phase];
  const n = ids.length;
  return (
    <ul className="mt-4 space-y-1.5">
      {ids.map((id, k) => {
        const st = n > 1 ? (k * (1 - 0.42)) / (n - 1) : 0;
        const done = t > 0.04 + (st + 0.42) * 0.86;
        const part = PARTS.find((p) => p.id === id)!;
        return (
          <li key={id} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border text-[9px] transition-all",
                done ? "border-transparent text-black" : "border-white/25 text-transparent",
              )}
              style={{ background: done ? PHASE[phase].color : "transparent" }}
            >
              ✓
            </span>
            <span className={cn("transition-colors", done ? "text-white" : "text-white/40")}>{part.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

function LayerRail({ beat }: { beat: number }) {
  const items: { k: "skeleton" | "muscle" | "skin"; idx: number }[] = [
    { k: "skeleton", idx: IDX.skeleton },
    { k: "muscle", idx: IDX.muscle },
    { k: "skin", idx: IDX.skin },
  ];
  return (
    <div className="pointer-events-none fixed left-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex">
      {items.map((it, i) => {
        const active = beat === it.idx;
        const done = beat > it.idx;
        return (
          <div key={it.k} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full border transition-all"
              style={{
                borderColor: PHASE[it.k].color,
                background: active || done ? PHASE[it.k].color : "transparent",
                boxShadow: active ? `0 0 14px ${PHASE[it.k].color}` : "none",
              }}
            />
            <span
              className={cn(
                "font-display text-xs font-semibold uppercase tracking-[0.2em] transition-colors",
                active ? "text-white" : "text-white/30",
              )}
            >
              0{i + 1} {PHASE[it.k].label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TourRail({ beat }: { beat: number }) {
  const cur = beat - IDX.tour0;
  return (
    <div className="pointer-events-none fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-[7px] md:flex">
      {Array.from({ length: PART_COUNT }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          {i === cur && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/70">{PARTS[i].name.split(" ")[0]}</span>
          )}
          <span
            className="block h-[3px] rounded-full transition-all"
            style={{
              width: i === cur ? 26 : 10,
              background: i === cur ? PHASE[PARTS[i].phase].color : "rgba(255,255,255,0.22)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function Story({ beat, t }: { beat: number; t: number }) {
  const b = BEATS[beat];
  const kind = b.kind;
  return (
    <>
      {/* hero */}
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-20 flex flex-col justify-between px-5 pb-8 pt-24 transition-all duration-700 md:px-14 md:pb-12",
          kind === "hero" ? "opacity-100" : "translate-y-6 opacity-0",
        )}
      >
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#ff5a4a]">
            ◼ Anatomy of a Formula 1 car
          </p>
          <h1 className="mt-3 font-display text-[clamp(3.2rem,10.5vw,9.5rem)] font-extrabold italic uppercase leading-[0.82] tracking-tight text-white">
            A car,
            <br />
            <span className="stroke-text">in pieces.</span>
          </h1>
        </div>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <p className="max-w-md text-[15px] leading-relaxed text-white/65 md:text-base">
            Sixteen parts hang in front of you. <b className="text-white">Scroll</b> and each one flies out and explains
            itself. Keep going and the car rebuilds: skeleton, then muscle, then skin. Then it enters a wind tunnel where
            you take control of the air.
          </p>
          <div className="bob flex flex-col items-center gap-2 self-center md:self-auto">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">Scroll</span>
            <span className="block h-10 w-6 rounded-full border border-white/40">
              <span className="mx-auto mt-2 block h-2 w-1 rounded-full bg-white" />
            </span>
          </div>
        </div>
      </div>

      {kind === "tour" && b.part !== undefined && (
        <>
          <PartCard key={"p" + b.part} i={b.part} />
          <TourRail beat={beat} />
        </>
      )}

      {kind === "rebuildIntro" && (
        <Card side="center" wide>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff5a4a]">The reverse</p>
          <h2 className="mt-1 font-display text-4xl font-extrabold italic uppercase leading-none text-white md:text-6xl">
            Now, rebuild it.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65 md:text-base">
            Every race car is assembled in three layers, like a body. First the bones that carry every load, then the
            muscles that create and control the power, and finally the skin that shapes the air.
          </p>
          <div className="mt-4 flex gap-2">
            {(["skeleton", "muscle", "skin"] as const).map((k, i) => (
              <span
                key={k}
                className="rounded-full border px-3 py-1 font-display text-sm font-semibold uppercase tracking-[0.14em]"
                style={{ color: PHASE[k].color, borderColor: PHASE[k].color + "66", background: PHASE[k].color + "14" }}
              >
                0{i + 1} {PHASE[k].label}
              </span>
            ))}
          </div>
        </Card>
      )}

      {(kind === "skeleton" || kind === "muscle" || kind === "skin") && (
        <>
          <LayerRail beat={beat} />
          <Card key={kind} side={kind === "muscle" ? "left" : "right"}>
            <div className="absolute inset-y-0 left-0 w-1" style={{ background: PHASE[kind].color }} />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: PHASE[kind].color }}>
              Layer {kind === "skeleton" ? "01" : kind === "muscle" ? "02" : "03"} of 03
            </p>
            <h2 className="mt-1 font-display text-5xl font-extrabold italic uppercase leading-none text-white md:text-6xl">
              {PHASE[kind].label}
            </h2>
            <p className="mt-2 font-display text-xl font-medium italic text-white/80">
              {kind === "skeleton" && "Structure first."}
              {kind === "muscle" && "Power, energy, control."}
              {kind === "skin" && "Wrap it in air."}
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/65 md:text-sm">
              {kind === "skeleton" &&
                "The floor, survival cell, suspension and halo come together first. Everything else bolts onto these, and they decide how the car survives a 50 g impact."}
              {kind === "muscle" &&
                "The power unit, battery, gearbox, cooling, fuel and brakes drop into the chassis, then the driver. This is the part that turns fuel and electricity into motion."}
              {kind === "skin" &&
                "Sidepods, wings and tyres wrap the machine. They look like decoration, but every surface is sculpted to bend air into downforce."}
            </p>
            <Layers phase={kind} t={t} />
          </Card>
        </>
      )}

      {kind === "complete" && (
        <Card side="center" wide>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff5a4a]">Assembled</p>
          <h2 className="mt-1 font-display text-4xl font-extrabold italic uppercase leading-none text-white md:text-6xl">
            One car. 798 kg. 5.6 metres.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65 md:text-base">
            At 300 km/h it makes more downforce than it weighs. In theory it could drive upside-down on a ceiling. Let's
            see how, in the wind tunnel.
          </p>
        </Card>
      )}

      {kind === "tunnelIn" && (
        <Card side="center" wide>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#36d6ff]">Next</p>
          <h2 className="mt-1 font-display text-4xl font-extrabold italic uppercase leading-none text-white md:text-6xl">
            Into the wind tunnel.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65 md:text-base">
            The belt is rolling, the fan is spooling up. You control speed, weather, wing angles, ride height and traffic.
            Watch the air respond.
          </p>
        </Card>
      )}
    </>
  );
}

export function TopNav({
  beat,
  onJump,
  barRef,
}: {
  beat: number;
  onJump: (idx: number) => void;
  barRef: React.RefObject<HTMLDivElement | null>;
}) {
  const sec = beat >= IDX.tunnelIn ? 2 : beat >= IDX.rebuildIntro ? 1 : 0;
  const items = [
    { label: "Teardown", idx: 0 },
    { label: "Rebuild", idx: IDX.rebuildIntro },
    { label: "Wind tunnel", idx: IDX.tunnel },
  ];
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="pointer-events-auto flex items-center gap-2"
        >
          <span className="block h-4 w-4 -skew-x-12 bg-[#ff2b2b]" />
          <span className="font-display text-xl font-extrabold italic uppercase tracking-[0.12em] text-white">
            Teardown
          </span>
        </button>
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-md">
          {items.map((it, i) => (
            <button
              key={it.label}
              type="button"
              onClick={() => onJump(it.idx)}
              className={cn(
                "rounded-full px-3 py-1.5 font-display text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors md:px-4",
                sec === i ? "bg-white text-black" : "text-white/60 hover:text-white",
              )}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[2px] w-full bg-white/5">
        <div ref={barRef} className="h-full origin-left bg-[#ff2b2b]" style={{ transform: "scaleX(0)" }} />
      </div>
    </div>
  );
}
