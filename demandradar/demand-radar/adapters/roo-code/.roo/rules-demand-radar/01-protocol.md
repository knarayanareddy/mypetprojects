# Demand Radar mode rules (Roo Code)

These rules apply only in the `demand-radar` mode. The full method lives in the skill; this file pins down the Roo-specific mechanics.

## Locating the skill

The skill is loaded from `.roo/skills/demand-radar/` (project) or `~/.roo/skills/demand-radar/` (global), or from `.agents/skills/` / `~/.agents/skills/` when the
cross-agent location is used. Set `DR` to that folder before running any script, for example:

```bash
DR=.roo/skills/demand-radar; [ -f "$DR/SKILL.md" ] || DR=~/.roo/skills/demand-radar
```

## Tool mapping

| Need | Use |
|---|---|
| One batch of questions to the user | `ask_followup_question` (max 4 questions, once, in step 1) |
| Run a script | `execute_command`, with the run directory path always quoted |
| Write JSON / HTML | `write_to_file` (create) and `apply_diff` (edit). Writes are allowed only inside `.demand-radar/` |
| Web search | the configured search MCP server through `use_mcp_tool` (Brave, Tavily, Exa, SearXNG ...). If none is configured, say so and fall back to `scripts/connectors/searxng.py` (needs `SEARXNG_URL`) or to connectors only |
| Read one page | `browser_action`, or a fetch MCP server, or `scripts/connectors/fetch_url.py` |
| Isolated worker | `new_task` (one at a time; the parent waits for `attempt_completion`) |

## Subtask discipline

- A subtask starts with a blank context. Put in the message: the whole hypothesis, the exact files to read, the connector commands, the output JSON schema,
  and "finish with attempt_completion containing ONLY that JSON".
- After each subtask returns, write its JSON into the run directory yourself (`raw-<role>.json`), merge, then validate with `scripts/validate_artifacts.py`.
- Judges must never be shown another judge's output. Hand each judge only `hypothesis.json`, `tri.json`, `evidence.json`.
- Keep the orchestrating context lean: store big payloads in files and pass paths, not text, whenever the subtask can read files.

## Auto-approve hints

For a smooth run, allow in Roo's auto-approve settings: read files, write files in the workspace, execute commands matching `python3` and `mkdir`, and the MCP
search tool. Keep everything else on manual approval.

## Safety

No credentials requests, no scraping, no CAPTCHA or paywall bypass. Do not write outside `.demand-radar/`. Do not run commands unrelated to the skill's scripts.
