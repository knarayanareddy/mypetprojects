import type { V3 } from './kinematics';

export interface Prim {
  shape: 'box' | 'cyl' | 'sphere' | 'cone' | 'torus';
  /** box [w,h,d] · cyl [r,h] · sphere [r] · cone [r,h] · torus [R,r] */
  size: number[];
  pos: V3;
  color: number;
  rot?: V3; // degrees
  scale?: V3;
  emissive?: number;
  opacity?: number;
  rough?: number;
  metal?: number;
  children?: Prim[];
  label?: string;
}

export interface SoundSpec {
  type: 'tone' | 'chime' | 'kick' | 'snare' | 'hat' | 'click' | 'pop';
  freq?: number;
}

export interface TriggerSpec {
  r: number;
  at?: V3;
  flash: number;
  sound?: SoundSpec;
  text?: string;
  latch?: boolean;
  depress?: number;
}

export interface FixtureSpec extends Prim {
  id?: string;
  /** becomes visible once scenario time passes this value (seconds) */
  showAfter?: number;
  support?: boolean;
  trigger?: TriggerSpec;
}

export type MotionOut = V3 | { p: V3; yaw?: number };

export interface PropSpec extends Prim {
  id: string;
  grab?: boolean;
  support?: boolean;
  width?: number;
  motion?: (t: number, ctx: LiveCtx, cur: V3) => MotionOut;
}

export interface PosePartial {
  p?: V3;
  pitch?: number;
  roll?: number;
  grip?: number;
}

export interface PourSpec {
  arm: 'a' | 'b';
  color: number;
  floor?: number;
  rate?: number;
}

export interface Phase {
  dur: number;
  a?: PosePartial;
  b?: PosePartial;
  say?: string;
  lin?: boolean;
  pour?: PourSpec;
}

export interface LiveCtx {
  t: number;
  dt: number;
  tips: [V3, V3];
  bases: [V3, V3];
  prop: (id: string) => V3 | undefined;
  laser: V3 | null;
  pointer: V3 | null;
  triggers: number;
}

export interface LiveOut {
  a?: PosePartial;
  b?: PosePartial;
  /** joint-space override in degrees: [panWorld, lift, elbowRel, wristRel, roll, grip01] */
  ja?: number[];
  jb?: number[];
  say?: string;
}

export interface TrailSpec {
  arm: 0 | 1 | 2;
  color: number;
  color2?: number;
  penY: number;
  y: number;
  r?: number;
}

export type Theme = 'lab' | 'warm' | 'zen' | 'stage' | 'space' | 'kitchen' | 'paper';

export type Program =
  | { kind: 'phases'; phases: Phase[]; loop?: boolean }
  | { kind: 'live'; fn: (ctx: LiveCtx) => LiveOut }
  | { kind: 'manual' };

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  category: string;
  tagline: string;
  story: string;
  novelty: string;
  difficulty: 1 | 2 | 3;
  arms: 1 | 2;
  hardware: string[];
  approach: string;
  howTo: string[];
  code: string;
  theme?: Theme;
  props?: PropSpec[];
  fixtures?: FixtureSpec[];
  trail?: TrailSpec;
  laser?: 0 | 1;
  gravity?: number;
  bases?: [V3, V3];
  home?: [PosePartial?, PosePartial?];
  usesPointer?: boolean;
  mirror?: boolean;
  program: Program;
  cam?: { pos: V3; target: V3 };
}

export interface ArmTelemetry {
  pan: number;
  lift: number;
  elbow: number;
  wrist: number;
  roll: number;
  grip: number;
  tip: V3;
  holding: string | null;
  reached: boolean;
}

export interface Telemetry {
  t: number;
  phase: number;
  phaseCount: number;
  arms: [ArmTelemetry, ArmTelemetry];
  episode: number;
  finished: boolean;
  triggers: number;
  rec: { recording: boolean; replaying: boolean; frames: number };
  props: { id: string; pos: V3 }[];
}
