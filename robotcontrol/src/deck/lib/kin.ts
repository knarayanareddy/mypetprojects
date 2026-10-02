// Kinematics for the SO-101 (approximate geometry, centimetres).
// Joint values use LeRobot's normalised convention: -100..100 (gripper 0..100).

export const JOINTS = [
  "shoulder_pan",
  "shoulder_lift",
  "elbow_flex",
  "wrist_flex",
  "wrist_roll",
  "gripper",
] as const;
export type Pose = number[]; // length 6
export type V3 = [number, number, number];

export const JOINT_LABEL: Record<string, string> = {
  shoulder_pan: "Shoulder pan",
  shoulder_lift: "Shoulder lift",
  elbow_flex: "Elbow flex",
  wrist_flex: "Wrist flex",
  wrist_roll: "Wrist roll",
  gripper: "Gripper",
};

export const L = { base: 10, upper: 11.3, fore: 13.5, hand: 10.5 };
export const DEG = {
  pan: 1.1,
  lift: 0.85,
  elbow: 0.9,
  wrist: 0.9,
  roll: 1.6,
  grip: 0.6,
};
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const ARM_BASE: Record<"A" | "B", V3> = {
  A: [-16, 0, 14],
  B: [16, 0, 14],
};

export const REST: Pose = [0, -100, 100, 70, 0, 0];
export const clampPose = (p: Pose): Pose =>
  p.map((v, i) => (i === 5 ? clamp(v, 0, 100) : clamp(v, -100, 100)));

export interface FK {
  pts: V3[]; // base, shoulder, elbow, wrist, tip
  jaw: { a: V3; b: V3 }; // two jaw tips
  phi3: number;
}

export function fk(pose: Pose, base: V3): FK {
  const pan = rad(pose[0] * DEG.pan);
  const p1 = rad(pose[1] * DEG.lift);
  const p2 = p1 + rad(90) + rad(pose[2] * DEG.elbow);
  const p3 = p2 + rad(pose[3] * DEG.wrist);
  const dir = (r: number, h: number): V3 => [Math.sin(pan) * r, h, -Math.cos(pan) * r];
  const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const b0: V3 = base;
  const sh = add(b0, [0, L.base, 0]);
  const el = add(sh, dir(Math.sin(p1) * L.upper, Math.cos(p1) * L.upper));
  const wr = add(el, dir(Math.sin(p2) * L.fore, Math.cos(p2) * L.fore));
  const tip = add(wr, dir(Math.sin(p3) * L.hand, Math.cos(p3) * L.hand));
  // jaw: perpendicular to pan direction, opened by gripper angle, rolled by wrist roll
  const open = rad(pose[5] * DEG.grip);
  const roll = rad(pose[4] * DEG.roll);
  const side: V3 = [Math.cos(pan), 0, Math.sin(pan)];
  const up: V3 = [0, 1, 0];
  const jawLen = 4.5;
  const rolled = (s: number): V3 => {
    const c = Math.cos(roll) * s, u = Math.sin(roll) * s;
    return [side[0] * c + up[0] * u, side[1] * c + up[1] * u, side[2] * c + up[2] * u];
  };
  const fwd = dir(Math.sin(p3), Math.cos(p3));
  const jawDir = (s: number): V3 => {
    const o = rolled(Math.sin(open / 2) * s);
    const f = Math.cos(open / 2);
    return [fwd[0] * f + o[0], fwd[1] * f + o[1], fwd[2] * f + o[2]];
  };
  const ja = jawDir(1), jb = jawDir(-1);
  const jawA = add(tip, [ja[0] * jawLen, ja[1] * jawLen, ja[2] * jawLen]);
  const jawB = add(tip, [jb[0] * jawLen, jb[1] * jawLen, jb[2] * jawLen]);
  return { pts: [b0, sh, el, wr, tip], jaw: { a: jawA, b: jawB }, phi3: deg(p3) };
}

export interface IKOpts {
  pitch?: number; // gripper direction angle from vertical-up; 180 = pointing straight down
  roll?: number;
  grip?: number;
}

/** Solve a pose that puts the gripper tip at world (x,y,z). Returns pose and whether it was reachable. */
export function ik(target: V3, base: V3, o: IKOpts = {}): { pose: Pose; ok: boolean } {
  const pitch = o.pitch ?? 165;
  const dx = target[0] - base[0];
  const fwdD = base[2] - target[2];
  let ok = true;
  let panDeg = deg(Math.atan2(dx, fwdD));
  let r = Math.hypot(dx, fwdD);
  if (fwdD < 0 && Math.abs(panDeg) > 110) ok = false;
  if (Math.abs(panDeg) > 110) {
    panDeg = clamp(panDeg, -110, 110);
    ok = false;
  }
  const p3 = rad(pitch);
  const wr = r - Math.sin(p3) * L.hand;
  const wh = target[1] - base[1] - L.base - Math.cos(p3) * L.hand;
  let d = Math.hypot(wr, wh);
  const maxD = L.upper + L.fore - 0.05;
  const minD = Math.abs(L.upper - L.fore) + 0.5;
  if (d > maxD) { d = maxD; ok = false; }
  if (d < minD) { d = minD; ok = false; }
  const alpha = Math.atan2(wr, wh);
  const cosB = clamp((L.upper * L.upper + d * d - L.fore * L.fore) / (2 * L.upper * d), -1, 1);
  const beta = Math.acos(cosB);
  const p1 = alpha - beta;
  const er = Math.sin(p1) * L.upper;
  const eh = Math.cos(p1) * L.upper;
  const p2 = Math.atan2(Math.sin(alpha) * d - er, Math.cos(alpha) * d - eh);
  const lift = deg(p1) / DEG.lift;
  const elbow = (deg(p2) - deg(p1) - 90) / DEG.elbow;
  const wrist = (deg(p3) - deg(p2)) / DEG.wrist;
  const raw = [panDeg / DEG.pan, lift, elbow, wrist, (o.roll ?? 0), o.grip ?? 40];
  if (raw.slice(0, 4).some((v) => Math.abs(v) > 100.5)) ok = false;
  return { pose: clampPose(raw), ok };
}

// ---- projection ----
export interface Cam { yaw: number; pitch: number; zoom: number; }
export function project(p: V3, cam: Cam, w: number, h: number): [number, number, number] {
  // centre on table
  const x = p[0], y = p[1] - 8, z = p[2] - 4;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const y2 = y * cp - z1 * sp;
  const z2 = -(y * sp + z1 * cp);
  const dist = 120;
  const f = (cam.zoom * Math.min(w, h * 1.5) * 1.1) / (dist + z2);
  return [w / 2 + x1 * f, h * 0.58 - y2 * f, f];
}

export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
export const lerpPose = (a: Pose, b: Pose, t: number): Pose => a.map((v, i) => lerp(v, b[i], t));
