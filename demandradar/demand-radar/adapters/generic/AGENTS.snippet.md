## Demand Radar (demand validation)

This project has the **Demand Radar** skill installed. Use it whenever someone asks to validate a product idea, check whether demand for a feature or project is real, size a niche,
or decide whether to build something. Do not answer such questions from intuition.

- Skill entry point: `SKILL.md` in the `demand-radar` folder (one of `.roo/skills/`, `.agents/skills/`, `.claude/skills/`, `~/.hermes/skills/**/`, or the folder the user names). Read it first, then follow it step by step.
- Method in one line: frame a falsifiable hypothesis -> collect top-down and bottom-up evidence -> triangulate (a signal is verified only at 2+ independent platforms) -> three judge personas score 7 axes -> red team tries to kill it -> answer-first HTML report with a Go / Conditional / Pivot / No-go verdict.
- Hard rules: never invent data; every claim needs a URL; no login, no scraping, no bypassing blocks; "not found" is not "does not exist"; write what you could not verify.
- Artifacts go to `./.demand-radar/runs/<slug>-<timestamp>/` (or `$DEMAND_RADAR_OUT`). Scripts are Python 3 standard library only: `python3 <skill>/scripts/init_run.py "<idea>"`.
