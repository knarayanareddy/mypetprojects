import Link from "next/link";

export const metadata = { title: "Hackathon strategy · SO-101 Command Deck" };

const SENSORS = [
  { s: "Front/top USB camera (640×480 @ 30)", need: "Required", why: "Every learned policy (ACT, Diffusion, SmolVLA, π0, MolmoAct 2) needs it; also vision-based sorting, inspection, Connect-4, shell game.", use: "sorter, pills, connect4, shellgame, inspect, touch" },
  { s: "Wrist camera (small UVC module on the gripper)", need: "Strongly recommended", why: "Biggest single jump in grasp success for imitation learning; essential for peg insertion & EV charging.", use: "peg, evcharge, seedling" },
  { s: "Third-person overview camera (both workspaces)", need: "Recommended for 2 arms", why: "MolmoAct 2 recommends a third-person view; gives AprilTag-based arm-to-arm calibration.", use: "handover, cupstack" },
  { s: "AprilTags (printed) on the table", need: "Recommended", why: "Pixel→table homography and arm-to-arm transform so scripted IK skills hit real object positions.", use: "all scripted skills" },
  { s: "Load cell + HX711 (scale)", need: "Optional", why: "Closed-loop pouring to a target weight.", use: "barista" },
  { s: "Soil-moisture sensor (ESP32/Arduino)", need: "Optional", why: "Real trigger for the plant caretaker.", use: "plant, seedling" },
  { s: "High-FPS camera (60+ FPS)", need: "Optional", why: "Ball tracking for ≤100 ms reaction.", use: "goalkeeper" },
  { s: "Microphone / contact mic", need: "Optional", why: "Score piano/drum timing, voice commands.", use: "piano, drums" },
  { s: "Depth camera (RealSense D405/D435)", need: "Optional", why: "True 3-D object poses, MediaPipe depth for hand tracking.", use: "mirror, inspect" },
  { s: "Servo current/temperature (built in)", need: "Free", why: "Gripper load = grasp detection; temperature = thermal protection. Shown in the Control Center.", use: "all" },
];

const PLAN = [
  ["Hours 0–3", "Unbox, set motor IDs, assemble, calibrate both arms. Connect them in the Control Center (Web Serial) and confirm teleop mirroring works."],
  ["Hours 3–6", "Mount cameras rigidly. Align each follower to the sim (Calibration → align). Run 2–3 scripted skills on hardware (sorter, piano, drums) — instant, reliable demo material."],
  ["Hours 6–12", "Record 50+ episodes for ONE flagship task (e.g. cube → bin) with variation (5 positions × 10). Start ACT training in the background."],
  ["Hours 12–18", "Deploy ACT through the policy server; compare against the scripted skill live. If time allows fine-tune SmolVLA for language-conditioned multi-task."],
  ["Hours 18–22", "Polish the story: two-arm handover or Connect-4 duel between two different models. Record a clean video of every demo."],
  ["Hours 22–24", "Freeze. Rehearse. Keep the scripted fallback ready — judges forgive nothing but a dead demo."],
];

export default function Strategy() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold">Hackathon strategy</h1>
        <p className="mt-1 max-w-3xl text-slate-400">How to turn two SO-101 arms plus this toolkit into a demo that wins — and what not to waste time on.</p>
      </div>

      <section className="card p-5">
        <h2 className="text-xl font-bold">Would using “visionary” raise your chances?</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          <p>
            <b className="text-slate-100">Relevance:</b> high for the SO-101 — its robot world model was trained on community SO-101 data (plus SOAR and BridgeData V2) and the code lives in the same ecosystem as your hardware.
          </p>
          <p>
            <b className="text-slate-100">But:</b> it is a <i>world model</i> (predicts video from actions), not a controller. Swapping it in for ACT/SmolVLA does nothing to make the arms move. Its value is as a <b>verifier/planner</b>: sample several action chunks, imagine each outcome, execute the best; or rank policy checkpoints without touching hardware.
          </p>
          <p>
            <b className="text-slate-100">Recommendation:</b> make ACT (and optionally SmolVLA) your critical path. If you have a spare GPU and an hour after your demo works, wire Visionary as an “imagination preview” panel — it is a strong <i>narrative</i> (“the robot dreams the move before executing it”) and judges for novelty will notice. Do <b>not</b> make it a dependency of the main demo, and verify weights are available first.
          </p>
          <p className="text-slate-500">Expected impact on score: novelty/storytelling — moderate-to-high if it works; task success — ~none; schedule risk — high. Use the Model hub matrix to see how each acting model is expected to behave per use case.</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Sensors — what to ask for</h2>
        <div className="card scroll-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="p-3">Sensor</th>
                <th>Need</th>
                <th>Why</th>
                <th>Use cases</th>
              </tr>
            </thead>
            <tbody>
              {SENSORS.map((r) => (
                <tr key={r.s} className="border-t border-slate-800/70 align-top">
                  <td className="p-3 font-medium">{r.s}</td>
                  <td className={r.need.startsWith("Required") ? "text-red-300" : r.need.startsWith("Strongly") || r.need.startsWith("Recommended") ? "text-amber-300" : "text-slate-400"}>{r.need}</td>
                  <td className="pr-3 text-slate-300">{r.why}</td>
                  <td className="text-xs text-slate-400">{r.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">24-hour plan</h2>
        <div className="space-y-2">
          {PLAN.map(([t, d]) => (
            <div key={t} className="card flex gap-4 p-3 text-sm">
              <div className="w-28 shrink-0 font-semibold text-[#ff7a1a]">{t}</div>
              <div className="text-slate-300">{d}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 text-sm">
          <h3 className="font-semibold text-slate-100">Demos that show off the hardware</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
            <li><b>Two models duel</b> in Connect-4 or cup stacking (ACT arm vs SmolVLA arm).</li>
            <li><b>Mid-air handover</b> assembly — the signature bimanual skill.</li>
            <li><b>Mirror Me</b> with a webcam: the audience controls the robots.</li>
            <li><b>Drum duo</b> for the crowd — scripted, reliable, loud.</li>
            <li><b>Stop-motion</b> film made by the robots, played back on the big screen.</li>
          </ul>
        </div>
        <div className="card p-4 text-sm">
          <h3 className="font-semibold text-slate-100">Risk list</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
            <li>Servo overheating — watch the °C column; add pauses.</li>
            <li>Camera moved after recording → retrain. Tape it down.</li>
            <li>Too little data variation → memorised trajectory. Vary positions deliberately.</li>
            <li>USB port conflicts — only ONE program may hold a serial port (LeRobot <i>or</i> the browser).</li>
            <li>Power: use the supplies that match the servo voltage; keep spare cables.</li>
            <li>Always keep the scripted skill as the fallback demo.</li>
          </ul>
        </div>
      </section>

      <div className="flex gap-3">
        <Link href="/playground" className="btn btn-primary">Open the playground</Link>
        <Link href="/control" className="btn">Open the control center</Link>
      </div>
    </div>
  );
}
