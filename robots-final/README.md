# robots-final

**SO-101 control deck** — drive the arm from the browser, and learn what each AI model does
with it.

Five pages: **Control** (live joint control), **Hardware** (servo config and wiring),
**Missions** (task library), **Models** (which model handles which job), and a **Guide** for
first-time setup.

The control layer is the interesting part — it speaks to Feetech servos over serial, runs the
forward-kinematics solver, and the generated bridge code is viewable in-app so you can see what
the UI is actually sending to the arm.

## Stack

React 19 · Vite 7 · TypeScript

## Key modules

- `src/lib/feetech.ts` — Feetech STS3215 servo protocol
- `src/lib/kin.ts` — kinematics
- `src/lib/planner.ts` — motion planning
- `src/lib/skills.ts` — skill/mission library
- `src/lib/bridgeCode.ts` — bridge code shown in-app

## Run

```bash
npm install
npm run dev
```
