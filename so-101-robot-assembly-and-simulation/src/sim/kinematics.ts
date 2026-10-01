// Kinematics for the SO-101 style arm. All lengths in centimetres.
// World frame: +Y up, table is y = 0. Arm plane is spanned by the radial direction and Y.

export const L1 = 11.6; // shoulder -> elbow (upper arm)
export const L2 = 13.5; // elbow -> wrist (forearm)
export const L3 = 11.1; // wrist flex axis -> grasp centre
export const H0 = 10; // base plate -> shoulder-lift axis
export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

export type V3 = [number, number, number];

export interface Pose {
  p: V3; // desired grasp-centre in world space
  pitch: number; // tool angle from horizontal in degrees (-90 = straight down)
  roll: number; // wrist roll degrees
  grip: number; // 0 = closed, 1 = fully open
}

export interface Joints {
  pan: number; // rad, world yaw of the arm plane
  a1: number; // rad, absolute angle of upper arm from horizontal
  a2: number; // rad, absolute angle of forearm
  a3: number; // rad, absolute angle of tool
  roll: number; // rad
  grip: number; // 0..1
}

export const LIMITS = {
  a1: [-10, 190] as [number, number],
  elbow: [-168, 10] as [number, number],
  wrist: [-118, 118] as [number, number],
};

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function wrapPi(a: number) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

interface Planar {
  a1: number;
  a2: number;
  a3: number;
  ok: boolean;
}

function planar(wr: number, wh: number, phi: number, baseY: number): Planar {
  let d = Math.hypot(wr, wh);
  let ok = true;
  const maxD = L1 + L2 - 0.05;
  const minD = Math.abs(L1 - L2) + 0.4;
  if (d > maxD) {
    wr = (wr / d) * maxD;
    wh = (wh / d) * maxD;
    d = maxD;
    ok = false;
  } else if (d < minD) {
    if (d < 1e-4) {
      wr = minD;
      wh = 0;
    } else {
      wr = (wr / d) * minD;
      wh = (wh / d) * minD;
    }
    d = minD;
    ok = false;
  }
  const cosG = clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);
  const G = Math.acos(cosG);
  const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const A = Math.acos(cosA);
  const a1 = Math.atan2(wh, wr) + A;
  const a2 = a1 - (Math.PI - G);
  const a3 = phi;
  // validity vs joint limits & table
  const elbowRel = (a2 - a1) * R2D;
  const wristRel = wrapPi(a3 - a2) * R2D;
  const wristY = baseY + H0 + L1 * Math.sin(a1) + L2 * Math.sin(a2);
  if (
    a1 * R2D < LIMITS.a1[0] ||
    a1 * R2D > LIMITS.a1[1] ||
    elbowRel < LIMITS.elbow[0] ||
    elbowRel > LIMITS.elbow[1] ||
    wristRel < LIMITS.wrist[0] ||
    wristRel > LIMITS.wrist[1] ||
    wristY < baseY + 1.2
  ) {
    ok = false;
  }
  return { a1, a2, a3, ok };
}

export function ik(base: V3, target: V3, pitchDeg: number, rollDeg: number, grip: number, prevPan = 0): Joints & { reached: boolean } {
  const dx = target[0] - base[0];
  const dz = target[2] - base[2];
  const r = Math.hypot(dx, dz);
  let pan = r < 0.5 ? prevPan : Math.atan2(-dz, dx);
  // keep continuity with the previous pan angle
  while (pan - prevPan > Math.PI) pan -= 2 * Math.PI;
  while (pan - prevPan < -Math.PI) pan += 2 * Math.PI;

  const ty = target[1] - base[1] - H0;
  const pref = pitchDeg * D2R;
  let best: Planar | null = null;
  // search around the preferred pitch for a reachable configuration
  const offsets = [0];
  for (let k = 1; k <= 30; k++) offsets.push(k * 4 * D2R, -k * 4 * D2R);
  for (const off of offsets) {
    const phi = pref + off;
    const wr = r - L3 * Math.cos(phi);
    const wh = ty - L3 * Math.sin(phi);
    const s = planar(wr, wh, phi, base[1]);
    if (s.ok) {
      best = s;
      break;
    }
  }
  let reached = true;
  if (!best) {
    reached = false;
    const wr = r - L3 * Math.cos(pref);
    const wh = ty - L3 * Math.sin(pref);
    best = planar(wr, wh, pref, base[1]);
  }
  return { pan, a1: best.a1, a2: best.a2, a3: best.a3, roll: rollDeg * D2R, grip, reached };
}

export function fk(base: V3, j: Joints): { tip: V3; wrist: V3; elbow: V3 } {
  const c = Math.cos(j.pan);
  const s = -Math.sin(j.pan);
  const at = (r: number, y: number): V3 => [base[0] + c * r, base[1] + y, base[2] + s * r];
  const er = L1 * Math.cos(j.a1);
  const ey = H0 + L1 * Math.sin(j.a1);
  const wr = er + L2 * Math.cos(j.a2);
  const wy = ey + L2 * Math.sin(j.a2);
  const tr = wr + L3 * Math.cos(j.a3);
  const ty = wy + L3 * Math.sin(j.a3);
  return { tip: at(tr, ty), wrist: at(wr, wy), elbow: at(er, ey) };
}

/** Convert joints to a pose (for the joint-slider -> cartesian sync) */
export function jointsToPose(base: V3, j: Joints): Pose {
  return { p: fk(base, j).tip, pitch: j.a3 * R2D, roll: j.roll * R2D, grip: j.grip };
}

export const REST_POSE: Pose = { p: [0, 14, 8], pitch: -35, roll: 0, grip: 0.4 };
