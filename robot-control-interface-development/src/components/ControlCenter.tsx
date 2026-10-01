"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ArmPanel from "./ArmPanel";
import SimView from "./SimView";
import { hub, useHub, type SlotId } from "@/lib/hub";
import { Sim } from "@/lib/sim";
import { SCENARIOS, SCENARIO_BY_ID, routeInstruction } from "@/lib/scenarios";
import { ACTING_MODELS, MODEL_BY_ID, MODELS, profileFor } from "@/lib/models";
import { BASE } from "@/lib/scenarios/dsl";
import { D2R, ik, poseToQ, qToPose, R2D, REST, tcpWorld, type Pose } from "@/lib/kin";
import { defaultCalib, normToRaw, qToRaws, rawToNorm, rawsToQ } from "@/lib/calibration";
import { loadPolicyOnServer, PolicyRunner, policyHealth, type ArmSel, type PolicyStats } from "@/lib/policy";
import { IDEAL_PROFILE, type Arm } from "@/lib/scenarios/types";

const VCAL = defaultCalib();
const REST_Q = poseToQ(REST);
const slotOf = (a: Arm): SlotId => (a === "a" ? "followerA" : "followerB");
const JOINT_RANGE: [string, number, number][] = [
  ["pan", -110, 110],
  ["lift", -20, 200],
  ["elbow", -150, 150],
  ["wrist", -120, 120],
  ["roll", -180, 180],
  ["grip", 0, 1],
];

interface RegModel {
  id: number;
  name: string;
  family: string;
  source: string;
  location: string;
  endpoint: string;
  instruction: string;
  languageConditioned: boolean;
}
interface RunRow {
  id: number;
  instruction: string;
  scenarioId: string;
  modelName: string;
  mode: string;
  outcome: string;
  createdAt: string;
}
interface RecRow {
  id: number;
  name: string;
  arm: string;
  fps: number;
  frames: number;
}
type RunState = { mode: "idle" | "skill" | "policy"; target: "sim" | "hardware"; instruction: string; scenarioId: string; modelName: string };
type Tab = "task" | "model" | "record" | "history";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function ControlCenter() {
  const h = useHub();
  const [tab, setTab] = useState<Tab>("task");
  const [sid, setSid] = useState("sorter");
  const [instruction, setInstruction] = useState("Tidy up the blocks by colour");
  const [plan, setPlan] = useState<{ via: string; reason: string; alternatives: string[] } | null>(null);
  const [target, setTarget] = useState<"sim" | "hardware">("sim");
  const [simModel, setSimModel] = useState("scripted");
  const [run, setRun] = useState<RunState>({ mode: "idle", target: "sim", instruction: "", scenarioId: "", modelName: "" });
  const [log, setLog] = useState<string[]>(["Ready. Connect arms on the left (Chrome/Edge) or just try the simulation."]);
  const [jogArm, setJogArm] = useState<Arm>("a");
  const [, force] = useState(0);
  const [listening, setListening] = useState(false);

  const scn = SCENARIO_BY_ID[sid];
  const sim = useRef<Sim | null>(null);
  if (!sim.current) {
    sim.current = new Sim(SCENARIO_BY_ID.sorter, IDEAL_PROFILE);
    sim.current.paused = true;
    sim.current.loop = false;
  }
  const manual = useRef<Record<Arm, number[]>>({ a: [...REST_Q], b: [...REST_Q] });
  const synced = useRef<Record<Arm, boolean>>({ a: false, b: false });
  const runRef = useRef(run);
  runRef.current = run;
  const addLog = useCallback((m: string) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${m}`, ...l].slice(0, 80)), []);

  /* ---------------- digital-twin override ---------------- */
  const override = useCallback((arm: Arm): Pose | null => {
    const r = runRef.current;
    if (r.mode === "skill" && r.target === "sim") return null;
    const q = hub.getQ(slotOf(arm));
    if (q) return qToPose(q);
    if (r.mode === "skill") return null;
    return qToPose(manual.current[arm]);
  }, []);

  /* ---------------- scenario selection ---------------- */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("scenario");
    if (p && SCENARIO_BY_ID[p]) {
      setSid(p);
      setInstruction(SCENARIO_BY_ID[p].prompt);
    }
  }, []);
  useEffect(() => {
    if (runRef.current.mode === "idle") {
      sim.current!.load(scn, IDEAL_PROFILE);
      sim.current!.paused = true;
      sim.current!.loop = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  /* ---------------- hardware drive loop + completion monitor ---------------- */
  useEffect(() => {
    const id = setInterval(() => {
      const r = runRef.current;
      const s = sim.current!;
      (["a", "b"] as Arm[]).forEach((a) => {
        if (!hub.isLive(a)) synced.current[a] = false;
      });
      if (r.mode === "skill" && r.target === "hardware" && !hub.estop) {
        (["a", "b"] as Arm[]).forEach((a) => {
          if (hub.isLive(a)) hub.commandQ(a, poseToQ(s.arms[a].desired));
        });
      }
      if (r.mode === "skill" && s.finished) finishSkill("completed");
    }, 33);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logRun = useCallback((r: RunState, outcome: string, metrics: Record<string, number | string>) => {
    void fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction: r.instruction, scenarioId: r.scenarioId, modelName: r.modelName, mode: r.target, outcome, metrics }) });
  }, []);

  const finishSkill = useCallback(
    (outcome: string) => {
      const r = runRef.current;
      if (r.mode !== "skill") return;
      const s = sim.current!;
      (["a", "b"] as Arm[]).forEach((a) => (manual.current[a] = poseToQ(s.arms[a].pose)));
      s.paused = true;
      setRun({ ...r, mode: "idle" });
      runRef.current = { ...r, mode: "idle" };
      addLog(`Skill ${outcome}: “${r.instruction}” (${r.target}) · grasps ${s.stats.grabs}, missed ${s.stats.misses}, cycle ${s.stats.cycle.toFixed(1)} s`);
      logRun(r, outcome, { grasps: s.stats.grabs, missed: s.stats.misses, hits: s.stats.hits, cycleSeconds: Number(s.stats.cycle.toFixed(1)) });
    },
    [addLog, logRun],
  );

  /* ---------------- policy runner ---------------- */
  const [pol, setPol] = useState({ endpoint: "demo://loopback", task: "Pick up the cube and put it in the bin", arms: "a" as ArmSel, fps: 30, prefetch: 6, path: "", type: "act", device: "cuda" });
  const [polStats, setPolStats] = useState<PolicyStats | null>(null);
  const [polInfo, setPolInfo] = useState("");
  const runner = useRef<PolicyRunner | null>(null);
  const [regModels, setRegModels] = useState<RegModel[]>([]);
  const camRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [cams, setCams] = useState<{ devices: MediaDeviceInfo[]; sel: Record<string, string>; active: Record<string, boolean> }>({ devices: [], sel: { front: "", wrist: "" }, active: {} });
  const streams = useRef<Record<string, MediaStream>>({});

  const armList = (sel: ArmSel): Arm[] => (sel === "both" ? ["a", "b"] : [sel]);
  const vNorm = (a: Arm) => qToRaws(VCAL, manual.current[a]).map((rw, i) => rawToNorm(VCAL, i, rw));
  const getNorm = (a: Arm) => hub.getNorm(slotOf(a)) ?? vNorm(a);

  const captureImages = useCallback((): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(camRefs.current)) {
      if (!v || !streams.current[k] || v.videoWidth === 0) continue;
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 240;
      c.getContext("2d")?.drawImage(v, 0, 0, 320, 240);
      out[k] = c.toDataURL("image/jpeg", 0.7).split(",")[1];
    }
    return out;
  }, []);

  const startPolicy = () => {
    if (runner.current?.running) return;
    const arms = armList(pol.arms);
    const live = arms.filter((a) => hub.isLive(a));
    if (live.length === 0) addLog("No live follower (connect + Torque ON) — policy drives the VIRTUAL arm in the twin.");
    const rr: RunState = { mode: "policy", target: live.length ? "hardware" : "sim", instruction: pol.task, scenarioId: "", modelName: pol.path || pol.endpoint };
    runner.current = new PolicyRunner(
      { endpoint: pol.endpoint, task: pol.task, fps: pol.fps, prefetch: pol.prefetch, arms: pol.arms },
      {
        state: () => arms.flatMap((a) => getNorm(a)),
        images: captureImages,
        apply: (act) =>
          arms.forEach((a, k) => {
            const n = act.slice(k * 6, k * 6 + 6);
            if (n.length < 6) return;
            if (hub.isLive(a)) hub.commandNorm(a, n);
            else if (!hub.slots[slotOf(a)].connected) manual.current[a] = rawsToQ(VCAL, n.map((v, i) => normToRaw(VCAL, i, v)));
          }),
        onLog: addLog,
      },
    );
    setRun(rr);
    runRef.current = rr;
    runner.current.start();
    const t = setInterval(() => {
      if (!runner.current?.running) return clearInterval(t);
      setPolStats({ ...runner.current.stats });
    }, 300);
  };
  const stopPolicy = useCallback(() => {
    const rn = runner.current;
    if (!rn) return;
    const st = { ...rn.stats };
    const was = rn.running;
    rn.stop();
    runner.current = null;
    const r = runRef.current;
    if (was && r.mode === "policy") {
      logRun(r, "stopped", { steps: st.steps, avgLatencyMs: Math.round(st.latencyMs), errors: st.errors });
      setRun({ ...r, mode: "idle" });
      runRef.current = { ...r, mode: "idle" };
    }
  }, [logRun]);

  /* ---------------- skill runner ---------------- */
  const stopAll = useCallback(() => {
    stopPolicy();
    if (runRef.current.mode === "skill") finishSkill("stopped");
  }, [stopPolicy, finishSkill]);

  useEffect(() => {
    hub.onEstop.push(() => {
      stopAll();
      addLog("⛔ E-STOP — torque disabled on all connected arms");
    });
    return () => {
      hub.onEstop.length = 0;
    };
  }, [stopAll, addLog]);

  const goHome = async (arms: Arm[]) => {
    for (let i = 0; i < 60; i++) {
      let ok = true;
      for (const a of arms) {
        if (!hub.isLive(a)) continue;
        hub.commandQ(a, REST_Q);
        const q = hub.getQ(slotOf(a));
        if (!q || q.slice(0, 4).some((v, j) => Math.abs(v - REST_Q[j]) > 10)) ok = false;
      }
      if (ok) return true;
      await sleep(100);
    }
    return false;
  };

  const runSkill = async (instr = instruction) => {
    if (runRef.current.mode !== "idle") return;
    const arms: Arm[] = scn.arms === 2 ? ["a", "b"] : ["a"];
    if (target === "hardware") {
      const missing = arms.filter((a) => !hub.isLive(a));
      if (missing.length) return addLog(`Hardware run needs follower ${missing.map((m) => m.toUpperCase()).join(" & ")} connected with Torque ON.`);
      const unal = arms.filter((a) => !hub.slots[slotOf(a)].cal.aligned);
      if (unal.length) addLog(`⚠ Follower ${unal.join(",").toUpperCase()} is not aligned to the sim — motion may not match. Use Calibration → “Align sim to this pose”.`);
      addLog("Moving arms to the rest pose first…");
      if (!(await goHome(arms))) return addLog("Could not reach the rest pose — check alignment/calibration. Aborted.");
    }
    const model = target === "sim" ? MODEL_BY_ID[simModel] : MODEL_BY_ID.scripted;
    const profile = target === "sim" ? profileFor(model, scn) : IDEAL_PROFILE;
    const s = sim.current!;
    s.load(scn, profile);
    s.loop = false;
    s.speed = 1;
    s.paused = false;
    const rr: RunState = { mode: "skill", target, instruction: instr, scenarioId: scn.id, modelName: model.name };
    setRun(rr);
    runRef.current = rr;
    addLog(`▶ ${scn.emoji} ${scn.title} on ${target === "hardware" ? "REAL arms" : "simulation"} · ${model.name}`);
  };

  /* ---------------- instruction planning ---------------- */
  const interpret = async () => {
    const local = routeInstruction(instruction);
    if (local.scenario) setSid(local.scenario.id);
    setPlan({ via: "keyword-router", reason: local.scenario ? `matched “${local.scenario.title}”` : "no match — pick a skill below", alternatives: local.alternatives.map((x) => x.id) });
    try {
      const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: instruction }) });
      const j = (await r.json()) as { scenarioId: string | null; via: string; reason: string; alternatives: string[] };
      if (j.scenarioId && SCENARIO_BY_ID[j.scenarioId]) setSid(j.scenarioId);
      setPlan({ via: j.via, reason: j.reason, alternatives: j.alternatives });
    } catch {
      /* keep local plan */
    }
  };
  const listen = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) return addLog("Speech recognition not supported in this browser (use Chrome).");
    const rec = new C();
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setInstruction(t);
      addLog(`🎤 “${t}”`);
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  /* ---------------- manual control ---------------- */
  const applyManual = (arm: Arm, q: number[]) => {
    manual.current[arm] = q;
    if (hub.isLive(arm)) hub.commandQ(arm, q);
    force((n) => n + 1);
  };
  const currentQ = (arm: Arm) => {
    if (hub.isLive(arm) && !synced.current[arm]) {
      const q = hub.getQ(slotOf(arm));
      if (q) manual.current[arm] = q;
      synced.current[arm] = true;
    }
    return manual.current[arm];
  };
  const jog = useCallback((arm: Arm, d: [number, number, number], dRoll = 0, dGrip = 0) => {
    if (runRef.current.mode !== "idle") return;
    const q0 = currentQ(arm);
    const p = qToPose(q0);
    const t = tcpWorld(BASE[arm], p);
    const tgt: [number, number, number] = [t[0] + d[0], Math.max(0.8, t[1] + d[1]), t[2] + d[2]];
    const r = ik(BASE[arm], tgt, p.a3 * R2D, p.roll + dRoll * D2R, Math.min(1, Math.max(0, p.grip + dGrip)));
    if (!r.ok && (d[0] || d[1] || d[2])) return;
    applyManual(arm, poseToQ(r.pose));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        void hub.emergencyStop();
        return;
      }
      const k = e.key.toLowerCase();
      const st = 0.7;
      const m: Record<string, () => void> = {
        w: () => jog(jogArm, [0, 0, st]),
        s: () => jog(jogArm, [0, 0, -st]),
        a: () => jog(jogArm, [-st, 0, 0]),
        d: () => jog(jogArm, [st, 0, 0]),
        q: () => jog(jogArm, [0, st, 0]),
        e: () => jog(jogArm, [0, -st, 0]),
        z: () => jog(jogArm, [0, 0, 0], 0, 0.06),
        x: () => jog(jogArm, [0, 0, 0], 0, -0.06),
        r: () => jog(jogArm, [0, 0, 0], 6),
        f: () => jog(jogArm, [0, 0, 0], -6),
      };
      if (m[k]) {
        e.preventDefault();
        m[k]();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jog, jogArm]);

  /* ---------------- cameras ---------------- */
  const refreshCams = async () => {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach((t) => t.stop());
      const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      setCams((c) => ({ ...c, devices: devs, sel: { front: c.sel.front || devs[0]?.deviceId || "", wrist: c.sel.wrist || devs[1]?.deviceId || "" } }));
    } catch (e) {
      addLog("Camera access failed: " + (e instanceof Error ? e.message : String(e)));
    }
  };
  const toggleCam = async (key: string) => {
    if (streams.current[key]) {
      streams.current[key].getTracks().forEach((t) => t.stop());
      delete streams.current[key];
      setCams((c) => ({ ...c, active: { ...c.active, [key]: false } }));
      return;
    }
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { deviceId: cams.sel[key] ? { exact: cams.sel[key] } : undefined, width: 640, height: 480 } });
      streams.current[key] = st;
      setCams((c) => ({ ...c, active: { ...c.active, [key]: true } }));
      setTimeout(() => {
        const v = camRefs.current[key];
        if (v) {
          v.srcObject = st;
          void v.play();
        }
      }, 50);
    } catch (e) {
      addLog("Camera error: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  /* ---------------- registry / recordings / history ---------------- */
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [recs, setRecs] = useState<RecRow[]>([]);
  const loadLists = useCallback(async () => {
    try {
      const [m, r, c] = await Promise.all([fetch("/api/models").then((x) => x.json()), fetch("/api/runs").then((x) => x.json()), fetch("/api/recordings").then((x) => x.json())]);
      setRegModels(m.models ?? []);
      setRuns(r.runs ?? []);
      setRecs(c.recordings ?? []);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    void loadLists();
  }, [loadLists, tab, run.mode]);

  const useRegistered = (m: RegModel) => {
    setPol((p) => ({ ...p, endpoint: m.source === "http" ? m.location : m.endpoint, path: m.source === "http" ? "" : m.location, type: m.family, task: m.instruction || p.task }));
    addLog(`Selected registered model “${m.name}”`);
  };

  const [recArm, setRecArm] = useState<Arm>("a");
  const [recName, setRecName] = useState("my-skill");
  const [recording, setRecording] = useState(false);
  const frames = useRef<number[][]>([]);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recCount, setRecCount] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const startRec = () => {
    frames.current = [];
    setRecording(true);
    recTimer.current = setInterval(() => {
      frames.current.push(getNorm(recArm).map((v) => Math.round(v * 100) / 100));
      setRecCount(frames.current.length);
      if (frames.current.length >= 9000) stopRec();
    }, 33);
  };
  const stopRec = () => {
    if (recTimer.current) clearInterval(recTimer.current);
    setRecording(false);
    addLog(`Recorded ${frames.current.length} frames from arm ${recArm.toUpperCase()}`);
  };
  const replay = (fr: number[][], arm: Arm, fps = 30) => {
    if (replaying) return;
    setReplaying(true);
    let i = 0;
    const t = setInterval(() => {
      if (i >= fr.length || hub.estop) {
        clearInterval(t);
        setReplaying(false);
        return;
      }
      if (hub.isLive(arm)) hub.commandNorm(arm, fr[i]);
      else if (!hub.slots[slotOf(arm)].connected) manual.current[arm] = rawsToQ(VCAL, fr[i].map((v, j) => normToRaw(VCAL, j, v)));
      i++;
    }, 1000 / fps);
  };
  const saveRec = async () => {
    const r = await fetch("/api/recordings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: recName, arm: recArm, fps: 30, frames: frames.current }) });
    addLog(r.ok ? `Saved recording “${recName}”` : "Save failed");
    void loadLists();
  };

  /* ---------------- derived ---------------- */
  const anyLive = h.isLive("a") || h.isLive("b");
  const needSensors = useMemo(() => scn.sensors, [scn]);
  const selectedReg = regModels.find((m) => (m.source === "http" ? m.location : m.endpoint) === pol.endpoint && (m.source === "http" || m.location === pol.path));

  return (
    <div className="mx-auto grid max-w-[1700px] gap-3 p-3 xl:grid-cols-[360px_minmax(0,1fr)_420px]">
      {/* ================= left: hardware ================= */}
      <div className="space-y-3">
        <div className="card flex items-center gap-3 p-3">
          <button className="btn btn-danger !px-4 !py-2.5 !text-base" onClick={() => void hub.emergencyStop()}>
            ⛔ E-STOP (Space)
          </button>
          {h.estop && (
            <button className="btn" onClick={() => hub.clearEstop()}>
              Release
            </button>
          )}
          <div className="text-xs text-slate-400">{h.estop ? "E-stop active — torque disabled." : anyLive ? "Arms live." : "No live arms."}</div>
        </div>
        <ArmPanel id="followerA" title="Follower A (orange)" />
        <ArmPanel id="leaderA" title="Leader A" />
        <ArmPanel id="followerB" title="Follower B (blue)" />
        <ArmPanel id="leaderB" title="Leader B" />
        <div className="card space-y-2 p-3 text-xs">
          <div className="text-sm font-semibold">Safety limits</div>
          <label className="block">
            Max joint speed: <b>{h.limits.speed}</b> ticks/s (~{Math.round((h.limits.speed * 360) / 4096)}°/s)
            <input className="w-full" type="range" min={200} max={3000} step={100} value={h.limits.speed} onChange={(e) => (hub.limits.speed = +e.target.value)} />
          </label>
          <label className="block">
            Torque limit: <b>{h.limits.torque}</b>/1000
            <input className="w-full" type="range" min={100} max={1000} step={50} value={h.limits.torque} onChange={(e) => (hub.limits.torque = +e.target.value)} />
          </label>
          <button className="btn" onClick={() => void hub.applyLimits()}>
            Apply to connected followers
          </button>
          <p className="text-slate-500">Commands are also clamped to the calibrated joint ranges and rate-limited. Start slow.</p>
        </div>
      </div>

      {/* ================= centre: twin + manual ================= */}
      <div className="space-y-3">
        <div className="card relative h-[520px] overflow-hidden xl:h-[560px]">
          <SimView sim={sim.current} rev={sid} override={override} className="absolute inset-0" />
          <div className="pointer-events-none absolute left-3 top-3 space-y-1.5">
            <div className="rounded-xl bg-slate-950/80 px-3 py-2 backdrop-blur">
              <div className="font-bold">Digital twin</div>
              <div className="text-xs text-slate-400">
                A: {h.slots.followerA.connected ? "hardware" : "virtual"} · B: {h.slots.followerB.connected ? "hardware" : "virtual"} · {run.mode === "idle" ? "idle" : `${run.mode} on ${run.target}`}
              </div>
            </div>
            {sim.current.sayT > 0 && <div className="max-w-sm rounded-xl border border-[#ff7a1a]/50 bg-slate-950/85 px-3 py-2 text-sm">{sim.current.say}</div>}
          </div>
          <div className="absolute bottom-3 right-3 rounded-lg bg-slate-950/80 px-2 py-1 text-[11px] text-slate-400">scene: {scn.emoji} {scn.title} — place real props like this</div>
        </div>

        <div className="card p-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="font-semibold">Manual & teleop</div>
            <div className="flex gap-1">
              {(["a", "b"] as Arm[]).map((a) => (
                <button key={a} onClick={() => setJogArm(a)} className={`btn ${jogArm === a ? "btn-primary" : ""}`}>
                  Arm {a.toUpperCase()}
                </button>
              ))}
            </div>
            {(["a", "b"] as Arm[]).map((a) => (
              <label key={a} className="flex items-center gap-1 text-xs">
                <input type="checkbox" disabled={!(h.slots[a === "a" ? "leaderA" : "leaderB"].connected && h.isLive(a))} checked={h.teleop[a]} onChange={(e) => hub.setTeleop(a, e.target.checked)} />
                Mirror leader {a.toUpperCase()} → follower {a.toUpperCase()}
              </label>
            ))}
            <button className="btn" onClick={() => applyManual(jogArm, [...REST_Q])} disabled={run.mode !== "idle"}>
              Home
            </button>
          </div>
          <div className="mt-3 grid gap-x-4 gap-y-1 md:grid-cols-2">
            {JOINT_RANGE.map(([name, mn, mx], i) => {
              const q = currentQ(jogArm);
              return (
                <label key={name} className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-slate-400">{name}</span>
                  <input
                    className="flex-1"
                    type="range"
                    min={mn}
                    max={mx}
                    step={i === 5 ? 0.01 : 1}
                    disabled={run.mode !== "idle" || (h.slots[slotOf(jogArm)].connected && !h.isLive(jogArm))}
                    value={q[i]}
                    onChange={(e) => {
                      const nq = [...currentQ(jogArm)];
                      nq[i] = +e.target.value;
                      applyManual(jogArm, nq);
                    }}
                  />
                  <span className="w-12 text-right tabular-nums">{i === 5 ? q[i].toFixed(2) : q[i].toFixed(0) + "°"}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400">Jog (1 cm):</span>
            {([["◀ x", [-1, 0, 0]], ["x ▶", [1, 0, 0]], ["▲ up", [0, 1, 0]], ["▼ down", [0, -1, 0]], ["⬆ fwd", [0, 0, 1]], ["⬇ back", [0, 0, -1]]] as [string, [number, number, number]][]).map(([l, d]) => (
              <button key={l} className="btn !py-1" onClick={() => jog(jogArm, d)}>
                {l}
              </button>
            ))}
            <span className="ml-2 text-slate-500">Keys: W/S fwd/back · A/D left/right · Q/E up/down · Z/X grip · R/F roll · Space = E-stop</span>
          </div>
        </div>

        <div className="card p-3">
          <div className="mb-1 text-sm font-semibold">Activity log</div>
          <div className="scroll-thin h-36 overflow-y-auto font-mono text-[11px] leading-5 text-slate-300">
            {log.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= right: task / model / record / history ================= */}
      <div className="card flex min-h-[600px] flex-col overflow-hidden">
        <div className="flex border-b border-slate-800 text-sm">
          {(["task", "model", "record", "history"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 px-3 py-2.5 capitalize ${tab === t ? "border-b-2 border-[#ff7a1a] text-white" : "text-slate-400 hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-3 text-sm">
          {tab === "task" && (
            <>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Instruction</div>
                <textarea className="input h-20" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="e.g. Play a drum groove / Plug in the charger…" />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button className="btn btn-primary" onClick={interpret}>
                    Interpret
                  </button>
                  <button className="btn" onClick={listen}>
                    {listening ? "🎙 listening…" : "🎤 Voice"}
                  </button>
                </div>
                {plan && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    → <b className="text-slate-200">{scn.title}</b> via {plan.via} ({plan.reason})
                    {plan.alternatives.length > 0 && (
                      <>
                        {" "}· also:{" "}
                        {plan.alternatives.map((a) => (
                          <button key={a} className="underline" onClick={() => setSid(a)}>
                            {SCENARIO_BY_ID[a]?.title}{" "}
                          </button>
                        ))}
                      </>
                    )}
                  </p>
                )}
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Skill</div>
                <select className="input" value={sid} onChange={(e) => setSid(e.target.value)}>
                  {SCENARIOS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.emoji} {s.title} — {s.category}
                    </option>
                  ))}
                </select>
                <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 text-xs text-slate-300">
                  <div>{scn.story}</div>
                  <div className="mt-1.5 text-slate-400">Needs: {scn.arms === 2 ? "both arms" : "arm A"}</div>
                  <div className="mt-1 text-amber-200/90">Sensors / props: {needSensors.join(" · ")}</div>
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Execute on</div>
                <div className="flex gap-1.5">
                  <button className={`btn flex-1 justify-center ${target === "sim" ? "btn-primary" : ""}`} onClick={() => setTarget("sim")}>
                    Simulation
                  </button>
                  <button className={`btn flex-1 justify-center ${target === "hardware" ? "btn-primary" : ""}`} onClick={() => setTarget("hardware")}>
                    Real arms
                  </button>
                </div>
                {target === "sim" ? (
                  <label className="mt-2 block text-xs text-slate-400">
                    Emulated model (changes lag, jitter, misses)
                    <select className="input mt-1" value={simModel} onChange={(e) => setSimModel(e.target.value)}>
                      {ACTING_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">Runs the scripted IK skill on the real followers (needs calibration + alignment + props placed like the twin). Learned models: use the “model” tab.</p>
                )}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary flex-1 justify-center !py-2.5" disabled={run.mode !== "idle"} onClick={() => void runSkill()}>
                  ▶ Run
                </button>
                <button className="btn flex-1 justify-center !py-2.5" disabled={run.mode === "idle"} onClick={stopAll}>
                  ■ Stop
                </button>
              </div>
            </>
          )}

          {tab === "model" && (
            <>
              <p className="text-xs text-slate-400">
                The browser streams <b>camera frames + joint state</b> to a model server and executes the returned <b>action chunks</b> at {pol.fps} Hz. Any server implementing <code className="inline">POST /predict</code> works (see <code className="inline">bridge/README.md</code>).
              </p>
              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400">
                  Registered models
                  <select className="input mt-1" value={selectedReg?.id ?? ""} onChange={(e) => { const m = regModels.find((x) => x.id === +e.target.value); if (m) useRegistered(m); }}>
                    <option value="">— choose (register more in Model hub) —</option>
                    {regModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.family})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-slate-400">
                  Server endpoint
                  <input className="input mt-1" value={pol.endpoint} onChange={(e) => setPol({ ...pol, endpoint: e.target.value })} />
                </label>
                <div className="flex gap-1.5">
                  <button className="btn" onClick={() => setPol({ ...pol, endpoint: "demo://loopback" })}>
                    Demo loopback
                  </button>
                  <button className="btn" onClick={() => setPol({ ...pol, endpoint: "http://localhost:8787" })}>
                    localhost:8787
                  </button>
                  <button className="btn" onClick={async () => { const r = await policyHealth(pol.endpoint); setPolInfo(r.ok ? JSON.stringify(r.info) : "unreachable: " + r.error); }}>
                    Health
                  </button>
                </div>
                {polInfo && <pre className="code whitespace-pre-wrap break-all text-[11px]">{polInfo}</pre>}
                <div className="grid grid-cols-[1fr_110px] gap-1.5">
                  <input className="input" placeholder="HF repo id or checkpoint path (on the server)" value={pol.path} onChange={(e) => setPol({ ...pol, path: e.target.value })} />
                  <select className="input" value={pol.type} onChange={(e) => setPol({ ...pol, type: e.target.value })}>
                    {["act", "diffusion", "smolvla", "pi0", "pi05", "groot", "molmoact2", "custom"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <button className="btn" disabled={!pol.path} onClick={async () => { const r = await loadPolicyOnServer(pol.endpoint, { path: pol.path, type: pol.type, device: pol.device }); setPolInfo(r.message); addLog(`load on server: ${r.ok ? "ok" : "failed"}`); }}>
                  Load model on server
                </button>
                <label className="block text-xs text-slate-400">
                  Task / language instruction
                  <input className="input mt-1" value={pol.task} onChange={(e) => setPol({ ...pol, task: e.target.value })} />
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs text-slate-400">
                  <label>
                    Arms
                    <select className="input mt-1" value={pol.arms} onChange={(e) => setPol({ ...pol, arms: e.target.value as ArmSel })}>
                      <option value="a">A</option>
                      <option value="b">B</option>
                      <option value="both">A + B (12-D)</option>
                    </select>
                  </label>
                  <label>
                    FPS
                    <input className="input mt-1" type="number" value={pol.fps} onChange={(e) => setPol({ ...pol, fps: Math.max(5, Math.min(60, +e.target.value)) })} />
                  </label>
                  <label>
                    Prefetch
                    <input className="input mt-1" type="number" value={pol.prefetch} onChange={(e) => setPol({ ...pol, prefetch: Math.max(0, +e.target.value) })} />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary flex-1 justify-center !py-2" disabled={run.mode !== "idle"} onClick={startPolicy}>
                    ▶ Start policy
                  </button>
                  <button className="btn flex-1 justify-center !py-2" disabled={run.mode !== "policy"} onClick={stopAll}>
                    ■ Stop
                  </button>
                </div>
                {polStats && (
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-950/60 p-2 text-[11px]">
                    <span>latency {polStats.latencyMs.toFixed(0)} ms</span>
                    <span>queue {polStats.queue}</span>
                    <span>steps {polStats.steps}</span>
                    <span>requests {polStats.requests}</span>
                    <span className={polStats.errors ? "text-red-300" : ""}>errors {polStats.errors}</span>
                    <span className="col-span-3 truncate text-red-300">{polStats.lastError}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cameras (sent to the model)</div>
                  <button className="btn !py-0.5 text-xs" onClick={refreshCams}>
                    Detect
                  </button>
                </div>
                {["front", "wrist"].map((k) => (
                  <div key={k} className="mb-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="w-10 text-slate-400">{k}</span>
                      <select className="input" value={cams.sel[k]} onChange={(e) => setCams((c) => ({ ...c, sel: { ...c.sel, [k]: e.target.value } }))}>
                        <option value="">default</option>
                        {cams.devices.map((d) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || d.deviceId.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                      <button className="btn !py-0.5" onClick={() => void toggleCam(k)}>
                        {cams.active[k] ? "Stop" : "Start"}
                      </button>
                    </div>
                    {cams.active[k] && (
                      <video
                        ref={(el) => {
                          camRefs.current[k] = el;
                        }}
                        className="mt-1 w-full rounded-lg"
                        muted
                        playsInline
                      />
                    )}
                  </div>
                ))}
                <p className="text-[11px] text-slate-500">Camera keys sent: <code className="inline">front</code>, <code className="inline">wrist</code> → map to your policy’s <code className="inline">observation.images.*</code>.</p>
              </div>
            </>
          )}

          {tab === "record" && (
            <>
              <p className="text-xs text-slate-400">Record the follower’s joint trajectory (LeRobot-normalised) while you teleoperate with the leader, jog keys or sliders. Replay it, save it as a reusable skill, or export it.</p>
              <div className="grid grid-cols-[90px_1fr] gap-1.5">
                <select className="input" value={recArm} onChange={(e) => setRecArm(e.target.value as Arm)}>
                  <option value="a">Arm A</option>
                  <option value="b">Arm B</option>
                </select>
                <input className="input" value={recName} onChange={(e) => setRecName(e.target.value)} />
              </div>
              <div className="flex gap-1.5">
                {!recording ? (
                  <button className="btn btn-primary" onClick={startRec}>
                    ● Record
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={stopRec}>
                    ■ Stop ({recCount})
                  </button>
                )}
                <button className="btn" disabled={recording || frames.current.length === 0 || replaying} onClick={() => replay(frames.current, recArm)}>
                  ▶ Replay
                </button>
                <button className="btn" disabled={recording || frames.current.length === 0} onClick={() => void saveRec()}>
                  Save
                </button>
                <button
                  className="btn"
                  disabled={recording || frames.current.length === 0}
                  onClick={() => {
                    const url = URL.createObjectURL(new Blob([JSON.stringify({ name: recName, arm: recArm, fps: 30, joints: ["shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper"], frames: frames.current })], { type: "application/json" }));
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${recName}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export
                </button>
              </div>
              <div className="space-y-1">
                {recs.length === 0 && <p className="text-xs text-slate-500">No saved recordings yet.</p>}
                {recs.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-800 p-2 text-xs">
                    <div className="flex-1">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-slate-500">arm {r.arm.toUpperCase()} · {r.frames} frames</div>
                    </div>
                    <button className="btn !py-0.5" onClick={async () => { const j = await fetch(`/api/recordings?id=${r.id}`).then((x) => x.json()); if (j.recording) replay(j.recording.frames, jogArm, j.recording.fps); }}>
                      Replay on {jogArm.toUpperCase()}
                    </button>
                    <button className="btn !py-0.5" onClick={async () => { await fetch(`/api/recordings?id=${r.id}`, { method: "DELETE" }); void loadLists(); }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "history" && (
            <div className="space-y-1.5">
              {runs.length === 0 && <p className="text-xs text-slate-500">No runs logged yet. Every skill / policy run is stored in the database.</p>}
              {runs.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-800 p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">{SCENARIO_BY_ID[r.scenarioId]?.emoji ?? "🧠"} {r.instruction}</span>
                    <span className={r.outcome === "completed" ? "text-emerald-300" : "text-amber-300"}>{r.outcome}</span>
                  </div>
                  <div className="text-slate-500">{r.modelName} · {r.mode} · {new Date(r.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-slate-800 p-2 text-[11px] text-slate-500">
          {MODELS.length} models cataloged · hardware path: Web Serial → Feetech STS3215 · policy path: HTTP → your model server
        </div>
      </div>
    </div>
  );
}

interface SpeechRec {
  lang: string;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null;
  onend: (() => void) | null;
  start(): void;
}
