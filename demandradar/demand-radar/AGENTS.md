# AGENTS.md: working on the Demand Radar kit

For any coding agent (Roo Code, Hermes, Codex, Cursor, Aider, Claude Code ...) editing this repository. To *use* the skill for validating an idea, read
`skills/demand-radar/SKILL.md` instead.

## Layout

- `skills/demand-radar/` is the product: `SKILL.md`, `references/`, `prompts/`, `templates/`, `scripts/`, `examples/`. It must stay self-contained (copyable alone) and host-neutral.
- `adapters/` holds host glue only (Hermes, Roo Code, generic). Never put method logic there; link to the skill.
- `install.py` installs the skill (and adapters) into hosts. `.claude-plugin/` is the Claude Code manifest.

## Rules

1. **Standard library only** in `scripts/` (Python 3.8+). The only optional third-party imports are `google_play_scraper` and `praw`, behind try/except.
2. **Canonical English vocabulary** lives in `scripts/dr_common.py`. Add aliases there, never fork the vocabulary in another script. Keep accepting the upstream Chinese terms.
3. **Connectors** print exactly one JSON document and never raise on network errors (return `{"error": ..., "hint": ...}`). No login, no scraping, no evasion. Keep default request volume low.
4. **SKILL.md stays host-neutral:** refer to capabilities (ASK / SHELL / FILES / SEARCH / FETCH / SUBAGENT) and add host names only in the mapping table. Keep it under ~500 lines.
5. **Method changes** (weights, bands, rules) must change in three places together: `references/validation-framework.md`, `scripts/dr_common.py` / `aggregate_scores.py`, and `scripts/tests/test_scripts.py`.
6. **Never present example data as real.** `examples/notion-lite` is synthetic; keep its notices.
7. Keep attribution: `LICENSE`, `NOTICE.md`, `CHANGES.md` and the report footer credit the upstream project (CC BY-NC 4.0). Record new changes in `CHANGES.md`.
8. No marketing words in docs or prompts (see `references/forbidden-patterns.md`, tone red lines).

## Before you finish any change

```bash
python3 skills/demand-radar/scripts/tests/test_scripts.py      # must print 15/15 passed (or more)
python3 install.py --target all --dest "$(mktemp -d)" --dry-run # installer still resolves every path
```

If you touched SKILL.md frontmatter, keep it valid YAML starting at byte 0, `name: demand-radar` (lowercase, hyphens, matches the folder name), a `description` that opens with a short capability sentence.
