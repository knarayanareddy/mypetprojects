#!/usr/bin/env python3
"""Regression tests for the Demand Radar scripts. Standard library only; run directly:

  python3 scripts/tests/test_scripts.py

pytest also discovers the test_* functions if you have it. Network is never touched.

Covered:
  1  dimension aliases (English, upstream Chinese) map to canonical ids, weights survive
  2  platform names normalise, so one platform spelled two ways is not two sources
  3  score:null is "no data", never 0, and the dimension leaves the weighted total
  4  secondary / repost-only signals drop one confidence level
  5  --gaps counts evidence per dimension
  6  the verdict cannot be Go while willingness_to_pay / market_size has no evidence
  7  upstream Chinese vocabulary still works (older runs, other models)
  8  validate_artifacts catches the malformed JSON models actually produce
  9  report generator renders, --check catches dangling evidence ids, --run-dir fills data
 10  end-to-end CLI round trip on the bundled example
 11  helper scripts: init_run, fetch_url text extraction
"""
import importlib.util
import json
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(SCRIPTS / "connectors"))
EXAMPLE = SCRIPTS.parent / "examples" / "notion-lite"


def _load(name, folder=SCRIPTS):
    spec = importlib.util.spec_from_file_location(name, folder / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


C = _load("dr_common")
agg = _load("aggregate_scores")
tri = _load("triangulate")
gen = _load("generate_report")
val = _load("validate_artifacts")
fetch = _load("fetch_url", SCRIPTS / "connectors")


def run(script, *args):
    return subprocess.run([sys.executable, str(SCRIPTS / script), *map(str, args)],
                          capture_output=True, text=True)


# 1 ── dimensions ─────────────────────────────────────────────────────
def test_dimension_aliases_and_weights():
    assert C.match_dim("Willingness to pay") == "willingness_to_pay"
    assert C.match_dim("willingness-to-pay") == "willingness_to_pay"
    assert C.match_dim("Pain Intensity") == "pain_intensity"
    assert C.match_dim("Market size & trend") == "market_size"
    assert C.match_dim("Differentiation wedge") == "differentiation_wedge"
    assert C.match_dim("Prevalence / frequency") == "prevalence"
    assert C.match_dim("Current-alternative gap") == "current_alternatives"
    assert C.match_dim("Reachability") == "reachability"
    assert C.weight("willingness_to_pay") == 2.0 and C.weight("pain_intensity") == 1.5
    assert C.weight("market_size") == 1.0
    assert set(C.DIMS) == {C.match_dim(d) for d in C.DIMS}


# 2 ── platforms ──────────────────────────────────────────────────────
def test_platform_normalisation():
    unknown = set()
    assert C.norm_platform("Hacker News", unknown) == "HN"
    assert C.norm_platform("news.ycombinator.com", unknown) == "HN"
    assert C.norm_platform("Apple App Store reviews", unknown) == "App Store"
    assert C.norm_platform("twitter", unknown) == "X"
    assert C.norm_platform("Stack Overflow", unknown) == "Stack Overflow"
    assert not unknown
    C.norm_platform("Statista", unknown)
    assert unknown == {"Statista"}
    ev = [{"id": "1", "signal": "s", "platform": "HN"}, {"id": "2", "signal": "s", "platform": "Hacker News"}]
    assert tri.triangulate(ev)["signals"][0]["n_sources"] == 1


# 3 ── insufficient data ──────────────────────────────────────────────
def _card(judge, **scores):
    return {"judge": judge, "scores": [
        {"dim": d, "score": s, "evidence_ids": ["E1"] if s is not None else []} for d, s in scores.items()]}


FULL = dict(pain_intensity=4, prevalence=4, current_alternatives=4, willingness_to_pay=4,
            market_size=4, differentiation_wedge=4, reachability=4)


def test_insufficient_is_not_zero():
    assert C.is_insufficient({"score": None})
    assert C.is_insufficient({"score": 3, "insufficient": True})
    assert C.is_insufficient({"score": 3, "confidence": "no data"})
    assert not C.is_insufficient({"score": 0, "confidence": "high"})
    cards = [_card(f"j{i}", **{**FULL, "market_size": None}) for i in range(3)]
    out = agg.aggregate(cards)
    assert out["insufficient_dims"] == ["market_size"]
    assert out["weighted_pct"] == 80.0          # 4/5 everywhere, market excluded from both sides
    assert out["confidence_cap"] == "medium"


# 4 ── secondary downgrade ────────────────────────────────────────────
def test_secondary_downgrade():
    ev = [{"id": "1", "signal": "a", "platform": "HN", "origin": "secondary"},
          {"id": "2", "signal": "a", "platform": "Medium", "origin": "suspected-repost"},
          {"id": "3", "signal": "b", "platform": "HN"}, {"id": "4", "signal": "b", "platform": "Medium"}]
    rows = {r["signal"]: r for r in tri.triangulate(ev)["signals"]}
    assert rows["a"]["confidence"] == "lead" and rows["a"]["all_secondhand"]
    assert rows["b"]["confidence"] == "medium"


def test_high_needs_three_sources_and_hard_evidence():
    ev = [{"id": str(i), "signal": "s", "platform": p, "source_type": t}
          for i, (p, t) in enumerate([("HN", "behavioral"), ("G2", "behavioral"), ("Statista", "hard")])]
    assert tri.triangulate(ev)["signals"][0]["confidence"] == "high"
    ev[2]["source_type"] = "behavioral"
    assert tri.triangulate(ev)["signals"][0]["confidence"] == "medium"


# 5 ── gaps ───────────────────────────────────────────────────────────
def test_gaps_report():
    ev = [{"id": "1", "signal": "s", "platform": "HN", "dims": ["pain_intensity", "Willingness to pay"]},
          {"id": "2", "signal": "s", "platform": "G2", "dims": ["pain_intensity"]},
          {"id": "3", "signal": "t", "platform": "HN"}]
    g = tri.triangulate(ev, with_gaps=True)["gaps"]
    assert g["per_dim"]["pain_intensity"]["evidence"] == 2
    assert "pain_intensity" not in g["dims_lacking"] and "willingness_to_pay" in g["dims_lacking"]
    assert g["unlabeled_evidence"] == 1


# 6 ── verdict cap ────────────────────────────────────────────────────
def test_no_go_without_core_evidence():
    cards = [_card(f"j{i}", **{**FULL, "pain_intensity": 5, "willingness_to_pay": None}) for i in range(3)]
    out = agg.aggregate(cards)
    assert out["weighted_pct"] >= 70
    assert out["verdict"] == "Conditional" and out["verdict_capped"]
    out = agg.aggregate([_card(f"j{i}", **FULL) for i in range(3)])
    assert out["verdict"] == "Go" and not out["verdict_capped"]


def test_verdict_bands_and_disagreement():
    assert [C.verdict_for(p) for p in (95, 70, 69.9, 50, 49.9, 30, 29.9, 0)] == \
        ["Go", "Go", "Conditional", "Conditional", "Pivot", "Pivot", "No-go", "No-go"]
    cards = [_card("a", **{**FULL, "reachability": 5}), _card("b", **{**FULL, "reachability": 3}),
             _card("c", **{**FULL, "reachability": 1})]
    out = agg.aggregate(cards)
    assert out["flags"] == ["reachability"]


# 7 ── upstream Chinese vocabulary ────────────────────────────────────
def test_legacy_chinese_vocabulary():
    assert C.match_dim("付费意愿") == "willingness_to_pay"
    assert C.match_dim("竞争空白") == "differentiation_wedge"
    assert C.match_dim("现有替代方案缺口") == "current_alternatives"
    assert C.norm_verdict("有条件做") == "Conditional" and C.norm_verdict("别做") == "No-go"
    assert C.is_hard("硬") and C.is_primary("一手") and not C.is_primary("二手")
    assert C.norm_platform("知乎") == "知乎"
    ev = [{"id": "1", "signal": "s", "platform": "HN", "source_type": "硬", "origin": "一手"},
          {"id": "2", "signal": "s", "platform": "App Store 评论", "origin": "一手"},
          {"id": "3", "signal": "s", "platform": "小红书", "origin": "一手"}]
    assert tri.triangulate(ev)["signals"][0]["confidence"] == "high"


# 8 ── artifact validation ────────────────────────────────────────────
def test_validate_evidence_and_judges():
    errs, _ = val.check_evidence({"evidence": [
        {"id": "E1", "signal": "x", "platform": "HN", "source_type": "behavioral", "quote": "q", "url": "u"},
        {"id": "E1", "signal": "x", "platform": "HN", "source_type": "vibes", "quote": "q"}]})
    text = " | ".join(errs)
    assert "duplicate id" in text and "source_type" in text and "missing url" in text
    errs, _ = val.check_judges([{"judge": "j", "scores": [
        {"dim": "vibes", "score": 3}, {"dim": "pain_intensity", "score": 7, "evidence_ids": ["E1"]},
        {"dim": "reachability", "score": 0}]}])
    text = " | ".join(errs)
    assert "unknown dimension" in text and "0-5" in text and "use null" in text
    errs, _ = val.check_hypothesis({"idea": "x", "claims": [{"id": "H1"}]})
    assert errs


# 9 ── report generator ───────────────────────────────────────────────
def _make_run(tmp):
    tmp = Path(tmp)
    for f in ("hypothesis.json", "evidence.json", "report.json"):
        (tmp / f).write_text((EXAMPLE / f).read_text(encoding="utf-8"), encoding="utf-8")
    ev = C.load_json(EXAMPLE / "evidence.json")["evidence"]
    C.write_json(tmp / "tri.json", tri.triangulate(ev, True))
    C.write_json(tmp / "agg-initial.json", agg.aggregate(C.load_json(EXAMPLE / "judges-initial.json")))
    C.write_json(tmp / "agg-final.json", agg.aggregate(C.load_json(EXAMPLE / "judges.json")))
    return tmp


def test_report_render_and_autofill():
    with tempfile.TemporaryDirectory() as t:
        tmp = _make_run(t)
        out = tmp / "r.html"
        r = run("generate_report.py", "--report", tmp / "report.json", "--run-dir", tmp, "--output", out)
        assert r.returncode == 0, r.stderr
        html = out.read_text(encoding="utf-8")
        for needle in ("Pivot", "If you do one thing", "Willingness to pay", "Post red-team",
                       "What we could NOT verify", "lemomo-ai/demand-radar"):
            assert needle in html, needle
        assert "No data" in html            # market_size is insufficient, rendered as hatch, not 0
        assert "[run-dir] scorecard" in r.stderr and "[run-dir] signals" in r.stderr


def test_report_check_catches_dangling_ids():
    with tempfile.TemporaryDirectory() as t:
        tmp = _make_run(t)
        rep = C.load_json(tmp / "report.json")
        rep["why"][0]["evidence_ids"] = ["E999"]
        C.write_json(tmp / "bad.json", rep)
        r = run("generate_report.py", "--report", tmp / "bad.json", "--run-dir", tmp, "--check")
        assert r.returncode == 1 and "E999" in r.stderr
        ok = run("generate_report.py", "--report", tmp / "report.json", "--run-dir", tmp, "--check")
        assert ok.returncode == 0, ok.stderr


def test_report_localises_and_normalises():
    d = {"lang": "zh", "question": "q", "verdict": "有条件做", "verdict_sub": "判断",
         "signals": [{"signal": "s", "n_sources": 2, "platforms": ["HN", "G2"], "confidence": "medium"}]}
    d["verdict"] = C.norm_verdict(d["verdict"])
    html = gen.render(d)
    assert "Conditional" in html and "中" in html and 'lang="zh"' in html


# 10 ── CLI round trip ────────────────────────────────────────────────
def test_cli_round_trip():
    with tempfile.TemporaryDirectory() as t:
        out = Path(t) / "tri.json"
        r = run("triangulate.py", EXAMPLE / "evidence.json", "--gaps", "--out", out)
        assert r.returncode == 0 and C.load_json(out)["total_signals"] == 6
        r = run("aggregate_scores.py", EXAMPLE / "judges.json", "--out", Path(t) / "agg.json")
        assert r.returncode == 0
        a = C.load_json(Path(t) / "agg.json")
        assert a["verdict"] == "Pivot" and a["weighted_pct"] == 48.0 and "willingness_to_pay" in a["flags"]
        r = run("validate_artifacts.py", EXAMPLE)
        assert r.returncode == 0, r.stdout


# 11 ── helpers ───────────────────────────────────────────────────────
def test_init_run_and_fetch_parser():
    with tempfile.TemporaryDirectory() as t:
        r = run("init_run.py", "A simpler Notion for teams!", "--root", t)
        assert r.returncode == 0
        run_dir = Path(r.stdout.strip())
        assert run_dir.parent == Path(t).resolve() or run_dir.parent == Path(t)
        assert run_dir.name.startswith("a-simpler-notion-for-teams-")
        hyp = C.load_json(run_dir / "hypothesis.json")
        assert hyp["idea"] == "A simpler Notion for teams!" and len(hyp["claims"]) == 4
    p = fetch._Text()
    p.feed("<html><title>T</title><nav>menu</nav><script>x()</script><p>Hello <b>world</b></p></html>")
    text = "".join(p.parts)
    assert "Hello" in text and "world" in text and "menu" not in text and "x()" not in text and p.title == "T"


if __name__ == "__main__":
    fns = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_") and callable(f)]
    failed = 0
    for n, f in fns:
        try:
            f()
            print(f"PASS {n}")
        except Exception as e:  # report every failure, not just the first
            failed += 1
            print(f"FAIL {n}: {type(e).__name__}: {e}")
    print(f"\n{len(fns) - failed}/{len(fns)} passed")
    sys.exit(1 if failed else 0)
