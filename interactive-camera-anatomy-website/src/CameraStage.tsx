import { memo, useMemo } from "react";
import type { CameraDef, PartDef } from "./types";
import { Defs } from "./cameras/kit";
import { LAYER_COLOR, LAYER_LABEL, computeTimeline, lerp, packLayout, ss, type Timeline } from "./engine";

const Art = memo(function Art({ part, spin, pulse }: { part: PartDef; spin: number; pulse: number }) {
  return <>{part.render({ spin, pulse })}</>;
});

interface Props {
  camera: CameraDef;
  p: number;
  compact: boolean;
  /** hero mode: gentle breathing apart (0..1), no labels */
  hero?: number;
  timeline?: Timeline;
}

export default function CameraStage({ camera, p, compact, hero, timeline }: Props) {
  const layout = useMemo(() => packLayout(camera.parts, compact), [camera, compact]);
  const tl = useMemo(() => timeline ?? computeTimeline(camera.parts, p), [timeline, camera, p]);
  const spinBase = Math.round(p * 1800 * 2) / 2;
  const pulseBase = Math.round((0.5 + 0.5 * Math.sin(p * 70)) * 50) / 50;

  // paint order (assembled): by z / index, active part last
  const paint = useMemo(
    () =>
      camera.parts
        .map((part, i) => ({ part, z: part.z ?? i }))
        .sort((a, b) => a.z - b.z)
        .map((x) => x.part),
    [camera]
  );
  const activePart = tl.activeRank >= 0 ? tl.order[tl.activeRank] : undefined;
  const drawList = activePart && tl.states[activePart.id].act > 0.01 ? [...paint.filter((x) => x !== activePart), activePart] : paint;

  const minF = Math.min(...Object.values(tl.states).map((s) => s.f));
  const tierOp = tl.labelFade * ss(0.85, 1, minF);
  const acc = camera.accent;

  return (
    <svg viewBox={compact ? "150 0 700 744" : "0 -40 1000 800"} className="h-full w-full overflow-visible" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${camera.name} exploded view`}>
      <Defs />

      {/* tier guides */}
      {hero === undefined && (
        <g opacity={tierOp} style={{ pointerEvents: "none" }}>
          {layout.seps.map((y) => (
            <line key={y} x1={layout.x0 - 10} x2={compact ? 832 : 962} y1={y} y2={y} stroke="rgba(255,255,255,.12)" strokeDasharray="2 6" />
          ))}
          {!compact &&
            layout.tiers.map((t) => (
              <text
                key={t.layer}
                transform={`translate(${layout.x0 - 52} ${(t.y0 + t.y1) / 2}) rotate(-90)`}
                textAnchor="middle"
                fontSize="11"
                letterSpacing="5"
                fontFamily="JetBrains Mono, monospace"
                fill={LAYER_COLOR[t.layer]}
                opacity=".75"
              >
                {LAYER_LABEL[t.layer].toUpperCase()}
              </text>
            ))}
        </g>
      )}

      {/* flight trails */}
      {hero === undefined &&
        camera.parts.map((part) => {
          const st = tl.states[part.id];
          const sl = layout.slots[part.id];
          const o = Math.sin(Math.PI * st.f) * 0.28;
          if (o < 0.02) return null;
          return <line key={part.id} x1={part.cx} y1={part.cy} x2={sl.x} y2={sl.y} stroke={acc} strokeOpacity={o} strokeDasharray="3 7" />;
        })}

      {/* parts */}
      {drawList.map((part) => {
        const st = tl.states[part.id];
        const sl = layout.slots[part.id];
        let tx: string;
        let opacity = 1;
        let shadow = false;
        if (hero !== undefined) {
          const k = hero * 0.22;
          tx = `translate(${lerp(part.cx, sl.x, k)} ${lerp(part.cy, sl.y, k) - hero * 10}) translate(${-part.cx} ${-part.cy})`;
          shadow = hero > 0.05;
        } else {
          const f = st.f;
          const arc = Math.sin(Math.PI * f) * 26;
          const dir = st.rank % 2 ? 1 : -1;
          const rot = Math.sin(Math.PI * f) * 5 * dir + (part.rot ?? 0) * f;
          const sc = lerp(1, sl.s, f) * (1 + 0.3 * st.act);
          tx = `translate(${lerp(part.cx, sl.x, f)} ${lerp(part.cy, sl.y, f) - arc}) rotate(${rot}) scale(${sc}) translate(${-part.cx} ${-part.cy})`;
          opacity = (1 - tl.dim * (1 - st.act) * 0.62) * (1 - 0.9 * st.pending);
          shadow = f > 0.04;
        }
        return (
          <g key={part.id} transform={tx} opacity={opacity} filter={shadow ? "url(#ds)" : undefined}>
            <Art part={part} spin={part.dyn ? spinBase : 0} pulse={part.dyn ? pulseBase : 0} />
          </g>
        );
      })}

      {/* labels + spotlight bracket */}
      {hero === undefined &&
        camera.parts.map((part) => {
          const st = tl.states[part.id];
          const sl = layout.slots[part.id];
          const op = ss(0.88, 1, st.f) * tl.labelFade;
          if (op < 0.02) return null;
          const num = String(st.rank + 1).padStart(2, "0");
          const isAct = st.act > 0.02;
          const hw = part.w * sl.s * (1 + 0.3 * st.act) + 14;
          const hh = part.h * sl.s * (1 + 0.3 * st.act) + 14;
          const L = 16;
          const showText = !compact || isAct;
          return (
            <g key={"l" + part.id} opacity={op} style={{ pointerEvents: "none" }}>
              {showText && (
                <text
                  x={sl.x}
                  y={compact ? sl.labelY + (isAct ? 4 : 0) : sl.labelY}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize={compact ? (isAct ? 15 : 12) : 11}
                  letterSpacing="0"
                  fill={tl.dim > 0.5 && !isAct ? "rgba(239,232,218,.45)" : "rgba(239,232,218,.92)"}
                >
                  <tspan fill={LAYER_COLOR[part.layer]} fontWeight="700">
                    {compact ? "" : num + " "}
                  </tspan>
                  {compact ? (isAct ? num + " " + part.name.toUpperCase() : "") : part.name.toUpperCase()}
                </text>
              )}
              {compact && !isAct && (
                <g transform={`translate(${sl.x} ${sl.labelY + 2})`}>
                  <circle r="9" fill="rgba(12,11,10,.85)" stroke={LAYER_COLOR[part.layer]} strokeWidth="1.2" />
                  <text y="3.6" textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill="#efe8da">
                    {num}
                  </text>
                </g>
              )}
              {isAct && (
                <g opacity={st.act} stroke={acc} strokeWidth="2" fill="none" strokeLinecap="round">
                  <path d={`M${sl.x - hw} ${sl.y - hh + L}V${sl.y - hh}H${sl.x - hw + L}`} />
                  <path d={`M${sl.x + hw - L} ${sl.y - hh}H${sl.x + hw}V${sl.y - hh + L}`} />
                  <path d={`M${sl.x + hw} ${sl.y + hh - L}V${sl.y + hh}H${sl.x + hw - L}`} />
                  <path d={`M${sl.x - hw + L} ${sl.y + hh}H${sl.x - hw}V${sl.y + hh - L}`} />
                  <circle cx={sl.x} cy={sl.y - hh - 12} r="3" fill={acc} stroke="none" />
                  <text x={sl.x} y={sl.y - hh - 20} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={compact ? 14 : 11} fill={acc} stroke="none" letterSpacing="2">
                    {LAYER_LABEL[part.layer].toUpperCase()}
                  </text>
                </g>
              )}
            </g>
          );
        })}
    </svg>
  );
}
