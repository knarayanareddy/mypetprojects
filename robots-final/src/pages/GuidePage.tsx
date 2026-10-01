import { ReactNode, useState } from "react";
import { BRIDGE_PY, POLICY_SERVER_PY } from "../lib/bridgeCode";
import { Badge, Btn, Card, Code, download } from "../components/ui";

const Step = ({ n, title, children }: { n: number | string; title: string; children: ReactNode }) => (
  <div className="flex gap-3">
    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-slate-950">{n}</div>
    <div className="min-w-0 flex-1 space-y-2 text-xs leading-relaxed text-slate-300"><h4 className="text-sm font-semibold text-slate-100">{title}</h4>{children}</div>
  </div>
);
const Warn = ({ children }: { children: ReactNode }) => <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">{children}</div>;
const Tip = ({ children }: { children: ReactNode }) => <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-[11px] text-cyan-100">{children}</div>;

const SECTIONS = ["Overview", "1 · Hardware & sensors", "2 · Software", "3 · Ports & motor IDs", "4 · Assemble & calibrate", "5 · Connect (Web Serial)", "6 · Connect (Python bridge)", "7 · First motion & safety", "8 · Teleop → data → train → deploy", "9 · Troubleshooting", "10 · Downloads", "11 · Resources & plan"] as const;

export default function GuidePage() {
  const [sec, setSec] = useState<(typeof SECTIONS)[number]>("Overview");
  const [show, setShow] = useState("");
  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[220px_1fr]">
      <nav className="lg:sticky lg:top-20 lg:self-start">
        <ul className="flex gap-1.5 overflow-x-auto lg:flex-col">
          {SECTIONS.map((s) => (
            <li key={s}><button onClick={() => setSec(s)} className={`w-full whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-xs font-medium ${sec === s ? "bg-orange-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}>{s}</button></li>
          ))}
        </ul>
      </nav>

      <div className="space-y-4">
        {sec === "Overview" && (
          <Card title="How the pieces fit together">
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>This app is a <b>control deck for two SO-101 follower arms (and their two leader arms)</b>. It runs the same motion programs on a built-in simulator and – when you flip “Drive real arms” – on the physical robots. It can also stream joint targets from learned policies (ACT, SmolVLA, π0/π0.5, MolmoAct 2…) and from a leader arm.</p>
              <Code copy={false}>{`┌──────────── Browser (this app) ────────────┐
│  Missions (NL → skills)   Models (policies) │
│  Control (sliders/keys/leader mirror)       │
│            │ hub: targets @30 Hz            │
│   sim ◀────┤                                │
└────────────┼───────────────┬────────────────┘
   Path A    │ Web Serial    │ Path B  WebSocket :8765
             ▼               ▼
     Feetech STS3215     so101_bridge.py ── LeRobot drivers ──▶ STS3215
     (USB adapters)            │  └─ lerobot-record --policy.path=…  (real policies)
                               └─ optional policy_server.py (GPU) ◀── HTTP /predict (from browser)`}</Code>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-950/60 p-3"><Badge tone="green">Manual</Badge><p className="mt-1">Sliders, Cartesian keyboard jog, leader-arm mirroring, record/replay.</p></div>
                <div className="rounded-xl bg-slate-950/60 p-3"><Badge tone="cyan">Automated</Badge><p className="mt-1">29 scripted use-cases, natural-language chaining (“sort the cubes then high five”), optional LLM/VLM planner, voice input.</p></div>
                <div className="rounded-xl bg-slate-950/60 p-3"><Badge tone="violet">Learned</Badge><p className="mt-1">Policy runner over HTTP or the bridge, registry for your fine-tuned checkpoints.</p></div>
              </div>
              <Warn><b>Honesty note:</b> the simulator, planner and UI are fully exercised in the browser. The Feetech/LeRobot hardware paths follow the vendor protocol and LeRobot’s own register values, but could not be tested against physical arms in the environment this was built in. Treat first contact as a commissioning test: low speed, low torque, one arm at a time, hand on <kbd>Space</kbd>.</Warn>
              <Tip>Related tool: <b>MakerMods Lab</b> (github.com/makermods-robotics/makermodslab) is a full web UI for the <i>data-collection → curate → train → deploy → DAgger</i> loop with LeRobot. It complements this deck: use it to collect and train, then bring the resulting checkpoint here (Models tab) to orchestrate it with scripted skills and language commands.</Tip>
            </div>
          </Card>
        )}

        {sec === "1 · Hardware & sensors" && (
          <Card title="What you need">
            <div className="space-y-3 text-xs text-slate-300">
              <ul className="list-inside list-disc space-y-1">
                <li><b>2 × SO-101 follower</b> (6 × STS3215, 1/345 gearing) and <b>2 × SO-101 leader</b> (STS3215 with 1/191 on pan & elbow, 1/345 on shoulder lift, 1/147 on wrist/gripper) – exactly the HF SO-101 BOM.</li>
                <li><b>4 × bus-servo driver boards</b> (Waveshare Bus Servo Adapter / Feetech URT-1) with USB-C cables – <b>one board per arm</b>. Jumpers on channel <b>B (USB)</b>.</li>
                <li><b>Power:</b> match the supply to the motor label – 5 V for 7.4 V motors, 12 V for 12 V motors. Never mix voltages on one bus. Followers draw up to several amps under load: use ≥ 5 A supplies.</li>
                <li>Table clamps (arms must be fixed), a hub with enough USB ports (4 boards + cameras), and a clear 60 × 50 cm workspace.</li>
              </ul>
              <h4 className="text-sm font-semibold text-slate-100">Sensors (all optional – the app works with none)</h4>
              <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-[11px]">
                <thead><tr className="text-left text-slate-500"><th className="py-1">Sensor</th><th>Why</th><th>How it connects here</th></tr></thead>
                <tbody className="[&_td]:border-t [&_td]:border-slate-800 [&_td]:py-1.5 [&_td]:pr-2">
                  <tr><td><b>Top-down USB webcam</b> (fixed, 640×480+)</td><td>Needed by every vision policy; object localisation</td><td>Hardware → Cameras → slot <code>top</code></td></tr>
                  <tr><td><b>Wrist camera</b> (small USB cam on arm A’s gripper)</td><td>Big boost for ACT/SmolVLA grasping</td><td>slot <code>wrist</code></td></tr>
                  <tr><td>Side camera</td><td>Depth cue for VLM agent (3-cam setup)</td><td>slot <code>side</code></td></tr>
                  <tr><td><b>Servo load / current / temperature</b></td><td>Free! Grasp confirmation, overload & overheating warnings</td><td>Already read from the STS3215 (Hardware tab table)</td></tr>
                  <tr><td>Depth camera (RealSense D435 / OAK-D)</td><td>3-D object positions for scripted skills</td><td>Expose as a UVC colour stream; depth needs a custom server (policy_server.py)</td></tr>
                  <tr><td>USB microphone</td><td>Voice commands (browser speech API) / music verification</td><td>Browser permission; no wiring</td></tr>
                  <tr><td>Load cell + HX711 on Arduino</td><td>Pour/fill level, weighing</td><td>Arduino → serial → small custom endpoint (ideas for extension)</td></tr>
                  <tr><td>Soil-moisture / IoT sensors</td><td>Plant-watering trigger</td><td>Custom endpoint → call skill via planner</td></tr>
                </tbody></table></div>
            </div>
          </Card>
        )}

        {sec === "2 · Software" && (
          <Card title="Install LeRobot (needed for calibration files, bridge and training)">
            <div className="space-y-3">
              <Step n={1} title="Python environment">
                <Code>{`# recommended: miniforge / conda
conda create -y -n lerobot python=3.10 && conda activate lerobot
conda install -y ffmpeg -c conda-forge`}</Code>
              </Step>
              <Step n={2} title="Install LeRobot + Feetech SDK">
                <Code>{`git clone https://github.com/huggingface/lerobot.git && cd lerobot
pip install -e ".[feetech]"
pip install websockets          # for the bridge`}</Code>
              </Step>
              <Step n={3} title="Serial permissions">
                <Code>{`# Linux: either one-off …
sudo chmod 666 /dev/ttyACM*
# … or permanently
sudo usermod -aG dialout $USER   # log out/in
# macOS: ports look like /dev/tty.usbmodem58760431551 (no driver needed)
# Windows: COM3, COM4 … (CH340/CP210x driver if the board isn’t detected)`}</Code>
              </Step>
              <Step n={4} title="Open this app in desktop Chrome or Edge">
                <p>Web Serial only exists there, and only on <code>https://</code> or <code>http://localhost</code>. Close anything else holding the serial ports (LeRobot scripts, Arduino IDE, other tabs).</p>
              </Step>
            </div>
          </Card>
        )}

        {sec === "3 · Ports & motor IDs" && (
          <Card title="Find ports and configure motor IDs">
            <div className="space-y-3">
              <Step n={1} title="Find the port of each board (do this 4 times, label them!)">
                <Code>{`lerobot-find-port
# unplug the board when asked, press Enter → it prints /dev/ttyACM0 etc.`}</Code>
                <Tip>Write on tape: <b>A-follower, A-leader, B-follower, B-leader</b>. Linux numbering changes when you re-plug; use <code>ls -l /dev/serial/by-id</code> for stable names.</Tip>
              </Step>
              <Step n={2} title="Set IDs: in-browser tool or LeRobot CLI">
                <p>Hardware tab → <b>Motor ID setup</b> does exactly what <code>lerobot-setup-motors</code> does: connect <b>one</b> motor, press “Set id”, repeat in the order gripper (6) → wrist_roll (5) → wrist_flex (4) → elbow_flex (3) → shoulder_lift (2) → shoulder_pan (1). IDs and 1 Mbps are saved in the servo’s EEPROM.</p>
                <Code>{`lerobot-setup-motors --robot.type=so101_follower --robot.port=/dev/ttyACM0
lerobot-setup-motors --teleop.type=so101_leader  --robot.port=/dev/ttyACM1`}</Code>
                <Warn>Leader arms use three different gear ratios – make sure the right motor goes to the right joint (see the table in Section 1). Repeat for all four arms.</Warn>
              </Step>
            </div>
          </Card>
        )}

        {sec === "4 · Assemble & calibrate" && (
          <Card title="Assembly and calibration">
            <div className="space-y-3">
              <Step n={1} title="Assemble following the HF guide">
                <p>Joint by joint: horns on, motor in, 4 × M2×6 motor screws, 4 × M3×6 per horn side, one M3×6 horn screw. Full pictured steps: <code>huggingface.co/docs/lerobot/so101</code>. Fit one 3-pin cable per motor before closing each joint.</p>
              </Step>
              <Step n={2} title="Calibrate every arm (four times)">
                <Code>{`lerobot-calibrate --robot.type=so101_follower --robot.port=/dev/ttyACM0 --robot.id=follower_a
lerobot-calibrate --teleop.type=so101_leader  --teleop.port=/dev/ttyACM1 --teleop.id=leader_a
lerobot-calibrate --robot.type=so101_follower --robot.port=/dev/ttyACM2 --robot.id=follower_b
lerobot-calibrate --teleop.type=so101_leader  --teleop.port=/dev/ttyACM3 --teleop.id=leader_b`}</Code>
                <p>Move the arm to the <b>middle of every joint’s range</b>, press Enter, then sweep each joint through its full range. Calibration is what lets a neural net trained on one arm work on another – don’t skip it.</p>
                <p>The files land in <code>~/.cache/huggingface/lerobot/calibration/</code>. Bridge users are done (the bridge reads them by <code>--…-id</code>). Web Serial users: Hardware → Calibration → <b>Import</b> (paste the JSON), or do the sweep in the browser.</p>
              </Step>
            </div>
          </Card>
        )}

        {sec === "5 · Connect (Web Serial)" && (
          <Card title="Path A – direct from the browser">
            <div className="space-y-3">
              <Step n={1} title="Power and plug in">Power on the first follower’s board (12 V/5 V), USB to the computer. Nothing moves yet – torque is off at connect.</Step>
              <Step n={2} title="Hardware tab → Connect (Arm A · follower)">Choose the port in Chrome’s picker. The app pings ids 1–8 at 1 Mbps and shows 6 motors with live position/load/temperature/voltage. Fewer than 6 = cabling or ID problem (see Troubleshooting).</Step>
              <Step n={3} title="Calibration">Import the LeRobot JSON (or sweep in-browser). “uncalibrated” badges disappear when saved. Do the same for leader A and for arm B.</Step>
              <Step n={4} title="Align the twin">With torque off and <i>Digital twin</i> on (Control tab) the simulated arm mirrors the real one while you move it by hand. Check each joint’s direction and range. If something is mirrored, re-calibrate that arm.</Step>
              <Step n={5} title="Apply LeRobot config & enable torque">“Apply LeRobot config” writes the same PID (16/0/32), acceleration and gripper protection values LeRobot uses. Then Control → <b>Torque ON</b>. The app first writes goal = present position, then enables torque, so the arm never jumps.</Step>
              <Step n={6} title="Tick “Drive real arms”">Now sliders, keyboard jog, scripts and policies drive the real arm. Untick to go back to simulation instantly.</Step>
              <Warn>Chrome allows only one program per serial port. If Connect fails with “Failed to open serial port”, close LeRobot processes / other tabs / the Arduino IDE.</Warn>
            </div>
          </Card>
        )}

        {sec === "6 · Connect (Python bridge)" && (
          <Card title="Path B – bridge on the PC with the arms (any browser, real LeRobot policies)">
            <div className="space-y-3">
              <Step n={1} title="Download so101_bridge.py (Downloads tab) and run it">
                <Code>{`conda activate lerobot
python so101_bridge.py \\
  --follower-a /dev/ttyACM0 --follower-a-id follower_a --leader-a /dev/ttyACM1 --leader-a-id leader_a \\
  --follower-b /dev/ttyACM2 --follower-b-id follower_b --leader-b /dev/ttyACM3 --leader-b-id leader_b \\
  --max-relative-target 12
# no hardware yet? python so101_bridge.py --mock`}</Code>
              </Step>
              <Step n={2} title="Hardware tab → Python bridge → Connect">Default <code>ws://localhost:8765</code>. If the app is served over https, browsers block <code>ws://</code> to remote hosts – use localhost, an <code>ssh -L 8765:localhost:8765</code> tunnel, or run the app via <code>vite preview</code>/<code>http</code>.</Step>
              <Step n={3} title="Torque, mirror, drive – same controls as Path A">The bridge enforces <code>--max-relative-target</code> as a second safety clamp, and a browser E-stop calls <code>disable_torque()</code> on every arm.</Step>
              <Step n={4} title="Run real policies">Models → “Python bridge + LeRobot”, enter an HF repo or checkpoint path, press Start. The bridge releases the ports, runs <code>lerobot-record --policy.path=…</code> (LeRobot’s supported evaluation entry point) and reconnects when finished. Pass cameras with <code>--cameras</code>:</Step>
              <Code>{`--cameras "{ top: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30}, wrist: {type: opencv, index_or_path: 2, width: 640, height: 480, fps: 30}}"`}</Code>
              <p>The built-in bridge policy mode drives <b>arm A</b>. For bimanual learned policies use LeRobot’s bimanual SO-101 config or a custom <code>policy_server.py</code> returning 12-D actions.</p>
            </div>
          </Card>
        )}

        {sec === "7 · First motion & safety" && (
          <Card title="Commissioning checklist">
            <ol className="list-inside list-decimal space-y-1.5 text-xs text-slate-300">
              <li>Clamp both followers; clear everything (including hands, hair, cables) from the swing radius (~30 cm).</li>
              <li>Control tab: speed <b>0.5×</b>, max joint rate <b>≤ 60 u/s</b>, torque cap <b>≤ 400</b>.</li>
              <li>Connect <b>one</b> follower. Torque OFF. Move it by hand – confirm the twin follows and gripper opens in the right direction.</li>
              <li>Put the arm in <i>Rest (folded)</i> by hand, press <b>Align sim → real</b>.</li>
              <li>Torque ON, tick <i>Drive real arms</i>. Nudge a single slider by ~10 units. Then press <i>Ready pose</i>.</li>
              <li>Run <b>Wave hello</b> (no objects). Then <b>Pick &amp; place a cube</b> – positions are in the table frame shown in the viewport; adjust object placement to match the sim (or edit coordinates in <code>skills.ts</code>).</li>
              <li>Second arm: repeat from step 3. Only then run two-arm skills.</li>
              <li><b>E-STOP</b>: <kbd>Space</kbd> or the red button in the header – releases torque on all followers immediately. The arm will drop; keep it supported or park it first.</li>
            </ol>
            <div className="mt-3 space-y-2"><Warn>Never demo with real medication (the pill-box skill is a candy demo). Servo heat: STS3215 above 60 °C → pause. Keep the 5 V and 12 V supplies strictly separate.</Warn>
              <Tip>Scripted skills use table coordinates (cm) relative to the arm bases at x = ∓16 cm, 28 cm from the back edge. Mark the sim layout on your table with tape and place objects to match – that single step makes the scripted demos work on hardware.</Tip></div>
          </Card>
        )}

        {sec === "8 · Teleop → data → train → deploy" && (
          <Card title="From leader arm to a trained policy">
            <div className="space-y-3">
              <Step n={1} title="Teleoperate (verify the pair)">Control → Mirror leader → follower (Path A or B) – or the LeRobot CLI:
                <Code>{`lerobot-teleoperate --robot.type=so101_follower --robot.port=/dev/ttyACM0 --robot.id=follower_a \\
  --teleop.type=so101_leader --teleop.port=/dev/ttyACM1 --teleop.id=leader_a`}</Code></Step>
              <Step n={2} title="Record 30–50 episodes of ONE task">
                <Code>{`lerobot-record --robot.type=so101_follower --robot.port=/dev/ttyACM0 --robot.id=follower_a \\
  --robot.cameras="{ top: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30}, wrist: {type: opencv, index_or_path: 2, width: 640, height: 480, fps: 30}}" \\
  --teleop.type=so101_leader --teleop.port=/dev/ttyACM1 --teleop.id=leader_a \\
  --dataset.repo_id=\${HF_USER}/so101_pickplace --dataset.num_episodes=40 --dataset.single_task="Pick the cube and place it on the pad"`}</Code>
                <p>Or use MakerMods Lab’s browser UI for recording, curation and DAgger.</p></Step>
              <Step n={3} title="Train (Models tab lists a command per architecture)">
                <Code>{`lerobot-train --policy.type=act --dataset.repo_id=\${HF_USER}/so101_pickplace --output_dir=outputs/act_pickplace --policy.device=cuda`}</Code></Step>
              <Step n={4} title="Deploy here">
                <ul className="list-inside list-disc"><li>Same PC as the arms → Path B, <b>Python bridge + LeRobot</b>, path <code>outputs/act_pickplace/checkpoints/last/pretrained_model</code>.</li>
                  <li>Remote GPU → run <code>policy_server.py --lerobot …</code>, tunnel port 8000, Models → <b>HTTP endpoint</b> (browser executes actions, you keep the E-stop and speed limits).</li>
                  <li>Language models (SmolVLA, π0.5, MolmoAct 2): fine-tune on your data, serve the same way, give instructions in the “Task” field.</li></ul></Step>
              <Step n={5} title="VLM skill agent (so101-vlm-agent style)">Point the Missions → LLM/VLM planner at a vision-capable OpenAI-compatible endpoint. It receives the top-camera frame and the skill catalogue and returns an ordered skill list that this app executes with IK – the same “discrete decisions + bounded primitives” split as the SO-101 VLM agent, with object positions coming from your layout.</Step>
            </div>
          </Card>
        )}

        {sec === "9 · Troubleshooting" && (
          <Card title="When something doesn’t work">
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-[11px] text-slate-300">
              <thead><tr className="text-left text-slate-500"><th className="py-1">Symptom</th><th>Likely cause → fix</th></tr></thead>
              <tbody className="[&_td]:border-t [&_td]:border-slate-800 [&_td]:py-1.5 [&_td]:pr-3">
                <tr><td>Connect → “No servos answered”</td><td>Board unpowered; wrong port; jumpers not on channel B; cable from first motor not in the board; ids not set (all = 1) → run Motor ID setup.</td></tr>
                <tr><td>“Failed to open serial port”</td><td>Another program owns it (LeRobot, IDE, second tab). Close it. Linux: dialout group / chmod.</td></tr>
                <tr><td>Only some motors found</td><td>Loose daisy-chain 3-pin cable or duplicate id. Re-run ID setup one motor at a time.</td></tr>
                <tr><td>Read errors counter climbs</td><td>Bad cable, hub brown-out, or board shared with another app. Use short cables, powered hub.</td></tr>
                <tr><td>Arm moves opposite / wrong amount</td><td>Calibration mismatch – recalibrate (middle pose, then full sweeps). Leader and follower must both be calibrated.</td></tr>
                <tr><td>Arm jerks or oscillates</td><td>Lower max joint rate, click “Apply LeRobot config”, check supply voltage under load.</td></tr>
                <tr><td>Wrist roll wraps around</td><td>Wrist roll range is forced to 0…4095 (full turn); move through the seam slowly or recalibrate with the arm centred.</td></tr>
                <tr><td>Scripted pick misses object</td><td>Object not where the sim shows. Re-place objects to the taped layout; tweak coordinates in skills.ts.</td></tr>
                <tr><td>Bridge connects but arm stays limp</td><td>Press Torque ON in Control; tick “Drive real arms”; watch the event log for [bridge] errors.</td></tr>
                <tr><td>Policy: “bad action payload”</td><td>Server must return {"{"}"actions": [[…6 or 12 numbers…]]{"}"}, absolute, normalised (−100…100).</td></tr>
                <tr><td>Servo above 60 °C or load pegged</td><td>Release torque, let it cool; reduce torque cap; don’t hold the gripper closed on a hard object.</td></tr>
              </tbody></table></div>
          </Card>
        )}

        {sec === "10 · Downloads" && (
          <div className="space-y-4">
            {[["so101_bridge.py", BRIDGE_PY, "WebSocket bridge: LeRobot drivers, torque/e-stop, policy launcher (--mock for testing)"], ["policy_server.py", POLICY_SERVER_PY, "HTTP /predict server: mock demo or LeRobot checkpoint on a GPU box"]].map(([n, src, d]) => (
              <Card key={n} title={n} right={<div className="flex gap-1.5"><Btn tone="primary" onClick={() => download(n, src, "text/x-python")}>Download</Btn><Btn onClick={() => setShow(show === n ? "" : n)}>{show === n ? "Hide" : "View"} source</Btn></div>}>
                <p className="text-xs text-slate-400">{d}</p>
                {show === n && <div className="mt-3 max-h-[480px] overflow-auto"><Code>{src}</Code></div>}
              </Card>
            ))}
            <Card title="Install & run quick sheet"><Code>{`pip install websockets
python so101_bridge.py --mock                       # sanity-check the UI link
python policy_server.py --mock                      # sanity-check the HTTP runner
python policy_server.py --lerobot lerobot/smolvla_base --device cuda --chunk 10`}</Code></Card>
          </div>
        )}

        {sec === "11 · Resources & plan" && (
          <div className="space-y-4">
            <Card title="Resources">
              <ul className="space-y-1.5 text-xs text-slate-300">
                {[["LeRobot (Hugging Face)", "https://github.com/huggingface/lerobot", "drivers, calibration, record/train/eval, policies"], ["SO-101 build guide", "https://huggingface.co/docs/lerobot/en/so101", "assembly, motors, calibration"], ["SO-ARM100 hardware repo", "https://github.com/TheRobotStudio/SO-ARM100", "BOM + STL files"], ["MakerMods Lab", "https://github.com/makermods-robotics/makermodslab", "web UI for the whole policy-development loop, remote teleop, DAgger"], ["so101-vlm-agent", "https://github.com/daniiarabdiev/so101-vlm-agent", "VLM picks discrete skills; sim-only training"], ["MolmoAct 2", "https://github.com/allenai/molmoact2", "open action-reasoning VLA with LeRobot workflow + SO-101 deployment notes"], ["visionary (world model)", "https://github.com/james0248/visionary", "Dreamer-4 SO-101 world model – evaluation/data, not control"]].map(([n, u, d]) => (
                  <li key={n}><a className="font-semibold text-orange-300 underline" href={u} target="_blank" rel="noreferrer">{n}</a> <span className="text-slate-500">— {d}</span></li>
                ))}
              </ul>
            </Card>
            <Card title="A realistic 24–36 h hackathon plan with two arms">
              <ol className="list-inside list-decimal space-y-1.5 text-xs text-slate-300">
                <li><b>Hours 0–2:</b> assemble/clamp, IDs, calibrate, connect (this guide). Success = Wave hello on real arm A.</li>
                <li><b>2–4:</b> bring up arm B + leaders; mirror teleop on both pairs; tape the table layout.</li>
                <li><b>4–8:</b> run 3 scripted showpieces on hardware (Sort, Tower, High-five/Dance) – your guaranteed fallback demo.</li>
                <li><b>8–16:</b> record 40 episodes of one signature task; train ACT or fine-tune SmolVLA overnight; (optional) MolmoAct 2 on a remote GPU for open-ended language commands.</li>
                <li><b>16–22:</b> deploy the policy via bridge/HTTP, compare with the scripted version using Run history, record the video.</li>
                <li><b>Last hours:</b> rehearse the pitch: language command → planner → two arms → learned-policy fallback; mention the world-model (visionary) as the evaluation story.</li>
              </ol>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
