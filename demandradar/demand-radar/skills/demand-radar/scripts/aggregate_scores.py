#!/usr/bin/env python3
"""Multi-judge score aggregation: N judge scorecards in -> median scores, disagreement flags,
weighted verdict and demand-state labels out.

Why a script: aggregation is deterministic maths (median, range, weights). Code makes it
reproducible and flags dimensions where judges disagree.

Usage:
  python3 aggregate_scores.py judges.json [--out agg.json]

judges.json (one object per judge; a single {"judges": [...]} wrapper is also accepted):
  [{"judge": "optimist", "scores": [
      {"dim": "pain_intensity", "score": 4, "confidence": "medium", "evidence_ids": ["E1"]},
      {"dim": "market_size", "score": null, "insufficient": true, "note": "single analyst source"},
      ... 7 dimensions ...]}, ...]

"Insufficient data" rule:
  - A judge with no evidence for a dimension writes score: null. Never guess 0. A 0 means
    "the evidence says no"; null means "there is no evidence".
  - If EVERY judge is insufficient on a dimension it leaves the weighted total entirely
    (numerator and denominator) and is listed in insufficient_dims.

Weights: willingness_to_pay x2, pain_intensity x1.5, the rest x1.
Verdict bands: >=70% Go | 50-70% Conditional | 30-50% Pivot | <30% No-go.
Caps: when willingness_to_pay or market_size is insufficient the verdict cannot exceed
"Conditional" ("no Go without evidence on the core dimensions"), and `confidence_cap` is set.

Dimension names: canonical ids (pain_intensity ...) plus English / upstream-Chinese aliases;
see dr_common.py.
"""
import argparse
import json
import os
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dr_common as C  # noqa: E402

DIMS = C.DIMS
match_dim = C.match_dim
weight = C.weight
is_insufficient = C.is_insufficient
CORE_DIMS = ("willingness_to_pay", "market_size")


def demand_state(med_by_dim):
    """Derive demand-state labels from aggregated medians (feeds report `demand_tags`).
    The competition axis needs competitor evidence, so the model adds that one itself."""
    out = {}
    demand = [med_by_dim[d] for d in C.DEMAND_DIMS if d in med_by_dim]
    if demand:
        pct = round(100 * (sum(demand) / len(demand)) / 5)
        out["demand_reality_pct"] = pct
        if pct < 30:
            out["demand_reality"] = {"text": "Phantom demand", "kind": "bad"}
        elif pct < 50:
            out["demand_reality"] = {"text": "Weak demand", "kind": "warn"}
        elif pct < 75:
            out["demand_reality"] = {"text": "Real demand", "kind": "good"}
        else:
            out["demand_reality"] = {"text": "Must-have demand", "kind": "good"}
    wedge = med_by_dim.get("differentiation_wedge")
    if wedge is not None:
        if wedge < 1:
            out["opportunity"] = {"text": "No wedge", "kind": "bad"}
        elif wedge < 3:
            out["opportunity"] = {"text": "Wedge only in a niche", "kind": "warn"}
        else:
            out["opportunity"] = {"text": "Clear wedge", "kind": "good"}
    return out


def aggregate(judges):
    if isinstance(judges, dict):
        judges = judges.get("judges", [])
    per_dim = {d: [] for d in DIMS}
    insuff_by_dim = {d: 0 for d in DIMS}
    extra = {}
    for j in judges:
        for s in j.get("scores", []):
            d = match_dim(s.get("dim"))
            if d not in per_dim:
                extra.setdefault(d, 0)
                extra[d] += 1
                continue
            if is_insufficient(s):
                insuff_by_dim[d] += 1
            else:
                per_dim[d].append(float(s["score"]))

    rows, insufficient_dims = [], []
    med_by_dim = {}
    wsum = wmax = 0.0
    for d in DIMS:
        scores = per_dim[d]
        w = weight(d)
        if not scores:
            insufficient_dims.append(d)
            rows.append({"dim": d, "median": None, "spread": None, "n_judges": 0,
                         "n_insufficient": insuff_by_dim[d], "weight": w,
                         "disagreement": False, "insufficient": True, "raw": []})
            continue
        med = statistics.median(scores)
        spread = max(scores) - min(scores)
        med_by_dim[d] = med
        wsum += med * w
        wmax += 5 * w
        rows.append({"dim": d, "median": round(med, 1), "spread": spread, "n_judges": len(scores),
                     "n_insufficient": insuff_by_dim[d], "weight": w,
                     "disagreement": spread >= 2, "insufficient": False, "raw": scores})

    pct = round(100 * wsum / wmax, 1) if wmax else 0
    verdict = C.verdict_for(pct)
    capped = False
    if verdict == "Go" and any(d in insufficient_dims for d in CORE_DIMS):
        verdict, capped = "Conditional", True

    out = {
        "weighted_pct": pct,
        "verdict": verdict,
        "verdict_capped": capped,
        "demand_state": demand_state(med_by_dim),
        "weighted_sum": round(wsum, 1),
        "weighted_max": round(wmax, 1),
        "n_judges": len(judges),
        "dimensions": sorted(rows, key=lambda r: r["weight"], reverse=True),
        "flags": [r["dim"] for r in rows if r["disagreement"]],
        "insufficient_dims": insufficient_dims,
        # any insufficient dimension lowers overall confidence by at least one level
        "confidence_cap": ("medium" if insufficient_dims else "high"),
    }
    if extra:
        out["unrecognized_dims"] = sorted(extra)
    return out


def main():
    ap = argparse.ArgumentParser(description="Aggregate multi-judge demand scorecards.")
    ap.add_argument("judges")
    ap.add_argument("--out", default="")
    a = ap.parse_args()

    out = aggregate(C.load_json(a.judges))
    print(json.dumps(out, ensure_ascii=False, indent=2))
    if a.out:
        C.write_json(a.out, out)
    if out["flags"]:
        C.warn("\nWARNING judges disagree (spread >= 2) on: " + ", ".join(out["flags"]) + "  -> flag in the report")
    if out["insufficient_dims"]:
        C.warn("WARNING no data, excluded from weighting: " + ", ".join(out["insufficient_dims"])
               + "  -> lower overall confidence and render as 'No data'")
    if out["verdict_capped"]:
        C.warn("NOTE verdict capped at Conditional: willingness_to_pay / market_size has no evidence")
    if out.get("unrecognized_dims"):
        C.warn("WARNING unrecognized dimension names ignored: " + ", ".join(out["unrecognized_dims"]))


if __name__ == "__main__":
    main()
