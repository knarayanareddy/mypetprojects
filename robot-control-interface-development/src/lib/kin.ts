/* Kinematics for an SO-101-like 5-DOF arm + gripper. Units: cm / radians.
   Dimensions are approximations used for visualisation, simulation and the
   IK skills that drive the real arm. */

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;
export const L1 = 11.6; // shoulder -> elbow
export const L2 = 13.5; // elbow -> wrist flex
export const L3 = 11; // wrist flex -> gripper tip centre (TCP)
export const HS = 10.5; // shoulder axis height above the table
export const PAN_LIM = 110 * D2R;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);

export type V3 = [number, number, number];

export interface Pose {
  pan: number; // rad, 0 = towards +z in world, + turns toward +x
  a1: number; // absolute angle of upper arm above horizontal
  a2: number; // absolute angle of forearm
  a3: number; // absolute angle of gripper axis (pitch)
  roll: number;
  grip: number; // 0 closed .. 1 open
}

export const REST: Pose = { pan: 0, a1: 105 * D2R, a2: -15 * D2R, a3: -60 * D2R, roll: 0, grip: 0.1 };
export const clonePose = (p: Pose): Pose => ({ ...p });

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    pan: lerp(a.pan, b.pan, t),
    a1: lerp(a.a1, b.a1, t),
    a2: lerp(a.a2, b.a2, t),
    a3: lerp(a.a3, b.a3, t),
    roll: lerp(a.roll, b.roll, t),
    grip: lerp(a.grip, b.grip, t),
  };
}

export function fkLocal(p: Pose) {
  const r = L1 * Math.cos(p.a1) + L2 * Math.cos(p.a2) + L3 * Math.cos(p.a3);
  const y = HS + L1 * Math.sin(p.a1) + L2 * Math.sin(p.a2) + L3 * Math.sin(p.a3);
  return { r, y };
}

export function tcpWorld(base: V3, p: Pose): V3 {
  const { r, y } = fkLocal(p);
  return [base[0] + r * Math.sin(p.pan), y, base[2] + r * Math.cos(p.pan)];
}

/** Joint vector in degrees as used by the hardware layer: [pan, lift, elbow, wrist, roll, grip(0..1)] */
export function poseToQ(p: Pose): number[] {
  return [p.pan * R2D, p.a1 * R2D, (p.a2 - p.a1) * R2D, (p.a3 - p.a2) * R2D, p.roll * R2D, p.grip];
}
export function qToPose(q: number[]): Pose {
  const a1 = q[1] * D2R;
  const a2 = a1 + q[2] * D2R;
  return { pan: q[0] * D2R, a1, a2, a3: a2 + q[3] * D2R, roll: q[4] * D2R, grip: q[5] };
}

/** Inverse kinematics: TCP world target + gripper pitch (deg, -90 = pointing straight down). */
export function ik(base: V3, t: V3, pitchDeg: number, roll = 0, grip = 0): { pose: Pose; ok: boolean } {
  let ok = true;
  const dx = t[0] - base[0];
  const dz = t[2] - base[2];
  let pan = Math.atan2(dx, dz);
  if (Math.abs(pan) > PAN_LIM) {
    pan = clamp(pan, -PAN_LIM, PAN_LIM);
    ok = false;
  }
  const r = Math.hypot(dx, dz);
  const pp = pitchDeg * D2R;
  let wr = r - L3 * Math.cos(pp);
  let wh = t[1] - HS - L3 * Math.sin(pp);
  let d = Math.hypot(wr, wh);
  const dmax = L1 + L2 - 0.05;
  const dmin = Math.abs(L1 - L2) + 0.4;
  if (d > dmax || d < dmin) {
    ok = false;
    const k = (d > dmax ? dmax : dmin) / (d || 1);
    wr *= k;
    wh *= k;
    d = Math.hypot(wr, wh);
  }
  const c = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const a1 = Math.atan2(wh, wr) + Math.acos(c);
  const a2 = Math.atan2(wh - L1 * Math.sin(a1), wr - L1 * Math.cos(a1));
  return { pose: { pan, a1, a2, a3: pp, roll, grip }, ok };
}
