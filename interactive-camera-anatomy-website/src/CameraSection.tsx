import { useMemo, useRef } from "react";
import type { CameraDef } from "./types";
import CameraStage from "./CameraStage";
import { LAYERS, LAYER_COLOR, LAYER_LABEL, computeTimeline, useCompact, useSectionProgress, type Timeline } from "./engine";

interface Props {
  camera: CameraDef;
  index: number;
  total: number;
  next?: CameraDef;
}

export default function CameraSection({ camera, total, next }: Props) {
  const ref = useRef<HTMLElement>(null);
  const p = useSectionProgress(ref);
  const compact = useCompact();
  const tl = useMemo(() => computeTimeline(camera.parts, p), [camera, p]);

  return (
    <section id={camera.id} ref={ref} className="relative" style={{ height: "1000vh" }}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-[#0c0b0a]">
        {/* ambience */}
        <div className="blueprint-grid absolute inset-0 opacity-70" />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 70% at 68% 50%, ${camera.glow}, transparent 70%)` }} />
        <div className="pointer-events-none absolute -bottom-10 right-2 select-none font-display leading-none text-white/[0.035]" style={{ fontSize: "min(46vw, 70vh)" }}>
          {camera.no}
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,.55)_100%)]" />

        <div className="relative flex h-full w-full flex-col md:grid md:grid-cols-[minmax(340px,31%)_1fr]">
          <div className="order-2 min-h-0 flex-1 md:order-1 md:flex-none">
            <Panel camera={camera} tl={tl} total={total} next={next} p={p} />
          </div>
          <div className="order-1 h-[52svh] min-h-0 md:order-2 md:h-full">
            <CameraStage camera={camera} p={p} compact={compact} timeline={tl} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({ camera, tl, total, next, p }: { camera: CameraDef; tl: Timeline; total: number; next?: CameraDef; p: number }) {
  const n = tl.order.length;
  const part = tl.activeRank >= 0 ? tl.order[tl.activeRank] : undefined;
  const acc = camera.accent;
  const segs: [string, number][] = [
    ["Take apart", tl.prog.explode],
    ["Examine", tl.prog.examine],
    ["Rebuild", tl.prog.rebuild],
  ];
  const curSeg = tl.phase === "rebuild" || tl.phase === "done" ? 2 : tl.phase === "examine" || tl.phase === "gap" ? 1 : 0;

  return (
    <div className="flex h-full flex-col justify-center gap-3 px-5 pb-4 pt-2 md:gap-6 md:px-9 md:py-10">
      {/* header */}
      <div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[#efe8da]/60 md:text-[11px]">
          <span style={{ color: acc }}>
            {camera.no} / {String(total).padStart(2, "0")}
          </span>
          <span className="h-px w-8 bg-white/25" />
          <span>{camera.kind}</span>
        </div>
        <h2 className="mt-1 font-display text-[28px] leading-[0.95] text-[#f4eee2] md:mt-3 md:text-[56px]">{camera.name}</h2>
        <div className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.2em] text-[#efe8da]/45 md:mt-2 md:block md:text-[11px]">
          {camera.model} · {camera.year}
        </div>
      </div>

      {/* phase bar */}
      <div className="grid grid-cols-3 gap-1.5">
        {segs.map(([label, v], i) => (
          <div key={label}>
            <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: acc }} />
            </div>
            <div className={"mt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] md:text-[10px] " + (i === curSeg && p > 0.04 ? "text-[#f4eee2]" : "text-[#efe8da]/35")}>{label}</div>
          </div>
        ))}
      </div>

      {/* body */}
      <div className="min-h-0 md:min-h-[300px]">
        {tl.phase === "intro" && (
          <div key="intro" className="fade-up">
            <p className="font-display text-xl italic leading-snug text-[#f4eee2] md:text-[28px]">{camera.tagline}</p>
            <p className="mt-2 hidden text-[13px] leading-relaxed text-[#efe8da]/65 md:mt-4 md:block md:text-[14px]">{camera.story}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 md:mt-6">
              {camera.stats.map(([k, v]) => (
                <div key={k} className="border-l border-white/15 pl-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#efe8da]/40">{k}</div>
                  <div className="mt-0.5 text-[11px] leading-tight text-[#efe8da]/90 md:text-[12.5px]">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tl.phase === "explode" && (
          <div key="explode" className="fade-up">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: acc }}>
              Disassembling
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-[56px] leading-none text-[#f4eee2] md:text-[96px]">{String(tl.freed).padStart(2, "0")}</span>
              <span className="font-mono text-sm text-[#efe8da]/50">/ {String(n).padStart(2, "0")} parts free</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#efe8da]/65 md:mt-4 md:text-[14px]">
              Skin comes off first, then the muscle, then the bones — laid out on the table in three tiers, exactly as they came apart.
            </p>
          </div>
        )}

        {tl.phase === "examine" && part && (
          <div key={part.id} className="fade-up">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] font-bold tracking-[0.2em]" style={{ color: acc }}>
                {String(tl.activeRank + 1).padStart(2, "0")}
                <span className="text-[#efe8da]/35"> / {String(n).padStart(2, "0")}</span>
              </span>
              <span className="rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]" style={{ borderColor: LAYER_COLOR[part.layer], color: LAYER_COLOR[part.layer] }}>
                {LAYER_LABEL[part.layer]}
              </span>
            </div>
            <h3 className="mt-2 font-display text-[26px] leading-[1.02] text-[#f4eee2] md:mt-3 md:text-[40px]">{part.name}</h3>
            <p className="mt-2 text-[13px] leading-snug text-[#f4eee2]/90 md:mt-3 md:text-[15.5px] md:leading-relaxed">{part.blurb}</p>
            <p className="mt-3 hidden text-[13px] leading-relaxed text-[#efe8da]/55 md:block">{part.detail}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 md:mt-5">
              {part.specs.map(([k, v]) => (
                <div key={k} className="border-l pl-2.5" style={{ borderColor: acc + "88" }}>
                  <div className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#efe8da]/40 md:text-[9px]">{k}</div>
                  <div className="mt-0.5 text-[11px] leading-tight text-[#efe8da]/90 md:text-[12.5px]">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-[3px] md:mt-5">
              {tl.order.map((o, i) => (
                <span key={o.id} className="h-[3px] flex-1 rounded-full" style={{ background: i === tl.activeRank ? acc : i < tl.activeRank ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.1)" }} />
              ))}
            </div>
          </div>
        )}

        {tl.phase === "gap" && (
          <div key="gap" className="fade-up">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: acc }}>
              Everything is on the table
            </div>
            <p className="mt-3 font-display text-2xl italic leading-snug text-[#f4eee2] md:text-[32px]">Now, in reverse: bones, then muscle, then skin.</p>
          </div>
        )}

        {(tl.phase === "rebuild" || tl.phase === "done") && (
          <div key={tl.phase === "done" ? "done" : "rb" + tl.layerIdx} className="fade-up">
            {tl.phase === "rebuild" ? (
              <>
                <div className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: LAYER_COLOR[LAYERS[tl.layerIdx]] }}>
                  Step {tl.layerIdx + 1} / 3
                </div>
                <h3 className="mt-2 font-display text-[36px] leading-none text-[#f4eee2] md:text-[58px]">{LAYER_LABEL[LAYERS[tl.layerIdx]]}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#efe8da]/75 md:mt-4 md:text-[14.5px]">{camera.rebuild[LAYERS[tl.layerIdx]]}</p>
              </>
            ) : (
              <>
                <div className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: acc }}>
                  Reassembled
                </div>
                <h3 className="mt-2 font-display text-[34px] italic leading-none text-[#f4eee2] md:text-[52px]">Good as it ever was.</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#efe8da]/70 md:mt-4 md:text-[14.5px]">
                  {n} parts, three layers, one working camera.{" "}
                  {next ? (
                    <>
                      Keep scrolling — next on the bench: <span className="text-[#f4eee2]">{next.name.replace("The ", "")}</span>.
                    </>
                  ) : (
                    <>Keep scrolling — it's your turn to be photographed.</>
                  )}
                </p>
              </>
            )}
            <div className="mt-3 flex gap-2 md:mt-5">
              {LAYERS.map((l, i) => {
                const done = tl.phase === "done" || tl.layerIdx > i;
                const cur = tl.layerIdx === i;
                return (
                  <div key={l} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] md:text-[10px]" style={{ borderColor: done || cur ? LAYER_COLOR[l] : "rgba(255,255,255,.15)", color: done || cur ? LAYER_COLOR[l] : "rgba(239,232,218,.35)", background: cur ? LAYER_COLOR[l] + "18" : "transparent" }}>
                    {done ? "✓" : cur ? "●" : "○"} {LAYER_LABEL[l]}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* scroll cue */}
      <div className="hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#efe8da]/40 md:flex">
        <span className="bob inline-block h-6 w-3.5 rounded-full border border-white/30 p-[3px]">
          <span className="block h-1.5 w-full rounded-full bg-white/60" />
        </span>
        {p < 0.04 ? "Scroll to take it apart" : "Keep scrolling"}
      </div>
    </div>
  );
}
