import { useEffect, useState } from "react";
import CameraSection from "./CameraSection";
import CameraStage from "./CameraStage";
import PrintSection from "./PrintSection";
import { useCompact } from "./engine";
import { slr } from "./cameras/slr";
import { tlr } from "./cameras/tlr";
import { instant } from "./cameras/instant";
import { mirrorless } from "./cameras/mirrorless";

const cameras = [slr, tlr, instant, mirrorless];
const totalParts = cameras.reduce((n, c) => n + c.parts.length, 0);

const CHAPTERS = [
  { id: "top", label: "Intro" },
  ...cameras.map((c) => ({ id: c.id, label: c.name.replace("The ", "") })),
  { id: "print", label: "Your print" },
];

function Hero() {
  const compact = useCompact();
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      if (ts - last > 33) {
        last = ts;
        setT(ts / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const breathe = 0.5 + 0.5 * Math.sin(t * 0.9);

  return (
    <section id="top" className="relative flex min-h-[100svh] w-full items-center overflow-hidden">
      <div className="blueprint-grid absolute inset-0 opacity-70" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 65% at 72% 50%, rgba(255,180,84,.14), transparent 70%)" }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,.6)_100%)]" />

      <div className="relative mx-auto grid w-full max-w-[1500px] items-center gap-2 px-6 py-16 md:grid-cols-[minmax(380px,44%)_1fr] md:px-12">
        <div className="relative z-10">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-[#ffb454]">
            <span className="blink inline-block h-2 w-2 rounded-full bg-[#ff4b3a]" />
            An interactive teardown
          </div>
          <h1 className="mt-5 font-display text-[22vw] leading-[0.82] tracking-[-0.02em] text-[#f4eee2] md:text-[min(12.5vw,190px)]">
            Tear<span className="italic text-[#ffb454]">down</span>
          </h1>
          <p className="mt-7 max-w-md text-[15px] leading-relaxed text-[#efe8da]/75 md:text-[17px]">
            Four cameras, taken apart in front of you. Scroll — every part flies out and explains itself. Keep scrolling and it rebuilds:{" "}
            <span className="text-[#7aa2ff]">skeleton</span>, then <span className="text-[#ff6b57]">muscle</span>, then <span className="text-[#f4eee2]">skin</span>. Then it takes
            your photo and prints it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[#efe8da]/55">
            <span>
              <b className="mr-1.5 font-display text-3xl font-normal tracking-normal text-[#f4eee2]">{cameras.length}</b>cameras
            </span>
            <span>
              <b className="mr-1.5 font-display text-3xl font-normal tracking-normal text-[#f4eee2]">{totalParts}</b>parts
            </span>
            <span>
              <b className="mr-1.5 font-display text-3xl font-normal tracking-normal text-[#f4eee2]">1</b>print
            </span>
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <button
              onClick={() => document.getElementById("slr")?.scrollIntoView({ behavior: "smooth" })}
              className="group inline-flex items-center gap-3 rounded-full bg-[#ffb454] px-6 py-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc677]"
            >
              Begin the teardown <span className="bob inline-block">↓</span>
            </button>
            <button
              onClick={() => document.getElementById("print")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full border border-white/25 px-6 py-3.5 font-mono text-[12px] uppercase tracking-[0.18em] text-white/80 transition hover:bg-white/10"
            >
              Skip to the print
            </button>
          </div>

          <div className="mt-10 hidden gap-2 md:flex">
            {cameras.map((c) => (
              <button
                key={c.id}
                onClick={() => document.getElementById(c.id)?.scrollIntoView({ behavior: "smooth" })}
                className="group flex-1 border-t border-white/15 pt-2.5 text-left transition hover:border-white/60"
              >
                <div className="font-mono text-[10px] tracking-[0.2em]" style={{ color: c.accent }}>
                  {c.no}
                </div>
                <div className="mt-1 font-display text-[17px] leading-tight text-[#f4eee2]/90 group-hover:text-white">{c.name.replace("The ", "")}</div>
                <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#efe8da]/40">{c.year}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="relative h-[46svh] min-h-[280px] md:h-[78svh]">
          <CameraStage camera={slr} p={0} compact={compact} hero={breathe} />
          <div className="absolute bottom-0 right-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#efe8da]/35">Fig. 01 — {slr.model}</div>
        </div>
      </div>
    </section>
  );
}

function Rail({ active }: { active: string }) {
  return (
    <nav className="fixed right-4 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-end gap-3.5 md:flex" aria-label="Chapters">
      {CHAPTERS.map((c) => {
        const on = c.id === active;
        return (
          <button key={c.id} onClick={() => document.getElementById(c.id)?.scrollIntoView({ behavior: "smooth" })} className="group flex items-center gap-3" aria-label={c.label}>
            <span className={"font-mono text-[9px] uppercase tracking-[0.2em] transition " + (on ? "text-[#f4eee2] opacity-100" : "text-[#efe8da]/60 opacity-0 group-hover:opacity-100")}>{c.label}</span>
            <span className={"block rounded-full transition-all " + (on ? "h-2.5 w-2.5 bg-[#ffb454] shadow-[0_0_12px_#ffb454]" : "h-1.5 w-1.5 bg-white/35 group-hover:bg-white/70")} />
          </button>
        );
      })}
    </nav>
  );
}

export default function App() {
  const [active, setActive] = useState("top");
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    let raf = 0;
    const calc = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScroll(max > 0 ? window.scrollY / max : 0);
      let cur = "top";
      for (const c of CHAPTERS) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.5) cur = c.id;
      }
      setActive(cur);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    calc();
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="grain relative min-h-screen bg-[#0c0b0a] text-[#efe8da]">
      <div className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-white/5">
        <div className="h-full bg-[#ffb454]" style={{ width: `${scroll * 100}%` }} />
      </div>
      <div className="pointer-events-none fixed left-4 top-3 z-50 font-mono text-[10px] uppercase tracking-[0.3em] text-[#efe8da]/50 md:left-6 md:top-4">
        Teardown<span className="text-[#ffb454]">®</span>
      </div>
      <Rail active={active} />

      <Hero />
      {cameras.map((c, i) => (
        <CameraSection key={c.id} camera={c} index={i} total={cameras.length + 1} next={cameras[i + 1]} />
      ))}
      <PrintSection />

      <footer className="relative border-t border-white/10 px-6 py-16 text-center">
        <div className="font-display text-3xl italic text-[#f4eee2] md:text-5xl">Every machine is just smaller machines.</div>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[#efe8da]/55">
          All cameras are fictional “Meridian” designs, drawn as vector art for this teardown. Your photo never leaves your browser.
        </p>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="mt-8 rounded-full border border-white/25 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/80 transition hover:bg-white/10">
          ↑ Take another one apart
        </button>
      </footer>
    </div>
  );
}
