# Demand validation framework

Ninety percent of a report's quality comes from this framework; ten percent comes from how much data you pulled.
With a loose framework, more data is just self-persuasion.

Vocabulary used in every JSON file: dimension ids `pain_intensity, prevalence, current_alternatives,
willingness_to_pay, market_size, differentiation_wedge, reachability`; verdicts `Go / Conditional / Pivot / No-go`;
confidence `high / medium / lead`; source types `hard / behavioral / opinion / analyst`; origins
`primary / secondary / suspected-repost`. The scripts also accept the upstream Chinese vocabulary.

## A. Framing discipline (adapted from The Mom Test): hypothesis card v2

Before validating, force the vague idea into a falsifiable hypothesis. A bad hypothesis cannot be overturned by any
data; a good one can.

**Main card** (background; drives source choice and search language):

| Element | Bad (unfalsifiable) | Good (falsifiable) |
|---|---|---|
| ICP | "everyone", "young people" | "5-20 person remote design teams" |
| Job | "improve productivity" | "avoid file-version conflicts when several people edit together" |
| Current workaround | (never thought about it) | "Notion plus a spreadsheet kept in sync by hand" |
| Demand type | (unclassified) | B2B tool / consumer app / physical e-commerce / content creator / developer tool / open source |
| Market | (not considered) | global English / Chinese / bilingual / a named region |
| Buyer vs user | (assumed identical) | "designers use it, the team lead pays": write them separately when they differ |

**Sub-claim decomposition (the v2 core).** An idea is not one hypothesis; it is 2-4 sub-claims **whose fates are
independent**. "The demand is real" does not imply "this ICP has it", nor "they will pay", nor "your pricing/channel
model works". They can be one true and one false (example: "the pain is real" holds while "a one-time purchase works"
is refuted). Typical split:

```
H1 Pain exists    <ICP> repeatedly and really hurts in <situation>          Go: >=2 independent sources quote the same pain
H2 ICP match      the people in pain are the ones you can serve and reach    Go: complainer profile matches the ICP
H3 Payment holds  they pay for a fix (not just say they would)               Go: similar solutions show real payment
H4 Model holds    the pricing / channel / form you bet on works              Go: >=1 live product with that model, growing
```

- Each sub-claim is separately falsifiable and has its own Go criterion; evidence attaches with `claims: ["H1"]`.
- The report's first screen shows a three-state summary per sub-claim: **supported / uncertain / refuted**. "Demand is
  real, but the one-time-purchase model is refuted" must be structured output, not a lucky turn of phrase.
- A claim must contain something data can contradict: people + behaviour + motive/payment.

## B. Evidence grades (decide what you may conclude)

| Grade | Definition | What it can support |
|---|---|---|
| **hard** | Money-backed behaviour: payment, subscription, retention, funding amounts, filed financials | Directly supports willingness_to_pay and market_size |
| **behavioral** | Real use / search / discussion: verbatim reviews, search trends, high-vote complaints, issue reactions | Supports pain_intensity and prevalence |
| **opinion** | "I think I'd buy it", "sounds great" | A lead only; **cannot** support a conclusion alone |
| **analyst** | Forecasts and qualitative judgements in reports | Gives direction; must be cross-checked with behavioural evidence |

Iron rule: **opinion <= lead.** Willingness to pay is validated only by hard or strong behavioural evidence. GitHub
stars, upvotes and "interesting!" replies are attention, not payment: grade them behavioral at most.

## C. Triangulation

A signal is *verified* only when it appears at **>=2 independent sources** (different platforms, not reposts of each other).

- 1 source = **lead** (mark "to verify")
- 2 sources = **medium**
- 3+ sources including hard evidence = **high**

Two anti-inflation rules, enforced by `triangulate.py`:

1. **Platform normalisation.** Write `platform` from the fixed vocabulary (section G). "HN", "Hacker News" and
   "news.ycombinator.com" are normalised to one platform before counting.
2. **Repost downgrade.** Every item carries `origin` (primary / secondary / suspected-repost). If **all** items for a
   signal are secondary or repost (no primary), the confidence drops one level (high to medium, medium to lead). Two blog
   posts quoting the same interview are not two independent sources.

## D. The 7-axis scorecard

Score each 0-5 with **evidence citations and a confidence**. A dimension without evidence gets **`score: null`**
("insufficient data"): never guess. 0 means "the evidence says no"; null means "there is no evidence". These differ.

| # | Dimension id | 0 looks like | 5 looks like |
|---|---|---|---|
| 1 | `pain_intensity` | Vitamin: fine without it | Painkiller: users hunt for fixes everywhere |
| 2 | `prevalence` | A few people, occasionally | Many people, frequently, repeatedly |
| 3 | `current_alternatives` (gap, demand side) | Existing solutions already do the job well | Users cope with tape and string; obvious gap |
| 4 | `willingness_to_pay` (x2) | Only verbal "I'd buy" | People already pay for similar solutions |
| 5 | `market_size` (size and trend) | Small and shrinking | Large and growing fast |
| 6 | `differentiation_wedge` (you vs the market, supply side) | Red ocean, fully homogeneous, no cut for you | A concrete unoccupied cut, backed by demand evidence (blue or red ocean) |
| 7 | `reachability` | Users scattered, unreachable | Users gather in reachable channels |

Do not confuse 3 and 6: **3 asks "is this pain already solved by existing options?" (demand side)**. **6 asks "given the
incumbents, is there a seam nobody occupies for you?" (supply / you side).**

### How competition is scored (a red ocean is not an automatic penalty)

- **Competition proves demand.** People building, buying and funding it is **positive** evidence for willingness_to_pay
  and market_size. Credit it there; do not punish it again in dimension 6.
- **A red ocean lowers only dimension 6**, and only to 0-1 when it is fully homogeneous and you have no cut. With an
  under-served niche, scenario or buyer, give 2-3.
- **Blue ocean plus zero demand evidence is not a high score.** "Nobody builds it" often means "nobody wants it", which is
  more dangerous than a red ocean. Dimension 6 scores high only when **real demand AND under-supply** are both shown.

One line: what decides life or death is not "is it red?" but "in the red ocean, do you have a seam nobody occupies?".

## E. Weights and verdict

Default weights: willingness_to_pay x2, pain_intensity x1.5, the rest x1. Weighted score as a share of the maximum:

| Share | Verdict | Meaning |
|---|---|---|
| >= 70% | **Go** | Demand holds; proceed to the next step (landing page / pre-sale test) |
| 50-70% | **Conditional** | Partly holds; resolve one high-risk item first |
| 30-50% | **Pivot** | The real pain is elsewhere; adjust the ICP or the job |
| < 30% | **No-go** | The evidence does not support it; save the time |

**Insufficient data** (enforced by `aggregate_scores.py`): if every judge gives `score: null` for a dimension, the whole
dimension leaves the weighted total (numerator and denominator) and is listed in `insufficient_dims`.

- Insufficient is **not a negative score**; the report renders a grey "No data" state and it does not drag the total down.
- But a non-empty `insufficient_dims` lowers overall confidence **by at least one level**, and when willingness_to_pay or
  market_size lacks data the verdict is **capped at Conditional**. No Go while a core dimension has no evidence.

Every verdict must pass the red team first (`red-team-checklist.md`), and the report must keep "What we could NOT verify".

## F. Demand-state labels (beyond the verdict)

The verdict answers "build or not"; the **demand state** answers "what kind of demand is this?". Three orthogonal labels go
in `demand_tags` (rendered as coloured pills in the hero):

| Axis | Source | Values (kind) |
|---|---|---|
| **Demand reality** | mean of pain + prevalence + alternatives | Phantom `<30` (bad) / Weak `30-50` (warn) / Real `50-75` (good) / Must-have `>=75` (good) |
| **Competition state** | competitor count and incumbent coverage (your judgement) | Blue ocean (good) / Room to play (good) / Red ocean, saturated (bad) |
| **Opportunity** | differentiation_wedge | No wedge `0` (bad) / Wedge only in a niche `1-2` (warn) / Clear wedge `>=3` (good) |

`aggregate_scores.py` derives the first and third automatically (`demand_state`); you add competition from competitor
evidence. Format: `{"text": "Red ocean", "kind": "bad"}`, kind in good / bad / warn / neutral. Use these labels in
`verdict_sub` / `verdict_sub2`, e.g. "Real demand, but a red ocean; there is a wedge only in niche X". That **judges the demand
itself**; advice on what to do belongs in `actions`.

## G. Data structures

The model does semantic judgement (tagging signals, scoring); scripts do the deterministic counting.

**Evidence item** (from each collector; input to `triangulate.py`):

```json
{"id": "E1", "signal": "Notion is too complex", "platform": "HN",
 "source_type": "hard|behavioral|opinion|analyst", "origin": "primary|secondary|suspected-repost",
 "claims": ["H1"], "dims": ["pain_intensity", "current_alternatives"],
 "claim": "one-line paraphrase", "quote": "verbatim text", "url": "...", "date": "2025-05"}
```

- `signal`: evidence meaning the same thing gets the **same signal label**. Triangulation counts distinct `platform`s per signal.
- `platform` **fixed vocabulary** (the script normalises, do not rely on it): `HN, App Store, Google Play, Reddit,
  Product Hunt, X, Mastodon, Bluesky, Lobsters, Stack Overflow, Stack Exchange, GitHub, GitLab, DEV, Discord, Discourse,
  LinkedIn, Quora, YouTube, Medium, Substack, G2, Capterra, Trustpilot, Google Trends, Wikipedia, 小红书, 知乎, 微博, B站,
  V2EX, 即刻, 百度贴吧`; for analyst reports and media write the organisation (`Statista`, `Gartner`, `TechCrunch`).
  A generic web search result is labelled by the site it came from.
- `origin`: the person's own words / official first-hand data = primary; a media retelling = secondary; content that mirrors
  another source = suspected-repost.
- `claims` / `dims`: which sub-claims and which scorecard dimensions the item supports. `triangulate.py --gaps` uses `dims`
  to compute per-dimension gaps, so label them.

**Judge scorecard** (one per judge; input to `aggregate_scores.py`):

```json
{"judge": "optimist", "scores": [
  {"dim": "pain_intensity", "score": 4, "confidence": "medium", "evidence_ids": ["E1", "E2"]},
  {"dim": "market_size", "score": null, "insufficient": true, "note": "only one analyst source"}
]}
```

Seven dimensions per judge. `dim` is always the canonical id. No evidence means `score: null`; never guess 0.

**Judge personas (three views, mutually invisible).** One model with one prompt run three times gives highly correlated
scores and the median stops protecting you. Add one persona instruction to each prompt:

| Judge | View instruction |
|---|---|
| **optimist** | "You lean towards believing this demand is real. Within what the evidence allows, interpret upwards, but every point must still cite evidence." |
| **strict** | "You assume this is phantom demand. Give points only when the evidence is too strong to avoid; ignore opinion evidence entirely." |
| **neutral** | "Score mechanically by the grades in section B: full weight for hard evidence, medium for behavioural, none for opinion." |

`aggregate_scores.py` takes medians, flags dimensions with spread >= 2 as disagreements and computes the weighted verdict.
A disagreement means the evidence is unclear; say so in the report.

## H. Risk register (veto items outside the scorecard)

The 7 axes answer "is the demand good?". The risk register answers "is there a landmine, unrelated to the score, that can
veto the project alone?". It is not an 8th dimension (that would break the weights); it is a separate structured output,
`risks` in report.json:

| type | What to look at | Example |
|---|---|---|
| **Compliance / platform** | regulation, store review, policy direction | health-app approvals; app store content rules |
| **Ethics / science** | does the core claim stand; can it backfire | a claim judged pseudo-science by 6 sources |
| **Unit economics** | LTV vs CAC; does price carry acquisition | peers survive on free/ads; paid conversion is tiny |
| **Platform dependency** | is the lifeline in one platform's hands | distribution only via one app store with tightening policy |

```json
{"type": "Compliance / platform", "severity": "high|medium|low", "title": "Short name",
 "body": "One sentence: where the mine is and under what condition it explodes", "evidence_ids": ["Z1"]}
```

- Material comes mainly from the red team (kill methods 8 and 9) and from surprises found during collection.
- A `severity: high` risk must have a matching entry in `do_not` or `actions`; never leave it hanging.
- No risks found means an empty array. **Do not invent one.**
