import { describe, expect, it } from "vitest";
import { Arm } from "../arm";
import { INST, REG, ServoBus, SimServoTransport, buildPacket, buildRead, buildSyncWrite, decodeSignMag, encodeSignMag, parseStatus } from "../feetech";
import { DEFAULT_GEOMETRY, defaultCalibration, degToRaw, forward, inverse, jointLimits, rawToDeg } from "../kinematics";
import { Runner, DEFAULT_RUNNER } from "../missions";
import { BIN, SimWorld } from "../sim";

describe("feetech protocol", () => {
  it("builds known packets", () => {
    expect(Array.from(buildPacket(1, INST.PING))).toEqual([0xff, 0xff, 0x01, 0x02, 0x01, 0xfb]);
    expect(Array.from(buildRead(1, 56, 2))).toEqual([0xff, 0xff, 0x01, 0x04, 0x02, 0x38, 0x02, 0xbe]);
    expect(Array.from(buildSyncWrite(42, [{ id: 1, data: [0, 8] }, { id: 2, data: [0, 8] }]))).toEqual([0xff, 0xff, 0xfe, 0x0a, 0x83, 0x2a, 0x02, 1, 0, 8, 2, 0, 8, 0x35]);
  });
  it("resyncs on garbage and rejects bad checksums", () => {
    const good = [0xff, 0xff, 0x01, 0x04, 0x00, 0x00, 0x08, 0xf2];
    expect(parseStatus([0x12, 0x34, ...good])?.pkt.params).toEqual([0x00, 0x08]);
    const bad = [...good];
    bad[7] ^= 1;
    expect(parseStatus(bad)).toBeNull();
  });
  it("sign-magnitude round trip", () => {
    for (const v of [-2047, -1, 0, 5, 2047]) expect(decodeSignMag(encodeSignMag(v, 11), 11)).toBe(v);
  });
  it("talks to 6 virtual motors", async () => {
    const t = new SimServoTransport([1, 2, 3, 4, 5, 6].map((id) => ({ id, pos: 2048 })));
    const bus = new ServoBus(t, 30);
    expect(await bus.scan()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(await bus.ping(9)).toBe(false);
    await bus.write8(1, REG.TORQUE_ENABLE, 1);
    await bus.write16(1, REG.GOAL_POS, 2300);
    await new Promise((r) => setTimeout(r, 400));
    expect(await bus.read16(1, REG.PRESENT_POS)).toBe(2300);
  });
});

describe("kinematics", () => {
  it("L pose reaches the expected tip position", () => {
    const g = DEFAULT_GEOMETRY;
    const f = forward(g, { pan: 0, lift: 0, elbow: 90, wrist: 0 });
    expect(f.tip[0]).toBeCloseTo(g.forearm + g.tool, 6);
    expect(f.tip[2]).toBeCloseTo(g.shoulderHeight + g.upperArm, 6);
  });
  it("IK ∘ FK round trip over the workspace", () => {
    const cal = defaultCalibration();
    const lim = jointLimits(cal);
    let n = 0;
    for (let x = 10; x <= 22; x += 3) for (let y = -12; y <= 12; y += 4) for (const z of [1.4, 5, 10]) {
      const ik = inverse(cal.geometry, [x, y, z], lim);
      if (!ik) continue;
      const tip = forward(cal.geometry, ik.pose).tip;
      expect(Math.hypot(tip[0] - x, tip[1] - y, tip[2] - z)).toBeLessThan(1e-6);
      n++;
    }
    expect(n).toBeGreaterThan(20);
  });
  it("raw/degree mapping is invertible and honours sign", () => {
    const cal = defaultCalibration();
    cal.joints.elbow_flex.sign = -1;
    const raw = degToRaw(cal, "elbow_flex", 60);
    expect(rawToDeg(cal, "elbow_flex", raw)).toBeCloseTo(60, 0);
  });
});

describe("simulated arm: full verified pick & place (real driver stack)", () => {
  it("picks the red cube with camera coordinates and drops it in the bin", async () => {
    const world = new SimWorld();
    const arm = world.arm;
    arm.maxDegPerS = 140;
    await arm.initFollower();
    await arm.setTorque(true);
    const tick = setInterval(() => void arm.readState().then((s) => world.update(s)).catch(() => undefined), 40);
    const ctl = new AbortController();
    const logs: string[] = [];
    const red = world.objects.find((o) => o.id === "red")!;
    const runner = new Runner(arm, ctl.signal, (m) => logs.push(m), async () => [{ label: "red cube", px: { x: 0, y: 0 }, area: 100, bbox: [0, 0, 1, 1], world: { x: red.x, y: red.y } }], { ...DEFAULT_RUNNER, speedMs: 150 });
    const ok = await runner.pick(red.x, red.y);
    expect(ok).toBe(true);
    expect(red.held).toBe(true);
    await runner.place(BIN.x, BIN.y, 5);
    await new Promise((r) => setTimeout(r, 300));
    clearInterval(tick);
    world.update(await arm.readState());
    console.log(logs.join("\n"));
    expect(world.inBin(red)).toBe(true);
  }, 60000);

  it("a missed grasp is detected (no object under the gripper)", async () => {
    const world = new SimWorld();
    const arm = new Arm("x", world.arm.bus, world.arm.cal);
    arm.maxDegPerS = 200;
    await arm.initFollower();
    await arm.setTorque(true);
    const ctl = new AbortController();
    const runner = new Runner(arm, ctl.signal, () => undefined, async () => [], { ...DEFAULT_RUNNER, speedMs: 150 });
    expect(await runner.pick(12, 0)).toBe(false); // nothing at (12,0)
  }, 60000);
});
