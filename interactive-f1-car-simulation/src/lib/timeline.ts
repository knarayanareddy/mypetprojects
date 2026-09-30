export type BeatKind =
  | "hero"
  | "tour"
  | "rebuildIntro"
  | "skeleton"
  | "muscle"
  | "skin"
  | "complete"
  | "tunnelIn"
  | "tunnel";

export interface Beat {
  kind: BeatKind;
  len: number; // in viewport heights
  part?: number;
}

export const PART_COUNT = 16;

export const BEATS: Beat[] = [
  { kind: "hero", len: 1.1 },
  ...Array.from({ length: PART_COUNT }, (_, i) => ({ kind: "tour" as BeatKind, len: 0.9, part: i })),
  { kind: "rebuildIntro", len: 0.9 },
  { kind: "skeleton", len: 1.8 },
  { kind: "muscle", len: 2.2 },
  { kind: "skin", len: 1.8 },
  { kind: "complete", len: 1.0 },
  { kind: "tunnelIn", len: 1.3 },
  { kind: "tunnel", len: 0.8 },
];

export const START: number[] = [];
let acc = 0;
for (const b of BEATS) {
  START.push(acc);
  acc += b.len;
}
export const TOTAL = acc;

export const IDX = {
  hero: 0,
  tour0: 1,
  rebuildIntro: 1 + PART_COUNT,
  skeleton: 2 + PART_COUNT,
  muscle: 3 + PART_COUNT,
  skin: 4 + PART_COUNT,
  complete: 5 + PART_COUNT,
  tunnelIn: 6 + PART_COUNT,
  tunnel: 7 + PART_COUNT,
};

export function locate(s: number): { i: number; t: number } {
  const c = Math.max(0, Math.min(TOTAL - 1e-6, s));
  for (let i = BEATS.length - 1; i >= 0; i--) {
    if (c >= START[i]) return { i, t: Math.min(1, (c - START[i]) / BEATS[i].len) };
  }
  return { i: 0, t: 0 };
}

export const ARRIVAL: Record<"skeleton" | "muscle" | "skin", string[]> = {
  skeleton: ["floor", "monocoque", "frontsusp", "rearsusp", "halo"],
  muscle: ["energystore", "fuelcell", "powerunit", "gearbox", "cooling", "brakes", "cockpit"],
  skin: ["sidepods", "frontwing", "tyres", "rearwing"],
};

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
