# Red-team checklist

The red team's only KPI: **kill the demand hypothesis**. Not balance, but a full-strength falsification attempt. The user
talks themselves into things; you are the unforgiving opponent. You receive the hypothesis (sub-claims H1-H4 included) and
the initial scores, and attack item by item. **Attack per sub-claim**: "the demand is real" and "the model holds" can be one
true and one false, so never bundle them.

## Nine kill methods: look for counter-evidence for each

1. **Phantom demand**: people say they want it, behaviour says they do not care.
   - Look for: similar products that launched and died; "sounds great but nobody uses it".
   - Reverse trap: **no competitors can mean "nobody wants it"**. Blue ocean plus zero demand evidence leans phantom.
2. **Vitamin, not painkiller**: painful, but not enough to trigger payment or switching.
   - Look for: is the current workaround "good enough"? Is the switching cost higher than the pain?
3. **Saturated / red ocean (ask about the wedge first)**: the demand is real but supply is oversupplied.
   - Look for: competitor count, incumbent coverage, price wars.
   - **A red ocean is not an automatic death sentence**: competition proves the demand is real and profitable. The real kill is
     "red ocean **and** you have no cut nobody occupies". If an unoccupied niche or buyer exists this is only "weakening", not
     "lethal"; take the points off `differentiation_wedge`, not off willingness_to_pay / market_size (competition validated those).
4. **Shrinking**: the demand is being replaced by a new paradigm.
   - Look for: trend direction downward; a replacing paradigm (an AI tool eating the category, a platform shipping it natively).
5. **Nobody pays / unit economics fail**: the pain exists but the business model does not.
   - Look for: peers living only on free or ads; tiny paid conversion; ticket size that cannot fund acquisition (LTV < CAC);
     whether the pricing model the user bets on (one-time, subscription, free+) was already refuted among peers.
6. **Unreachable**: users exist but cannot be found, or acquisition cost explodes.
   - Look for: scattered users, no gathering channel, acquisition that depends on burning money.
7. **Sample bias**: is the initial evidence from one echo chamber?
   - Look for: only HN / startup circles talking (they love tools but do not represent the mass market)? Missing top-down data?
8. **Compliance / platform risk**: demand and money are real, but a regulator or platform can veto it.
   - Look for: store review (filing, content rules, age rating), sector regulation (health / finance / education / privacy),
     policy direction, single-platform dependency tightening.
9. **Ethics / science backlash**: the core claim does not stand, or the product harms users.
   - Look for: claims judged pseudo-science by authoritative sources; studies showing similar products worsen the problem
     (anxiety, addiction, self-harm); lawsuit, press or store-removal exposure.

## Output format

For each kill method give:

- **Ruling**: lethal / weakening / not established (the attack found no counter-evidence)
- **Sub-claim attacked**: H1-H4
- **Counter-evidence**: a specific URL plus quote or number; if none, say plainly "no counter-evidence found"
- **Effect on initial scores**: which dimension should go down (and why)

Finish with one sentence: **the single most lethal weakness of this hypothesis**. If every attack fails, say honestly "the red
team could not falsify it". That is a strong signal in itself.

**Where the output goes** (use it directly when writing the report):

- Counter-evidence from methods 8 and 9 goes to `risks` in report.json (with `type` and `severity`).
- "Lethal" counter-evidence is the first material for `do_not` ("do not ship as X").
- Refuted sub-claims show as "refuted" in the hero's sub-claim states.
- Data-backed counter-evidence is added to `evidence.json` and the **affected dimensions are re-scored by the strict and
  neutral judges** (SKILL.md step 5). The red team does not change scores itself.

## Discipline

- Never invent counter-evidence to make a kill. Finding none is a result that favours the hypothesis.
- Counter-evidence needs citations at the same standard as the pro side.
- Separate "I speculate it will fail" from "data shows it will fail"; only the latter can change a score.
