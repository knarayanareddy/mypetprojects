// Python sources shipped inside the app (downloadable from the Guide tab) so the single-file build is fully self-contained.

export const BRIDGE_PY = String.raw`#!/usr/bin/env python3
"""
so101_bridge.py - WebSocket bridge between the SO-101 Command Deck (browser) and LeRobot.

Why use it instead of Web Serial?
  * works in ANY browser (Firefox/Safari too) and on headless lab PCs / Raspberry Pi / Jetson
  * re-uses your existing LeRobot calibration files (no re-calibration in the browser)
  * can launch real LeRobot policies (ACT, Diffusion, SmolVLA, pi0, pi0.5, GR00T, MolmoAct2 ...)
    through the officially supported 'lerobot-record --policy.path=...' evaluation path

Install:   pip install websockets            (inside your lerobot environment: pip install -e ".[feetech]")
Run (2 arms, 2 leaders):
  python so101_bridge.py \
     --follower-a /dev/ttyACM0 --follower-a-id my_follower_a --leader-a /dev/ttyACM1 --leader-a-id my_leader_a \
     --follower-b /dev/ttyACM2 --follower-b-id my_follower_b --leader-b /dev/ttyACM3 --leader-b-id my_leader_b
Test the UI without hardware:   python so101_bridge.py --mock
Then in the app:  Hardware -> Python bridge -> Connect (ws://localhost:8765)
"""
import argparse, asyncio, json, shlex, subprocess, sys, time

try:
    import websockets
except ImportError:
    sys.exit("pip install websockets")

JOINTS = ["shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper"]
REST = [0.0, -100.0, 100.0, 70.0, 0.0, 0.0]


def to_vec(obs):
    return [float(obs[f"{j}.pos"]) for j in JOINTS]


def to_action(vec):
    return {f"{j}.pos": float(v) for j, v in zip(JOINTS, vec)}


class Arm:
    """One logical arm = follower (+ optional leader)."""

    def __init__(self, name, args):
        g = lambda k: getattr(args, k.replace("-", "_"))
        self.name = name
        self.mock = args.mock
        self.f_port, self.f_id = g(f"follower-{name.lower()}"), g(f"follower-{name.lower()}-id")
        self.l_port, self.l_id = g(f"leader-{name.lower()}"), g(f"leader-{name.lower()}-id")
        self.max_rel = args.max_relative_target
        self.cameras = args.cameras
        self.robot = None
        self.leader = None
        self.torque = False
        self.mock_pos = list(REST)
        self.mock_leader = list(REST)

    @property
    def enabled(self):
        return self.mock or bool(self.f_port)

    def connect(self):
        if self.mock:
            return
        if self.f_port and self.robot is None:
            from lerobot.robots.so101_follower import SO101Follower, SO101FollowerConfig
            cfg = SO101FollowerConfig(port=self.f_port, id=self.f_id or f"follower_{self.name}",
                                      max_relative_target=self.max_rel)
            self.robot = SO101Follower(cfg)
            self.robot.connect(calibrate=False)  # uses the saved calibration file for this id
            self.robot.bus.disable_torque()      # start limp; the UI enables torque explicitly
            self.torque = False
        if self.l_port and self.leader is None:
            from lerobot.teleoperators.so101_leader import SO101Leader, SO101LeaderConfig
            self.leader = SO101Leader(SO101LeaderConfig(port=self.l_port, id=self.l_id or f"leader_{self.name}"))
            self.leader.connect(calibrate=False)

    def disconnect(self):
        for dev in (self.robot, self.leader):
            try:
                if dev is not None:
                    dev.disconnect()
            except Exception as e:  # noqa
                print("disconnect warning:", e)
        self.robot = self.leader = None
        self.torque = False

    def follower_pose(self):
        if self.mock:
            return list(self.mock_pos)
        if self.robot is None:
            return None
        return to_vec(self.robot.get_observation())

    def leader_pose(self):
        if self.mock:
            return None
        if self.leader is None:
            return None
        return [float(self.leader.get_action()[f"{j}.pos"]) for j in JOINTS]

    def set_torque(self, on):
        if self.mock:
            self.torque = on
            return
        if self.robot is None:
            return
        if on:
            # goal := present BEFORE enabling torque, so the arm never jumps
            cur = self.robot.bus.sync_read("Present_Position")
            self.robot.bus.sync_write("Goal_Position", cur)
            self.robot.bus.enable_torque()
        else:
            self.robot.bus.disable_torque()
        self.torque = on

    def act(self, vec):
        if not self.torque:
            return
        if self.mock:
            self.mock_pos = [0.7 * a + 0.3 * b for a, b in zip(self.mock_pos, vec)]
            return
        self.robot.send_action(to_action(vec))  # honours max_relative_target safety clamp


class Bridge:
    def __init__(self, args):
        self.args = args
        self.arms = {n: Arm(n, args) for n in ("A", "B")}
        self.arms = {n: a for n, a in self.arms.items() if a.enabled}
        self.clients = set()
        self.proc = None
        self.policy_arms = []

    async def broadcast(self, msg):
        data = json.dumps(msg)
        for c in list(self.clients):
            try:
                await c.send(data)
            except Exception:
                self.clients.discard(c)

    async def log(self, text, level="info"):
        print(f"[{level}] {text}")
        await self.broadcast({"type": "log", "text": text, "level": level})

    def hello(self):
        return {"type": "hello", "arms": list(self.arms), "info": "mock mode" if self.args.mock else "lerobot"}

    async def state_loop(self):
        while True:
            if self.proc is None:
                msg = {"type": "state"}
                for n, a in self.arms.items():
                    try:
                        msg[n] = {"follower": a.follower_pose(), "leader": a.leader_pose(), "torque": a.torque}
                    except Exception as e:
                        await self.log(f"read error on arm {n}: {e}", "error")
                if self.clients:
                    await self.broadcast(msg)
            await asyncio.sleep(0.04)

    async def estop(self):
        await self.stop_policy(restart=False)
        for a in self.arms.values():
            try:
                a.set_torque(False)
            except Exception as e:
                print("estop:", e)
        await self.log("E-STOP: torque released", "error")

    async def start_policy(self, m):
        await self.stop_policy(restart=False)
        a = self.arms.get("A")
        if self.args.mock or a is None or not a.f_port:
            await self.broadcast({"type": "policy_status", "running": False, "text": "policy needs a real arm A (--follower-a)"})
            return
        for arm in self.arms.values():
            arm.disconnect()  # lerobot-record needs exclusive access to the serial port
        stamp = time.strftime("%Y%m%d_%H%M%S")
        cmd = [
            "lerobot-record", "--robot.type=so101_follower", f"--robot.port={a.f_port}", f"--robot.id={a.f_id or 'follower_A'}",
            "--display_data=false", f"--dataset.repo_id=local/eval_deck_{stamp}", f"--dataset.single_task={m.get('task', 'task')}",
            "--dataset.num_episodes=1", f"--dataset.episode_time_s={self.args.episode_time}", "--dataset.push_to_hub=false",
            f"--policy.path={m['repo']}",
        ]
        if a.cameras:
            cmd.append(f"--robot.cameras={a.cameras}")
        await self.log("launching: " + " ".join(shlex.quote(c) for c in cmd))
        self.proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
        await self.broadcast({"type": "policy_status", "running": True, "text": f"running {m['repo']}"})
        asyncio.create_task(self.pump())

    async def pump(self):
        proc = self.proc
        async for line in proc.stdout:
            await self.log(line.decode(errors="replace").rstrip()[-300:])
        code = await proc.wait()
        if self.proc is proc:
            self.proc = None
            await self.reconnect()
            await self.broadcast({"type": "policy_status", "running": False, "text": f"policy finished (exit {code})"})

    async def stop_policy(self, restart=True):
        if self.proc is not None:
            p, self.proc = self.proc, None
            p.terminate()
            try:
                await asyncio.wait_for(p.wait(), 8)
            except asyncio.TimeoutError:
                p.kill()
            if restart:
                await self.reconnect()
            await self.broadcast({"type": "policy_status", "running": False, "text": "stopped"})

    async def reconnect(self):
        await asyncio.sleep(1.0)
        for a in self.arms.values():
            try:
                a.connect()
            except Exception as e:
                await self.log(f"reconnect failed for arm {a.name}: {e}", "error")

    async def handle(self, ws):
        self.clients.add(ws)
        try:
            async for raw in ws:
                m = json.loads(raw)
                t = m.get("type")
                try:
                    if t == "hello":
                        await ws.send(json.dumps(self.hello()))
                    elif t == "action" and self.proc is None:
                        for n, a in self.arms.items():
                            if n in m:
                                a.act(m[n])
                    elif t == "torque":
                        self.arms[m["arm"]].set_torque(bool(m["on"]))
                        await self.log(f"arm {m['arm']} torque {'ON' if m['on'] else 'off'}")
                    elif t == "estop":
                        await self.estop()
                    elif t == "policy_start":
                        await self.start_policy(m)
                    elif t == "policy_stop":
                        await self.stop_policy()
                except Exception as e:
                    await self.log(f"{t} failed: {e}", "error")
        finally:
            self.clients.discard(ws)

    async def run(self):
        for a in self.arms.values():
            a.connect()
            print(f"arm {a.name} ready (follower={a.f_port}, leader={a.l_port})")
        async with websockets.serve(self.handle, self.args.host, self.args.port):
            print(f"bridge listening on ws://{self.args.host}:{self.args.port}")
            await self.state_loop()


def main():
    p = argparse.ArgumentParser()
    for n in "ab":
        p.add_argument(f"--follower-{n}"); p.add_argument(f"--follower-{n}-id")
        p.add_argument(f"--leader-{n}"); p.add_argument(f"--leader-{n}-id")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=8765)
    p.add_argument("--max-relative-target", type=float, default=12.0, help="max joint step per command (safety clamp)")
    p.add_argument("--cameras", default="", help="lerobot camera dict, e.g. '{ top: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30}}'")
    p.add_argument("--episode-time", type=int, default=60)
    p.add_argument("--mock", action="store_true", help="no hardware: simulate two arms")
    args = p.parse_args()
    try:
        asyncio.run(Bridge(args).run())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
`;

export const POLICY_SERVER_PY = String.raw`#!/usr/bin/env python3
"""
policy_server.py - minimal HTTP model server for the Command Deck "HTTP endpoint" runner (stdlib only + optional lerobot).

  python policy_server.py --mock                                  # sine-wave demo, no GPU
  python policy_server.py --lerobot lerobot/smolvla_base --device cuda --chunk 10
  python policy_server.py --lerobot outputs/train/act_task/checkpoints/last/pretrained_model

Contract (see Models tab):  POST /predict -> {"actions": [[6 or 12 floats], ...]}   GET /health -> ok
Put your own model in predict() if you are not using a LeRobot checkpoint (OpenVLA, MolmoAct2, GR00T ... serve it here).
Run it on a rented GPU box, then expose it with:  ssh -L 8000:localhost:8000 user@gpu-box   (browser stays on localhost)
"""
import argparse, base64, io, json, math, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

JOINTS = ["shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper"]
STATE = {"policy": None, "pre": None, "post": None, "device": "cpu", "chunk": 10, "mock": True, "t": 0.0}


def load_lerobot(path, device):
    import torch  # noqa
    from lerobot.configs.policies import PreTrainedConfig
    from lerobot.policies.factory import get_policy_class
    cfg = PreTrainedConfig.from_pretrained(path)
    policy = get_policy_class(cfg.type).from_pretrained(path).to(device).eval()
    pre = post = None
    try:  # newer LeRobot versions keep normalisation in processors
        from lerobot.policies.factory import make_pre_post_processors
        pre, post = make_pre_post_processors(policy.config, pretrained_path=path)
    except Exception as e:  # noqa
        print("no processors available (older lerobot?):", e)
    STATE.update(policy=policy, pre=pre, post=post, device=device, mock=False)
    print("loaded", cfg.type, "from", path)


def decode_image(b64):
    from PIL import Image
    import numpy as np
    im = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
    return np.asarray(im)


def predict(req):
    """Return a list of absolute normalised actions (-100..100, gripper 0..100)."""
    state = req["state"]
    n = len(state)
    if STATE["mock"]:
        STATE["t"] += 0.1
        out = []
        for k in range(STATE["chunk"]):
            t = STATE["t"] + k * 0.05
            a = list(state)
            a[0] = 25 * math.sin(t)
            a[4] = 40 * math.sin(2 * t)
            a[5] = 40 + 30 * math.sin(3 * t) if n == 6 else a[5]
            out.append(a)
        return out
    import torch
    pol, dev = STATE["policy"], STATE["device"]
    batch = {"observation.state": torch.tensor(state[:6], dtype=torch.float32).unsqueeze(0), "task": [req.get("task", "")]}
    wanted = [k for k in getattr(pol.config, "image_features", {})]
    imgs = req.get("images", {})
    for key in wanted:
        short = key.split(".")[-1]
        if short in imgs:
            arr = decode_image(imgs[short])
            batch[key] = torch.from_numpy(arr).permute(2, 0, 1).float().div(255).unsqueeze(0)
    if wanted and not any(k in batch for k in wanted):
        raise RuntimeError(f"policy expects cameras {wanted}; enable cameras in Hardware tab and match the names (top/side/wrist)")
    if STATE["pre"] is not None:
        batch = STATE["pre"](batch)
    else:
        batch = {k: (v.to(dev) if hasattr(v, "to") else v) for k, v in batch.items()}
    acts = []
    with torch.no_grad():
        for _ in range(STATE["chunk"]):
            a = pol.select_action(batch)
            if STATE["post"] is not None:
                a = STATE["post"](a)
            acts.append([float(x) for x in a.flatten().tolist()[:6]])
    return acts


class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b"ok")

    def do_POST(self):
        try:
            req = json.loads(self.rfile.read(int(self.headers.get("content-length", 0))))
            t0 = time.time()
            acts = predict(req)
            body = json.dumps({"actions": acts, "latency_ms": int((time.time() - t0) * 1000)}).encode()
            self.send_response(200)
        except Exception as e:  # noqa
            body = json.dumps({"error": str(e)}).encode()
            self.send_response(500)
        self._cors(); self.send_header("content-type", "application/json"); self.end_headers(); self.wfile.write(body)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mock", action="store_true")
    ap.add_argument("--lerobot")
    ap.add_argument("--device", default="cuda")
    ap.add_argument("--chunk", type=int, default=10)
    ap.add_argument("--port", type=int, default=8000)
    a = ap.parse_args()
    STATE["chunk"] = a.chunk
    if a.lerobot and not a.mock:
        load_lerobot(a.lerobot, a.device)
    print(f"policy server on http://0.0.0.0:{a.port}  (mock={STATE['mock']})")
    ThreadingHTTPServer(("0.0.0.0", a.port), H).serve_forever()
`;
