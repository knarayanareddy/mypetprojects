import { BusError, REG, ServoBus, decodeSignMag, encodeSignMag, fromU16, u16 } from "./feetech";
import {
  ARM_JOINTS,
  JOINTS,
  MOTOR_IDS,
  type ArmCalibration,
  type Fk,
  type JointName,
  forward,
  degToRaw,
  gripperPctToRaw,
  inverse,
  jointLimits,
  minJerk,
  rawToDeg,
  rawToGripperPct,
} from "./kinematics";

export interface ArmState {
  t: number;
  raw: number[];
  deg: Record<JointName, number>;
  gripperPct: number;
  /** signed load, permille of max torque (|x| 1000 = full) */
  load: number[];
  temp: number[];
  volt: number[];
  online: boolean[];
  torque: boolean;
}

export interface GraspResult {
  stalled: boolean;
  gapPct: number;
  load: number;
  holding: boolean;
  reason: string;
}

export interface GraspTuning {
  minGapPct: number;
  loadThreshold: number; // permille
  closeSpeedPctPerS: number;
}
export const DEFAULT_GRASP: GraspTuning = { minGapPct: 8, loadThreshold: 90, closeSpeedPctPerS: 70 };

export class Aborted extends Error {
  constructor() {
    super("aborted");
  }
}
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    if (signal?.aborted) return rej(new Aborted());
    const t = setTimeout(res, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      rej(new Aborted());
    });
  });
export { sleep };

export class Arm {
  state: ArmState | null = null;
  cmd: Partial<Record<JointName, number>> = {};
  torque = false;
  maxDegPerS = 70;
  grasp_tuning: GraspTuning = { ...DEFAULT_GRASP };
  tableZ = 0;

  constructor(public name: string, public bus: ServoBus, public cal: ArmCalibration) {}

  get ids(): number[] {
    return JOINTS.map((j) => MOTOR_IDS[j]);
  }

  /** Verify all 6 motors answer. Returns missing joint names. */
  async check(): Promise<JointName[]> {
    const missing: JointName[] = [];
    for (const j of JOINTS) if (!(await this.bus.ping(MOTOR_IDS[j]))) missing.push(j);
    return missing;
  }

  /**
   * Safe init (mirrors LeRobot's so101_follower.configure()):
   *  1. read the current pose and set goal = present, so the arm can never lunge,
   *  2. torque OFF + Lock = 0 (EEPROM registers are only writable then),
   *  3. write each tuning register ONLY if it differs (read-back first: no needless EEPROM wear),
   *  4. Lock = 1 again.
   * Returns the list of registers that actually had to change.
   */
  async initFollower(): Promise<string[]> {
    const s = await this.readState();
    await this.bus.syncWrite(
      REG.GOAL_POS,
      JOINTS.map((j, i) => ({ id: MOTOR_IDS[j], data: u16(s.raw[i]) })),
    );
    await this.bus.syncWrite(
      REG.TORQUE_ENABLE,
      JOINTS.map((j) => ({ id: MOTOR_IDS[j], data: [0] })),
    );
    this.torque = false;
    const changed: string[] = [];
    const ensure = async (id: number, name: string, addr: number, bytes: 1 | 2, want: number) => {
      const have = bytes === 1 ? await this.bus.read8(id, addr) : await this.bus.read16(id, addr);
      if (have === want) return;
      await this.bus.write(id, addr, bytes === 1 ? [want & 0xff] : u16(want));
      const back = bytes === 1 ? await this.bus.read8(id, addr) : await this.bus.read16(id, addr);
      if (back !== want) throw new BusError(`motor ${id}: ${name} did not stick (wrote ${want}, read ${back}); EEPROM locked?`);
      changed.push(`${name}@${id}`);
    };
    for (const j of JOINTS) {
      const id = MOTOR_IDS[j];
      await this.bus.write8(id, REG.LOCK, 0);
      await ensure(id, "Return_Delay_Time", REG.RETURN_DELAY, 1, 0);
      await ensure(id, "Operating_Mode", REG.OPERATING_MODE, 1, 0);
      await ensure(id, "P_Coefficient", REG.P_COEF, 1, 16);
      await ensure(id, "I_Coefficient", REG.I_COEF, 1, 0);
      await ensure(id, "D_Coefficient", REG.D_COEF, 1, 32);
      if (j === "gripper") {
        // LeRobot so101_follower gripper protection: lower torque/current so the jaws cannot crush the servo or the object.
        await ensure(id, "Max_Torque_Limit", REG.MAX_TORQUE_LIMIT, 2, 500);
        await ensure(id, "Protection_Current", REG.PROTECTION_CURRENT, 2, 250);
        await ensure(id, "Overload_Torque", REG.OVERLOAD_TORQUE, 1, 25);
      }
      await this.bus.write8(id, REG.LOCK, 1);
      await this.bus.write8(id, REG.ACCELERATION, 254); // SRAM, not EEPROM
    }
    for (const j of JOINTS) this.cmd[j] = j === "gripper" ? s.gripperPct : s.deg[j];
    return changed;
  }

  async readRaw(): Promise<number[]> {
    const raw: number[] = [];
    for (const j of JOINTS) raw.push(await this.bus.read16(MOTOR_IDS[j], REG.PRESENT_POS));
    return raw;
  }

  async readState(): Promise<ArmState> {
    const raw: number[] = [];
    const load: number[] = [];
    const temp: number[] = [];
    const volt: number[] = [];
    const online: boolean[] = [];
    let failures = 0;
    for (let i = 0; i < JOINTS.length; i++) {
      const id = MOTOR_IDS[JOINTS[i]];
      try {
        const b = await this.bus.read(id, REG.PRESENT_POS, 8, 2);
        raw.push(fromU16(b[0], b[1]));
        load.push(decodeSignMag(fromU16(b[4], b[5]), 10));
        volt.push(b[6] / 10);
        temp.push(b[7]);
        online.push(true);
      } catch (e) {
        if (!(e instanceof BusError)) throw e;
        failures++;
        raw.push(this.state?.raw[i] ?? 2048);
        load.push(0);
        temp.push(this.state?.temp[i] ?? 0);
        volt.push(this.state?.volt[i] ?? 0);
        online.push(false);
      }
    }
    if (failures === JOINTS.length) throw new BusError("No motor answered. Check power (5V/12V supply), USB cable and port.");
    const deg = {} as Record<JointName, number>;
    JOINTS.forEach((j, i) => (deg[j] = rawToDeg(this.cal, j, raw[i])));
    const s: ArmState = {
      t: Date.now(),
      raw,
      deg,
      gripperPct: rawToGripperPct(this.cal, raw[5]),
      load,
      temp,
      volt,
      online,
      torque: this.torque,
    };
    this.state = s;
    return s;
  }

  async setTorque(on: boolean): Promise<void> {
    if (on && this.state) {
      // hold current pose instead of snapping to a stale goal
      await this.bus.syncWrite(
        REG.GOAL_POS,
        JOINTS.map((j, i) => ({ id: MOTOR_IDS[j], data: u16(this.state!.raw[i]) })),
      );
      for (const j of JOINTS) this.cmd[j] = j === "gripper" ? this.state.gripperPct : this.state.deg[j];
    }
    await this.bus.syncWrite(
      REG.TORQUE_ENABLE,
      JOINTS.map((j) => ({ id: MOTOR_IDS[j], data: [on ? 1 : 0] })),
    );
    this.torque = on;
  }

  /** Emergency stop: torque off on every motor (broadcast, twice). */
  async estop(): Promise<void> {
    this.torque = false;
    for (let k = 0; k < 2; k++) {
      try {
        await this.bus.syncWrite(
          REG.TORQUE_ENABLE,
          JOINTS.map((j) => ({ id: MOTOR_IDS[j], data: [0] })),
        );
      } catch {
        /* keep trying */
      }
    }
  }

  /** Write goal positions immediately (degrees; gripper in %). */
  async setGoals(target: Partial<Record<JointName, number>>): Promise<void> {
    const entries: { id: number; data: number[] }[] = [];
    for (const j of JOINTS) {
      const v = target[j];
      if (v === undefined || Number.isNaN(v)) continue;
      const raw = j === "gripper" ? gripperPctToRaw(this.cal, v) : degToRaw(this.cal, j, v);
      const clamped = j === "gripper" ? Math.min(Math.max(raw, Math.min(this.cal.joints.gripper.min, this.cal.joints.gripper.max) - 120), Math.max(this.cal.joints.gripper.min, this.cal.joints.gripper.max) + 120) : raw;
      entries.push({ id: MOTOR_IDS[j], data: u16(clamped) });
      this.cmd[j] = v;
    }
    if (!entries.length) return;
    // sync write needs equal-length data; all entries are 2 bytes.
    await this.bus.syncWrite(REG.GOAL_POS, entries);
  }

  currentTarget(j: JointName): number {
    const c = this.cmd[j];
    if (c !== undefined) return c;
    if (!this.state) return 0;
    return j === "gripper" ? this.state.gripperPct : this.state.deg[j];
  }

  /** Smooth, speed-limited joint-space move. */
  async moveTo(target: Partial<Record<JointName, number>>, durationMs: number, signal?: AbortSignal): Promise<void> {
    const limits = jointLimits(this.cal);
    const from: Partial<Record<JointName, number>> = {};
    const to: Partial<Record<JointName, number>> = {};
    let maxDelta = 0;
    for (const j of JOINTS) {
      const v = target[j];
      if (v === undefined) continue;
      const lim = limits[j];
      to[j] = j === "gripper" ? v : Math.min(Math.max(v, lim[0]), lim[1]);
      from[j] = this.currentTarget(j);
      if (j !== "gripper") maxDelta = Math.max(maxDelta, Math.abs(to[j]! - from[j]!));
    }
    const dur = Math.max(durationMs, (maxDelta / this.maxDegPerS) * 1000, 120);
    const t0 = Date.now();
    for (;;) {
      if (signal?.aborted) throw new Aborted();
      const k = minJerk((Date.now() - t0) / dur);
      const step: Partial<Record<JointName, number>> = {};
      for (const j of JOINTS) if (to[j] !== undefined) step[j] = from[j]! + (to[j]! - from[j]!) * k;
      await this.setGoals(step);
      if (k >= 1) break;
      await sleep(25, signal);
    }
  }

  tip(s: ArmState | null = this.state): Fk | null {
    if (!s) return null;
    return forward(this.cal.geometry, { pan: s.deg.shoulder_pan, lift: s.deg.shoulder_lift, elbow: s.deg.elbow_flex, wrist: s.deg.wrist_flex });
  }

  /** Move the fingertip to (x,y,z) cm in the robot frame (z relative to the table plane + tableZ). */
  async moveTip(xyz: [number, number, number], opts: { pitch?: number; ms?: number; roll?: number; signal?: AbortSignal } = {}): Promise<{ pitch: number }> {
    const ik = inverse(this.cal.geometry, [xyz[0], xyz[1], xyz[2] + this.tableZ], jointLimits(this.cal), opts.pitch ?? -90);
    if (!ik) throw new Error(`Target (${xyz.map((v) => v.toFixed(1)).join(", ")}) cm is unreachable or outside joint limits`);
    const t: Partial<Record<JointName, number>> = { shoulder_pan: ik.pose.pan, shoulder_lift: ik.pose.lift, elbow_flex: ik.pose.elbow, wrist_flex: ik.pose.wrist };
    if (opts.roll !== undefined) t.wrist_roll = opts.roll;
    await this.moveTo(t, opts.ms ?? 900, opts.signal);
    return { pitch: ik.pitch };
  }

  async setGripper(pct: number, ms = 400, signal?: AbortSignal) {
    await this.moveTo({ gripper: pct }, ms, signal);
  }

  async gripperLoad(): Promise<number> {
    const s = await this.readState();
    return Math.abs(s.load[5]);
  }

  /**
   * Close the gripper until it stalls on an object (load and position lag),
   * then hold lightly. Reports measured gap so the caller can verify a real grasp.
   */
  async grasp(signal?: AbortSignal): Promise<GraspResult> {
    const tune = this.grasp_tuning;
    let cmd = this.currentTarget("gripper");
    const t0 = Date.now();
    let last = Date.now();
    for (;;) {
      if (signal?.aborted) throw new Aborted();
      const now = Date.now();
      cmd = Math.max(-5, cmd - (tune.closeSpeedPctPerS * (now - last)) / 1000);
      last = now;
      await this.setGoals({ gripper: cmd });
      await sleep(30, signal);
      const s = await this.readState();
      const gap = s.gripperPct;
      const load = Math.abs(s.load[5]);
      const lag = gap - cmd;
      if (now - t0 > 200 && lag > 4 && load >= tune.loadThreshold) {
        const hold = Math.max(-5, gap - 2);
        await this.setGoals({ gripper: hold });
        const holding = gap >= tune.minGapPct;
        return { stalled: true, gapPct: gap, load, holding, reason: holding ? "stalled on object" : "stalled but gap below minimum (empty / pinching)" };
      }
      if (cmd <= -5) {
        return { stalled: false, gapPct: gap, load, holding: false, reason: "closed fully with no object (missed)" };
      }
      if (now - t0 > 6000) return { stalled: false, gapPct: gap, load, holding: false, reason: "timeout closing gripper" };
    }
  }

  /** After lifting: is the object still in the jaws? */
  async slipCheck(): Promise<{ holding: boolean; gapPct: number; load: number }> {
    const s = await this.readState();
    const gap = s.gripperPct;
    const load = Math.abs(s.load[5]);
    return { holding: gap >= this.grasp_tuning.minGapPct * 0.7 && load >= this.grasp_tuning.loadThreshold * 0.35, gapPct: gap, load };
  }

  // ---- calibration helpers -------------------------------------------------

  /** LeRobot-compatible: centre the current pose at tick 2047 by writing Homing_Offset (EEPROM). Torque must be off. */
  async writeHomingOffsets(): Promise<number[]> {
    const offsets: number[] = [];
    await this.setTorque(false);
    for (const j of JOINTS) {
      const id = MOTOR_IDS[j];
      await this.bus.write8(id, REG.LOCK, 0);
      await this.bus.write16(id, REG.HOMING_OFFSET, 0);
    }
    for (const j of JOINTS) {
      const id = MOTOR_IDS[j];
      const pos = await this.bus.read16(id, REG.PRESENT_POS);
      const off = pos - 2047;
      offsets.push(off);
      await this.bus.write16(id, REG.HOMING_OFFSET, encodeSignMag(off, 11));
      await this.bus.write8(id, REG.LOCK, 1);
    }
    return offsets;
  }

  /** Store the current pose as the L-pose reference (upper arm vertical, forearm forward, gripper forward, pan forward). */
  async captureReference(): Promise<void> {
    const raw = await this.readRaw();
    ARM_JOINTS.forEach((j, i) => (this.cal.joints[j].ref = raw[i]));
    this.cal.referenceCaptured = true;
  }
}
