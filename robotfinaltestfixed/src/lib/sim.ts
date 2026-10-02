import { Arm, type ArmState } from "./arm";
import { ServoBus, SimServoTransport } from "./feetech";
import { JOINTS, MOTOR_IDS, defaultCalibration, forward, gripperPctToRaw, rawToDeg, type ArmCalibration } from "./kinematics";

export const GRIPPER_MAX_OPEN_CM = 7;
export const PX_PER_CM = 14;

export interface SimObject {
  id: string;
  name: string;
  rgb: [number, number, number];
  x: number;
  y: number;
  z: number;
  w: number; // cm edge
  h: number; // cm height
  held: boolean;
  kind: "object" | "zone";
}

export const BIN = { x: 17, y: -13, r: 4.5 };
export const BIN_B = { x: 9, y: -14, r: 4 };

export function defaultObjects(): SimObject[] {
  const mk = (id: string, name: string, rgb: [number, number, number], x: number, y: number, w = 3): SimObject => ({ id, name, rgb, x, y, z: 0, w, h: w, held: false, kind: "object" });
  return [
    mk("red", "red cube", [210, 40, 40], 18, 6),
    mk("green", "green cube", [40, 170, 70], 15, -4),
    mk("blue", "blue cube", [40, 80, 210], 20, -1),
    mk("yellow", "yellow cube", [235, 205, 40], 14, 10),
    mk("black", "black cube", [25, 25, 28], 19, 11),
  ];
}

/** True simulated camera model (robot-frame cm -> pixel). Slight perspective on purpose. */
export function simProject(x: number, y: number): { u: number; v: number; s: number } {
  const s = 1 / (1 - 0.006 * (x - 14));
  return { u: 320 - y * PX_PER_CM * s, v: 440 - x * PX_PER_CM * s, s };
}

export class SimWorld {
  objects: SimObject[] = defaultObjects();
  transport: SimServoTransport;
  arm: Arm;
  tableRgb: [number, number, number] = [196, 168, 128];

  constructor(cal: ArmCalibration = defaultCalibration()) {
    const t = new SimServoTransport(
      JOINTS.map((j) => ({ id: MOTOR_IDS[j], pos: j === "gripper" ? cal.gripper.openRaw : cal.joints[j].ref })),
    );
    this.transport = t;
    this.arm = new Arm("Virtual SO-101", new ServoBus(t, 40), cal);
    t.gripperObstacle = (positions) => this.obstacle(positions);
  }

  private tipOf(positions: Map<number, number>) {
    const cal = this.arm.cal;
    const d = (j: (typeof JOINTS)[number]) => rawToDeg(cal, j, positions.get(MOTOR_IDS[j])!);
    return forward(cal.geometry, { pan: d("shoulder_pan"), lift: d("shoulder_lift"), elbow: d("elbow_flex"), wrist: d("wrist_flex") }).tip;
  }

  private obstacle(positions: Map<number, number>): number | null {
    const tip = this.tipOf(positions);
    for (const o of this.objects) {
      if (o.kind !== "object") continue;
      const near = Math.hypot(tip[0] - o.x, tip[1] - o.y) < 2.2 && tip[2] < o.h + 1.5 && tip[2] > -1;
      if (o.held || near) return gripperPctToRaw(this.arm.cal, (o.w / GRIPPER_MAX_OPEN_CM) * 100);
    }
    return null;
  }

  /** Advance object physics from the arm state. Call regularly. */
  update(s: ArmState | null) {
    if (!s) return;
    const tip = this.arm.tip(s);
    if (!tip) return;
    const [tx, ty, tz] = tip.tip;
    const held = this.objects.find((o) => o.held);
    if (held) {
      const objPct = (held.w / GRIPPER_MAX_OPEN_CM) * 100;
      if (s.gripperPct > objPct + 8) {
        held.held = false;
        held.z = Math.max(0, tz - held.h / 2);
      } else {
        held.x = tx;
        held.y = ty;
        held.z = Math.max(0, tz - held.h / 2);
      }
    } else {
      for (const o of this.objects) {
        if (o.kind !== "object") continue;
        const objPct = (o.w / GRIPPER_MAX_OPEN_CM) * 100;
        if (Math.hypot(tx - o.x, ty - o.y) < 2.2 && tz < o.h + 1.5 && Math.abs(s.gripperPct - objPct) < 5 && Math.abs(s.load[5]) > 60) o.held = true;
      }
    }
    for (const o of this.objects) if (!o.held && o.z > 0) o.z = Math.max(0, o.z - 1.5); // gravity
  }

  /** Render the synthetic overhead camera. */
  render(ctx: CanvasRenderingContext2D, w = 640, h = 480, noise = 4, showObjects = true) {
    ctx.fillStyle = `rgb(${this.tableRgb.join(",")})`;
    ctx.fillRect(0, 0, w, h);
    const b = simProject(0, 0);
    ctx.fillStyle = "#3b3f46";
    ctx.fillRect(b.u - 40, b.v - 10, 80, 60);
    // bin
    for (const [bin, col] of [[BIN, "#e9e9ec"], [BIN_B, "#c9d6e8"]] as const) {
      const bp = simProject(bin.x, bin.y);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(bp.u, bp.v, bin.r * PX_PER_CM * bp.s, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const o of showObjects ? this.objects : []) {
      const p = simProject(o.x, o.y);
      const lift = 1 + o.z * 0.03;
      const px = o.w * PX_PER_CM * p.s * lift;
      ctx.fillStyle = `rgb(${o.rgb.join(",")})`;
      ctx.fillRect(p.u - px / 2, p.v - px / 2, px, px);
    }
    if (noise > 0) {
      const img = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (Math.random() - 0.5) * noise * 2;
        img.data[i] += n;
        img.data[i + 1] += n;
        img.data[i + 2] += n;
      }
      ctx.putImageData(img, 0, 0);
    }
  }

  reset() {
    this.objects = defaultObjects();
  }

  /** Is an object inside the bin zone (for scoring)? */
  inBin(o: SimObject) {
    return !o.held && Math.hypot(o.x - BIN.x, o.y - BIN.y) < BIN.r && o.z < 0.5;
  }
}
