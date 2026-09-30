import type { RefObject } from "react";
import { CHAPTERS, SEASONS, HOURS, ROOMS } from "../scene/layout";
import { useApp } from "../ctx";
import { FloorPlan } from "./FloorPlan";

const NAV = [
  { id: "architecture", label: "Architecture" },
  { id: "materials", label: "Materials" },
  { id: "joinery", label: "Joinery" },
  { id: "gardens", label: "Gardens" },
  { id: "rooms", label: "Rooms" },
  { id: "inquire", label: "Inquire" },
];

export function Header({
  inspecting,
  sound,
  onInspect,
  onSound,
  onNav,
}: {
  inspecting: boolean;
  sound: boolean;
  onInspect: () => void;
  onSound: () => void;
  onNav: (id: string) => void;
}) {
  const btn =
    "eyebrow flex items-center gap-2 rounded-full border border-white/70 px-3.5 py-2 text-white transition hover:bg-white hover:text-black";
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 text-white mix-blend-difference sm:px-8 sm:py-5">
      <button className="pointer-events-auto flex items-baseline gap-3" onClick={() => onNav("top")} aria-label="Seijaku home">
        <span className="font-serif text-[26px] leading-none tracking-tight">Seijaku</span>
        <span className="font-jp text-sm opacity-80">静寂</span>
      </button>
      <nav className="pointer-events-auto hidden items-center gap-7 lg:flex">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => onNav(n.id)} className="eyebrow opacity-70 transition hover:opacity-100">
            {n.label}
          </button>
        ))}
      </nav>
      <div className="pointer-events-auto flex items-center gap-2">
        <button className={btn + (inspecting ? " bg-white !text-black" : "")} onClick={onInspect} aria-pressed={inspecting}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3 3 8l9 5 9-5-9-5Z M3 8v8l9 5 9-5V8 M12 13v8" />
          </svg>
          <span className="hidden sm:inline">{inspecting ? "Return to walk" : "Inspect model"}</span>
          <span className="sm:hidden">{inspecting ? "Walk" : "Inspect"}</span>
        </button>
        <button className={btn + (sound ? " bg-white !text-black" : "")} onClick={onSound} aria-pressed={sound}>
          <span className="relative flex h-2 w-2">
            {sound && <span className="pulse-ring absolute inset-0 rounded-full bg-current" />}
            <span className="relative h-2 w-2 rounded-full bg-current" />
          </span>
          <span className="hidden sm:inline">Ambience</span>
          <span className="sm:hidden">Sound</span>
        </button>
      </div>
    </header>
  );
}

export function WalkHUD({
  chapter,
  inspecting,
  cutaway,
  heroRef,
  onCutaway,
  onResetView,
  onExit,
  onToast,
}: {
  chapter: number;
  inspecting: boolean;
  cutaway: boolean;
  heroRef: RefObject<HTMLDivElement | null>;
  onCutaway: () => void;
  onResetView: () => void;
  onExit: () => void;
  onToast?: () => void;
}) {
  const { season, setSeason, hour, setHour, jumpKf } = useApp();
  const ch = CHAPTERS[chapter];
  void onToast;

  return (
    <>
      {/* hero */}
      <div ref={heroRef} className={`pointer-events-none fixed inset-x-0 top-[17vh] z-30 px-6 text-center text-white sm:px-10 ${inspecting ? "opacity-0" : ""}`} style={{ textShadow: "0 2px 30px rgba(0,0,0,.35)" }}>
        <p className="eyebrow rise mb-5 opacity-80" style={{ animationDelay: "0.2s" }}>
          A continuous walk through a Kyoto residence
        </p>
        <h1 className="rise font-serif text-[clamp(72px,17vw,220px)] leading-[0.85] tracking-[-0.03em]" style={{ animationDelay: "0.35s" }}>
          Seijaku
        </h1>
        <p className="rise mt-4 font-jp text-[clamp(18px,2.4vw,30px)] tracking-[0.5em] opacity-90" style={{ animationDelay: "0.55s" }}>
          静寂
        </p>
        <div className="rise mt-10 flex flex-col items-center gap-2 opacity-80" style={{ animationDelay: "0.8s" }}>
          <span className="eyebrow">Scroll to enter</span>
          <svg className="drift" width="14" height="22" viewBox="0 0 14 22" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M7 1v18M1 13l6 7 6-7" />
          </svg>
        </div>
      </div>

      {/* chapter caption */}
      {!inspecting && (
        <div key={chapter} className="rise glass pointer-events-none fixed bottom-[132px] left-4 right-4 z-30 rounded-2xl p-5 text-white sm:bottom-[184px] sm:left-6 sm:right-auto sm:max-w-[400px] sm:p-6" style={{ animationDelay: "0.05s" }}>
          <div className="eyebrow mb-3 flex items-center gap-3 opacity-70">
            <span>{String(chapter + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}</span>
            <span className="h-px w-8 bg-white/50" />
            <span className="font-jp normal-case tracking-[0.2em]">{ch.jp}</span>
          </div>
          <h2 className="font-serif text-[34px] leading-none tracking-tight sm:text-[40px]">{ch.title}</h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/80">{ch.body}</p>
          {ch.hint && (
            <p className="eyebrow mt-4 flex items-center gap-2 text-[10px] text-[#f0b79f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f0b79f]" />
              {ch.hint}
            </p>
          )}
        </div>
      )}

      {/* chapter dots */}
      {!inspecting && (
        <ol className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-3.5 sm:flex">
          {CHAPTERS.map((c, i) => (
            <li key={c.id}>
              <button onClick={() => jumpKf(c.kf)} className="group flex items-center gap-3" aria-label={`Go to ${c.title}`}>
                <span className={`eyebrow translate-x-2 text-[10px] text-white opacity-0 transition group-hover:translate-x-0 group-hover:opacity-90 ${i === chapter ? "!opacity-90 !translate-x-0" : ""}`} style={{ textShadow: "0 1px 10px rgba(0,0,0,.5)" }}>
                  {c.title}
                </span>
                <span className={`block rounded-full border border-white/80 transition-all ${i === chapter ? "h-2.5 w-2.5 bg-white" : "h-1.5 w-1.5 bg-transparent group-hover:bg-white/80"}`} />
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* minimap */}
      <div className={`glass fixed left-5 z-30 hidden w-[min(400px,42vw)] rounded-2xl p-3 text-white transition-all duration-500 sm:block sm:left-6 ${inspecting ? "top-[76px]" : "bottom-5"}`}>
        <div className="eyebrow mb-1.5 flex items-center justify-between px-1 text-[9.5px] opacity-70">
          <span>{inspecting ? "Plan · focus a room" : "Plan · click a room"}</span>
          <span className="font-jp normal-case tracking-widest">{ch.jp}</span>
        </div>
        <FloorPlan
          variant="mini"
          activeId={ch.id === "pond" ? "pond" : ROOMS.find((r) => r.id === ch.id)?.id}
          onPick={(kf, id) => jumpKf(kf, id)}
        />
      </div>

      {/* atmosphere */}
      {(
        <div className={`glass fixed z-30 flex flex-col gap-2 rounded-2xl p-3 text-white transition-all duration-500 sm:left-auto sm:right-6 sm:w-[300px] ${inspecting ? "right-4 top-[76px]" : "bottom-4 left-4 right-4 sm:bottom-5"}`}>
          <div className="grid grid-cols-4 gap-1.5">
            {SEASONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSeason(s.id)}
                aria-pressed={season === s.id}
                className={`group flex flex-col items-center rounded-xl py-1.5 transition ${season === s.id ? "bg-white text-black" : "hover:bg-white/15"}`}
              >
                <span className="font-jp text-lg leading-none">{s.jp}</span>
                <span className="eyebrow mt-1 text-[8.5px] opacity-80">{s.en}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {HOURS.map((h) => (
              <button
                key={h.id}
                onClick={() => setHour(h.id)}
                aria-pressed={hour === h.id}
                className={`eyebrow rounded-lg py-1.5 text-[9px] transition ${hour === h.id ? "bg-white/90 text-black" : "text-white/80 hover:bg-white/15"}`}
              >
                {h.en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* inspection controls */}
      {inspecting && (
        <div className="rise glass fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 flex-col items-center gap-3 rounded-2xl p-4 text-white sm:bottom-6 sm:w-auto sm:flex-row sm:gap-5 sm:px-6">
          <div className="text-center sm:text-left">
            <p className="eyebrow text-[10px] text-[#f0b79f]">Inspection mode</p>
            <p className="mt-1 text-[12.5px] text-white/80">Drag to orbit · scroll or pinch to zoom · pick a room on the plan · <kbd className="rounded border border-white/30 px-1.5 text-[11px]">Esc</kbd> returns</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={onCutaway} aria-pressed={cutaway} className={`eyebrow rounded-full border border-white/50 px-3.5 py-2 text-[10px] transition ${cutaway ? "bg-white text-black" : "hover:bg-white/15"}`}>
              {cutaway ? "Restore roof" : "Lift roof"}
            </button>
            <button onClick={onResetView} className="eyebrow rounded-full border border-white/50 px-3.5 py-2 text-[10px] transition hover:bg-white/15">
              Reset
            </button>
            <button onClick={onExit} className="eyebrow rounded-full bg-[#b5482d] px-3.5 py-2 text-[10px] transition hover:bg-[#c65a3e]">
              Return to walk
            </button>
          </div>
        </div>
      )}
    </>
  );
}
