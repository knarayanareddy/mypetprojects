# SO-101 Command Deck

Build it · simulate it · operate it. A Next.js + PostgreSQL workspace for **two SO-101 arms** (LeRobot / Hugging Face):

| Page | What it does |
| --- | --- |
| `/explode` | Interactive exploded view of the follower **and** leader arm: 17 parts, per-part explanation, screws, gear ratios, assembly-order filter, x-ray. |
| `/build` | Build & setup guide (parts → motor IDs → assembly → calibration → teleop → dataset → training → deployment → two-arm layout) with copy-paste commands and saved checklist. |
| `/playground` | 24 simulated use cases for two arms (music, home care, games & magic, industry & lab, out-of-the-box). Pick a model (ACT, Diffusion, SmolVLA, π0, π0.5, GR00T, MolmoAct 2, …) and the sim emulates its lag, jitter, stalls and missed grasps. |
| `/models` | Model hub: catalog, a per-use-case expected-performance matrix, the *visionary* verdict, and a registry (stored in PostgreSQL) for your own checkpoints / endpoints. |
| `/control` | **Control center**: Web Serial driver for Feetech STS3215 servos (follower + leader × 2), calibration (LeRobot-compatible JSON in/out), leader→follower mirroring, manual/keyboard jog, natural-language → skill runner (sim or real arms), voice input, camera streaming, remote policy runner, recording/replay, run history, E-stop. |
| `/strategy` | Hackathon strategy: is *visionary* worth it, sensors to request, 24-hour plan, risks. |

## Architecture

```
Browser (Next.js app) ── Web Serial ──▶ Feetech STS3215 servos   (src/lib/feetech.ts, hub.ts, calibration.ts)
        │  cameras (getUserMedia)
        ├── scripted IK skills  ◀── same programs as the Playground (src/lib/scenarios/*, sim.ts)
        └── HTTP /predict ─────▶ bridge/policy_server.py ─▶ LeRobot policies (ACT, Diffusion, SmolVLA, π0, …)
PostgreSQL (Drizzle): registered models, task run history, recorded trajectories
```

* Hardware needs desktop **Chrome/Edge** (Web Serial). Close LeRobot first — only one program may hold the serial port.
* Joint values use LeRobot's convention (±100, gripper 0–100), so policies trained on LeRobot data plug straight in. Import `~/.cache/huggingface/lerobot/calibration/**.json` or calibrate in the browser.
* Simulator ↔ hardware alignment: put the arm in the sim rest pose and press **Align sim to this pose** (per arm).
* Table frame (cm): x → right, y → up, z → towards you; arm A base `(−16, −14)`, arm B base `(+16, −14)`.

## Model bridge

See [`bridge/README.md`](bridge/README.md). Quick start: `python bridge/policy_server.py --mock`, then Control center → Model → *Health* → *Start policy* (or use the built-in **Demo loopback**).

## Optional: LLM instruction planner

`/api/plan` maps instructions to skills with a keyword router. Set `LLM_API_KEY` (and optionally `LLM_BASE_URL`, `LLM_MODEL`) to use any OpenAI-compatible chat API instead.

## Develop

```bash
npm install
npx drizzle-kit push      # creates robot_models, task_runs, recordings
npm run dev
```

## Safety

Start with low speed/torque limits, keep clear of the arms' swing radius, keep a hand on the E-stop (Space bar), and never demo with real medication. Hardware paths were written from the Feetech/LeRobot documentation and have not been exercised on physical arms inside this build environment — test slowly, one arm at a time.
