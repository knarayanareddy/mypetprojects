import { describe, expect, it } from "vitest";
import { Arm } from "../arm";
import { parseCommand } from "../commands";
import { REG, ServoBus, SimServoTransport } from "../feetech";
import { JOINTS, MOTOR_IDS } from "../kinematics";
import { DEFAULT_RUNNER, MISSIONS, Runner } from "../missions";
import { MODELS, rolloutCmd, setupCommands } from "../models";
import { DEFAULT_ROLLOUT } from "../defaults";
import { SimWorld } from "../sim";

describe("register map matches the LeRobot STS3215 control table", () => {
  it("has the documented addresses (regression: Protection_Current was 34)", () => {
    expect(REG.PROTECTION_CURRENT).toBe(28); // (28, 2)
    expect(REG.PROTECTIVE_TORQUE).toBe(34); // a different register
    expect(REG.MAX_TORQUE_LIMIT).toBe(16);
    expect(REG.HOMING_OFFSET).toBe(31);
    expect(REG.OPERATING_MODE).toBe(33);
    expect(REG.OVERLOAD_TORQUE).toBe(36);
    expect(REG.TORQUE_ENABLE).toBe(40);
    expect(REG.ACCELERATION).toBe(41);
    expect(REG.GOAL_POS).toBe(42);
    expect(REG.LOCK).toBe(55);
    expect(REG.PRESENT_POS).toBe(56);
    expect(REG.PRESENT_LOAD).toBe(60);
    expect(REG.PRESENT_VOLTAGE).toBe(62);
    expect(REG.PRESENT_TEMP).toBe(63);
  });
});

describe("initFollower (connect-time motor configuration)", () => {
  const rig = () => {
    const t = new SimServoTransport(JOINTS.map((j) => ({ id: MOTOR_IDS[j], pos: 2048 })));
    return { t, arm: new Arm("t", new ServoBus(t, 30), new SimWorld().arm.cal) };
  };
  const u16 = (r: Uint8Array, a: number) => r[a] | (r[a + 1] << 8);

  it("writes gripper protection to the RIGHT registers and leaves Protective_Torque alone", async () => {
    const { t, arm } = rig();
    const g = t.regs.get(MOTOR_IDS.gripper)!;
    const before34 = g[34];
    const before35 = g[35];
    await arm.initFollower();
    expect(u16(g, REG.PROTECTION_CURRENT)).toBe(250);
    expect(u16(g, REG.MAX_TORQUE_LIMIT)).toBe(500);
    expect(g[REG.OVERLOAD_TORQUE]).toBe(25);
    expect(g[34]).toBe(before34);
    expect(g[35]).toBe(before35);
  });

  it("ends torque-off, goal = present, EEPROM re-locked, PID set on every joint", async () => {
    const { t, arm } = rig();
    await arm.initFollower();
    for (const j of JOINTS) {
      const r = t.regs.get(MOTOR_IDS[j])!;
      expect(r[REG.TORQUE_ENABLE]).toBe(0);
      expect(r[REG.LOCK]).toBe(1);
      expect([r[REG.P_COEF], r[REG.I_COEF], r[REG.D_COEF]]).toEqual([16, 0, 32]);
      expect(u16(r, REG.GOAL_POS)).toBe(2048);
    }
    expect(arm.torque).toBe(false);
  });

  it("is idempotent: the second connect writes nothing to EEPROM", async () => {
    const { arm } = rig();
    const first = await arm.initFollower();
    expect(first.length).toBeGreaterThan(0);
    expect(await arm.initFollower()).toEqual([]);
  });
});

describe("instruction parser", () => {
  const id = (s: string) => parseCommand(s).best?.mission.id;
  it("maps natural language to missions", () => {
    expect(id("please sort the cubes by colour")).toBe("color-sort");
    expect(id("stack 3 blocks into a tower")).toBe("tower");
    expect(id("draw a circle")).toBe("draw");
    expect(id("wave hello")).toBe("wave");
    expect(id("pick up the red cube and put it in the bin")).toBe("pick-place");
    expect(id("flip the light switch")).toBe("lightswitch");
    expect(id("play tic tac toe")).toBe("tictactoe");
  });
  it("extracts counts and durations", () => {
    expect(parseCommand("stack 4 cubes").best?.params.levels).toBe(4);
    expect(parseCommand("watch the desk like a sentry for 45 seconds").best?.params.seconds).toBe(45);
  });
  it("rejects nonsense", () => {
    expect(parseCommand("xyzzy qwerty").best).toBeNull();
    expect(parseCommand("").best).toBeNull();
  });
});

describe("LeRobot command generators", () => {
  const smol = MODELS.find((m) => m.id === "smolvla")!;
  it("plain rollout never touches the leader arm", () => {
    const argv = rolloutCmd(smol, { ...DEFAULT_ROLLOUT, policyPath: "me/p" }).argv;
    expect(argv.some((a) => a.startsWith("--teleop"))).toBe(false);
    expect(argv).toContain("--strategy.type=base");
    expect(argv).toContain("--policy.path=me/p");
  });
  it("leader is attached only when asked", () => {
    const argv = rolloutCmd(smol, { ...DEFAULT_ROLLOUT, useLeader: true }).argv;
    expect(argv).toContain("--teleop.type=so101_leader");
  });
  it("training does not require a Hub repo for the policy and fine-tunes SmolVLA from its base", () => {
    const train = setupCommands(DEFAULT_ROLLOUT, "me/ds", "smolvla").find((c) => c.argv[0] === "lerobot-train")!;
    expect(train.argv).toContain("--policy.push_to_hub=false");
    expect(train.argv).toContain("--policy.path=lerobot/smolvla_base");
    const act = setupCommands(DEFAULT_ROLLOUT, "me/ds", "act").find((c) => c.argv[0] === "lerobot-train")!;
    expect(act.argv).toContain("--policy.type=act");
  });
});

describe("scripted missions", () => {
  it("every mission runs to completion in dry-run against detections (no crash, no hang)", async () => {
    const world = new SimWorld();
    const arm = world.arm;
    await arm.initFollower();
    const dets = world.objects.map((o) => ({ label: o.name, px: { x: 0, y: 0 }, area: 100, bbox: [0, 0, 1, 1] as [number, number, number, number], world: { x: o.x, y: o.y } }));
    for (const m of MISSIONS) {
      const ctl = new AbortController();
      const runner = new Runner(arm, ctl.signal, () => undefined, async () => dets, { ...DEFAULT_RUNNER, dryRun: true });
      const params = Object.fromEntries(m.params.map((p) => [p.key, p.key === "seconds" ? 1 : p.value]));
      const out = await Promise.race([m.run(runner, params), new Promise<string>((_, rej) => setTimeout(() => rej(new Error(`${m.id} hung`)), 8000))]);
      expect(typeof out).toBe("string");
    }
  });

  it("stops after repeated failed grasps instead of looping forever", async () => {
    const world = new SimWorld();
    const arm = world.arm;
    arm.maxDegPerS = 250;
    await arm.initFollower();
    await arm.setTorque(true);
    const ctl = new AbortController();
    const runner = new Runner(arm, ctl.signal, () => undefined, async () => [], { ...DEFAULT_RUNNER, speedMs: 100 });
    let err: unknown = null;
    try {
      for (let i = 0; i < 6; i++) await runner.pick(12, 0); // nothing there
    } catch (e) {
      err = e;
    }
    expect(String(err)).toMatch(/failed in a row/);
  });
});

describe("scripted mission, live on the virtual arm (real driver + stall-checked grasp)", () => {
  it("Pick & Place mission bins the nearest cube end-to-end", async () => {
    const world = new SimWorld();
    const arm = world.arm;
    arm.maxDegPerS = 160;
    await arm.initFollower();
    await arm.setTorque(true);
    const tick = setInterval(() => void arm.readState().then((s) => world.update(s)).catch(() => undefined), 40);
    const mission = MISSIONS.find((m) => m.id === "pick-place")!;
    const perceive = async () =>
      world.objects.filter((o) => !world.inBin(o) && !o.held).map((o) => ({ label: o.name, px: { x: 0, y: 0 }, area: 100, bbox: [0, 0, 1, 1] as [number, number, number, number], world: { x: o.x, y: o.y } }));
    const ctl = new AbortController();
    const runner = new Runner(arm, ctl.signal, () => undefined, perceive, { ...DEFAULT_RUNNER, speedMs: 150 });
    const res = await mission.run(runner, Object.fromEntries(mission.params.map((p) => [p.key, p.value])));
    await new Promise((r) => setTimeout(r, 300));
    clearInterval(tick);
    world.update(await arm.readState());
    expect(res).toBe("1/1 objects binned");
    expect(world.objects.filter((o) => world.inBin(o)).length).toBe(1);
  }, 90000);
});
