#!/usr/bin/env python3
"""Validate the JSON artifacts of a run BEFORE feeding them to the other scripts.

Smaller or cheaper models sometimes emit almost-right JSON (missing ids, free-form platform
names, an invented dimension, a 0 where there was no data). This catches those problems early
with messages an agent can act on. Exit code 1 on hard errors, 0 otherwise.

Usage:
  python3 validate_artifacts.py RUN_DIR            # checks every artifact that exists
  python3 validate_artifacts.py --file evidence.json --kind evidence|judges|hypothesis
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dr_common as C  # noqa: E402

SOURCE_TYPES = {"hard", "behavioral", "opinion", "analyst"}
ORIGINS = {"primary", "secondary", "suspected-repost"}
_ST_ALIASES = {"硬": "hard", "行为": "behavioral", "意见": "opinion", "分析师": "analyst",
               "behavioural": "behavioral"}
_OR_ALIASES = {"一手": "primary", "二手": "secondary", "疑似转载": "suspected-repost",
               "repost": "suspected-repost", "suspected repost": "suspected-repost"}


def check_hypothesis(d):
    errs, warns = [], []
    for k in ("idea", "icp", "job", "current_workaround", "demand_type", "market", "claims"):
        if not d.get(k):
            (errs if k in ("idea", "claims") else warns).append(f"hypothesis: '{k}' is empty")
    claims = d.get("claims") or []
    if isinstance(claims, list):
        if not 2 <= len(claims) <= 4:
            warns.append(f"hypothesis: expected 2-4 sub-claims, found {len(claims)}")
        for c in claims:
            if not isinstance(c, dict) or not c.get("id") or not c.get("statement"):
                errs.append("hypothesis: every claim needs 'id' and 'statement'")
            elif not c.get("go_criterion"):
                warns.append(f"hypothesis: claim {c.get('id')} has no go_criterion (falsifiability test)")
    return errs, warns


def check_evidence(d):
    errs, warns = [], []
    ev = d.get("evidence", d if isinstance(d, list) else [])
    if not ev:
        return ["evidence: no items"], []
    seen, unknown_plat = set(), set()
    for i, e in enumerate(ev):
        tag = f"evidence[{i}] ({e.get('id', '?')})"
        eid = e.get("id")
        if not eid:
            errs.append(f"{tag}: missing id")
        elif eid in seen:
            errs.append(f"{tag}: duplicate id")
        seen.add(eid)
        for k in ("signal", "platform"):
            if not e.get(k):
                errs.append(f"{tag}: missing {k}")
        if not (e.get("url") or e.get("source_ref")):
            errs.append(f"{tag}: missing url (no source, no claim)")
        if not (e.get("quote") or e.get("claim")):
            errs.append(f"{tag}: needs a quote or a claim")
        st = str(e.get("source_type", "")).strip().lower()
        st = _ST_ALIASES.get(st, st)
        if st not in SOURCE_TYPES:
            errs.append(f"{tag}: source_type '{e.get('source_type')}' must be one of {sorted(SOURCE_TYPES)}")
        org = str(e.get("origin", "primary")).strip().lower()
        org = _OR_ALIASES.get(org, org)
        if org not in ORIGINS:
            warns.append(f"{tag}: origin '{e.get('origin')}' should be one of {sorted(ORIGINS)}")
        for dm in e.get("dims") or []:
            if C.match_dim(dm) not in C.DIMS:
                warns.append(f"{tag}: unknown dimension '{dm}' (valid: {', '.join(C.DIMS)})")
        if e.get("platform"):
            C.norm_platform(e["platform"], unknown_plat)
        if not e.get("date"):
            warns.append(f"{tag}: no date")
    if unknown_plat:
        warns.append("evidence: platform names outside the vocabulary (fine for publishers such as Statista; "
                     "otherwise check spelling / same platform written two ways?): "
                     + ", ".join(sorted(unknown_plat)))
    return errs, warns


def check_judges(d):
    errs, warns = [], []
    judges = d.get("judges", d) if isinstance(d, dict) else d
    if not isinstance(judges, list) or not judges:
        return ["judges: expected a non-empty list of judge scorecards"], []
    if len(judges) < 3:
        warns.append(f"judges: {len(judges)} judge(s); the method expects 3 (optimist, strict, neutral)")
    for j in judges:
        name = j.get("judge", "?")
        seen = set()
        for s in j.get("scores", []):
            dim = C.match_dim(s.get("dim"))
            if dim not in C.DIMS:
                errs.append(f"judge {name}: unknown dimension '{s.get('dim')}'")
                continue
            seen.add(dim)
            sc = s.get("score")
            if sc is not None and not (isinstance(sc, (int, float)) and 0 <= sc <= 5):
                errs.append(f"judge {name}/{dim}: score must be 0-5 or null, got {sc!r}")
            if sc is not None and not s.get("evidence_ids"):
                warns.append(f"judge {name}/{dim}: scored {sc} without evidence_ids (score only what you can cite)")
            if sc == 0 and not s.get("evidence_ids"):
                errs.append(f"judge {name}/{dim}: 0 without evidence; use null for 'no data'")
        missing = [d_ for d_ in C.DIMS if d_ not in seen]
        if missing:
            warns.append(f"judge {name}: missing dimensions {missing}")
    return errs, warns


CHECKERS = {"hypothesis": check_hypothesis, "evidence": check_evidence, "judges": check_judges}
FILES = {"hypothesis.json": "hypothesis", "evidence.json": "evidence",
         "judges-initial.json": "judges", "judges.json": "judges"}


def main():
    ap = argparse.ArgumentParser(description="Validate Demand Radar run artifacts.")
    ap.add_argument("run_dir", nargs="?", default="")
    ap.add_argument("--file", default="")
    ap.add_argument("--kind", default="", choices=["", *CHECKERS])
    a = ap.parse_args()

    targets = []
    if a.file:
        kind = a.kind or FILES.get(os.path.basename(a.file), "")
        if not kind:
            ap.error("--kind is required when the file name is not hypothesis/evidence/judges.json")
        targets.append((a.file, kind))
    elif a.run_dir:
        for fn, kind in FILES.items():
            p = os.path.join(a.run_dir, fn)
            if os.path.exists(p):
                targets.append((p, kind))
    else:
        ap.error("give RUN_DIR or --file")
    if not targets:
        print("nothing to validate yet")
        return

    total_err = 0
    for path, kind in targets:
        try:
            data = C.load_json(path)
        except Exception as ex:  # malformed JSON is the most common failure
            print(f"ERROR {path}: not valid JSON ({ex})")
            total_err += 1
            continue
        errs, warns = CHECKERS[kind](data)
        for w in warns:
            print(f"WARNING {w}")
        for e in errs:
            print(f"ERROR {e}")
        print(f"{os.path.basename(path)}: {len(errs)} error(s), {len(warns)} warning(s)")
        total_err += len(errs)
    sys.exit(1 if total_err else 0)


if __name__ == "__main__":
    main()
