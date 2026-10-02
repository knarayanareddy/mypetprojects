#!/usr/bin/env python3
"""
SO-101 Control Room - LeRobot bridge
====================================
Runs on the computer that has LeRobot installed (and the GPU / the robot USB cables).
The browser UI connects over a local WebSocket and can:
  * list serial ports + cameras
  * launch a WHITELISTED lerobot-* command and stream its output
  * stop it (SIGINT first = graceful, then SIGTERM/SIGKILL)

Security: binds to 127.0.0.1 only, requires the random token printed at start-up,
only runs executables from ALLOWED (no shell, argv list only).

Install:  pip install websockets pyserial      (plus: pip install lerobot[feetech])
Run:      python so101_bridge.py [--port 8765] [--host 127.0.0.1]

NOTE: only ONE process can own a serial port. Disconnect the arm in the browser
(Connect tab -> Disconnect) before launching a lerobot command that uses it.
"""
import argparse
import asyncio
import json
import os
import secrets
import shutil
import signal
import sys

try:
    import websockets
except ImportError:
    sys.exit("pip install websockets pyserial")

ALLOWED = {
    "lerobot-rollout", "lerobot-record", "lerobot-teleoperate", "lerobot-calibrate",
    "lerobot-replay", "lerobot-train", "lerobot-setup-motors", "lerobot-find-cameras",
    "lerobot-find-port",
}

TOKEN = secrets.token_urlsafe(12)
proc = None  # current subprocess
owner = None  # websocket that started it


def list_ports():
    try:
        from serial.tools import list_ports as lp
        return [{"device": p.device, "desc": p.description, "hwid": p.hwid} for p in lp.comports()]
    except Exception as e:  # pyserial missing
        return [{"device": "?", "desc": f"pyserial not installed: {e}", "hwid": ""}]


async def send(ws, **msg):
    try:
        await ws.send(json.dumps(msg))
    except Exception:
        pass


async def pump(ws, p):
    assert p.stdout is not None
    async for line in p.stdout:
        await send(ws, type="log", line=line.decode(errors="replace").rstrip())
    code = await p.wait()
    await send(ws, type="exit", code=code)


async def stop_proc():
    """Graceful stop: Ctrl-C first (LeRobot saves data / releases the motors), then terminate, then kill."""
    global proc
    p = proc
    if not p or p.returncode is not None:
        return
    if os.name == "nt":
        p.terminate()  # Windows cannot deliver SIGINT to a child process
    else:
        p.send_signal(signal.SIGINT)
    try:
        await asyncio.wait_for(p.wait(), 8)
    except asyncio.TimeoutError:
        p.terminate()
        try:
            await asyncio.wait_for(p.wait(), 4)
        except asyncio.TimeoutError:
            p.kill()


async def handle(ws):
    try:
        await handle_inner(ws)
    finally:
        # Browser tab closed / network dropped: never leave a robot program running unattended.
        if owner is ws:
            await stop_proc()


async def handle_inner(ws):
    global proc, owner
    authed = False
    async for raw in ws:
        try:
            m = json.loads(raw)
        except Exception:
            continue
        if not authed:
            if m.get("type") == "hello" and secrets.compare_digest(str(m.get("token", "")).encode(), TOKEN.encode()):
                authed = True
                await send(ws, type="hello", ok=True, python=sys.version.split()[0],
                           lerobot={n: bool(shutil.which(n)) for n in sorted(ALLOWED)})
            else:
                await send(ws, type="error", message="bad token")
                await ws.close()
                return
            continue
        t = m.get("type")
        if t == "ports":
            await send(ws, type="ports", ports=list_ports())
        elif t == "run":
            argv = m.get("argv", [])
            if not isinstance(argv, list) or not argv or argv[0] not in ALLOWED or not all(isinstance(a, str) for a in argv):
                await send(ws, type="error", message=f"command not allowed: {argv[:1] if isinstance(argv, list) else argv}")
                continue
            if proc and proc.returncode is None:
                await send(ws, type="error", message="a command is already running; stop it first")
                continue
            exe = shutil.which(argv[0])
            if not exe:
                await send(ws, type="error", message=f"{argv[0]} not found in PATH. Activate your lerobot environment first.")
                continue
            await send(ws, type="log", line="$ " + " ".join(argv))
            proc = await asyncio.create_subprocess_exec(
                exe, *argv[1:], stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
                stdin=asyncio.subprocess.PIPE, env={**os.environ, "PYTHONUNBUFFERED": "1"},
            )
            owner = ws
            asyncio.create_task(pump(ws, proc))
        elif t == "stdin" and proc and proc.returncode is None and proc.stdin:
            proc.stdin.write((str(m.get("text", "")) + "\n").encode())
            await proc.stdin.drain()
        elif t == "stop" and proc and proc.returncode is None:
            await stop_proc()


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    a = ap.parse_args()
    print(f"SO-101 bridge listening on ws://{a.host}:{a.port}")
    print(f"TOKEN: {TOKEN}   (paste into the Models tab)")
    async with websockets.serve(handle, a.host, a.port):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
