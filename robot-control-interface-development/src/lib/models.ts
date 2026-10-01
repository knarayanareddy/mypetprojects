import type { Needs, Scenario, SimProfile } from "./scenarios/types";

export type ModelKind = "baseline" | "imitation" | "vla" | "world-model" | "composite";

export interface ModelDef {
  id: string;
  name: string;
  org: string;
  kind: ModelKind;
  family: string; // value used by the policy server / registry
  params: string;
  summary: string;
  inputs: string[];
  language: boolean;
  hz: string;
  hardware: string;
  data: string;
  strengths: string[];
  weaknesses: string[];
  sensors: string[];
  abilities: Needs; // 0..1 heuristic capability estimates (NOT benchmark numbers)
  dyn: { lag: number; jitter: number; speed: number; stallEvery: number; stallFor: number };
  hfRepo?: string;
  setup: string[];
  links: { label: string; url: string }[];
  experimental?: boolean;
}

export const MODELS: ModelDef[] = [
  {
    id: "scripted",
    name: "Scripted IK skills (oracle)",
    org: "this app",
    kind: "baseline",
    family: "scripted",
    params: "0",
    summary: "Hand-written Cartesian programs solved with inverse kinematics. In simulation it knows exact object poses (an oracle); on hardware it needs known/AprilTag-calibrated positions.",
    inputs: ["Known object poses (sim) or AprilTags"],
    language: false,
    hz: "30 Hz (open loop)",
    hardware: "Any laptop",
    data: "None",
    strengths: ["Perfectly repeatable", "Zero training time", "Best safety baseline for the demo"],
    weaknesses: ["Zero generalisation: moving an object breaks it", "No closed-loop recovery"],
    sensors: ["Top camera + AprilTags (for hardware runs)"],
    abilities: { precision: 1, contact: 1, horizon: 1, speed: 1, generalize: 1 },
    dyn: { lag: 0.05, jitter: 0, speed: 1, stallEvery: 0, stallFor: 0 },
    setup: ["Built in — pick any use case in the Playground or Control Center."],
    links: [],
  },
  {
    id: "act",
    name: "ACT (Action Chunking Transformer)",
    org: "Zhao et al. · LeRobot",
    kind: "imitation",
    family: "act",
    params: "~80M",
    summary: "Single-task imitation policy that predicts chunks of future actions from camera images + joint state. The default LeRobot policy for SO-101 and the most reliable path to a working demo.",
    inputs: ["1–2 cameras", "6-D joint state"],
    language: false,
    hz: "30 Hz, chunked",
    hardware: "Train: 1 GPU (hours) · Run: laptop GPU/Apple silicon",
    data: "≈50 teleop episodes per task",
    strengths: ["Fast and smooth", "Small, easy to train in a hackathon", "Great for pick-place, stacking"],
    weaknesses: ["One model per task", "Poor language/zero-shot generalisation", "Struggles on long horizons"],
    sensors: ["Front/top camera (required)", "Wrist camera (recommended)"],
    abilities: { precision: 0.8, contact: 0.55, horizon: 0.35, speed: 0.85, generalize: 0.2 },
    dyn: { lag: 0.1, jitter: 0.12, speed: 0.9, stallEvery: 0, stallFor: 0 },
    setup: [
      "lerobot-record … --dataset.repo_id=$HF_USER/task --dataset.num_episodes=50",
      "lerobot-train --dataset.repo_id=$HF_USER/task --policy.type=act --policy.device=cuda --policy.repo_id=$HF_USER/act_task",
      "Policy server: python bridge/policy_server.py --policy-path $HF_USER/act_task --policy-type act",
    ],
    links: [{ label: "LeRobot imitation-learning guide", url: "https://huggingface.co/docs/lerobot/en/il_robots" }],
  },
  {
    id: "diffusion",
    name: "Diffusion Policy",
    org: "Chi et al. · LeRobot",
    kind: "imitation",
    family: "diffusion",
    params: "~100–300M (config dependent)",
    summary: "Generates actions by iterative denoising. Handles multi-modal behaviour (several valid ways to do a task) and contact-rich motion better than ACT, at the cost of slower inference.",
    inputs: ["Cameras", "Joint state"],
    language: false,
    hz: "10–30 Hz effective (denoising steps)",
    hardware: "Train: 1 GPU · Run: GPU recommended",
    data: "≈50–100 episodes per task",
    strengths: ["Smooth multi-modal actions", "Strong on contact-rich tasks"],
    weaknesses: ["Slower inference", "Single-task", "More data/compute hungry"],
    sensors: ["Front + wrist camera"],
    abilities: { precision: 0.85, contact: 0.8, horizon: 0.45, speed: 0.5, generalize: 0.3 },
    dyn: { lag: 0.16, jitter: 0.08, speed: 0.75, stallEvery: 0, stallFor: 0 },
    setup: ["lerobot-train --dataset.repo_id=$HF_USER/task --policy.type=diffusion --policy.device=cuda", "Serve with bridge/policy_server.py --policy-type diffusion"],
    links: [{ label: "LeRobot docs", url: "https://huggingface.co/docs/lerobot" }],
  },
  {
    id: "smolvla",
    name: "SmolVLA",
    org: "Hugging Face · LeRobot",
    kind: "vla",
    family: "smolvla",
    params: "450M",
    summary: "Lightweight vision-language-action model pretrained on community LeRobot data (incl. SO-100/101). Takes multiple camera views, joint state and a text instruction. Fine-tune on ~50 episodes.",
    inputs: ["Multi-camera", "Joint state", "Language instruction"],
    language: true,
    hz: "chunked; async-friendly",
    hardware: "Fine-tune: ~4 h on one A100 for 20k steps · Run: consumer GPU / laptop",
    data: "≈50 episodes to adapt (with variation: 5 positions × 10)",
    strengths: ["Language-conditioned, multi-task", "Runs on consumer hardware", "Pretrained on SO-100/101-style data"],
    weaknesses: ["Needs fine-tuning for your setup", "Slower reaction than ACT (use async/RTC)"],
    sensors: ["Front camera (required)", "Wrist camera (recommended)"],
    abilities: { precision: 0.65, contact: 0.5, horizon: 0.6, speed: 0.6, generalize: 0.6 },
    dyn: { lag: 0.18, jitter: 0.22, speed: 0.7, stallEvery: 2.5, stallFor: 0.35 },
    hfRepo: "lerobot/smolvla_base",
    setup: [
      "pip install -e \".[smolvla]\"",
      "lerobot-train --policy.path=lerobot/smolvla_base --dataset.repo_id=$HF_USER/task --batch_size=64 --steps=20000 --policy.device=cuda",
      "python bridge/policy_server.py --policy-path $HF_USER/my_smolvla --policy-type smolvla",
    ],
    links: [{ label: "SmolVLA docs", url: "https://huggingface.co/docs/lerobot/en/smolvla" }],
  },
  {
    id: "pi0",
    name: "π0 (pi-zero)",
    org: "Physical Intelligence · LeRobot port",
    kind: "vla",
    family: "pi0",
    params: "~3B",
    summary: "Large flow-matching VLA with strong dexterity and generalisation. Supported in LeRobot; needs a serious GPU and RTC/async inference to feel responsive on a 30 Hz arm.",
    inputs: ["Multi-camera", "Joint state", "Language"],
    language: true,
    hz: "chunked; use --inference.type=rtc",
    hardware: "Fine-tune: A100/H100 class · Run: 24 GB+ GPU recommended",
    data: "≈50+ episodes to fine-tune",
    strengths: ["Dexterous, general", "Good long-horizon with language"],
    weaknesses: ["Heavy", "Latency without RTC", "Overkill for a 5-DOF arm"],
    sensors: ["Front + wrist cameras"],
    abilities: { precision: 0.78, contact: 0.78, horizon: 0.7, speed: 0.55, generalize: 0.75 },
    dyn: { lag: 0.2, jitter: 0.18, speed: 0.65, stallEvery: 3, stallFor: 0.45 },
    setup: ["pip install -e \".[pi]\"", "lerobot-train --policy.type=pi0 --dataset.repo_id=$HF_USER/task …", "Verify the exact base checkpoint id on the Hub before use."],
    links: [{ label: "LeRobot docs", url: "https://huggingface.co/docs/lerobot" }],
  },
  {
    id: "pi05",
    name: "π0.5",
    org: "Physical Intelligence · LeRobot port",
    kind: "vla",
    family: "pi05",
    params: "~3B",
    summary: "Successor to π0 with better open-world generalisation. Same hardware appetite; best if your hackathon task involves unseen objects/scenes and you have a big GPU.",
    inputs: ["Multi-camera", "Joint state", "Language"],
    language: true,
    hz: "chunked; RTC recommended",
    hardware: "24 GB+ GPU recommended",
    data: "≈50+ episodes to fine-tune",
    strengths: ["Strongest open-world generalisation in this list (among LeRobot-supported)", "Language-driven"],
    weaknesses: ["Heavy", "Latency", "Risky to bring up in a 24–48 h hackathon"],
    sensors: ["Front + wrist cameras"],
    abilities: { precision: 0.82, contact: 0.82, horizon: 0.8, speed: 0.55, generalize: 0.9 },
    dyn: { lag: 0.2, jitter: 0.15, speed: 0.65, stallEvery: 3, stallFor: 0.4 },
    setup: ["pip install -e \".[pi]\"", "lerobot-train --policy.type=pi05 --dataset.repo_id=$HF_USER/task …"],
    links: [{ label: "LeRobot docs", url: "https://huggingface.co/docs/lerobot" }],
  },
  {
    id: "groot",
    name: "NVIDIA GR00T N1.5",
    org: "NVIDIA",
    kind: "vla",
    family: "groot",
    params: "~3B",
    summary: "Open humanoid/general-robot foundation model with SO-100/101 fine-tuning workflows published by NVIDIA and the community. Strong language grounding; needs a big GPU.",
    inputs: ["Cameras", "Joint state", "Language"],
    language: true,
    hz: "chunked",
    hardware: "Fine-tune: 1× high-end GPU · Run: RTX-class GPU",
    data: "A few dozen episodes to fine-tune",
    strengths: ["Language-conditioned", "Good generalisation after fine-tune"],
    weaknesses: ["Heavy", "Separate toolchain (Isaac-GR00T)"],
    sensors: ["Front camera, optional wrist"],
    abilities: { precision: 0.72, contact: 0.68, horizon: 0.7, speed: 0.65, generalize: 0.75 },
    dyn: { lag: 0.17, jitter: 0.2, speed: 0.7, stallEvery: 3, stallFor: 0.35 },
    hfRepo: "nvidia/GR00T-N1.5-3B",
    setup: ["Follow NVIDIA Isaac-GR00T SO-101 fine-tuning notes", "Wrap inference behind the same /predict contract (see bridge/README.md)"],
    links: [{ label: "Isaac-GR00T", url: "https://github.com/NVIDIA/Isaac-GR00T" }],
  },
  {
    id: "molmoact2",
    name: "MolmoAct 2",
    org: "Allen Institute for AI",
    kind: "vla",
    family: "molmoact2",
    params: "see model card",
    summary: "Open action-reasoning VLA with a released SO-100/101 workflow and a filtered SO-100/101 dataset. AI2 recommends a standard-wrist SO-100 plus a third-person camera for best results.",
    inputs: ["Third-person camera", "Joint state", "Language"],
    language: true,
    hz: "chunked",
    hardware: "GPU (see repo)",
    data: "Fine-tune with the LeRobot workflow in the repo",
    strengths: ["Built with SO-100/101 data in mind", "Spatial reasoning + language", "Open weights/code/data"],
    weaknesses: ["New — expect integration friction", "Needs GPU"],
    sensors: ["Third-person camera (important)"],
    abilities: { precision: 0.72, contact: 0.68, horizon: 0.75, speed: 0.6, generalize: 0.8 },
    dyn: { lag: 0.18, jitter: 0.2, speed: 0.7, stallEvery: 2.8, stallFor: 0.35 },
    setup: ["git clone https://github.com/allenai/molmoact2", "Follow its 'Real-world Deployment → SO-100/101' instructions", "Expose it via /predict (bridge/README.md)"],
    links: [{ label: "allenai/molmoact2", url: "https://github.com/allenai/molmoact2" }],
  },
  {
    id: "visionary",
    name: "Visionary world model (Dreamer-4 style)",
    org: "james0248/visionary",
    kind: "world-model",
    family: "world-model",
    params: "300M (SO-101 model)",
    summary: "An action-conditioned video world model trained on community SO-101 data (co-trained with SOAR + BridgeData V2). It predicts what the camera will see if you execute actions — it does NOT output actions itself, so it is a verifier / planner, not a drop-in policy.",
    inputs: ["Camera frames", "Candidate actions"],
    language: false,
    hz: "offline / lookahead",
    hardware: "GPU",
    data: "Pretrained (check the repo for released weights)",
    strengths: ["Evaluate policies in imagination before using hardware time", "Rank action chunks (MPC-style)", "Excellent judging story: 'dream before you act'"],
    weaknesses: ["Not a controller", "Fidelity to YOUR scene/camera is unproven", "Adds latency", "Weights availability must be verified"],
    sensors: ["Same camera as your policy"],
    abilities: { precision: 0.3, contact: 0.3, horizon: 0.5, speed: 0.1, generalize: 0.5 },
    dyn: { lag: 0.3, jitter: 0.3, speed: 0.4, stallEvery: 2, stallFor: 0.6 },
    setup: ["git clone https://github.com/james0248/visionary", "Use as an optional /imagine endpoint (stub in bridge/policy_server.py)"],
    links: [{ label: "james0248/visionary", url: "https://github.com/james0248/visionary" }],
    experimental: true,
  },
  {
    id: "smolvla_visionary",
    name: "SmolVLA + Visionary look-ahead (experimental)",
    org: "composite",
    kind: "composite",
    family: "smolvla",
    params: "450M + 300M",
    summary: "Sample N action chunks from SmolVLA, 'dream' each with the world model, pick the best. Hypothetical: the simulation below assumes it helps precision/long-horizon at the price of speed. Not benchmarked.",
    inputs: ["Cameras", "State", "Language"],
    language: true,
    hz: "slow (lookahead)",
    hardware: "Two models on GPU",
    data: "SmolVLA fine-tune + released world-model weights",
    strengths: ["Safer, fewer failed grasps (hypothesis)"],
    weaknesses: ["Slow", "Unproven", "High integration risk for a hackathon"],
    sensors: ["Front + wrist cameras"],
    abilities: { precision: 0.72, contact: 0.6, horizon: 0.7, speed: 0.35, generalize: 0.65 },
    dyn: { lag: 0.22, jitter: 0.16, speed: 0.5, stallEvery: 4, stallFor: 0.5 },
    setup: ["Requires both services; treat as a stretch goal."],
    links: [],
    experimental: true,
  },
];

export const MODEL_BY_ID: Record<string, ModelDef> = Object.fromEntries(MODELS.map((m) => [m.id, m]));
export const ACTING_MODELS = MODELS.filter((m) => m.kind !== "world-model");

export const DIMS: (keyof Needs)[] = ["precision", "contact", "horizon", "speed", "generalize"];
export const DIM_LABEL: Record<keyof Needs, string> = {
  precision: "fine precision",
  contact: "contact-rich control",
  horizon: "long-horizon sequencing",
  speed: "reaction speed",
  generalize: "unstructured generalisation",
};
const W: Record<keyof Needs, number> = { precision: 0.5, contact: 0.45, horizon: 0.4, speed: 0.2, generalize: 0.5 };

/** Heuristic first-try success estimate (0..1). A transparent capability-gap model — not a benchmark. */
export function score(m: ModelDef, n: Needs): number {
  let pen = 0;
  for (const d of DIMS) pen += Math.max(0, n[d] - m.abilities[d]) * W[d];
  return Math.min(0.98, Math.max(0.08, 0.98 - pen * 1.6));
}

export function limits(m: ModelDef, n: Needs): string[] {
  return DIMS.map((d) => ({ d, gap: (n[d] - m.abilities[d]) * W[d] }))
    .filter((x) => x.gap > 0.02)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 2)
    .map((x) => DIM_LABEL[x.d]);
}

export function profileFor(m: ModelDef, s: Scenario): SimProfile {
  return { lag: m.dyn.lag, jitter: m.dyn.jitter, speed: m.dyn.speed, stallEvery: m.dyn.stallEvery, stallFor: m.dyn.stallFor, pGrab: m.id === "scripted" ? 1 : score(m, s.needs) };
}
