import { useEffect, useState } from 'react';

interface CodeBlock {
  title: string;
  code: string;
}
interface Note {
  kind: 'tip' | 'warn';
  text: string;
}
interface Step {
  title: string;
  phase: 'Software' | 'Hardware' | 'Bring-up';
  time: string;
  summary: string;
  bullets: string[];
  screws?: string[];
  code?: CodeBlock[];
  notes?: Note[];
}

export const STEPS: Step[] = [
  {
    title: 'Install LeRobot & configure the motors',
    phase: 'Software',
    time: '25 min',
    summary:
      'Every STS3215 ships with ID 1. Before anything is bolted together, give each motor a unique ID (1–6) and the same baudrate. This is written to EEPROM, so you only do it once.',
    bullets: [
      'Install LeRobot with the Feetech extra, then discover the USB port of each controller board with lerobot-find-port (unplug when asked).',
      'Run lerobot-setup-motors for the follower and again for the leader. It will ask you to connect ONE motor at a time: gripper → wrist_roll → wrist_flex → elbow_flex → shoulder_lift → shoulder_pan.',
      'After each motor is configured, leave its short 3-pin cable on it – you will daisy-chain them later.',
      'Using a Waveshare board? Put both jumpers on channel B (USB).',
    ],
    code: [
      {
        title: 'Install',
        code: `conda create -y -n lerobot python=3.10
conda activate lerobot
conda install ffmpeg -c conda-forge
git clone https://github.com/huggingface/lerobot.git
cd lerobot
pip install -e ".[feetech]"`,
      },
      { title: 'Find the port of each arm', code: 'lerobot-find-port' },
      {
        title: 'Set motor IDs – follower',
        code: `lerobot-setup-motors \\
    --robot.type=so101_follower \\
    --robot.port=/dev/tty.usbmodem585A0076841`,
      },
      {
        title: 'Set motor IDs – leader',
        code: `lerobot-setup-motors \\
    --teleop.type=so101_leader \\
    --teleop.port=/dev/tty.usbmodem575E0031751`,
      },
    ],
    notes: [
      { kind: 'warn', text: 'Check cabling before every Enter: power supply, USB cable, and the 3-pin cable to the single motor. A loose barrel jack is the #1 cause of "motor not found".' },
      { kind: 'tip', text: 'Stick a strip of masking tape on each motor and write its ID (1–6) and F/L (follower/leader). Leader gearing differs per joint – mixing them up is painful to debug.' },
    ],
  },
  {
    title: 'Clean the printed parts',
    phase: 'Hardware',
    time: '15 min',
    summary: 'Remove all support material so the parts sit flush against the servo faces.',
    bullets: [
      'Slip a small screwdriver under the support material and pry it away.',
      'Test-fit each motor in its pocket; lightly sand any bumps rather than forcing it.',
      'Fit one 3-pin cable into each motor now – it is much harder once the motor is enclosed.',
    ],
    notes: [{ kind: 'tip', text: 'Sort parts into a tray in assembly order: base → shoulder → upper arm → forearm → wrist → gripper. Also separate follower and leader parts.' }],
  },
  {
    title: 'Joint 1 – shoulder pan motor in the base',
    phase: 'Hardware',
    time: '10 min',
    summary: 'Motor 1 sits in the base with its shaft pointing up. It rotates everything above it.',
    bullets: [
      'Install both motor horns. Secure the TOP horn with one M3×6 screw. The bottom horn needs no screw.',
      'Place motor 1 into the base.',
      'Fasten it with 4× M2×6 (the smallest screws): two from the top and two from the bottom.',
      'Slide motor holder 1 over the motor and fasten with 2× M2×6 (one each side).',
    ],
    screws: ['4× M2×6 (motor)', '2× M2×6 (holder)', '1× M3×6 (horn)'],
  },
  {
    title: 'Joint 1 – attach the shoulder',
    phase: 'Hardware',
    time: '10 min',
    summary: 'The shoulder bracket bolts to the horn on motor 1 and carries motor 2 between its walls.',
    bullets: ['Attach the shoulder part to the horn.', 'Tighten with 4× M3×6 on top and 4× M3×6 on the bottom.', 'Add the shoulder motor holder.'],
    screws: ['8× M3×6'],
    notes: [{ kind: 'warn', text: 'Snug, not tight. M3 screws strip printed holes very easily.' }],
  },
  {
    title: 'Joint 2 – shoulder lift & upper arm',
    phase: 'Hardware',
    time: '15 min',
    summary: 'Motor 2 does the heavy lifting – it carries every joint beyond it.',
    bullets: [
      'Install both motor horns (top horn gets the M3×6 screw).',
      'Slide motor 2 in from the top of the shoulder.',
      'Fasten it with 4× M2×6.',
      'Attach the upper arm with 4× M3×6 on each side.',
    ],
    screws: ['4× M2×6', '8× M3×6', '1× M3×6 (horn)'],
    notes: [{ kind: 'tip', text: 'On the leader arm this must be a 1/345 motor (same as the follower). Lighter ratios here make it sag under its own weight.' }],
  },
  {
    title: 'Joint 3 – elbow & forearm',
    phase: 'Hardware',
    time: '15 min',
    summary: 'Motor 3 bends the forearm. Together with motor 2 it sets how far you can reach.',
    bullets: ['Install both horns.', 'Insert motor 3 and fasten with 4× M2×6.', 'Connect the forearm to motor 3 using 4× M3×6 on each side.'],
    screws: ['4× M2×6', '8× M3×6', '1× M3×6 (horn)'],
  },
  {
    title: 'Joint 4 – wrist flex',
    phase: 'Hardware',
    time: '10 min',
    summary: 'Motor 4 pitches the gripper up and down.',
    bullets: ['Install both horns.', 'Slide over motor holder 4.', 'Slide in motor 4.', 'Fasten motor 4 with 4× M2×6.'],
    screws: ['4× M2×6', '1× M3×6 (horn)'],
  },
  {
    title: 'Joint 5 – wrist roll',
    phase: 'Hardware',
    time: '10 min',
    summary: 'Motor 5 rolls the gripper around its own axis.',
    bullets: [
      'Insert motor 5 into the wrist holder and secure it with 2× M2×6 front screws.',
      'Install only ONE motor horn on the wrist motor and secure it with one M3×6 horn screw.',
      'Secure the wrist to motor 4 with 4× M3×6 on both sides.',
    ],
    screws: ['2× M2×6', '8× M3×6', '1× M3×6 (horn)'],
  },
  {
    title: 'Gripper (follower) / Handle (leader)',
    phase: 'Hardware',
    time: '15 min',
    summary: 'The end effector. On the follower it is a claw; on the leader it is a handle with a trigger.',
    bullets: [
      'Attach the gripper (or handle) to motor 5: fix it on the wrist motor horn with 4× M3×6.',
      'Insert the gripper motor and secure with 2× M2×6 on each side.',
      'Install both horns on the gripper motor; top horn gets an M3×6 screw, the bottom horn none.',
      'Follower: install the moving claw and secure with 4× M3×6 on both sides. Leader: fit the trigger the same way.',
    ],
    screws: ['4× M3×6', '4× M2×6', '4× M3×6 (claw)', '1× M3×6 (horn)'],
    notes: [{ kind: 'tip', text: 'Add rubber / TPU pads to the finger faces and a wrist camera on the fixed jaw – it greatly improves learned policies.' }],
  },
  {
    title: 'Cable up & clamp down',
    phase: 'Hardware',
    time: '10 min',
    summary: 'Daisy-chain the 3-pin cables from the gripper back to the shoulder, plug the first motor into the controller board, and clamp the base to the table.',
    bullets: [
      'Plug the gripper motor cable into the wrist-roll motor, then onward: roll → flex → elbow → lift → pan. Finally pan (ID 1) goes into the controller board.',
      'Mount the controller board to the base. Connect power + USB-C.',
      'Use 2 clamps per arm on the table edge. Route cables with a little slack so no joint can pull them tight.',
      'Power rules: follower motors 7.4 V version → 5–6 V supply; 12 V version → 12 V 5 A+. Leader is always the 7.4 V variant.',
    ],
    notes: [{ kind: 'warn', text: 'Never plug a 12 V supply into a board that drives 7.4 V motors – you will cook the servos.' }],
  },
  {
    title: 'Calibrate both arms',
    phase: 'Bring-up',
    time: '10 min',
    summary: 'Calibration makes the leader and follower report identical numbers at identical physical poses. It is what lets a neural net trained on one robot work on another.',
    bullets: [
      'Move the arm to the middle of every joint range and press Enter.',
      'Then move every joint through its entire range of motion (the script records min / max). Press Enter again.',
      'Do the follower first, then the leader. Use the same --id each time so LeRobot reuses the calibration file.',
    ],
    code: [
      {
        title: 'Follower',
        code: `lerobot-calibrate \\
    --robot.type=so101_follower \\
    --robot.port=/dev/tty.usbmodem58760431551 \\
    --robot.id=my_awesome_follower_arm`,
      },
      {
        title: 'Leader',
        code: `lerobot-calibrate \\
    --teleop.type=so101_leader \\
    --teleop.port=/dev/tty.usbmodem58760431551 \\
    --teleop.id=my_awesome_leader_arm`,
      },
    ],
  },
  {
    title: 'Teleoperate, record, train',
    phase: 'Bring-up',
    time: 'the rest of the hackathon',
    summary: 'Your arms are ready to learn. Drive the follower with the leader, record demonstrations, then train an ACT policy that does the task on its own.',
    bullets: [
      'First check that teleoperation feels right. If a joint moves the wrong way, recalibrate.',
      'Record 30–50 consistent episodes of ONE task. Vary object position slightly; keep lighting stable.',
      'Train on a GPU (a free Colab works) and run the policy with lerobot-record --policy.path=…',
      'Flags evolve between releases – run each command with --help to confirm.',
    ],
    code: [
      {
        title: 'Teleoperate',
        code: `lerobot-teleoperate \\
    --robot.type=so101_follower \\
    --robot.port=/dev/tty.usbmodem58760431541 \\
    --robot.id=my_awesome_follower_arm \\
    --teleop.type=so101_leader \\
    --teleop.port=/dev/tty.usbmodem58760431551 \\
    --teleop.id=my_awesome_leader_arm`,
      },
      {
        title: 'Record a dataset',
        code: `lerobot-record \\
    --robot.type=so101_follower \\
    --robot.port=/dev/tty.usbmodem58760431541 \\
    --robot.id=my_awesome_follower_arm \\
    --robot.cameras="{ front: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30}}" \\
    --teleop.type=so101_leader \\
    --teleop.port=/dev/tty.usbmodem58760431551 \\
    --teleop.id=my_awesome_leader_arm \\
    --display_data=true \\
    --dataset.repo_id=\${HF_USER}/my_task \\
    --dataset.num_episodes=50 \\
    --dataset.single_task="Pick the cube and place it in the bin"`,
      },
      {
        title: 'Train an ACT policy',
        code: `lerobot-train \\
    --dataset.repo_id=\${HF_USER}/my_task \\
    --policy.type=act \\
    --output_dir=outputs/train/act_my_task \\
    --job_name=act_my_task \\
    --policy.device=cuda`,
      },
    ],
  },
];

const BOM: [string, string, string][] = [
  ['STS3215 servo, 7.4 V, 1/345 gear', '7', 'All 6 follower joints + leader shoulder-lift'],
  ['STS3215 servo, 7.4 V, 1/191 gear', '2', 'Leader shoulder-pan & elbow'],
  ['STS3215 servo, 7.4 V, 1/147 gear', '3', 'Leader wrist-flex, wrist-roll, gripper'],
  ['Bus-servo controller board', '2', 'Waveshare / Feetech URT-1 – one per arm'],
  ['USB-C cables', '2', 'Board → laptop'],
  ['Power supplies', '2', '5–6 V for 7.4 V motors (12 V 5 A+ only for optional 12 V follower motors)'],
  ['3-pin servo cables', '12+', 'Daisy-chain, one per motor (keep spares)'],
  ['Table clamps', '4', '2 per arm'],
  ['Screw kit M2×6 / M3×6', '1', 'Plus horn screws – the smallest are M2'],
  ['3D-printed parts', '2 sets', 'Follower (claw) + leader (handle & trigger)'],
];

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
      className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:bg-white/10"
    >
      {ok ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

interface Props {
  initialStep?: number;
}

export default function BuildGuide({ initialStep = 0 }: Props) {
  const [active, setActive] = useState(initialStep);
  const [done, setDone] = useState<boolean[]>(() => {
    try {
      const raw = localStorage.getItem('so101-done');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length === STEPS.length) return arr;
      }
    } catch {
      /* ignore */
    }
    return STEPS.map(() => false);
  });

  useEffect(() => {
    setActive(initialStep);
  }, [initialStep]);
  useEffect(() => {
    try {
      localStorage.setItem('so101-done', JSON.stringify(done));
    } catch {
      /* ignore */
    }
  }, [done]);

  const step = STEPS[active];
  const progress = Math.round((done.filter(Boolean).length / STEPS.length) * 100);

  return (
    <div className="mx-auto max-w-[1300px] px-4 pb-14 pt-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Build & set-up guide</h2>
          <p className="max-w-2xl text-sm text-slate-400">
            From parts bag to a calibrated leader–follower pair, following the official LeRobot SO-101 guide. Tick steps off as you go – progress is saved in your browser.
          </p>
        </div>
        <div className="w-56">
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* stepper */}
        <nav className="space-y-1 lg:sticky lg:top-20 lg:self-start">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                active === i ? 'border-amber-400/40 bg-amber-400/10' : 'border-transparent hover:bg-white/5'
              }`}
            >
              <span
                role="checkbox"
                aria-checked={done[i]}
                onClick={(e) => {
                  e.stopPropagation();
                  setDone((d) => d.map((v, k) => (k === i ? !v : v)));
                }}
                className={`flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border text-[11px] font-bold ${
                  done[i] ? 'border-emerald-400 bg-emerald-400 text-slate-900' : 'border-white/25 text-slate-300'
                }`}
              >
                {done[i] ? '✓' : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-medium ${active === i ? 'text-white' : 'text-slate-300'}`}>{s.title}</span>
                <span className="text-[11px] uppercase tracking-wider text-slate-500">
                  {s.phase} · {s.time}
                </span>
              </span>
            </button>
          ))}
        </nav>

        {/* content */}
        <div className="space-y-6">
          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 font-bold text-slate-900">Step {active + 1} / {STEPS.length}</span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-slate-300">{step.phase}</span>
              <span className="text-slate-500">≈ {step.time}</span>
            </div>
            <h3 className="mt-3 text-xl font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.summary}</p>

            <ol className="mt-4 space-y-2.5">
              {step.bullets.map((b, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-200">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-semibold text-amber-300">{i + 1}</span>
                  <span>{b}</span>
                </li>
              ))}
            </ol>

            {step.screws && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Hardware</span>
                {step.screws.map((s) => (
                  <span key={s} className="rounded-md border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 font-mono text-xs text-violet-200">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {step.code?.map((c) => (
              <div key={c.title} className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/50">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
                  <span className="text-xs font-medium text-slate-400">{c.title}</span>
                  <CopyBtn text={c.code} />
                </div>
                <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-emerald-200">{c.code}</pre>
              </div>
            ))}

            {step.notes?.map((n, i) => (
              <div
                key={i}
                className={`mt-4 rounded-xl border p-3 text-sm leading-relaxed ${
                  n.kind === 'warn' ? 'border-rose-400/30 bg-rose-400/10 text-rose-100' : 'border-sky-400/30 bg-sky-400/10 text-sky-100'
                }`}
              >
                <span className="font-semibold">{n.kind === 'warn' ? '⚠ Careful · ' : '💡 Tip · '}</span>
                {n.text}
              </div>
            ))}

            <div className="mt-6 flex items-center justify-between">
              <button
                disabled={active === 0}
                onClick={() => setActive(active - 1)}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-30"
              >
                ← Previous
              </button>
              <button
                onClick={() => {
                  setDone((d) => d.map((v, k) => (k === active ? true : v)));
                  if (active < STEPS.length - 1) setActive(active + 1);
                }}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
              >
                {active === STEPS.length - 1 ? 'Mark finished ✓' : 'Done – next step →'}
              </button>
            </div>
          </article>

          {/* BOM */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="text-base font-semibold text-white">Bill of materials – two-arm kit (leader + follower)</h3>
            <p className="mt-1 text-xs text-slate-400">Cross-check your hackathon box against this list before you start. Quantities follow the official SO-ARM100 repo.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Part</th>
                    <th className="py-2 pr-4 font-medium">Qty</th>
                    <th className="py-2 font-medium">Used for</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {BOM.map(([a, b, c]) => (
                    <tr key={a}>
                      <td className="py-2 pr-4 text-slate-100">{a}</td>
                      <td className="py-2 pr-4 font-mono text-amber-300">{b}</td>
                      <td className="py-2 text-slate-400">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* survival */}
          <section className="grid gap-3 sm:grid-cols-2">
            {[
              ['Got two follower arms?', 'You can still run dual-arm tasks (handover, tic-tac-toe, drumming). Just teleoperate each one with a leader in turn, or script them from Python using the same joint-space API.'],
              ['Linux permissions', 'If the serial port is denied: sudo chmod 666 /dev/ttyACM0 – or add yourself to the dialout group and re-login.'],
              ['Windows', 'Ports show as COM3, COM4… – find yours in Device Manager. lerobot-find-port works there too.'],
              ['Keep a spare', 'One spare servo and a handful of 3-pin cables will save your hackathon. A flaky cable looks exactly like a dead motor.'],
            ].map(([t, b]) => (
              <div key={t} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm font-semibold text-white">{t}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{b}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
