#!/usr/bin/env python3
"""
SO-101 Command Deck — policy server (the "model bridge").

The browser app is the robot runtime (cameras + Web Serial to the servos).
This server is the *brain* host: it loads any LeRobot policy (ACT, Diffusion,
SmolVLA, pi0, pi0.5, GR00T, ... anything `lerobot` can load) or runs in --mock
mode, and answers action-chunk requests over a tiny HTTP contract.

    GET  /health                       -> {ok, mock, policy:{type,path,device}, imagine}
    POST /load    {path,type,device?}  -> load / hot-swap a policy (HF repo id or local dir)
    POST /predict {task,state,images,arm,fps}
                                       -> {actions:[[...],...], latency_ms}
    POST /reset                        -> clears policy queues (call between episodes)
    POST /imagine {...}                -> 501 unless you plug in a world model (e.g. Visionary)

Conventions (identical to LeRobot's SO-101 dataset format):
  * state / actions are LeRobot-normalised: 6 values per arm
      [shoulder_pan, shoulder_lift, elbow_flex, wrist_flex, wrist_roll, gripper]
    joints in [-100, 100], gripper in [0, 100].
  * images: {camera_key: base64 JPEG}; camera_key ("front", "wrist", ...) is matched
    to the policy's `observation.images.<camera_key>` input.
  * 12 numbers in `state` = both arms. If the loaded policy is single-arm (6-D) it is
    run once per arm on the same camera images and the actions are concatenated.

NOTE: written against the current LeRobot API (policy factory + pre/post-processors)
with fallbacks for older versions. Test with --mock first, then with your checkpoint.
"""
from __future__ import annotations

import argparse
import base64
import io
import math
import threading
import time
from typing import Any

import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


class PredictReq(BaseModel):
    task: str = ""
    state: list[float]
    images: dict[str, str] = Field(default_factory=dict)
    arm: str = "a"
    fps: float = 30


class LoadReq(BaseModel):
    path: str
    type: str = "act"
    device: str | None = None


class Holder:
    """Holds the currently loaded policy and does the tensor plumbing."""

    def __init__(self, mock: bool = False) -> None:
        self.mock = mock
        self.policy: Any = None
        self.pre: Any = None
        self.post: Any = None
        self.type = "mock" if mock else None
        self.path: str | None = None
        self.device = "cpu"
        self.lock = threading.Lock()
        self._phase = 0.0

    # ------------------------------------------------------------------ load
    def load(self, path: str, ptype: str, device: str | None) -> dict[str, Any]:
        import torch  # imported lazily so --mock works without torch
        from lerobot.policies.factory import get_policy_class

        if device is None:
            device = "cuda" if torch.cuda.is_available() else ("mps" if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available() else "cpu")
        cls = get_policy_class(ptype)
        policy = cls.from_pretrained(path)
        policy.to(device)
        policy.eval()
        pre = post = None
        try:  # newer LeRobot: normalisation lives in processors
            from lerobot.policies.factory import make_pre_post_processors

            pre, post = make_pre_post_processors(policy.config, pretrained_path=path)
        except Exception as e:  # noqa: BLE001
            print(f"[bridge] no pre/post processors ({e}); assuming policy normalises internally")
        with self.lock:
            self.policy, self.pre, self.post = policy, pre, post
            self.type, self.path, self.device, self.mock = ptype, path, device, False
        return {"type": ptype, "path": path, "device": device, "n_action_steps": getattr(policy.config, "n_action_steps", None)}

    # ------------------------------------------------------------- utilities
    def reset(self) -> None:
        if self.policy is not None and hasattr(self.policy, "reset"):
            self.policy.reset()

    def _state_dim(self) -> int:
        feats = getattr(getattr(self.policy, "config", None), "input_features", {}) or {}
        f = feats.get("observation.state")
        return int(f.shape[0]) if f is not None else 6

    @staticmethod
    def _decode(b64: str, size: tuple[int, int]) -> np.ndarray:
        from PIL import Image

        img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB").resize((size[1], size[0]))
        return np.asarray(img, dtype=np.float32) / 255.0  # H,W,3

    def _build_batch(self, state: list[float], images: dict[str, str], task: str) -> dict[str, Any]:
        import torch

        cfg = self.policy.config
        batch: dict[str, Any] = {"observation.state": torch.tensor(state, dtype=torch.float32).unsqueeze(0)}
        for key, feat in (getattr(cfg, "image_features", {}) or {}).items():
            cam = key.split(".")[-1]
            _, h, w = feat.shape
            b64 = images.get(cam) or (next(iter(images.values())) if images else None)
            arr = self._decode(b64, (h, w)) if b64 else np.zeros((h, w, 3), np.float32)
            batch[key] = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0)  # 1,3,H,W
        batch["task"] = [task]  # used by VLA policies, ignored by ACT/Diffusion
        return batch

    # --------------------------------------------------------------- predict
    def predict(self, req: PredictReq) -> list[list[float]]:
        if self.mock:
            return self._mock_chunk(req.state)
        if self.policy is None:
            raise RuntimeError("No policy loaded — POST /load first (or start with --policy-path / --mock)")
        import torch

        dim = self._state_dim()
        groups = [req.state[i : i + dim] for i in range(0, len(req.state), dim)] if len(req.state) > dim else [req.state]
        per_arm: list[np.ndarray] = []
        with self.lock, torch.inference_mode():
            for g in groups:
                batch = self._build_batch(g, req.images, req.task)
                if self.pre is not None:
                    batch = self.pre(batch)
                else:
                    batch = {k: (v.to(self.device) if hasattr(v, "to") else v) for k, v in batch.items()}
                n = int(getattr(self.policy.config, "n_action_steps", 10) or 10)
                if hasattr(self.policy, "predict_action_chunk"):
                    chunk = self.policy.predict_action_chunk(batch)[:, :n]  # (1,T,D)
                    steps = [chunk[:, t] for t in range(chunk.shape[1])]
                else:  # e.g. diffusion: pop n actions from the policy's internal queue
                    steps = [self.policy.select_action(batch) for _ in range(n)]
                if self.post is not None:
                    steps = [self.post(s) for s in steps]
                per_arm.append(np.stack([s.detach().float().cpu().numpy().reshape(-1) for s in steps]))  # T,D
        t = min(a.shape[0] for a in per_arm)
        out = np.concatenate([a[:t] for a in per_arm], axis=1)
        return out.astype(float).tolist()

    def _mock_chunk(self, state: list[float]) -> list[list[float]]:
        out = []
        for _ in range(30):
            self._phase += 0.07
            a = list(state)
            for i in range(0, len(a), 6):
                a[i] += 15 * math.sin(self._phase)
                a[i + 3] += 10 * math.sin(self._phase * 1.7)
                a[i + 5] = 40 + 30 * math.sin(self._phase * 2.3)
            out.append(a)
        return out


def make_app(holder: Holder) -> FastAPI:
    app = FastAPI(title="SO-101 policy server")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

    @app.get("/health")
    def health() -> dict[str, Any]:
        return {"ok": True, "mock": holder.mock, "policy": {"type": holder.type, "path": holder.path, "device": holder.device}, "imagine": False}

    @app.post("/load")
    def load(req: LoadReq) -> dict[str, Any]:
        try:
            return holder.load(req.path, req.type, req.device)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}") from e

    @app.post("/reset")
    def reset() -> dict[str, bool]:
        holder.reset()
        return {"ok": True}

    @app.post("/predict")
    def predict(req: PredictReq) -> dict[str, Any]:
        t0 = time.perf_counter()
        try:
            actions = holder.predict(req)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}") from e
        return {"actions": actions, "latency_ms": round((time.perf_counter() - t0) * 1000, 1)}

    @app.post("/imagine")
    def imagine(_: dict[str, Any]) -> None:
        # Hook for a world model such as james0248/visionary:
        #   receive {images, candidate_action_chunks} -> return predicted frames / scores.
        raise HTTPException(status_code=501, detail="No world model plugged in. Implement imagine() with your Visionary checkpoint.")

    return app


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--policy-path", help="HF repo id or local pretrained_model dir")
    ap.add_argument("--policy-type", default="act", help="act | diffusion | smolvla | pi0 | pi05 | groot | ...")
    ap.add_argument("--device", default=None)
    ap.add_argument("--mock", action="store_true", help="no model; return smooth dummy actions (connectivity test)")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8787)
    args = ap.parse_args()

    holder = Holder(mock=args.mock or not args.policy_path)
    if args.policy_path and not args.mock:
        print("[bridge]", holder.load(args.policy_path, args.policy_type, args.device))
    else:
        print("[bridge] running in MOCK mode (use /load or --policy-path for a real model)")
    uvicorn.run(make_app(holder), host=args.host, port=args.port)


if __name__ == "__main__":
    main()
