"use client";

import { useEffect, useRef, useState } from "react";
import { Aborted } from "@/lib/arm";
import { JOINTS, ARM_JOINTS, jointLimits, type JointName } from "@/lib/kinematics";
import { ArmView } from "./ArmView";
import { useRoom } from "./RoomProvider";
import { Badge, Btn, Card, Num } from "./ui";

export function ManualTab() {
  const { follower, leader, fState, lState, data, update, setTorque, estop, log, teleop, setTeleop, recording, startRecording, stopRecording, replay, running, stopMission, trail } = useRoom();
  const [step, setStep] = useState(1);
  const [xyz, setXyz] = useState({ x: 16, y: 0, z: 6 });
  const [recName, setRecName] = useState("demo-1");
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const jogBusy = useRef(false);

  if (!follower) {
    return (
      <Card title="Manual control">
        <p className="text-sm text-slate-400">Connect the follower arm (real or virtual) in the Connect tab first.</p>
      </Card>
    );
  }
  const arm = follower.arm;
  const lim = jointLimits(data.calFollower);
  const torque = !!fState?.torque;
  /** Manual commands are locked while a script / replay owns the arm (two writers would fight). */
  const can = torque && !running;
  const tip = arm.tip(fState);
  const pose = fState ? { pan: fState.deg.shoulder_pan, lift: fState.deg.shoulder_lift, elbow: fState.deg.elbow_flex, wrist: fState.deg.wrist_flex } : null;

  const safe = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      if (!(e instanceof Aborted)) log(e instanceof Error ? e.message : String(e), "error");
    }
  };

  const setJoint = (j: JointName, v: number) => {
    if (!can) return;
    const cur = arm.currentTarget(j);
    const max = j === "gripper" ? 40 : 15;
    void safe(() => arm.setGoals({ [j]: cur + Math.max(-max, Math.min(max, v - cur)) }));
  };

  const jog = (dx: number, dy: number, dz: number) =>
    safe(async () => {
      if (!tip) return;
      await arm.moveTip([tip.tip[0] + dx, tip.tip[1] + dy, tip.tip[2] - data.tableZ + dz], { pitch: tip.pitch, ms: 350 });
    });

  keyRef.current = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    if (!can || e.ctrlKey || e.metaKey || e.altKey || (el && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName))) return;
    const map: Record<string, [number, number, number]> = {
      ArrowUp: [step, 0, 0], ArrowDown: [-step, 0, 0], ArrowLeft: [0, step, 0], ArrowRight: [0, -step, 0],
      w: [0, 0, step], s: [0, 0, -step], PageUp: [0, 0, step], PageDown: [0, 0, -step],
    };
    const d = map[e.key];
    if (d) {
      e.preventDefault();
      if (jogBusy.current) return;
      jogBusy.current = true;
      void jog(d[0], d[1], d[2]).finally(() => { jogBusy.current = false; });
    } else if (e.key === "o" || e.key === "c") {
      void safe(() => arm.setGripper(e.key === "o" ? 100 : 0));
    }
  };

  const leaderSession = leader;
  const leaderLim = jointLimits(data.calLeader);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Card title="Live view" right={<div className="flex items-center gap-2">{running && <Badge tone="cyan">busy: {running}</Badge>}<Badge tone={torque ? "green" : "amber"}>{torque ? "torque ON" : "torque OFF"}</Badge></div>}>
          <ArmView pose={pose} geometry={data.calFollower.geometry} gripperPct={fState?.gripperPct} world={follower.world} trail={trail} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn kind="ok" disabled={torque} onClick={() => setTorque(true)}>Torque ON</Btn>
            <Btn kind="warn" disabled={!torque} onClick={() => setTorque(false)}>Torque OFF</Btn>
            <Btn kind="danger" onClick={estop}>E-STOP</Btn>
            {running && <Btn onClick={stopMission}>Stop task</Btn>}
            <Btn disabled={!can} onClick={() => safe(() => arm.moveTip([14, 0, 12], { pitch: -60, ms: 1500 }))}>Ready pose</Btn>
            <Btn disabled={!can} onClick={() => safe(() => arm.moveTo({ shoulder_pan: 0, shoulder_lift: 0, elbow_flex: 90, wrist_flex: 0, wrist_roll: 0 }, 1500))}>L pose</Btn>
          </div>
        </Card>

        <Card title="Joints">
          <div className="space-y-2">
            {JOINTS.map((j) => {
              const isG = j === "gripper";
              const v = fState ? (isG ? fState.gripperPct : fState.deg[j]) : 0;
              const [lo, hi] = isG ? [0, 100] : lim[j];
              return (
                <div key={j} className="flex items-center gap-3 text-xs">
                  <span className="w-28 text-slate-400">{j}</span>
                  <input type="range" min={Math.floor(lo)} max={Math.ceil(hi)} step={0.5} value={Math.min(hi, Math.max(lo, arm.currentTarget(j) ?? v))} disabled={!can} onChange={(e) => setJoint(j, Number(e.target.value))} className="flex-1 accent-cyan-400" />
                  <span className="w-16 text-right font-mono text-slate-300">{v.toFixed(1)}{isG ? "%" : "°"}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Btn small disabled={!can} onClick={() => safe(() => arm.setGripper(100))}>Open</Btn>
            <Btn small disabled={!can} onClick={() => safe(() => arm.setGripper(0))}>Close</Btn>
            <Btn small disabled={!can} onClick={() => safe(async () => { const g = await arm.grasp(); log(`grasp: ${g.reason} (gap ${g.gapPct.toFixed(0)}%, load ${g.load}‰)`, g.holding ? "ok" : "warn"); })}>Grasp (stall-detect)</Btn>
            <Num label="Max speed °/s" w="w-20" value={data.maxDegPerS} onChange={(v) => update({ maxDegPerS: Math.max(10, Math.min(200, v)) })} />
          </div>
        </Card>

        <Card title="Cartesian jog (inverse kinematics)">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">Step
                {[0.5, 1, 2, 5].map((s) => <Btn key={s} small kind={step === s ? "primary" : "ghost"} onClick={() => setStep(s)}>{s} cm</Btn>)}
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <Btn small disabled={!can} onClick={() => jog(0, step, 0)}>Y+ left</Btn>
                <Btn small disabled={!can} onClick={() => jog(step, 0, 0)}>X+ fwd</Btn>
                <Btn small disabled={!can} onClick={() => jog(0, 0, step)}>Z+ up</Btn>
                <Btn small disabled={!can} onClick={() => jog(0, -step, 0)}>Y− right</Btn>
                <Btn small disabled={!can} onClick={() => jog(-step, 0, 0)}>X− back</Btn>
                <Btn small disabled={!can} onClick={() => jog(0, 0, -step)}>Z− down</Btn>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Keyboard: ←/→ = Y, ↑/↓ = X, W/S or PgUp/PgDn = Z, O/C = open/close gripper.</p>
              <p className="mt-2 font-mono text-xs text-slate-400">tip: {tip ? tip.tip.map((v) => v.toFixed(1)).join(", ") : "-"} cm</p>
            </div>
            <div>
              <div className="flex gap-2">
                <Num label="X" value={xyz.x} step={0.5} onChange={(x) => setXyz({ ...xyz, x })} />
                <Num label="Y" value={xyz.y} step={0.5} onChange={(y) => setXyz({ ...xyz, y })} />
                <Num label="Z" value={xyz.z} step={0.5} onChange={(z) => setXyz({ ...xyz, z })} />
              </div>
              <div className="mt-2 flex gap-2">
                <Btn small disabled={!can} kind="primary" onClick={() => safe(() => arm.moveTip([xyz.x, xyz.y, xyz.z], { ms: 1200 }))}>Go to (top-down)</Btn>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Leader–follower teleop" right={<Badge tone={teleop ? "green" : "slate"}>{teleop ? "live" : "off"}</Badge>}>
          {!leaderSession ? (
            <p className="text-xs text-slate-400">Connect a leader arm (second SO-101) in the Connect tab. Both arms must be calibrated with the same L-pose procedure.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Btn kind={teleop ? "warn" : "primary"} onClick={() => setTeleop(!teleop)}>{teleop ? "Stop teleop" : "Start teleop"}</Btn>
              </div>
              <p className="text-xs text-slate-500">The follower first eases to the leader pose (2 s), then follows with slew-rate limits.</p>
              {leaderSession.kind === "sim" && (
                <div className="space-y-1 border-t border-slate-800 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">Virtual leader sliders
                    <Btn small onClick={() => safe(() => leaderSession.arm.setTorque(true))}>enable</Btn></div>
                  {JOINTS.map((j) => {
                    const [lo, hi] = j === "gripper" ? [0, 100] : leaderLim[j];
                    return (
                      <div key={j} className="flex items-center gap-2 text-[11px]">
                        <span className="w-24 text-slate-500">{j}</span>
                        <input type="range" min={Math.floor(lo)} max={Math.ceil(hi)} defaultValue={j === "elbow_flex" ? 90 : 0} className="flex-1 accent-violet-400" onChange={(e) => void safe(() => leaderSession.arm.setGoals({ [j]: Number(e.target.value) }))} />
                      </div>
                    );
                  })}
                </div>
              )}
              {lState && <p className="font-mono text-[11px] text-slate-500">leader: {ARM_JOINTS.map((j) => lState.deg[j].toFixed(0)).join(" / ")}°</p>}
            </div>
          )}
        </Card>

        <Card title="Teach & replay recorder" right={recording ? <Badge tone="red">● recording</Badge> : undefined}>
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1 text-xs text-slate-400">Name
                <input value={recName} onChange={(e) => setRecName(e.target.value)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" />
              </label>
              {!recording ? <Btn kind="primary" onClick={startRecording}>Record</Btn> : <Btn kind="danger" onClick={() => stopRecording(recName)}>Stop &amp; save</Btn>}
            </div>
            <p className="text-xs text-slate-500">Tip: torque OFF, guide the arm by hand (support it!), or record while teleoperating.</p>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <Num label="Speed ×" step={0.25} value={speed} onChange={(v) => setSpeed(Math.max(0.25, Math.min(3, v)))} />
              <label className="flex items-center gap-1"><input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />loop</label>
            </div>
            <ul className="space-y-1">
              {data.recordings.map((r) => (
                <li key={r.name} className="flex items-center justify-between rounded border border-slate-800 px-2 py-1 text-xs">
                  <span>{r.name} <span className="text-slate-500">({r.frames.length} fr, {(r.frames[r.frames.length - 1]?.t / 1000).toFixed(1)}s)</span></span>
                  <span className="flex gap-1">
                    <Btn small disabled={!torque || !!running} onClick={() => replay(r.name, speed, loop)}>▶</Btn>
                    <Btn small onClick={() => update({ recordings: data.recordings.filter((x) => x.name !== r.name) })}>✕</Btn>
                  </span>
                </li>
              ))}
              {!data.recordings.length && <li className="text-xs text-slate-600">No recordings yet.</li>}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
