# Changes from upstream (lemomo-ai/demand-radar)

Upstream version adapted: the Claude Code plugin layout (`skills/demand`, `.claude-plugin/`). This file satisfies the "indicate if changes were made" term of CC BY-NC 4.0.

## Portability (the point of this edition)

- **Agent-neutral skill.** `skills/demand/` became `skills/demand-radar/` in the Agent Skills format (frontmatter `name`, `description`, `license`, `compatibility`, `metadata`), loadable by Hermes Agent,
  Roo Code, Claude Code, Codex CLI and other hosts.
- **Capability mapping instead of Claude-only tools.** The workflow no longer names `Agent`, `AskUserQuestion`, `WebSearch(allowed_domains)`, `${CLAUDE_SKILL_DIR}` or `$COWORK_OUTPUTS_DIR`. It is written against abstract
  capabilities (ASK, SHELL, FILES, SEARCH, FETCH, SUBAGENT) with a per-host table (Hermes, Roo Code, Claude Code, generic).
- **Three execution modes.** A: parallel subagents (Hermes `delegate_task` batch, Claude Agent). B: sequential isolated subtasks (Roo `new_task`). C: single agent playing each role in turn. Mode is stated in the report.
- **Subagent prompts as files** (`prompts/collector.md`, `judge.md`, `red-team.md`) because subagents on Hermes and Roo start with an empty context and cannot ask questions.
- **Skill location resolution** works from any host path (`.roo/skills`, `.agents/skills`, `~/.hermes/skills/**`, `.claude/skills`) instead of one host variable.
- **Run directory** defaults to `./.demand-radar/runs/` in the workspace (sandbox friendly), overridable with `$DEMAND_RADAR_OUT`, created by the new `init_run.py`.
- **Adapters and installer:** `adapters/hermes` (README, config snippet), `adapters/roo-code` (`.roomodes` custom mode, `/demand` slash command, mode rules, README), `adapters/generic` (system prompt for any agent,
  AGENTS.md snippet), and `install.py` for all targets. The Claude plugin manifests are kept.
- **Web search fallbacks** for hosts with no search tool: `connectors/searxng.py` (self-hosted SearXNG) and `connectors/fetch_url.py`. Without any web tool the skill caps confidence at "low" and says so.

## Language and vocabulary

- All instructions, references, prompts and script messages rewritten in English (the original was Chinese-first with an English README).
- Canonical English identifiers in every JSON file: dimensions (`pain_intensity` ... `reachability`), verdicts (`Go / Conditional / Pivot / No-go`), confidence (`high / medium / lead`), source types, origins, claim states.
  Previously the scripts required Chinese dimension and verdict names. **The upstream Chinese vocabulary is still accepted everywhere** (older runs and other models keep working), and the report generator still renders Chinese reports (`"lang": "zh"`).
- `dr_common.py` centralises vocabulary, aliases, platform normalisation and verdict bands.

## Scripts

- `triangulate.py`, `aggregate_scores.py`: rewritten on `dr_common`, same rules (>=2 independent sources, repost downgrade, `--gaps`, median + disagreement, insufficient-data exclusion). New: the verdict is capped at Conditional when
  `willingness_to_pay` or `market_size` has no data (upstream documented the rule; it is now enforced in code with `verdict_capped` and `confidence_cap`), `{"judges": [...]}` wrapper accepted, unknown dimensions reported.
- `generate_report.py`: patched, not rewritten. English default language, English messages, canonical-id support, verdict normalisation, headless-safe `--open`, attribution footer.
- Connectors: shared `_http.py` (gzip, timeout, UA from env), English output and errors that never raise; Python 3.12-safe datetime use. New connectors: `github_search.py`, `stackexchange.py`, `searxng.py`, `fetch_url.py`.
  `reddit.py` and `play_reviews.py` kept as optional.
- New: `init_run.py`, `validate_artifacts.py` (catches the malformed JSON that smaller models produce).
- Tests rewritten for the new vocabulary and extended (15 offline tests, standard library only).

## Content

- Source playbook extended for developer tools and open-source projects (GitHub issues by reactions, Stack Overflow, Lobsters); platform vocabulary extended accordingly. Stars and upvotes are graded as attention, never as payment.
- Added "Access red lines" (no evasion, respect rate limits) and "example data is not evidence" to the forbidden patterns.
- The bundled example is now a complete synthetic run (`examples/notion-lite/`) with every artifact, explicitly marked as placeholder data.

## Not carried over

- The upstream landing page, sample HTML report, Chinese README / methodology and iteration plan. See the upstream repository for those.
