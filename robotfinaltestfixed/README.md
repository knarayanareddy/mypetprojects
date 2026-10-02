# SO-101 Control Room

Browser control room for SO-101 arms (Next.js). It talks to the servos **directly over Web Serial**
(Feetech STS3215 protocol, 1 Mbps), so no Python is needed to jog, teleoperate, teach/replay or run
camera-guided missions. A bridge script launches LeRobot for learned policies.

```
npm install
npm run build && npm start        # open http://localhost:3000 in desktop Chrome/Edge
npm test                          # 28 unit + simulated-arm integration tests (vitest)
```

Postgres is **optional** (backup of UI state only). `.env.example` shows `DATABASE_URL`; without it the
app builds and runs, and `/api/state` returns 503, which the client ignores (localStorage is the source of truth).

## Review fixes

| Finding | Fix |
|---|---|
| **P0** build failed without Postgres (`throw` at module scope in `src/db/index.ts`) | Lazy pool (`getDb()`); nothing runs at import time. Verified by building with no `.env`. `.env.example` added. |
| **P2** RMSE badge computed on the 4 fitted points (~0 by construction) | `src/lib/vision.ts → fitAndValidate`: accuracy comes only from **held-out PROBE marks** or **leave-one-out** (≥5 fit marks). 4 fit marks and no probe → status `unvalidated`, which blocks camera missions. The in-sample number is shown greyed out as "NOT accuracy". |
| "unit-tested" claim unverifiable, zero tests | `src/lib/__tests__/` (15 tests): vision statistics (reproduces the reviewer's scenario, ±1.5 px click noise), Feetech packets, IK↔FK, and a full pick→slip-check→bin on the virtual arm through the real driver. |
| Untuned grasp thresholds | Calibrate → **Tune grasp on object** measures the stall gap/load on your real object. |
| Colour blobs fail for dark objects | Palette entries are **sampled by clicking** (works for black); **background subtraction** mode is colour independent. |
| Z error / link tolerances | **Touch table** step sets the table plane; link lengths editable; L-pose reference + direction check required by pre-flight on real hardware. |
| Learned policies "unproven" | Still true. Commands follow the LeRobot docs (`lerobot-rollout`); camera names must equal the training keys; LeRobot must be installed locally. |

## Real-hardware flow
Connect → calibrate (ranges, gripper, **L-pose**, **direction check**, table, grasp) → Vision (≥4 FIT + 2–3 PROBE marks)
→ Missions (dry run first). Software E-stop is also in the header; use a hardware switch on the PSU too.

## Honest limits
* Joint sign conventions and link lengths are defaults; the wizard measures them, but you must confirm on your arm.
* Single table-plane assumption for vision (use a depth camera to remove it).
* Web Serial and LeRobot cannot share a port: the UI releases it before launching a LeRobot command.
* Visionary is a world model (video prediction), not a controller; it is listed in Models with that caveat.

## Second review round (this revision)

| Finding | Fix |
|---|---|
| **Expert: `PROTECTION_CURRENT: 34`** is `Protective_Torque`; it was written on every connect | `REG.PROTECTION_CURRENT = 28` (2 bytes, as in LeRobot's STS3215 table). Register 34/35 are named but never written. Regression tests assert the addresses and that the gripper's 34/35 are untouched. |
| **Expert: tests never run** (vitest missing, no script) | `vitest` installed, `npm test` script, `vitest.config.ts`. |
| EEPROM writes ignored when `Lock=1` / torque on (own review) | `initFollower` now: goal=present → torque off → `Lock=0` → write **only if different** (read-back verified, throws if it did not stick) → `Lock=1`. The simulator models the EEPROM lock so this is tested. Second connect writes nothing (less EEPROM wear). |
| Homing offsets silently invalidated every stored tick value | Wizard now confirms, then resets ranges / gripper / L-pose / direction flags and tells you to redo them. |
| 25 ms bus timeout too tight for CH340/FTDI latency on Windows/macOS → motors flicker "offline" | 40 ms timeout, 3 tries per state read. |
| Pre-flight was only a disabled button | `runMission` enforces the same checks itself and logs the blockers. |
| Selecting a mission did nothing; torque had to be enabled by hand | **Scripted control**: select a mission or type an instruction → countdown (3 s min on the real arm, Cancel / Start now) → torque is enabled automatically (holding the pose) → runs. Toggle in Missions. |
| Manual controls could fight a running script | Manual controls lock while a mission/replay runs (E-STOP and Stop stay live); keyboard jogging added. |
| `tower` / `tictactoe` retried failed grasps forever | `Runner.pick` stops the mission after 4 consecutive failures. |
| `lerobot-rollout --strategy.type=base` was generated with `--teleop.*` | Teleop flags only when "attach leader" is ticked. Training uses `--policy.push_to_hub=false` and fine-tunes SmolVLA/π0 from their base checkpoints. Running via the bridge also releases the leader port and the browser webcam. |
| Bridge left a robot program running after the tab closed; Windows cannot SIGINT a child | Subprocess is stopped when its websocket drops; Windows uses terminate. Token compare is bytes-safe; argv validated. `requirements.txt` added. |

## Scripted vs manual

* **Scripted** (Missions tab): 24 missions, an instruction box ("stack 3 blocks", "draw a circle", "wave hello") and Auto-run. The instruction box is an offline keyword matcher onto the verified missions, not an LLM.
* **Manual** (Manual tab): joint sliders, Cartesian jog (IK), keyboard jog, ready / L pose, grasp, leader-follower teleop, teach & replay.
* **Learned policies** (Models tab): LeRobot commands run through the bridge. The browser releases the serial ports and webcam first.

## Still unproven (needs your hardware)
Nobody has run this on a physical SO-101 yet. First power-up checklist: hardware E-stop on the PSU, arm supported, torque off at connect, jog ±10° per joint and watch the direction check, then dry-run before the first live mission.
