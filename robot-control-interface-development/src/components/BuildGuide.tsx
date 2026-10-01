"use client";
import { useEffect, useState } from "react";

interface Step {
  id: string;
  phase: string;
  title: string;
  time: string;
  body: string[];
  code?: string;
  warn?: string;
}

const STEPS: Step[] = [
  {
    id: "parts", phase: "1 · Prepare", title: "Check the kit & clean the printed parts", time: "20 min",
    body: [
      "Get the official bill of materials and STL files from the SO-ARM100 repo (TheRobotStudio). Per arm: 6× Feetech STS3215 servos, a bus-servo controller board, printed parts, M2×6 and M3×6 screws, motor horns.",
      "Follower = six 1/345 motors. Leader = three gear ratios (1/191 for pan & elbow, 1/345 for shoulder lift, 1/147 for wrist flex, wrist roll and gripper) so it can be moved by hand without collapsing under its own weight.",
      "If you were handed two finished arms, skip to “Install LeRobot”. If you were given a kit, remove all support material with a small screwdriver and plug one 3-pin cable into every motor before you start.",
    ],
    warn: "Never power the servos from USB alone. Match the supply to your servo version (7.4 V vs 12 V models) and check polarity.",
  },
  {
    id: "install", phase: "2 · Software", title: "Install LeRobot + Feetech SDK", time: "10 min",
    body: ["Follow the LeRobot installation guide, then add the Feetech extra."],
    code: `git clone https://github.com/huggingface/lerobot.git && cd lerobot\npip install -e ".[feetech]"`,
  },
  {
    id: "ports", phase: "2 · Software", title: "Find the USB port of each arm", time: "5 min",
    body: ["Run the script, unplug the controller board when asked, and note the port. Label each cable (leader A / follower A / leader B / follower B)."],
    code: `lerobot-find-port\n# macOS: /dev/tty.usbmodem…   Linux: /dev/ttyACM0 (then: sudo chmod 666 /dev/ttyACM0)`,
  },
  {
    id: "ids", phase: "3 · Motors", title: "Set motor IDs & baudrate (one motor at a time!)", time: "15 min / arm",
    body: [
      "Each motor ships with ID 1. The script asks you to connect the controller to ONE motor at a time (gripper first, then wrist_roll … shoulder_pan) and writes a unique ID (1–6) and 1 Mbps baudrate to EEPROM.",
      "Do this BEFORE assembling the arm — afterwards you can’t isolate each motor.",
      "Waveshare boards: both jumpers on channel B (USB).",
    ],
    code: `lerobot-setup-motors --robot.type=so101_follower --robot.port=/dev/ttyACM0\nlerobot-setup-motors --teleop.type=so101_leader  --teleop.port=/dev/ttyACM1`,
  },
  {
    id: "j1", phase: "4 · Assembly", title: "Joint 1 — shoulder pan (base)", time: "15 min",
    body: ["Fit both horns on motor 1 (top horn: 1× M3×6; bottom: press-fit).", "Seat the motor in the base: 4× M2×6 (two top, two bottom).", "Slide motor holder 1 over it: 2× M2×6.", "Attach the shoulder bracket: 4× M3×6 top + 4× M3×6 bottom, then add the shoulder motor holder."],
  },
  {
    id: "j2", phase: "4 · Assembly", title: "Joint 2 — shoulder lift", time: "10 min",
    body: ["Horns on motor 2, slide it in from the top, fasten 4× M2×6.", "Attach the upper arm with 4× M3×6 on each side."],
  },
  {
    id: "j3", phase: "4 · Assembly", title: "Joint 3 — elbow flex", time: "10 min",
    body: ["Horns on motor 3, insert, 4× M2×6.", "Forearm onto motor 3: 4× M3×6 on each side. Route the cables inside the arm before closing."],
  },
  {
    id: "j4", phase: "4 · Assembly", title: "Joint 4 & 5 — wrist flex and roll", time: "15 min",
    body: ["Horns on motor 4, slide motor holder 4 over the forearm, slide in motor 4, fasten 4× M2×6.", "Motor 5 into the wrist holder with 2× M2×6 front screws; only ONE horn (M3×6). Secure the wrist to motor 4 with 4× M3×6 per side."],
  },
  {
    id: "grip", phase: "4 · Assembly", title: "Gripper (follower) or handle (leader)", time: "15 min",
    body: ["Attach the gripper body to motor 5’s horn: 4× M3×6.", "Insert the gripper motor (2× M2×6 each side), fit both horns, then the moving jaw with 4× M3×6 per side.", "Leader: fit the handle and trigger instead.", "Glue/tape TPU finger pads and mount a wrist camera now — you will want it later."],
  },
  {
    id: "cal", phase: "5 · Calibrate", title: "Calibrate follower and leader", time: "5 min / arm",
    body: ["Move every joint to the MIDDLE of its range, press Enter, then sweep each joint through its full range. Calibration makes leader and follower report identical values for identical poses — essential for every policy you train.", "No LeRobot at hand? The Control Center can also calibrate in the browser and export a LeRobot-compatible JSON."],
    code: `lerobot-calibrate --robot.type=so101_follower --robot.port=/dev/ttyACM0 --robot.id=follower_a\nlerobot-calibrate --teleop.type=so101_leader  --teleop.port=/dev/ttyACM1 --teleop.id=leader_a`,
  },
  {
    id: "tele", phase: "6 · Operate", title: "Teleoperate", time: "5 min",
    body: ["Use the same --id values as in calibration. Two arms? Run two processes (or use the Control Center: it mirrors leader→follower for both pairs in the browser)."],
    code: `lerobot-teleoperate \\\n  --robot.type=so101_follower --robot.port=/dev/ttyACM0 --robot.id=follower_a \\\n  --teleop.type=so101_leader  --teleop.port=/dev/ttyACM1 --teleop.id=leader_a`,
  },
  {
    id: "cams", phase: "6 · Operate", title: "Add cameras", time: "20 min",
    body: ["Minimum useful setup: one fixed front/top camera (640×480 @30) + one wrist camera. For two arms add a wide top-down camera that sees both workspaces.", "Fix the cameras rigidly — moving a camera after recording data breaks the policy."],
    code: `--robot.cameras="{ front: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30}, wrist: {type: opencv, index_or_path: 2, width: 640, height: 480, fps: 30}}"`,
  },
  {
    id: "record", phase: "7 · Teach", title: "Record a dataset (≥ 50 episodes)", time: "1–2 h",
    body: ["Start with one simple task and ~10 episodes per object position (e.g. 5 positions × 10). Keep cameras fixed, make the object visible, and be consistent. → arrow ends an episode, ← re-records, Esc finishes."],
    code: `hf auth login --token $HF_TOKEN --add-to-git-credential\nlerobot-record --robot.type=so101_follower --robot.port=/dev/ttyACM0 --robot.id=follower_a \\\n  --robot.cameras="{front: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30}}" \\\n  --teleop.type=so101_leader --teleop.port=/dev/ttyACM1 --teleop.id=leader_a \\\n  --dataset.repo_id=$HF_USER/pick_cube --dataset.num_episodes=50 \\\n  --dataset.single_task="Pick up the cube and put it in the bin"`,
  },
  {
    id: "train", phase: "7 · Teach", title: "Train a policy (ACT first!)", time: "2–6 h on a GPU",
    body: ["ACT is the safest hackathon choice. Upgrade to SmolVLA if you need language / multi-task. Colab and Hugging Face Jobs work if you have no local GPU."],
    code: `lerobot-train --dataset.repo_id=$HF_USER/pick_cube --policy.type=act \\\n  --output_dir=outputs/train/act_pick --job_name=act_pick \\\n  --policy.device=cuda --policy.repo_id=$HF_USER/act_pick`,
  },
  {
    id: "run", phase: "8 · Deploy", title: "Run the policy — from LeRobot or from this app", time: "10 min",
    body: ["Option A (CLI): lerobot-rollout.", "Option B (this app): start the policy server, then in the Control Center → Models → connect the endpoint. The browser streams camera frames + joint state, the server returns action chunks."],
    code: `# A) CLI\nlerobot-rollout --strategy.type=base --policy.path=$HF_USER/act_pick \\\n  --robot.type=so101_follower --robot.port=/dev/ttyACM0 --task="Pick up the cube" --duration=60\n\n# B) this app's bridge\npip install -r bridge/requirements.txt\npython bridge/policy_server.py --policy-path $HF_USER/act_pick --policy-type act --port 8787`,
  },
  {
    id: "dual", phase: "9 · Two arms", title: "Two-arm workspace layout (for the IK skills & playground)", time: "10 min",
    body: [
      "Clamp both follower bases to the SAME table, 32 cm apart (centre to centre), both facing the same way (towards you).",
      "Table frame used by every skill (cm): x → right, y → up, z → towards you (the direction the arms face). Arm A's base is at (−16, −14), arm B's base at (+16, −14). So the origin is the point 14 cm in FRONT of the midpoint between the two bases; the shared work area is roughly x ∈ [−30, 30], z ∈ [−8, 10] (≈ 22 cm reach per arm).",
      "Check the 'Playground → Control Center' skills against that layout using masking tape marks and a ruler before running anything fast.",
    ],
    warn: "Keep hands and faces out of the swing radius (~30 cm). Use the E-stop in the Control Center (Space bar) and cap speed/torque the first time.",
  },
];

export default function BuildGuide() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState("");
  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem("so101.build") ?? "{}"));
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = (id: string) =>
    setDone((d) => {
      const n = { ...d, [id]: !d[id] };
      localStorage.setItem("so101.build", JSON.stringify(n));
      return n;
    });
  const count = STEPS.filter((s) => done[s.id]).length;
  const phases = Array.from(new Set(STEPS.map((s) => s.phase)));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold">Build & setup guide</h1>
        <p className="mt-1 max-w-3xl text-slate-400">
          From parts to a learning, bimanual robot — condensed from the official LeRobot SO-101 and imitation-learning docs, with the extra steps a two-arm hackathon setup needs. Tick steps off as you go; progress is saved in your browser.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 rounded bg-slate-800">
            <div className="h-2 rounded bg-[#ff7a1a] transition-all" style={{ width: `${(count / STEPS.length) * 100}%` }} />
          </div>
          <span className="text-sm tabular-nums text-slate-300">
            {count}/{STEPS.length}
          </span>
        </div>
      </div>

      <div className="card grid gap-3 p-4 text-sm md:grid-cols-3">
        <div>
          <div className="font-semibold text-[#ff7a1a]">Tools</div>
          <p className="mt-1 text-slate-300">Small Phillips screwdriver, side cutters, hobby knife, hex key for horn screws, optional soldering iron; 2 table clamps per arm.</p>
        </div>
        <div>
          <div className="font-semibold text-[#ff7a1a]">Printing</div>
          <p className="mt-1 text-slate-300">PLA/PETG, 15–20 % infill, supports on. Print the base flat with a brim. TPU for finger pads.</p>
        </div>
        <div>
          <div className="font-semibold text-[#ff7a1a]">Time budget</div>
          <p className="mt-1 text-slate-300">Assembly ≈ 1.5 h/arm · motor setup + calibration ≈ 30 min/arm · dataset + training ≈ half a day.</p>
        </div>
      </div>

      {phases.map((ph) => (
        <section key={ph} className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-200">{ph}</h2>
          {STEPS.filter((s) => s.phase === ph).map((s) => (
            <div key={s.id} className={`card p-4 transition ${done[s.id] ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1.5 h-4 w-4" checked={!!done[s.id]} onChange={() => toggle(s.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="font-semibold">{s.title}</h3>
                    <span className="chip">⏱ {s.time}</span>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {s.body.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  {s.warn && <div className="mt-2 rounded-lg border border-red-500/40 bg-red-500/5 p-2 text-sm text-red-200">⚠ {s.warn}</div>}
                  {s.code && (
                    <div className="relative mt-2">
                      <pre className="code whitespace-pre-wrap">{s.code}</pre>
                      <button
                        className="btn absolute right-2 top-2 !py-0.5 text-[11px]"
                        onClick={() => {
                          void navigator.clipboard.writeText(s.code ?? "");
                          setCopied(s.id);
                          setTimeout(() => setCopied(""), 1200);
                        }}
                      >
                        {copied === s.id ? "copied ✓" : "copy"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
