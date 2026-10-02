import { ReactNode } from "react";
import { Badge, Card, Code } from "../components/ui";

const Row = ({ n, issue, status, fix }: { n: number; issue: string; status: ReactNode; fix: ReactNode }) => (
  <tr className="border-t border-slate-800/70 align-top">
    <td className="py-2 pr-2 font-mono text-slate-500">{n}</td>
    <td className="py-2 pr-3 text-slate-200">{issue}</td>
    <td className="py-2 pr-3">{status}</td>
    <td className="py-2 text-slate-300">{fix}</td>
  </tr>
);

const Step = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => (
  <div className="flex gap-3">
    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-slate-950">{n}</div>
    <div className="min-w-0 flex-1 space-y-1.5 text-xs leading-relaxed text-slate-300"><h4 className="text-sm font-semibold text-slate-100">{title}</h4>{children}</div>
  </div>
);

export default function GoLive() {
  return (
    <div className="space-y-4">
      <Card title="Go-live checklist — from unboxed arms to a verified pick & place" right={<Badge tone="green">hardware path</Badge>}>
        <div className="space-y-4">
          <Step n={1} title="One USB adapter per arm (follower and leader each need their own)">
            Web Serial grants one port per <i>Connect</i> click, and two SO-101s cannot share a bus (ids 1–6 would collide). The deck now refuses to attach the same port twice and warns about ids &gt; 6 on a bus.
            Plug the adapters in, then Hardware → <b>Connect</b> on each card and pick the matching port in the browser dialog. Unsure which is which? Unplug one – the dialog list changes – or use <code>lerobot-find-port</code>.
          </Step>
          <Step n={2} title="Calibration must say “ok” before torque is allowed">
            LeRobot writes <b>homing offset + min/max limits into each servo’s EEPROM</b>; the servo then reports homed positions. On connect the deck reads that EEPROM and compares it with the saved calibration:
            <ul className="list-inside list-disc"><li><b>ok</b> – matches (or the servos were LeRobot-calibrated and the deck imported them).</li>
              <li><b>mismatch</b> – click <i>Write saved calibration to servos</i> (what <code>lerobot-calibrate</code> does when you press ENTER), or recalibrate.</li>
              <li><b>none</b> – run Hardware → Calibration (steps 1 · Set homing, 2 · sweep, 3 · Finish). The result is LeRobot-compatible JSON <i>and</i> already in the servos, so <code>lerobot-teleoperate</code>/<code>rollout</code> agree with the deck.</li></ul>
          </Step>
          <Step n={3} title="Torque test with the E-stop in reach">
            Control → Torque ON (arm holds position, no jump: goal := present is written before torque). Move one slider by a few units. Press <kbd>Space</kbd> – torque must drop on every arm immediately. Keep the speed cap low for the first run.
          </Step>
          <Step n={4} title="Calibrate the camera → table (≈2 min, once per camera position)">
            Hardware → <b>Vision</b>. Stick 4 tape marks on the table, measure their position in cm from the arm bases (defaults: (−20,−10), (20,−10), (20,8), (−20,8); x=0 midway between the arms, z=0 is the line 14 cm in front of the bases, −z away from you). Click each mark in the live image, press <i>Solve</i>.
            Residual error shows in cm – re-click if &gt; 0.8 cm. Then <i>Detect</i> – coloured cubes appear at their measured positions; <i>Click-to-reach</i> hovers the gripper over any spot you click, which is the best end-to-end check of the whole chain.
          </Step>
          <Step n={5} title="Tune grasp sensing with the “Test grasp” button">
            Hardware → <b>Grasp sensing</b>. Put your real object between the jaws (arm in a safe pose), press <i>Close & measure</i>. A good grasp shows <i>gap ≥ 8</i> and <i>load ≥ 90‰</i>; closing on nothing shows gap ≈ 0. Adjust the two thresholds if your object is small/soft. Missions then <b>decide success from the servo, not from a random number</b>, and retry up to 3×.
          </Step>
          <Step n={6} title="Run Pick & place on hardware">
            Missions → Pick &amp; place, tick <b>Drive real arms</b> and <b>Use vision</b> (Control/Settings). Every pick: camera finds the cube → IK → close → stall check → lift → slip check. If the camera cannot see the cube on a real arm, the skill stops instead of reaching into empty air.
          </Step>
          <Step n={7} title="Learned policies (bridge)">
            Python bridge + <code>lerobot-rollout</code> – Models tab. Needs LeRobot installed on the PC with the arms. Camera names in the LeRobot camera dict must match the ones the policy was trained with.
          </Step>
        </div>
      </Card>

      <Card title="Independent review → what was checked and what changed" right={<Badge tone="amber">verified against huggingface/lerobot main</Badge>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[11px]">
            <thead><tr className="text-left text-slate-500"><th>#</th><th>Review finding</th><th>Verdict</th><th>Fix</th></tr></thead>
            <tbody>
              <Row n={1} issue="Grasp success was Math.random()" status={<Badge tone="red">confirmed</Badge>}
                fix={<>Real arms: success = gripper settled <code>gripGap</code> above commanded closure <b>and</b> servo <code>Present_Load</code> ≥ threshold (stall on an object), re-checked after the lift to catch slips. Sim: geometric tip-to-object distance. The model “miss rate” is now <i>aim error in cm</i> in simulation only; it is never applied to hardware.</>} />
              <Row n={2} issue="No camera → world calibration" status={<Badge tone="red">confirmed</Badge>}
                fix={<>New <code>vision.ts</code>: 4+-point homography (DLT, Hartley-normalised, unit-tested to 1e-14 cm exact / 0.18 cm at ±1.5 px click noise), colour-blob detection, <code>hub.relocate()</code> before every pick, click-to-reach. Single plane: objects are assumed to lie on the table.</>} />
              <Row n={3} issue="lerobot-record --policy.path removed upstream" status={<Badge tone="red">confirmed</Badge>}
                fix={<>Upstream <code>RecordConfig</code> now raises “use lerobot-rollout”. The bridge launches <code>lerobot-rollout --strategy.type=base --policy.path=… --task=… --duration=…</code> (+ <code>--inference.type=rtc</code> for slow VLAs), and uses <code>bi_so_follower</code> for two arms.</>} />
              <Row n={4} issue="Dead import lerobot.robots.so101_follower" status={<Badge tone="red">confirmed</Badge>}
                fix={<>Imports <code>lerobot.robots.so_follower</code> / <code>lerobot.teleoperators.so_leader</code> with fallback to the old paths. Also: upstream <code>SOFollower.connect()</code> ends inside <code>torque_disabled()</code> which <b>re-enables torque with a stale goal</b> – the bridge sets goal := present first and starts limp.</>} />
              <Row n={5} issue="homing_offset parsed and ignored" status={<Badge tone="amber">confirmed – subtler</Badge>}
                fix={<>LeRobot never applies it in software; it writes it to servo register 31 (sign-magnitude bit 11) with limits in 9/11. The deck now reads/writes/compares exactly those registers (<code>readCalibration · writeCalibration · setHalfTurnHomings · matchesMotors</code>), blocks torque on mismatch, and its own calibration wizard performs LeRobot’s homing + range procedure.</>} />
              <Row n={6} issue="Two arms, one serial path" status={<Badge tone="amber">partly</Badge>}
                fix={<>Each arm/role already had its own <code>SerialLink</code> (correct – needs separate adapters). Added: duplicate-port detection, missing-id and foreign-id warnings, and docs. Dual-bus operation is exercised in the bridge mock; on real adapters it is <b>unverified here</b>.</>} />
              <Row n={7} issue="models.ts is a catalogue, not an integration" status={<Badge tone="green">agreed</Badge>}
                fix={<>Kept honest: “Simulator profile” only shapes the <i>simulation</i>. The real model path is Models → <b>Python bridge + LeRobot</b> (rollout) or <b>HTTP endpoint</b>. visionary stays <code>runnable: false</code>.</>} />
              <Row n={+8} issue="(found while fixing) Present_Speed decoded with sign bit 10" status={<Badge tone="red">new bug</Badge>}
                fix={<>Upstream table: Present_Load → bit 10, Present_Speed → bit 15. Fixed.</>} />
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="What is NOT verified (be honest in your demo)">
        <ul className="list-inside list-disc space-y-1 text-xs text-slate-300">
          <li>No physical SO-101 was available in the build environment. Register addresses, packet framing, calibration semantics and CLI flags were diffed against LeRobot source; the bridge protocol and homography/blob math were executed (mock bridge + synthetic images).</li>
          <li>Grasp thresholds (<code>gripGap</code>, <code>gripLoad</code>) are sensible defaults for a ~2.5 cm cube, not measured on your gripper. Use the <i>Test grasp</i> tool.</li>
          <li>Overhead camera assumption: objects on the table plane, near-vertical view. Tall objects shift the centroid; keep the camera high or use cubes ≤ 3 cm.</li>
          <li>Policies: the deck launches and supervises <code>lerobot-rollout</code>; how well a given checkpoint performs on your arm is down to training data, not this UI.</li>
        </ul>
        <p className="mt-2 text-[11px] text-slate-500">Sensors needed: 1 × USB webcam overhead (required for vision), 1 × wrist camera (recommended for policies), servo load/current (built in – STS3215). No force sensors required.</p>
        <div className="mt-3"><Code>{`# sanity commands
lerobot-find-port
lerobot-calibrate --robot.type=so101_follower --robot.port=/dev/ttyACM0 --robot.id=follower_a
python bridge/so101_bridge.py --mock     # protocol check without hardware`}</Code></div>
      </Card>
    </div>
  );
}
