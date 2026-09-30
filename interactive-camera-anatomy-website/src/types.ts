import type { ReactNode } from "react";

export type Layer = "skeleton" | "muscle" | "skin";

export interface Ctx {
  /** degrees, grows as you scroll (drives gears etc.) */
  spin: number;
  /** 0..1 oscillation (drives shutter blades, iris) */
  pulse: number;
}

export interface PartDef {
  id: string;
  name: string;
  layer: Layer;
  /** assembled centre */
  cx: number;
  cy: number;
  /** half extents of the artwork */
  w: number;
  h: number;
  /** relative size weight when laid out exploded */
  ps?: number;
  /** exploded rotation (deg) */
  rot?: number;
  /** override assembled paint order (default = array index) */
  z?: number;
  /** render depends on ctx (spin/pulse) */
  dyn?: boolean;
  blurb: string;
  detail: string;
  specs: [string, string][];
  render: (c: Ctx) => ReactNode;
}

export interface CameraDef {
  id: string;
  no: string;
  name: string;
  model: string;
  year: string;
  kind: string;
  tagline: string;
  story: string;
  accent: string;
  glow: string;
  stats: [string, string][];
  rebuild: { skeleton: string; muscle: string; skin: string };
  parts: PartDef[];
}
