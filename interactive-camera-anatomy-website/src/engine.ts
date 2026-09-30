import { useEffect, useState, type RefObject } from "react";
import type { Layer, PartDef } from "./types";

export const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ss = (a: number, b: number, x: number) => {
  const t = cl((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Timeline of one camera section (0..1 of its scroll length) */
export const TL = {
  EX0: 0.045,
  EX1: 0.27,
  SP0: 0.27,
  SP1: 0.7,
  RB: [0.735, 0.825, 0.905, 0.985] as const,
};

export const LAYERS: Layer[] = ["skeleton", "muscle", "skin"];
export const LAYER_COLOR: Record<Layer, string> = {
  skin: "#efe8da",
  muscle: "#ff6b57",
  skeleton: "#7aa2ff",
};
export const LAYER_LABEL: Record<Layer, string> = {
  skin: "Skin",
  muscle: "Muscle",
  skeleton: "Skeleton",
};

/** disassembly / spotlight order: skin → muscle → skeleton */
export function explodeOrder(parts: PartDef[]) {
  return [...parts.filter((p) => p.layer === "skin"), ...parts.filter((p) => p.layer === "muscle"), ...parts.filter((p) => p.layer === "skeleton")];
}

export interface PartState {
  f: number; // 0 assembled … 1 fully exploded
  act: number; // spotlight 0..1
  rank: number;
  pending: number; // 0..1 : fade of not-yet-rebuilt parts
}

export interface Timeline {
  states: Record<string, PartState>;
  order: PartDef[];
  phase: "intro" | "explode" | "examine" | "gap" | "rebuild" | "done";
  activeRank: number;
  freed: number;
  layerIdx: number; // which layer is being rebuilt (0..2), -1 otherwise
  prog: { explode: number; examine: number; rebuild: number };
  dim: number;
  labelFade: number;
}

export function computeTimeline(parts: PartDef[], p: number): Timeline {
  const order = explodeOrder(parts);
  const n = order.length;
  const { EX0, EX1, SP0, SP1, RB } = TL;
  const span = EX1 - EX0;
  const stag = (span * 0.58) / Math.max(1, n - 1);
  const dur = span * 0.42;

  const spotP = (p - SP0) / (SP1 - SP0);
  const inSpot = spotP >= 0 && spotP <= 1;
  const activeRank = inSpot ? Math.min(n - 1, Math.floor(spotP * n)) : -1;
  const q = inSpot ? spotP * n - activeRank : 0;
  const actVal = ss(0, 0.14, q) * (1 - ss(0.86, 1, q));

  const dim = ss(SP0 - 0.012, SP0 + 0.012, p) * (1 - ss(SP1 - 0.01, SP1 + 0.02, p));
  const fade = ss(RB[0] - 0.025, RB[0], p);

  const states: Record<string, PartState> = {};
  let freed = 0;
  order.forEach((part, rank) => {
    const t0 = EX0 + rank * stag;
    const ex = ease(cl((p - t0) / dur));
    if (ex > 0.5) freed++;

    const li = LAYERS.indexOf(part.layer);
    const group = order.filter((o) => o.layer === part.layer);
    const j = group.findIndex((g) => g.id === part.id);
    const m = group.length;
    const a = RB[li];
    const b = RB[li + 1];
    const lspan = b - a;
    const rstag = (lspan * 0.5) / Math.max(1, m - 1);
    const rdur = m > 1 ? lspan * 0.5 : lspan * 0.9;
    const rb = ease(cl((p - (a + j * rstag)) / rdur));

    const f = ex * (1 - rb);
    const act = rank === activeRank ? actVal : 0;
    const pending = fade * (1 - ss(0, 0.25, rb));
    states[part.id] = { f, act, rank, pending };
  });

  let phase: Timeline["phase"] = "intro";
  if (p >= RB[3]) phase = "done";
  else if (p >= RB[0]) phase = "rebuild";
  else if (p >= SP1) phase = "gap";
  else if (p >= SP0) phase = "examine";
  else if (p >= EX0) phase = "explode";

  let layerIdx = -1;
  if (phase === "rebuild") layerIdx = p < RB[1] ? 0 : p < RB[2] ? 1 : 2;

  return {
    states,
    order,
    phase,
    activeRank,
    freed,
    layerIdx,
    dim,
    labelFade: 1 - ss(RB[0] - 0.03, RB[0] + 0.005, p),
    prog: {
      explode: cl((p - EX0) / (EX1 - EX0)),
      examine: cl((p - SP0) / (SP1 - SP0)),
      rebuild: cl((p - RB[0]) / (RB[3] - RB[0])),
    },
  };
}

/* ───────── exploded layout: 3 tiers (skin / muscle / skeleton) shelf-packed ───────── */

export interface Slot {
  x: number;
  y: number;
  s: number;
  labelY: number;
}
export interface Layout {
  slots: Record<string, Slot>;
  tiers: { layer: Layer; y0: number; y1: number }[];
  seps: number[];
  x0: number;
}

export function packLayout(parts: PartDef[], compact: boolean): Layout {
  const reg = compact ? { x0: 168, x1: 832, y0: 40, y1: 704 } : { x0: 100, x1: 964, y0: 14, y1: 722 };
  const W = reg.x1 - reg.x0;
  const H = reg.y1 - reg.y0;
  const order = explodeOrder(parts);
  const GAP = compact ? 18 : 24;
  const LH = compact ? 18 : 30;
  const RG = 12;
  const LG = 26;

  const items = order.map((p, i) => ({
    p,
    w: 2 * p.w * (p.ps ?? 1),
    h: 2 * p.h * (p.ps ?? 1),
    lw: compact ? 26 : (String(i + 1).length + 1 + p.name.length) * 6.9 + 14,
  }));

  type Row = { layer: Layer; items: { it: (typeof items)[number]; sw: number }[]; w: number; h: number };
  const attempt = (k: number) => {
    const rows: Row[] = [];
    let cur: Row | null = null;
    for (const it of items) {
      const aw = it.w * k;
      const sw = Math.max(aw, it.lw);
      if (sw > W) return null;
      if (!cur || cur.layer !== it.p.layer || cur.w + GAP + sw > W) {
        cur = { layer: it.p.layer, items: [], w: 0, h: 0 };
        rows.push(cur);
      }
      cur.w += (cur.items.length ? GAP : 0) + sw;
      cur.items.push({ it, sw });
      cur.h = Math.max(cur.h, it.h * k);
    }
    let total = 0;
    rows.forEach((r, i) => {
      total += r.h + LH;
      if (i) total += rows[i - 1].layer !== r.layer ? LG : RG;
    });
    return total <= H ? { rows, total } : null;
  };

  let k = 1.3;
  let res = attempt(k);
  while (!res && k > 0.1) {
    k -= 0.02;
    res = attempt(k);
  }
  const { rows, total } = res ?? attempt(0.1)!;

  const slots: Record<string, Slot> = {};
  const tierMap = new Map<Layer, { y0: number; y1: number }>();
  const seps: number[] = [];
  let y = reg.y0 + (H - total) / 2;
  rows.forEach((r, i) => {
    if (i) {
      const brk = rows[i - 1].layer !== r.layer;
      y += brk ? LG : RG;
      if (brk) seps.push(y - LG / 2);
    }
    let x = reg.x0 + (W - r.w) / 2;
    r.items.forEach(({ it, sw }) => {
      slots[it.p.id] = { x: x + sw / 2, y: y + r.h / 2, s: (it.p.ps ?? 1) * k, labelY: y + r.h + (compact ? 12 : 20) };
      x += sw + GAP;
    });
    const t = tierMap.get(r.layer);
    tierMap.set(r.layer, { y0: t ? t.y0 : y, y1: y + r.h + LH - 6 });
    y += r.h + LH;
  });

  return {
    slots,
    tiers: [...tierMap.entries()].map(([layer, v]) => ({ layer, ...v })),
    seps,
    x0: reg.x0,
  };
}

/* ───────── hooks ───────── */

export function useSectionProgress(ref: RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    let last = -1;
    const calc = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const v = total <= 0 ? 0 : cl(-r.top / total);
      const qv = Math.round(v * 4000) / 4000;
      if (qv !== last) {
        last = qv;
        setP(qv);
      }
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
  }, [ref]);
  return p;
}

export function useCompact(query = "(max-width: 767px)") {
  const [c, setC] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const m = window.matchMedia(query);
    const h = () => setC(m.matches);
    m.addEventListener("change", h);
    h();
    return () => m.removeEventListener("change", h);
  }, [query]);
  return c;
}
