import { poseToQ, REST, clamp } from "./kin";

/* Calibration follows LeRobot's convention so policies trained with LeRobot data
   see the same normalised values:  joints → [-100, 100] across the calibrated
   range, gripper → [0, 100].  A separate "alignment" maps hardware degrees to the
   simulator's joint convention (so the digital twin and IK skills work). */

export const JOINTS = ["shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper"] as const;
export const MOTOR_IDS = [1, 2, 3, 4, 5, 6];
export const TICKS = 4095;

export interface Calib {
  rangeMin: number[];
  rangeMax: number[];
  invert: boolean[];
  homingOffset: number[];
  restDeg: number[]; // hardware degrees (relative to range mid) when the arm sits in the simulator REST pose
  sign: number[]; // +1/-1 per joint: hardware direction vs simulator direction
  calibrated: boolean;
  aligned: boolean;
}

export const defaultCalib = (): Calib => ({
  rangeMin: [0, 0, 0, 0, 0, 0],
  rangeMax: [4095, 4095, 4095, 4095, 4095, 4095],
  invert: [false, false, false, false, false, false],
  homingOffset: [0, 0, 0, 0, 0, 0],
  restDeg: [0, 0, 0, 0, 0, 0],
  sign: [1, 1, 1, 1, 1, 1],
  calibrated: false,
  aligned: false,
});

const QREST = poseToQ(REST);

export function rawToNorm(c: Calib, i: number, raw: number): number {
  const span = Math.max(1, c.rangeMax[i] - c.rangeMin[i]);
  const f = clamp((raw - c.rangeMin[i]) / span, 0, 1);
  let v = i === 5 ? f * 100 : f * 200 - 100;
  if (c.invert[i]) v = i === 5 ? 100 - v : -v;
  return v;
}

export function normToRaw(c: Calib, i: number, n: number): number {
  let v = n;
  if (c.invert[i]) v = i === 5 ? 100 - v : -v;
  const f = i === 5 ? v / 100 : (v + 100) / 200;
  return c.rangeMin[i] + clamp(f, 0, 1) * (c.rangeMax[i] - c.rangeMin[i]);
}

const mid = (c: Calib, i: number) => (c.rangeMin[i] + c.rangeMax[i]) / 2;
export const rawToDeg = (c: Calib, i: number, raw: number) => ((raw - mid(c, i)) * 360) / TICKS * (c.invert[i] ? -1 : 1);
export const degToRaw = (c: Calib, i: number, deg: number) => mid(c, i) + ((deg * TICKS) / 360) * (c.invert[i] ? -1 : 1);

/** Hardware raw ticks → simulator joint vector Q (deg; grip 0..1). */
export function rawsToQ(c: Calib, raws: number[]): number[] {
  const q: number[] = [];
  for (let i = 0; i < 5; i++) q.push(QREST[i] + c.sign[i] * (rawToDeg(c, i, raws[i]) - c.restDeg[i]));
  q.push(rawToNorm(c, 5, raws[5]) / 100);
  return q;
}

export function qToRaws(c: Calib, q: number[]): number[] {
  const r: number[] = [];
  for (let i = 0; i < 5; i++) r.push(degToRaw(c, i, c.restDeg[i] + c.sign[i] * (q[i] - QREST[i])));
  r.push(normToRaw(c, 5, clamp(q[5], 0, 1) * 100));
  return r;
}

/** Clamp a raw target into the calibrated range with a small safety margin. */
export function clampRaw(c: Calib, i: number, raw: number, margin = 0.02): number {
  const span = c.rangeMax[i] - c.rangeMin[i];
  return clamp(raw, c.rangeMin[i] + span * margin, c.rangeMax[i] - span * margin);
}

/* -------- LeRobot JSON import / export -------- */
type LerobotJoint = { id: number; drive_mode: number; homing_offset: number; range_min: number; range_max: number };

export function importLerobot(json: string, base: Calib): Calib {
  const o = JSON.parse(json) as Record<string, LerobotJoint>;
  const c: Calib = { ...base, rangeMin: [...base.rangeMin], rangeMax: [...base.rangeMax], invert: [...base.invert], homingOffset: [...base.homingOffset] };
  JOINTS.forEach((j, i) => {
    const e = o[j];
    if (!e) throw new Error(`Missing joint '${j}' in calibration file`);
    c.rangeMin[i] = e.range_min;
    c.rangeMax[i] = e.range_max;
    c.invert[i] = e.drive_mode === 1;
    c.homingOffset[i] = e.homing_offset ?? 0;
  });
  c.calibrated = true;
  return c;
}

export function exportLerobot(c: Calib): string {
  const o: Record<string, LerobotJoint> = {};
  JOINTS.forEach((j, i) => {
    o[j] = { id: MOTOR_IDS[i], drive_mode: c.invert[i] ? 1 : 0, homing_offset: c.homingOffset[i], range_min: Math.round(c.rangeMin[i]), range_max: Math.round(c.rangeMax[i]) };
  });
  return JSON.stringify(o, null, 4);
}

const key = (slot: string) => `so101.cal.${slot}`;
export function loadCalib(slot: string): Calib {
  try {
    const s = typeof localStorage !== "undefined" ? localStorage.getItem(key(slot)) : null;
    if (s) return { ...defaultCalib(), ...(JSON.parse(s) as Calib) };
  } catch {
    /* ignore */
  }
  return defaultCalib();
}
export function saveCalib(slot: string, c: Calib) {
  try {
    localStorage.setItem(key(slot), JSON.stringify(c));
  } catch {
    /* ignore */
  }
}
