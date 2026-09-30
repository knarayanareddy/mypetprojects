import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CHAPTERS, type Chapter } from "./data";
import Foreground from "./Foreground";
import Cursor from "./Cursor";
import { createEngine, type Engine } from "./scene/engine";

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const SECTION_VH = [190, ...CHAPTERS.map(() => 280), 230];
const SECTION_IDS = ["top", ...CHAPTERS.map((c) => c.id), "afterlight"];
const K = SECTION_VH.length; // 9

const cssVar = (name: string, v: string) => ({ [name]: v }) as CSSProperties;

function ChapterLayer({ c, k, setRef }: { c: Chapter; k: number; setRef: (el: HTMLDivElement | null) => void }) {
  const d = useMemo(() => c.elevation(), [c]);
  return (
    <div
      ref={setRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20 will-change-transform"
      style={{ ...cssVar("--accent", c.accent), visibility: "hidden", opacity: 0 }}
      data-layer={k}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />

      {/* label row */}
      <div data-in="0.03" className="absolute left-6 top-[4.6rem] flex items-center gap-4 md:left-14 md:top-28">
        <span className="label text-[color:var(--accent)]">
          {c.no} / 07
        </span>
        <span className="h-px w-10 bg-white/40 md:w-16" />
        <span className="label text-bone/80">{c.place}</span>
      </div>

      {/* glyph */}
      <div
        data-in="0.1"
        className="absolute right-9 top-[6.4rem] md:right-24 md:top-28"
        style={{ color: "var(--accent)" }}
      >
        <div className="flex items-start gap-4">
          <span className="label mt-2 hidden text-bone/60 md:block vertical">{c.glyphSub}</span>
          <span
            className={`jp text-shadow block leading-[1.05] opacity-90 ${c.glyphVertical ? "vertical" : ""}`}
            style={{
              fontSize: c.glyphVertical ? "clamp(3rem, 8.5vw, 8.5rem)" : "clamp(2.4rem, 6.2vw, 6.2rem)",
              fontWeight: 300,
              letterSpacing: c.glyphVertical ? "0.08em" : "0.02em",
            }}
          >
            {c.glyph}
          </span>
        </div>
      </div>

      {/* main copy */}
      <div className="absolute left-6 top-[8.2rem] max-w-[82%] md:bottom-14 md:left-14 md:top-auto md:max-w-[min(54rem,calc(100%-30rem))]">
        <div className="label mb-4 text-bone/60 md:mb-5" data-in="0.05">
          {c.kind}
        </div>
        <h2
          className="font-display text-shadow font-light leading-[0.92] tracking-[-0.02em]"
          style={{ fontSize: "clamp(2.9rem, 7.6vw, 8.2rem)" }}
        >
          {c.title.map((w, i) => (
            <span
              key={i}
              data-in={(0.06 + i * 0.022).toFixed(3)}
              data-blur=""
              className={`mr-[0.2em] inline-block ${i % 2 === 1 ? "italic" : ""}`}
              style={i % 2 === 1 ? { color: "var(--accent)" } : undefined}
            >
              {w}
            </span>
          ))}
        </h2>
        <p
          data-in="0.17"
          data-blur=""
          className="text-shadow mt-5 max-w-[34rem] text-[13.5px] leading-[1.75] text-bone/85 md:mt-7 md:text-[15px]"
        >
          {c.intro}
        </p>
        <div data-in="0.22" className="label mt-5 text-bone/55 md:mt-7">
          {c.coords}
        </div>
      </div>

      {/* plate */}
      <aside
        data-in="0.36"
        className="absolute bottom-6 left-6 right-6 border border-white/15 bg-black/45 p-3.5 backdrop-blur-[3px] md:bottom-14 md:left-auto md:right-14 md:w-[23rem] md:p-5"
      >
        <div className="label flex justify-between text-[9px] text-bone/55">
          <span>Plate {c.no}</span>
          <span>Elevation · not to scale</span>
        </div>
        <svg viewBox="0 0 240 120" className="mt-2 h-20 w-full md:mt-3 md:h-auto" style={{ color: "var(--accent)" }}>
          <path d={d} fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <dl className="mt-2 divide-y divide-white/10 text-[11.5px] md:mt-3 md:text-[12px] max-md:[&>div:nth-child(n+3)]:hidden">
          {c.specs.map(([a, b]) => (
            <div key={a} className="flex items-baseline justify-between gap-4 py-1.5 md:py-2">
              <dt className="label text-[9px] text-bone/50">{a}</dt>
              <dd className="text-right text-bone/90">{b}</dd>
            </div>
          ))}
        </dl>
        <blockquote className="font-display mt-3 hidden border-t border-white/10 pt-3 text-[17px] italic leading-snug text-bone/90 md:block">
          “{c.quote}”
        </blockquote>
      </aside>
    </div>
  );
}

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const layout = useRef({ tops: [] as number[], heights: [] as number[], vh: 800 });
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(false);
  const [prog, setProg] = useState({ label: "Preparing the night", frac: 0 });
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  const [menu, setMenu] = useState(false);

  const measure = useCallback(() => {
    layout.current = {
      tops: sectionRefs.current.map((el) => (el ? el.offsetTop : 0)),
      heights: sectionRefs.current.map((el) => (el ? el.offsetHeight : 0)),
      vh: window.innerHeight,
    };
  }, []);

  const goTo = useCallback((k: number) => {
    const { tops, heights } = layout.current;
    if (!tops.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const y = k === 0 ? 0 : tops[k] + heights[k] * (k === K - 1 ? 0.35 : 0.27);
    window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
    setMenu(false);
  }, []);

  // lock scroll while loading
  useEffect(() => {
    document.body.style.overflow = ready ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setGone(true), 1400);
    return () => clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let eng: Engine | null = null;
    let raf = 0;

    // fresh canvas per effect run (safe with StrictMode)
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    host.current?.appendChild(canvas);

    measure();
    const onResize = () => {
      measure();
      eng?.resize();
    };
    window.addEventListener("resize", onResize);

    createEngine(canvas, (label, frac) => !cancelled && setProg({ label, frac }), {
      reduced,
      isCancelled: () => cancelled,
    })
      .then((e) => {
        if (cancelled) {
          e.dispose();
          return;
        }
        eng = e;
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setFailed(true);
        setReady(true);
      });

    const ptr = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      ptr.x = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const stageFromScroll = (y: number) => {
      const { tops, heights, vh } = layout.current;
      if (!tops.length) return 0;
      let k = 0;
      for (let i = 0; i < tops.length; i++) if (y >= tops[i] - 0.5) k = i;
      const span = k === tops.length - 1 ? Math.max(1, heights[k] - vh) : Math.max(1, heights[k]);
      return k + clamp((y - tops[k]) / span);
    };

    const cache = new Map<number, { el: HTMLElement; a: number; blur: boolean }[]>();
    const items = (k: number) => {
      let v = cache.get(k);
      if (!v) {
        const layer = layerRefs.current[k];
        v = layer
          ? Array.from(layer.querySelectorAll<HTMLElement>("[data-in]")).map((el) => ({
              el,
              a: parseFloat(el.dataset.in || "0"),
              blur: el.dataset.blur !== undefined,
            }))
          : [];
        cache.set(k, v);
      }
      return v;
    };
    const layerOp = (k: number, f: number) => {
      if (k === 0) return 1 - smooth(0.36, 0.56, f);
      if (k === K - 1) return smooth(0.04, 0.2, f);
      return smooth(0.03, 0.12, f) * (1 - smooth(0.8, 0.93, f));
    };
    const outOf = (k: number, f: number) => {
      if (k === 0) return 1 - smooth(0.36, 0.56, f);
      if (k === K - 1) return 1;
      return 1 - smooth(0.8, 0.93, f);
    };
    const hide = (el: HTMLElement) => {
      if (el.style.visibility !== "hidden") el.style.visibility = "hidden";
    };

    let lastActive = -2;
    const update = (S: number) => {
      for (let k = 0; k < K; k++) {
        const layer = layerRefs.current[k];
        if (!layer) continue;
        const f = S - k;
        if (f < -0.02 || f > 1.02) {
          hide(layer);
          continue;
        }
        const op = layerOp(k, f);
        if (op < 0.004) {
          hide(layer);
          continue;
        }
        layer.style.visibility = "visible";
        layer.style.opacity = op.toFixed(3);
        const out = outOf(k, f);
        layer.style.transform = reduced ? "none" : `translate3d(0,${(-(1 - out) * 26).toFixed(1)}px,0)`;
        layer.style.filter = reduced || out > 0.985 ? "none" : `blur(${((1 - out) * 10).toFixed(1)}px)`;
        for (const it of items(k)) {
          const o = smooth(it.a, it.a + 0.07, f);
          if (reduced) {
            it.el.style.opacity = o > 0.5 ? "1" : "0";
            continue;
          }
          it.el.style.opacity = o.toFixed(3);
          it.el.style.transform = o > 0.998 ? "none" : `translate3d(0,${((1 - o) * 28).toFixed(1)}px,0)`;
          if (it.blur) it.el.style.filter = o > 0.98 ? "none" : `blur(${((1 - o) * 7).toFixed(1)}px)`;
        }
      }
      for (let k = 1; k <= 7; k++) {
        const fg = fgRefs.current[k];
        if (!fg) continue;
        const f = S - k;
        const op = smooth(0, 0.05, f) * (1 - smooth(0.74, 0.9, f));
        if (f < -0.02 || f > 1.02 || op < 0.004) {
          hide(fg);
          continue;
        }
        fg.style.visibility = "visible";
        fg.style.opacity = op.toFixed(3);
        const out = 1 - smooth(0.74, 0.9, f);
        fg.style.filter = reduced || out > 0.985 ? "none" : `blur(${((1 - out) * 12).toFixed(1)}px)`;
        fg.style.transform = reduced ? "none" : `translate3d(0,${(f * 18 + (1 - out) * 30).toFixed(1)}px,0)`;
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${(S / (K)).toFixed(4)})`;
      const c = Math.floor(S + 0.28);
      const idx = c === 0 ? -1 : Math.min(6, c - 1);
      if (idx !== lastActive) {
        lastActive = idx;
        setActive(idx);
        document.documentElement.style.setProperty("--accent", CHAPTERS[Math.max(0, idx)].accent);
      }
    };

    let sCur = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const target = stageFromScroll(window.scrollY);
      sCur = reduced ? target : sCur + (target - sCur) * (1 - Math.exp(-dt * 4.4));
      if (Math.abs(target - sCur) < 0.0002) sCur = target;
      try {
        eng?.render(dt, sCur, ptr.x, ptr.y);
      } catch (e) {
        console.error(e);
        eng = null;
        setFailed(true);
      }
      update(sCur);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      eng?.dispose();
      canvas.remove();
    };
  }, [measure]);

  const ac = CHAPTERS[Math.max(0, active)];

  return (
    <div data-ready={ready ? "true" : "false"} className="relative">
      <div ref={host} className="canvas-wrap" aria-hidden="true" />

      {/* progress hairline */}
      <div className="fixed inset-x-0 top-0 z-50 h-px bg-white/10">
        <div ref={barRef} className="h-full origin-left" style={{ background: ac.accent, transform: "scaleX(0)" }} />
      </div>

      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between px-5 md:h-20 md:px-10">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            goTo(0);
          }}
          className="flex items-baseline gap-3"
          aria-label="Hikari — back to the beginning"
        >
          <span className="font-display text-2xl font-medium tracking-[0.3em] md:text-[1.7rem]">HIKARI</span>
          <span className="jp text-lg" style={{ color: "var(--accent)" }}>
            光
          </span>
        </a>
        <nav aria-label="Chapters" className="hidden items-center gap-7 xl:flex">
          {CHAPTERS.map((c, i) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              onClick={(e) => {
                e.preventDefault();
                goTo(i + 1);
              }}
              aria-current={active === i}
              className="nav-link label flex gap-2 text-bone/70 transition-colors hover:text-bone aria-[current=true]:text-bone"
            >
              <span className="text-bone/40">{c.no}</span>
              {c.short}
            </a>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => setMenu(true)}
          className="label flex items-center gap-3 text-bone xl:hidden"
          aria-label="Open chapter menu"
          aria-expanded={menu}
        >
          Chapters
          <span className="flex flex-col gap-[5px]">
            <span className="block h-px w-6 bg-bone" />
            <span className="block h-px w-4 bg-bone" />
          </span>
        </button>
      </header>

      {/* mobile menu */}
      {menu && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/92 px-7 pb-10 pt-6 backdrop-blur-md" role="dialog" aria-label="Chapters">
          <div className="flex items-center justify-between">
            <span className="label text-bone/60">Seven sanctuaries</span>
            <button type="button" onClick={() => setMenu(false)} className="label text-bone" aria-label="Close menu">
              Close ✕
            </button>
          </div>
          <ul className="mt-8 flex flex-1 flex-col justify-between">
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    goTo(i + 1);
                  }}
                  className="flex items-baseline justify-between border-b border-white/10 pb-3"
                >
                  <span className="font-display text-[2.4rem] font-light leading-none">{c.short}</span>
                  <span className="label" style={{ color: c.accent }}>
                    {c.no}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* chapter rail */}
      <nav aria-label="Chapter rail" className="fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-3.5 md:right-6 md:flex">
        {CHAPTERS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => goTo(i + 1)}
            aria-label={`Go to chapter ${c.no}, ${c.short}`}
            aria-current={active === i}
            className="group flex items-center gap-3"
          >
            <span
              className={`label text-[9px] transition-all duration-500 ${active === i ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-70"}`}
              style={{ color: active === i ? c.accent : undefined }}
            >
              {c.no} {c.short}
            </span>
            <span
              className="block h-px transition-all duration-500"
              style={{
                width: active === i ? 34 : 14,
                background: active === i ? c.accent : "rgba(236,230,216,0.45)",
              }}
            />
          </button>
        ))}
      </nav>

      {/* foreground cut-outs */}
      {CHAPTERS.map((c, i) => (
        <div
          key={c.id}
          ref={(el) => {
            fgRefs.current[i + 1] = el;
          }}
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[30vh] will-change-transform md:h-[38vh]"
          style={{ visibility: "hidden", opacity: 0 }}
        >
          <Foreground kind={c.fg} />
        </div>
      ))}

      {/* hero layer */}
      <div
        ref={(el) => {
          layerRefs.current[0] = el;
        }}
        className="pointer-events-none fixed inset-0 z-20 will-change-transform"
        style={{ ...cssVar("--accent", CHAPTERS[0].accent) }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/40" />
        <div data-in="-1" className="absolute right-8 top-[6.4rem] md:right-24 md:top-28" style={{ color: "var(--accent)" }}>
          <span
            className="jp rise text-shadow vertical block opacity-90"
            style={{ ...cssVar("--d", "1.1s"), fontSize: "clamp(4rem, 11vw, 11rem)", fontWeight: 300 }}
          >
            光
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-6 pb-16 md:px-14 md:pb-16">
          <div data-in="-1" className="label flex items-center gap-4 text-bone/75">
            <span className="rise flex items-center gap-4" style={cssVar("--d", "0.2s")}>
              <span className="h-px w-10 bg-bone/50" />A night pilgrimage · seven sanctuaries
            </span>
          </div>
          <h1
            data-in="-1"
            className="font-display text-shadow mt-4 font-light leading-[0.82] tracking-[-0.035em]"
            style={{ fontSize: "clamp(5.2rem, 19vw, 18rem)" }}
          >
            <span className="block overflow-hidden pb-[0.1em]">
              <span className="rise block" style={cssVar("--d", "0.45s")}>
                Hikari
              </span>
            </span>
          </h1>
          <div data-in="-1" className="mt-5 flex flex-col gap-6 md:mt-7 md:flex-row md:items-end md:justify-between">
            <p className="rise text-shadow max-w-md text-[13.5px] leading-[1.75] text-bone/85 md:text-[15px]" style={cssVar("--d", "0.9s")}>
              Seven sacred places, one continuous night. Walk from the rain of Kyoto to the slow white light of Mecca —
              every temple built live, from nothing, in WebGL.
            </p>
            <div className="rise flex items-center gap-4" style={cssVar("--d", "1.3s")}>
              <span className="label text-bone/70">Scroll to walk</span>
              <span className="relative block h-12 w-px overflow-hidden bg-white/20">
                <span className="cue-line absolute inset-0 block bg-bone" />
              </span>
            </div>
          </div>
          <div data-in="-1" className="label mt-7 hidden flex-wrap gap-x-5 gap-y-1 text-[9px] text-bone/45 md:flex">
            {CHAPTERS.map((c) => (
              <span key={c.id}>{c.place}</span>
            ))}
          </div>
        </div>
      </div>

      {/* chapter layers */}
      {CHAPTERS.map((c, i) => (
        <ChapterLayer
          key={c.id}
          c={c}
          k={i + 1}
          setRef={(el) => {
            layerRefs.current[i + 1] = el;
          }}
        />
      ))}

      {/* afterlight */}
      <div
        ref={(el) => {
          layerRefs.current[K - 1] = el;
        }}
        className="pointer-events-none fixed inset-0 z-20 will-change-transform"
        style={{ ...cssVar("--accent", CHAPTERS[6].accent), visibility: "hidden", opacity: 0 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-black/10" />
        <div className="absolute inset-0 flex flex-col justify-between px-6 pb-7 pt-20 md:px-14 md:pb-8 md:pt-28">
          <div data-in="0.05" className="label flex items-center gap-4 text-bone/70">
            <span className="text-[color:var(--accent)]">08</span>
            <span className="h-px w-10 bg-white/40" />
            Afterlight
          </div>
          <div className="max-w-5xl">
            <h2 className="font-display text-shadow font-light leading-[0.9] tracking-[-0.025em]" style={{ fontSize: "clamp(3rem, 8.4vw, 9rem)" }}>
              {["One", "lamp,", "seven", "doors."].map((w, i) => (
                <span
                  key={w}
                  data-in={(0.08 + i * 0.03).toFixed(3)}
                  data-blur=""
                  className={`mr-[0.2em] inline-block ${i % 2 === 1 ? "italic" : ""}`}
                  style={i % 2 === 1 ? { color: "var(--accent)" } : undefined}
                >
                  {w}
                </span>
              ))}
            </h2>
            <p data-in="0.22" data-blur="" className="text-shadow mt-5 max-w-xl text-[13.5px] leading-[1.75] text-bone/85 md:mt-7 md:text-[15px]">
              From above, the last place on the walk looks like every other: people, light and a slow turning around a
              still centre. Seven traditions, seven architectures, one habit of building a threshold toward something
              larger than oneself — and then lighting it, so that anyone can find it in the dark.
            </p>
            <ul data-in="0.3" className="pointer-events-auto mt-6 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-2 md:mt-8 md:grid-cols-4">
              {CHAPTERS.map((c, i) => (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      goTo(i + 1);
                    }}
                    className="group flex items-baseline gap-3 border-b border-white/15 py-2 transition-colors hover:border-white/60"
                  >
                    <span className="label text-[9px]" style={{ color: c.accent }}>
                      {c.no}
                    </span>
                    <span className="font-display text-xl font-light">{c.short}</span>
                    <span className="ml-auto text-bone/40 transition-transform group-hover:translate-x-1">→</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <footer data-in="0.4" className="pointer-events-auto grid gap-4 text-[11px] leading-relaxed text-bone/55 md:grid-cols-[1.4fr_1fr_auto] md:gap-10">
            <p>
              Hikari is an original design study. Every temple, tree, lantern and pilgrim is constructed procedurally in
              Three.js — no models, no photographs. Sanctuaries are depicted schematically, and with respect; this
              project is not affiliated with any temple, church, mosque or institution.
            </p>
            <p>
              Composition and pacing inspired by{" "}
              <a className="underline decoration-white/30 underline-offset-4 hover:decoration-white" href="https://github.com/MengTo/kage" target="_blank" rel="noreferrer">
                Kage
              </a>{" "}
              by Meng To — a night walk through a Kyoto temple.
            </p>
            <button type="button" onClick={() => goTo(0)} className="label self-end text-left text-bone hover:text-[color:var(--accent)] md:text-right">
              Back to the beginning ↑
            </button>
          </footer>
        </div>
      </div>

      {/* scroll spacers (semantic sections) */}
      <main>
        {SECTION_IDS.map((id, k) => {
          const c = k >= 1 && k <= 7 ? CHAPTERS[k - 1] : null;
          return (
            <section
              key={id}
              id={id}
              ref={(el) => {
                sectionRefs.current[k] = el;
              }}
              aria-label={c ? `${c.no}. ${c.place}` : k === 0 ? "Hikari — introduction" : "Afterlight"}
              style={{ height: `${SECTION_VH[k]}vh` }}
            >
              {c ? (
                <>
                  <h2 className="sr-only-x">
                    {c.no} — {c.place}: {c.title.join(" ")}
                  </h2>
                  <p className="sr-only-x">{c.intro}</p>
                </>
              ) : k === 0 ? (
                <h1 className="sr-only-x">Hikari — seven sanctuaries, one night</h1>
              ) : (
                <h2 className="sr-only-x">Afterlight — one lamp, seven doors</h2>
              )}
            </section>
          );
        })}
      </main>

      {failed && (
        <div className="label fixed bottom-3 left-1/2 z-50 -translate-x-1/2 border border-white/15 bg-black/70 px-4 py-2 text-[9px] text-bone/70">
          Live 3D is unavailable on this device — showing the text edition
        </div>
      )}

      {/* loader */}
      {!gone && (
        <div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#05070a] transition-opacity duration-[1200ms]"
          style={{ opacity: ready ? 0 : 1, pointerEvents: ready ? "none" : "auto" }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-baseline gap-4">
            <span className="font-display text-4xl font-light tracking-[0.35em] md:text-6xl">HIKARI</span>
            <span className="jp text-3xl text-[color:var(--accent)] md:text-5xl">光</span>
          </div>
          <div className="mt-10 h-px w-56 bg-white/15 md:w-80">
            <div className="h-full bg-[color:var(--accent)] transition-[width] duration-700" style={{ width: `${Math.round(prog.frac * 100)}%` }} />
          </div>
          <div className="label mt-5 text-bone/55">Raising {prog.label}</div>
        </div>
      )}

      <Cursor />
    </div>
  );
}
