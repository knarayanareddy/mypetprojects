/**
 * Model registry + LeRobot CLI generators.
 * Commands follow the current LeRobot docs (lerobot-rollout, lerobot-record, lerobot-train...).
 * Ratings are editorial estimates for hackathon planning, NOT benchmark results.
 */

export interface ModelEntry {
  id: string;
  name: string;
  kind: "classical" | "policy" | "vla" | "agent" | "world-model";
  org: string;
  summary: string;
  hfRepo: string; // default checkpoint or ""
  policyType: string | null; // lerobot --policy.type for training
  runsViaRollout: boolean;
  params: string;
  gpu: string;
  dataNeeded: string;
  language: boolean;
  cameras: string;
  ratings: { dataEfficiency: number; generalization: number; speed: number; setupEase: number; hackathonWow: number };
  bestFor: string[];
  caveats: string[];
  links: { label: string; url: string }[];
  extraRolloutArgs?: string[];
}

export const MODELS: ModelEntry[] = [
  {
    id: "builtin", name: "Built-in: Vision + IK Missions", kind: "classical", org: "This app",
    summary: "Colour/diff detection → homography → analytic IK → stall-checked grasp. Deterministic, explainable, needs no training or GPU.",
    hfRepo: "", policyType: null, runsViaRollout: false, params: "0", gpu: "none (browser)", dataNeeded: "0 demos (calibration only)", language: false,
    cameras: "1 overhead USB camera",
    ratings: { dataEfficiency: 5, generalization: 1, speed: 5, setupEase: 4, hackathonWow: 3 },
    bestFor: ["Pick & place of distinct objects", "Drawing, pressing, stacking", "Anything with known geometry"],
    caveats: ["Needs objects distinct from the table (or use background-subtraction mode)", "Single-plane assumption: objects must be on the table", "No contact-rich or deformable-object skill"],
    links: [],
  },
  {
    id: "act", name: "ACT (Action Chunking Transformer)", kind: "policy", org: "LeRobot / ALOHA",
    summary: "The standard SO-101 imitation-learning baseline. Predicts chunks of future joint targets from camera images + joint state. Train per task.",
    hfRepo: "", policyType: "act", runsViaRollout: true, params: "~50M", gpu: "consumer GPU (8 GB) to train; runs on laptop GPU/CPU", dataNeeded: "≈50 teleop episodes per task", language: false,
    cameras: "1–2 (names must match training)",
    ratings: { dataEfficiency: 4, generalization: 2, speed: 4, setupEase: 4, hackathonWow: 3 },
    bestFor: ["One well-practised task (pick the cube, put in the box)", "Fine, smooth motions", "Fast to train in a hackathon"],
    caveats: ["Overfits to the training scene: same camera pose, lighting, objects", "No language: one policy per task"],
    links: [{ label: "LeRobot SO-101 docs", url: "https://huggingface.co/docs/lerobot/en/so101" }],
  },
  {
    id: "diffusion", name: "Diffusion Policy", kind: "policy", org: "LeRobot / Columbia",
    summary: "Multimodal action distribution via denoising. Good with multiple valid strategies; slower inference than ACT.",
    hfRepo: "", policyType: "diffusion", runsViaRollout: true, params: "~100M+", gpu: "12 GB+ GPU recommended", dataNeeded: "≈50–100 episodes per task", language: false,
    cameras: "1–2",
    ratings: { dataEfficiency: 3, generalization: 3, speed: 2, setupEase: 3, hackathonWow: 3 },
    bestFor: ["Tasks with several valid solutions", "Pushing / contact-rich"],
    caveats: ["Heavier inference → latency", "Tuning of horizon/n_action_steps needed"],
    links: [],
  },
  {
    id: "smolvla", name: "SmolVLA", kind: "vla", org: "Hugging Face",
    summary: "Lightweight (~450M) vision-language-action model pretrained on community SO-100/101 data. Takes a language task and multiple camera views. Fine-tune on ~50 episodes.",
    hfRepo: "lerobot/smolvla_base", policyType: "smolvla", runsViaRollout: true, params: "~450M", gpu: "single consumer GPU / recent MacBook for inference", dataNeeded: "≈50 episodes to fine-tune (zero-shot is weak)", language: true,
    cameras: "1–3 (must match fine-tune dataset keys)",
    ratings: { dataEfficiency: 4, generalization: 4, speed: 3, setupEase: 3, hackathonWow: 5 },
    bestFor: ["Language-instructed pick & place", "Multi-task single checkpoint", "Best default VLA for SO-101"],
    caveats: ["Base checkpoint is not a magic zero-shot controller; fine-tune on your scene", "Use --inference.type=rtc on weak hardware"],
    links: [{ label: "SmolVLA docs", url: "https://huggingface.co/docs/lerobot/en/smolvla" }],
    extraRolloutArgs: [],
  },
  {
    id: "pi0", name: "π0 / π0.5 (Physical Intelligence)", kind: "vla", org: "Physical Intelligence · LeRobot port",
    summary: "Large flow-matching VLA with strong generalisation. Heavy: fine-tuning needs a big GPU; inference works best with Real-Time Chunking.",
    hfRepo: "lerobot/pi0_base", policyType: "pi0", runsViaRollout: true, params: "~3B", gpu: "24 GB+ GPU (A100/4090) to fine-tune; RTC for inference", dataNeeded: "≈50+ episodes to fine-tune", language: true,
    cameras: "1–3",
    ratings: { dataEfficiency: 4, generalization: 5, speed: 2, setupEase: 2, hackathonWow: 5 },
    bestFor: ["Open-ended language tasks if you have a big GPU", "Cloth / deformable demos"],
    caveats: ["Needs serious GPU (rent one at the hackathon)", "Latency on laptops: enable RTC"],
    links: [{ label: "LeRobot inference/RTC", url: "https://huggingface.co/docs/lerobot/main/inference" }],
    extraRolloutArgs: ["--inference.type=rtc", "--inference.rtc.execution_horizon=10", "--inference.rtc.max_guidance_weight=10.0", "--device=cuda"],
  },
  {
    id: "groot", name: "GR00T N1.5 (NVIDIA)", kind: "vla", org: "NVIDIA",
    summary: "Humanoid-oriented foundation model with an SO-101 fine-tuning path from NVIDIA. Requires NVIDIA GPU and Isaac-GR00T tooling.",
    hfRepo: "nvidia/GR00T-N1.5-3B", policyType: "groot", runsViaRollout: true, params: "~3B", gpu: "NVIDIA GPU 24 GB+", dataNeeded: "fine-tune on your SO-101 episodes", language: true,
    cameras: "1–2",
    ratings: { dataEfficiency: 3, generalization: 4, speed: 2, setupEase: 2, hackathonWow: 4 },
    bestFor: ["Teams with an NVIDIA workstation / Jetson Thor"],
    caveats: ["Verify LeRobot version supports --policy.type=groot; otherwise use NVIDIA's own SO-101 recipe", "Heavy setup"],
    links: [],
  },
  {
    id: "molmoact2", name: "MolmoAct 2 (AI2)", kind: "vla", org: "Allen Institute for AI",
    summary: "Action-reasoning model with a public SO-100/101 community dataset (allenai/MolmoAct2-SO100_101-Dataset). Strong candidate for language-conditioned SO-101 tasks.",
    hfRepo: "", policyType: null, runsViaRollout: false, params: "multi-B", gpu: "large GPU (server side)", dataNeeded: "pretrained on SO-100/101 data; fine-tune optional", language: true,
    cameras: "1–2",
    ratings: { dataEfficiency: 4, generalization: 5, speed: 1, setupEase: 1, hackathonWow: 5 },
    bestFor: ["Ambitious demo: instruction → reasoning → action on SO-101", "Run as a remote inference server"],
    caveats: ["Check the model card for the exact inference API; not a lerobot-rollout checkpoint by default", "Use the Policy Server pattern: GPU box runs the model, this app sends images + state, executes returned actions"],
    links: [{ label: "SO-100/101 dataset", url: "https://huggingface.co/datasets/allenai/MolmoAct2-SO100_101-Dataset" }],
  },
  {
    id: "vlm-agent", name: "VLM Agent (skills as tools)", kind: "agent", org: "so101-vlm-agent pattern",
    summary: "A hosted VLM looks at the camera image, picks a skill (pick, place, push, press...) and parameters; this app's verified skills execute it. Planning by the VLM, safety by the controller.",
    hfRepo: "", policyType: null, runsViaRollout: false, params: "API / any VLM", gpu: "none locally (cloud VLM)", dataNeeded: "0 demos", language: true,
    cameras: "1 overhead",
    ratings: { dataEfficiency: 5, generalization: 4, speed: 2, setupEase: 3, hackathonWow: 5 },
    bestFor: ["'Put the red thing next to the blue one' style commands", "Fastest path to a language-driven demo that actually works"],
    caveats: ["Depends on connectivity / API latency", "VLM pixel-picking is only as accurate as your camera calibration (validate it!)"],
    links: [{ label: "so101-vlm-agent", url: "https://github.com/daniiarabdiev/so101-vlm-agent" }],
  },
  {
    id: "visionary", name: "Visionary (Dreamer-4 world model)", kind: "world-model", org: "james0248",
    summary: "A 300M world model trained on community SO-101 data (plus SOAR, BridgeData). It predicts video of what will happen: it is NOT an action policy.",
    hfRepo: "", policyType: null, runsViaRollout: false, params: "300M", gpu: "GPU for rollouts", dataNeeded: "n/a (pretrained)", language: false,
    cameras: "n/a",
    ratings: { dataEfficiency: 3, generalization: 3, speed: 1, setupEase: 1, hackathonWow: 4 },
    bestFor: ["Evaluating/ranking candidate plans in imagination before moving", "A research-flavoured story for judges"],
    caveats: ["Does not output joint commands; using it for control means building planning or policy-training on top", "Will not improve a working policy by itself during a hackathon: show it as a 'what-if preview' feature"],
    links: [{ label: "visionary", url: "https://github.com/james0248/visionary" }],
  },
];

export const SENSORS = [
  { name: "Overhead USB camera (1080p, fixed mount)", need: "Required for vision missions", why: "Object localisation via homography. Mount rigidly, fixed focus, even lighting." },
  { name: "Wrist camera (small USB, on the gripper)", need: "Strongly recommended for policies", why: "SmolVLA/ACT success rises sharply with a wrist view for grasp alignment." },
  { name: "Second SO-101 as leader arm", need: "Required to record demos / teleop", why: "Leader–follower teleoperation → datasets for ACT/SmolVLA/π0." },
  { name: "Depth camera (RealSense / Orbbec)", need: "Optional", why: "Lifts the single-plane assumption: stacked or elevated objects." },
  { name: "Servo load / current (built-in)", need: "Already available", why: "Used for stall-based grasp verification and collision detection: no extra sensor." },
  { name: "Load cell + HX711", need: "Optional", why: "Weigh what was poured/picked; closes the loop on the pour mission." },
  { name: "Hardware E-stop on the power rail", need: "Strongly recommended", why: "The software E-stop depends on the USB link. A physical switch on the 5V/12V supply does not." },
  { name: "Microphone", need: "Optional", why: "Voice commands → VLM agent → skills." },
];

export interface RolloutCfg {
  port: string;
  robotId: string;
  task: string;
  duration: number;
  policyPath: string;
  cameras: { name: string; index: string; width: number; height: number; fps: number }[];
  leaderPort?: string;
  leaderId?: string;
  rtc?: boolean;
  device?: string;
  /** Only for strategies that use a teleoperator (dagger / episodic). `base` never opens the leader port. */
  useLeader?: boolean;
}

export function camerasArg(cams: RolloutCfg["cameras"]): string {
  return `{ ${cams.map((c) => `${c.name}: {type: opencv, index_or_path: ${c.index}, width: ${c.width}, height: ${c.height}, fps: ${c.fps}}`).join(", ")} }`;
}

export type Cmd = { title: string; argv: string[] };

export function show(argv: string[]): string {
  return argv
    .map((a, i) => (i === 0 ? a : /[\s{}"]/.test(a) ? `${a.split("=")[0]}="${a.slice(a.indexOf("=") + 1)}"` : a))
    .join(" \\\n  ");
}

export function rolloutCmd(m: ModelEntry, c: RolloutCfg): Cmd {
  const argv = [
    "lerobot-rollout",
    "--strategy.type=base",
    "--robot.type=so101_follower",
    `--robot.port=${c.port}`,
    `--robot.id=${c.robotId}`,
    `--robot.cameras=${camerasArg(c.cameras)}`,
    `--policy.path=${c.policyPath || m.hfRepo || "<user>/<policy>"}`,
    `--task=${c.task}`,
    `--duration=${c.duration}`,
  ];
  if (c.rtc) argv.push("--inference.type=rtc", "--inference.rtc.execution_horizon=10", "--inference.rtc.max_guidance_weight=10.0");
  if (c.device) argv.push(`--device=${c.device}`);
  if (c.useLeader && c.leaderPort) argv.push("--teleop.type=so101_leader", `--teleop.port=${c.leaderPort}`, `--teleop.id=${c.leaderId || "my_leader"}`);
  return { title: `Run ${m.name} on the follower`, argv };
}

/** Policies that are fine-tuned from a pretrained checkpoint rather than trained from scratch. */
const FINETUNE_BASE: Record<string, string> = { smolvla: "lerobot/smolvla_base", pi0: "lerobot/pi0_base" };

export function setupCommands(c: RolloutCfg, repo: string, policyType: string): Cmd[] {
  const cams = `--robot.cameras=${camerasArg(c.cameras)}`;
  const follower = ["--robot.type=so101_follower", `--robot.port=${c.port}`, `--robot.id=${c.robotId}`];
  const leader = ["--teleop.type=so101_leader", `--teleop.port=${c.leaderPort || "/dev/ttyACM1"}`, `--teleop.id=${c.leaderId || "my_leader"}`];
  return [
    { title: "1. Assign motor IDs (follower, one motor at a time)", argv: ["lerobot-setup-motors", "--robot.type=so101_follower", `--robot.port=${c.port}`] },
    { title: "2. Assign motor IDs (leader)", argv: ["lerobot-setup-motors", "--teleop.type=so101_leader", `--teleop.port=${c.leaderPort || "/dev/ttyACM1"}`] },
    { title: "3. Calibrate follower", argv: ["lerobot-calibrate", ...follower] },
    { title: "4. Calibrate leader", argv: ["lerobot-calibrate", ...leader] },
    { title: "5. Teleoperate (check everything moves right)", argv: ["lerobot-teleoperate", ...follower, ...leader, cams, "--display_data=true"] },
    { title: "6. Record demonstrations", argv: ["lerobot-record", ...follower, cams, ...leader, "--display_data=true", `--dataset.repo_id=${repo}`, "--dataset.num_episodes=50", `--dataset.single_task=${c.task}`, "--dataset.episode_time_s=30", "--dataset.reset_time_s=10"] },
    { title: "7. Train a policy", argv: ["lerobot-train", `--dataset.repo_id=${repo}`, ...(FINETUNE_BASE[policyType] ? [`--policy.path=${FINETUNE_BASE[policyType]}`] : [`--policy.type=${policyType}`]), "--output_dir=outputs/train/my_policy", "--job_name=my_policy", "--policy.device=cuda", "--policy.push_to_hub=false", "--wandb.enable=false"] },
    { title: "8. Replay an episode (sanity check calibration)", argv: ["lerobot-replay", ...follower, `--dataset.repo_id=${repo}`, "--dataset.episode=0"] },
  ];
}

export const BRIDGE_ALLOWED = ["lerobot-rollout", "lerobot-record", "lerobot-teleoperate", "lerobot-calibrate", "lerobot-replay", "lerobot-train", "lerobot-setup-motors", "lerobot-find-cameras", "lerobot-find-port"];
