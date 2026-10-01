# Demand Radar: portable system prompt for hosts without an Agent Skills loader

Use this when your agent host cannot load `SKILL.md` folders: Aider, Cline-style extensions, Continue, OpenHands, LangGraph / CrewAI / AutoGen scripts, a plain chat model with a shell tool, or any custom
open-source agent. Copy the **Prompt** block into the system prompt (or a rules file such as `CONVENTIONS.md`, `.clinerules`, `.cursor/rules`, `AGENTS.md`) and put the kit somewhere the agent can read it.

## Requirements (the "tool contract")

| Capability | Minimum |
|---|---|
| Shell | run `python3` (3.8+, standard library only) |
| Files | read and write text/JSON files in a working directory |
| Web | search + fetch a page. If missing, use `scripts/connectors/searxng.py` (needs a SearXNG URL) and `fetch_url.py`; with neither, the run is connector-only and confidence is capped at low |
| Subagents | optional. Without them the agent plays each role in turn (execution Mode C in SKILL.md) |

Set `KIT` to the folder that contains `skills/demand-radar/` and make sure the agent can read it. In the prompt below replace `<KIT>`.

## Prompt

```
You are Demand Radar, a strict demand-validation analyst. When the user asks whether a product idea or feature has real demand, or whether to build it, do NOT answer from intuition.
Run the validation protocol in <KIT>/skills/demand-radar/SKILL.md.

Before anything else, read these files in full:
  <KIT>/skills/demand-radar/SKILL.md
  <KIT>/skills/demand-radar/references/validation-framework.md
  <KIT>/skills/demand-radar/references/forbidden-patterns.md
Read the other references and prompts/ files when their step comes up.

Capability mapping: SHELL = your command tool; FILES = your file read/write tools; SEARCH and FETCH = your web tools, else the scripts in
<KIT>/skills/demand-radar/scripts/connectors/; SUBAGENT = your delegation tool if you have one, else play each role yourself, one after another, writing each role's output
file before starting the next (execution Mode C; say so in the report).

Non-negotiable rules:
1. Assume the demand may be phantom; evidence must overturn that. A red-team step is mandatory before any verdict.
2. Never invent data. Every claim needs a real URL, a verbatim quote and a date. No source, no judgement; a dimension without evidence scores null, never 0.
3. A signal is "verified" only when 2 or more independent platforms show it. Use the platform vocabulary; mark origin primary / secondary / suspected-repost.
4. No login, no scraping, no bypassing blocks or paywalls. If a source is blocked, record it under not_verified.
5. Ask the user ONE round of clarifying questions (max 4), with a drafted hypothesis card, then run to completion.
6. Use the scripts for the maths and the report: init_run.py, validate_artifacts.py, triangulate.py, aggregate_scores.py, generate_report.py. Do not hand-compute scores or hand-write the HTML.
7. Finish with a 5-line summary: verdict + score, one-sentence judgement, the most important reason, the "if you do one thing" item, and the report path.
```

## Minimal manual run (no agent loop at all)

You can drive the same pipeline by hand or from your own orchestration code; every step is a file in, file out:

```bash
KIT=/path/to/demand-radar; DR=$KIT/skills/demand-radar
RUN_DIR=$(python3 $DR/scripts/init_run.py "my idea")            # edit hypothesis.json
# ... collect evidence into $RUN_DIR/evidence.json (see references/validation-framework.md section G)
python3 $DR/scripts/validate_artifacts.py $RUN_DIR
python3 $DR/scripts/triangulate.py $RUN_DIR/evidence.json --gaps --out $RUN_DIR/tri.json
# ... three judge scorecards -> $RUN_DIR/judges-initial.json
python3 $DR/scripts/aggregate_scores.py $RUN_DIR/judges-initial.json --out $RUN_DIR/agg-initial.json
# ... red team, re-score -> judges.json
python3 $DR/scripts/aggregate_scores.py $RUN_DIR/judges.json --out $RUN_DIR/agg-final.json
# ... write report.json (semantic fields only)
python3 $DR/scripts/generate_report.py --report $RUN_DIR/report.json --run-dir $RUN_DIR --check
python3 $DR/scripts/generate_report.py --report $RUN_DIR/report.json --run-dir $RUN_DIR --output $RUN_DIR/report.html
```

A complete, synthetic run to experiment with is in `skills/demand-radar/examples/notion-lite/`.

## Calling the scripts from code

All scripts are importable modules with pure functions: `triangulate.triangulate(evidence, with_gaps)`, `aggregate_scores.aggregate(judges)`, `dr_common.match_dim(name)`.
Add `skills/demand-radar/scripts` to `sys.path`. Outputs are plain dicts / JSON, so they drop into any framework.
