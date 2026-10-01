import type { V3 } from "../kin";
import type { Arm, Fixture, SimObject, Step } from "./types";
import type { SoundSpec } from "../audio";

export const TAU = Math.PI * 2;
export const BASE: Record<Arm, V3> = { a: [-16, 0, -14], b: [16, 0, -14] };

type Opt = Partial<Step>;

export const mv = (arm: Arm, p: V3, dur = 0.8, o: Opt = {}): Step => ({ arm, dur, p, ...o });
export const wait = (arm: Arm, dur: number, o: Opt = {}): Step => ({ arm, dur, ...o });
export const sync = (arm: Arm, name: string): Step => ({ arm, dur: 0, sync: name });
export const home = (arm: Arm, dur = 1.1): Step => ({ arm, dur, rest: true });
export const say = (arm: Arm, text: string, dur = 0.01): Step => ({ arm, dur, say: text });

/** Move above (x,z), descend, close on object `id`, lift. */
export function pick(arm: Arm, id: string, x: number, z: number, o: { y?: number; grip?: number; h?: number; pitch?: number; dur?: number } = {}): Step[] {
  const { y = 1.6, grip = 0.3, h = 7, pitch = -90, dur = 0.8 } = o;
  return [
    mv(arm, [x, y + h, z], dur, { pitch, grip: 1 }),
    mv(arm, [x, y, z], 0.5, { pitch }),
    { arm, dur: 0.05, grab: id, grip },
    mv(arm, [x, y + h, z], 0.5, { pitch }),
  ];
}

/** Move above (x,z), lower, release, lift. */
export function place(arm: Arm, x: number, z: number, o: { y?: number; h?: number; pitch?: number; dur?: number; fire?: string } = {}): Step[] {
  const { y = 1.6, h = 7, pitch = -90, dur = 0.8, fire } = o;
  return [
    mv(arm, [x, y + h, z], dur, { pitch }),
    mv(arm, [x, y, z], 0.5, { pitch }),
    { arm, dur: 0.2, drop: true, grip: 1, fire },
    mv(arm, [x, y + h, z], 0.4, { pitch }),
  ];
}

/** Quick strike / press on a trigger fixture. */
export function strike(arm: Arm, x: number, z: number, o: { y?: number; h?: number; pitch?: number; fire?: string } = {}): Step[] {
  const { y = 2.2, h = 5.5, pitch = -90 } = o;
  return [
    mv(arm, [x, y + h, z], 0.2, { pitch, grip: 0 }),
    mv(arm, [x, y, z], 0.1, { pitch, hit: true, fire: o.fire }),
    mv(arm, [x, y + h, z], 0.14, { pitch }),
  ];
}

/** Pen-plot a parametric curve u∈[0,1] -> [x,z] at height y. */
export function plot(arm: Arm, f: (u: number) => [number, number], o: { n?: number; dur?: number; y?: number; color?: string; pitch?: number; h?: number } = {}): Step[] {
  const { n = 40, dur = 6, y = 1.2, color = "#ff7a1a", pitch = -90, h = 5 } = o;
  const [x0, z0] = f(0);
  const out: Step[] = [mv(arm, [x0, y + h, z0], 0.7, { pitch, grip: 0.2 }), mv(arm, [x0, y, z0], 0.3, { pitch })];
  for (let i = 1; i <= n; i++) {
    const [x, z] = f(i / n);
    out.push(mv(arm, [x, y, z], dur / n, { pitch, trail: color }));
  }
  const [x1, z1] = f(1);
  out.push(mv(arm, [x1, y + h, z1], 0.4, { pitch }));
  return out;
}

export const box = (pos: V3, size: V3, color: number, o: Partial<Fixture> = {}): Fixture => ({ shape: "box", pos, size, color, ...o });
export const cyl = (pos: V3, d: number, h: number, color: number, o: Partial<Fixture> = {}): Fixture => ({ shape: "cyl", pos, size: [d, h, d], color, ...o });
/** Fixture whose top surface sits at height `top` with thickness `t`, centred at (x,z). */
export const slab = (x: number, z: number, w: number, d: number, top: number, color: number, o: Partial<Fixture> = {}): Fixture =>
  box([x, top / 2, z], [w, top, d], color, o);

export const cube = (id: string, x: number, z: number, color: number, s = 3, y?: number): SimObject => ({
  id,
  shape: "box",
  pos: [x, y ?? s / 2, z],
  size: [s, s, s],
  color,
});
export const ball = (id: string, x: number, z: number, color: number, d = 3, y?: number): SimObject => ({ id, shape: "sphere", pos: [x, y ?? d / 2, z], size: [d, d, d], color });
export const can = (id: string, x: number, z: number, color: number, d = 3, h = 4, y?: number): SimObject => ({ id, shape: "cyl", pos: [x, y ?? h / 2, z], size: [d, h, d], color });

export const tone = (freq: number): SoundSpec => ({ type: "tone", freq });

/** Turn-taking: both arms barrier, `who` performs `steps`, the other waits the same time. */
export function turn(A: Step[], B: Step[], who: Arm, steps: Step[], tag: string) {
  A.push(sync("a", tag));
  B.push(sync("b", tag));
  const d = steps.reduce((s, x) => s + x.dur, 0);
  (who === "a" ? A : B).push(...steps);
  (who === "a" ? B : A).push(wait(who === "a" ? "b" : "a", d));
}
export const lerp2 = (a: number, b: number, t: number) => a + (b - a) * t;
