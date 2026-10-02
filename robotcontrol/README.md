# SO-101 Command Deck

Browser control deck for **two SO-101 arms**: manual control, 29 scripted missions, vision-guided pick & place,
LeRobot policy rollout, record/replay — plus a Python bridge for LeRobot. Built on `robots-final`, with the
independent review's findings checked against upstream `huggingface/lerobot` and fixed.

```bash
npm install && npm run dev        # http://localhost:3000   (Chrome/Edge for Web Serial; localhost counts as secure)
python bridge/so101_bridge.py --mock    # optional: protocol test without hardware
```

Open **Guide → ★ Go-live checklist** for the step-by-step bring-up (adapters → calibration → torque test → camera → grasp tuning → pick & place → policies).

## Two ways to talk to the arms
| | Web Serial (Hardware tab → Connect) | Python bridge (`bridge/so101_bridge.py`) |
|---|---|---|
| Needs | Chrome/Edge | LeRobot installed on the PC with the arms |
| Calibration | reads/writes servo EEPROM (homing offset + limits) like LeRobot | uses LeRobot calibration files |
| Policies | HTTP endpoint (`bridge/policy_server.py` template) | `lerobot-rollout` (ACT, SmolVLA, π0, …) |
| Two arms | one adapter per arm/role, duplicate-port check | one `--follower-x` port per arm |

## What the review found, and what was done
| # | Finding | Status |
|---|---|---|
| 1 | Grasp success = `Math.random()` | **Fixed** – servo stall (gap + `Present_Load`) on hardware, re-checked after lift; geometric in sim |
| 2 | No camera → world calibration | **Fixed** – homography (4+ marks), colour-blob detection, `relocate()` before each pick, click-to-reach |
| 3 | `lerobot-record --policy.path` removed upstream | **Confirmed & fixed** – `lerobot-rollout --strategy.type=base --policy.path=…` |
| 4 | Dead `so101_follower` import | **Confirmed & fixed** – `so_follower` with fallback; goal := present before torque (upstream `connect()` re-enables torque with a stale goal) |
| 5 | `homing_offset` ignored | **Confirmed & fixed properly** – LeRobot stores it in servo reg 31; deck reads/writes/compares regs 31/9/11, blocks torque on mismatch, wizard does LeRobot's homing |
| 6 | Two arms, one serial path | **Partly** – separate links already existed; added duplicate-port/foreign-id detection. Real dual-adapter operation unverified here |
| – | New: `Present_Speed` used sign bit 10 (upstream: 15) | **Fixed** |

## Not verified
No physical SO-101 was available while building this. Register map, framing, calibration semantics and CLI flags were diffed against LeRobot
source; the bridge protocol (mock) and the homography/blob math were executed. Grasp thresholds are defaults – tune with *Hardware → Grasp sensing → Close & measure*.

## Layout
- `src/deck/` – the deck (lib: `feetech.ts`, `hub.ts`, `skills.ts`, `vision.ts`, `kin.ts`, `models.ts`; pages: Missions, Control, Models, Hardware, Guide)
- `bridge/` – `so101_bridge.py`, `policy_server.py`, `requirements.txt` (served verbatim by `/api/bridge/[file]`)
- `src/app/api/state` – Postgres backup of calibration / camera homography / settings / history (`deck_state` table)

Sensors: 1 USB webcam overhead (required for vision), optional wrist camera (policies). Servo load/current come from the STS3215s.
