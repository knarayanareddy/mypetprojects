"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Aborted, Arm, DEFAULT_GRASP, sleep, type ArmState, type GraspTuning } from "@/lib/arm";
import { ServoBus } from "@/lib/feetech";
import { JOINTS, defaultCalibration, jointLimits, type ArmCalibration, type JointName } from "@/lib/kinematics";
import { DEFAULT_RUNNER, MISSIONS, Runner, type Mission, type RunnerOpts } from "@/lib/missions";
import { DEFAULT_ROLLOUT } from "@/lib/defaults";
import { SimWorld } from "@/lib/sim";
import { WebSerialTransport } from "@/lib/serial";
import { backupRemote, loadLocal, loadRemote, saveLocal } from "@/lib/persist";
import { detectByColor, detectByDiff, fitAndValidate, localizeAll, meanColorAt, type CalibrationReport, type Detection, type Img, type Mark } from "@/lib/vision";
import type { RolloutCfg } from "@/lib/models";

export interface PaletteEntry {
  label: string;
  rgb: [number, number, number];
  tol: number;
}
export interface Recording {
  name: string;
  frames: { t: number; q: Partial<Record<JointName, number>> }[];
}
export interface Persisted {
  calFollower: ArmCalibration;
  calLeader: ArmCalibration;
  marks: Mark[];
  palette: PaletteEntry[];
  detectMode: "color" | "diff";
  diffThresh: number;
  minArea: number;
  grasp: GraspTuning;
  runner: RunnerOpts;
  maxDegPerS: number;
  tableZ: number;
  missionParams: Record<string, Record<string, number>>;
  rollout: RolloutCfg;
  bridgeUrl: string;
  recordings: Recording[];
  acceptUnvalidated: boolean;
  /** Scripted control: selecting a mission arms it and starts it automatically after a countdown. */
  autoRun: boolean;
  autoRunDelayS: number;
}

export function defaultPersisted(): Persisted {
  return {
    calFollower: defaultCalibration(),
    calLeader: defaultCalibration(),
    marks: [],
    palette: [
      { label: "red cube", rgb: [210, 40, 40], tol: 60 },
      { label: "green cube", rgb: [40, 170, 70], tol: 60 },
      { label: "blue cube", rgb: [40, 80, 210], tol: 60 },
      { label: "yellow cube", rgb: [235, 205, 40], tol: 60 },
    ],
    detectMode: "color",
    diffThresh: 60,
    minArea: 200,
    grasp: { ...DEFAULT_GRASP },
    runner: { ...DEFAULT_RUNNER },
    maxDegPerS: 60,
    tableZ: 0,
    missionParams: {},
    rollout: DEFAULT_ROLLOUT,
    bridgeUrl: "ws://127.0.0.1:8765",
    recordings: [],
    acceptUnvalidated: false,
    autoRun: true,
    autoRunDelayS: 5,
  };
}

export interface Session {
  arm: Arm;
  kind: "sim" | "serial";
  transport: WebSerialTransport | null;
  world: SimWorld | null;
  label: string;
}

export interface LogLine {
  t: number;
  level: "info" | "warn" | "error" | "ok";
  msg: string;
}

export type CameraMode = "sim" | "webcam";

interface Room {
  ready: boolean;
  data: Persisted;
  update: (patch: Partial<Persisted>) => void;
  follower: Session | null;
  leader: Session | null;
  fState: ArmState | null;
  lState: ArmState | null;
  connect: (role: "follower" | "leader", kind: "sim" | "serial") => Promise<void>;
  disconnect: (role: "follower" | "leader") => Promise<void>;
  setTorque: (on: boolean) => Promise<void>;
  estop: () => Promise<void>;
  logs: LogLine[];
  log: (msg: string, level?: LogLine["level"]) => void;
  // camera
  cameraMode: CameraMode;
  setCameraMode: (m: CameraMode) => Promise<void>;
  video: React.RefObject<HTMLVideoElement | null>;
  grabFrame: () => Img | null;
  captureBackground: () => void;
  hasBackground: boolean;
  sampleColor: (px: { x: number; y: number }) => [number, number, number] | null;
  report: CalibrationReport;
  perceive: () => Promise<Detection[]>;
  // missions
  running: string | null;
  runMission: (m: Mission, params: Record<string, number>, dry?: boolean) => Promise<void>;
  stopMission: () => void;
  trail: [number, number, number][];
  preflight: (m: Mission | null, opts?: { dry?: boolean }) => { blockers: string[]; warnings: string[] };
  // teleop + recorder
  teleop: boolean;
  setTeleop: (on: boolean) => Promise<void>;
  recording: boolean;
  startRecording: () => void;
  stopRecording: (name: string) => void;
  replay: (name: string, speed: number, loop: boolean) => Promise<void>;
  worldTick: number;
}

const Ctx = createContext<Room | null>(null);
export const useRoom = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("RoomProvider missing");
  return c;
};

export function RoomProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Persisted>(defaultPersisted);
  const [ready, setReady] = useState(false);
  const [follower, setFollower] = useState<Session | null>(null);
  const [leader, setLeader] = useState<Session | null>(null);
  const [fState, setFState] = useState<ArmState | null>(null);
  const [lState, setLState] = useState<ArmState | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [cameraMode, setCameraModeState] = useState<CameraMode>("sim");
  const [running, setRunning] = useState<string | null>(null);
  const [trail, setTrail] = useState<[number, number, number][]>([]);
  const [teleop, setTeleopState] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hasBackground, setHasBackground] = useState(false);
  const [worldTick, setWorldTick] = useState(0);

  const dataRef = useRef(data);
  dataRef.current = data;
  const followerRef = useRef<Session | null>(null);
  const leaderRef = useRef<Session | null>(null);
  followerRef.current = follower;
  leaderRef.current = leader;
  const abortRef = useRef<AbortController | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const bg = useRef<Img | null>(null);
  const teleopRef = useRef(false);
  const recRef = useRef<{ t0: number; frames: Recording["frames"] } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const log = useCallback((msg: string, level: LogLine["level"] = "info") => {
    setLogs((l) => [...l.slice(-199), { t: Date.now(), level, msg }]);
  }, []);

  // ---- persistence --------------------------------------------------------
  useEffect(() => {
    const local = loadLocal<Persisted>();
    if (local) setData({ ...defaultPersisted(), ...local });
    setReady(true);
    if (!local) {
      void loadRemote<Persisted>().then((r) => {
        if (r) setData({ ...defaultPersisted(), ...r });
      });
    }
  }, []);
  useEffect(() => {
    if (!ready) return;
    saveLocal(data);
    backupRemote(data);
  }, [data, ready]);

  const update = useCallback((patch: Partial<Persisted>) => setData((d) => ({ ...d, ...patch })), []);

  // keep live arm objects in sync with persisted tuning
  useEffect(() => {
    if (follower) {
      follower.arm.cal = data.calFollower;
      follower.arm.grasp_tuning = data.grasp;
      follower.arm.maxDegPerS = data.maxDegPerS;
      follower.arm.tableZ = data.tableZ;
    }
    if (leader) leader.arm.cal = data.calLeader;
  }, [data, follower, leader]);

  // ---- connection ---------------------------------------------------------
  const connect = useCallback(
    async (role: "follower" | "leader", kind: "sim" | "serial") => {
      const cal = role === "follower" ? dataRef.current.calFollower : dataRef.current.calLeader;
      try {
        let s: Session;
        if (kind === "sim") {
          const world = role === "follower" ? new SimWorld(cal) : null;
          let arm: Arm;
          if (world) arm = world.arm;
          else {
            const w = new SimWorld(cal);
            arm = w.arm;
            arm.name = "Virtual leader";
          }
          arm.cal = cal;
          s = { arm, kind, transport: null, world, label: role === "follower" ? "Virtual SO-101 follower" : "Virtual leader" };
        } else {
          const t = await WebSerialTransport.request(1_000_000);
          const arm = new Arm(role, new ServoBus(t, 40), cal);
          s = { arm, kind, transport: t, world: null, label: `${role} @ ${t.portLabel()}` };
        }
        const missing = await s.arm.check();
        if (missing.length === 6) {
          await s.transport?.close();
          throw new Error("No motors answered at 1 Mbps. Check: power supply on, USB cable, correct port, motor IDs 1-6 assigned.");
        }
        if (missing.length) log(`${role}: motors not answering: ${missing.join(", ")}`, "warn");
        if (role === "follower") {
          s.arm.grasp_tuning = dataRef.current.grasp;
          s.arm.maxDegPerS = dataRef.current.maxDegPerS;
          s.arm.tableZ = dataRef.current.tableZ;
          if (!missing.length) {
            const changed = await s.arm.initFollower();
            if (changed.length) log(`Motor registers configured (${changed.length} changed): ${changed.join(", ")}`, "info");
          }
          setFollower(s);
        } else {
          setLeader(s);
        }
        setCameraModeState((m) => (role === "follower" && kind === "sim" ? "sim" : m));
        log(`${role} connected (${s.label}); torque is OFF`, "ok");
      } catch (e) {
        log(`Connect ${role} failed: ${e instanceof Error ? e.message : String(e)}`, "error");
      }
    },
    [log],
  );

  const disconnect = useCallback(
    async (role: "follower" | "leader") => {
      const s = role === "follower" ? followerRef.current : leaderRef.current;
      if (!s) return;
      if (role === "follower") {
        abortRef.current?.abort();
        teleopRef.current = false;
        setTeleopState(false);
        try {
          await s.arm.setTorque(false);
        } catch {}
        setFollower(null);
        setFState(null);
      } else {
        teleopRef.current = false;
        setTeleopState(false);
        setLeader(null);
        setLState(null);
      }
      await s.transport?.close();
      log(`${role} disconnected`);
    },
    [log],
  );

  // ---- polling ------------------------------------------------------------
  useEffect(() => {
    if (!follower) return;
    let alive = true;
    void (async () => {
      let errs = 0;
      while (alive) {
        try {
          const s = await follower.arm.readState();
          if (!alive) break;
          setFState(s);
          follower.world?.update(s);
          setWorldTick((n) => (n + 1) % 1e6);
          errs = 0;
          if (recRef.current) {
            const q: Partial<Record<JointName, number>> = {};
            for (const j of JOINTS) q[j] = j === "gripper" ? s.gripperPct : s.deg[j];
            recRef.current.frames.push({ t: Date.now() - recRef.current.t0, q });
          }
          // thermal / voltage watch
          const hot = s.temp.findIndex((t) => t >= 62);
          if (hot >= 0 && Math.random() < 0.02) log(`Motor ${hot + 1} is hot (${s.temp[hot]}°C). Let it rest.`, "warn");
        } catch (e) {
          if (++errs === 5) log(`Follower link problem: ${e instanceof Error ? e.message : e}`, "error");
          if (errs > 40) {
            log("Follower link lost: disconnecting", "error");
            void disconnect("follower");
            return;
          }
        }
        await new Promise((r) => setTimeout(r, 45));
      }
    })();
    return () => {
      alive = false;
    };
  }, [follower, log, disconnect]);

  useEffect(() => {
    if (!leader) return;
    let alive = true;
    void (async () => {
      let errs = 0;
      while (alive) {
        try {
          const s = await leader.arm.readState();
          if (!alive) break;
          setLState(s);
          errs = 0;
        } catch {
          if (++errs > 40) {
            void disconnect("leader");
            return;
          }
        }
        await new Promise((r) => setTimeout(r, 45));
      }
    })();
    return () => {
      alive = false;
    };
  }, [leader, disconnect]);

  const setTorque = useCallback(
    async (on: boolean) => {
      const s = followerRef.current;
      if (!s) return;
      try {
        await s.arm.setTorque(on);
        log(on ? "Torque ON (holding current pose)" : "Torque OFF (arm is limp: support it!)", on ? "ok" : "warn");
      } catch (e) {
        log(`Torque command failed: ${e}`, "error");
      }
    },
    [log],
  );

  const estop = useCallback(async () => {
    abortRef.current?.abort();
    teleopRef.current = false;
    setTeleopState(false);
    const s = followerRef.current;
    if (s) await s.arm.estop();
    log("E-STOP: torque disabled", "error");
  }, [log]);

  // ---- camera -------------------------------------------------------------
  const setCameraMode = useCallback(
    async (m: CameraMode) => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (m === "webcam") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
          streamRef.current = stream;
          if (video.current) {
            video.current.srcObject = stream;
            await video.current.play();
          }
        } catch (e) {
          log(`Camera error: ${e instanceof Error ? e.message : e}`, "error");
          return;
        }
      }
      setCameraModeState(m);
    },
    [log],
  );

  const ensureCanvas = () => {
    if (!canvas.current && typeof document !== "undefined") {
      canvas.current = document.createElement("canvas");
      canvas.current.width = 640;
      canvas.current.height = 480;
    }
    return canvas.current;
  };

  const grabFrame = useCallback((): Img | null => {
    const c = ensureCanvas();
    const ctx = c?.getContext("2d", { willReadFrequently: true });
    if (!c || !ctx) return null;
    if (cameraMode === "sim") {
      const w = followerRef.current?.world;
      if (!w) return null;
      w.render(ctx, 640, 480, 3);
    } else {
      const v = video.current;
      if (!v || v.readyState < 2) return null;
      ctx.drawImage(v, 0, 0, 640, 480);
    }
    const im = ctx.getImageData(0, 0, 640, 480);
    return { data: im.data, width: 640, height: 480 };
  }, [cameraMode]);

  const captureBackground = useCallback(() => {
    const c = ensureCanvas();
    const ctx = c?.getContext("2d", { willReadFrequently: true });
    if (!c || !ctx) return;
    if (cameraMode === "sim") {
      const w = followerRef.current?.world;
      if (!w) return;
      w.render(ctx, 640, 480, 3, false);
    } else {
      const v = video.current;
      if (!v) return;
      ctx.drawImage(v, 0, 0, 640, 480);
    }
    const im = ctx.getImageData(0, 0, 640, 480);
    bg.current = { data: im.data, width: 640, height: 480 };
    setHasBackground(true);
    log("Empty-table reference captured", "ok");
  }, [cameraMode, log]);

  const sampleColor = useCallback(
    (p: { x: number; y: number }) => {
      const f = grabFrame();
      return f ? meanColorAt(f, p) : null;
    },
    [grabFrame],
  );

  const report = useMemo(() => fitAndValidate(data.marks), [data.marks]);

  const perceive = useCallback(async (): Promise<Detection[]> => {
    const d = dataRef.current;
    const img = grabFrame();
    if (!img) throw new Error("No camera frame. Start the camera in the Vision tab.");
    const H = fitAndValidate(d.marks).H;
    if (!H) throw new Error("Camera is not calibrated (Vision tab).");
    let dets: Detection[] = [];
    if (d.detectMode === "color") {
      for (const p of d.palette) dets.push(...detectByColor(img, p.rgb, p.tol, { label: p.label, minArea: d.minArea }));
    } else {
      if (!bg.current) throw new Error("Capture the empty-table reference first (Vision tab).");
      dets = detectByDiff(img, bg.current, d.diffThresh, { minArea: d.minArea }).map((x) => {
        const c = meanColorAt(img, x.px, 2);
        let best = "object";
        let bd = 1e9;
        for (const p of d.palette) {
          const dist = Math.hypot(p.rgb[0] - c[0], p.rgb[1] - c[1], p.rgb[2] - c[2]);
          if (dist < p.tol * 1.5 && dist < bd) {
            bd = dist;
            best = p.label;
          }
        }
        return { ...x, label: best };
      });
    }
    return localizeAll(dets, H);
  }, [grabFrame]);

  // ---- missions -----------------------------------------------------------
  const preflight = useCallback(
    (m: Mission | null, opts: { dry?: boolean } = {}) => {
      const blockers: string[] = [];
      const warnings: string[] = [];
      const f = followerRef.current;
      const d = dataRef.current;
      if (!f) blockers.push("Connect the follower arm (or the virtual arm) first.");
      else if (!opts.dry) {
        // Torque is NOT a blocker: scripted runs enable it themselves (holding the current pose) before moving.
        if (fState && fState.online.some((o) => !o)) blockers.push("One or more motors are not answering.");
        if (f.kind === "serial") {
          if (!d.calFollower.referenceCaptured) blockers.push("Capture the L-pose reference in Calibrate (kinematics need it).");
          if (!d.calFollower.directionsConfirmed) blockers.push("Confirm jog directions in Calibrate (sign check).");
        }
      }
      if (m?.needsCamera) {
        if (report.status === "insufficient") blockers.push("Calibrate the camera (Vision tab): at least 4 marks.");
        else if (report.status === "unvalidated" && !d.acceptUnvalidated) blockers.push("Camera accuracy is UNVALIDATED: add probe marks, or tick 'accept unvalidated' in Vision.");
        else if (report.status === "warn") warnings.push(report.message);
        if (d.detectMode === "diff" && !hasBackground) blockers.push("Capture the empty-table reference (Vision tab).");
      }
      if (f?.kind === "serial" && !opts.dry) {
        if (d.tableZ === 0) warnings.push("Table height was never set: run 'Touch table' in Calibrate to remove Z error.");
        if (d.grasp.minGapPct === 8 && d.grasp.loadThreshold === 90) warnings.push("Grasp thresholds are untuned defaults: run 'Tune grasp' in Calibrate.");
      }
      return { blockers, warnings };
    },
    [report, hasBackground, fState],
  );

  const runningRef = useRef<string | null>(null);
  const runMission = useCallback(
    async (m: Mission, params: Record<string, number>, dry = false) => {
      const f = followerRef.current;
      if (!f) return log("Connect the follower arm first.", "warn");
      if (runningRef.current) return log(`Busy: ${runningRef.current} is still running. Stop it first.`, "warn");
      // Defence in depth: the UI disables the button, but the runner enforces the same checks.
      const pf = preflight(m, { dry });
      if (pf.blockers.length) {
        pf.blockers.forEach((b) => log(`⛔ ${m.title}: ${b}`, "error"));
        return;
      }
      pf.warnings.forEach((w) => log(`⚠ ${w}`, "warn"));
      const ctl = new AbortController();
      abortRef.current = ctl;
      runningRef.current = m.id;
      setRunning(m.id);
      setTrail([]);
      log(`▶ ${m.title}${dry ? " (dry run)" : ""}`, "info");
      const runner = new Runner(f.arm, ctl.signal, log, perceive, { ...dataRef.current.runner, dryRun: dry }, (t) => setTrail(t));
      try {
        if (!dry) {
          if (teleopRef.current) {
            teleopRef.current = false;
            setTeleopState(false);
            log("Teleop stopped to run the mission", "warn");
          }
          if (!f.arm.torque) {
            if (!f.arm.state) await f.arm.readState();
            await f.arm.setTorque(true);
            log("Torque enabled automatically (holding the current pose)", "ok");
          }
        }
        const res = await m.run(runner, params);
        log(`✔ ${m.title}: ${res}`, "ok");
      } catch (e) {
        if (e instanceof Aborted) log(`■ ${m.title} stopped`, "warn");
        else log(`✖ ${m.title} failed: ${e instanceof Error ? e.message : e}`, "error");
      } finally {
        runningRef.current = null;
        setRunning(null);
        abortRef.current = null;
      }
    },
    [log, perceive, preflight],
  );

  const stopMission = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ---- teleop -------------------------------------------------------------
  const setTeleop = useCallback(
    async (on: boolean) => {
      const f = followerRef.current;
      const l = leaderRef.current;
      if (!on) {
        teleopRef.current = false;
        setTeleopState(false);
        log("Teleop stopped");
        return;
      }
      if (!f || !l) {
        log("Teleop needs both a follower and a leader connected", "warn");
        return;
      }
      if (!fState?.torque) await f.arm.setTorque(true);
      teleopRef.current = true;
      setTeleopState(true);
      log("Teleop: easing follower to the leader pose…", "info");
      void (async () => {
        try {
          const limits = jointLimits(f.arm.cal);
          const target = async (): Promise<Partial<Record<JointName, number>>> => {
            const s = l.arm.state ?? (await l.arm.readState());
            const t: Partial<Record<JointName, number>> = {};
            for (const j of JOINTS) t[j] = j === "gripper" ? s.gripperPct : Math.min(Math.max(s.deg[j], limits[j][0]), limits[j][1]);
            return t;
          };
          await f.arm.moveTo(await target(), 2000);
          log("Teleop live", "ok");
          while (teleopRef.current) {
            const t = await target();
            const step: Partial<Record<JointName, number>> = {};
            for (const j of JOINTS) {
              const cur = f.arm.currentTarget(j);
              const max = j === "gripper" ? 12 : 6; // deg per 40 ms tick: bounded slew
              step[j] = cur + Math.max(-max, Math.min(max, t[j]! - cur));
            }
            await f.arm.setGoals(step);
            await new Promise((r) => setTimeout(r, 40));
          }
        } catch (e) {
          log(`Teleop error: ${e}`, "error");
          teleopRef.current = false;
          setTeleopState(false);
        }
      })();
    },
    [fState, log],
  );

  const startRecording = useCallback(() => {
    recRef.current = { t0: Date.now(), frames: [] };
    setRecording(true);
    log("Recording… move the arm (torque OFF to guide it by hand, or use teleop)");
  }, [log]);

  const stopRecording = useCallback(
    (name: string) => {
      const r = recRef.current;
      recRef.current = null;
      setRecording(false);
      if (!r || r.frames.length < 3) return log("Recording too short", "warn");
      // thin to ~20 Hz
      const frames: Recording["frames"] = [];
      let last = -100;
      for (const fr of r.frames) if (fr.t - last >= 50) { frames.push(fr); last = fr.t; }
      setData((d) => ({ ...d, recordings: [...d.recordings.filter((x) => x.name !== name), { name, frames }] }));
      log(`Saved recording "${name}" (${frames.length} frames)`, "ok");
    },
    [log],
  );

  const replay = useCallback(
    async (name: string, speed: number, loop: boolean) => {
      const f = followerRef.current;
      const rec = dataRef.current.recordings.find((r) => r.name === name);
      if (!f || !rec || runningRef.current) return;
      const ctl = new AbortController();
      abortRef.current = ctl;
      runningRef.current = `replay:${name}`;
      setRunning(`replay:${name}`);
      try {
        if (!f.arm.torque) await f.arm.setTorque(true);
        do {
          await f.arm.moveTo(rec.frames[0].q, 1500, ctl.signal);
          const t0 = Date.now();
          for (const fr of rec.frames) {
            const wait = fr.t / speed - (Date.now() - t0);
            if (wait > 0) await sleep(wait, ctl.signal);
            await f.arm.setGoals(fr.q);
          }
        } while (loop && !ctl.signal.aborted);
        log(`Replay "${name}" finished`, "ok");
      } catch (e) {
        if (!(e instanceof Aborted)) log(`Replay failed: ${e}`, "error");
      } finally {
        runningRef.current = null;
        setRunning(null);
      }
    },
    [log],
  );

  void MISSIONS;

  const value: Room = {
    ready, data, update, follower, leader, fState, lState, connect, disconnect, setTorque, estop, logs, log,
    cameraMode, setCameraMode, video, grabFrame, captureBackground, hasBackground, sampleColor, report, perceive,
    running, runMission, stopMission, trail, preflight, teleop, setTeleop, recording, startRecording, stopRecording, replay, worldTick,
  };

  return (
    <Ctx.Provider value={value}>
      <video ref={video} className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px opacity-0" playsInline muted />
      {children}
    </Ctx.Provider>
  );
}
