"use client";

import { useState } from "react";
import { ConnectTab } from "@/components/ConnectTab";
import { GuideTab } from "@/components/GuideTab";
import { ManualTab } from "@/components/ManualTab";
import { LogPanel, MissionsTab } from "@/components/MissionsTab";
import { ModelsTab } from "@/components/ModelsTab";
import { RoomProvider, useRoom } from "@/components/RoomProvider";
import { VisionTab } from "@/components/VisionTab";
import { Badge, Btn, Card, Steps } from "@/components/ui";
import { MISSIONS } from "@/lib/missions";

const TABS = [
  ["overview", "Overview"],
  ["connect", "Connect & Calibrate"],
  ["manual", "Manual"],
  ["vision", "Vision"],
  ["missions", "Missions"],
  ["models", "Models"],
  ["guide", "Build Guide"],
] as const;
type Tab = (typeof TABS)[number][0];

function Overview({ go }: { go: (t: Tab) => void }) {
  const { follower, fState, report, data, connect } = useRoom();
  const real = follower?.kind === "serial";
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Card title="SO-101 Control Room">
          <p className="text-sm text-slate-300">
            Drive real SO-101 arms straight from the browser over Web Serial (Feetech STS3215 protocol): manual joint and Cartesian control, leader–follower teleop, teach &amp; replay, camera-guided missions with verified grasps, and a bridge to LeRobot for learned policies. A virtual arm runs the <i>same</i> driver stack so you can rehearse everything without hardware.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn kind="primary" onClick={() => go("connect")}>Connect the arm →</Btn>
            <Btn onClick={() => connect("follower", "sim")}>Start virtual arm</Btn>
            <Btn onClick={() => go("missions")}>Browse {MISSIONS.length} missions</Btn>
          </div>
        </Card>
        <Card title="First 30 minutes on the real arm">
          <Steps
            items={[
              "Power on the supply, plug USB, open this app in Chrome/Edge on the same laptop → Connect real arm.",
              "All 6 motors green? Run the calibration steps (ranges, gripper, L-pose, directions, table touch, grasp tuning).",
              "Manual tab: Torque ON while holding the arm; test sliders, then Cartesian jog ±1 cm.",
              "Vision tab: webcam on; touch 4+ marks with the fingertip and click them; add 2–3 PROBE marks until the held-out error is OK.",
              "Missions → type an instruction (“sort the cubes by colour”) or click a mission: with Auto-run on it counts down (Cancel any time), enables torque itself and executes. Dry run first; retune grasp thresholds with your objects.",
              "Manual tab: sliders, Cartesian jog and keyboard (arrows / W,S / O,C). Manual controls lock while a script is running; E-STOP is always live.",
              "Models tab: record demos with a leader arm, train ACT/SmolVLA, then run the policy through the bridge.",
            ]}
          />
        </Card>
        <Card title="What is verified vs. not">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li><Badge tone="green">tested</Badge> Feetech packet encode/decode, register I/O, IK↔FK round trips, vision calibration statistics and a full camera→IK→grasp→slip-check→bin pick on the virtual arm (<code>npx vitest run</code>).</li>
            <li><Badge tone="amber">needs your hardware</Badge> Joint sign conventions, link lengths, grasp thresholds, camera lighting. The calibration wizard measures each; the pre-flight check blocks missions until the essentials are done.</li>
            <li><Badge tone="amber">unproven here</Badge> Learned policies: commands match the LeRobot docs, but need LeRobot installed locally and camera names equal to the training keys.</li>
          </ul>
        </Card>
      </div>
      <div className="space-y-4">
        <Card title="Status">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-slate-400">Follower</span>{follower ? <Badge tone={real ? "green" : "violet"}>{real ? "real" : "virtual"}</Badge> : <Badge>offline</Badge>}</li>
            <li className="flex justify-between"><span className="text-slate-400">Torque</span><Badge tone={fState?.torque ? "green" : "slate"}>{fState?.torque ? "on" : "off"}</Badge></li>
            <li className="flex justify-between"><span className="text-slate-400">Kinematic calibration</span><Badge tone={data.calFollower.referenceCaptured && data.calFollower.directionsConfirmed ? "green" : "amber"}>{data.calFollower.referenceCaptured && data.calFollower.directionsConfirmed ? "done" : "pending"}</Badge></li>
            <li className="flex justify-between"><span className="text-slate-400">Camera accuracy</span><Badge tone={report.status === "ok" ? "green" : report.status === "warn" || report.status === "unvalidated" ? "amber" : "red"}>{report.status}</Badge></li>
          </ul>
        </Card>
        <Card title="Activity"><LogPanel /></Card>
      </div>
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>("overview");
  const { estop, follower, fState, ready } = useRoom();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-2">
          <div className="mr-2 text-lg font-bold tracking-tight text-cyan-300">SO-101 <span className="text-slate-100">Control Room</span></div>
          <nav className="flex flex-1 flex-wrap gap-1">
            {TABS.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`rounded-md px-3 py-1.5 text-sm transition ${tab === id ? "bg-cyan-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}>
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {follower && <Badge tone={fState?.torque ? "green" : "amber"}>{follower.kind === "sim" ? "virtual" : "real"} · torque {fState?.torque ? "ON" : "OFF"}</Badge>}
            <button onClick={estop} className="rounded-md bg-rose-600 px-4 py-1.5 text-sm font-bold text-white shadow hover:bg-rose-500">E-STOP</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] p-4">
        {!ready ? <p className="text-slate-500">Loading…</p> : (
          <>
            {tab === "overview" && <Overview go={setTab} />}
            {tab === "connect" && <ConnectTab />}
            {tab === "manual" && <ManualTab />}
            {tab === "vision" && <VisionTab />}
            {tab === "missions" && <MissionsTab />}
            {tab === "models" && <ModelsTab />}
            {tab === "guide" && <GuideTab />}
          </>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <RoomProvider>
      <Shell />
    </RoomProvider>
  );
}
