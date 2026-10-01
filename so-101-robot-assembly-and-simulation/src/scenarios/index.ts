import type { Scenario } from '../sim/types';
import { creativeScenarios } from './creative';
import { helpfulScenarios } from './helpful';
import { industryScenarios, labScenarios } from './industry';

export const ALL_SCENARIOS: Scenario[] = [...labScenarios, ...creativeScenarios, ...helpfulScenarios, ...industryScenarios];

export const CATEGORY_ORDER = ['Learn & Teleop', 'Music & Art', 'Games & Play', 'Care & Assistive', 'Lab & Kitchen', 'Industry & Testing', 'Space & Research'];

export const CATEGORY_ICON: Record<string, string> = {
  'Learn & Teleop': '🎓',
  'Music & Art': '🎨',
  'Games & Play': '🎲',
  'Care & Assistive': '🤲',
  'Lab & Kitchen': '🧪',
  'Industry & Testing': '🏭',
  'Space & Research': '🚀',
};

export const CODE_HEADER = `# pip install -e ".[feetech]"   (LeRobot)   – API names follow recent LeRobot; check your version
import time, numpy as np
from lerobot.robots.so101_follower import SO101Follower, SO101FollowerConfig

robot = SO101Follower(SO101FollowerConfig(port="/dev/ttyACM0", id="my_awesome_follower_arm"))
robot.connect()
JOINTS = ["shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper"]

def move(**pos):                      # degrees (gripper 0-100) after calibration
    robot.send_action({f"{k}.pos": v for k, v in pos.items()})
`;

export const DEFAULT_SCENARIO = 'burger';
