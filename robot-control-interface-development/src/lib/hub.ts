"use client";
import { useSyncExternalStore } from "react";
import { FeetechBus, type Telemetry } from "./feetech";
import { clampRaw, defaultCalib, loadCalib, MOTOR_IDS, normToRaw, qToRaws, rawToDeg, rawToNorm, rawsToQ, saveCalib, type Calib } from "./calibration";
import { clamp } from "./kin";
import type { Arm } from "./scenarios/types";

export type SlotId = "followerA" | "followerB" | "leaderA" | "leaderB";
export const SLOT_IDS: SlotId[] = ["followerA", "leaderA", "followerB", "leaderB"];

export interface Slot {
  id: SlotId;
  role: "follower" | "leader";
  arm: Arm;
  bus: FeetechBus | null;
  connected: boolean;
  torque: boolean;
  cal: Calib;
  raw: number[] | null;
  tele: (Telemetry | null)[] | null;
  found: number[];
  error: string;
  hz: number;
  sweep: { min: number[]; max: number[] } | null;
}

const mkSlot = (id: SlotId): Slot => ({
  id,
  role: id.startsWith("follower") ? "follower" : "leader",
  arm: id.endsWith("A") ? "a" : "b",
  bus: null,
  connected: false,
  torque: false,
  cal: defaultCalib(),
  raw: null,
  tele: null,
  found: [],
  error: "",
  hz: 0,
  sweep: null,
});

const follower = (a: Arm): SlotId => (a === "a" ? "followerA" : "followerB");
const leader = (a: Arm): SlotId => (a === "a" ? "leaderA" : "leaderB");

class Hub {
  slots: Record<SlotId, Slot> = { followerA: mkSlot("followerA"), leaderA: mkSlot("leaderA"), followerB: mkSlot("followerB"), leaderB: mkSlot("leaderB") };
  version = 0;
  estop = false;
  teleop: Record<Arm, boolean> = { a: false, b: false };
  limits = { speed: 1500, accel: 60, torque: 600 };
  private target: Record<Arm, number[] | null> = { a: null, b: null };
  private goal: Record<Arm, number[] | null> = { a: null, b: null };
  private listeners = new Set<() => void>();
  private lastNotify = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  private lastTick = 0;
  onEstop: (() => void)[] = [];

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getVersion = () => this.version;

  private emit(force = false) {
    const now = performance.now();
    if (!force && now - this.lastNotify < 100) return;
    this.lastNotify = now;
    this.version++;
    this.listeners.forEach((f) => f());
  }

  private startLoop() {
    if (this.timer) return;
    this.lastTick = performance.now();
    this.timer = setInterval(() => void this.tick(), 33);
  }
  private maybeStopLoop() {
    if (Object.values(this.slots).some((s) => s.connected)) return;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick() {
    if (this.busy) return;
    this.busy = true;
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTick) / 1000);
    this.lastTick = now;
    try {
      for (const s of Object.values(this.slots)) {
        if (!s.connected || !s.bus) continue;
        try {
          const tele = await s.bus.readTelemetry(MOTOR_IDS);
          if (tele.every((t) => t)) {
            s.tele = tele;
            s.raw = tele.map((t) => (t as Telemetry).pos);
            s.error = "";
            s.hz = s.hz * 0.9 + (dt > 0 ? 1 / dt : 0) * 0.1;
            if (s.sweep) s.raw.forEach((r, i) => {
              s.sweep!.min[i] = Math.min(s.sweep!.min[i], r);
              s.sweep!.max[i] = Math.max(s.sweep!.max[i], r);
            });
          } else {
            s.error = "Some servos did not answer (check cabling / power)";
          }
        } catch (e) {
          s.error = e instanceof Error ? e.message : String(e);
        }
      }
      for (const arm of ["a", "b"] as Arm[]) {
        const F = this.slots[follower(arm)];
        const L = this.slots[leader(arm)];
        if (this.teleop[arm] && !this.estop && L.connected && L.raw && F.connected && F.torque) {
          this.target[arm] = L.raw.map((r, i) => normToRaw(F.cal, i, rawToNorm(L.cal, i, r)));
        }
        const tgt = this.target[arm];
        if (!F.connected || !F.bus || !F.torque || this.estop || !tgt || !F.raw) continue;
        const g = (this.goal[arm] ??= [...F.raw]);
        const maxStep = this.limits.speed * dt;
        for (let i = 0; i < 6; i++) g[i] = clampRaw(F.cal, i, g[i] + clamp(tgt[i] - g[i], -maxStep, maxStep), 0.01);
        try {
          await F.bus.writeGoals(MOTOR_IDS, g);
        } catch (e) {
          F.error = e instanceof Error ? e.message : String(e);
        }
      }
    } finally {
      this.busy = false;
      this.emit();
    }
  }

  async connect(id: SlotId) {
    const s = this.slots[id];
    if (s.connected) return;
    const bus = new FeetechBus();
    try {
      await bus.connect();
      const found: number[] = [];
      for (const m of MOTOR_IDS) if (await bus.ping(m)) found.push(m);
      if (found.length === 0) throw new Error("No servos answered. Check motor power, the USB port and that nothing else (LeRobot) holds the port. Baud = 1,000,000.");
      s.found = found;
      s.cal = loadCalib(id);
      s.error = found.length < 6 ? `Only motor IDs ${found.join(",")} answered — finish lerobot-setup-motors` : "";
      if (s.role === "follower") await bus.configureFollower(MOTOR_IDS, { accel: this.limits.accel, speed: this.limits.speed, torqueLimit: this.limits.torque });
      else await bus.setTorque(MOTOR_IDS, false);
      s.bus = bus;
      s.connected = true;
      s.torque = false;
      this.startLoop();
    } catch (e) {
      await bus.disconnect();
      throw e;
    } finally {
      this.emit(true);
    }
  }

  async disconnect(id: SlotId) {
    const s = this.slots[id];
    if (!s.bus) return;
    try {
      await s.bus.setTorque(MOTOR_IDS, false);
    } catch {
      /* ignore */
    }
    await s.bus.disconnect();
    s.bus = null;
    s.connected = false;
    s.torque = false;
    s.raw = null;
    s.tele = null;
    this.target[s.arm] = null;
    this.goal[s.arm] = null;
    this.maybeStopLoop();
    this.emit(true);
  }

  async setTorque(id: SlotId, on: boolean) {
    const s = this.slots[id];
    if (!s.bus || !s.connected) return;
    if (on && this.estop) throw new Error("E-stop is active — release it first");
    if (on) {
      if (!s.raw) throw new Error("No position reading yet");
      if (s.role === "follower") {
        this.target[s.arm] = [...s.raw];
        this.goal[s.arm] = [...s.raw];
        await s.bus.writeGoals(MOTOR_IDS, s.raw);
      }
    } else if (s.role === "follower") {
      this.target[s.arm] = null;
      this.goal[s.arm] = null;
      this.teleop[s.arm] = false;
    }
    await s.bus.setTorque(MOTOR_IDS, on);
    s.torque = on;
    this.emit(true);
  }

  async applyLimits() {
    for (const id of ["followerA", "followerB"] as SlotId[]) {
      const s = this.slots[id];
      if (s.connected && s.bus) await s.bus.setLimits(MOTOR_IDS, { accel: this.limits.accel, speed: Math.round(this.limits.speed * 1.5), torqueLimit: this.limits.torque });
    }
    this.emit(true);
  }

  async emergencyStop() {
    this.estop = true;
    this.target = { a: null, b: null };
    this.goal = { a: null, b: null };
    this.teleop = { a: false, b: false };
    this.onEstop.forEach((f) => f());
    for (const s of Object.values(this.slots)) {
      if (!s.connected || !s.bus) continue;
      s.torque = false;
      try {
        await s.bus.setTorque(MOTOR_IDS, false);
      } catch {
        /* ignore */
      }
    }
    this.emit(true);
  }
  clearEstop() {
    this.estop = false;
    this.emit(true);
  }

  setTeleop(arm: Arm, on: boolean) {
    this.teleop[arm] = on;
    this.emit(true);
  }

  /** Command the follower with a simulator joint vector Q. Returns false if the arm is not live. */
  commandQ(arm: Arm, q: number[]): boolean {
    const F = this.slots[follower(arm)];
    if (!F.connected || !F.torque || this.estop) return false;
    this.target[arm] = qToRaws(F.cal, q).map((r, i) => clampRaw(F.cal, i, r));
    return true;
  }
  /** Command the follower with LeRobot-normalised values (±100, gripper 0..100). */
  commandNorm(arm: Arm, norm: number[]): boolean {
    const F = this.slots[follower(arm)];
    if (!F.connected || !F.torque || this.estop) return false;
    this.target[arm] = norm.map((n, i) => clampRaw(F.cal, i, normToRaw(F.cal, i, n)));
    return true;
  }
  isLive(arm: Arm) {
    const F = this.slots[follower(arm)];
    return F.connected && F.torque && !this.estop;
  }
  getQ(slot: SlotId): number[] | null {
    const s = this.slots[slot];
    return s.connected && s.raw ? rawsToQ(s.cal, s.raw) : null;
  }
  getNorm(slot: SlotId): number[] | null {
    const s = this.slots[slot];
    return s.connected && s.raw ? s.raw.map((r, i) => rawToNorm(s.cal, i, r)) : null;
  }

  /* ---------------- calibration helpers ---------------- */
  startSweep(id: SlotId) {
    const s = this.slots[id];
    if (!s.raw) return;
    s.sweep = { min: [...s.raw], max: [...s.raw] };
    this.emit(true);
  }
  finishSweep(id: SlotId) {
    const s = this.slots[id];
    if (!s.sweep) return;
    s.sweep.min.forEach((mn, i) => {
      const mx = s.sweep!.max[i];
      if (mx - mn > 80) {
        s.cal.rangeMin[i] = mn;
        s.cal.rangeMax[i] = mx;
      }
    });
    s.cal.calibrated = true;
    s.sweep = null;
    saveCalib(id, s.cal);
    this.emit(true);
  }
  captureRest(id: SlotId) {
    const s = this.slots[id];
    if (!s.raw) return;
    for (let i = 0; i < 5; i++) s.cal.restDeg[i] = rawToDeg(s.cal, i, s.raw[i]);
    s.cal.aligned = true;
    saveCalib(id, s.cal);
    this.emit(true);
  }
  updateCal(id: SlotId, fn: (c: Calib) => void) {
    const s = this.slots[id];
    fn(s.cal);
    saveCalib(id, s.cal);
    this.emit(true);
  }
  setCal(id: SlotId, c: Calib) {
    this.slots[id].cal = c;
    saveCalib(id, c);
    this.emit(true);
  }
}

export const hub = new Hub();

export function useHub(): Hub {
  useSyncExternalStore(hub.subscribe, hub.getVersion, () => 0);
  return hub;
}
