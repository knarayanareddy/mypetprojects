import type { ArmCfg, Built, EntDef, Sim, Step, Vec3 } from './engine';
import type { Demand } from './policies';

export const D2R = Math.PI / 180;

export type Category = 'Assistive & Care' | 'Lab & Industry' | 'Creative & Fun' | 'Bimanual' | 'Field & Sustainability' | 'Games & Social';

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  category: Category;
  arms: 1 | 2;
  tagline: string;
  desc: string;
  novel: string;
  real: string;
  demand: Demand;
  tags: string[];
  build: (rng: () => number) => Built;
}

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** one arm standing at the back edge of the table, facing the camera */
export const SINGLE: ArmCfg[] = [{ name: 'SO-101', x: 0, z: -16, yaw: -Math.PI / 2, color: '#ff7a1a' }];

export const mv = (x: number, y: number, z: number, o: Partial<Extract<Step, { t: 'move' }>> = {}): Step => ({ t: 'move', p: [x, y, z], ...o });
export const pick = (id: string, o: Partial<Extract<Step, { t: 'pick' }>> = {}): Step => ({ t: 'pick', id, ...o });
export const place = (x: number, z: number, o: Partial<Extract<Step, { t: 'place' }>> = {}): Step => ({ t: 'place', x, z, ...o });
export const say = (msg: string, kind: 'info' | 'ok' | 'warn' | 'err' | 'plan' | 'sys' = 'plan'): Step => ({ t: 'say', msg, kind });
export const wait = (s: number): Step => ({ t: 'wait', s });
export const sync = (id: string): Step => ({ t: 'sync', id });
export const act = (fn: (sim: Sim, arm: import('./engine').Arm) => void, label?: string): Step => ({ t: 'do', fn, label });
export const pose = (p: Partial<import('../robot/model').Pose>, dur = 0.9): Step => ({ t: 'pose', p, dur });
export const grip = (to: number, dur = 0.3): Step => ({ t: 'grip', to, dur });
export const park: Step = pose({ pan: 0, a1: 105, a2: -15, a3: -60, roll: 0, grip: 0 }, 1.1);

export const cube = (id: string, x: number, z: number, color: string, o: Partial<EntDef> = {}): EntDef => ({ id, kind: 'box', x, z, w: 3, d: 3, h: 3, color, movable: true, ...o });
export const cylE = (id: string, x: number, z: number, r: number, h: number, color: string, o: Partial<EntDef> = {}): EntDef => ({ id, kind: 'cyl', x, z, r, h, color, movable: true, ...o });
export const padE = (id: string, x: number, z: number, color: string, label?: string, r = 3.4, o: Partial<EntDef> = {}): EntDef => ({ id, kind: 'pad', x, z, r, color, label, ...o });
export const binE = (id: string, x: number, z: number, color: string, label?: string, w = 8, d = 8, h = 4): EntDef => ({ id, kind: 'bin', x, z, w, d, h, color, label });

export const inBin = (sim: Sim, id: string, binId: string) => {
  const e = sim.ent(id), b = sim.ent(binId);
  return !!e && !!b && Math.abs(e.x - b.x) < b.w / 2 && Math.abs(e.z - b.z) < b.d / 2 && e.y < b.h + 1;
};
export const near = (sim: Sim, id: string, x: number, z: number, tol = 3) => {
  const e = sim.ent(id);
  return !!e && Math.hypot(e.x - x, e.z - z) <= tol;
};

/** a pen-like stroke on the table (TCP coordinates; pen held upright) */
export function stroke(pts: [number, number][], color: string, y = 4.7, speed = 10): Step[] {
  const f = pts[0], l = pts[pts.length - 1];
  return [
    mv(f[0], y + 6, f[1], { noerr: true }),
    mv(f[0], y, f[1], { noerr: true, speed: 6 }),
    ...pts.slice(1).map((p) => mv(p[0], y, p[1], { ink: color, lin: true, speed, noerr: true })),
    mv(l[0], y + 6, l[1], { noerr: true }),
  ];
}

export function arc(cx: number, cz: number, r: number, a0: number, a1: number, n = 28): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)] as [number, number];
  });
}

export type V3 = Vec3;
