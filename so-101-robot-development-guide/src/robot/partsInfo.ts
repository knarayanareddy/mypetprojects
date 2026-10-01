export interface PartInfo {
  id: string;
  name: string;
  kind: 'Printed part' | 'Servo motor' | 'Electronics';
  qty: string;
  joint: string;
  role: string;
  specs: string[];
  tips: string[];
  fasteners?: string;
}

export const MOTOR_GEARS: Record<string, { follower: string; leader: string; joint: string }> = {
  m1: { follower: '1/345', leader: '1/191', joint: 'Shoulder pan (ID 1)' },
  m2: { follower: '1/345', leader: '1/345', joint: 'Shoulder lift (ID 2)' },
  m3: { follower: '1/345', leader: '1/191', joint: 'Elbow flex (ID 3)' },
  m4: { follower: '1/345', leader: '1/147', joint: 'Wrist flex (ID 4)' },
  m5: { follower: '1/345', leader: '1/147', joint: 'Wrist roll (ID 5)' },
  m6: { follower: '1/345', leader: '1/147', joint: 'Gripper (ID 6)' },
};

const motorCommon = [
  'Feetech STS3215 serial bus servo, 45.2 × 24.7 × 35 mm',
  '7.4 V version: ~16.5 kg·cm stall torque @ 6 V (12 V version: 30 kg·cm)',
  'Magnetic encoder, 4096 steps/rev, daisy-chained 3-pin TTL bus',
];

export const PART_INFO: PartInfo[] = [
  {
    id: 'base', name: 'Base', kind: 'Printed part', qty: '1', joint: 'Joint 1',
    role: 'The foundation of the arm. It houses the shoulder-pan motor (M1), gives you a flat plate with clamp lips so the arm can be fixed to a table, and carries the motor-bus controller board on its back.',
    specs: ['PLA+, 0.4 mm nozzle, 0.2 mm layers, 15 % infill', 'Clamp with 2 table clamps (follower) so the arm cannot walk when it moves fast'],
    tips: ['Print with supports everywhere except slopes > 45°; no supports inside horizontal screw holes.', 'Test-fit a servo in the pocket with the “Gauge” prints before printing everything.'],
    fasteners: '4 × M2×6 mm (motor 1: two from top, two from bottom)',
  },
  {
    id: 'm1', name: 'Motor 1 – Shoulder Pan', kind: 'Servo motor', qty: '1', joint: 'Joint 1',
    role: 'Rotates the entire arm left/right (yaw) around the vertical axis. Carries the weight and the torque of everything above it, hence the gearing 1/345 on the follower.',
    specs: [...motorCommon, 'Bus ID = 1', 'Range after calibration ≈ ±110°'],
    tips: ['Set its ID with lerobot-setup-motors BEFORE you screw it in – it is much harder afterwards.', 'Install both horns first: secure the top horn with one M3×6, the bottom horn needs no screw.'],
    fasteners: 'Horn: 1 × M3×6 (top). Body: 4 × M2×6',
  },
  {
    id: 'm1_holder', name: 'Motor 1 Holder', kind: 'Printed part', qty: '1', joint: 'Joint 1',
    role: 'A clamp plate that slides over the first motor and locks it inside the base so the motor body cannot twist when the shoulder pushes on the horn.',
    specs: ['Fastened with 2 × M2×6 (one per side)'],
    tips: ['Slide it on from the top; if it is tight, lightly sand the print rather than forcing it.'],
    fasteners: '2 × M2×6 mm',
  },
  {
    id: 'board', name: 'Motor-Bus Controller Board', kind: 'Electronics', qty: '1 per arm', joint: 'Electronics',
    role: 'Waveshare serial-bus servo driver. Takes USB-C from your laptop and power from the wall adapter, and speaks the half-duplex TTL protocol to the daisy-chained servos.',
    specs: ['Jumpers on channel B (USB) – required for LeRobot', 'Follower 7.4 V → 5 V / 5 A supply (12 V motors need a 12 V / 5 A+ supply)', 'Leader is always 7.4 V motors'],
    tips: ['Use lerobot-find-port to find which /dev/tty… belongs to which arm; label the cables!', 'Power first, USB second – check the power cable didn’t get yanked while you handle the board.'],
  },
  {
    id: 'shoulder', name: 'Shoulder Bracket', kind: 'Printed part', qty: '1', joint: 'Joint 1 → 2',
    role: 'Sits on the top horn of motor 1 and rotates with it. Its two cheeks form the yoke in which the shoulder-lift motor (M2) sits.',
    specs: ['4 × M3×6 on top + 4 × M3×6 on the bottom to the horn'],
    tips: ['This is the highest-stress printed part in the base – print with ≥ 3 perimeters if you plan to lift heavy things.'],
    fasteners: '8 × M3×6 mm',
  },
  {
    id: 'm2', name: 'Motor 2 – Shoulder Lift', kind: 'Servo motor', qty: '1', joint: 'Joint 2',
    role: 'The big muscle: lifts the whole upper arm, forearm, wrist and payload against gravity. It sees the highest static torque in the robot.',
    specs: [...motorCommon, 'Bus ID = 2', 'Always 1/345 gearing – on both leader and follower (so the leader can hold its own weight)'],
    tips: ['Slide it in from the top, fasten with 4 × M2×6.', 'If this joint “sags” or buzzes during policies, check supply voltage first – brown-outs hit M2 hardest.'],
    fasteners: 'Horns: 1 × M3×6. Body: 4 × M2×6',
  },
  {
    id: 'm2_holder', name: 'Shoulder Motor Holder', kind: 'Printed part', qty: '1', joint: 'Joint 1',
    role: 'Closes the yoke of the shoulder bracket around motor 2 so it is held on both sides.',
    specs: ['Added at the end of Joint 1 in the official guide'],
    tips: ['Don’t over-tighten – PLA cracks around the M2 screws.'],
    fasteners: 'Screws supplied in the Joint 1 step',
  },
  {
    id: 'upper_arm', name: 'Upper Arm', kind: 'Printed part', qty: '1', joint: 'Joint 2 → 3',
    role: 'The first long link (~11.6 cm). Bolted to the horn of motor 2 on one end and carries motor 3 (elbow) on the other.',
    specs: ['4 × M3×6 on each side to the horns'],
    tips: ['Check the arm swings freely through its whole range before adding more weight above.'],
    fasteners: '8 × M3×6 mm',
  },
  {
    id: 'm3', name: 'Motor 3 – Elbow Flex', kind: 'Servo motor', qty: '1', joint: 'Joint 3',
    role: 'Bends the elbow, deciding how far the arm reaches out. Combined with M2 it positions the wrist in the arm’s vertical plane (the “2-link IK” plane).',
    specs: [...motorCommon, 'Bus ID = 3', 'Leader: 1/191 gearing'],
    tips: ['Install one 3-pin cable immediately after seating each motor – it’s awkward to do later.'],
    fasteners: 'Horns: 1 × M3×6. Body: 4 × M2×6',
  },
  {
    id: 'forearm', name: 'Forearm (Lower Arm)', kind: 'Printed part', qty: '1', joint: 'Joint 3 → 4',
    role: 'The second long link (~13.5 cm). Attaches to the elbow motor’s horn and hosts the wrist-flex motor at the far end.',
    specs: ['4 × M3×6 on each side to motor 3'],
    tips: ['Route the motor cables through the channel in the forearm so they don’t snag at full elbow extension.'],
    fasteners: '8 × M3×6 mm',
  },
  {
    id: 'm4_holder', name: 'Wrist Motor Holder', kind: 'Printed part', qty: '1', joint: 'Joint 4',
    role: 'Clamps the wrist-flex motor into the forearm tip.',
    specs: ['Slides over the motor before the motor goes in'],
    tips: ['Order matters: slide the holder on BEFORE seating motor 4.'],
  },
  {
    id: 'm4', name: 'Motor 4 – Wrist Flex', kind: 'Servo motor', qty: '1', joint: 'Joint 4',
    role: 'Pitches the gripper up/down so you can approach objects from above, from the side, or at any angle in between – crucial for top-down grasps.',
    specs: [...motorCommon, 'Bus ID = 4', 'Leader: 1/147 gearing'],
    tips: ['Calibration “middle of range” pose has the wrist straight, not curled.'],
    fasteners: 'Horns: 1 × M3×6. Body: 4 × M2×6',
  },
  {
    id: 'wrist_bracket', name: 'Wrist Bracket (Wrist Roll)', kind: 'Printed part', qty: '1', joint: 'Joint 5',
    role: 'Connects the wrist-flex horn to the wrist-roll motor and holds it in a pocket.',
    specs: ['4 × M3×6 on both sides to motor 4', '2 × M2×6 front screws into the pocket'],
    tips: ['Only ONE horn is installed on motor 5 – the other side has the bearing of the bracket.'],
    fasteners: '8 × M3×6 + 2 × M2×6',
  },
  {
    id: 'm5', name: 'Motor 5 – Wrist Roll', kind: 'Servo motor', qty: '1', joint: 'Joint 5',
    role: 'Rolls the gripper around its own axis – lets you orient the jaws to a handle, a domino, a pen or a pouring bottle.',
    specs: [...motorCommon, 'Bus ID = 5', 'Leader: 1/147 gearing'],
    tips: ['Horn screw M3×6 on the roll horn; this joint is the one that most often needs re-calibration after a crash.'],
    fasteners: 'Horn: 1 × M3×6. Body: 2 × M2×6',
  },
  {
    id: 'gripper_body', name: 'Gripper Body + Fixed Jaw', kind: 'Printed part', qty: '1', joint: 'Gripper',
    role: 'Carries the gripper motor and forms the fixed half of the jaw. Follower: parallel-style claw. Leader: replaced by an ergonomic handle with a trigger.',
    specs: ['Compliant TPU fingers / grip tape are popular upgrades for slippery objects', 'Optional wrist-camera mounts (32×32 UVC, RealSense D405…) bolt on here'],
    tips: ['Fit a wrist camera early – nearly every modern policy (ACT, SmolVLA, π0 …) performs far better with a wrist view.'],
    fasteners: '4 × M3×6 to the motor-5 horn; gripper motor 2 × M2×6 each side',
  },
  {
    id: 'm6', name: 'Motor 6 – Gripper', kind: 'Servo motor', qty: '1', joint: 'Gripper',
    role: 'Opens and closes the moving jaw. On the leader arm it measures how far you squeeze the trigger; on the follower it replicates it and gives load feedback.',
    specs: [...motorCommon, 'Bus ID = 6 (set first – it is the first motor in the setup script)', 'Leader: 1/147 gearing'],
    tips: ['Gripper is the first motor you plug in during lerobot-setup-motors.', 'Don’t command the gripper beyond the object width for long – it will stall and overheat.'],
    fasteners: 'Horns: 1 × M3×6; body: 2 × M2×6 each side',
  },
  {
    id: 'moving_jaw', name: 'Moving Jaw / Trigger', kind: 'Printed part', qty: '1', joint: 'Gripper',
    role: 'The moving half of the claw (follower) or the trigger you squeeze (leader). Attached to the gripper motor’s horn.',
    specs: ['4 × M3×6 on both sides'],
    tips: ['Check it closes fully without rubbing the fixed jaw – calibration records this position as “closed”.'],
    fasteners: '8 × M3×6 mm',
  },
];

export const PART_BY_ID: Record<string, PartInfo> = Object.fromEntries(PART_INFO.map((p) => [p.id, p]));

export interface AssemblyStep {
  title: string;
  parts: string[];
  actions: string[];
  warn?: string;
}

export const ASSEMBLY: AssemblyStep[] = [
  {
    title: '0 · Prepare: clean parts & set motor IDs',
    parts: [],
    actions: [
      'Remove all support material from every printed part – a small flat screwdriver under the support works best.',
      'Run lerobot-setup-motors for each arm and plug in ONE motor at a time, starting with the gripper (ID 6) and ending with shoulder_pan (ID 1).',
      'Install one 3-pin cable in each motor right after you set its ID (before assembly).',
    ],
    warn: 'Leader arm uses 3 different gear ratios (1/191, 1/345, 1/147). Mix them up and the leader won’t hold its own weight or will feel stiff.',
  },
  {
    title: '1 · Joint 1 – base & shoulder pan',
    parts: ['base', 'm1', 'm1_holder', 'shoulder', 'm2_holder'],
    actions: [
      'Install both motor horns on motor 1. Secure the top horn with an M3×6 screw; the bottom horn needs no screw.',
      'Place motor 1 into the base. Fasten with 4 × M2×6 (two from the top, two from the bottom).',
      'Slide the first motor holder over motor 1 and fasten with 2 × M2×6 (one per side).',
      'Attach the shoulder part: 4 × M3×6 on top and 4 × M3×6 on the bottom.',
      'Add the shoulder motor holder.',
    ],
  },
  {
    title: '2 · Joint 2 – shoulder lift',
    parts: ['m2', 'upper_arm'],
    actions: [
      'Install both horns on motor 2 (top horn: 1 × M3×6, bottom: none).',
      'Slide motor 2 in from the top and fasten with 4 × M2×6.',
      'Attach the upper arm with 4 × M3×6 on each side.',
    ],
  },
  {
    title: '3 · Joint 3 – elbow',
    parts: ['m3', 'forearm'],
    actions: [
      'Install both horns on motor 3.',
      'Insert motor 3 and fasten with 4 × M2×6.',
      'Connect the forearm to motor 3 using 4 × M3×6 on each side.',
    ],
  },
  {
    title: '4 · Joint 4 – wrist flex',
    parts: ['m4_holder', 'm4'],
    actions: [
      'Install both horns on motor 4 (top horn: 1 × M3×6).',
      'Slide over motor holder 4 first, then slide in motor 4.',
      'Fasten motor 4 with 4 × M2×6.',
    ],
  },
  {
    title: '5 · Joint 5 – wrist roll',
    parts: ['wrist_bracket', 'm5'],
    actions: [
      'Insert motor 5 into the wrist holder and secure with 2 × M2×6 front screws.',
      'Install only ONE horn on the wrist motor and secure it with a M3×6 horn screw.',
      'Secure the wrist to motor 4 with 4 × M3×6 on both sides.',
    ],
  },
  {
    title: '6 · Gripper (follower) / handle (leader)',
    parts: ['gripper_body', 'm6', 'moving_jaw'],
    actions: [
      'Attach the gripper body to motor 5 – 4 × M3×6 into the horn on the wrist.',
      'Insert the gripper motor and secure it with 2 × M2×6 on each side.',
      'Install both horns on the gripper motor (top: 1 × M3×6).',
      'Install the gripper claw (follower) or trigger (leader) with 4 × M3×6 on both sides.',
    ],
  },
  {
    title: '7 · Electronics & cable management',
    parts: ['board'],
    actions: [
      'Daisy-chain the 3-pin cables: gripper → wrist roll → wrist flex → elbow → shoulder lift → shoulder pan → controller board.',
      'Mount the controller board on the base; check both Waveshare jumpers are on the B (USB) channel.',
      'Connect power first, then USB-C. Run lerobot-calibrate for follower and leader.',
    ],
    warn: 'Leave enough slack at every joint, then do a full range-of-motion check by hand BEFORE powering the motors.',
  },
];

export interface BomRow { part: string; qty: string; cost: string; note?: string }
export const BOM_TWO_ARMS: BomRow[] = [
  { part: 'STS3215 servo 7.4 V, 1/345 gear (C001)', qty: '7', cost: '$13.89', note: '6 follower + 1 leader (shoulder lift)' },
  { part: 'STS3215 servo 7.4 V, 1/191 gear (C044)', qty: '2', cost: '$13.89', note: 'Leader: shoulder pan + elbow' },
  { part: 'STS3215 servo 7.4 V, 1/147 gear (C046)', qty: '3', cost: '$13.89', note: 'Leader: wrist flex, wrist roll, gripper' },
  { part: 'Motor control board (Waveshare)', qty: '2', cost: '$10.60' },
  { part: 'USB-C cable (2 pcs)', qty: '1', cost: '$7.00' },
  { part: 'Power supply (5 V; 12 V if using 12 V motors)', qty: '2', cost: '$10.00' },
  { part: 'Table clamps (4 pcs)', qty: '1', cost: '$9.00' },
  { part: 'Precision screwdriver set (Phillips #0 & #1)', qty: '1', cost: '$6.00' },
  { part: '3D-printed frame, PLA+ (both arms)', qty: '1 set', cost: 'filament', note: 'or buy a printed kit' },
];
export const BOM_TOTAL = '≈ $230 for leader + follower (≈ $122 for one follower)';

export const PRINT_SETTINGS = [
  ['Material', 'PLA+'],
  ['Nozzle / layer', '0.4 mm @ 0.2 mm   (or 0.6 mm @ 0.4 mm)'],
  ['Infill', '15 %'],
  ['Supports', 'Everywhere, ignore slopes > 45° · none in horizontal screw holes'],
  ['Bed prep', 'Clean, level, thin glue-stick layer if your printer recommends it'],
  ['Accuracy check', 'Print Gauge Zero / Gauge One from the STL/Gauges folder to verify servo fit'],
];

export interface CmdBlock { title: string; why: string; code: string }
export const SETUP_COMMANDS: CmdBlock[] = [
  {
    title: '1 · Install LeRobot + Feetech SDK',
    why: 'Python 3.12+, PyTorch 2.x. The [feetech] extra provides the servo driver.',
    code: `git clone https://github.com/huggingface/lerobot.git && cd lerobot
pip install -e ".[feetech]"
# (optional, for training) pip install -e ".[training]"`,
  },
  {
    title: '2 · Find the USB port of each arm',
    why: 'Run it once per arm: unplug the USB cable when asked and note the port that disappeared.',
    code: `lerobot-find-port
# Linux example:  /dev/ttyACM0  (leader)  /dev/ttyACM1  (follower)
# macOS example:  /dev/tty.usbmodem585A0076841
sudo chmod 666 /dev/ttyACM*     # Linux: allow user access`,
  },
  {
    title: '3 · Set motor IDs & baudrate (one motor at a time!)',
    why: 'Each servo ships with ID 1. The script walks you through gripper → … → shoulder_pan and writes the IDs to EEPROM.',
    code: `# FOLLOWER
lerobot-setup-motors \\
    --robot.type=so101_follower \\
    --robot.port=/dev/ttyACM1

# LEADER
lerobot-setup-motors \\
    --teleop.type=so101_leader \\
    --teleop.port=/dev/ttyACM0`,
  },
  {
    title: '4 · Calibrate (so a policy trained on one arm works on another)',
    why: 'Move every joint to the middle of its range, press Enter, then sweep each joint through its full range.',
    code: `lerobot-calibrate \\
    --robot.type=so101_follower \\
    --robot.port=/dev/ttyACM1 \\
    --robot.id=my_awesome_follower_arm

lerobot-calibrate \\
    --teleop.type=so101_leader \\
    --teleop.port=/dev/ttyACM0 \\
    --teleop.id=my_awesome_leader_arm`,
  },
  {
    title: '5 · Teleoperate (leader → follower)',
    why: 'First sanity check: the follower should mirror the leader with no jitter. Add cameras to see them live.',
    code: `lerobot-teleoperate \\
    --robot.type=so101_follower \\
    --robot.port=/dev/ttyACM1 \\
    --robot.id=my_awesome_follower_arm \\
    --robot.cameras="{ front: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30}, wrist: {type: opencv, index_or_path: 2, width: 640, height: 480, fps: 30}}" \\
    --teleop.type=so101_leader \\
    --teleop.port=/dev/ttyACM0 \\
    --teleop.id=my_awesome_leader_arm \\
    --display_data=true`,
  },
  {
    title: '6 · Record demonstrations (≈ 50 per task)',
    why: 'Vary object positions deliberately. Keep camera keys, task wording and lighting identical between recording and deployment.',
    code: `lerobot-record \\
    --robot.type=so101_follower --robot.port=/dev/ttyACM1 --robot.id=my_awesome_follower_arm \\
    --robot.cameras="{ front: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30}}" \\
    --teleop.type=so101_leader --teleop.port=/dev/ttyACM0 --teleop.id=my_awesome_leader_arm \\
    --dataset.repo_id=\${HF_USER}/so101_pick_place \\
    --dataset.num_episodes=50 \\
    --dataset.single_task="Pick up the red block and put it in the bin"`,
  },
  {
    title: '7 · Train a policy (ACT shown; swap --policy.type or --policy.path)',
    why: 'No GPU? Add --job.target=a10g-small and LeRobot trains in the cloud on HF Jobs.',
    code: `# From scratch
lerobot-train \\
    --dataset.repo_id=\${HF_USER}/so101_pick_place \\
    --policy.type=act \\
    --policy.repo_id=\${HF_USER}/act_so101_pick_place \\
    --policy.device=cuda --steps=100000

# Fine-tune a pretrained VLA instead
lerobot-train \\
    --policy.path=lerobot/smolvla_base \\
    --dataset.repo_id=\${HF_USER}/so101_pick_place \\
    --batch_size=64 --steps=20000 --policy.device=cuda`,
  },
  {
    title: '8 · Deploy on the robot (+ DAgger corrections)',
    why: 'lerobot-rollout runs the policy; the dagger strategy lets you grab the leader arm to correct mistakes and records them for the next fine-tune.',
    code: `lerobot-rollout \\
    --strategy.type=base \\
    --policy.path=\${HF_USER}/act_so101_pick_place \\
    --robot.type=so101_follower --robot.port=/dev/ttyACM1 --robot.id=my_awesome_follower_arm \\
    --robot.cameras="{ front: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 30}}" \\
    --task="Pick up the red block and put it in the bin" --duration=30

# human-in-the-loop flywheel
lerobot-rollout --strategy.type=dagger ... --teleop.type=so101_leader --teleop.port=/dev/ttyACM0`,
  },
];

export const TROUBLESHOOTING = [
  ['“No motor found on port” while setting IDs', 'Check: power supply connected, USB-C connected, 3-pin cable seated, only ONE motor on the bus. On Waveshare boards both jumpers must be on channel B.'],
  ['Joint buzzes / sags / resets', 'Voltage drop. Use the proper 5 A supply, shorten the chain, and make sure no cable is pulled tight at full extension.'],
  ['Follower mirrors the leader with an offset', 'Calibration was done in different poses. Re-run lerobot-calibrate for both arms from the same “middle” pose.'],
  ['Policy moves in the wrong direction', 'Reversed calibration or camera key mismatch – the interface (camera names, state/action layout, task text) must match the dataset exactly.'],
  ['Gripper overheats', 'It was commanded past the object width. Lower the gripper close limit or use a compliant TPU finger.'],
  ['Robot “walks” on the table', 'Clamp the base with both clamps and keep cables from tugging the base.'],
];
