"use client";

import { useEffect, useRef, useState } from "react";
import { Aborted, sleep, type ArmState } from "@/lib/arm";
import { JOINTS, MOTOR_IDS, defaultCalibration, jointLimits, type ArmCalibration, type JointName } from "@/lib/kinematics";
import { webSerialSupported } from "@/lib/serial";
import { ArmView } from "./ArmView";
import { useRoom, type Session } from "./RoomProvider";
import { Badge, Btn, Card, Num, Steps } from "./ui";

function MotorTable({ s }: { s: ArmState | null }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-left text-slate-500">
        <tr><th>ID</th><th>Joint</th><th>Raw</th><th>Angle</th><th>Load‰</th><th>Temp</th><th>V</th><th /></tr>
      </thead>
      <tbody className="font-mono text-slate-300">
        {JOINTS.map((j, i) => (
          <tr key={j} className="border-t border-slate-800">
            <td>{MOTOR_IDS[j]}</td>
            <td className="font-sans">{j}</td>
            <td>{s ? s.raw[i] : "-"}</td>
            <td>{s ? (j === "gripper" ? `${s.gripperPct.toFixed(0)}%` : `${s.deg[j].toFixed(1)}°`) : "-"}</td>
            <td>{s ? s.load[i] : "-"}</td>
            <td className={s && s.temp[i] > 60 ? "text-rose-400" : ""}>{s ? `${s.temp[i]}°` : "-"}</td>
            <td>{s ? s.volt[i].toFixed(1) : "-"}</td>
            <td>{s ? (s.online[i] ? <span className="text-emerald-400">●</span> : <span className="text-rose-400">○</span>) : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConnectCard({ role }: { role: "follower" | "leader" }) {
  const { follower, leader, fState, lState, connect, disconnect, setTorque, estop, data } = useRoom();
  const s = role === "follower" ? follower : leader;
  const st = role === "follower" ? fState : lState;
  const serialOk = typeof navigator !== "undefined" && webSerialSupported();
  return (
    <Card
      title={role === "follower" ? "Follower arm (the one that works)" : "Leader arm (optional: teleop / demos)"}
      right={s ? <Badge tone={s.kind === "sim" ? "violet" : "green"}>{s.kind === "sim" ? "virtual" : "connected"}</Badge> : <Badge>offline</Badge>}
    >
      {!s ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Btn kind="primary" disabled={!serialOk} onClick={() => connect(role, "serial")}>Connect real arm (USB)</Btn>
            <Btn onClick={() => connect(role, "sim")}>Use virtual arm</Btn>
          </div>
          {!serialOk && <p className="text-xs text-amber-300">Web Serial is unavailable in this browser. Use desktop Chrome or Edge on localhost/https.</p>}
          <p className="text-xs text-slate-500">A browser dialog will list serial ports: pick the one for this arm (Linux: /dev/ttyACM*, macOS: tty.usbmodem*, Windows: COMx). Motors are NOT energised on connect.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-slate-300">{s.label}</div>
          <MotorTable s={st} />
          <div className="flex flex-wrap gap-2">
            {role === "follower" && (
              <>
                <Btn kind="ok" onClick={() => setTorque(true)} disabled={!!st?.torque}>Torque ON (hold pose)</Btn>
                <Btn kind="warn" onClick={() => setTorque(false)} disabled={!st?.torque}>Torque OFF</Btn>
                <Btn kind="danger" onClick={estop}>E-STOP</Btn>
              </>
            )}
            <Btn onClick={() => disconnect(role)}>Disconnect</Btn>
          </div>
          {role === "follower" && s.kind === "serial" && !data.calFollower.referenceCaptured && (
            <p className="text-xs text-amber-300">Not calibrated for kinematics yet. Go through the calibration steps below.</p>
          )}
        </div>
      )}
    </Card>
  );
}

function Calibrate({ role }: { role: "follower" | "leader" }) {
  const { follower, leader, fState, lState, data, update, log, setTorque } = useRoom();
  const s: Session | null = role === "follower" ? follower : leader;
  const st = role === "follower" ? fState : lState;
  const cal: ArmCalibration = role === "follower" ? data.calFollower : data.calLeader;
  const setCal = (c: ArmCalibration) => update(role === "follower" ? { calFollower: { ...c } } : { calLeader: { ...c } });
  const [ranging, setRanging] = useState(false);
  const rangeRef = useRef<{ min: number[]; max: number[] } | null>(null);
  const [ranges, setRanges] = useState<{ min: number[]; max: number[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ctl] = useState(() => ({ ac: null as AbortController | null }));

  useEffect(() => {
    if (!ranging || !st) return;
    if (!rangeRef.current) rangeRef.current = { min: [...st.raw], max: [...st.raw] };
    const r = rangeRef.current;
    st.raw.forEach((v, i) => {
      if (v < r.min[i]) r.min[i] = v;
      if (v > r.max[i]) r.max[i] = v;
    });
    setRanges({ min: [...r.min], max: [...r.max] });
  }, [st, ranging]);

  if (!s) return <p className="text-sm text-slate-500">Connect the {role} arm to calibrate it.</p>;
  const arm = s.arm;

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      if (!(e instanceof Aborted)) log(`Calibration step failed: ${e instanceof Error ? e.message : e}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const jog = (j: JointName, d: number) =>
    guard(async () => {
      if (!st?.torque) throw new Error("Enable torque first (Connect card)");
      await arm.moveTo({ [j]: arm.currentTarget(j) + d }, 700);
    });

  const tuneGrasp = () =>
    guard(async () => {
      if (!st?.torque) throw new Error("Enable torque first");
      ctl.ac = new AbortController();
      log("Tune grasp: closing slowly on the object between the jaws…");
      await arm.moveTo({ gripper: 90 }, 600, ctl.ac.signal);
      await sleep(500);
      let cmd = 90;
      let prev = 999;
      let still = 0;
      for (let i = 0; i < 200; i++) {
        cmd -= 1.2;
        await arm.setGoals({ gripper: cmd });
        await sleep(40);
        const x = await arm.readState();
        const gap = x.gripperPct;
        still = Math.abs(gap - prev) < 0.4 && cmd < gap - 4 ? still + 1 : 0;
        prev = gap;
        if (still >= 6) {
          const load = Math.abs(x.load[5]);
          const next = { ...data.grasp, minGapPct: Math.max(3, Math.round(gap * 0.6)), loadThreshold: Math.max(25, Math.round(load * 0.5)) };
          update({ grasp: next });
          log(`Grasp tuned: object gap ${gap.toFixed(0)}%, load ${load}‰ → min gap ${next.minGapPct}%, load threshold ${next.loadThreshold}‰`, "ok");
          await arm.setGoals({ gripper: gap + 15 });
          return;
        }
        if (cmd < -5) throw new Error("Gripper closed fully: no object was between the jaws");
      }
      throw new Error("Could not detect a stall");
    });

  const importLerobot = async (f: File | undefined) => {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text()) as Record<string, { range_min: number; range_max: number; homing_offset?: number }>;
      const next = { ...cal, joints: { ...cal.joints } };
      for (const name of JOINTS) {
        const e = j[name];
        if (!e) continue;
        next.joints[name] = { ...next.joints[name], min: e.range_min, max: e.range_max };
      }
      next.gripper = { closedRaw: j.gripper?.range_min ?? cal.gripper.closedRaw, openRaw: j.gripper?.range_max ?? cal.gripper.openRaw };
      setCal(next);
      log("Imported LeRobot calibration ranges. Still capture the L-pose reference below.", "ok");
    } catch (e) {
      log(`Import failed: ${e}`, "error");
    }
  };

  const lim = jointLimits(cal);
  const pose = st ? { pan: st.deg.shoulder_pan, lift: st.deg.shoulder_lift, elbow: st.deg.elbow_flex, wrist: st.deg.wrist_flex } : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Steps
          items={[
            <div key="1">
              <b>Homing (optional)</b>: arm posed in the <i>middle</i> of every joint&apos;s range, torque off, then write offsets so ticks never wrap at 0/4095. Skip if you already ran <code>lerobot-calibrate</code>.
              <div className="mt-1"><Btn small disabled={busy} onClick={() => guard(async () => {
                if (!window.confirm("Writes Homing_Offset to the servo EEPROM and invalidates the stored ranges, gripper and L-pose calibration (they must be redone). The arm must be in the MIDDLE of every joint's range with torque off. Continue?")) return;
                const o = await arm.writeHomingOffsets();
                const fresh = defaultCalibration();
                // every raw tick moved: keep signs + geometry, discard everything that was measured in the old tick space
                const next: ArmCalibration = { ...fresh, geometry: cal.geometry, joints: { ...fresh.joints } };
                for (const j of JOINTS) next.joints[j] = { ...fresh.joints[j], sign: cal.joints[j].sign };
                setCal(next);
                log(`Homing offsets written: ${o.join(", ")}. Ranges, gripper and L-pose reset: redo steps 2-5.`, "ok");
              })}>Write homing offsets</Btn></div>
            </div>,
            <div key="2">
              <b>Range of motion</b>: press start, then move EVERY joint slowly through its full travel by hand (torque off), then save.
              <div className="mt-1 flex flex-wrap gap-2">
                {!ranging ? (
                  <Btn small disabled={busy} onClick={async () => { await setTorque(false); rangeRef.current = null; setRanging(true); }}>Start recording</Btn>
                ) : (
                  <Btn small kind="ok" onClick={() => {
                    setRanging(false);
                    const r = rangeRef.current;
                    if (!r) return;
                    const next = { ...cal, joints: { ...cal.joints } };
                    JOINTS.forEach((j, i) => { next.joints[j] = { ...next.joints[j], min: r.min[i], max: r.max[i] }; });
                    setCal(next);
                    log("Joint ranges saved", "ok");
                  }}>Save ranges</Btn>
                )}
              </div>
              {ranges && (
                <div className="mt-1 font-mono text-[11px] text-slate-400">
                  {JOINTS.map((j, i) => <div key={j}>{j.padEnd(14)} {ranges.min[i]} … {ranges.max[i]} ({ranges.max[i] - ranges.min[i]} ticks)</div>)}
                </div>
              )}
            </div>,
            <div key="3">
              <b>Gripper</b>: close the jaws fully → capture closed; open fully → capture open.
              <div className="mt-1 flex gap-2">
                <Btn small onClick={() => st && setCal({ ...cal, gripper: { ...cal.gripper, closedRaw: st.raw[5] } })}>Capture CLOSED ({cal.gripper.closedRaw})</Btn>
                <Btn small onClick={() => st && setCal({ ...cal, gripper: { ...cal.gripper, openRaw: st.raw[5] } })}>Capture OPEN ({cal.gripper.openRaw})</Btn>
              </div>
            </div>,
            <div key="4">
              <b>L-pose reference</b>: torque off; hold <b>upper arm vertical, forearm horizontal pointing forward, gripper pointing forward, base pan straight ahead</b> (an “L” seen from the side). Capture. This anchors the kinematic model to your physical arm.
              <div className="mt-1 flex items-center gap-2">
                <Btn small disabled={busy} onClick={() => guard(async () => { await arm.captureReference(); setCal({ ...arm.cal }); log("L-pose reference captured", "ok"); })}>Capture L pose</Btn>
                {cal.referenceCaptured ? <Badge tone="green">captured</Badge> : <Badge tone="amber">required</Badge>}
              </div>
            </div>,
            <div key="5">
              <b>Direction check</b>: torque ON (support the arm), jog each joint. The <span className="text-violet-300">drawing</span> shows what the software thinks should happen. If the real arm moves the opposite way, flip the sign.
              <div className="mt-2 space-y-1">
                {JOINTS.filter((j) => j !== "gripper").map((j) => (
                  <div key={j} className="flex items-center gap-2 text-xs">
                    <span className="w-28 text-slate-400">{j}</span>
                    <Btn small disabled={busy} onClick={() => jog(j, -10)}>−10°</Btn>
                    <Btn small disabled={busy} onClick={() => jog(j, 10)}>+10°</Btn>
                    <Btn small onClick={() => { const n = { ...cal, joints: { ...cal.joints } }; n.joints[j] = { ...n.joints[j], sign: (n.joints[j].sign * -1) as 1 | -1 }; setCal(n); }}>sign {cal.joints[j].sign > 0 ? "+" : "−"} (flip)</Btn>
                    <span className="text-slate-500">{lim[j][0].toFixed(0)}…{lim[j][1].toFixed(0)}°</span>
                  </div>
                ))}
                <p className="text-[11px] text-slate-500">Convention: + lift leans forward, + elbow folds the forearm down, + wrist tips the gripper down, + pan turns left (counter-clockwise from above).</p>
                <div className="flex items-center gap-2 pt-1">
                  <Btn small kind="ok" onClick={() => setCal({ ...cal, directionsConfirmed: true })}>Directions are correct</Btn>
                  {cal.directionsConfirmed ? <Badge tone="green">confirmed</Badge> : <Badge tone="amber">required</Badge>}
                </div>
              </div>
            </div>,
            ...(role === "follower"
              ? [
                  <div key="6">
                    <b>Touch the table</b>: torque off, rest the fingertip flat on the table, press. Removes Z error from link-length / mounting tolerances.
                    <div className="mt-1 flex items-center gap-2">
                      <Btn small onClick={() => { const t = arm.tip(st); if (t) { update({ tableZ: Number(t.tip[2].toFixed(2)) }); log(`Table plane set: tip z = ${t.tip[2].toFixed(2)} cm`, "ok"); } }}>Set table height from current pose</Btn>
                      <Badge tone={data.tableZ ? "green" : "amber"}>{data.tableZ.toFixed(2)} cm</Badge>
                    </div>
                  </div>,
                  <div key="7">
                    <b>Tune grasp</b>: put one of your real objects between the open jaws, torque ON, press. The gripper closes slowly, measures where it stalls and sets thresholds (min gap {data.grasp.minGapPct}%, load {data.grasp.loadThreshold}‰).
                    <div className="mt-1"><Btn small disabled={busy} onClick={tuneGrasp}>Tune grasp on object</Btn></div>
                  </div>,
                ]
              : []),
          ]}
        />
        <div className="rounded-lg border border-slate-800 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-400">Link geometry (cm): measure your arm; defaults are SO-101 approximations</div>
          <div className="flex flex-wrap gap-3">
            {(["upperArm", "forearm", "tool", "shoulderHeight"] as const).map((k) => (
              <Num key={k} label={k} step={0.1} value={cal.geometry[k]} onChange={(v) => setCal({ ...cal, geometry: { ...cal.geometry, [k]: v } })} />
            ))}
          </div>
          <label className="mt-3 block text-xs text-slate-400">
            Import LeRobot calibration JSON (~/.cache/huggingface/lerobot/calibration/robots/so101_follower/&lt;id&gt;.json)
            <input type="file" accept=".json" onChange={(e) => importLerobot(e.target.files?.[0])} className="mt-1 block text-xs" />
          </label>
        </div>
      </div>
      <div>
        <ArmView pose={pose} geometry={cal.geometry} gripperPct={st?.gripperPct} world={s.world} />
      </div>
    </div>
  );
}

export function ConnectTab() {
  const [role, setRole] = useState<"follower" | "leader">("follower");
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ConnectCard role="follower" />
        <ConnectCard role="leader" />
      </div>
      <Card
        title="Calibrate"
        right={
          <div className="flex gap-1">
            {(["follower", "leader"] as const).map((r) => (
              <Btn key={r} small kind={role === r ? "primary" : "ghost"} onClick={() => setRole(r)}>{r}</Btn>
            ))}
          </div>
        }
      >
        <Calibrate role={role} />
      </Card>
    </div>
  );
}
