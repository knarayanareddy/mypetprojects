# Model bridge (policy server)

```
┌──────────── browser (this Next.js app) ────────────┐        ┌──────── your GPU box / laptop ────────┐
│ cameras ─┐                                          │  HTTP  │ bridge/policy_server.py               │
│ Web Serial ⇄ Feetech STS3215 servos (follower/leader)│ ─────▶ │  POST /predict {task,state,images}    │
│ PolicyRunner: queue action chunks, run at 30 Hz     │ ◀───── │  → LeRobot ACT / Diffusion / SmolVLA  │
└─────────────────────────────────────────────────────┘ chunks │    / pi0 / pi0.5 / GR00T / your own   │
                                                               └───────────────────────────────────────┘
```

The browser owns the robot (so you do **not** need LeRobot running on the machine that
is plugged into the arms) and the server owns the model. They can be the same laptop or
a cloud GPU.

## Run

```bash
pip install -r bridge/requirements.txt
python bridge/policy_server.py --mock                                  # connectivity test, no model
python bridge/policy_server.py --policy-path $HF_USER/act_pick --policy-type act
python bridge/policy_server.py --policy-path $HF_USER/my_smolvla --policy-type smolvla --device cuda
python bridge/smoke_test.py http://localhost:8787
```

Then open **Control center → Model**, set the endpoint (`http://localhost:8787`), press *Health*,
choose arms / task and press *Start policy*. Use **Demo loopback** to test the whole browser
pipeline without any server. You can hot-swap models with *Load model on server*.

> Browsers allow `https` pages to call `http://localhost`. For a remote GPU box serve it over
> https (reverse proxy / tunnel) or run this app locally.

## HTTP contract

`POST /predict`
```jsonc
{
  "task": "Pick up the cube and put it in the bin",     // ignored by ACT/Diffusion, used by VLAs
  "state": [/* 6 per arm, LeRobot-normalised: joints ±100, gripper 0..100 */],
  "images": { "front": "<base64 jpeg>", "wrist": "<base64 jpeg>" },
  "arm": "a" | "b" | "both",
  "fps": 30
}
→ { "actions": [[…6 or 12 numbers…], …], "latency_ms": 41.2 }
```
Camera keys are matched to the policy's `observation.images.<key>`; rename your cameras when
recording (`front`, `wrist`) and everything lines up. A single-arm (6-D) policy is run once
per arm on the same images when you select **A + B**.

To plug in **any other model** (GR00T N1.5, MolmoAct 2, your own PyTorch/ONNX model) implement
the same `/health` + `/predict` endpoints, or subclass `Holder.predict` in `policy_server.py`.

## Visionary / world models

`POST /imagine` is a stub (HTTP 501). A sensible integration (see the Model hub page):
receive the current camera frames and N candidate action chunks sampled from your policy,
roll each out in the world model, score the predicted futures (goal-image similarity or a VLM
judge) and return the best chunk index — then call this from `predict`.
Check that the world-model weights are actually available before building on it.

## Sensors

Required: one fixed front/top camera. Recommended: wrist camera. Optional per use case
(load cell, soil sensor, high-FPS camera, depth camera, microphone) — see **Hackathon strategy**.
