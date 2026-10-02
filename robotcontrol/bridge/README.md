# SO-101 bridge

```bash
# 1. inside your LeRobot environment
pip install -r bridge/requirements.txt          # websockets (+ lerobot[feetech] installed separately)
lerobot-find-port                               # note each adapter's /dev/ttyACM* (or COMx)
lerobot-calibrate --robot.type=so101_follower --robot.port=/dev/ttyACM0 --robot.id=follower_a   # once per arm

# 2. run
python bridge/so101_bridge.py --mock                                                       # no hardware
python bridge/so101_bridge.py --follower-a /dev/ttyACM0 --follower-a-id follower_a \
                              --leader-a   /dev/ttyACM1 --leader-a-id   leader_a
# two arms = two adapters:  add --follower-b /dev/ttyACM2 --follower-b-id follower_b [--leader-b … --leader-b-id …]

# 3. deck → Hardware → Python bridge → Connect (ws://localhost:8765)
```

Policies run through `lerobot-rollout` (the bridge releases the serial ports, launches it, streams its log, and reconnects).
`lerobot-record --policy.path` no longer exists upstream.
