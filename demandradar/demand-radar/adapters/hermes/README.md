# Demand Radar for Hermes Agent (Nous Research)

Hermes uses the open Agent Skills format (`SKILL.md` + `references/`, `scripts/`, `templates/`). `skills/demand-radar/` in this kit is already a valid Hermes skill, so no
conversion is needed: only the install location and a couple of settings matter.

## Install

Pick one.

```bash
# 1. Installer (copies the skill; no network)
python3 install.py --target hermes                    # -> ~/.hermes/skills/research/demand-radar
python3 install.py --target hermes --category ""      # -> ~/.hermes/skills/demand-radar (no category folder)

# 2. By hand
mkdir -p ~/.hermes/skills/research
cp -r skills/demand-radar ~/.hermes/skills/research/demand-radar

# 3. Straight from a Git repo that contains this kit (adjust the path to where you published it)
hermes skills install <your-user>/<your-repo>/skills/demand-radar

# 4. Shared across agents: put it in ~/.agents/skills/demand-radar and add that folder to skills.external_dirs
python3 install.py --target agents
```

Start a new Hermes session (or `/reset`) and confirm with `hermes skills list` or `/skills`. If it is missing: check that the file is exactly `SKILL.md`, the frontmatter starts at the
first byte and closes with `---`, and (if you set `platforms`) your OS matches.

## Use

```
/demand-radar a simpler Notion for 5-20 person remote teams
```

or `hermes -s demand-radar`, or just ask: "Is there real demand for X? Validate it before I build it."

## Hermes specifics

| Topic | What to know |
|---|---|
| Tools used | `terminal` (scripts), `read_file` / `write_file` / `patch` (JSON artifacts), `web_search` + `web_extract` (top-down pillar and general community search), `delegate_task` (collectors, judges, red team), `clarify` (the single question round, if your build exposes it) |
| Needs the web toolset | Enable the toolset that provides `web_search` / `web_extract` (`hermes setup --portal` covers it, or configure your own search backend). Without it the run uses connectors only and caps confidence at low |
| Subagents | `delegate_task` children start with **zero context** and cannot ask you questions. The skill's prompts under `prompts/` already include everything; the orchestrator pastes the hypothesis into each |
| Parallelism | `delegate_task(tasks=[...])` runs a batch concurrently. Default concurrency is 3 (some builds 10). A batch above the limit returns an error, so the skill sends groups of at most that size. Set it in `~/.hermes/config.yaml` (see `config.snippet.yaml`) |
| Local models | On one GPU, parallel children slow each other down. Set `delegation.max_concurrent_children: 1` or route children to a smaller model; the skill then behaves as Mode B (sequential) |
| Template variables | Hermes substitutes `${HERMES_SKILL_DIR}` inside SKILL.md. The skill resolves its own folder in step 0 either way, so it works from any category folder |
| Output location | `./.demand-radar/runs/<slug>-<timestamp>/` in Hermes' working directory, or `$DEMAND_RADAR_OUT` |
| Not durable | `delegate_task` is synchronous: if you interrupt the turn, running children are cancelled. All collected data is in files, so say "continue the Demand Radar run in <RUN_DIR>" to resume |

## Recurring re-validation (a Hermes strength)

Markets move. Use Hermes' scheduler to re-run a saved idea monthly and diff the verdicts:

```
Every first Monday at 09:00, re-run the demand-radar skill for the idea in
./.demand-radar/runs/<slug>-<timestamp>/hypothesis.json, compare the new weighted score and verdict
with agg-final.json from the last run, and message me only if the verdict band changed or a sub-claim flipped.
```

## Letting Hermes improve the skill

Hermes can patch skills it uses. If you want to keep the method stable, treat `~/.hermes/skills/research/demand-radar` as read-only by keeping the master copy in Git and reinstalling after changes;
if you want Hermes to adapt it, review its patches. The scripts are covered by `python3 scripts/tests/test_scripts.py` either way.

## Frontmatter notes

The skill's `description` opens with a sentence that fits Hermes' skill index (the index truncates long descriptions) and continues with trigger phrases for other hosts. The `metadata.hermes.tags` block is
Hermes-specific; other hosts ignore it. If you submit this to a Hermes skills hub that enforces a 60-character description, shorten the description to its first sentence.
