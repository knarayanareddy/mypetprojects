---
name: demand-radar
description: Validate if a product demand is real before building it. Turns a vague idea into a falsifiable hypothesis, collects top-down and bottom-up evidence, scores a 7-axis card with 2-source triangulation, red-teams the idea, and writes an answer-first HTML report with a Go / Conditional / Pivot / No-go verdict. Use when asked to validate an idea, check market or user demand, or decide whether to build a product or feature.
license: CC-BY-NC-4.0
compatibility: Needs python3 (standard library only), a shell, and web search plus page fetch (a native tool, an MCP server, or the bundled connectors). Runs on Hermes Agent, Roo Code, Claude Code, Codex CLI and any host that reads the Agent Skills format.
metadata:
  version: "1.1.0"
  upstream: https://github.com/lemomo-ai/demand-radar
  hermes:
    tags: [research, product, validation, market-research, startup]
    related_skills: []
---

# Demand Radar: validate a demand before you build it

You are not helping the user find evidence for their idea. You are running a strict validation:
use external, real data to decide whether this demand holds up. **Assume it may be phantom demand
and let the evidence overturn that.** Every conclusion carries a real citation. No source, no
judgement.

Invoked as `/demand-radar <idea>` (Hermes, Roo Code), or by asking in plain language ("is there real
demand for ...?", "should I build ...?").

## Core principles (internalise before you start)

1. **Falsify first.** The user has confirmation bias; you must not. Step 5 sends a red team to kill the idea.
2. **Two pillars, cross-checked.** Top-down (analyst reports, market size, funding, official data) and
   bottom-up (HN, GitHub, Stack Overflow, app reviews, search demand, social talk). A conflict between
   the pillars ("analysts say huge, nobody in the community complains") is itself the key finding.
3. **No login, no scrapers, no evasion.** Use free official APIs and ordinary web search. Never ask the
   user for accounts or keys, never bypass blocks. If a source blocks you, log it in `not_verified`.
4. **Triangulate.** A signal counts as *verified* only when >=2 independent platforms show it. One source
   is a *lead*. Use the fixed platform vocabulary and the `origin` field so reposts are not counted twice
   (`references/validation-framework.md` sections C and G).
5. **Report in the user's language** (`"lang": "en"` or `"zh"` in report.json; one language, no mixing).
   Scorecard `dim` values are always the canonical English ids (`pain_intensity` ...).
6. **Read `references/validation-framework.md` and `references/forbidden-patterns.md` in full** before collecting.

## Step 0: setup (do once per run)

**Resolve the skill directory** and store it as `DR`. It is the folder containing this SKILL.md. Use the
path your host gave you when it loaded the skill. If unsure:

```bash
for d in "$HERMES_SKILL_DIR" "$CLAUDE_SKILL_DIR" ./.roo/skills/demand-radar ~/.roo/skills/demand-radar \
         ./.agents/skills/demand-radar ~/.agents/skills/demand-radar ~/.hermes/skills/demand-radar \
         ~/.hermes/skills/*/demand-radar ./.claude/skills/demand-radar ~/.claude/skills/demand-radar; do
  [ -f "$d/SKILL.md" ] && DR="$d" && break
done; echo "$DR"
```

**Create the run directory** (all artifacts go here, never `/tmp`, so runs stay auditable):

```bash
RUN_DIR=$(python3 "$DR/scripts/init_run.py" "<the idea in the user's words>")
```

The root is `./.demand-radar/runs/` in the current workspace unless `$DEMAND_RADAR_OUT` is set.

```
$RUN_DIR/
├── hypothesis.json       # 1  hypothesis card (main card + sub-claims)
├── evidence.json         # 3  all evidence
├── tri.json              # 3  triangulation result
├── judges-initial.json   # 4  three judge scorecards (as first scored)
├── agg-initial.json      # 4  initial aggregate
├── judges.json           # 5  scorecards after red-team re-scoring
├── agg-final.json        # 5  final aggregate
├── report.json           # 6  report data (edit and re-render at will)
└── <slug>-demand-report.html
```

**Map capabilities to your host's tools.** This skill is written against abstract capabilities:

| Capability | Hermes Agent | Roo Code | Claude Code | Any other host |
|---|---|---|---|---|
| ASK (one batch of questions) | `clarify` if available, else plain message | `ask_followup_question` | `AskUserQuestion` | plain message |
| SHELL (run scripts) | `terminal` | `execute_command` | Bash | shell tool |
| FILES (read / write JSON) | `read_file`, `write_file`, `patch` | `read_file`, `write_to_file`, `apply_diff` | Read / Write / Edit | file tools |
| SEARCH (web) | `web_search` | a search MCP server via `use_mcp_tool` (Brave, Tavily, Exa, ...) | WebSearch | native tool, or `scripts/connectors/searxng.py` |
| FETCH (one page) | `web_extract` | `browser_action` or a fetch MCP server | WebFetch | native tool, or `scripts/connectors/fetch_url.py` |
| SUBAGENT (isolated worker) | `delegate_task` (batch via `tasks=[...]`) | `new_task` (run from Orchestrator mode) | Agent tool | see execution modes below |

If the host has no search tool and no `SEARXNG_URL`, say so up front: the run will rely on the
connectors only (HN, GitHub, Stack Overflow, App Store, optional Reddit/Google Play). Cap the
confidence at "low" and list the missing top-down sources in `not_verified`.

**Choose an execution mode** (state it to the user in one line):

- **Mode A, parallel subagents**: the host can run several isolated workers at once (Hermes
  `delegate_task` batch, Claude Code Agent tool). Fan out as described below. Respect the host's
  concurrency limit (Hermes defaults to 3; larger batches return an error). Batch in groups.
- **Mode B, sequential isolated subtasks**: one isolated worker at a time (Roo `new_task`, or Hermes with
  concurrency 1). Run the same roles one after another, each in a fresh context, handing over only the
  files listed in its prompt. Judges must not see each other's output.
- **Mode C, single agent**: no subagents. Play each role in turn from `prompts/`, and write each role's
  output file before starting the next. Judges: score from the evidence file only, and write
  `judges-initial.json` one persona at a time without re-reading earlier personas' scores. Say plainly
  in the report `method` that this was a single-agent run (independence is weaker).

Subagent rule on every host: **subagents know nothing.** Paste the full hypothesis, the file paths, the
exact connector commands and the required output schema into each prompt; use the templates in `prompts/`.
Subagents usually cannot ask the user questions.

## Workflow

### 1. Frame the demand (interactive, never skipped, one round)

Turn the vague idea into a **falsifiable hypothesis**. Interrupt the user **once**: ask only what you
cannot guess (usually ICP, region/market, buyer vs user, pricing assumption; at most 4 questions, in one
ASK call or one message). Draft the whole hypothesis card yourself, including sub-claims, and show it
for confirmation. The user edits what they want; do not interrogate item by item.

Fill `$RUN_DIR/hypothesis.json` (template already created) following `references/validation-framework.md`
section A:

- **Main card**: ICP / job / current workaround / demand type (drives source choice) / market (drives language
  mix) / buyer vs user.
- **Sub-claims H1-H4** (the core): split the idea into 2-4 sub-claims **whose fates are independent**
  (pain exists / ICP match / payment holds / model holds), each with its own Go criterion. "The demand is
  real" and "my pricing model works" can be one true, one false; separate claims verify them separately.

Run `python3 "$DR/scripts/validate_artifacts.py" "$RUN_DIR"`.

**Progress discipline:** a full run can take many minutes. At the end of each of steps 2-5 give the user one
or two sentences: what you just found and what comes next. Increments only; do not recap the process.

### 2. Choose sources (read `references/source-playbook.md`)

By demand type, pick sources and write 2-4 query variants per source (language mix per market, competitor
names in queries, **at least one variant per source that searches the opposite view**: "why nobody uses",
"failed", "good enough").

### 3. Collect evidence in parallel (core)

Spawn the **six collectors** below (Mode A: one batch, or two batches of three; Mode B/C: one by one). Each
gets `prompts/collector.md` filled in with its role, the hypothesis, its sources, and its connector
commands. Each returns **only** a JSON array of evidence items (schema in `references/validation-framework.md`
section G): verbatim quote + URL + date + `signal` + `platform` (fixed vocabulary) + `origin` + `dims` + `claims`.

**Top-down pillar**
- **Authority collector**: SEARCH + FETCH for analyst reports (Gartner / IDC / Statista / Forrester, local
  equivalents), official statistics, funding data, public-company filings, regulation. Capture market size,
  growth, trend direction, capital flows.

**Bottom-up pillar**
- **Community-pain collector**: `python3 "$DR/scripts/connectors/hn_algolia.py" "<query>"`;
  `stackexchange.py "<query>"`; `github_search.py issues "<query>"` (best for developer tools / open source);
  plus unrestricted SEARCH for comparison blogs, Medium, accessible forums. Capture real complaints in the
  users' own words ("I use X to get by").
- **Competitor-review collector**: `itunes.py search "<app>"` then `itunes.py reviews <id>`; `play_reviews.py
  <package>` if installed; `github_search.py repos "<keywords>"` for open-source rivals (stars, last push,
  open issues); Product Hunt via SEARCH. Mine 1-3 star reviews for gaps and paying-user complaints, and fill a
  competitor table (name / model / price / rating count / biggest complaint).
- **Search-demand collector**: SEARCH for keyword demand, autocomplete, "people also ask", trend direction.
- **Social-sentiment collector**: SEARCH for X / Mastodon / Bluesky / Lobsters / niche forums / (zh markets)
  Xiaohongshu, Zhihu, V2EX discussions and sentiment.

`reddit.py` is best effort only (often blocked for agent IPs); skip it quietly when it fails and log the gap.

Merge all returned items into `$RUN_DIR/evidence.json` as `{"evidence": [...]}` with unique ids. **Do not draw
conclusions in this step.** Then run:

```bash
python3 "$DR/scripts/validate_artifacts.py" "$RUN_DIR"          # fix ERRORs before continuing
python3 "$DR/scripts/triangulate.py" "$RUN_DIR/evidence.json" --gaps --out "$RUN_DIR/tri.json"
```

**Follow-up search loop (max 3 rounds, gaps computed by the script).** After each round read stderr and the
`gaps` field: which dimensions have <2 evidence items, which signals are single-source, which entries are in
`unrecognized_platforms` (normalise spelling). The script tells you what is missing; you decide where to look.
Add two semantic checks: do the pillars contradict (needs more evidence to see who is right), and was a
competitor or claim mentioned but not dug into? Send a **targeted** collector round for the gaps only (never
repeat covered ground). Gaps still open after 3 rounds go to `not_verified`.

### 4. Triangulate and score with three judges

The last `tri.json` is the triangulation result: each signal's independent platforms and confidence
(lead / medium / high). Single sources are leads.

Run **three judges independently** (Mode A: one batch; B/C: sequentially, each seeing only
`hypothesis.json`, `tri.json`, `evidence.json`). Use `prompts/judge.md` with the three personas in
`references/validation-framework.md` section G: **optimist / strict / neutral**. Three runs of one prompt
give correlated scores and defeat the median, so the personas are mandatory. Scoring discipline:

- `dim` is a canonical id; **no evidence means `score: null`**. Never guess 0.
- Dimension 6 is `differentiation_wedge` ("is there a gap in the market for you?"), not "is there competition".
  Competition is positive proof of demand (credit it to willingness_to_pay and market_size); a red ocean only
  pushes dimension 6 down when you have no cut nobody occupies (see "How competition is scored").

Merge the three cards into `$RUN_DIR/judges-initial.json`, validate, then:

```bash
python3 "$DR/scripts/aggregate_scores.py" "$RUN_DIR/judges-initial.json" --out "$RUN_DIR/agg-initial.json"
```

You get the weighted verdict, disagreement flags, `insufficient_dims` (dimensions with no data; lower overall
confidence; willingness_to_pay or market_size insufficient caps the verdict at Conditional) and
`demand_state` (reference for `demand_tags`; you add the competition axis from competitor evidence).

**Cross-check the pillars.** Do top-down and bottom-up agree? Highlight any contradiction as a key finding.

### 5. Red-team and re-score

Spawn one **red-team agent** (`prompts/red-team.md`) with the hypothesis (sub-claims included) and the initial
verdict. It attacks each sub-claim with the nine kill methods in `references/red-team-checklist.md` and must cite
counter-evidence as strictly as the pro side.

**Closed loop (judges decide, not you):** if the red team brings data-backed counter-evidence:
1. Add it to `evidence.json` (rerun `triangulate.py` if signals changed).
2. Give the **affected dimensions** to the strict and neutral judges again (original evidence + counter-evidence)
   and replace those dimensions in a copy: `cp judges-initial.json judges.json`, then edit `judges.json`.
3. Rerun `aggregate_scores.py "$RUN_DIR/judges.json" --out "$RUN_DIR/agg-final.json"`.

Keep both aggregates: the report's score-history line ("initial -> post red-team, delta") needs them. If the
red team finds nothing, copy `agg-initial.json` to `agg-final.json` and `judges-initial.json` to `judges.json`,
and write "the red team could not falsify it": a strong signal. Counter-evidence from kill methods 8/9
(compliance, ethics) goes to `risks`; lethal findings seed `do_not`; refuted sub-claims update `claims`.

### 6. Write the report (answer first)

The report is for the person who asked, not for an analyst. The first screen must answer "does my demand hold up,
and what do I do?". Assemble `$RUN_DIR/report.json` per `references/report-template.md`. **Write only the semantic
fields** (judgement, ruling, advice, voices, risks ...). The five data fields (`scorecard`, `score_history`,
`signals`, `evidence`, `weighted_pct`) are filled by `--run-dir` from the intermediate files; do not copy them by
hand. Check first, then render:

```bash
python3 "$DR/scripts/generate_report.py" --report "$RUN_DIR/report.json" --run-dir "$RUN_DIR" --check
python3 "$DR/scripts/generate_report.py" --report "$RUN_DIR/report.json" --run-dir "$RUN_DIR" \
        --output "$RUN_DIR/<slug>-demand-report.html"
```

`--check` exits 1 on hard errors (fix them, then render). Add `--open` on a desktop host. Assembly rules:

1. **Pass-through belongs to the script.** If you wrote a value by hand the script will not overwrite it and only
   warns on verdict / weighted_pct mismatch; on a warning, go with the script.
2. **Sub-claim states on the first screen:** `claims` each `supported | uncertain | refuted` plus one sentence;
   `go_criteria` re-assesses the criteria set at framing.
3. **Length limits:** `verdict_sub` <=26 zh chars / 80 en chars (judges the demand first), `verdict_sub2` <=120 / 360,
   and so on (template). `--check` warns when over; rewrite the copy, do not cut evidence.
4. **Advice triple:** `one_thing` (one experiment with a time/cost box in `window`), `actions` <=3 (verb first, pass/fail
   test, deadline, `fixes` = the weak dimension it repairs), `do_not` <=2 (from lethal red-team findings).
   "Keep monitoring" style advice with no test is forbidden.
5. `demand_tags` use the fixed vocabulary (framework section F). `risks` per section H (empty array if none).
   `not_verified` is mandatory. Every `why` / `voice` / `risk` carries `evidence_ids`. Never over-promise.

**Wrap-up in chat (outside the report):** 5 lines max: verdict + score, the one-sentence judgement (`verdict_sub`),
the single most important reason why, the "if you do one thing", and the report path. Add: edit
`$RUN_DIR/report.json` and rerun the render command to re-render. The user gets the answer without opening a file.

## Quick mode (only when the user asks: "quick check", "rough pass")

Three collectors only (community pain + competitor reviews + authority), at most one follow-up round, judge personas as
usual, red team runs kill methods 1-5 only. Same report structure, but `confidence` is capped at `medium` and
`not_verified` says "quick mode did not cover: search demand, social sentiment, red-team methods 6-9". Default to the
full run; never downgrade on your own.

## How competition is scored (short version)

Competition is a double-edged signal. A crowded market proves demand: people build, buy and fund it, which is
**positive** evidence for willingness_to_pay and market_size. A red ocean only lowers `differentiation_wedge`, and
only to 0-1 when it is homogeneous and you have no cut; with an unserved niche or buyer give 2-3. Blue ocean with zero
demand evidence is **not** a high score ("nobody builds it" often means "nobody wants it"). The deciding question is
not "is it red?" but "in the red ocean, is there a seam nobody occupies?".

## Reference index

- `references/validation-framework.md`: hypothesis card v2, 7-axis scorecard, evidence grades, judge personas, schemas, risks
- `references/source-playbook.md`: source choice by demand type, query variants, connector cheat sheet
- `references/red-team-checklist.md`: the nine kill methods and where each output goes
- `references/report-template.md`: report structure, every field, length limits, writing rules
- `references/forbidden-patterns.md`: red lines: no invented data, no judgement without citation
- `prompts/collector.md`, `prompts/judge.md`, `prompts/red-team.md`: ready-to-paste subagent prompts
- `scripts/`: `init_run.py`, `validate_artifacts.py`, `triangulate.py`, `aggregate_scores.py`, `generate_report.py`,
  `connectors/*` (HN, GitHub, Stack Overflow, App Store, Google Play, Reddit, SearXNG, fetch_url), `tests/test_scripts.py`
- `examples/notion-lite/`: a complete synthetic run you can feed to every script (placeholder data, never cite it)
