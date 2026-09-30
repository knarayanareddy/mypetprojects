import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";

const PRINCIPLES = [
  {
    jp: "間",
    name: "Ma",
    title: "The pause between things",
    body: "Rooms are not sealed boxes but intervals. Sliding screens let a single space hold three moods in a day — open to the garden at noon, folded inward at dusk.",
  },
  {
    jp: "縁",
    name: "Engawa",
    title: "A veranda that belongs to neither side",
    body: "Deep eaves shade a band of timber floor that is half inside, half out. It is where shoes come off, tea is poured and the rain is watched.",
  },
  {
    jp: "借景",
    name: "Shakkei",
    title: "Borrowed scenery",
    body: "Windows are placed to frame a maple, a ridge line, a corner of the pond. The garden is not beside the house; it is part of every room.",
  },
];

function Count({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1600);
        setV(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref}>
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function Architecture() {
  const [open, setOpen] = useState(0);
  return (
    <section id="architecture" className="relative bg-washi px-6 py-28 text-sumi sm:px-10 md:py-40">
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <p className="eyebrow mb-8 flex items-center gap-4 text-sumi/60">
            <span>02</span>
            <span className="h-px w-10 bg-sumi/30" />
            Architecture
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="max-w-[16ch] font-serif text-[clamp(44px,8vw,116px)] leading-[0.95] tracking-[-0.025em]">
            A house that measures itself in <em className="text-shu">mats</em> and moments.
          </h2>
        </Reveal>

        <div className="mt-20 grid gap-14 md:grid-cols-[1fr_1.15fr] md:gap-24">
          <Reveal>
            <p className="max-w-[46ch] text-[17px] leading-[1.75] text-sumi/75">
              Seijaku is a single-storey timber residence under two tiled roofs, built on a 0.9&nbsp;metre module. Six rooms share one continuous path: from the gravel approach through a genkan of river stone, past paper screens and a courtyard of raked stone, to a bath that opens to the pond.
            </p>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-[1.75] text-sumi/75">
              Everything you just walked through was constructed from geometry at runtime — every post, beam, tile and ripple. Nothing is baked; try the seasons, change the hour, or lift the roof in inspection mode.
            </p>
          </Reveal>

          <div className="border-t border-sumi/20">
            {PRINCIPLES.map((p, i) => {
              const active = open === i;
              return (
                <Reveal key={p.name} delay={i * 90} className="border-b border-sumi/20">
                  <button onClick={() => setOpen(active ? -1 : i)} className="group flex w-full items-center gap-6 py-7 text-left" aria-expanded={active}>
                    <span className={`font-jp text-[44px] leading-none transition-colors ${active ? "text-shu" : "text-sumi/40 group-hover:text-sumi"}`}>{p.jp}</span>
                    <span className="flex-1">
                      <span className="eyebrow block text-sumi/50">{p.name}</span>
                      <span className="mt-1 block font-serif text-[clamp(24px,3vw,34px)] leading-tight">{p.title}</span>
                    </span>
                    <span className={`grid h-9 w-9 place-items-center rounded-full border border-sumi/30 transition-transform duration-500 ${active ? "rotate-45 bg-sumi text-washi" : ""}`}>
                      <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.4">
                        <path d="M6 0v12M0 6h12" />
                      </svg>
                    </span>
                  </button>
                  <div className="grid transition-[grid-template-rows] duration-500" style={{ gridTemplateRows: active ? "1fr" : "0fr" }}>
                    <div className="overflow-hidden">
                      <p className="max-w-[52ch] pb-8 pl-[70px] text-[15.5px] leading-[1.75] text-sumi/70">{p.body}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        <div className="mt-28 grid grid-cols-2 gap-y-12 border-t border-sumi/20 pt-12 md:grid-cols-4">
          {[
            { n: 6, s: "", l: "Rooms on one path", d: 0 },
            { n: 0, s: "", l: "Nails in the frame", d: 0 },
            { n: 0.9, s: " m", l: "The tatami module", d: 1 },
            { n: 3, s: "", l: "Gardens, four seasons", d: 0 },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 80}>
              <div className="font-serif text-[clamp(56px,8vw,104px)] leading-none tracking-tight">
                <Count to={s.n} suffix={s.s} decimals={s.d} />
              </div>
              <p className="eyebrow mt-3 text-sumi/55">{s.l}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
