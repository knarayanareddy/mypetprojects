# Red lines: what is forbidden

The whole value of this skill is that it is **credible**. Break any rule below and the report degrades from a decision aid
into self-congratulation.

## Data red lines

1. **Never invent data.** No number, quote or paraphrase may come from your imagination. Every number traces to a URL.
2. **No source, no judgement.** If a scorecard dimension has no evidence, mark it "insufficient data" (`score: null`). Do not
   guess and do not fill the gap with common sense.
3. **"Not found" is not "does not exist".** Failing to retrieve evidence does not mean the demand is absent. Put it in
   "What we could NOT verify".
4. **Opinion is not hard evidence.** "I think I'd buy it" can never support a willingness-to-pay conclusion.
5. **Citations must be checkable.** Verbatim quote plus a URL that opens plus a date. Mark dead links and secondhand reposts.
6. **Example data is not evidence.** Files under `examples/` are synthetic placeholders. Never cite them in a real run.

## Bias red lines

7. **Do not talk the user into it.** The default hypothesis is "this may be phantom demand". Evidence overturns it, not the
   reverse.
8. **Every verdict goes through the red team.** A Go counts only after it survived a falsification attack.
9. **Never hide contradictory evidence.** When top-down and bottom-up disagree, highlight it. Do not pick the side you like.
10. **Beware echo chambers.** HN and the startup crowd love tools; that does not make a mass market. Calibrate with top-down
    data. GitHub stars and upvotes measure attention, not payment.

## Access red lines

11. **No login, no scraping, no evasion.** Use free official APIs, ordinary web search and plain public pages. Do not ask the
    user for credentials, do not bypass paywalls, CAPTCHAs or blocks, do not run headless browsers against sites that block
    bots. A blocked source goes into `not_verified`.
12. **Respect rate limits and terms of service.** Keep request volume small (the connectors default to a handful of calls).

## Tone red lines

13. **No AI boilerplate:** "empower", "leverage", "unlock", "seamless", "revolutionary", "game-changing", "holistic",
    "cutting-edge", "in today's fast-paced world", "it's worth noting", "in conclusion".
14. **Do not over-promise.** A verdict carries a confidence. Thin evidence means low confidence; never raise a conclusion to
    look good.
15. **Separate speculation from fact.** "The data shows X" and "I infer X" use different wording so the reader can tell.

## Self-check before the report goes out

- [ ] Does every number have a URL?
- [ ] Does every scorecard dimension have evidence or an explicit "no data"?
- [ ] Did a Go (if any) survive the red team?
- [ ] Is there a "What we could NOT verify" section?
- [ ] Did I treat "would buy" as "bought" anywhere?
- [ ] Is any single platform spelled two ways and so counted twice?
- [ ] Any AI boilerplate left?
- [ ] Does `validate_artifacts.py` pass and does `generate_report.py --check` exit 0?
