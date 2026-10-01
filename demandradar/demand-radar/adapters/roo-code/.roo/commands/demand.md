---
description: Validate whether a product demand is real (evidence, red team, HTML report)
argument-hint: <the product idea or demand hypothesis to validate>
mode: demand-radar
---
Run the Demand Radar validation workflow on the idea the user typed after this command. If they typed nothing, ask for the idea first.

1. Read `.roo/skills/demand-radar/SKILL.md` (or `~/.roo/skills/demand-radar/SKILL.md`) and follow it exactly: step 0 setup (resolve `DR`, create the run
   directory with `scripts/init_run.py`, state the execution mode, which is Mode B in Roo Code), then steps 1 to 6.
2. Step 1 is the only point where you interrupt the user: one `ask_followup_question` with at most 4 questions, plus a drafted hypothesis card for confirmation.
3. Delegate the six collectors, three judges and the red team with `new_task`, one at a time, using the prompts in `prompts/`. Paste the complete context into
   each message because subtasks know nothing.
4. Never invent data. A claim without a URL is not a claim. Log blocked or missing sources in `not_verified`.
5. End with: verdict and score, the one-sentence judgement, the most important reason, the "if you do one thing" item, and the path of the HTML report.
