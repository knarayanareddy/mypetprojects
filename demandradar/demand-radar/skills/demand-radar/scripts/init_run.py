#!/usr/bin/env python3
"""Create a run directory for one validation and print its absolute path.

Every artifact of a run (hypothesis, evidence, scores, report) lives in this one folder so the
run is auditable and the report can be re-rendered without re-collecting anything.

Output root, first match wins:
  1. --root <dir>
  2. $DEMAND_RADAR_OUT
  3. ./.demand-radar/runs        (relative to the current workspace; works inside sandboxed hosts)

Usage:
  RUN_DIR=$(python3 init_run.py "simpler Notion for small remote teams")
  python3 init_run.py "<idea>" --root ~/demand-radar-runs

Writes RUN_DIR/hypothesis.json from templates/hypothesis.template.json (the agent then fills it in).
"""
import argparse
import datetime
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dr_common as C  # noqa: E402

TEMPLATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "templates", "hypothesis.template.json")


def main():
    ap = argparse.ArgumentParser(description="Create a Demand Radar run directory.")
    ap.add_argument("idea", help="the product idea / demand hypothesis in the user's words")
    ap.add_argument("--root", default="")
    a = ap.parse_args()

    root = a.root or os.environ.get("DEMAND_RADAR_OUT") or os.path.join(os.getcwd(), ".demand-radar", "runs")
    root = os.path.abspath(os.path.expanduser(root))
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
    run_dir = os.path.join(root, f"{C.slugify(a.idea)}-{stamp}")
    os.makedirs(run_dir, exist_ok=True)

    target = os.path.join(run_dir, "hypothesis.json")
    if not os.path.exists(target):
        if os.path.exists(TEMPLATE):
            shutil.copy(TEMPLATE, target)
            data = C.load_json(target)
            data["idea"] = a.idea
            C.write_json(target, data)
        else:
            C.write_json(target, {"idea": a.idea})
    print(run_dir)


if __name__ == "__main__":
    main()
