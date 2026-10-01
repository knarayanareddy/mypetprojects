// Model catalog + emulation profiles + custom registry.
export const CATEGORIES = ["Pick & place", "Music & play", "Games", "Lab & industry", "Home & care", "Creative", "Bimanual"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Profile {
  latencyMs: number; // "thinking" pause before every motion segment
  speed: number; // motion speed multiplier
  jitter: number; // joint noise (normalised units)
  miss: number; // probability that a grasp misses
}

export interface ModelInfo {
  id: string;
  name: string;
  org: string;
  kind: "Scripted" | "Imitation" | "VLA" | "VLM agent" | "World model";
  params: string;
  hf?: string;
  link?: string;
  gpu: string;
  cams: string;
  language: boolean;
  summary: string;
  strengths: string[];
  risks: string[];
  profile: Profile;
  scores: Record<Category, number>;
  trainCmd?: string;
  runnable: boolean;
}

const S = (a: number, b: number, c: number, d: number, e: number, f: number, g: number): Record<Category, number> => ({
  "Pick & place": a, "Music & play": b, Games: c, "Lab & industry": d, "Home & care": e, Creative: f, Bimanual: g,
});

export const MODELS: ModelInfo[] = [
  {
    id: "scripted", name: "Scripted IK skills", org: "this app", kind: "Scripted", params: "—", gpu: "none", cams: "none (uses table coordinates)",
    language: true,
    summary: "Hand-authored inverse-kinematics programs. Deterministic, instant, zero training. Needs known object positions (type them in or use the top camera + calibration).",
    strengths: ["Works today with no data", "Perfect repeatability for demos", "Both arms choreographed"],
    risks: ["Blind to the scene – objects must be where the script expects", "No recovery from surprises"],
    profile: { latencyMs: 0, speed: 1, jitter: 0, miss: 0.02 },
    scores: S(88, 90, 70, 80, 72, 85, 85), runnable: true,
  },
  {
    id: "act", name: "ACT (Action Chunking Transformer)", org: "LeRobot", kind: "Imitation", params: "~52M", hf: "lerobot/act_so101_*", gpu: "8 GB (train), CPU ok for inference",
    cams: "1–2 RGB (top + wrist)", language: false,
    summary: "The default LeRobot baseline. Train one policy per task from ~50 teleoperated episodes; predicts chunks of 100 actions. Fast and smooth on cheap arms.",
    strengths: ["Best sample-efficiency for single tasks", "Runs at 30 Hz even on CPU", "Most documented SO-101 path"],
    risks: ["One model per task", "Fragile if camera/lighting changes", "No language"],
    profile: { latencyMs: 40, speed: 0.95, jitter: 0.5, miss: 0.1 },
    scores: S(86, 35, 40, 70, 60, 30, 45), runnable: true,
    trainCmd: "lerobot-train --policy.type=act --dataset.repo_id=${HF_USER}/so101_task --policy.device=cuda --output_dir=outputs/act_task",
  },
  {
    id: "diffusion", name: "Diffusion Policy", org: "LeRobot / Columbia", kind: "Imitation", params: "~260M", hf: "lerobot/diffusion_*", gpu: "12 GB",
    cams: "1–2 RGB", language: false,
    summary: "Multimodal action distribution via denoising. Handles tasks with several valid strategies (e.g. push vs. grasp) and gives very smooth trajectories.",
    strengths: ["Smooth, multimodal behaviour", "Good for contact-rich pushing"], risks: ["Slower inference (10 denoise steps)", "Needs more data than ACT"],
    profile: { latencyMs: 130, speed: 0.8, jitter: 0.25, miss: 0.1 },
    scores: S(80, 30, 40, 65, 55, 55, 40), runnable: true,
    trainCmd: "lerobot-train --policy.type=diffusion --dataset.repo_id=${HF_USER}/so101_task --output_dir=outputs/dp_task",
  },
  {
    id: "smolvla", name: "SmolVLA", org: "Hugging Face", kind: "VLA", params: "450M", hf: "lerobot/smolvla_base", gpu: "8–12 GB (fine-tune), laptop GPU for inference",
    cams: "2–3 RGB + language", language: true,
    summary: "Small vision-language-action model pretrained on community SO-100/101 data. Fine-tune with ~50 episodes, then drive with plain-language instructions. Supports asynchronous inference.",
    strengths: ["Native LeRobot + SO-101", "Language-conditioned", "Light enough for a hackathon laptop"], risks: ["Needs fine-tuning for each setup", "Weak zero-shot on new objects"],
    profile: { latencyMs: 110, speed: 0.85, jitter: 0.45, miss: 0.16 },
    scores: S(78, 30, 50, 60, 62, 45, 50), runnable: true,
    trainCmd: "lerobot-train --policy.path=lerobot/smolvla_base --dataset.repo_id=${HF_USER}/so101_task --batch_size=64 --steps=20000 --output_dir=outputs/smolvla_task",
  },
  {
    id: "pi0", name: "π0", org: "Physical Intelligence", kind: "VLA", params: "3.3B", hf: "lerobot/pi0_base", gpu: "24 GB+ (cloud GPU)", cams: "2–3 RGB + language", language: true,
    summary: "Flow-matching VLA with strong generalisation. Heavy for a laptop – run on a rented GPU and stream action chunks over the HTTP/WebSocket bridge.",
    strengths: ["Strong generalisation", "Long-horizon prompts"], risks: ["Needs a cloud GPU", "Higher latency over network"],
    profile: { latencyMs: 220, speed: 0.75, jitter: 0.35, miss: 0.1 },
    scores: S(84, 35, 55, 70, 72, 55, 62), runnable: true,
    trainCmd: "lerobot-train --policy.path=lerobot/pi0_base --dataset.repo_id=${HF_USER}/so101_task --batch_size=32 --steps=30000",
  },
  {
    id: "pi05", name: "π0.5", org: "Physical Intelligence", kind: "VLA", params: "~3B", hf: "lerobot/pi05_base", gpu: "24 GB+ (cloud GPU)", cams: "2–3 RGB + language", language: true,
    summary: "Successor to π0 with better open-world generalisation (co-training with high-level semantic prediction). Best candidate if you have a cloud GPU and 1–2 h of data.",
    strengths: ["Best open-world generalisation of the LeRobot-supported models"], risks: ["GPU + network latency", "Fine-tuning cost"],
    profile: { latencyMs: 190, speed: 0.8, jitter: 0.3, miss: 0.08 },
    scores: S(88, 38, 58, 72, 76, 58, 66), runnable: true,
    trainCmd: "lerobot-train --policy.path=lerobot/pi05_base --dataset.repo_id=${HF_USER}/so101_task --batch_size=32 --steps=30000",
  },
  {
    id: "groot", name: "GR00T N1.5", org: "NVIDIA", kind: "VLA", params: "3B", hf: "nvidia/GR00T-N1.5-3B", gpu: "24 GB+", cams: "1–2 RGB + language", language: true,
    summary: "Open humanoid/general foundation model with an SO-101 fine-tuning recipe in Isaac-GR00T. Serve it with the GR00T inference server and point this app at the endpoint.",
    strengths: ["Official SO-101 fine-tune recipe", "Good with sim-to-real data (Isaac)"], risks: ["Heavy setup", "Needs its own env (not pure LeRobot)"],
    profile: { latencyMs: 200, speed: 0.8, jitter: 0.4, miss: 0.13 },
    scores: S(78, 30, 48, 62, 62, 45, 55), runnable: true,
  },
  {
    id: "molmoact2", name: "MolmoAct 2", org: "Ai2", kind: "VLA", params: "7B-class", link: "https://github.com/allenai/molmoact2", gpu: "24–48 GB (cloud / Modal)",
    cams: "third-person cam (+ wrist) + language", language: true,
    summary: "Open action-reasoning VLA (points/depth reasoning + flow-matching action expert) with an official LeRobot workflow and SO-100/101 deployment guide; recommends a third-person camera. Claims to beat π0.5 on seven benchmarks.",
    strengths: ["Fully open weights + 720 h bimanual data", "Spatial reasoning helps unseen objects", "LeRobot workflow released"], risks: ["Large – run remotely", "Released recently: expect rough edges"],
    profile: { latencyMs: 260, speed: 0.75, jitter: 0.3, miss: 0.09 },
    scores: S(90, 35, 60, 72, 78, 62, 74), runnable: true,
  },
  {
    id: "vlm-agent", name: "SO-101 VLM skill agent", org: "daniiarabdiev", kind: "VLM agent", params: "LoRA on Qwen-class 27B", hf: "squiredaniiar/so101-vlm-agent",
    link: "https://github.com/daniiarabdiev/so101-vlm-agent", gpu: "80 GB (vLLM) – remote", cams: "3 cams (top, side, gripper) 448² + text", language: true,
    summary: "Not a joint-level policy: a VLM picks the next *discrete skill* (move-to, grasp, lift, place, rotate, release…) and points at objects in the top image; classic IK code does the motion. Trained only in MuJoCo sim, reported 6/9 single-ball and 1/4 two-ball real runs.",
    strengths: ["No teleop data needed", "Explains itself, easy to debug", "Skill layer maps 1:1 to this app's primitives"], risks: ["Slow (≈60–160 s per task)", "Needs calibrated top camera", "Take-out tasks failed on real arm"],
    profile: { latencyMs: 1400, speed: 0.7, jitter: 0.1, miss: 0.3 },
    scores: S(66, 10, 50, 40, 45, 25, 30), runnable: true,
  },
  {
    id: "visionary", name: "visionary (Dreamer-4 SO-101 world model)", org: "james0248", kind: "World model", params: "300M", link: "https://github.com/james0248/visionary", gpu: "1 GPU",
    cams: "video frames", language: false,
    summary: "A learned world model of SO-101 scenes (trained on community SO-101 data, co-trained on SOAR + BridgeData). It is NOT a controller: it predicts what happens next. Use it to evaluate/rank candidate policies or generate synthetic rollouts, not to drive the arms live.",
    strengths: ["Could cheaply pre-screen policies before touching hardware", "Research-grade, interesting for the pitch"], risks: ["No action output – will not move the robot", "Not turnkey; code is research-stage"],
    profile: { latencyMs: 0, speed: 1, jitter: 0, miss: 0 },
    scores: S(0, 0, 0, 0, 0, 0, 0), runnable: false,
  },
];

export const getModel = (id: string) => MODELS.find((m) => m.id === id) ?? MODELS[0];

export interface CustomModel {
  id: string;
  name: string;
  transport: "http" | "bridge-hf";
  url: string; // http: http://host:port ; bridge-hf: HF repo id or local checkpoint path
  task: string;
  fps: number;
  note?: string;
}
const KEY = "so101.models";
export const loadCustom = (): CustomModel[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
export const saveCustom = (m: CustomModel[]) => localStorage.setItem(KEY, JSON.stringify(m));
