#!/usr/bin/env python3
"""
policy_server.py – tiny HTTP model server for the deck's “HTTP endpoint” policy transport (stdlib only, CORS enabled).

  python policy_server.py --demo wave        # no model needed: proves the browser → model → arm loop
  python policy_server.py --demo hold

Plug in your own model by editing `predict()` – it receives exactly what the deck POSTs:
  { "task": str, "arms": 1|2, "state": [6|12 floats], "state_by_arm": {"A":[6],"B":[6]},
    "joint_names": [...], "images": {"top": "<b64 jpeg>", ...}, "timestamp": float }
and returns   { "actions": [[6|12 floats], ...] }     (absolute LeRobot-normalised joints: ±100, gripper 0‥100)

IMPORTANT: real Hugging Face / LeRobot checkpoints (ACT, Diffusion, SmolVLA, pi0, GR00T …) should be run through the
bridge → `lerobot-rollout` path (Models → “Python bridge + LeRobot”). That is the officially supported, tested route and it
runs at the robot's control frequency with the policy's own pre/post-processors. Use this HTTP path for your own research
models, remote GPU servers, or VLM planners, where a few-hundred-ms round trip per action chunk is acceptable.
"""
import argparse
import json
import math
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

STATE = {"t0": time.time()}


def predict(req: dict, demo: str) -> list:
    state = req.get("state") or [0.0] * 6
    n = len(state)
    if demo == "hold" or n % 6:
        return [list(state)] * 8
    t = time.time() - STATE["t0"]
    out = []
    for k in range(8):
        a = list(state)
        for arm in range(n // 6):
            o = arm * 6
            a[o + 0] = 25 * math.sin(t + k * 0.1 + arm)       # shoulder_pan
            a[o + 5] = 40 + 30 * math.sin(2 * t + k * 0.2)    # gripper
        out.append(a)
    return out


class H(BaseHTTPRequestHandler):
    demo = "wave"

    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("access-control-allow-origin", "*")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in (("access-control-allow-origin", "*"), ("access-control-allow-headers", "content-type"), ("access-control-allow-methods", "GET,POST,OPTIONS")):
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        self._send(200, {"ok": True, "demo": self.demo}) if self.path.startswith("/health") else self._send(404, {"error": "not found"})

    def do_POST(self):
        if not self.path.startswith("/predict"):
            return self._send(404, {"error": "not found"})
        try:
            req = json.loads(self.rfile.read(int(self.headers.get("content-length", 0))) or b"{}")
            self._send(200, {"actions": predict(req, self.demo)})
        except Exception as e:  # noqa
            self._send(500, {"error": str(e)})

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--demo", choices=["wave", "hold"], default="wave")
    a = ap.parse_args()
    H.demo = a.demo
    print(f"policy server ({a.demo}) on http://{a.host}:{a.port}")
    ThreadingHTTPServer((a.host, a.port), H).serve_forever()
