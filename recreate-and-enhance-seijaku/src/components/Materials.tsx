import { useEffect, useRef, useState } from "react";
import * as TX from "../scene/textures";

const MATS = [
  {
    id: "hinoki",
    name: "Hinoki",
    jp: "檜",
    sub: "Japanese cypress",
    body: "Pale, straight-grained and faintly citrus. Planed by hand and never varnished, it darkens to honey over a century and keeps the bath smelling of a forest.",
    facts: [["Origin", "Kiso, Nagano"], ["Finish", "Hand-planed, unsealed"], ["Used in", "Posts · ceilings · bath"]],
    gen: TX.gallery.hinoki,
  },
  {
    id: "tatami",
    name: "Tatami",
    jp: "畳",
    sub: "Rush over a straw core",
    body: "Each mat is 1.8 × 0.9 metres and stitched with a cloth border. Underfoot it is firm and slightly warm; it breathes with the humidity of the season.",
    facts: [["Origin", "Kumamoto igusa"], ["Finish", "Indigo-black heri"], ["Used in", "Tea room · bedroom"]],
    gen: TX.gallery.tatami,
  },
  {
    id: "washi",
    name: "Washi",
    jp: "和紙",
    sub: "Mulberry paper",
    body: "Long kozo fibres make a sheet that is strong, translucent and quiet. Morning light crosses it and arrives without glare.",
    facts: [["Origin", "Echizen, Fukui"], ["Finish", "Hand-pressed, unbleached"], ["Used in", "Shoji · lamps"]],
    gen: TX.gallery.washi,
  },
  {
    id: "stone",
    name: "Stone",
    jp: "石",
    sub: "River-worn granite",
    body: "Stones are set where feet need to land. In the genkan and bath they are cool and matte; in the garden, moss finds them within a year.",
    facts: [["Origin", "Kamo River, Kyoto"], ["Finish", "Tumbled, unpolished"], ["Used in", "Genkan · bath · path"]],
    gen: TX.gallery.stone,
  },
  {
    id: "linen",
    name: "Indigo linen",
    jp: "藍",
    sub: "Aizome-dyed",
    body: "Dyed in the vat, rinsed in the river, dried in the sun. The blue fades gracefully where it is touched, so every cushion records how it has been loved.",
    facts: [["Origin", "Tokushima"], ["Finish", "Natural indigo, 12 dips"], ["Used in", "Cushions · bedding"]],
    gen: TX.gallery.linen,
  },
];

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function Materials() {
  const sec = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [urls, setUrls] = useState<string[]>([]);
  const [lens, setLens] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // lazy-generate textures when the section approaches
  useEffect(() => {
    const el = sec.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const out: string[] = [];
        const next = (i: number) => {
          if (cancelled || i >= MATS.length) return;
          setTimeout(() => {
            out.push(MATS[i].gen().toDataURL("image/jpeg", 0.88));
            setUrls([...out]);
            next(i + 1);
          }, 30);
        };
        next(0);
      },
      { rootMargin: "1600px 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
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
      setP(clamp(-r.top / total));
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

  const N = MATS.length;
  const m = Math.min(N - 0.0001, p * N);
  const i = Math.floor(m);
  const f = m - i;
  const hasNext = i < N - 1;
  const zoom = 1 + smooth(0.42, 0.88, f) * (hasNext ? 2.2 : 0.9);
  const nextOp = hasNext ? smooth(0.7, 0.96, f) : 0;
  const nextScale = 2.6 - 1.6 * nextOp;
  const textIdx = f > 0.82 && hasNext ? i + 1 : i;
  const cur = MATS[textIdx];
  const close = zoom < 1.08;

  const goto = (k: number) => {
    const el = sec.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const top = el.offsetTop + ((k + 0.12) / N) * total;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const onMove = (e: React.PointerEvent) => {
    const r = frame.current?.getBoundingClientRect();
    if (!r) return;
    setLens({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
  };

  return (
    <section ref={sec} id="materials" className="relative bg-sumi text-washi" style={{ height: `${N * 115 + 40}vh` }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-6 sm:px-10">
        <div className="mx-auto grid w-full max-w-[1240px] items-center gap-8 md:grid-cols-[1fr_auto] md:gap-20">
          {/* text */}
          <div className="order-2 md:order-1">
            <p className="eyebrow mb-6 flex items-center gap-4 text-washi/55">
              <span>03</span>
              <span className="h-px w-10 bg-washi/30" />
              Material surfaces
            </p>
            <div key={cur.id} className="rise">
              <div className="flex items-end gap-5">
                <span className="font-jp text-[clamp(64px,9vw,128px)] leading-[0.9] text-shu">{cur.jp}</span>
                <span className="eyebrow pb-3 text-washi/50">{String(textIdx + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}</span>
              </div>
              <h2 className="mt-4 font-serif text-[clamp(44px,6vw,84px)] leading-none tracking-tight">{cur.name}</h2>
              <p className="eyebrow mt-3 text-washi/55">{cur.sub}</p>
              <p className="mt-6 max-w-[44ch] text-[15.5px] leading-[1.75] text-washi/75">{cur.body}</p>
              <dl className="mt-7 grid max-w-[460px] grid-cols-1 gap-2 border-t border-washi/15 pt-5 text-[13px]">
                {cur.facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6">
                    <dt className="eyebrow text-[10px] text-washi/45">{k}</dt>
                    <dd className="text-washi/85">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="mt-8 flex max-w-[460px] gap-2">
              {MATS.map((mm, k) => (
                <button key={mm.id} onClick={() => goto(k)} className="group flex-1 text-left" aria-label={`Show ${mm.name}`}>
                  <span className="block h-[3px] overflow-hidden rounded bg-washi/15">
                    <span className="block h-full bg-shu" style={{ width: `${k < i ? 100 : k === i ? f * 100 : 0}%` }} />
                  </span>
                  <span className={`eyebrow mt-2 block text-[9px] transition ${k === textIdx ? "text-washi" : "text-washi/40 group-hover:text-washi/80"}`}>{mm.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* frame */}
          <div className="order-1 flex justify-center md:order-2">
            <div
              ref={frame}
              onPointerMove={onMove}
              onPointerLeave={() => setLens(null)}
              className="relative aspect-[4/5] h-[min(46vh,660px)] overflow-hidden rounded-[22px] bg-[#2a2823] shadow-[0_40px_120px_-30px_rgba(0,0,0,.8)] md:h-[min(68vh,660px)]"
              style={{ cursor: close ? "none" : "default" }}
            >
              {MATS.map((mm, k) => {
                const url = urls[k];
                let op = 0;
                let sc = 1;
                if (k === i) {
                  op = 1;
                  sc = zoom;
                } else if (k === i + 1) {
                  op = nextOp;
                  sc = nextScale;
                }
                return (
                  <div
                    key={mm.id}
                    className="absolute inset-0 will-change-transform"
                    style={{
                      backgroundImage: url ? `url(${url})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      opacity: op,
                      transform: `scale(${sc})`,
                      zIndex: k === i + 1 ? 2 : 1,
                      imageRendering: "auto",
                    }}
                  />
                );
              })}
              <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/10" />
              <div className="eyebrow pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-black/35 px-3 py-1.5 text-[9px] text-white backdrop-blur">
                {close ? "Hover to magnify" : "Moving into the texture…"}
              </div>
              {/* loupe */}
              {lens && close && urls[i] && (
                <div
                  className="pointer-events-none absolute z-10 h-[150px] w-[150px] rounded-full border-2 border-white/80 shadow-[0_10px_40px_rgba(0,0,0,.5)]"
                  style={{
                    left: lens.x - 75,
                    top: lens.y - 75,
                    backgroundImage: `url(${urls[i]})`,
                    backgroundSize: `${lens.h * 3.2}px ${lens.h * 3.2}px`,
                    backgroundPosition: `${-((lens.x + (lens.h - lens.w) / 2) * 3.2 - 75)}px ${-(lens.y * 3.2 - 75)}px`,
                    backgroundRepeat: "no-repeat",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
