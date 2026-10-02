import type { RolloutCfg } from "./models";

export const DEFAULT_ROLLOUT: RolloutCfg = {
  port: "/dev/ttyACM0",
  robotId: "my_follower",
  task: "Pick up the red cube and put it in the bin",
  duration: 60,
  policyPath: "",
  cameras: [{ name: "front", index: "0", width: 640, height: 480, fps: 30 }],
  leaderPort: "/dev/ttyACM1",
  leaderId: "my_leader",
  useLeader: false,
  rtc: false,
  device: "cuda",
};
