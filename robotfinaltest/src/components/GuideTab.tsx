"use client";

import { useState } from "react";
import { Badge, Card, Code, Steps } from "./ui";

interface Part {
  id: string;
  name: string;
  motor?: string;
  y: number; // assembled y (svg)
  h: number;
  w: number;
  color: string;
  shape?: "round";
  what: string;
  tip: string;
}

const PARTS: Part[] = [
  { id: "gripper", name: "Moving jaw + Gripper servo (ID 6)", motor: "ID 6 · gripper", y: 40, h: 40, w: 70, color: "#f43f5e", what: "A single STS3215 servo drives the moving jaw. Its position is the gripper opening; its load/current tells us when we are squeezing an object.", tip: "Stall detection in this app = load ≥ threshold AND position lagging the command." },
  { id: "fixedjaw", name: "Fixed jaw + wrist bracket", y: 85, h: 30, w: 60, color: "#fb7185", what: "The static finger and the bracket that carries the gripper servo. Add rubber/TPU pads for grip.", tip: "Tape or print TPU pads: bare PLA slips on smooth cubes." },
  { id: "wristroll", name: "Wrist roll servo (ID 5)", motor: "ID 5 · wrist_roll", y: 120, h: 34, w: 54, color: "#f59e0b", what: "Rotates the gripper around its own axis: orients the jaws to the object, pours, rotates held items for inspection.", tip: "Used by the Pour and Inspect missions." },
  { id: "wristflex", name: "Wrist flex servo (ID 4)", motor: "ID 4 · wrist_flex", y: 160, h: 34, w: 54, color: "#eab308", what: "Pitches the gripper up/down. Together with shoulder and elbow it keeps the gripper pointing straight down for top-down grasps (IK picks this angle).", tip: "Defines the gripper pitch the IK solves for (−90° = vertical)." },
  { id: "forearm", name: "Forearm link", y: 200, h: 60, w: 28, color: "#84cc16", what: "≈13.5 cm structural link between elbow and wrist. Its length is one of the kinematic constants (editable in Calibrate).", tip: "Measure with calipers and enter your actual value." },
  { id: "elbow", name: "Elbow servo (ID 3)", motor: "ID 3 · elbow_flex", y: 265, h: 34, w: 54, color: "#22c55e", what: "Folds the forearm relative to the upper arm. Carries the weight of everything beyond it.", tip: "Watch temperature on this one during long runs." },
  { id: "upperarm", name: "Upper arm link", y: 304, h: 62, w: 28, color: "#14b8a6", what: "≈11.6 cm link from the shoulder axis to the elbow.", tip: "Cable routing channel: avoid pinching wires at the elbow." },
  { id: "shoulder", name: "Shoulder lift servo (ID 2)", motor: "ID 2 · shoulder_lift", y: 371, h: 38, w: 58, color: "#06b6d4", what: "The biggest-load joint: lifts the entire arm. Gravity torque is highest here.", tip: "Never power it without support: it may sag when torque is off." },
  { id: "turntable", name: "Rotating shoulder bracket", y: 414, h: 24, w: 70, color: "#3b82f6", what: "Turntable bracket that holds the shoulder servo and rotates with the pan servo.", tip: "Check the horn screw is tight: loose = pan drift." },
  { id: "pan", name: "Base pan servo (ID 1)", motor: "ID 1 · shoulder_pan", y: 443, h: 34, w: 64, color: "#6366f1", what: "Rotates the whole arm left/right: sets the azimuth of every reach.", tip: "Zero should point straight ahead along +X (matches the vision frame)." },
  { id: "base", name: "Base plate + table clamps", y: 482, h: 22, w: 110, color: "#8b5cf6", what: "Rigid foot. Clamp it to the table: a sliding base ruins calibration.", tip: "Two C-clamps; mark the base footprint with tape so you can re-place it." },
  { id: "board", name: "Servo bus board (USB ↔ TTL half-duplex)", y: 512, h: 22, w: 90, color: "#a855f7", what: "Waveshare / Feetech bus adapter: one USB-C to the computer, a daisy-chain 3-pin cable through all six servos, plus the power jack.", tip: "Jumpers: set both to channel B (USB) on the Waveshare board." },
  { id: "psu", name: "Power supply", y: 540, h: 20, w: 90, color: "#d946ef", what: "Per the LeRobot docs the follower uses a 12 V supply and the leader 5 V (check your kit's servo labels). Wrong voltage destroys servos.", tip: "Put a physical switch / E-stop on this cable." },
];

const ASSEMBLY = [
  "Print the parts (or order the kit) and sort screws by length. Print with 15–20% infill, 0.2 mm layers; no supports unless the guide says so.",
  "Label every servo with its ID BEFORE assembly. Plug ONE servo at a time into the bus board and run the ID setup (command below). Servos ship with ID 1.",
  "Follower: all six STS3215 servos are the same type. Leader: the kit ships different gear ratios per joint, so use the right motor in the right joint. Don't mix them up.",
  "Assemble from the base upward: pan servo → turntable → shoulder servo → upper arm → elbow → forearm → wrist flex → wrist roll → gripper. Center each servo horn at ~2048 ticks before pressing the horn on.",
  "Daisy-chain the 3-pin cables: board → ID1 → ID2 → … → ID6. Leave slack at moving joints; never let a cable bind in the shoulder.",
  "Clamp the base to the table. Mount the overhead camera rigidly (a lamp arm or tripod) so it sees the whole workspace; fix focus and exposure.",
  "Connect power, then USB. Open this app, press Connect: you should see six motors answer. Then calibrate (Connect tab).",
];

export function ExplodedView() {
  const [explode, setExplode] = useState(0.8);
  const [sel, setSel] = useState<Part>(PARTS[7]);
  const spread = 1 + explode * 0.9;
  const cx = 150;
  const yy = (p: Part) => 20 + p.y * spread;
  const height = 40 + 570 * spread;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center gap-3 text-xs text-slate-400">Exploded
          <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(Number(e.target.value))} className="flex-1 accent-cyan-400" />
          <span>{explode < 0.05 ? "assembled" : "exploded"}</span></div>
        <svg viewBox={`0 0 420 ${height}`} className="w-full rounded-lg border border-slate-800 bg-slate-950">
          <line x1={cx} y1="0" x2={cx} y2={height} stroke="#334155" strokeDasharray="3 5" />
          {PARTS.map((p) => (
            <g key={p.id} onClick={() => setSel(p)} className="cursor-pointer" opacity={sel.id === p.id ? 1 : 0.85}>
              <rect x={cx - p.w / 2} y={yy(p)} width={p.w} height={p.h} rx={p.shape === "round" ? p.h / 2 : 8} fill={p.color} stroke={sel.id === p.id ? "#fff" : "#0f172a"} strokeWidth={sel.id === p.id ? 3 : 1} />
              {p.motor && <circle cx={cx} cy={yy(p) + p.h / 2} r="6" fill="#0f172a" stroke="#e2e8f0" />}
              <line x1={cx + p.w / 2} y1={yy(p) + p.h / 2} x2="236" y2={yy(p) + p.h / 2} stroke="#475569" strokeWidth="1" />
              <text x="242" y={yy(p) + p.h / 2 + 4} fontSize="11" fill={sel.id === p.id ? "#67e8f9" : "#cbd5e1"}>{p.name.length > 30 ? p.name.slice(0, 29) + "…" : p.name}</text>
            </g>
          ))}
        </svg>
        <p className="mt-1 text-[11px] text-slate-500">Schematic, not CAD: for the exact STL/CAD files and screw counts see the official SO-ARM100/101 repo and the LeRobot SO-101 guide.</p>
      </div>
      <div className="space-y-3">
        <Card title={sel.name} right={sel.motor ? <Badge tone="cyan">{sel.motor}</Badge> : <Badge>structure</Badge>}>
          <p className="text-sm text-slate-300">{sel.what}</p>
          <p className="mt-2 rounded bg-slate-950 p-2 text-xs text-amber-200">💡 {sel.tip}</p>
        </Card>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {PARTS.map((p) => (
            <button key={p.id} onClick={() => setSel(p)} className={`flex items-center gap-2 rounded border px-2 py-1 text-left ${sel.id === p.id ? "border-cyan-500" : "border-slate-800"}`}>
              <span className="h-3 w-3 rounded" style={{ background: p.color }} />{p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GuideTab() {
  return (
    <div className="space-y-4">
      <Card title="Exploded view & part guide"><ExplodedView /></Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Build order"><Steps items={ASSEMBLY} /></Card>
        <Card title="Set motor IDs (once per servo)">
          <p className="mb-2 text-sm text-slate-300">Connect only ONE servo to the board, then run the following for each joint in order (the tool asks which motor to connect):</p>
          <Code>{`lerobot-setup-motors --robot.type=so101_follower --robot.port=/dev/ttyACM0
lerobot-setup-motors --teleop.type=so101_leader  --robot.port=/dev/ttyACM1`}</Code>
          <p className="mt-2 text-xs text-slate-500">Install first: <code>pip install -e &quot;.[feetech]&quot;</code> inside the lerobot repo. Find ports with <code>lerobot-find-port</code>.</p>
        </Card>
      </div>

      <Card title="Connecting the real arm to this interface (step by step)">
        <Steps
          items={[
            <span key="a"><b>Browser</b>: desktop Chrome or Edge. Web Serial works on <code>http://localhost</code> or https only. Run <code>npm run build &amp;&amp; npm start</code> on the laptop that the arm is plugged into.</span>,
            <span key="b"><b>Power</b>: switch the supply on <i>before</i> opening the app; USB alone only powers the board, not the motors.</span>,
            <span key="c"><b>OS permissions</b>: Linux: <code>sudo usermod -aG dialout $USER</code> then re-login (or <code>sudo chmod 666 /dev/ttyACM0</code> for a quick test). Windows: install the CH343/CH340 driver if no COM port appears. macOS: ports appear as <code>/dev/tty.usbmodem…</code>.</span>,
            <span key="d"><b>Connect tab → Connect real arm</b>: choose the port. All six motors should show a green dot. If fewer: see troubleshooting.</span>,
            <span key="e"><b>Calibrate</b> (same tab): range of motion → gripper → L-pose reference → direction check → touch table → tune grasp. Mission pre-flight refuses to run on real hardware until the L-pose and directions are done.</span>,
            <span key="f"><b>Torque ON</b> only while supporting the arm: it holds its current pose (it will not snap anywhere). Try Manual → joint sliders → Cartesian jog.</span>,
            <span key="g"><b>Vision tab</b>: choose USB webcam, place ≥4 FIT marks by touching the tip to table spots, then 2–3 PROBE marks. Only proceed when the held-out error says OK.</span>,
            <span key="h"><b>Missions</b>: start with a Dry run, then Run with the arm slowed (Manual → max speed 40°/s). Keep a hand near the power switch.</span>,
            <span key="i"><b>Policies</b>: Models tab. LeRobot needs the serial port, so the browser releases it automatically when you press Run on robot.</span>,
          ]}
        />
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Safety checklist">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>Physical power switch within reach; the software E-stop needs the USB link.</li>
            <li>Clear the workspace of hands, cables and phones before every run.</li>
            <li>First run of any mission: dry run, then slow speed, then full speed.</li>
            <li>Torque OFF makes the arm limp and it will fall: support it by the forearm.</li>
            <li>Servo overheating: stop at 65 °C; the gripper stalls on objects by design, so don&apos;t hold a stall for long.</li>
            <li>Never exceed the servo voltage printed on the label (follower 12 V / leader 5 V on the standard kit).</li>
            <li>Joint limits come from your recorded ranges; redo the range step after re-assembly.</li>
          </ul>
        </Card>
        <Card title="Troubleshooting">
          <dl className="space-y-2 text-xs text-slate-300">
            {[
              ["No motors answer", "PSU off or wrong jumper on the bus board; wrong port; cable not data-capable; baud must be 1 Mbps (default)."],
              ["Only some motors answer", "Re-seat the daisy-chain cable before the first missing ID; duplicate IDs; a servo still at ID 1."],
              ["Port busy / cannot open", "LeRobot, another tab or a stuck process owns the port. Disconnect there first."],
              ["Arm moves the wrong way in jog", "Flip that joint's sign in Calibrate → Direction check, then confirm."],
              ["Fingertip is 1–2 cm off the target", "Measure link lengths, redo L-pose reference, set table height; add more fit marks and check the held-out error."],
              ["Grasp reports 'missed' on a real object", "Run Tune grasp with that object; check pads; make sure the grab height matches object size."],
              ["Jittery / buzzing joint", "Overload or an obstructed range; lower max speed; check the cable at that joint."],
              ["Detections flicker", "Lock camera exposure/white balance; use background subtraction; add light, not shadows."],
            ].map(([q, a]) => <div key={q}><dt className="font-semibold text-slate-100">{q}</dt><dd className="text-slate-400">{a}</dd></div>)}
          </dl>
        </Card>
      </div>
    </div>
  );
}
