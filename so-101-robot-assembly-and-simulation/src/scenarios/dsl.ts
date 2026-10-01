import type { Phase, PosePartial, PropSpec, FixtureSpec, PourSpec } from '../sim/types';
import type { V3 } from '../sim/kinematics';

export const A_BASE: V3 = [-12, 0, -12];
export const B_BASE: V3 = [12, 0, -12];
export type Arm = 'a' | 'b';

const baseOf = (arm: Arm) => (arm === 'a' ? A_BASE : B_BASE);

/** Highest safe carry height at (x,z) so the wrist can still reach there with a vertical tool. */
export function safeAt(arm: Arm, x: number, z: number, want = 10) {
  const b = baseOf(arm);
  const r = Math.hypot(x - b[0], z - b[2]);
  const m = Math.sqrt(Math.max(24.2 * 24.2 - r * r, 0)) - 1.1;
  return Math.max(3.5, Math.min(want, m));
}

export function P(arm: Arm, dur: number, pose: PosePartial, say?: string, extra?: Partial<Phase>): Phase {
  return { dur, [arm]: pose, say, ...extra } as Phase;
}

export const wait = (dur: number, say?: string): Phase => ({ dur, say });

export function par(A: Phase[], B: Phase[]): Phase[] {
  const n = Math.max(A.length, B.length);
  const out: Phase[] = [];
  for (let i = 0; i < n; i++) {
    const a = A[i];
    const b = B[i];
    out.push({
      dur: Math.max(a?.dur ?? 0, b?.dur ?? 0),
      a: a?.a,
      b: b?.b,
      say: a?.say ?? b?.say,
      lin: a?.lin || b?.lin,
      pour: a?.pour ?? b?.pour,
    });
  }
  return out;
}

export function total(phases: Phase[]) {
  return phases.reduce((s, p) => s + p.dur, 0);
}

export interface PPOpts {
  fh?: number;
  th?: number;
  safe?: number;
  fromSafe?: number;
  toSafe?: number;
  roll?: number;
  pitch?: number;
  speed?: number;
  say?: string;
  toRoll?: number;
}

export function pickPlace(arm: Arm, from: [number, number], to: [number, number], o: PPOpts = {}): Phase[] {
  const s = o.speed ?? 1;
  const pitch = o.pitch ?? -90;
  const roll = o.roll ?? 0;
  const fh = o.fh ?? 1.6;
  const th = o.th ?? fh + 0.1;
  const sf = o.fromSafe ?? o.safe ?? safeAt(arm, from[0], from[1]);
  const st = o.toSafe ?? o.safe ?? safeAt(arm, to[0], to[1]);
  return [
    P(arm, 0.75 * s, { p: [from[0], sf, from[1]], pitch, roll, grip: 1 }, o.say),
    P(arm, 0.45 * s, { p: [from[0], fh, from[1]] }),
    P(arm, 0.3 * s, { grip: 0 }),
    P(arm, 0.45 * s, { p: [from[0], sf, from[1]] }),
    P(arm, 0.75 * s, { p: [to[0], st, to[1]], roll: o.toRoll ?? roll }),
    P(arm, 0.45 * s, { p: [to[0], th, to[1]] }),
    P(arm, 0.3 * s, { grip: 1 }),
    P(arm, 0.35 * s, { p: [to[0], st, to[1]] }),
  ];
}

export function strike(arm: Arm, x: number, z: number, down = 1.9, up = 6.5, t = [0.24, 0.09, 0.1]): Phase[] {
  return [
    P(arm, t[0], { p: [x, up, z], pitch: -90, grip: 0, roll: 0 }),
    P(arm, t[1], { p: [x, down, z] }, undefined, { lin: true }),
    P(arm, t[2], { p: [x, up, z] }),
  ];
}

export function rest(t = [0.24, 0.09, 0.1]): Phase[] {
  return t.map((dur) => ({ dur }));
}

export interface Stroke {
  f: (u: number) => [number, number];
  D: number;
}

export function strokes(arm: Arm, list: Stroke[], o: { y: number; hover: number; step?: number; say?: string; pitch?: number }): Phase[] {
  const out: Phase[] = [];
  list.forEach((s, k) => {
    const [x0, z0] = s.f(0);
    out.push(P(arm, 0.6, { p: [x0, o.hover, z0], pitch: o.pitch ?? -90, grip: 0 }, k === 0 ? o.say : undefined));
    out.push(P(arm, 0.3, { p: [x0, o.y, z0] }));
    const n = Math.max(2, Math.round(s.D / (o.step ?? 0.07)));
    for (let i = 1; i <= n; i++) {
      const [x, z] = s.f(i / n);
      out.push(P(arm, s.D / n, { p: [x, o.y, z] }, undefined, { lin: true }));
    }
    const [x1, z1] = s.f(1);
    out.push(P(arm, 0.3, { p: [x1, o.hover, z1] }));
  });
  return out;
}

export function pour(arm: Arm, color: number, floor: number, rate = 55): PourSpec {
  return { arm, color, floor, rate };
}

// ---------------------------------------------------------------- scene helpers
export const cube = (id: string, x: number, z: number, color: number, s = 3): PropSpec => ({
  id,
  shape: 'box',
  size: [s, s, s],
  pos: [x, s / 2, z],
  color,
  rough: 0.4,
});

export const fbox = (x: number, y: number, z: number, w: number, h: number, d: number, color: number, extra: Partial<FixtureSpec> = {}): FixtureSpec => ({
  shape: 'box',
  size: [w, h, d],
  pos: [x, y, z],
  color,
  ...extra,
});

export const fcyl = (x: number, y: number, z: number, r: number, h: number, color: number, extra: Partial<FixtureSpec> = {}): FixtureSpec => ({
  shape: 'cyl',
  size: [r, h],
  pos: [x, y, z],
  color,
  ...extra,
});

export function bin(x: number, z: number, w: number, d: number, h: number, color: number, label?: string): FixtureSpec[] {
  const t = 0.4;
  return [
    fbox(x, t / 2, z, w, t, d, color),
    fbox(x, h / 2, z - d / 2 + t / 2, w, h, t, color, { label }),
    fbox(x, h / 2, z + d / 2 - t / 2, w, h, t, color),
    fbox(x - w / 2 + t / 2, h / 2, z, t, h, d, color),
    fbox(x + w / 2 - t / 2, h / 2, z, t, h, d, color),
  ];
}
