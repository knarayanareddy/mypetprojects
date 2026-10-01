import type { V3 } from "../kin";
import type { SoundSpec } from "../audio";

export type Arm = "a" | "b";

/** One keyframe of a Cartesian program. Undefined p/pitch/roll/grip = hold the previous value. */
export interface Step {
  arm: Arm;
  dur: number;
  p?: V3;
  pitch?: number; // deg, -90 = gripper pointing down, 0 = horizontal
  roll?: number; // deg
  grip?: number; // 0 closed .. 1 open
  rest?: boolean; // return to the folded rest pose
  trail?: string; // pen-down colour while this step moves
  grab?: string; // attempt to grasp object id after the move
  drop?: boolean; // release whatever is held
  hit?: boolean; // strike / press the nearest trigger fixture
  fire?: string; // start a scene animation
  say?: string;
  sync?: string; // barrier shared with the other arm
  snd?: SoundSpec;
}

export interface Fixture {
  shape: "box" | "cyl";
  pos: V3; // centre
  size: V3; // box: w,h,d  cyl: diameter, h, diameter
  color: number;
  label?: string;
  support?: boolean; // objects can rest on top (default true)
  opacity?: number;
  trigger?: { r: number; flash: number; sound?: SoundSpec; depress?: number; fire?: string };
}

export interface SimObject {
  id: string;
  shape: "box" | "cyl" | "sphere";
  pos: V3; // centre
  size: V3;
  color: number;
  rot?: V3;
  fixed?: boolean; // never falls
}

export interface Anim {
  obj: string;
  delay: number;
  dur: number;
  to: { pos?: V3; rot?: V3; scale?: number; color?: number };
}

export interface Needs {
  precision: number;
  contact: number;
  horizon: number;
  speed: number;
  generalize: number;
}

export type Category = "Music & Art" | "Home & Care" | "Games & Magic" | "Industry & Lab" | "Out-of-the-box";

export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  category: Category;
  tagline: string;
  story: string;
  novelty: string;
  difficulty: 1 | 2 | 3;
  arms: 1 | 2;
  hardware: string[]; // props to buy / print
  sensors: string[]; // extra sensors needed
  approach: string;
  howTo: string[];
  code: string;
  keywords: string[];
  prompt: string; // example natural-language instruction
  needs: Needs;
  theme?: "stage" | "lab" | "home" | "factory";
  fixtures: Fixture[];
  objects: SimObject[];
  anims?: Record<string, Anim[]>;
  program: () => { a: Step[]; b: Step[] };
}

export interface SimProfile {
  lag: number; // seconds of first-order lag (model latency/smoothing)
  jitter: number; // cm of target noise
  speed: number; // multiplier on motion speed
  stallEvery: number; // seconds between inference stalls (0 = none)
  stallFor: number; // length of a stall (s)
  pGrab: number; // first-try grasp success probability
}

export const IDEAL_PROFILE: SimProfile = { lag: 0.05, jitter: 0, speed: 1, stallEvery: 0, stallFor: 0, pGrab: 1 };
