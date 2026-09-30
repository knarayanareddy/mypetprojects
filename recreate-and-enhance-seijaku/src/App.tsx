import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SeijakuEngine } from "./scene/world";
import { Ambience } from "./scene/audio";
import { CHAPTERS, KEYFRAMES, KF_CHAPTER, type Season, type Hour } from "./scene/layout";
import { Ctx } from "./ctx";
import { Header, WalkHUD } from "./components/HUD";
import { Loader } from "./components/Loader";
import { Architecture } from "./components/Architecture";
import { Materials } from "./components/Materials";
import { Joinery } from "./components/Joinery";
import { Gardens } from "./components/Gardens";
import { Rooms } from "./components/Rooms";
import { Inquiry } from "./components/Inquiry";

const STEP_VH = 62;
const N = KEYFRAMES.length;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const walkRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SeijakuEngine | null>(null);
  const audioRef = useRef<Ambience | null>(null);
  if (!audioRef.current) audioRef.current = new Ambience();

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [season, setSeasonState] = useState<Season>("spring");
  const [hour, setHourState] = useState<Hour>("noon");
  const [inspecting, setInspecting] = useState(false);
  const [cutaway, setCutaway] = useState(false);
  const [sound, setSound] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [inWalk, setInWalk] = useState(true);

  const inspectRef = useRef(false);
  const chapterRef = useRef(0);

  /* ---------------- engine lifecycle ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const audio = audioRef.current!;
    let eng: SeijakuEngine;
    try {
      eng = new SeijakuEngine(canvas, {
        onProgress: (p) => !cancelled && setProgress(p),
        onFrame: (f) => {
          const idx = f.idx;
          const c = KF_CHAPTER[clamp(Math.round(idx), 0, N - 1)];
          if (c !== chapterRef.current) {
            chapterRef.current = c;
            setChapter(c);
          }
          const dots = document.querySelectorAll("[data-plan-dot]");
          const deg = (Math.atan2(f.fx, -f.fz) * 180) / Math.PI;
          dots.forEach((d) => d.setAttribute("transform", `translate(${(28 - f.z) * 10} ${(f.x + 9) * 10}) rotate(${deg})`));
          const hero = heroRef.current;
          if (hero) {
            const o = inspectRef.current ? 0 : clamp(1 - idx / 0.75);
            hero.style.opacity = String(o);
            hero.style.transform = `translateY(${(1 - o) * -40}px)`;
            hero.style.visibility = o < 0.01 ? "hidden" : "visible";
          }
        },
        onMood: (m) => audio.setMood(m),
        onSplash: () => audio.plop(),
        onLamp: (on) => audio.tick(on),
      });
    } catch {
      setFailed(true);
      setReady(true);
      return;
    }
    engineRef.current = eng;
    eng
      .init()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) {
          setFailed(true);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
      eng.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setSeason(season);
  }, [season, ready]);
  useEffect(() => {
    engineRef.current?.setHour(hour);
  }, [hour, ready]);
  useEffect(() => {
    engineRef.current?.setCutaway(cutaway);
  }, [cutaway]);

  /* ---------------- scroll → walk ---------------- */
  useEffect(() => {
    let raf = 0;
    const calc = () => {
      raf = 0;
      const el = walkRef.current;
      const eng = engineRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const y = window.scrollY;
      eng?.setScroll(y / total);
      const visible = y < el.offsetHeight - 40;
      setInWalk((v) => (v !== visible ? visible : v));
      eng?.setActive(visible || inspectRef.current);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [ready]);

  /* ---------------- inspection ---------------- */
  const setInspect = useCallback((v: boolean) => {
    const eng = engineRef.current;
    if (!eng) return;
    inspectRef.current = v;
    setInspecting(v);
    const el = walkRef.current;
    if (v) {
      if (el && window.scrollY > el.offsetHeight - window.innerHeight) {
        window.scrollTo({ top: el.offsetHeight - window.innerHeight, behavior: "instant" });
      }
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      eng.setActive(true);
      eng.setInspect(true);
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      eng.setInspect(false);
      setCutaway(false);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inspectRef.current) setInspect(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setInspect]);

  /* ---------------- navigation ---------------- */
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const jumpKf = useCallback(
    (kf: number, roomId?: string) => {
      const eng = engineRef.current;
      if (inspectRef.current) {
        if (roomId) eng?.focusRoom(roomId);
        return;
      }
      const el = walkRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const y = (kf / (N - 1)) * total;
      const behavior: ScrollBehavior = reduce ? "instant" : "smooth";
      if (window.scrollY > el.offsetHeight) {
        window.scrollTo({ top: el.offsetHeight - window.innerHeight * 0.5, behavior: "instant" });
        requestAnimationFrame(() => window.scrollTo({ top: y, behavior }));
      } else {
        window.scrollTo({ top: y, behavior });
      }
    },
    [reduce],
  );

  const onNav = useCallback(
    (id: string) => {
      if (inspectRef.current) setInspect(false);
      const behavior: ScrollBehavior = reduce ? "instant" : "smooth";
      if (id === "top") {
        window.scrollTo({ top: 0, behavior });
        return;
      }
      const el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior });
    },
    [reduce, setInspect],
  );

  const toggleSound = async () => {
    const a = audioRef.current!;
    if (sound) {
      a.stop();
      setSound(false);
    } else {
      try {
        await a.start();
        setSound(true);
      } catch {
        setSound(false);
      }
    }
  };

  const ctx = useMemo(
    () => ({
      season,
      setSeason: setSeasonState,
      hour,
      setHour: setHourState,
      jumpKf,
      inspecting,
    }),
    [season, hour, jumpKf, inspecting],
  );

  return (
    <Ctx.Provider value={ctx}>
      <canvas ref={canvasRef} className="fixed inset-0 z-0 block h-full w-full" style={{ touchAction: inspecting ? "none" : "auto" }} />

      <Header inspecting={inspecting} sound={sound} onInspect={() => setInspect(!inspecting)} onSound={toggleSound} onNav={onNav} />

      <div className={`transition-opacity duration-500 ${inWalk ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <WalkHUD
          chapter={chapter}
          inspecting={inspecting}
          cutaway={cutaway}
          heroRef={heroRef}
          onCutaway={() => setCutaway((c) => !c)}
          onResetView={() => engineRef.current?.resetInspect()}
          onExit={() => setInspect(false)}
        />
      </div>

      <main className="pointer-events-none relative z-10">
        {/* the walk: a tall transparent runway that drives the camera */}
        <section
          ref={walkRef}
          id="walk"
          className="relative"
          style={{ height: `calc(100vh + ${(N - 1) * STEP_VH}vh)` }}
          aria-label={`Walk through the residence: ${CHAPTERS.map((c) => c.title).join(", ")}`}
        />
        <div className="pointer-events-auto">
          <Architecture />
          <Materials />
          <Joinery />
          <Gardens />
          <Rooms />
          <Inquiry />
        </div>
      </main>

      {failed && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0d0f12] p-8 text-center text-washi">
          <div>
            <p className="font-serif text-4xl">WebGL is unavailable</p>
            <p className="mt-3 text-sm text-washi/60">Seijaku needs a browser with WebGL2 to render the walk. The rest of the page is still below.</p>
            <button className="eyebrow mt-6 rounded-full border border-washi/40 px-5 py-2.5" onClick={() => setFailed(false)}>
              Continue
            </button>
          </div>
        </div>
      )}
      <Loader progress={progress} ready={ready} />
    </Ctx.Provider>
  );
}
