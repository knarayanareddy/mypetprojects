# Report structure template (answer first)

The reader is **the person who raised the demand** (founder / PM / maintainer), not an analyst. The first screen must answer "does
my demand hold up, and why?". The core is **judging the demand**: tell them what kind of demand it is (real or phantom, red or blue
ocean, wedge or none), not a pile of data and not a rush to advice. Analysis and evidence live in the archive, collapsed by default.
The report is driven by a structured `report.json` and rendered with `generate_report.py`.

The look is a signal-grid / blueprint style: paper-white grid, ink black, signal green. Write copy to match that calm, precise
instrument feel, with no hype and no jargon piles. **Colour budget:** the verdict colour appears only on the verdict word, scale
and ruling rule; signal green only on the brand and "If you do one thing"; red only for lethal / no-go / refuted. The layout already
shouts, so the copy does not need to.

## Rendering order (the generator fixes it; sections without data are skipped and renumbered)

1. **Verdict (decision card):** left (`question` + `one_liner` -> `verdict_sub` big judgement line -> `demand_tags` pills) + right (verdict
   word -> score -> `score_history` line "Initial -> Post red-team, delta" -> scale) + sub-claim grid at the bottom (`claims`: supported /
   uncertain / refuted, refuted in red). Directly below: the full-width green **`one_thing`** banner (the only green block on the page;
   `window` renders the time/cost box).
2. **Why (ruling):** `verdict_sub2` ruling paragraph + `why` plus/minus ledger (counts in the column heads; a 1:3 imbalance is itself a
   visual argument; titles ending in `· lethal` render as a red tag) + a `~` watch bar.
3. **What to do:** `actions` numbered Do list (priority chip + `fixes` auto-appended with that dimension's current score, "fixes:
   Willingness to pay 1/5") | `do_not` Don't red lines.
4. **Scorecard:** 7 bars (green >=3.5 / amber 2.5-3.4 / red <2.5, always with the number), weight badge, judge-disagreement warning, red-team
   delta, hatch for no data; then `risks` rows with severity tags.
5. **Sources (evidence archive, all collapsed):** A `voices` -> B `contradictions` + `red_team` -> C `competitors` + `alternatives` -> D `signals` matrix
   -> E `go_criteria` review -> F `method` + full `evidence`. `not_verified` closes the report in a dashed box (never collapsed: the
   honesty list must stay visible).

## report.json fields

```json
{
  "lang": "en",
  "question": "A simpler Notion",
  "one_liner": "One sentence restating what the user wants to build",
  "verdict": "Go | Conditional | Pivot | No-go",
  "confidence": "high | medium | low",
  "weighted_pct": 48.0,
  "verdict_sub": "One-sentence judgement of the demand, <=80 chars, **bold** allowed",
  "verdict_sub2": "Ruling: what state the demand is in / which direction makes it work, <=360 chars (rendered in section 2, not the hero)",
  "demand_tags": [
    {"text": "Real demand", "kind": "good"},
    {"text": "Red ocean", "kind": "bad"},
    {"text": "Wedge only in a niche", "kind": "warn"}
  ],
  "score_history": [
    {"stage": "Initial", "pct": 64.0},
    {"stage": "Post red-team", "pct": 48.0}
  ],
  "claims": [
    {"id": "H1", "title": "Pain exists", "status": "supported", "note": "one-sentence conclusion"},
    {"id": "H4", "title": "One-time purchase works", "status": "refuted", "note": "all leaders subscribe; lifetime deals defaulted"}
  ],
  "go_criteria": [
    {"criterion": ">=3 independent sources show the same willingness-to-pay signal", "met": "yes|no|partial", "note": "one sentence"}
  ],
  "why": [
    {"kind": "+", "title": "Pain is real", "body": "why it adds points, with facts", "evidence_ids": ["E1", "E3"]},
    {"kind": "-", "title": "Buyer mismatch · lethal", "body": "why it subtracts points", "evidence_ids": ["E4"]},
    {"kind": "~", "title": "Vitamin, not painkiller", "body": "something to watch"}
  ],
  "one_thing": {"title": "Run a two-price landing-page pre-sale in two weeks",
                "detail": "<=240 chars: one experiment plus a pass/fail test",
                "window": "2 weeks · $100 (time/cost box, shown on the banner, optional)"},
  "actions": [
    {"title": "Verb-first next step", "priority": "high|medium|low",
     "detail": "<=240 chars, with a pass/fail test and a deadline", "fixes": "willingness_to_pay"}
  ],
  "do_not": [
    {"title": "Do not ship as a one-time purchase", "reason": "one sentence: why this is a red line (from lethal red-team findings)"}
  ],
  "risks": [
    {"type": "Compliance / platform", "severity": "high", "title": "Short name",
     "body": "where the mine is and when it explodes", "evidence_ids": ["Z1"]}
  ],
  "voices": [
    {"domain": "Community · forums (HN)", "lean": "for|against|mix", "lean_label": "short lean label (optional)",
     "summary": "overall voice of this domain on the demand", "evidence_ids": ["E1", "E3"]}
  ],
  "contradictions": "Two-pillar reconciliation: do top-down and bottom-up agree? Point out any contradiction",
  "red_team": "The red team's most lethal weakness plus where it pulled the verdict",
  "competitors": [
    {"name": "QUITTR", "model": "subscription", "price": "$12.99/mo", "rating": 4.8, "rating_count": 32000,
     "top_complaint": "lifetime deals defaulted, no refunds", "url": "..."}
  ],
  "alternatives": [{"current": "how users cope today", "gap": "gap / opportunity"}],
  "not_verified": ["Point we could not verify", "Point that needs a paid source"],
  "method": {"agents": 10, "evidence_count": 51, "signals_verified": 16, "rounds": 2,
             "sources": ["Hacker News", "App Store reviews", "analyst reports"],
             "mode": "A (parallel) | B (sequential) | C (single agent)"},

  "scorecard": "FILLED BY --run-dir from agg-final.json (do not write by hand)",
  "signals": "FILLED BY --run-dir from tri.json",
  "evidence": "FILLED BY --run-dir from evidence.json"
}
```

`scorecard`, `score_history`, `signals`, `evidence` and `weighted_pct` can be **omitted entirely**. Render with `--run-dir $RUN_DIR`
and the script reads them straight from `agg-final.json` (scorecard, weighted_pct, verdict reconciliation; delta = final median - initial
median), `agg-initial.json` (score_history), `tri.json` (signals: all high/medium plus leads topped up to 12 rows) and `evidence.json` (all
evidence). If you write them yourself the script does not overwrite and only warns on inconsistency. **These five are pass-through, not
creative work.** `verdict` may also be omitted; it is taken from agg-final.

Run `--check` before rendering: required fields, `evidence_ids` integrity, recognisable dimension names, length limits. Exit code 1 on hard
errors; fix them, then render.

### Accepted spellings (so any model's output renders)

`verdict`: Go / Conditional / Pivot / No-go (also the Chinese 可以做 / 有条件做 / 转向 / 别做). `claims[].status`: supported / uncertain /
refuted. `go_criteria[].met`: yes / no / partial. `priority` and `severity`: high / medium / low. `lean`: for / against / mix. `kind`: good / bad /
warn / neutral. `fixes` takes any dimension id or alias (`willingness_to_pay`, "Willingness to pay", "wtp").

## Length limits (the generator warns when exceeded)

| Field | zh chars | en chars | Why |
|---|---|---|---|
| `verdict_sub` | 26 | 80 | the hero is a glance judgement, not an essay |
| `verdict_sub2` | 120 | 360 | the ruling may run longer but must not become an article |
| `why[].title` | 14 | 42 | a conclusion point, not a sentence |
| `why[].body` | 60 | 180 | one fact carries one point |
| `one_thing.detail` / `actions[].detail` | 80 | 240 | advice must be executable, not readable |
| `do_not[].reason` | 40 | 120 | a red line in one sentence |

When over, do not remove evidence; remove modifiers and the second clause.

## Writing notes

- **The conclusion is the soul: judge the demand first.** The first sentence of `verdict_sub` gives the judgement (is the pain real, is the
  direction right). `verdict_sub2` explains the demand's state or where to pivot. That is judging the demand, not teaching how to build.
- **`claims` states are the v2 core output.** Each of H1-H4 gets supported / uncertain / refuted plus a sentence. "Demand is real, but the
  one-time model is refuted" must be visible on the first screen.
- **`why` is the heart; more is better than less (>=5).** `kind` is `+` (adds points), `-` (subtracts) or `~` (watch). `title` is the conclusion
  point, `body` carries the fact. Mark lethal items with "· lethal" in the title.
- **`one_thing` / `actions` / `do_not` grammar:**
  - Verb first + **one finishable experiment** + **a pass/fail test** + a time or cost box (`one_thing`'s box goes in `window`, e.g. "2 weeks · $100").
  - Bad: "keep watching the market", "research user needs more deeply". No test, not executable, forbidden.
  - Good: "Put up a two-price landing page with $100 of ads within two weeks; if order rate is under 1%, drop the one-time purchase."
  - Every action carries `fixes`: the low-scoring dimension or risk it treats (rendered as a "fixes: Willingness to pay 2/5" chip).
  - `do_not` has at most 2 items, taken straight from the red team's lethal counter-evidence; a `severity: high` risk must have a matching action.
- **`voices` are grouped by evidence source:** as many cards as there are source types; `domain` names the source area, `lean` marks the tilt,
  `summary` is one sentence.
- **`competitors` is a hard-data table:** name / model / price / rating (count) / top complaint, from the competitor collector's structured output.
  Not prose.
- **`risks` are separate from the scorecard:** landmines unrelated to score that can veto the project alone (compliance, ethics, unit economics,
  platform dependency). Empty array if none; do not invent.
- **Scorecard order is fixed** at 7 dimensions (the script groups them as demand reality / business potential / landscape). Dimension 6 is
  `differentiation_wedge`, not "competition gap". Scores are the post-red-team finals. `insufficient: true` renders as "No data", never as 0.
- **`not_verified` is mandatory:** list single-source leads, opinion-only points and anything needing a paid source. Never write "not found" as
  "does not exist".
- Every `why` / `voice` / `risk` carries `evidence_ids` pointing into the collapsed evidence appendix.
- If the run was a single-agent run (mode C) or had no web search, say so in `method.mode` and `not_verified`.

## Wording: no AI flavour

The reader will make a decision from this. Write like a direct colleague talking to them, not a model introducing itself.

- **Make the call; do not hedge.** "The data does not support this as a broad demand" beats "this demand may have some potential in certain scenarios".
- **Cut boilerplate:** empower, leverage, unlock, seamless, game-changing, holistic, "it's worth noting", "in conclusion", "not only ... but also".
- **Avoid tricolons and first/second/third pile-ups;** use concrete facts instead of modifiers.
- **Numbers and sources beat adjectives.** "'Too complex' recurs across 84,953 App Store ratings" beats "users generally report a poor experience".
- Before and after:
  - Bad: "As a powerful productivity tool, Notion's complexity may pose a certain barrier to entry for some users."
  - Good: "The real pain is that Notion is too complex, but the people complaining are mostly free solo users, not the buyers. Demand real, buyer wrong."

## Tone red lines

See `forbidden-patterns.md`: no AI boilerplate, no speculation written as fact, never inflate the verdict to please the user, give low confidence for thin evidence.
