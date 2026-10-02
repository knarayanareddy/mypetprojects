# SO-101 Control Room

Browser control room for SO-101 arms (Next.js). It talks to the servos **directly over Web Serial**
(Feetech STS3215 protocol, 1 Mbps), so no Python is needed to jog, teleoperate, teach/replay or run
camera-guided missions. A bridge script launches LeRobot for learned policies.

```
npm install
npm run build && npm start        # open http://localhost:3000 in desktop Chrome/Edge
npx vitest run                    # unit + simulated-arm integration tests
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
