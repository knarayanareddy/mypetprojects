import { useState } from "react";
import { ROOMS } from "../scene/layout";
import { useApp } from "../ctx";
import { FloorPlan } from "./FloorPlan";
import { Reveal } from "./Reveal";

export function Rooms() {
  const { jumpKf } = useApp();
  const [hover, setHover] = useState<string | null>(null);
  const hovered = ROOMS.find((r) => r.id === hover);

  return (
    <section id="rooms" className="relative bg-[#ece5d6] px-6 py-28 text-sumi sm:px-10 md:py-40">
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <p className="eyebrow mb-8 flex items-center gap-4 text-sumi/60">
            <span>06</span>
            <span className="h-px w-10 bg-sumi/30" />
            Rooms
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="max-w-[15ch] font-serif text-[clamp(44px,7vw,100px)] leading-[0.95] tracking-[-0.025em]">
            One path, <em className="text-shu">six rooms.</em>
          </h2>
        </Reveal>

        <Reveal className="mt-14" delay={100}>
          <div className="relative overflow-hidden rounded-[22px] border border-sumi/10 bg-washi p-3 sm:p-6">
            <div className="no-scrollbar overflow-x-auto">
              <div className="min-w-[760px]">
                <FloorPlan variant="full" hoverId={hover} onHover={setHover} onPick={(kf, id) => jumpKf(kf, id)} />
              </div>
            </div>
            <div className="mt-3 flex min-h-[28px] flex-wrap items-center justify-between gap-2 px-1 text-[12.5px] text-sumi/60">
              <span>{hovered ? `${hovered.jp} ${hovered.name} — ${hovered.size}` : "Hover a room, click to be carried there."}</span>
              <span className="eyebrow flex items-center gap-2 text-[9.5px]">
                <span className="inline-block h-px w-6 border-t border-dashed border-shu" /> Walking path
                <span className="ml-3 inline-block h-2 w-2 rounded-full bg-[#e7a23c]" /> Lantern
              </span>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROOMS.map((r, i) => (
            <Reveal key={r.id} delay={(i % 3) * 90}>
              <button
                onMouseEnter={() => setHover(r.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(r.id)}
                onBlur={() => setHover(null)}
                onClick={() => jumpKf(r.kf, r.id)}
                className={`group relative flex h-full w-full flex-col overflow-hidden rounded-[20px] border p-6 text-left transition duration-500 ${hover === r.id ? "border-shu bg-white shadow-[0_24px_50px_-28px_rgba(181,72,45,.6)]" : "border-sumi/12 bg-white/45 hover:bg-white/70"}`}
              >
                <div className="flex items-start justify-between">
                  <span className="eyebrow text-[10px] text-sumi/45">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`font-jp text-[46px] leading-none transition-colors ${hover === r.id ? "text-shu" : "text-sumi/25"}`}>{r.jp}</span>
                </div>
                <h3 className="mt-6 font-serif text-[34px] leading-none">{r.name}</h3>
                <p className="mt-3 flex-1 text-[14px] leading-relaxed text-sumi/70">{r.blurb}</p>
                <div className="mt-5 flex items-end justify-between border-t border-sumi/10 pt-4">
                  <div>
                    <p className="text-[12px] text-sumi/60">{r.size}</p>
                    <p className="text-[12px] text-sumi/45">{r.floor}</p>
                  </div>
                  <span className="eyebrow flex items-center gap-2 text-[10px] text-shu transition-all group-hover:gap-3">
                    Enter
                    <svg width="16" height="8" viewBox="0 0 18 8" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M0 4h17M13 1l4 3-4 3" />
                    </svg>
                  </span>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
