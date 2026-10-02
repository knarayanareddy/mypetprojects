#!/usr/bin/env python3
"""
so101_bridge.py – WebSocket bridge between the SO-101 Command Deck (browser) and LeRobot (current main).

Verified against huggingface/lerobot main (Sep 2026):
  * robots    : lerobot.robots.so_follower      (old path lerobot.robots.so101_follower is a fallback for pinned installs)
  * leaders   : lerobot.teleoperators.so_leader (fallback lerobot.teleoperators.so101_leader)
  * policies  : `lerobot-rollout --strategy.type=base --policy.path=…`   (lerobot-record --policy.path was REMOVED upstream)

What it does
  * one process owns the serial ports (works from any browser, headless lab PCs, Pi/Jetson)
  * re-uses LeRobot calibration files; if the servo EEPROM does not match the file it is written (same as `lerobot-calibrate`
    answering ENTER); if there is no calibration at all it refuses to move – run `lerobot-calibrate` first
  * streams follower/leader joints + servo load/current/temperature (the deck uses load/current to CONFIRM grasps)
  * launches `lerobot-rollout` for real policies (ACT, Diffusion, SmolVLA, pi0/pi0.5, GR00T, …), releasing the ports first
  * safety: goal:=present before torque, max_relative_target clamp, e-stop (kills rollout + torque off),
    torque is dropped if every browser disconnects for >3 s

Units on the wire = LeRobot RANGE_M100_100 for joints, RANGE_0_100 for the gripper (the bridge builds its own
robots with use_degrees=False so the deck's numbers are exactly LeRobot's).  Policies launched through lerobot-rollout use
their own config; pass --robot.use_degrees to match how the policy was trained (the deck exposes this switch).

Two arms need TWO USB bus adapters (one serial port each):
  python so101_bridge.py \
     --follower-a /dev/ttyACM0 --follower-a-id follower_a --leader-a /dev/ttyACM1 --leader-a-id leader_a \
     --follower-b /dev/ttyACM2 --follower-b-id follower_b --leader-b /dev/ttyACM3 --leader-b-id leader_b
Test without hardware:  python so101_bridge.py --mock
Find ports: lerobot-find-port   (unplug/replug the adapter when asked)
"""
import argparse
import asyncio
import json
import os
import shlex
import shutil
import signal
import sys
import time
from concurrent.futures import ThreadPoolExecutor

try:
    import websockets
except ImportError:  # pragma: no cover
    sys.exit("pip install websockets")

JOINTS = ["shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper"]
REST = [0.0, -100.0, 100.0, 70.0, 0.0, 0.0]
# one serial worker thread: LeRobot's bus objects are not thread-safe and blocking reads must not stall the event loop
IO = ThreadPoolExecutor(max_workers=1, thread_name_prefix="serial")


def to_vec(d, suffix=".pos"):
    return [float(d[f"{j}{suffix}"]) for j in JOINTS]


def to_action(vec):
    return {f"{j}.pos": float(v) for j, v in zip(JOINTS, vec)}


def import_lerobot():
    """Import SO-101 classes from whichever LeRobot layout is installed."""
    try:
        from lerobot.robots.so_follower import SO101Follower, SO101FollowerConfig
    except ImportError:
        from lerobot.robots.so101_follower import SO101Follower, SO101FollowerConfig  # older pins
    try:
        from lerobot.teleoperators.so_leader import SO101Leader, SO101LeaderConfig
    except ImportError:
        from lerobot.teleoperators.so101_leader import SO101Leader, SO101LeaderConfig  # older pins
    return SO101Follower, SO101FollowerConfig, SO101Leader, SO101LeaderConfig


def ensure_calibrated(dev, label):
    """Make servo EEPROM and the calibration file agree – never run uncalibrated (positions would be meaningless)."""
    if not dev.calibration:
        raise RuntimeError(
            f"{label}: no calibration file for id '{dev.id}'. Run `lerobot-calibrate` for this arm first "
            f"(or use the deck's Hardware → Calibration, which writes the same servo registers)."
        )
    if not dev.is_calibrated:
        print(f"[{label}] servo EEPROM differs from calibration file → writing file to servos")
        dev.bus.write_calibration(dev.calibration)


class Arm:
    """One logical arm = follower (+ optional leader)."""

    def __init__(self, name, args):
        n = name.lower()
        self.name = name
        self.mock = args.mock
        self.f_port, self.f_id = getattr(args, f"follower_{n}"), getattr(args, f"follower_{n}_id")
        self.l_port, self.l_id = getattr(args, f"leader_{n}"), getattr(args, f"leader_{n}_id")
        self.max_rel = args.max_relative_target
        self.robot = None
        self.leader = None
        self.torque = False
        self.tick = 0
        self.tele = None
        self.mock_pos = list(REST)
        self.mock_leader = list(REST)

    @property
    def enabled(self):
        return self.mock or bool(self.f_port)

    # ---- blocking calls (always executed on the serial thread) ----
    def connect(self):
        if self.mock:
            return
        SO101Follower, SO101FollowerConfig, SO101Leader, SO101LeaderConfig = import_lerobot()
        if self.f_port and self.robot is None:
            cfg = SO101FollowerConfig(
                port=self.f_port, id=self.f_id or f"follower_{self.name.lower()}",
                use_degrees=False, max_relative_target=self.max_rel,
            )
            robot = SO101Follower(cfg)
            # NB: SOFollower.connect() ends inside `torque_disabled()` which RE-ENABLES torque with whatever stale
            # Goal_Position the servo holds. So we do the same steps ourselves, with goal := present first.
            robot.bus.connect()
            try:
                ensure_calibrated(robot, f"arm {self.name} follower")
                present = robot.bus.sync_read("Present_Position")
                robot.bus.sync_write("Goal_Position", present)
                for cam in robot.cameras.values():
                    cam.connect()
                robot.configure()
                robot.bus.disable_torque()  # start limp; the deck enables torque explicitly
            except Exception:
                try:
                    robot.bus.disconnect(True)
                finally:
                    raise
            self.robot = robot
            self.torque = False
        if self.l_port and self.leader is None:
            lcfg = SO101LeaderConfig(port=self.l_port, id=self.l_id or f"leader_{self.name.lower()}", use_degrees=False)
            leader = SO101Leader(lcfg)
            leader.bus.connect()
            ensure_calibrated(leader, f"arm {self.name} leader")
            leader.configure()  # leaders stay torque-free
            self.leader = leader

    def disconnect(self):
        for dev in (self.robot, self.leader):
            try:
                if dev is not None:
                    dev.disconnect()
            except Exception as e:  # noqa
                print("disconnect warning:", e)
        self.robot = self.leader = None
        self.torque = False

    def read(self):
        """-> dict(follower, leader, torque, tele) – positions every tick, servo telemetry every 3rd tick."""
        self.tick += 1
        if self.mock:
            return {"follower": list(self.mock_pos), "leader": None, "torque": self.torque,
                    "tele": [{"load": 0, "current": 0, "temp": 31, "volt": 12.0, "moving": False} for _ in JOINTS]}
        out = {"follower": None, "leader": None, "torque": self.torque, "tele": self.tele}
        if self.robot is not None:
            bus = self.robot.bus
            out["follower"] = [float(v) for v in (bus.sync_read("Present_Position", num_retry=2)[j] for j in JOINTS)]
            if self.tick % 3 == 0:
                try:
                    load = bus.sync_read("Present_Load", normalize=False)
                    cur = bus.sync_read("Present_Current", normalize=False)
                    tmp = bus.sync_read("Present_Temperature", normalize=False)
                    vlt = bus.sync_read("Present_Voltage", normalize=False)
                    mov = bus.sync_read("Moving", normalize=False)
                    self.tele = [
                        {"load": int(load[j]), "current": float(cur[j]) * 6.5, "temp": int(tmp[j]),
                         "volt": float(vlt[j]) / 10.0, "moving": bool(mov[j])} for j in JOINTS
                    ]
                except Exception as e:  # telemetry is best-effort
                    print("telemetry read failed:", e)
            out["tele"] = self.tele
        if self.leader is not None:
            out["leader"] = to_vec(self.leader.get_action())
        return out

    def set_torque(self, on):
        if self.mock:
            self.torque = on
            return
        if self.robot is None:
            return
        if on:
            # goal := present BEFORE enabling torque, so the arm never jumps
            present = self.robot.bus.sync_read("Present_Position")
            self.robot.bus.sync_write("Goal_Position", present)
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
        self.robot.send_action(to_action(vec))  # honours max_relative_target


class Bridge:
    def __init__(self, args):
        self.args = args
        arms = {n: Arm(n, args) for n in ("A", "B")}
        self.arms = {n: a for n, a in arms.items() if a.enabled}
        self.clients = set()
        self.proc = None
        self.last_client = time.time()
        self.loop = None

    async def io(self, fn, *a):
        return await self.loop.run_in_executor(IO, fn, *a)

    async def broadcast(self, msg):
        data = json.dumps(msg)
        for c in list(self.clients):
            try:
                await c.send(data)
            except Exception:
                self.clients.discard(c)

    async def log(self, text, level="info"):
        print(f"[{level}] {text}", flush=True)
        await self.broadcast({"type": "log", "text": text, "level": level})

    def hello(self):
        info = "mock mode" if self.args.mock else f"lerobot · {len(self.arms)} arm(s)"
        return {"type": "hello", "arms": list(self.arms), "info": info,
                "leaders": [n for n, a in self.arms.items() if a.l_port]}

    # ---- loops ----
    async def state_loop(self):
        while True:
            if self.proc is None and self.clients:
                msg = {"type": "state"}
                for n, a in self.arms.items():
                    try:
                        msg[n] = await self.io(a.read)
                    except Exception as e:
                        await self.log(f"read error on arm {n}: {e}", "error")
                await self.broadcast(msg)
            await asyncio.sleep(0.04)

    async def watchdog(self):
        """Dead-man switch: nobody is watching → release torque (a held object is dropped, a runaway arm is not)."""
        while True:
            await asyncio.sleep(1)
            if self.clients:
                self.last_client = time.time()
            elif time.time() - self.last_client > 3 and self.proc is None:
                for a in self.arms.values():
                    if a.torque:
                        try:
                            await self.io(a.set_torque, False)
                            await self.log(f"no browser connected for 3 s – arm {a.name} torque released", "warn")
                        except Exception as e:
                            print("watchdog:", e)

    # ---- safety ----
    async def estop(self):
        await self.stop_rollout(reconnect=True)
        for a in self.arms.values():
            try:
                await self.io(a.set_torque, False)
            except Exception as e:
                print("estop:", e)
        await self.log("E-STOP: rollout killed, torque released", "error")

    # ---- policies through lerobot-rollout ----
    def rollout_cmd(self):
        exe = self.args.rollout_cmd or ("lerobot-rollout" if shutil.which("lerobot-rollout") else f"{sys.executable} -m lerobot.scripts.lerobot_rollout")
        return shlex.split(exe)

    async def start_rollout(self, m):
        await self.stop_rollout(reconnect=False)
        a, b = self.arms.get("A"), self.arms.get("B")
        two = int(m.get("arms", 1)) == 2
        if self.args.mock or a is None or not a.f_port or (two and (b is None or not b.f_port)):
            await self.broadcast({"type": "policy_status", "running": False,
                                  "text": "policy rollout needs real follower ports (--follower-a" + (" and --follower-b" if two else "") + ")"})
            return
        policy = m.get("policy")
        if not policy:
            await self.broadcast({"type": "policy_status", "running": False, "text": "no policy path given"})
            return
        deg = "true" if m.get("useDegrees", True) else "false"
        cmd = self.rollout_cmd() + [f"--strategy.type={m.get('strategy', 'base')}", f"--policy.path={policy}"]
        if two:
            cmd += ["--robot.type=bi_so_follower", f"--robot.left_arm_config.port={a.f_port}", f"--robot.right_arm_config.port={b.f_port}",
                    f"--robot.id={a.f_id or 'bimanual'}",
                    f"--robot.left_arm_config.use_degrees={deg}", f"--robot.right_arm_config.use_degrees={deg}"]
        else:
            cmd += ["--robot.type=so101_follower", f"--robot.port={a.f_port}", f"--robot.id={a.f_id or 'follower_a'}", f"--robot.use_degrees={deg}"]
        if m.get("cameras"):
            cmd.append(f"--robot.cameras={m['cameras']}")
        cmd += [f"--task={m.get('task', 'task')}", f"--duration={float(m.get('duration', 60))}"]
        if m.get("inference") == "rtc":
            cmd += ["--inference.type=rtc"]
        # the rollout process needs exclusive access to the serial ports
        for arm in self.arms.values():
            await self.io(arm.disconnect)
        await self.log("launching: " + " ".join(shlex.quote(c) for c in cmd))
        try:
            self.proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT, start_new_session=True)
        except FileNotFoundError as e:
            await self.log(f"cannot start lerobot-rollout: {e} – is LeRobot installed in this environment?", "error")
            await self.reconnect()
            await self.broadcast({"type": "policy_status", "running": False, "text": "lerobot-rollout not found"})
            return
        await self.broadcast({"type": "policy_status", "running": True, "text": f"running {policy}"})
        asyncio.create_task(self.pump(self.proc))

    async def pump(self, proc):
        async for line in proc.stdout:
            await self.log(line.decode(errors="replace").rstrip()[-300:])
        code = await proc.wait()
        if self.proc is proc:
            self.proc = None
            await self.reconnect()
            await self.broadcast({"type": "policy_status", "running": False, "text": f"rollout finished (exit {code})"})

    async def stop_rollout(self, reconnect=True):
        if self.proc is None:
            return
        p, self.proc = self.proc, None
        try:
            if hasattr(os, "killpg"):
                os.killpg(p.pid, signal.SIGINT)  # lets lerobot disable torque & close the bus cleanly
            else:
                p.terminate()
        except ProcessLookupError:
            pass
        try:
            await asyncio.wait_for(p.wait(), 8)
        except asyncio.TimeoutError:
            try:
                os.killpg(p.pid, signal.SIGKILL) if hasattr(os, "killpg") else p.kill()
            except ProcessLookupError:
                pass
        if reconnect:
            await self.reconnect()  # always ends with torque disabled
        await self.broadcast({"type": "policy_status", "running": False, "text": "stopped"})

    async def reconnect(self):
        await asyncio.sleep(1.0)
        for a in self.arms.values():
            try:
                await self.io(a.connect)
            except Exception as e:
                await self.log(f"reconnect failed for arm {a.name}: {e}", "error")

    # ---- websocket ----
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
                                await self.io(a.act, m[n])
                    elif t == "torque":
                        await self.io(self.arms[m["arm"]].set_torque, bool(m["on"]))
                        await self.log(f"arm {m['arm']} torque {'ON' if m['on'] else 'off'}")
                    elif t == "estop":
                        await self.estop()
                    elif t == "rollout_start":
                        await self.start_rollout(m)
                    elif t == "rollout_stop":
                        await self.stop_rollout()
                except Exception as e:
                    await self.log(f"{t}: {e}", "error")
        finally:
            self.clients.discard(ws)

    async def run(self):
        self.loop = asyncio.get_running_loop()
        for a in self.arms.values():
            try:
                await self.io(a.connect)
                print(f"arm {a.name} ready (follower {a.f_port or 'mock'}{', leader ' + a.l_port if a.l_port else ''})")
            except Exception as e:
                print(f"arm {a.name} connect failed: {e}")
                sys.exit(1)
        asyncio.create_task(self.state_loop())
        asyncio.create_task(self.watchdog())
        async with websockets.serve(self.handle, self.args.host, self.args.port):
            print(f"bridge listening on ws://{self.args.host}:{self.args.port}  (arms: {', '.join(self.arms) or 'none'})", flush=True)
            await asyncio.Future()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--host", default="127.0.0.1", help="use 0.0.0.0 only on a trusted network – the bridge can move motors")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--mock", action="store_true", help="simulate two arms, no hardware / LeRobot needed")
    for n in ("a", "b"):
        ap.add_argument(f"--follower-{n}")
        ap.add_argument(f"--follower-{n}-id")
        ap.add_argument(f"--leader-{n}")
        ap.add_argument(f"--leader-{n}-id")
    ap.add_argument("--max-relative-target", type=float, default=20.0, help="per-step joint clamp (normalised units) – safety")
    ap.add_argument("--rollout-cmd", default=None, help="override, e.g. 'python -m lerobot.scripts.lerobot_rollout'")
    args = ap.parse_args()
    bridge = Bridge(args)
    if not bridge.arms:
        sys.exit("no arms configured – pass --follower-a /dev/ttyACM0 … or --mock")
    try:
        asyncio.run(bridge.run())
    except KeyboardInterrupt:
        for a in bridge.arms.values():
            a.disconnect()
        print("bye")


if __name__ == "__main__":
    main()
