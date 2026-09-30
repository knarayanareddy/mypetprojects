import { memo } from "react";
import { ROOMS, POND, KEYFRAMES, PLAN, planX, planY, FRONT_PATH } from "../scene/layout";

interface Props {
  variant: "mini" | "full";
  activeId?: string | null;
  hoverId?: string | null;
  onHover?: (id: string | null) => void;
  onPick?: (kf: number, id: string) => void;
}

const EXTRA = [
  { id: "front", name: "Front garden", jp: "前庭", kf: 3, x0: -9, x1: 13, z0: 26, z1: 7 },
  { id: "pond", name: "Koi pond", jp: "池", kf: 13, x0: -6, x1: 12, z0: -46, z1: -58 },
];

function FloorPlanBase({ variant, activeId, hoverId, onHover, onPick }: Props) {
  const mini = variant === "mini";
  const C = mini
    ? {
        ground: "rgba(255,255,255,0.04)",
        house: "rgba(255,255,255,0.08)",
        line: "rgba(255,255,255,0.72)",
        room: "rgba(255,255,255,0.05)",
        active: "rgba(181,72,45,0.55)",
        hover: "rgba(255,255,255,0.2)",
        text: "rgba(255,255,255,0.9)",
        pond: "rgba(140,190,205,0.35)",
        path: "rgba(255,255,255,0.65)",
        tree: "rgba(255,255,255,0.14)",
        court: "rgba(255,255,255,0.12)",
      }
    : {
        ground: "#e5e1cf",
        house: "#f5eedd",
        line: "#1a1916",
        room: "rgba(255,255,255,0.35)",
        active: "rgba(181,72,45,0.35)",
        hover: "rgba(181,72,45,0.16)",
        text: "#1a1916",
        pond: "#a8c4c4",
        path: "#b5482d",
        tree: "#c6cfae",
        court: "#d9d3bf",
      };

  const hx = planX(7);
  const hw = 410;
  const hy = planY(-5.5);
  const hh = 110;
  const pathPts = KEYFRAMES.map((k) => `${planX(k.pos[2])},${planY(k.pos[0])}`).join(" ");
  const trees: [number, number, number][] = [
    [-7, 12.5, 14], [6.5, 14, 13], [-8.5, 22, 12], [6.5, 20.5, 11], [-11, 3.5, 10], [-10.5, -6, 11], [11, -24, 13], [-11, -37, 12], [11, -40, 14], [-3, -44.5, 11], [3.6, -7.8, 11],
  ];
  const lanterns: [number, number][] = [[-5.2, 11.5], [4.2, 17.5], [-6.8, -49.5], [-4.2, 29.5]];

  const fillFor = (id: string) => (activeId === id ? C.active : hoverId === id ? C.hover : C.room);
  const bind = (id: string, kf: number) => ({
    onMouseEnter: () => onHover?.(id),
    onMouseLeave: () => onHover?.(null),
    onClick: () => onPick?.(kf, id),
    style: { cursor: onPick ? "pointer" : "default", transition: "fill .3s" } as React.CSSProperties,
  });

  return (
    <svg viewBox={`0 0 ${PLAN.w} ${PLAN.h}`} className="block h-auto w-full" role="img" aria-label="Floor plan of the residence">
      <rect width={PLAN.w} height={PLAN.h} fill={C.ground} rx={mini ? 0 : 6} />

      {/* extra zones (clickable) */}
      {!mini &&
        EXTRA.map((z) => (
          <rect
            key={z.id}
            x={planX(z.z0)}
            y={planY(z.x0)}
            width={(z.z0 - z.z1) * 10}
            height={(z.x1 - z.x0) * 10}
            fill={z.id === "pond" ? "none" : fillFor(z.id)}
            stroke="none"
            {...bind(z.id, z.kf)}
          />
        ))}

      {trees.map(([x, z, r], i) => (
        <circle key={i} cx={planX(z)} cy={planY(x)} r={r} fill={C.tree} />
      ))}

      {/* pond */}
      <ellipse
        cx={planX(POND.cz)}
        cy={planY(POND.cx)}
        rx={POND.rz * 10}
        ry={POND.rx * 10}
        fill={activeId === "pond" ? C.active : hoverId === "pond" ? C.hover : C.pond}
        stroke={C.line}
        strokeWidth={0.8}
        {...bind("pond", 13)}
      />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={planX(-50 - i * 2.5)} cy={planY(1 + i * 3)} rx={7} ry={2.6} fill={i === 1 ? "#f2f0e8" : "#e8521c"} opacity={0.9} transform={`rotate(${20 + i * 40} ${planX(-50 - i * 2.5)} ${planY(1 + i * 3)})`} />
      ))}

      {/* wall + gate */}
      <line x1={planX(26)} y1={0} x2={planX(26)} y2={planY(-4.2)} stroke={C.line} strokeWidth={2} />
      <line x1={planX(26)} y1={planY(1.2)} x2={planX(26)} y2={PLAN.h} stroke={C.line} strokeWidth={2} />
      <rect x={planX(27)} y={planY(-4.2)} width={20} height={planY(1.2) - planY(-4.2)} fill="none" stroke={C.line} strokeWidth={1.2} strokeDasharray="3 3" />

      {/* front path stones */}
      {FRONT_PATH.map(([x, z], i) => (
        <ellipse key={i} cx={planX(z)} cy={planY(x)} rx={4} ry={3} fill={C.line} opacity={0.3} />
      ))}

      {/* house */}
      <rect x={hx} y={hy} width={hw} height={hh} fill={C.house} stroke={C.line} strokeWidth={2.5} />
      {ROOMS.map((r) => {
        const x = planX(r.z0);
        const w = (r.z0 - r.z1) * 10;
        return (
          <g key={r.id}>
            <rect x={x} y={hy} width={w} height={hh} fill={fillFor(r.id)} stroke={C.line} strokeWidth={1.4} {...bind(r.id, r.kf)} />
            {r.id === "courtyard" && (
              <rect x={x + 4} y={planY(1)} width={w - 8} height={planY(5.5) - planY(1)} fill={C.court} stroke={C.line} strokeWidth={0.8} strokeDasharray="2 3" pointerEvents="none" />
            )}
            {r.id === "bedroom" && <rect x={x + 10} y={planY(0.6)} width={w - 26} height={planY(5.2) - planY(0.6)} fill="none" stroke={C.line} strokeWidth={1} pointerEvents="none" />}
            {r.id === "bath" && <rect x={x + 14} y={planY(2.1)} width={w - 32} height={planY(4.7) - planY(2.1)} rx={4} fill="none" stroke={C.line} strokeWidth={1} pointerEvents="none" />}
            {r.id === "living" && <rect x={x + 36} y={planY(1.7)} width={46} height={planY(3.5) - planY(1.7)} fill="none" stroke={C.line} strokeWidth={1} pointerEvents="none" />}
            {r.id === "tea" && <rect x={x + 26} y={planY(-3.9)} width={10} height={planY(-2.9) - planY(-3.9)} fill="none" stroke={C.line} strokeWidth={1} pointerEvents="none" />}
            {(!mini || w > 50) && (
              <text x={x + w / 2} y={hy + (mini ? 62 : 54)} textAnchor="middle" fontSize={mini ? 20 : 22} fill={C.text} fontFamily="'Noto Serif JP', serif" pointerEvents="none">
                {r.jp}
              </text>
            )}
            {!mini && (
              <text x={x + w / 2} y={hy + 76} textAnchor="middle" fontSize={10} letterSpacing={1.5} fill={C.text} fontFamily="Inter, sans-serif" opacity={0.7} pointerEvents="none">
                {r.name.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}

      {/* lanterns */}
      {lanterns.map(([x, z], i) => (
        <circle key={i} cx={planX(z)} cy={planY(x)} r={3} fill="#e7a23c" stroke={C.line} strokeWidth={0.6} />
      ))}

      {/* walking path */}
      <polyline points={pathPts} fill="none" stroke={C.path} strokeWidth={mini ? 1.4 : 1.6} strokeDasharray="5 5" opacity={0.9} strokeLinejoin="round" />
      {!mini && (
        <>
          <text x={planX(40)} y={PLAN.h - 12} fontSize={10} letterSpacing={2} fill={C.text} opacity={0.6} fontFamily="Inter, sans-serif">
            APPROACH
          </text>
          <text x={planX(17)} y={planY(-8.3)} fontSize={10} letterSpacing={2} fill={C.text} opacity={0.6} fontFamily="Inter, sans-serif">
            GARDEN
          </text>
          <text x={planX(-50)} y={planY(-7.2)} fontSize={10} letterSpacing={2} fill={C.text} opacity={0.6} fontFamily="Inter, sans-serif">
            POND
          </text>
        </>
      )}

      {/* live position */}
      <g data-plan-dot transform={`translate(${planX(46)} ${planY(5)})`} pointerEvents="none">
        <circle r={mini ? 11 : 14} fill="#b5482d" opacity={0.25} />
        <circle r={5} fill="#b5482d" stroke="#fff" strokeWidth={1.5} />
        <path d="M6 0 L16 -5 L16 5 Z" fill="#b5482d" stroke="#fff" strokeWidth={1} strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export const FloorPlan = memo(FloorPlanBase);
