export type PartType = "printed" | "actuator" | "electronics";

export interface PartInfo {
  id: string; // matches PartSpec id in robot3d
  num: number;
  name: string;
  leaderName?: string;
  type: PartType;
  qty: string;
  joint: string;
  blurb: string;
  details: string[];
  specs: [string, string][];
  leaderSpecs?: [string, string][];
  tip?: string;
  step: number; // build step (see BUILD_STEPS in build page)
}

export const TYPE_META: Record<PartType, { label: string; color: string }> = {
  printed: { label: "3D printed", color: "#fb923c" },
  actuator: { label: "Actuator", color: "#94a3b8" },
  electronics: { label: "Electronics", color: "#34d399" },
};

export const PARTS: PartInfo[] = [
  {
    id: "board", num: 1, name: "Bus-servo controller board", type: "electronics", qty: "1 per arm", joint: "Electronics",
    blurb: "A USB ↔ half-duplex TTL bridge (Waveshare / Feetech style) that talks to every servo over one 3-wire daisy chain.",
    details: [
      "All six motors share one data line. Each motor has a unique ID (1–6) and the same baudrate (1 Mbps), written once to EEPROM by lerobot-setup-motors.",
      "Motors are powered from an external supply (match your servo voltage: 5–7.4 V or 12 V variants); USB carries data only.",
      "On Waveshare boards make sure both jumpers sit on position B (USB), otherwise no serial port appears.",
    ],
    specs: [["Protocol", "Feetech SCS/STS serial bus"], ["Baudrate", "1,000,000 bps"], ["Host link", "USB → /dev/ttyACM* or tty.usbmodem*"], ["Motor IDs", "1 – 6"]],
    tip: "Run lerobot-find-port with and without the cable to learn which port belongs to which arm — label the cables!",
    step: 0,
  },
  {
    id: "base", num: 2, name: "Base", type: "printed", qty: "1", joint: "Joint 1 housing",
    blurb: "The foundation. It houses the shoulder-pan servo and gives you a flange to clamp to the table.",
    details: [
      "Holds Motor 1 (shoulder pan) with its shaft pointing straight up so the whole arm rotates about the vertical axis.",
      "Motor 1 is fixed with four M2×6 screws — two from the top, two from the bottom.",
      "Clamp both bases to the same table: the arms' relative position must stay fixed for bimanual work.",
    ],
    specs: [["Material", "PLA / PETG"], ["Infill", "15–20 %"], ["Fasteners", "4× M2×6 (motor)"], ["Supports", "Needed — remove with a small screwdriver"]],
    tip: "Print flat with a brim; it's the largest piece and warps at the corners.",
    step: 1,
  },
  {
    id: "m1", num: 3, name: "Motor 1 – Shoulder pan", type: "actuator", qty: "1", joint: "Joint 1 · shoulder_pan · ID 1",
    blurb: "Rotates the whole arm left ↔ right around the vertical axis.",
    details: [
      "Feetech STS3215 serial-bus servo: metal gears, 12-bit magnetic encoder (4096 steps/rev) with position, speed, load, voltage and temperature read-back.",
      "Two horns are fitted: the top horn is screwed on with one M3×6 and carries the shoulder; the bottom horn is a press fit.",
      "Its readings become observation.state in LeRobot — calibration here matters for every policy you train.",
    ],
    specs: [["Model", "Feetech STS3215"], ["Follower gearing", "1 / 345"], ["Resolution", "4096 steps / rev"], ["Read-back", "pos · speed · load · V · temp"]],
    leaderSpecs: [["Leader gearing", "1 / 191"], ["Why", "Lower ratio → easy to back-drive by hand"]],
    tip: "Before assembly plug in ONLY this motor and run lerobot-setup-motors so it receives ID 1.",
    step: 2,
  },
  {
    id: "m1_holder", num: 4, name: "Motor holder 1", type: "printed", qty: "1", joint: "Joint 1",
    blurb: "A small cage that slides over Motor 1 and clamps it into the base.",
    details: ["Stops the servo rocking in its seat when the arm applies sideways torque.", "Fastened with one M2×6 screw on each side."],
    specs: [["Fasteners", "2× M2×6"], ["Material", "PLA / PETG"]],
    step: 2,
  },
  {
    id: "shoulder", num: 5, name: "Shoulder bracket", type: "printed", qty: "1", joint: "Joint 1 → 2",
    blurb: "The rotating turret on top of Motor 1; its two walls carry the shoulder-lift motor.",
    details: [
      "Screwed to Motor 1's top horn: 4× M3×6 on top and 4× M3×6 on the bottom.",
      "The tall walls hold Motor 2 so the upper arm pivots between them; a motor holder clip closes the walls.",
    ],
    specs: [["Fasteners", "8× M3×6"], ["Material", "PLA / PETG"]],
    tip: "Snug is enough for M3 into printed holes — over-tightening cracks the plastic.",
    step: 3,
  },
  {
    id: "m2", num: 6, name: "Motor 2 – Shoulder lift", type: "actuator", qty: "1", joint: "Joint 2 · shoulder_lift · ID 2",
    blurb: "The strongest joint: it lifts the entire upper arm, forearm, wrist and payload.",
    details: [
      "Biggest lever arm → always the 1/345 gearing, on leader and follower.",
      "Slides in from the top of the shoulder; 4× M2×6 hold it, and the upper arm bolts to its horns with 4× M3×6 per side.",
    ],
    specs: [["Gearing", "1 / 345 (leader + follower)"], ["Role", "Carries the full arm weight"]],
    step: 4,
  },
  {
    id: "m2_holder", num: 7, name: "Shoulder motor holder", type: "printed", qty: "1", joint: "Joint 2",
    blurb: "A clip that closes the shoulder walls so Motor 2 cannot slide out.",
    details: ["Added after the shoulder bracket is attached (Joint 1 step).", "Prevents axial motion of the shoulder-lift motor under load."],
    specs: [["Material", "PLA / PETG"]],
    step: 3,
  },
  {
    id: "upper_arm", num: 8, name: "Upper arm", type: "printed", qty: "1", joint: "Link 1 (≈ 11.6 cm)",
    blurb: "The first long link, shoulder to elbow — a twin-plate sandwich holding the elbow motor.",
    details: ["Bolts to Motor 2's horns: 4× M3×6 on each side.", "Hollow between the plates: the servo cables run here (route them before closing)."],
    specs: [["Length", "≈ 11.6 cm pivot to pivot"], ["Fasteners", "8× M3×6"]],
    step: 4,
  },
  {
    id: "m3", num: 9, name: "Motor 3 – Elbow flex", type: "actuator", qty: "1", joint: "Joint 3 · elbow_flex · ID 3",
    blurb: "Bends the forearm relative to the upper arm and sets your reach.",
    details: ["Inserted at the end of the upper arm, secured with 4× M2×6.", "The forearm attaches to its horns with 4× M3×6 on each side."],
    specs: [["Follower gearing", "1 / 345"]],
    leaderSpecs: [["Leader gearing", "1 / 191"]],
    step: 5,
  },
  {
    id: "forearm", num: 10, name: "Forearm", type: "printed", qty: "1", joint: "Link 2 (≈ 13.5 cm)",
    blurb: "The second link; it carries the wrist-flex servo at its tip.",
    details: ["With the upper arm it forms a classic 2-link planar chain — exactly what the IK in this app solves.", "Combined link length gives ≈ 25 cm of planar reach before the wrist."],
    specs: [["Length", "≈ 13.5 cm pivot to pivot"], ["Fasteners", "8× M3×6"]],
    step: 5,
  },
  {
    id: "m4_holder", num: 11, name: "Motor holder 4", type: "printed", qty: "1", joint: "Joint 4",
    blurb: "A saddle that slides over Motor 4 inside the forearm so it cannot twist.",
    details: ["Slides over the forearm tip first, then Motor 4 slides in, then M2×6 screws lock it."],
    specs: [["Fasteners", "shared with Motor 4"]],
    step: 6,
  },
  {
    id: "m4", num: 12, name: "Motor 4 – Wrist flex", type: "actuator", qty: "1", joint: "Joint 4 · wrist_flex · ID 4",
    blurb: "Pitches the gripper up and down — keeps the tool pointing at the table.",
    details: ["Separates 'where' (shoulder + elbow decide position) from 'how' (wrist decides approach angle).", "In the Playground, IK automatically picks the wrist angle each use case needs."],
    specs: [["Follower gearing", "1 / 345"]],
    leaderSpecs: [["Leader gearing", "1 / 147"]],
    step: 6,
  },
  {
    id: "wrist_bracket", num: 13, name: "Wrist bracket", type: "printed", qty: "1", joint: "Joint 4 → 5",
    blurb: "A U-shaped cradle bolted to Motor 4 that carries the wrist-roll servo.",
    details: ["Motor 5 sits in the holder with 2× M2×6 front screws.", "The bracket is secured to Motor 4's horns with 4× M3×6 on both sides."],
    specs: [["Fasteners", "8× M3×6 + 2× M2×6"]],
    step: 7,
  },
  {
    id: "m5", num: 14, name: "Motor 5 – Wrist roll", type: "actuator", qty: "1", joint: "Joint 5 · wrist_roll · ID 5",
    blurb: "Rolls the gripper about its own axis to turn a knob, pour a cup, or align the jaws.",
    details: ["Only ONE horn is fitted — on the front — and it carries the gripper body with 4× M3×6.", "Rolling changes orientation, not fingertip position."],
    specs: [["Follower gearing", "1 / 345"]],
    leaderSpecs: [["Leader gearing", "1 / 147"]],
    step: 7,
  },
  {
    id: "gripper_body", num: 15, name: "Gripper body & fixed jaw", leaderName: "Leader handle", type: "printed", qty: "1", joint: "End effector",
    blurb: "Holds the gripper servo and forms the stationary half of the claw (follower) — or the handle you hold (leader).",
    details: [
      "Follower: plates around the gripper motor with a fixed finger; add TPU pads for friction.",
      "Leader: a pistol-grip handle so you can squeeze a trigger to command the follower's gripper.",
      "The wrist-camera mount clips onto this body — extremely valuable for imitation learning.",
    ],
    specs: [["Fasteners", "4× M3×6 to wrist horn"], ["Opening", "≈ 6 cm max (≈ 4 cm usable)"]],
    tip: "Print TPU finger pads — cubes and cups become dramatically less slippery.",
    step: 8,
  },
  {
    id: "m6", num: 16, name: "Motor 6 – Gripper", type: "actuator", qty: "1", joint: "Joint 6 · gripper · ID 6",
    blurb: "Opens and closes the moving jaw. Its load read-back tells you an object has been grasped.",
    details: ["Inserted into the gripper body with 2× M2×6 per side.", "In LeRobot the gripper is a normalised 0–100 range rather than degrees."],
    specs: [["Follower gearing", "1 / 345"]],
    leaderSpecs: [["Leader gearing", "1 / 147"]],
    step: 8,
  },
  {
    id: "moving_jaw", num: 17, name: "Moving jaw", leaderName: "Trigger", type: "printed", qty: "1", joint: "End effector",
    blurb: "The moving claw (follower) or the trigger (leader).",
    details: ["Follower: attached to the gripper motor horn with 4× M3×6 on both sides.", "Leader: the trigger lets your index finger drive the follower gripper proportionally."],
    specs: [["Fasteners", "8× M3×6"]],
    step: 8,
  },
];

export const PART_BY_ID: Record<string, PartInfo> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export const LEADER_MOTORS = [
  { axis: "Base / Shoulder pan", id: 1, ratio: "1 / 191" },
  { axis: "Shoulder lift", id: 2, ratio: "1 / 345" },
  { axis: "Elbow flex", id: 3, ratio: "1 / 191" },
  { axis: "Wrist flex", id: 4, ratio: "1 / 147" },
  { axis: "Wrist roll", id: 5, ratio: "1 / 147" },
  { axis: "Gripper", id: 6, ratio: "1 / 147" },
];

export const BUILD_STEPS = [
  "Controller board & cables",
  "Base",
  "Joint 1 — shoulder pan",
  "Shoulder bracket",
  "Joint 2 — shoulder lift",
  "Joint 3 — elbow flex",
  "Joint 4 — wrist flex",
  "Joint 5 — wrist roll",
  "Gripper / handle",
];
