#!/usr/bin/env python3
"""Shared vocabulary for Demand Radar scripts (standard library only).

One place defines the canonical English identifiers used in every JSON artifact:

  dimensions   pain_intensity, prevalence, current_alternatives, willingness_to_pay,
               market_size, differentiation_wedge, reachability
  verdicts     Go / Conditional / Pivot / No-go
  confidence   high / medium / lead         (signal level, from triangulation)
  source type  hard / behavioral / opinion / analyst
  origin       primary / secondary / suspected-repost

Everything also accepts the original upstream Chinese vocabulary (痛点强度, 有条件做, 硬, 一手 ...)
and common English spellings, so evidence or score files produced by any agent, model or
older run keep working. Output is always written in the canonical English form.
"""
import json
import os
import re
import sys

DIMS = [
    "pain_intensity",
    "prevalence",
    "current_alternatives",
    "willingness_to_pay",
    "market_size",
    "differentiation_wedge",
    "reachability",
]

DIM_LABELS = {
    "pain_intensity": "Pain intensity",
    "prevalence": "Prevalence / frequency",
    "current_alternatives": "Current-alternative gap",
    "willingness_to_pay": "Willingness to pay",
    "market_size": "Market size & trend",
    "differentiation_wedge": "Differentiation wedge",
    "reachability": "Reachability",
}

# The three dimensions that describe "is the demand itself real?"
DEMAND_DIMS = ["pain_intensity", "prevalence", "current_alternatives"]

WEIGHTS = {"willingness_to_pay": 2.0, "pain_intensity": 1.5}


def weight(dim):
    return WEIGHTS.get(dim, 1.0)


# alias (lower-case) -> canonical id. Includes upstream Chinese names.
_DIM_ALIASES = {
    # pain
    "pain_intensity": "pain_intensity", "pain intensity": "pain_intensity", "pain": "pain_intensity",
    "painkiller": "pain_intensity", "痛点强度": "pain_intensity", "痛点": "pain_intensity",
    # prevalence
    "prevalence": "prevalence", "frequency": "prevalence", "prevalence / frequency": "prevalence",
    "普遍性": "prevalence", "普遍": "prevalence", "频率": "prevalence",
    # alternatives gap
    "current_alternatives": "current_alternatives", "current alternatives": "current_alternatives",
    "current alternative": "current_alternatives", "current-alternative": "current_alternatives",
    "current-alternative gap": "current_alternatives", "alternative gap": "current_alternatives",
    "alternatives": "current_alternatives", "alternative": "current_alternatives",
    "workaround": "current_alternatives", "workarounds": "current_alternatives",
    "现有替代": "current_alternatives", "现有替代缺口": "current_alternatives",
    "现有替代方案": "current_alternatives", "替代缺口": "current_alternatives", "替代": "current_alternatives",
    # willingness to pay
    "willingness_to_pay": "willingness_to_pay", "willingness to pay": "willingness_to_pay",
    "willingness-to-pay": "willingness_to_pay", "wtp": "willingness_to_pay", "payment": "willingness_to_pay",
    "付费意愿": "willingness_to_pay", "付费": "willingness_to_pay",
    # market
    "market_size": "market_size", "market size": "market_size", "market": "market_size",
    "market size & trend": "market_size", "market size and trend": "market_size",
    "市场规模": "market_size", "市场规模+趋势": "market_size", "市场": "market_size",
    # wedge
    "differentiation_wedge": "differentiation_wedge", "differentiation wedge": "differentiation_wedge",
    "differentiation": "differentiation_wedge", "wedge": "differentiation_wedge",
    "competition": "differentiation_wedge", "whitespace": "differentiation_wedge",
    "差异化楔子": "differentiation_wedge", "差异化": "differentiation_wedge", "差异化空间": "differentiation_wedge",
    "楔子": "differentiation_wedge", "切口": "differentiation_wedge",
    "竞争空白": "differentiation_wedge", "竞争": "differentiation_wedge",
    # reach
    "reachability": "reachability", "reach": "reachability", "accessibility": "reachability",
    "可触达性": "reachability", "可触达": "reachability", "触达": "reachability",
}
_ALIAS_SUBSTR = sorted((k for k in _DIM_ALIASES if len(k) >= 2), key=len, reverse=True)


def match_dim(name):
    """Map any accepted spelling of a dimension to its canonical id (unknown names pass through)."""
    raw = (name or "").strip()
    if not raw:
        return raw
    low = " ".join(raw.lower().replace("_", " ").split())
    if raw in DIMS:
        return raw
    for cand in (raw, raw.lower(), low):
        if cand in _DIM_ALIASES:
            return _DIM_ALIASES[cand]
    for k in _ALIAS_SUBSTR:
        if k in raw or k in low:
            return _DIM_ALIASES[k]
    return raw


# ── verdicts ─────────────────────────────────────────────────────────

VERDICT_BANDS = [(70, "Go"), (50, "Conditional"), (30, "Pivot"), (0, "No-go")]


def verdict_for(pct):
    for floor, name in VERDICT_BANDS:
        if pct >= floor:
            return name
    return "No-go"


_VERDICT_ALIASES = {
    "go": "Go", "可以做": "Go",
    "conditional": "Conditional", "conditional go": "Conditional", "conditional-go": "Conditional",
    "有条件做": "Conditional",
    "pivot": "Pivot", "转向": "Pivot",
    "no-go": "No-go", "no go": "No-go", "nogo": "No-go", "don't build": "No-go", "别做": "No-go",
}


def norm_verdict(v):
    return _VERDICT_ALIASES.get(str(v or "").strip().lower(), str(v or "").strip())


# ── small enums ──────────────────────────────────────────────────────

_CONF = {"high": "high", "高": "high", "medium": "medium", "mid": "medium", "中": "medium",
         "lead": "lead", "low": "lead", "线索": "lead"}


def norm_confidence(c):
    return _CONF.get(str(c or "").strip().lower(), "lead")


def downgrade(c):
    return {"high": "medium", "medium": "lead", "lead": "lead"}[c]


_PRIMARY = {"", "primary", "firsthand", "first-hand", "first hand", "official", "一手", "官方"}


def is_primary(origin):
    return str(origin or "").strip().lower() in _PRIMARY


def is_hard(source_type):
    return str(source_type or "").strip().lower() in {"hard", "硬"}


INSUFFICIENT_MARKS = {"insufficient", "insufficient data", "no data", "n/a", "na", "数据不足"}


def is_insufficient(entry):
    """True when a judge did not score a dimension (null score / flagged insufficient)."""
    if entry.get("insufficient"):
        return True
    if entry.get("score") is None:
        return True
    return str(entry.get("confidence") or "").strip().lower() in INSUFFICIENT_MARKS


# ── platforms ────────────────────────────────────────────────────────
# alias (lower-case) -> canonical platform. Aliases of >=2 chars also match as substrings
# (longest first); single-character aliases such as "x" match exactly only.

PLATFORM_ALIASES = {
    "hn": "HN", "hackernews": "HN", "hacker news": "HN", "news.ycombinator": "HN",
    "ycombinator": "HN", "algolia": "HN",
    "app store": "App Store", "appstore": "App Store", "itunes": "App Store",
    "apple app store": "App Store", "ios": "App Store", "应用商店": "App Store",
    "google play": "Google Play", "googleplay": "Google Play", "play store": "Google Play",
    "reddit": "Reddit",
    "product hunt": "Product Hunt", "producthunt": "Product Hunt",
    "x": "X", "twitter": "X", "推特": "X",
    "mastodon": "Mastodon", "bluesky": "Bluesky", "bsky": "Bluesky",
    "lobsters": "Lobsters", "lobste.rs": "Lobsters",
    "stack overflow": "Stack Overflow", "stackoverflow": "Stack Overflow",
    "stack exchange": "Stack Exchange", "stackexchange": "Stack Exchange",
    "github": "GitHub", "gitlab": "GitLab",
    "dev.to": "DEV", "discord": "Discord", "slack": "Slack", "discourse": "Discourse",
    "linkedin": "LinkedIn", "quora": "Quora",
    "youtube": "YouTube", "medium": "Medium", "substack": "Substack",
    "g2": "G2", "capterra": "Capterra", "trustpilot": "Trustpilot",
    "google trends": "Google Trends", "wikipedia": "Wikipedia",
    "小红书": "小红书", "xiaohongshu": "小红书", "rednote": "小红书",
    "知乎": "知乎", "zhihu": "知乎", "微博": "微博", "weibo": "微博",
    "b站": "B站", "bilibili": "B站", "v2ex": "V2EX", "即刻": "即刻",
    "百度贴吧": "百度贴吧", "贴吧": "百度贴吧", "tieba": "百度贴吧",
    "app annie": "data.ai", "data.ai": "data.ai", "sensor tower": "Sensor Tower",
    "searxng": "Web search", "web search": "Web search",
}
_PLAT_SUBSTR = sorted((k for k in PLATFORM_ALIASES if len(k) >= 2), key=len, reverse=True)


def norm_platform(name, unrecognized=None):
    raw = (name or "").strip()
    if not raw:
        return ""
    low = " ".join(raw.lower().split())
    if low in PLATFORM_ALIASES:
        return PLATFORM_ALIASES[low]
    for k in _PLAT_SUBSTR:
        if k in low:
            return PLATFORM_ALIASES[k]
    if unrecognized is not None:
        unrecognized.add(raw)
    return raw


# ── io helpers ───────────────────────────────────────────────────────

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, obj):
    d = os.path.dirname(os.path.abspath(path))
    os.makedirs(d, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False, indent=2))


def warn(msg):
    print(msg, file=sys.stderr)


def slugify(text, maxlen=48):
    s = re.sub(r"[^a-zA-Z0-9]+", "-", str(text or "").lower()).strip("-")
    return (s or "demand")[:maxlen].strip("-") or "demand"
