# Methodology

Demand Radar validates a demand by trying to **disprove** it. A model supplies judgement, scripts supply arithmetic, and a fixed set of rules stops either from flattering the idea.

## Two layers: the model judges, scripts execute

1. **Evidence.** Parallel collectors pull from free official APIs and web search. Each item is labelled with a `signal` (a short phrase; same meaning = same label), a `source_type`
   (hard / behavioral / opinion / analyst), an `origin` (primary / secondary / suspected-repost), a `platform` from a fixed vocabulary, the `dims` it supports and the sub-claims it touches.
   `triangulate.py` then applies the rule deterministically: a signal needs **>=2 independent platforms** to count as verified. Platform names are normalised first ("HN" and "Hacker News" are one source),
   and signals backed only by secondary or repost material drop one confidence level. `--gaps` computes which scorecard dimensions still have fewer than 2 evidence items, so follow-up searches aim at real gaps.
2. **Scoring.** Three judge personas (optimist, strict, neutral) score seven dimensions independently; a dimension with no evidence is `score: null`. `aggregate_scores.py` takes medians, flags spread >= 2,
   removes no-data dimensions from the weighted total entirely (missing evidence is never a 0), applies weights (willingness to pay x2, pain x1.5) and maps to a verdict band. After the red team attacks,
   the affected dimensions go back to the judges; both aggregates are kept and rendered as an "initial -> post red-team" line.

## Anti-bias mechanisms

- **Adversarial red team** with nine kill methods runs before any verdict is final; per sub-claim, so "demand is real" and "your pricing model works" are judged separately.
- **Triangulation:** a single source can never pose as verified.
- **Mandatory "not verified" section:** "not found" is never written as "does not exist".
- **Opinion <= lead:** "I would buy this" cannot support a willingness-to-pay conclusion. Stars and upvotes are attention, not payment.
- **Competition is evidence of demand,** not an automatic penalty; a red ocean only lowers the differentiation wedge, and only when you have no cut nobody occupies. A blue ocean with no demand evidence is not a good sign.
- **Hard cap:** no Go while willingness to pay or market size has no data.
- **Persona isolation:** judges never see each other's scores; in single-agent hosts the independence limit is declared in the report.

## Zero-login data access

Free official APIs and ordinary web search only: no scrapers, no OAuth, no keys, no evasion. Sources that need login or anti-bot circumvention (large-scale Reddit, paid review databases, exact search volume) are out of scope
and are listed under "not verified" when they would have mattered. Reddit is best effort because it often blocks agent and cloud IPs.

## What a verdict means

| Weighted share | Verdict | Meaning |
|---|---|---|
| >= 70% | Go | Demand holds; run a cheap next test (landing page, pre-sale) |
| 50-70% | Conditional | Partly holds; defuse the named blocker first |
| 30-50% | Pivot | The real pain is somewhere else; change the ICP or the job |
| < 30% | No-go | The evidence does not support it |

The verdict always comes with a confidence, the sub-claim states (supported / uncertain / refuted), the list of what could not be verified, and one time-boxed experiment to run next. It is a decision aid
built from public evidence, not a forecast.
