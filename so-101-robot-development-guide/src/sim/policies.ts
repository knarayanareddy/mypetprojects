/**
 * Behavioural profiles for every controller / model the playground can drive the arm with.
 *
 * IMPORTANT: the skill numbers below are *illustrative heuristics* that encode published
 * qualitative findings (e.g. ACT is precise but narrow, VLAs generalise & follow language
 * but are slower and less precise with few demos). They are NOT measured benchmark scores –
 * replace them with your own evaluation numbers (lerobot-eval / real rollouts) before quoting.
 */
export type SkillKey = 'precision' | 'generalization' | 'language' | 'horizon' | 'contact' | 'reactivity' | 'bimanual';
export const SKILLS: { key: SkillKey; label: string; hint: string }[] = [
  { key: 'precision', label: 'Precision', hint: 'mm-level alignment: grasp, insertion, placing' },
  { key: 'generalization', label: 'Generalisation', hint: 'unseen objects, colours, layouts, lighting' },
  { key: 'language', label: 'Language', hint: 'follows new natural-language instructions' },
  { key: 'horizon', label: 'Long horizon', hint: 'chains many sub-steps without drifting' },
  { key: 'contact', label: 'Contact-rich', hint: 'insertion, pushing, deformables, tools' },
  { key: 'reactivity', label: 'Reactivity', hint: 'low latency, recovers from perturbations' },
  { key: 'bimanual', label: 'Two-arm', hint: 'coordinating both arms' },
];

export interface Policy {
  id: string;
  name: string;
  short: string;
  family: string;
  params: string;
  color: string;
  skills: Record<SkillKey, number>;
  /** demos needed to reach ~63 % of its potential on a new task */
  dataNeed: number;
  /** success fraction with 0 demos (zero-shot) */
  zeroShot: number;
  /** execution traits */
  sigmaCm: number; // positional error (1σ, cm)
  jitterDeg: number;
  latencyMs: number;
  think: number; // seconds of pause before each pick/place
  speed: number; // cm/s multiplier
  retries: number;
  hz: string;
  hardware: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  bestFor: string;
  cmd: string;
  link: string;
}

const sk = (precision: number, generalization: number, language: number, horizon: number, contact: number, reactivity: number, bimanual: number): Record<SkillKey, number> => ({ precision, generalization, language, horizon, contact, reactivity, bimanual });

export const POLICIES: Policy[] = [
  {
    id: 'oracle', name: 'Scripted IK (oracle)', short: 'Oracle', family: 'Classical', params: '—', color: '#94a3b8',
    skills: sk(1, 1, 1, 1, 1, 1, 1), dataNeed: 1, zeroShot: 1, sigmaCm: 0, jitterDeg: 0, latencyMs: 40, think: 0, speed: 1.15, retries: 0,
    hz: '—', hardware: 'any laptop', summary: 'Hand-written waypoints + inverse kinematics. The “perfect” reference the learned policies are measured against.',
    strengths: ['Perfectly repeatable', 'Zero data', 'Great for validating your hardware & calibration'], weaknesses: ['Needs exact object poses (no perception)', 'Brittle: cannot adapt to anything unexpected'],
    bestFor: 'Baselines & calibration checks', cmd: '# no training – write waypoints, call robot.send_action()', link: 'https://huggingface.co/docs/lerobot/so101',
  },
  {
    id: 'human', name: 'Human teleop (leader arm)', short: 'Teleop', family: 'Demonstrator', params: '—', color: '#f472b6',
    skills: sk(0.9, 1, 1, 0.95, 0.9, 1, 0.8), dataNeed: 1, zeroShot: 1, sigmaCm: 0.35, jitterDeg: 0.35, latencyMs: 90, think: 0.35, speed: 0.8, retries: 3,
    hz: '30 Hz', hardware: 'leader + follower', summary: 'You, holding the leader arm. This is how every dataset in this page is created – and the fallback if a policy fails during the demo.',
    strengths: ['Handles anything', 'Produces the training data', 'Best DAgger corrector'], weaknesses: ['Not autonomous!', 'Fatigue → inconsistent demos'],
    bestFor: 'Data collection, live fallbacks', cmd: 'lerobot-teleoperate --robot.type=so101_follower --teleop.type=so101_leader …', link: 'https://huggingface.co/docs/lerobot/so101',
  },
  {
    id: 'act', name: 'ACT', short: 'ACT', family: 'Imitation (CVAE + Transformer)', params: '≈ 52 M', color: '#fb923c',
    skills: sk(0.88, 0.22, 0, 0.45, 0.62, 0.55, 0.82), dataNeed: 35, zeroShot: 0, sigmaCm: 0.55, jitterDeg: 0.25, latencyMs: 60, think: 0.1, speed: 1.0, retries: 1,
    hz: '≈ 35 ms / chunk (laptop)', hardware: 'consumer GPU / Apple silicon to train; CPU-ok to run', summary: 'Action Chunking Transformer: predicts 100 future actions in one pass. The community default for SO-101 – trains in hours from ~50 demos.',
    strengths: ['Most reliable grasper with little data', 'Tiny & fast – runs on a laptop', 'Smooth, temporally-consistent motion'], weaknesses: ['One task per model, no language', 'Fragile to new shapes / layouts (colour change is fine)'],
    bestFor: 'A single polished demo task – your safest hackathon pick', cmd: 'lerobot-train --policy.type=act --dataset.repo_id=$HF_USER/ds --steps=100000', link: 'https://huggingface.co/docs/lerobot/act',
  },
  {
    id: 'diffusion', name: 'Diffusion Policy', short: 'Diffusion', family: 'Imitation (denoising)', params: '≈ 70–260 M', color: '#a78bfa',
    skills: sk(0.8, 0.35, 0, 0.55, 0.72, 0.35, 0.55), dataNeed: 70, zeroShot: 0, sigmaCm: 0.75, jitterDeg: 0.5, latencyMs: 430, think: 0.4, speed: 0.9, retries: 1,
    hz: '≈ 430 ms (DDIM-50, remote GPU)', hardware: 'GPU (A10-class) for inference at speed', summary: 'Models the action distribution by iterative denoising – handles multimodal demos (go left OR right) gracefully but is data-hungry and slower.',
    strengths: ['Handles multimodal behaviour', 'Good contact-rich behaviour with enough data'], weaknesses: ['Data-hungry', 'Slow inference → low reactivity', 'Needs a max-relative-target safety clamp'],
    bestFor: 'Contact-rich tasks when you can record 100+ demos', cmd: 'lerobot-train --policy.type=diffusion --dataset.repo_id=$HF_USER/ds', link: 'https://huggingface.co/docs/lerobot/diffusion',
  },
  {
    id: 'smolvla', name: 'SmolVLA', short: 'SmolVLA', family: 'VLA (HF, flow-matching head)', params: '≈ 450 M', color: '#facc15',
    skills: sk(0.6, 0.66, 0.72, 0.6, 0.5, 0.45, 0.5), dataNeed: 40, zeroShot: 0.04, sigmaCm: 1.05, jitterDeg: 0.55, latencyMs: 900, think: 0.65, speed: 0.85, retries: 2,
    hz: '≈ 1 s / chunk on M1; RTC helps', hardware: '10–16 GB VRAM to fine-tune; runs on a laptop', summary: 'Hugging Face’s lightweight robotics foundation model, pretrained on community SO-100/101 data. Language-conditioned and easy to fine-tune with ~50 episodes.',
    strengths: ['Understands language & new objects', 'Pretrained on SO-100/101-type data', 'Small enough for hackathon hardware'], weaknesses: ['Less precise grasp alignment than ACT with 50 demos', 'Sensitive to colour changes in some studies'],
    bestFor: 'Language-driven demos & semantic generalisation', cmd: 'lerobot-train --policy.path=lerobot/smolvla_base --dataset.repo_id=$HF_USER/ds --steps=20000', link: 'https://huggingface.co/docs/lerobot/smolvla',
  },
  {
    id: 'pi0', name: 'π0', short: 'π0', family: 'VLA (PaliGemma + flow matching)', params: '≈ 3 B', color: '#38bdf8',
    skills: sk(0.75, 0.74, 0.8, 0.7, 0.82, 0.5, 0.75), dataNeed: 30, zeroShot: 0.05, sigmaCm: 0.85, jitterDeg: 0.35, latencyMs: 700, think: 0.8, speed: 0.9, retries: 2,
    hz: '≈ 50 Hz action chunks (flow matching)', hardware: '24 GB+ GPU to fine-tune; cloud recommended', summary: 'Physical Intelligence’s generalist: strong dexterity (folding, insertion) thanks to large-scale cross-embodiment pretraining.',
    strengths: ['Strong dexterous / deformable behaviour', 'Good language following'], weaknesses: ['Heavy (3 B)', 'Fine-tune last layers only on small GPUs → less reliable grasps'],
    bestFor: 'Dexterity showcase if you have a big GPU', cmd: 'lerobot-train --policy.path=lerobot/pi0_base --dataset.repo_id=$HF_USER/ds', link: 'https://huggingface.co/docs/lerobot/pi0',
  },
  {
    id: 'pi05', name: 'π0.5', short: 'π0.5', family: 'VLA (open-world generalist)', params: '≈ 3 B', color: '#22d3ee',
    skills: sk(0.8, 0.88, 0.88, 0.8, 0.82, 0.55, 0.75), dataNeed: 25, zeroShot: 0.12, sigmaCm: 0.75, jitterDeg: 0.3, latencyMs: 700, think: 0.8, speed: 0.9, retries: 2,
    hz: 'chunked, ~1 s planning', hardware: '24 GB+ GPU / cloud', summary: 'Successor of π0 co-trained for open-world generalisation and hierarchical (think-then-act) behaviour.',
    strengths: ['Best generalisation in this list', 'Long-horizon via sub-task prediction'], weaknesses: ['Heaviest to fine-tune and deploy', 'Still needs task data for mm-level SO-101 skills'],
    bestFor: 'Messy, novel scenes & multi-step instructions', cmd: 'lerobot-train --policy.type=pi05 --policy.pretrained_path=lerobot/pi05_base …', link: 'https://huggingface.co/docs/lerobot/pi05',
  },
  {
    id: 'groot', name: 'GR00T N1.7', short: 'GR00T', family: 'VLA (NVIDIA, cross-embodiment)', params: '≈ 3 B', color: '#84cc16',
    skills: sk(0.75, 0.8, 0.8, 0.75, 0.7, 0.55, 0.7), dataNeed: 30, zeroShot: 0.06, sigmaCm: 0.85, jitterDeg: 0.35, latencyMs: 600, think: 0.7, speed: 0.9, retries: 2,
    hz: 'flow-matching action head', hardware: 'NVIDIA GPU / Jetson; great with Isaac Sim sim-to-real', summary: 'NVIDIA’s open humanoid/cross-embodiment foundation model (Cosmos-Reason2-2B VLM + flow-matching head), integrated in LeRobot. Pairs with Isaac Lab for sim-to-real.',
    strengths: ['Sim-to-real pipeline with Isaac', 'Cross-embodiment pretraining'], weaknesses: ['Heavy', 'Best results need NVIDIA stack'],
    bestFor: 'Sim-to-real stories & synthetic data', cmd: "pip install 'lerobot[groot]'  # then --policy.type=groot", link: 'https://huggingface.co/nvidia/GR00T-N1.7-3B',
  },
  {
    id: 'molmoact2', name: 'MolmoAct 2', short: 'MolmoAct2', family: 'VLA (AI2, action-reasoning)', params: '≈ 7 B class', color: '#f43f5e',
    skills: sk(0.7, 0.82, 0.85, 0.65, 0.6, 0.45, 0.4), dataNeed: 25, zeroShot: 0.38, sigmaCm: 0.95, jitterDeg: 0.4, latencyMs: 1100, think: 0.9, speed: 0.85, retries: 2,
    hz: '~12 GB bf16 inference', hardware: '12 GB inference · LoRA fine-tune on one 24 GB GPU', summary: 'Ships a ready-made checkpoint (lerobot/MolmoAct2-SO100_101-LeRobot) that runs ZERO-SHOT on an SO-100/101 – trained on community SO-101 data.',
    strengths: ['Works out of the box on SO-101', 'Best zero-shot of the list'], weaknesses: ['Slow; needs a good GPU', 'Needs two cameras like its pretraining'],
    bestFor: 'Zero-shot “wow” while your own model is still training', cmd: 'lerobot-rollout --policy.path=lerobot/MolmoAct2-SO100_101-LeRobot --robot.type=so100_follower …', link: 'https://huggingface.co/docs/lerobot/molmoact2',
  },
  {
    id: 'mtdit', name: 'Multitask DiT', short: 'MT-DiT', family: 'Diffusion Transformer (TRI LBM recipe)', params: '≈ 450 M', color: '#e879f9',
    skills: sk(0.75, 0.6, 0.7, 0.7, 0.72, 0.4, 0.5), dataNeed: 55, zeroShot: 0.02, sigmaCm: 0.8, jitterDeg: 0.4, latencyMs: 500, think: 0.5, speed: 0.9, retries: 1,
    hz: 'flow/diffusion objective', hardware: 'trainable on a single decent GPU', summary: 'One model, many tasks selected via language (CLIP-conditioned). The small-scale version of TRI’s Large Behaviour Models.',
    strengths: ['Multi-task in one checkpoint', 'Small enough to train yourself'], weaknesses: ['Needs demos for every task'],
    bestFor: 'A multi-skill demo (3–4 tasks, one model)', cmd: 'lerobot-train --policy.type=multi_task_dit --dataset.repo_id=$HF_USER/ds', link: 'https://huggingface.co/docs/lerobot/multi_task_dit',
  },
  {
    id: 'evo1', name: 'EVO-1', short: 'EVO1', family: 'Small VLA (InternVL3-1B)', params: '≈ 0.77 B', color: '#2dd4bf',
    skills: sk(0.68, 0.62, 0.66, 0.6, 0.55, 0.66, 0.45), dataNeed: 35, zeroShot: 0.03, sigmaCm: 0.95, jitterDeg: 0.45, latencyMs: 350, think: 0.35, speed: 1.0, retries: 2,
    hz: 'real-time w/ RTC', hardware: 'modest GPUs', summary: 'A compact VLA built for real-time control on modest hardware with Real-Time Chunking built-in.',
    strengths: ['Fast on small GPUs', 'Two-stage fine-tuning recipe'], weaknesses: ['Less pretrained breadth than 3 B models'],
    bestFor: 'Reactive demos on limited hardware', cmd: 'lerobot-train --policy.type=evo1 --dataset.repo_id=$HF_USER/ds', link: 'https://huggingface.co/docs/lerobot/evo1',
  },
];
export const POLICY_BY_ID: Record<string, Policy> = Object.fromEntries(POLICIES.map((p) => [p.id, p]));

export type Demand = Partial<Record<SkillKey, number>>;

export interface PredictOpts {
  demos: number;
  foresight: number; // 0..1 hypothetical world-model planner strength
}

/** Heuristic task-level success probability of policy `p` on a task with `demand` weights (0..1). */
export function predictSuccess(p: Policy, demand: Demand, o: PredictOpts): number {
  if (p.id === 'oracle') return 0.995;
  if (p.id === 'human') return 0.97;
  const f = o.foresight;
  let prob = 1;
  (Object.keys(demand) as SkillKey[]).forEach((k) => {
    let s = p.skills[k];
    if (f > 0) {
      const boost = k === 'contact' || k === 'horizon' || k === 'reactivity' ? 0.35 : k === 'precision' ? 0.15 : 0;
      s = s + boost * f * (1 - s);
    }
    prob *= 1 - (demand[k] ?? 0) * (1 - s);
  });
  const data = p.zeroShot + (1 - p.zeroShot) * (1 - Math.exp(-o.demos / p.dataNeed));
  return Math.max(0.01, Math.min(0.98, prob * data));
}
