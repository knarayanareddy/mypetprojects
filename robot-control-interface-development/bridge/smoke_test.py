#!/usr/bin/env python3
"""Smoke-test a running policy server:  python bridge/smoke_test.py [http://localhost:8787]"""
import json
import sys
import urllib.request

base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8787").rstrip("/")


def call(path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(base + path, data=json.dumps(body).encode() if body is not None else None, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


print("health :", call("/health"))
out = call("/predict", {"task": "test", "state": [0, 0, 0, 0, 0, 50], "images": {}, "arm": "a", "fps": 30})
print("predict:", len(out["actions"]), "steps x", len(out["actions"][0]), "dims in", out.get("latency_ms"), "ms")
