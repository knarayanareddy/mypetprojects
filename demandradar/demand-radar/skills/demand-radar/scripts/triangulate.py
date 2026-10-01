#!/usr/bin/env python3
"""Evidence triangulation: group evidence by signal, count independent platforms, grade confidence.

Why a script: "a signal needs >=2 independent sources" is a hard rule, so code enforces it and
the model cannot talk a single-source lead into a verified finding. The model does the semantic
work (tagging each evidence item with a `signal` label); this script does the counting.

Usage:
  python3 triangulate.py evidence.json [--out tri.json] [--gaps]

evidence.json:
  {"evidence": [
     {"id": "E1", "signal": "Notion is too complex", "platform": "HN",
      "source_type": "behavioral", "origin": "primary",
      "dims": ["pain_intensity", "current_alternatives"], "claims": ["H1"], "url": "..."},
     ...]}
  - origin is optional: primary (the person's own words / official data), secondary (a media
    retelling) or suspected-repost. Missing = primary.
  - dims is optional: which scorecard dimensions the item supports. --gaps uses it.

Platform normalisation: "HN", "Hacker News" and "news.ycombinator.com" count as ONE platform.
Unknown platform names are kept as-is and listed in `unrecognized_platforms` for review.

Grading (same as references/validation-framework.md, section C):
  1 source = lead  |  2 sources = medium  |  >=3 sources including hard evidence = high
  If every item for a signal is secondary / repost (no primary) the grade drops one level.

--gaps (deterministic gap check for the follow-up search loop):
  counts evidence / signals / platforms per scorecard dimension and lists dimensions with
  fewer than 2 evidence items. The script says WHAT is missing; you decide WHERE to look.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dr_common as C  # noqa: E402


def grade(platforms, has_hard, has_primary):
    n = len(platforms)
    g = "high" if (n >= 3 and has_hard) else "medium" if n >= 2 else "lead"
    return g if has_primary else C.downgrade(g)


def gaps_report(evidence):
    """Per-dimension evidence counts (deterministic). Items without dims go to `unlabeled_evidence`."""
    by_dim = {d: {"evidence": 0, "signals": set(), "platforms": set()} for d in C.DIMS}
    unlabeled = 0
    for e in evidence:
        dims = [C.match_dim(x) for x in (e.get("dims") or [])]
        if not dims:
            unlabeled += 1
            continue
        for d in dims:
            slot = by_dim.setdefault(d, {"evidence": 0, "signals": set(), "platforms": set()})
            slot["evidence"] += 1
            if e.get("signal"):
                slot["signals"].add(str(e["signal"]).strip())
            plat = C.norm_platform(e.get("platform"))
            if plat:
                slot["platforms"].add(plat)
    rows = {d: {"evidence": v["evidence"], "signals": len(v["signals"]), "platforms": len(v["platforms"])}
            for d, v in by_dim.items()}
    return {
        "per_dim": rows,
        "dims_lacking": [d for d in C.DIMS if rows.get(d, {}).get("evidence", 0) < 2],
        "unlabeled_evidence": unlabeled,
    }


def triangulate(evidence, with_gaps=False):
    unrecognized = set()
    groups = {}
    for e in evidence:
        sig = (e.get("signal") or "ungrouped").strip()
        g = groups.setdefault(sig, {"platforms": set(), "ids": [], "has_hard": False, "has_primary": False})
        plat = C.norm_platform(e.get("platform"), unrecognized)
        if plat:
            g["platforms"].add(plat)
        g["ids"].append(e.get("id"))
        if C.is_hard(e.get("source_type")):
            g["has_hard"] = True
        if C.is_primary(e.get("origin")):
            g["has_primary"] = True

    rows = []
    for sig, g in groups.items():
        plats = sorted(g["platforms"])
        rows.append({
            "signal": sig,
            "n_sources": len(plats),
            "platforms": plats,
            "has_hard_evidence": g["has_hard"],
            "all_secondhand": not g["has_primary"],
            "evidence_ids": g["ids"],
            "confidence": grade(plats, g["has_hard"], g["has_primary"]),
        })
    order = {"high": 0, "medium": 1, "lead": 2}
    rows.sort(key=lambda r: (-r["n_sources"], order[r["confidence"]]))

    out = {
        "total_signals": len(rows),
        "verified": [r for r in rows if r["confidence"] != "lead"],
        "leads_only": [r for r in rows if r["confidence"] == "lead"],
        "signals": rows,
        "unrecognized_platforms": sorted(unrecognized),
    }
    if with_gaps:
        out["gaps"] = gaps_report(evidence)
    return out


def main():
    ap = argparse.ArgumentParser(description="Triangulate evidence: >=2 independent sources = verified.")
    ap.add_argument("evidence")
    ap.add_argument("--out", default="", help="also write the result to this file")
    ap.add_argument("--gaps", action="store_true", help="add per-dimension evidence gaps (search loop)")
    a = ap.parse_args()

    data = C.load_json(a.evidence)
    ev = data.get("evidence", data if isinstance(data, list) else [])
    out = triangulate(ev, a.gaps)

    txt = json.dumps(out, ensure_ascii=False, indent=2)
    print(txt)
    if a.out:
        C.write_json(a.out, out)
    C.warn(f"\nverified signals: {len(out['verified'])}  |  single-source leads: {len(out['leads_only'])}")
    if out["unrecognized_platforms"]:
        C.warn("WARNING unrecognized platform names (same platform spelled differently?): "
               + ", ".join(out["unrecognized_platforms"]))
    if a.gaps and out["gaps"]["dims_lacking"]:
        C.warn("WARNING dimensions with <2 evidence items: " + ", ".join(out["gaps"]["dims_lacking"]))


if __name__ == "__main__":
    main()
