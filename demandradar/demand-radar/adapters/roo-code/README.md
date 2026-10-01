# Demand Radar for Roo Code

Roo Code reads the Agent Skills format directly, and also supports custom modes, mode rules and slash commands. This adapter wires all four together.

## What you get

| Piece | File | Effect |
|---|---|---|
| Skill | `.roo/skills/demand-radar/` (copied from `skills/demand-radar/`) | The full method, scripts, prompts and references |
| Mode | `.roomodes` -> `📡 Demand Radar` (slug `demand-radar`) | Right tools only: read, edit limited to `.demand-radar/`, commands, browser, MCP. A mode also appears as `/demand-radar` in the slash menu |
| Mode rules | `.roo/rules-demand-radar/01-protocol.md` | Roo tool mapping, `new_task` discipline, safety |
| Slash command | `.roo/commands/demand.md` -> `/demand <idea>` | Switches to the mode and starts the workflow |

## Install

Automatic (recommended), from the root of the kit:

```bash
python3 install.py --target roo --scope project --dest /path/to/your/workspace   # .roo/ + .roomodes in that workspace
python3 install.py --target roo --scope global                                    # ~/.roo/skills + ~/.roo/commands + ~/.roo/rules-demand-radar
```

Manual (project scope):

```bash
cp -r skills/demand-radar                         <workspace>/.roo/skills/demand-radar
cp -r adapters/roo-code/.roo/commands             <workspace>/.roo/commands
cp -r adapters/roo-code/.roo/rules-demand-radar   <workspace>/.roo/rules-demand-radar
cp adapters/roo-code/.roomodes                    <workspace>/.roomodes    # merge by hand if you already have one
```

Global modes live in `custom_modes.yaml` (Modes view -> Edit Global Modes); paste the mode block from `.roomodes` there. Reload the VS Code window if the mode
does not appear. The skill folder can also live in `.agents/skills/` or `~/.agents/skills/` (cross-agent locations Roo also reads), which is handy if you use Hermes or
Codex on the same machine.

## One thing Roo does not ship: web search

Roo Code has no built-in web search tool. Demand validation needs it for the top-down pillar (analyst reports, market size, funding) and for general community search.
Pick one:

1. **A search MCP server** (recommended). Any of Brave Search, Tavily, Exa, SearXNG or Perplexity-style MCP servers works. Add it in Roo's MCP settings; the mode already
   has the `mcp` group. A page-fetch MCP server is a good second addition.
2. **SearXNG without MCP**: run a SearXNG instance, `export SEARXNG_URL=http://localhost:8080`, and the skill falls back to `scripts/connectors/searxng.py`.
3. **Neither**: the run still works with the built-in connectors (HN, GitHub, Stack Overflow, App Store, optional Google Play / Reddit), but the skill will cap the confidence at
   "low" and list the missing top-down sources under `not_verified`.

## Using it

```
/demand A CLI that turns Postgres schemas into typed API clients
```

or switch to the **📡 Demand Radar** mode and describe the idea in plain language. You will get exactly one round of questions, then the run proceeds with `new_task`
subtasks. Reports land in `./.demand-radar/runs/<slug>-<timestamp>/`; open the `.html` file in a browser (Roo's `browser_action` can also open it).

## How Roo differs from a parallel host

`new_task` runs one subtask at a time, so the skill uses **execution Mode B**: the same roles (six collectors, three judges, a red team), one after another, each in a fresh
context with only the files it needs. Judges are isolated by construction, since each is its own subtask. A full run is slower than on a parallel host but the output is
the same. For a faster pass, ask for "quick mode" (three collectors, one follow-up round).

## Tips

- Keep the Orchestrator mode out of this: the Demand Radar mode orchestrates its own subtasks.
- Use a cheaper model for collectors if your setup allows per-mode (sticky) models; keep a stronger one for judging and the red team.
- If a subtask returns prose around the JSON, ask it to resend "only the JSON"; `scripts/validate_artifacts.py` will also tell you what is malformed.
- Context is the scarce resource in long runs: the skill stores everything in files, so you can start a new task and say "continue the Demand Radar run in <RUN_DIR>".
