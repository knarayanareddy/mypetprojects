# Compatibility notes

How the skill maps onto each host, and how to adapt it to a new one.

## Verified host mapping

| Host | Skill location | Entry | Subagents | Web | Notes |
|---|---|---|---|---|---|
| Hermes Agent | `~/.hermes/skills/<category>/demand-radar` (or `~/.agents/skills` via external_dirs) | `/demand-radar`, `hermes -s demand-radar` | `delegate_task` (batch, default concurrency 3-10, children have no context and cannot ask) | `web_search`, `web_extract` | Mode A; Mode B when concurrency is 1 |
| Roo Code | `.roo/skills/` or `~/.roo/skills/` (also `.agents/skills/`) | `/demand`, `/demand-radar` (custom mode slug), or the mode picker | `new_task` (sequential) | MCP search server, `browser_action` | Mode B; custom mode restricts edits to `.demand-radar/` |
| Claude Code | `.claude/skills/` / `~/.claude/skills/`, or plugin | `/demand-radar` | Agent tool (parallel) | WebSearch, WebFetch | Mode A |
| Codex CLI and other Agent Skills hosts | `.agents/skills/` / `~/.agents/skills/` | plain language or the host's skill syntax | host dependent | host dependent | Mode A, B or C |
| Anything else | n/a | paste `adapters/generic/system-prompt.md` | optional | optional (SearXNG fallback) | Mode C |

Host facts above were checked against the Hermes and Roo Code documentation (skills locations, `delegate_task`, `new_task`, custom modes, slash commands). Tool names can change between versions;
SKILL.md's mapping table is the one place to update.

## Adapting to a new host in four steps

1. Put `skills/demand-radar/` where the host loads skills (or reference it from the host's rules file).
2. Fill the capability table in SKILL.md step 0 with the host's tool names for ASK, SHELL, FILES, SEARCH, FETCH, SUBAGENT.
3. Pick an execution mode: parallel subagents (A), sequential isolated subtasks (B), single agent (C).
4. If the host has no web search, run a SearXNG instance and set `SEARXNG_URL`, or accept connector-only runs with "low" confidence.

## Why the scripts are the portability layer

Everything with a hard rule (triangulation, aggregation, verdict bands, report rendering, artifact validation) is a plain Python script that reads and writes JSON. Any model that can run a shell command and write a file
gets identical maths. Weaker models mostly fail at structure, not arithmetic, which is why `validate_artifacts.py` exists and why the prompts in `prompts/` spell out the output schema.

## Known limits

- Single-agent runs (Mode C) have weaker judge independence. The report says so in `method.mode`.
- Hosts without any web tool cannot do the top-down pillar properly; confidence is capped at "low".
- `delegate_task` and `new_task` are synchronous in their hosts; an interrupted turn loses in-flight subtasks, but all finished artifacts are on disk and a run can be resumed from its run directory.
- Chinese-market sources (Zhihu, Xiaohongshu, V2EX) are reachable only through web search; there is no keyless official API for them.
