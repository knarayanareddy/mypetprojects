import { useEffect, useRef, useState } from "react";
import { JoineryScene, JOINERY_PARTS } from "../scene/joinery";

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function Joinery() {
  const sec = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<JoineryScene | null>(null);
  const [p, setP] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    let js: JoineryScene | null = null;
    try {
      js = new JoineryScene(c, (id) => setHover(id));
    } catch {
      setFailed(true);
      return;
    }
    scene.current = js;
    const io = new IntersectionObserver(([e]) => js?.setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(c);
    return () => {
      io.disconnect();
      js?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const calc = () => {
      raf = 0;
      const el = sec.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const prog = clamp(-r.top / total);
      setP(prog);
      scene.current?.setExplode(clamp((prog - 0.08) / 0.62));
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
  }, []);

  const active = pinned ?? hover;
  useEffect(() => {
    scene.current?.setHighlight(active);
  }, [active]);

  const info = JOINERY_PARTS.find((x) => x.id === active);
  const explode = clamp((p - 0.08) / 0.62);

  return (
    <section ref={sec} id="joinery" className="relative bg-[#ece5d6] text-sumi" style={{ height: "340vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="mx-auto grid h-full max-w-[1320px] grid-rows-[auto_1fr] gap-4 px-6 pb-6 pt-24 sm:px-10 md:grid-cols-[minmax(0,420px)_1fr] md:grid-rows-1 md:gap-10 md:pb-10">
          {/* copy + parts */}
          <div className="flex min-h-0 flex-col">
            <p className="eyebrow mb-4 flex items-center gap-4 text-sumi/55">
              <span>04</span>
              <span className="h-px w-10 bg-sumi/30" />
              Joinery
            </p>
            <h2 className="font-serif text-[clamp(38px,5vw,72px)] leading-[0.95] tracking-tight">
              Nine parts, <em className="text-shu">no nails.</em>
            </h2>
            <p className="mt-3 hidden max-w-[40ch] text-[14px] leading-relaxed text-sumi/70 md:block">
              Scroll to take the frame apart. Drag to turn it. Hover or tap a part to learn what it carries.
            </p>

            <ul className="mt-5 hidden min-h-0 flex-1 flex-col gap-px overflow-y-auto pr-1 md:flex no-scrollbar">
              {JOINERY_PARTS.map((part, idx) => {
                const on = active === part.id;
                return (
                  <li key={part.id}>
                    <button
                      onMouseEnter={() => setHover(part.id)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => setPinned(pinned === part.id ? null : part.id)}
                      className={`flex w-full items-center gap-4 border-t border-sumi/15 px-1 py-2.5 text-left transition ${on ? "bg-sumi/[0.05]" : ""}`}
                    >
                      <span className="eyebrow w-5 text-[10px] text-sumi/40">{String(idx + 1).padStart(2, "0")}</span>
                      <span className={`font-jp w-10 text-[22px] leading-none transition-colors ${on ? "text-shu" : "text-sumi/70"}`}>{part.jp}</span>
                      <span className="text-[14px]">{part.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 min-h-[92px] rounded-2xl border border-sumi/15 bg-white/40 p-4 text-[13.5px] leading-relaxed backdrop-blur">
              {info ? (
                <div key={info.id} className="rise">
                  <p className="eyebrow mb-1 text-[10px] text-shu">
                    {info.jp} · {info.name}
                  </p>
                  {info.blurb}
                </div>
              ) : (
                <span className="text-sumi/55">Hover a part of the frame to see what it does.</span>
              )}
            </div>
          </div>

          {/* canvas */}
          <div className="relative min-h-0 overflow-hidden rounded-[26px] border border-sumi/10 bg-[radial-gradient(ellipse_at_50%_40%,#f7f2e6_0%,#e1d8c4_100%)]">
            <canvas ref={canvas} className="absolute inset-0 h-full w-full cursor-grab" style={{ touchAction: "pan-y" }} />
            {failed && <p className="absolute inset-0 grid place-items-center text-sm text-sumi/60">WebGL is unavailable in this browser.</p>}
            <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-3">
              <span className="eyebrow rounded-full bg-sumi px-3 py-1.5 text-[10px] text-washi">{explode < 0.04 ? "Assembled" : explode > 0.96 ? "Exploded" : "Disassembling"}</span>
            </div>
            <div className="pointer-events-none absolute bottom-5 left-5 right-5 flex items-center gap-4">
              <span className="eyebrow text-[10px] text-sumi/50">Assembled</span>
              <div className="h-[3px] flex-1 overflow-hidden rounded bg-sumi/15">
                <div className="h-full bg-shu" style={{ width: `${explode * 100}%` }} />
              </div>
              <span className="eyebrow text-[10px] text-sumi/50">Exploded</span>
            </div>
            <div className="eyebrow pointer-events-none absolute right-5 top-5 hidden text-[10px] text-sumi/45 sm:block">Drag to rotate</div>
          </div>
        </div>
      </div>
    </section>
  );
}
