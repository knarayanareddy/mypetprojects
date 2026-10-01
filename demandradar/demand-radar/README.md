# Demand Radar (portable edition)

**Validate whether a demand is real before you build it.** An agent skill that turns a vague idea into a falsifiable hypothesis, collects evidence from two pillars, triangulates it,
scores a 7-axis card with three independent judge personas, sends a red team to kill the idea, and writes an answer-first HTML report with a verdict:
**Go / Conditional / Pivot / No-go**. No login, no scrapers, no API keys, standard-library Python only.

This is a portable adaptation of [lemomo-ai/demand-radar](https://github.com/lemomo-ai/demand-radar) (a Claude Code plugin by Leif Diao, CC BY-NC 4.0). The method, scoring rules,
report design and scripts are theirs; this edition makes them run on **Hermes Agent, Roo Code, Claude Code, Codex CLI and any open-source agent** that reads the
[Agent Skills](https://agentskills.io) format or can follow a system prompt. See [NOTICE.md](NOTICE.md) and [CHANGES.md](CHANGES.md).

## Why it exists

You have a product idea. Before writing code you want to know: is the demand real, how big, who has it, how do they cope today, will they pay? Most people rely on gut feeling or
drown in browser tabs and confirmation bias. Demand Radar packages multi-source evidence collection, a scorecard and an adversarial red team into one repeatable run, and it is built to
argue **against** your confirmation bias, not with it.

- **Two evidence pillars.** Top-down (analyst reports, market size, funding) and bottom-up (HN, GitHub issues, Stack Overflow, app-store reviews, search, social). When they disagree
  ("analysts say huge, nobody in the community complains") that contradiction is the finding.
- **Built-in red team.** An agent whose only job is to kill the hypothesis: phantom demand, saturated, shrinking, nobody pays, unreachable, sample bias, compliance, ethics.
- **7-axis scorecard with hard rules.** Pain intensity, prevalence, current-alternative gap, **willingness to pay (x2)**, market size and trend, **differentiation wedge**, reachability.
  Competition is evidence that demand exists, not an automatic penalty. A signal is "verified" only at 2 or more independent sources; one source is a lead.
- **Three judge personas** (optimist, strict, neutral) score in isolation; scripts take medians, flag disagreement and refuse a Go while a core dimension has no data.
- **Answer-first report.** Question -> plain verdict -> why. Score on a 0-100 band, the one thing to do next with a time/cost box, evidence collapsed and every claim traceable.
- **Honest by construction.** A mandatory "what we could NOT verify" section; `null` means no data and is never scored as 0.

## Install

Requirements: Python 3.8+ and an agent host. Nothing else to install.

```bash
git clone <this repo> && cd demand-radar           # or unzip the kit

python3 install.py --target hermes                 # Hermes Agent    -> ~/.hermes/skills/research/demand-radar
python3 install.py --target roo --dest ~/code/app  # Roo Code        -> .roo/skills, .roo/commands, .roo/rules-demand-radar, .roomodes
python3 install.py --target agents                 # cross-agent     -> ~/.agents/skills/demand-radar (Roo, Codex, Hermes via external_dirs, ...)
python3 install.py --target claude                 # Claude Code     -> ./.claude/skills/demand-radar
python3 install.py --target path --dest ./skills   # anywhere        -> ./skills/demand-radar
python3 install.py --target all --dry-run          # preview everything
```

Useful flags: `--scope global|project`, `--force` (replace), `--symlink` (link instead of copy), `--with-agents-md` (append a section to the project's `AGENTS.md`), `--uninstall`.

| Host | Guide | Invoke |
|---|---|---|
| Hermes Agent | [adapters/hermes/README.md](adapters/hermes/README.md) | `/demand-radar <idea>` or `hermes -s demand-radar` |
| Roo Code | [adapters/roo-code/README.md](adapters/roo-code/README.md) | `/demand <idea>` or the **📡 Demand Radar** mode |
| Claude Code | below | `/demand-radar <idea>` |
| Codex CLI and other Agent Skills hosts | `--target agents` | ask in plain language, or `$demand-radar` / `/demand-radar` |
| Anything else (Aider, Cline, Continue, OpenHands, custom frameworks) | [adapters/generic/system-prompt.md](adapters/generic/system-prompt.md) | paste the prompt, point it at the kit |

**Claude Code plugin route** (keeps the original install flow):

```
/plugin marketplace add <path-or-repo-of-this-kit>
/plugin install demand-radar@demand-radar-marketplace
```

## What the host must provide

The skill is written against abstract capabilities, so it adapts to whatever tools the host has:

| Capability | Hermes Agent | Roo Code | Claude Code | Fallback shipped here |
|---|---|---|---|---|
| Ask one batch of questions | `clarify` | `ask_followup_question` | `AskUserQuestion` | plain message |
| Shell | `terminal` | `execute_command` | Bash | none needed to start |
| Files | `read_file` / `write_file` / `patch` | `read_file` / `write_to_file` / `apply_diff` | Read / Write / Edit | |
| Web search | `web_search` | search MCP server | WebSearch | `connectors/searxng.py` (self-hosted SearXNG) |
| Fetch a page | `web_extract` | `browser_action` / fetch MCP | WebFetch | `connectors/fetch_url.py` |
| Subagents | `delegate_task` (parallel batch) | `new_task` (sequential) | Agent tool | single-agent mode |

Three execution modes cover every host: **A** parallel subagents, **B** sequential isolated subtasks, **C** single agent playing each role in turn (weaker independence, stated in the report).
Without any web search the run still works through the built-in connectors but its confidence is capped at "low".

## Use

```
/demand-radar A CLI that generates typed API clients from Postgres schemas
```

1. The skill turns it into a falsifiable hypothesis card (ICP, job, current workaround, sub-claims H1-H4, Go criteria) and asks **one** round of questions.
2. Six collectors gather evidence in parallel (or in turn): authority reports, community pain, competitor reviews, search demand, social sentiment.
3. Triangulation (>=2 independent platforms), then three judge personas, then the red team. Affected dimensions are re-scored.
4. You get a self-contained HTML report in `./.demand-radar/runs/<slug>-<timestamp>/` plus a five-line chat summary. Edit `report.json` and re-render any time.

## Data sources (all free, official, keyless)

| Source | Connector | Platform label |
|---|---|---|
| Hacker News (Algolia) | `hn_algolia.py` | HN |
| GitHub repos and issues | `github_search.py` (optional `GITHUB_TOKEN` for rate limit) | GitHub |
| Stack Overflow / Stack Exchange | `stackexchange.py` | Stack Overflow |
| App Store search + reviews | `itunes.py` | App Store |
| Google Play (optional `pip install google-play-scraper`) | `play_reviews.py` | Google Play |
| Reddit (best effort, often blocked for agent IPs) | `reddit.py` | Reddit |
| Web search without a native tool | `searxng.py` (`SEARXNG_URL`) | the result's own site |
| One public page as text | `fetch_url.py` | the page's own site |

## Layout

```
demand-radar/
├── skills/demand-radar/          # the portable Agent Skills package (this is what gets installed)
│   ├── SKILL.md                  # workflow: frame -> sources -> collect -> triangulate -> judge -> red-team -> report
│   ├── references/               # framework, source playbook, red-team checklist, report template, red lines
│   ├── prompts/                  # ready-to-paste collector / judge / red-team subagent prompts
│   ├── templates/                # hypothesis template
│   ├── scripts/                  # init_run, validate_artifacts, triangulate, aggregate_scores, generate_report, connectors/, tests/
│   └── examples/notion-lite/     # a complete synthetic run (placeholder data) for trying every script
├── adapters/                     # hermes/, roo-code/ (.roomodes, commands, rules), generic/ (system prompt, AGENTS snippet)
├── .claude-plugin/               # Claude Code plugin manifest (compat)
├── docs/                         # METHODOLOGY.md, COMPATIBILITY.md
├── install.py                    # one installer for every host
├── AGENTS.md                     # instructions for agents working on this repo
├── NOTICE.md, CHANGES.md, LICENSE
```

## Develop and test

```bash
python3 skills/demand-radar/scripts/tests/test_scripts.py        # 15 offline tests, standard library only
# try the pipeline on the bundled synthetic run:
S=skills/demand-radar/scripts; E=skills/demand-radar/examples/notion-lite
python3 $S/validate_artifacts.py $E
python3 $S/triangulate.py $E/evidence.json --gaps
python3 $S/aggregate_scores.py $E/judges.json
```

## License

[CC BY-NC 4.0](LICENSE), inherited from the original project. Free for personal, educational, research and any non-commercial use; fork, modify and share with attribution and a note of changes.
**Commercial use** (bundling into a paid product, paid SaaS hosting, internal use at a for-profit company beyond individual scope, selling reports made with its scoring) needs a separate license
from the original author: leifdiao@gmail.com. This adaptation adds no extra rights. Details in [NOTICE.md](NOTICE.md).

*For people who want to know whether the demand is real before they start building.*
