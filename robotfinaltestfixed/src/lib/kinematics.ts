/**
 * SO-101 kinematics.
 *
 * Frame: robot base, x forward, y left, z up, centimetres. Table plane z = 0.
 * Joint angle conventions (degrees, "model angles"):
 *   pan        0 = forward, + = counter-clockwise from above
 *   lift       0 = upper arm vertical, + = leans forward
 *   elbow      0 = forearm straight along upper arm, + = forearm folds down/forward
 *   wrist_flex 0 = gripper straight along forearm, + = gripper tips down
 *   "L pose": lift 0, elbow 90, wrist 0  (upper arm up, forearm forward, gripper forward)
 * The app converts raw servo ticks to these angles through a per-joint
 * calibration (reference tick at the L pose + sign), captured on the real arm.
 */

export const JOINTS = ["shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper"] as const;
export type JointName = (typeof JOINTS)[number];
export const MOTOR_IDS: Record<JointName, number> = { shoulder_pan: 1, shoulder_lift: 2, elbow_flex: 3, wrist_flex: 4, wrist_roll: 5, gripper: 6 };
export const ARM_JOINTS = JOINTS.slice(0, 5);

export const REF_DEG: Record<JointName, number> = { shoulder_pan: 0, shoulder_lift: 0, elbow_flex: 90, wrist_flex: 0, wrist_roll: 0, gripper: 0 };

export interface Geometry {
  upperArm: number; // cm, shoulder_lift axis -> elbow axis
  forearm: number; // cm, elbow axis -> wrist_flex axis
  tool: number; // cm, wrist_flex axis -> fingertip centre (jaws closed)
  shoulderHeight: number; // cm, shoulder_lift axis above the table plane
}

export const DEFAULT_GEOMETRY: Geometry = { upperArm: 11.6, forearm: 13.5, tool: 10.0, shoulderHeight: 11.0 };

export interface JointCal {
  min: number; // raw ticks
  max: number;
  ref: number; // raw ticks at reference (L) pose
  sign: 1 | -1;
}

export interface ArmCalibration {
  joints: Record<JointName, JointCal>;
  gripper: { closedRaw: number; openRaw: number };
  geometry: Geometry;
  /** Set true once the L-pose reference has been captured on the real arm. */
  referenceCaptured: boolean;
  /** Set true once the jog direction check was confirmed by the user. */
  directionsConfirmed: boolean;
}

export function defaultCalibration(): ArmCalibration {
  const j = (min = 0, max = 4095): JointCal => ({ min, max, ref: 2048, sign: 1 });
  return {
    joints: {
      shoulder_pan: j(),
      shoulder_lift: j(),
      elbow_flex: j(),
      wrist_flex: j(),
      wrist_roll: j(),
      gripper: j(2048, 3400),
    },
    gripper: { closedRaw: 2048, openRaw: 3200 },
    geometry: { ...DEFAULT_GEOMETRY },
    referenceCaptured: false,
    directionsConfirmed: false,
  };
}

const TICK_DEG = 360 / 4096;

export function rawToDeg(cal: ArmCalibration, j: JointName, raw: number): number {
  const c = cal.joints[j];
  return c.sign * (raw - c.ref) * TICK_DEG + REF_DEG[j];
}

export function degToRaw(cal: ArmCalibration, j: JointName, deg: number, clamp = true): number {
  const c = cal.joints[j];
  let raw = c.ref + ((deg - REF_DEG[j]) / TICK_DEG) * c.sign;
  if (clamp) raw = Math.min(Math.max(raw, Math.min(c.min, c.max)), Math.max(c.min, c.max));
  return Math.round(raw);
}

export function rawToGripperPct(cal: ArmCalibration, raw: number): number {
  const { closedRaw, openRaw } = cal.gripper;
  if (openRaw === closedRaw) return 0;
  return ((raw - closedRaw) / (openRaw - closedRaw)) * 100;
}
export function gripperPctToRaw(cal: ArmCalibration, pct: number): number {
  const { closedRaw, openRaw } = cal.gripper;
  const p = Math.min(Math.max(pct, -10), 110);
  return Math.round(closedRaw + (p / 100) * (openRaw - closedRaw));
}

export type Limits = Record<JointName, [number, number]>;

/** Model-angle limits of each joint derived from the calibrated raw range (with a small safety margin). */
export function jointLimits(cal: ArmCalibration, marginTicks = 40): Limits {
  const out = {} as Limits;
  for (const j of JOINTS) {
    const c = cal.joints[j];
    const lo = Math.min(c.min, c.max) + marginTicks;
    const hi = Math.max(c.min, c.max) - marginTicks;
    const a = rawToDeg(cal, j, lo);
    const b = rawToDeg(cal, j, hi);
    out[j] = [Math.min(a, b), Math.max(a, b)];
  }
  return out;
}

export interface Pose {
  pan: number;
  lift: number;
  elbow: number;
  wrist: number;
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export interface Fk {
  shoulder: [number, number, number];
  elbow: [number, number, number];
  wrist: [number, number, number];
  tip: [number, number, number];
  pitch: number; // gripper absolute pitch, deg from horizontal (-90 = pointing down)
}

export function forward(g: Geometry, p: Pose): Fk {
  const a1 = 90 - p.lift;
  const a2 = a1 - p.elbow;
  const a3 = a2 - p.wrist;
  const pt = (r: number, z: number): [number, number, number] => [r * Math.cos(rad(p.pan)), r * Math.sin(rad(p.pan)), z];
  const er = g.upperArm * Math.cos(rad(a1));
  const ez = g.shoulderHeight + g.upperArm * Math.sin(rad(a1));
  const wr = er + g.forearm * Math.cos(rad(a2));
  const wz = ez + g.forearm * Math.sin(rad(a2));
  const tr = wr + g.tool * Math.cos(rad(a3));
  const tz = wz + g.tool * Math.sin(rad(a3));
  return { shoulder: pt(0, g.shoulderHeight), elbow: pt(er, ez), wrist: pt(wr, wz), tip: pt(tr, tz), pitch: a3 };
}

export interface IkResult {
  pose: Pose;
  pitch: number;
}

/**
 * Analytic IK for target fingertip (x,y,z) cm. Tries the preferred gripper pitch
 * first (default straight down = -90) and relaxes towards horizontal when the
 * point is not reachable or violates joint limits. Returns null if unreachable.
 */
export function inverse(g: Geometry, target: [number, number, number], limits: Limits | null, preferredPitch = -90): IkResult | null {
  const [x, y, z] = target;
  const r = Math.hypot(x, y);
  const pan = r < 1e-6 ? 0 : deg(Math.atan2(y, x));
  const pitches: number[] = [preferredPitch];
  for (let d = 5; d <= 90; d += 5) {
    pitches.push(preferredPitch + d, preferredPitch - d);
  }
  for (const pitch of pitches) {
    if (pitch > 20 || pitch < -110) continue;
    const wr = r - g.tool * Math.cos(rad(pitch));
    const wz = z - g.tool * Math.sin(rad(pitch)) - g.shoulderHeight;
    const D = Math.hypot(wr, wz);
    if (D > g.upperArm + g.forearm - 0.05 || D < Math.abs(g.upperArm - g.forearm) + 0.05) continue;
    const cosA = (g.upperArm ** 2 + D ** 2 - g.forearm ** 2) / (2 * g.upperArm * D);
    const beta = Math.atan2(wz, wr);
    const alpha = Math.acos(Math.min(1, Math.max(-1, cosA)));
    const a1 = deg(beta + alpha); // elbow-up
    const ex = g.upperArm * Math.cos(rad(a1));
    const ez = g.upperArm * Math.sin(rad(a1));
    const a2 = deg(Math.atan2(wz - ez, wr - ex));
    const pose: Pose = { pan, lift: 90 - a1, elbow: a1 - a2, wrist: a2 - pitch };
    if (limits) {
      const ok =
        inRange(pose.pan, limits.shoulder_pan) &&
        inRange(pose.lift, limits.shoulder_lift) &&
        inRange(pose.elbow, limits.elbow_flex) &&
        inRange(pose.wrist, limits.wrist_flex);
      if (!ok) continue;
    }
    return { pose, pitch };
  }
  return null;
}

const inRange = (v: number, [lo, hi]: [number, number]) => v >= lo - 1e-6 && v <= hi + 1e-6;

/** Minimum-jerk easing 0..1 */
export const minJerk = (t: number) => {
  const s = Math.min(1, Math.max(0, t));
  return s * s * s * (10 - 15 * s + 6 * s * s);
};
