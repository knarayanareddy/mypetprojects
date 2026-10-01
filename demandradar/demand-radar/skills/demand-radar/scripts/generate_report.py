#!/usr/bin/env python3
"""Demand Radar report generator: structured report.json -> self-contained dashboard HTML.

Adapted from lemomo-ai/demand-radar (CC BY-NC 4.0). Standard library only; the output is a
single offline-capable HTML file, so it works the same under any agent host.

Layout (single-column reading flow, five sections, three information layers):
  Decision   01 Verdict  decision card: judgement line + verdict + scale + red-team delta +
                         sub-claim grid, then the full-width "If you do one thing" banner
  Argument   02 Why      ruling paragraph + plus/minus ledger + watch bar
             03 Actions  numbered Do list (priority, "fixes: <axis> score") | Don't red lines
             04 Scores   7-axis bars (weight / judge disagreement / red-team delta / no-data
                         hatch) + risk rows
  Archive    05 Sources  voices / reconciliation & red team / competitors / signal matrix /
                         go-criteria / method & full evidence (collapsed), then the
                         "What we could NOT verify" box (never collapsed)

Colour budget: verdict colour only on the verdict word / scale / ruling rule; signal green only
for the brand and `one_thing`; red only for lethal / no-go / refuted.

Report language follows report.json "lang" ("en" default, or "zh"); single language, no mixing.
Fields over the length limits in references/report-template.md are warned on stderr (never
truncated: rewrite the copy instead).

Usage:
  python3 generate_report.py --report report.json --output report.html [--open]
  python3 generate_report.py --report report.json --run-dir RUN_DIR --check     # validate only
  python3 generate_report.py --report report.json --run-dir RUN_DIR --output report.html

--run-dir fills the data fields from the run directory (the model writes semantic fields, the
script owns the maths):
  scorecard      <- agg-final.json dimensions (delta = final median - initial median)
  weighted_pct / verdict <- agg-final.json (reconciled and warned if report.json disagrees)
  score_history  <- agg-initial.json + agg-final.json weighted_pct
  signals        <- tri.json signals (all high/medium, leads topped up to 12 rows)
  evidence       <- evidence.json
  Fields already present in report.json are never overwritten.
--check validates required fields, evidence_ids integrity, dimension names and length limits;
  exit code 1 on hard errors.
"""
import sys, json, argparse, re, html, datetime, webbrowser, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dr_common as C

VCOLOR = {
    "Go": "#1E8C5A", "可以做": "#1E8C5A",
    "有条件做": "#B07C32", "Conditional": "#B07C32", "Conditional Go": "#B07C32",
    "转向": "#C0673A", "Pivot": "#C0673A",
    "别做": "#B0463B", "No-go": "#B0463B", "No-Go": "#B0463B", "Don't build": "#B0463B",
}
_VKEY = {"Go": "go", "可以做": "go", "有条件做": "cond", "Conditional": "cond",
         "Conditional Go": "cond", "转向": "pivot", "Pivot": "pivot",
         "别做": "nogo", "No-go": "nogo", "No-Go": "nogo", "Don't build": "nogo"}
SRC_COLOR = {"硬": "#0E8C63", "行为": "#5C7184", "意见": "#888E96", "分析师": "#B07C32",
             "hard": "#0E8C63", "behavioral": "#5C7184", "opinion": "#888E96", "analyst": "#B07C32"}
PRIO = {"高": "high", "中": "mid", "低": "low",
        "high": "high", "medium": "mid", "low": "low",
        "High": "high", "Medium": "mid", "Low": "low"}

# canonical 7 维 + 分类（0 需求真实性 / 1 商业潜力 / 2 竞争格局）
DIM_CAT = {"痛点强度": 0, "普遍性": 0, "现有替代": 0,
           "付费意愿": 1, "市场规模": 1, "差异化楔子": 2, "可触达性": 2}
DIM_ORDER = ["痛点强度", "普遍性", "现有替代", "付费意愿", "市场规模", "差异化楔子", "可触达性"]
DIM_EN = {"痛点强度": "Pain intensity", "普遍性": "Prevalence", "现有替代": "Alternative gap",
          "付费意愿": "Willingness to pay", "市场规模": "Market size", "差异化楔子": "Differentiation wedge",
          "可触达性": "Reachability"}
_DIM_ALIASES = {"pain_intensity": "痛点强度", "current_alternatives": "现有替代", "willingness_to_pay": "付费意愿", "market_size": "市场规模", "differentiation_wedge": "差异化楔子", "reachability": "可触达性", "pain": "痛点强度", "prevalence": "普遍性", "frequency": "普遍性",
                "alternative": "现有替代", "workaround": "现有替代",
                "willingness": "付费意愿", "wtp": "付费意愿", "pay": "付费意愿",
                "market": "市场规模", "wedge": "差异化楔子", "differentiation": "差异化楔子",
                "competition": "差异化楔子", "reach": "可触达性",
                "竞争": "差异化楔子", "楔子": "差异化楔子", "替代": "现有替代", "痛点": "痛点强度",
                "普遍": "普遍性", "付费": "付费意愿", "市场": "市场规模", "触达": "可触达性"}

CLAIM_STATUS = {  # 子断言三态 -> css key
    "成立": "good", "supported": "good", "holds": "good",
    "存疑": "warn", "uncertain": "warn", "unclear": "warn",
    "被证伪": "bad", "refuted": "bad", "killed": "bad",
}
GO_MET = {"yes": "good", "no": "bad", "partial": "warn",
          "达成": "good", "未达成": "bad", "部分达成": "warn",
          True: "good", False: "bad"}
RISK_SEV = {"高": "high", "high": "high", "中": "mid", "medium": "mid",
            "低": "low", "low": "low"}
CONF_CLASS = {"高": "conf-high", "high": "conf-high", "中": "conf-mid", "medium": "conf-mid",
              "线索": "conf-lead", "lead": "conf-lead"}
LEAN_CLASS = {"for": "lean-for", "against": "lean-against", "mix": "lean-mix",
              "支撑": "lean-for", "反对": "lean-against", "矛盾": "lean-mix", "褒贬不一": "lean-mix"}
TAG_KIND = {"good": "pill-good", "bad": "pill-bad", "warn": "pill-warn", "neutral": ""}
_LETHAL_RE = re.compile(r"\s*[·•]?\s*(致命|lethal)\s*$", re.I)

# 长度铁律（report-template.md）：(zh 字数, en 字符数)
LIMITS = {"verdict_sub": (26, 80), "verdict_sub2": (120, 360),
          "why.title": (14, 42), "why.body": (60, 180),
          "one_thing.detail": (80, 240), "actions.detail": (80, 240),
          "do_not.reason": (40, 120)}

STR = {
    "zh": {"product": "需求验证", "confidence": "置信度",
           "nav": {"verdict": "结论", "why": "为什么", "actions": "怎么做",
                   "scores": "评分", "archive": "依据"},
           "sec_tag": {"verdict": "结论", "why": "为什么", "actions": "该怎么做",
                       "scores": "评分卡", "archive": "依据"},
           "sec_h": {"why": "判词", "actions": "行动清单", "scores": "7 维终评", "archive": "证据档案"},
           "sec_hint": {"why": "一段话说清需求处于什么状态，往哪个方向才成立。",
                        "actions": "每条都带判据和时限；「治」标注它修复的低分维度。",
                        "scores": "红队闭环后的终评。Δ 是红队把分数打掉的量；⚠ 表示评委分歧 ≥2 分。",
                        "archive": "上面每条结论的来路。默认折叠，按需展开。"},
           "you_asked": "你问的需求", "weighted": "/100 加权得分（付费意愿 ×2）",
           "vtag": {"go": "可以进入下一步", "cond": "先拆雷再上", "pivot": "换个打法再来", "nogo": "证据不支持，省下时间"},
           "bands": ["别做", "转向", "有条件", "可以做"],
           "scale_note": "{pct} 分落在 {lo}–{hi} {band}区间",
           "one_thing": "如果只做一件事",
           "ledger_plus": "+ 什么在加分 · {n} 条", "ledger_minus": "− 什么在减分 · {n} 条",
           "imb_minus": "证据失衡：减分压过加分", "imb_plus": "证据失衡：加分压过减分",
           "lethal": "致命", "watch": "~ 注意",
           "do_head": "该做", "dont_head": "别做", "fixes": "治",
           "cats": ["需求真实性", "商业潜力", "竞争格局"],
           "insufficient": "数据不足", "disagree_tip": "评委分歧 ≥2 分，证据不够清晰",
           "legend": ["■ 绿 ≥3.5 · 黄 2.5–3.4 · 红 <2.5", "斜纹 = 数据不足，不按 0 分计"],
           "legend_pct": "加权后 {pct}/100",
           "arch": {"voices": ("各方声音", "{n} 类来源 · 谁在说什么"),
                    "duo": ("对账与红队", "双支柱是否一致 · 红队打掉了什么"),
                    "comp": ("竞品与替代方案", "{a} 家竞品 · {b} 种凑合方案"),
                    "signals": ("信号矩阵", "≥2 独立源才算验证 · {n} 个信号"),
                    "go": ("Go 判据回评", "框定时定的 {n} 条判据 · {met}"),
                    "method": ("方法与全量证据", "{agents} 个 agent · {ev} 条证据 · {rounds} 轮搜索")},
           "go_met_all": "全部达成", "go_met_none": "都未达成", "go_met_some": "达成 {x}/{n}",
           "met_label": {"good": "达成", "bad": "未达成", "warn": "部分达成"},
           "contra": "上下证据对账", "redteam": "红队最致命弱点",
           "comp_cols": ["竞品", "模式", "定价", "评分", "最大差评"],
           "alt_cols": ["用户现在怎么凑合", "缺口 / 机会点"],
           "sig_cols": ["信号", "独立源", "平台", "硬证据", "置信度"],
           "sig_conf": {"high": "高", "medium": "中", "lead": "线索"},
           "go_cols": ["判据", "结果", "说明"],
           "lean": {"for": "倾向支撑", "against": "倾向反对", "mix": "褒贬不一"},
           "st_agents": "采集/评审 agent", "st_ev": "证据条数", "st_sig": "已验证信号", "st_round": "搜索轮次",
           "flow": "流程", "sources": "数据源",
           "default_flow": "框定(子断言) → 选源 → 多 agent 并行采集 → 三角验证(≥2源) → 3 评委人设独立打分 → 红队证伪 → 评委重评 → 报告",
           "notverified": "我们没能验证的部分",
           "foot": "每条结论可在「依据」里溯源",
           "hist_delta": "Δ", "title": "Demand Radar · 需求验证报告"},
    "en": {"product": "Demand validation", "confidence": "Confidence",
           "nav": {"verdict": "Verdict", "why": "Why", "actions": "What to do",
                   "scores": "Scores", "archive": "Sources"},
           "sec_tag": {"verdict": "Verdict", "why": "Why", "actions": "What to do",
                       "scores": "Scorecard", "archive": "Sources"},
           "sec_h": {"why": "The ruling", "actions": "Action list", "scores": "7-axis final scores",
                     "archive": "Evidence archive"},
           "sec_hint": {"why": "One paragraph on where this demand stands, and which direction makes it work.",
                        "actions": "Every item carries a pass/fail test and a time box; “fixes” names the weak axis it repairs.",
                        "scores": "Post red-team finals. Δ is what the red team took off; ⚠ marks judge disagreement ≥2.",
                        "archive": "Where every claim above comes from. Collapsed by default."},
           "you_asked": "Your demand", "weighted": "/100 weighted (willingness-to-pay ×2)",
           "vtag": {"go": "Cleared to proceed", "cond": "Defuse the blocker first",
                    "pivot": "Same pain, different play", "nogo": "Evidence says pass"},
           "bands": ["No-go", "Pivot", "Conditional", "Go"],
           "scale_note": "{pct} falls in the {lo}–{hi} {band} band",
           "one_thing": "If you do one thing",
           "ledger_plus": "+ What lifts the score · {n}", "ledger_minus": "− What drags it · {n}",
           "imb_minus": "Imbalance: minuses outweigh pluses", "imb_plus": "Imbalance: pluses outweigh minuses",
           "lethal": "LETHAL", "watch": "~ Watch",
           "do_head": "Do", "dont_head": "Don't", "fixes": "fixes",
           "cats": ["Demand reality", "Business potential", "Landscape"],
           "insufficient": "No data", "disagree_tip": "Judges disagree by ≥2 — evidence unclear",
           "legend": ["■ green ≥3.5 · amber 2.5–3.4 · red <2.5", "hatch = no data, not scored as 0"],
           "legend_pct": "weighted {pct}/100",
           "arch": {"voices": ("Voices by domain", "{n} source domains · who says what"),
                    "duo": ("Reconciliation & red team", "Do the two pillars agree · what the red team killed"),
                    "comp": ("Competitors & alternatives", "{a} competitors · {b} workarounds"),
                    "signals": ("Signal matrix", "Verified only at ≥2 independent sources · {n} signals"),
                    "go": ("Go criteria review", "{n} criteria set at framing · {met}"),
                    "method": ("Method & full evidence", "{agents} agents · {ev} evidence items · {rounds} rounds")},
           "go_met_all": "all met", "go_met_none": "none met", "go_met_some": "{x}/{n} met",
           "met_label": {"good": "Met", "bad": "Not met", "warn": "Partial"},
           "contra": "Two-pillar reconciliation", "redteam": "Red team's most lethal flaw",
           "comp_cols": ["Competitor", "Model", "Pricing", "Rating", "Top complaint"],
           "alt_cols": ["How users cope today", "Gap / opportunity"],
           "sig_cols": ["Signal", "Sources", "Platforms", "Hard", "Confidence"],
           "sig_conf": {"high": "high", "medium": "medium", "lead": "lead"},
           "go_cols": ["Criterion", "Result", "Note"],
           "lean": {"for": "supports", "against": "against", "mix": "mixed"},
           "st_agents": "collector/judge agents", "st_ev": "evidence items", "st_sig": "verified signals", "st_round": "search rounds",
           "flow": "Flow", "sources": "Sources",
           "default_flow": "Frame(sub-claims) → source → parallel collectors → triangulate(≥2) → 3 judge personas → red-team → re-judge → report",
           "notverified": "What we could NOT verify",
           "foot": "Every claim is traceable in “Sources”",
           "hist_delta": "Δ", "title": "Demand Radar · Validation report"},
}

SEC_IDS = ["verdict", "why", "actions", "scores", "archive"]


def esc(s):
    return html.escape(str(s) if s is not None else "")


def fmt_num(n):
    """55.0 -> 55；40.5 保留一位。"""
    try:
        f = float(n)
        return int(f) if f.is_integer() else round(f, 1)
    except (TypeError, ValueError):
        return n


def inline(s):
    s = esc(s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    return s


def verdict_color(v):
    v = (v or "").strip()
    if v in VCOLOR:
        return VCOLOR[v]
    for k, c in VCOLOR.items():
        if k and (k in v or v in k):
            return c
    return "#847F72"


def verdict_key(v):
    v = (v or "").strip()
    if v in _VKEY:
        return _VKEY[v]
    for k, key in _VKEY.items():
        if k and (k in v or v in k):
            return key
    return ""


def dim_key(name):
    """把 scorecard 的 dim 名归一到 canonical 中文维名（分类和排序用）。"""
    name = (name or "").strip()
    if name in DIM_CAT:
        return name
    low = name.lower()
    for k in sorted(_DIM_ALIASES, key=len, reverse=True):
        if k in name or k in low:
            return _DIM_ALIASES[k]
    return name


def dim_label(canon, raw, lang):
    if lang == "en":
        return DIM_EN.get(canon, raw or canon)
    return canon if canon in DIM_CAT else (raw or canon)


def bar_class(ratio):
    if ratio >= 0.7:
        return "f-good"
    if ratio >= 0.5:
        return "f-mid"
    return "f-low"


def _ic(paths, sw="1.8"):
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round">{paths}</svg>')


ICON = {
    "check": _ic('<path d="M20 6 9 17l-5-5"/>', "2.4"),
    "cross": _ic('<path d="M18 6 6 18M6 6l12 12"/>', "2.4"),
    "tilde": _ic('<path d="M4 13c2-3.5 4-3.5 6 0s4 3.5 6 0 3-2.5 4-1"/>', "2.4"),
    "star": _ic('<path d="M11.5 2.3a.5.5 0 0 1 1 0l2.3 4.7a2 2 0 0 0 1.6 1.1l5.2.8a.5.5 0 0 1 .3.9l-3.7 3.6a2 2 0 0 0-.6 1.9l.9 5.1a.5.5 0 0 1-.8.6l-4.6-2.4a2 2 0 0 0-2 0L6.4 21a.5.5 0 0 1-.8-.6l.9-5.1a2 2 0 0 0-.6-1.9L2.2 9.8a.5.5 0 0 1 .3-.9l5.2-.8a2 2 0 0 0 1.6-1.1z"/>'),
}
STATUS_ICON = {"good": ICON["check"], "bad": ICON["cross"], "warn": ICON["tilde"]}

BRAND_SVG = ('<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">'
             '<circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="1.4" opacity="0.3"/>'
             '<circle cx="16" cy="16" r="8" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>'
             '<circle cx="16" cy="16" r="2.6" fill="currentColor"/>'
             '<path d="M16 16 L27 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
             '<path d="M16 3 L16 7 M16 25 L16 29 M3 16 L7 16 M25 16 L29 16" stroke="currentColor" stroke-width="1.2" opacity="0.55"/></svg>')


def split_lethal(title):
    """「买家错配 · 致命」/ "Buyer mismatch · lethal" -> (标题, 是否致命)。"""
    t = str(title or "")
    m = _LETHAL_RE.search(t)
    if m:
        return t[:m.start()].rstrip(" ·•"), True
    return t, False


# ── 区块渲染（缺数据自动跳过） ───────────────────────────────────────

def render_topbar(d, L, secs, ts):
    q = esc(d.get("question", ""))
    date = ts.split(" ")[0]
    nav = "".join(f'<a href="#{sid}">{i + 1:02d} {esc(L["nav"][sid])}</a>'
                  for i, (sid, _) in enumerate(secs))
    pct = d.get("weighted_pct")
    chip_txt = esc(d.get("verdict", "—")) + (f" · {fmt_num(pct)}" if pct is not None else "")
    return (f'<div class="topbar"><div class="wrap topbar-in">'
            f'<div class="brand">{BRAND_SVG}Demand&nbsp;<span class="g">Radar</span></div>'
            f'<div class="tb-q">{q}{" · " + date if q else date}</div>'
            f'<nav class="tb-nav">{nav}</nav>'
            f'<span class="tb-verdict">{chip_txt}</span></div></div>')


def render_scale(d, L):
    pct = d.get("weighted_pct")
    if pct is None:
        return ""
    bands = [(L["bands"][0], 3, 0, 30), (L["bands"][1], 2, 30, 50),
             (L["bands"][2], 2, 50, 70), (L["bands"][3], 3, 70, 100)]
    spans, note = "", ""
    for lab, fl, lo, hi in bands:
        on = (lo <= pct < hi) or (hi == 100 and pct >= 70)
        if on:
            note = L["scale_note"].format(pct=fmt_num(pct), lo=lo, hi=hi, band=lab)
        cls = ' class="on"' if on else ""
        spans += f'<span style="flex:{fl}"{cls}>{esc(lab)}</span>'
    left = max(0, min(100, pct))
    return (f'<div class="scale"><div class="scale-track">{spans}'
            f'<div class="scale-needle" style="left:{left}%"></div></div>'
            f'<div class="scale-note">{esc(note)}</div></div>')


def render_hist(d, L):
    hist = [h for h in d.get("score_history", []) if h.get("pct") is not None]
    if len(hist) < 2:
        return ""
    parts = " → ".join(f'{esc(h.get("stage", ""))} {fmt_num(h["pct"])}' for h in hist)
    delta = round(hist[-1]["pct"] - hist[0]["pct"], 1)
    dcls = "vn-neg" if delta < 0 else "vn-pos" if delta > 0 else ""
    chip = f' <span class="{dcls}">{L["hist_delta"]} {"+" if delta > 0 else ""}{fmt_num(delta)}</span>' if delta else ""
    return f"<span>{parts}{chip}</span>"


def render_claims(d, L):
    claims = d.get("claims", [])
    if not claims:
        return ""
    cells = ""
    for c in claims:
        st = str(c.get("status", "")).strip()
        key = CLAIM_STATUS.get(st) or CLAIM_STATUS.get(st.lower()) or "warn"
        note = f'<div class="claim-note">{inline(c.get("note", ""))}</div>' if c.get("note") else ""
        cells += (f'<div class="claim{" claim-bad" if key == "bad" else ""}">'
                  f'<div class="claim-head">{esc(c.get("id", ""))}'
                  f'<span class="claim-status st-{key}">{STATUS_ICON[key]}{esc(st)}</span></div>'
                  f'<div class="claim-title">{inline(c.get("title", ""))}</div>{note}</div>')
    return f'<div class="claims" style="--n:{len(claims)}">{cells}</div>'


def render_hero(d, L):
    meta = esc(L["product"])
    if d.get("confidence"):
        meta += f' · {esc(L["confidence"])} {esc(d["confidence"])}'
    q = ""
    if d.get("question"):
        one = inline(d.get("one_liner", "")) if d.get("one_liner") else ""
        q = f'<div class="hero-q"><b>{esc(d["question"])}</b>{one}</div>'
    statement = d.get("verdict_sub") or d.get("one_liner") or ""
    stmt = f'<h1 class="hero-statement">{inline(statement)}</h1>' if statement else ""
    pills = "".join(f'<span class="pill {TAG_KIND.get(t.get("kind") or "neutral", "")}">{esc(t.get("text", ""))}</span>'
                    for t in d.get("demand_tags", []))
    pills = f'<div class="pills">{pills}</div>' if pills else ""

    vkey = verdict_key(d.get("verdict"))
    tag = L["vtag"].get(vkey, "")
    en_name = {"go": "Go", "cond": "Conditional", "pivot": "Pivot", "nogo": "No-go"}.get(vkey, "")
    bits = ([en_name] if (L is STR["zh"] and en_name) else []) + ([tag] if tag else [])
    caption = " · ".join(bits)
    caption = f'<div class="verdict-caption">{esc(caption)}</div>' if caption else ""
    pct = d.get("weighted_pct")
    nums = ""
    if pct is not None:
        nums += f'<span><b>{fmt_num(pct)}</b> {esc(L["weighted"])}</span>'
    hist = render_hist(d, L)
    if hist:
        nums += hist
    nums = f'<div class="verdict-nums">{nums}</div>' if nums else ""

    right = (f'<div class="hero-right"><div><div class="verdict-word">{esc(d.get("verdict", "—"))}</div>'
             f'{caption}</div>{nums}{render_scale(d, L)}</div>')
    left = (f'<div class="hero-left"><div class="hero-meta">{meta}</div>{q}{stmt}{pills}</div>')
    return (f'<section id="verdict"><div class="hero lock">'
            f'<div class="hero-main">{left}{right}</div>{render_claims(d, L)}</div>'
            f'{render_one_thing(d, L)}</section>')


def render_one_thing(d, L):
    ot = d.get("one_thing") or {}
    if not ot.get("title"):
        return ""
    detail = f'<div class="ot-detail">{inline(ot.get("detail", ""))}</div>' if ot.get("detail") else ""
    window = (f'<div class="ot-window">{esc(ot["window"])}</div>') if ot.get("window") else ""
    return (f'<div class="one-thing"><div class="ot-label">{ICON["star"]}{esc(L["one_thing"])}</div>'
            f'<div><div class="ot-title">{inline(ot["title"])}</div>{detail}</div>{window}</div>')


def _ev_refs(ids, extra_style=""):
    if not ids:
        return ""
    style = f' style="{extra_style}"' if extra_style else ""
    return f'<div class="ev-refs"{style}>{esc(" · ".join(str(x) for x in ids))}</div>'


def render_why(d, L):
    para = (f'<p class="verdict-para">{inline(d.get("verdict_sub2", ""))}</p>'
            if d.get("verdict_sub2") else "")
    plus, minus, watch = [], [], []
    for w in d.get("why", []) or []:
        k = w.get("kind", "+")
        (plus if k == "+" else minus if k == "-" else watch).append(w)

    def items(rows):
        out = ""
        for w in rows:
            title, lethal = split_lethal(w.get("title", ""))
            badge = f'<span class="li-lethal">{esc(L["lethal"])}</span>' if lethal else ""
            body = f'<div class="li-body">{inline(w.get("body", ""))}</div>' if w.get("body") else ""
            out += (f'<div class="ledger-item"><div class="li-title">{inline(title)}{badge}</div>'
                    f'{body}{_ev_refs(w.get("evidence_ids"))}</div>')
        return out

    ledger = ""
    if plus or minus:
        imb = ""
        if len(minus) > len(plus):
            imb = f'<span class="lh-note">{esc(L["imb_minus"])}</span>'
        elif len(plus) > len(minus):
            imb = f'<span class="lh-note">{esc(L["imb_plus"])}</span>'
        ledger = (f'<div class="ledger"><div class="ledger-col">'
                  f'<div class="ledger-head lh-plus">{esc(L["ledger_plus"].format(n=len(plus)))}</div>{items(plus)}</div>'
                  f'<div class="ledger-col"><div class="ledger-head lh-minus">{esc(L["ledger_minus"].format(n=len(minus)))}{imb}</div>'
                  f'{items(minus)}</div></div>')
    watches = ""
    period = "." if L is STR["en"] else "。"
    for w in watch:
        title, _ = split_lethal(w.get("title", ""))
        t = str(title or "").rstrip()
        dot = "" if (not t or t[-1] in ".。！？!?") else period
        body = f' {inline(w.get("body", ""))}' if w.get("body") else ""
        refs = _ev_refs(w.get("evidence_ids"), "display:inline;margin:0 0 0 8px")
        watches += (f'<div class="watch"><span class="watch-tag">{esc(L["watch"])}</span>'
                    f'<p><b>{inline(t)}{dot}</b>{body}{refs}</p></div>')
    return para + ledger + watches


def _fixes_chip(a, d, L, lang):
    fx = a.get("fixes")
    if not fx:
        return ""
    canon = dim_key(fx)
    label = dim_label(canon, fx, lang)
    score = ""
    for x in d.get("scorecard", []) or []:
        if dim_key(x.get("dim", "")) == canon and x.get("score") is not None and not x.get("insufficient"):
            score = f' {x["score"]}/{x.get("max", 5) or 5}'
            break
    sep = ": " if lang == "en" else "："
    return f'<span class="chip chip-fix">{esc(L["fixes"])}{sep}{esc(label)}{score}</span>'


def render_actions(d, L, lang):
    do_rows = ""
    for i, a in enumerate(d.get("actions", []) or [], 1):
        pr = PRIO.get(a.get("priority", ""), "")
        pchip = f'<span class="chip chip-pri-{pr}">{esc(a.get("priority", ""))}</span>' if pr else ""
        detail = f'<div class="act-detail">{inline(a.get("detail", ""))}</div>' if a.get("detail") else ""
        do_rows += (f'<div class="act-item"><div class="act-num">{i:02d}</div><div>'
                    f'<div class="act-title">{inline(a.get("title", ""))} {pchip}{_fixes_chip(a, d, L, lang)}</div>'
                    f'{detail}</div></div>')
    dont_rows = ""
    for x in d.get("do_not", []) or []:
        reason = f'<div class="dont-reason">{inline(x.get("reason", ""))}</div>' if x.get("reason") else ""
        dont_rows += (f'<div class="dont-item"><div class="dont-x">{ICON["cross"]}</div><div>'
                      f'<div class="dont-title">{inline(x.get("title", ""))}</div>{reason}</div></div>')
    if not do_rows and not dont_rows:
        return ""
    do_card = (f'<div class="act-card"><div class="act-head">{esc(L["do_head"])}</div>{do_rows}</div>') if do_rows else ""
    dont_card = (f'<div class="act-card"><div class="act-head dont">{esc(L["dont_head"])}</div>{dont_rows}</div>') if dont_rows else ""
    cols = "1.15fr .85fr" if (do_rows and dont_rows) else "1fr"
    return f'<div class="act-grid" style="grid-template-columns:{cols}">{do_card}{dont_card}</div>'


def render_scores(d, L, lang):
    items = d.get("scorecard", []) or []
    if not items:
        return ""
    norm = sorted(((dim_key(x.get("dim", "")), x) for x in items),
                  key=lambda t: DIM_ORDER.index(t[0]) if t[0] in DIM_ORDER else 99)
    groups = {0: [], 1: [], 2: []}
    for canon, x in norm:
        groups[DIM_CAT.get(canon, 2)].append((canon, x))
    body = ""
    for ci in (0, 1, 2):
        if not groups[ci]:
            continue
        body += f'<div class="sb-cat">{esc(L["cats"][ci])}</div>'
        for canon, x in groups[ci]:
            label = dim_label(canon, x.get("dim"), lang)
            badges = ""
            w = x.get("weight")
            if w and float(w) > 1:
                wtxt = f"×{int(w)}" if float(w) == int(w) else f"×{w}"
                badges += f'<span class="badge badge-w">{wtxt}</span>'
            if x.get("disagreement"):
                badges += f'<span class="badge badge-dis" title="{esc(L["disagree_tip"])}">⚠</span>'
            val_badges = ""
            delta = x.get("delta")
            if delta:
                val_badges += f'<span class="badge badge-delta{"" if delta < 0 else " badge-dpos"}">Δ{"+" if delta > 0 else ""}{delta}</span>'
            if x.get("insufficient") or x.get("score") is None:
                bar = '<div class="sb-bar"><div class="sb-hatch"></div></div>'
                val = f'<span class="sb-val sb-na">{esc(L["insufficient"])}</span>'
            else:
                mx = x.get("max", 5) or 5
                s = x.get("score", 0)
                r = s / mx
                bar = f'<div class="sb-bar"><div class="sb-fill {bar_class(r)}" style="width:{round(r * 100)}%"></div></div>'
                val = f'<span class="sb-val">{val_badges}<b>{esc(s)}</b>/{esc(mx)}</span>'
            body += f'<div class="sb-row"><span class="sb-name">{esc(label)} {badges}</span>{bar}{val}</div>'
    legend = "".join(f"<span>{esc(x)}</span>" for x in L["legend"])
    pct = d.get("weighted_pct")
    if pct is not None:
        legend += f'<span>{esc(L["legend_pct"].format(pct=fmt_num(pct)))}</span>'
    board = f'<div class="board">{body}<div class="board-foot">{legend}</div></div>'

    risk_rows = ""
    for r in d.get("risks", []) or []:
        sev = str(r.get("severity", "medium"))
        cls = RISK_SEV.get(sev) or RISK_SEV.get(sev.lower(), "mid")
        refs = _ev_refs(r.get("evidence_ids"), "display:inline;margin-left:8px")
        risk_rows += (f'<div class="risk-row"><span class="risk-sev sev-{cls}">{esc(sev)}</span>'
                      f'<span class="risk-type">{esc(r.get("type", ""))}</span>'
                      f'<div><div class="risk-title">{inline(r.get("title", ""))}</div>'
                      f'<div class="risk-body">{inline(r.get("body", ""))}{refs}</div></div></div>')
    risks = f'<div class="risk-list">{risk_rows}</div>' if risk_rows else ""
    return board + risks


def _arch(idx, title, hint, body):
    return (f'<details class="arch"><summary><span class="arch-idx">{idx}</span>'
            f'<span class="arch-t">{esc(title)}</span><span class="arch-hint">{esc(hint)}</span>'
            f'<span class="arch-arrow">▸</span></summary><div class="arch-body">{body}</div></details>')


def render_archive(d, L, lang):
    blocks = []

    voices = d.get("voices", []) or []
    if voices:
        rows = ""
        for v in voices:
            lean = v.get("lean") or "mix"
            lcls = LEAN_CLASS.get(lean, "lean-mix")
            ltext = v.get("lean_label") or L["lean"].get(lean, L["lean"]["mix"])
            refs = _ev_refs(v.get("evidence_ids"), "display:inline;margin-left:6px")
            rows += (f'<div class="voice"><span class="voice-domain">{esc(v.get("domain", ""))}</span>'
                     f'<span class="lean {lcls}">{esc(ltext)}</span>'
                     f'<span class="voice-sum">{inline(v.get("summary", ""))}{refs}</span></div>')
        t, h = L["arch"]["voices"]
        blocks.append((t, h.format(n=len(voices)), rows))

    duo = ""
    if d.get("contradictions"):
        duo += f'<div><div class="duo-h">{esc(L["contra"])}</div><p>{inline(d["contradictions"])}</p></div>'
    if d.get("red_team"):
        duo += f'<div><div class="duo-h">{esc(L["redteam"])}</div><p>{inline(d["red_team"])}</p></div>'
    extra = ""
    for f_ in d.get("findings", []) or []:
        extra += (f'<div><div class="duo-h">{inline(f_.get("title", ""))}</div>'
                  f'<p>{inline(f_.get("body", ""))}</p>{_ev_refs(f_.get("evidence_ids"))}</div>')
    if duo or extra:
        t, h = L["arch"]["duo"]
        blocks.append((t, h, f'<div class="duo">{duo}{extra}</div>'))

    comp_rows = ""
    for c in d.get("competitors", []) or []:
        name = inline(c.get("name", ""))
        if c.get("url"):
            name = f'<a href="{esc(c["url"])}" target="_blank">{name}</a>'
        rating = esc(c.get("rating", ""))
        rc = c.get("rating_count")
        if rc:
            rating += f' ({rc:,})' if isinstance(rc, int) else f' ({esc(rc)})'
        comp_rows += (f'<tr><td>{name}</td><td>{esc(c.get("model", ""))}</td>'
                      f'<td class="tnum">{esc(c.get("price", ""))}</td><td class="tnum">{rating}</td>'
                      f'<td>{inline(c.get("top_complaint", ""))}</td></tr>')
    alt_rows = "".join(f'<tr><td>{inline(a.get("current", ""))}</td><td>{inline(a.get("gap", ""))}</td></tr>'
                       for a in d.get("alternatives", []) or [])
    if comp_rows or alt_rows:
        body = ""
        if comp_rows:
            heads = "".join(f"<th>{esc(x)}</th>" for x in L["comp_cols"])
            body += f'<table><thead><tr>{heads}</tr></thead><tbody>{comp_rows}</tbody></table>'
        if alt_rows:
            heads = "".join(f"<th>{esc(x)}</th>" for x in L["alt_cols"])
            style = ' style="margin-top:14px"' if comp_rows else ""
            body += f'<table{style}><thead><tr>{heads}</tr></thead><tbody>{alt_rows}</tbody></table>'
        t, h = L["arch"]["comp"]
        blocks.append((t, h.format(a=len(d.get("competitors", []) or []),
                                   b=len(d.get("alternatives", []) or [])), body))

    sigs = d.get("signals", []) or []
    if sigs:
        heads = "".join(f"<th>{esc(x)}</th>" for x in L["sig_cols"])
        rows = ""
        for s in sigs:
            conf = C.norm_confidence(s.get("confidence", "lead"))
            ccls = CONF_CLASS.get(conf, "conf-lead")
            clabel = L["sig_conf"].get(conf, conf)
            plats = "".join(f'<span class="plat">{esc(p)}</span>' for p in s.get("platforms", []))
            hard = '<span class="sig-hard">✓</span>' if s.get("has_hard_evidence") else '<span class="mut">—</span>'
            rows += (f'<tr><td>{inline(s.get("signal", ""))}</td><td class="tnum">{esc(s.get("n_sources", ""))}</td>'
                     f'<td>{plats}</td><td>{hard}</td><td><span class="conf {ccls}">{esc(clabel)}</span></td></tr>')
        t, h = L["arch"]["signals"]
        blocks.append((t, h.format(n=len(sigs)),
                       f'<table><thead><tr>{heads}</tr></thead><tbody>{rows}</tbody></table>'))

    gos = d.get("go_criteria", []) or []
    if gos:
        heads = "".join(f"<th>{esc(x)}</th>" for x in L["go_cols"])
        rows, met_n = "", 0
        for g in gos:
            met = g.get("met")
            key = GO_MET.get(met) or GO_MET.get(str(met).strip().lower(), "warn")
            met_n += 1 if key == "good" else 0
            label = L["met_label"][key]
            rows += (f'<tr><td>{inline(g.get("criterion", ""))}</td>'
                     f'<td><span class="conf met-{key}">{esc(label)}</span></td>'
                     f'<td>{inline(g.get("note", ""))}</td></tr>')
        met_txt = (L["go_met_all"] if met_n == len(gos)
                   else L["go_met_none"] if met_n == 0
                   else L["go_met_some"].format(x=met_n, n=len(gos)))
        t, h = L["arch"]["go"]
        blocks.append((t, h.format(n=len(gos), met=met_txt),
                       f'<table><thead><tr>{heads}</tr></thead><tbody>{rows}</tbody></table>'))

    m = d.get("method", {}) or {}
    ev = d.get("evidence", []) or []
    if m or ev:
        stats = ""
        for k, lab in [("agents", L["st_agents"]), ("evidence_count", L["st_ev"]),
                       ("signals_verified", L["st_sig"]), ("rounds", L["st_round"])]:
            if m.get(k) is not None:
                stats += f'<div class="stat"><b>{esc(m[k])}</b><span>{esc(lab)}</span></div>'
        stats = f'<div class="stats">{stats}</div>' if stats else ""
        flow = f'<div class="kv"><strong>{esc(L["flow"])}：</strong>{esc(m.get("flow") or L["default_flow"])}</div>'
        srcs = " · ".join(esc(x) for x in m.get("sources", []))
        srcs = f'<div class="kv"><strong>{esc(L["sources"])}：</strong>{srcs}</div>' if srcs else ""
        ev_rows = ""
        for e in ev:
            col = SRC_COLOR.get(e.get("source_type", ""), "#A6A192")
            tag = f'<span class="tag" style="background:{col}">{esc(e.get("source_type", ""))}</span>'
            org = e.get("origin")
            if org and str(org).strip() not in ("一手", "primary", "firsthand", "official"):
                tag += f'<span class="tag" style="background:#A6A192">{esc(org)}</span>'
            link = f' <a href="{esc(e.get("url", ""))}" target="_blank">↗</a>' if e.get("url") else ""
            quote = (e.get("quote") or "")[:240]
            q = f'<div class="q">“{esc(quote)}”</div>' if quote else ""
            ev_rows += (f'<tr><td class="eid">{esc(e.get("id", ""))}</td><td>{esc(e.get("platform", ""))}{tag}</td>'
                        f'<td>{esc(e.get("claim", ""))}{q}</td><td class="eid">{esc(e.get("date", ""))}{link}</td></tr>')
        ev_tbl = f'<table style="margin-top:12px"><tbody>{ev_rows}</tbody></table>' if ev_rows else ""
        t, h = L["arch"]["method"]
        blocks.append((t, h.format(agents=m.get("agents", "?"), ev=m.get("evidence_count", len(ev)),
                                   rounds=m.get("rounds", "?")), stats + flow + srcs + ev_tbl))

    out = "".join(_arch(chr(65 + i), t, h, b) for i, (t, h, b) in enumerate(blocks))
    nv = "".join(f"<li>{inline(x)}</li>" for x in d.get("not_verified", []) or [])
    if nv:
        out += f'<div class="nv"><div class="nv-h">{esc(L["notverified"])}</div><ul>{nv}</ul></div>'
    return out


def section(idx, sid, L, body, with_head=True):
    if not with_head:
        return body
    h = f'<h2 class="sec-h">{esc(L["sec_h"][sid])}</h2>' if sid in L["sec_h"] else ""
    hint = f'<p class="sec-hint">{esc(L["sec_hint"][sid])}</p>' if sid in L["sec_hint"] else ""
    return (f'<section class="sec" id="{sid}"><div class="sec-tag">{idx:02d} · {esc(L["sec_tag"][sid])}</div>'
            f'{h}{hint}{body}</section>')


def render(d):
    lang = "en" if str(d.get("lang", "en")).lower().startswith("en") else "zh"
    L = STR[lang]
    vc = verdict_color(d.get("verdict", ""))
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    bodies = {"verdict": render_hero(d, L),
              "why": render_why(d, L),
              "actions": render_actions(d, L, lang),
              "scores": render_scores(d, L, lang),
              "archive": render_archive(d, L, lang)}
    secs = [(sid, bodies[sid]) for sid in SEC_IDS if bodies[sid]]
    main = ""
    for i, (sid, body) in enumerate(secs):
        main += body if sid == "verdict" else section(i + 1, sid, L, body)

    m = d.get("method", {}) or {}
    foot_r = ""
    if m.get("agents") is not None and m.get("evidence_count") is not None:
        foot_r = (f'<span>{m["agents"]} AGENTS · {m["evidence_count"]} EVIDENCE'
                  + (f' · {m["rounds"]} ROUNDS' if m.get("rounds") is not None else "") + "</span>")
    foot = (f'<div class="foot"><span>DEMAND RADAR · {ts} · {esc(L["foot"])} · '
            f'<a href="https://github.com/lemomo-ai/demand-radar">adapted from lemomo-ai/demand-radar, CC BY-NC 4.0</a></span>{foot_r}</div>')

    spy_ids = json.dumps([sid for sid, _ in secs])
    return (doc_head(lang, L["title"], vc)
            + render_topbar(d, L, secs, ts)
            + f'<div class="wrap">{main}{foot}</div>'
            + SPY_JS.replace("__IDS__", spy_ids) + "</body></html>")


SPY_JS = """<script>
(function(){
 var links=[].slice.call(document.querySelectorAll('.tb-nav a'));
 var map={};links.forEach(function(a){map[a.getAttribute('href').slice(1)]=a});
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){
  links.forEach(function(a){a.classList.remove('active')});
  if(map[e.target.id])map[e.target.id].classList.add('active')}})},{rootMargin:'-25% 0px -65% 0px'});
 __IDS__.forEach(function(id){var el=document.getElementById(id);if(el)io.observe(el)});
 window.addEventListener('beforeprint',function(){document.querySelectorAll('details').forEach(function(x){
  x.setAttribute('data-was',x.open?'1':'0');x.open=true})});
 window.addEventListener('afterprint',function(){document.querySelectorAll('details').forEach(function(x){
  if(x.getAttribute('data-was')==='0')x.open=false})});
})();
</script>"""


def doc_head(lang, title, vc):
    return (f'<!doctype html><html lang="{lang}"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title>'
            f'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            f'<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">'
            f'<style>:root{{--verdict:{vc};--verdict-soft:{vc}14}}{CSS}</style></head><body>')


CSS = """
:root{
 --paper:#F8F9F6;--card:#FCFDFB;--soft:#F1F3EE;
 --ink:#14171C;--t2:#3C4148;--t3:#5C626B;--t4:#888E96;--t5:#AEB3B9;
 --line:rgba(20,23,28,.045);--line-major:rgba(20,23,28,.08);--hair:rgba(20,23,28,.12);
 --signal:#0E8C63;--signal-deep:#0A7351;--signal-soft:rgba(14,140,99,.07);--signal-line:rgba(14,140,99,.3);
 --go:#1E8C5A;--amber:#B07C32;--terra:#C0673A;--nogo:#B0463B;
 --shadow:0 1px 0 rgba(20,23,28,.03),0 14px 34px rgba(20,23,28,.055);
 --mono:'IBM Plex Mono',ui-monospace,Menlo,monospace;
 --disp:'Space Grotesk',-apple-system,'PingFang SC','Hiragino Sans GB',system-ui,sans-serif;
 --sans:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI','PingFang SC','Hiragino Sans GB',system-ui,sans-serif;
}
*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0}
html{scroll-behavior:smooth}
body{
 font-family:var(--sans);color:var(--ink);line-height:1.66;-webkit-font-smoothing:antialiased;
 background-color:var(--paper);
 background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px),
  linear-gradient(var(--line-major) 1px,transparent 1px),linear-gradient(90deg,var(--line-major) 1px,transparent 1px);
 background-size:32px 32px,32px 32px,160px 160px,160px 160px;background-position:-1px -1px;background-attachment:fixed;
}
a{color:var(--signal-deep);text-decoration:none}
code{background:var(--soft);padding:1px 6px;border-radius:3px;font-size:.88em;font-family:var(--mono)}
.wrap{max-width:960px;margin:0 auto;padding:0 28px}
.mut{color:var(--t4)}
strong{font-weight:650;color:var(--ink)}
/* corner-bracket lock —— 全页只用一次（决策卡） */
.lock{position:relative}
.lock::before,.lock::after{content:"";position:absolute;width:14px;height:14px;pointer-events:none;z-index:2}
.lock::before{top:-1px;left:-1px;border-top:1.6px solid var(--signal);border-left:1.6px solid var(--signal)}
.lock::after{bottom:-1px;right:-1px;border-bottom:1.6px solid var(--signal);border-right:1.6px solid var(--signal)}
/* topbar */
.topbar{position:sticky;top:0;z-index:40;backdrop-filter:blur(8px);
 background:linear-gradient(rgba(248,249,246,.94),rgba(248,249,246,.78));border-bottom:1px solid var(--line-major)}
.topbar-in{display:flex;align-items:center;gap:14px;padding:12px 0}
.brand{display:flex;align-items:center;gap:9px;font-family:var(--disp);font-weight:600;font-size:15px;letter-spacing:-.3px}
.brand svg{width:24px;height:24px;color:var(--signal);flex:none}
.brand .g{color:var(--signal)}
.tb-q{font-family:var(--mono);font-size:11px;color:var(--t4);letter-spacing:.3px;border-left:1px solid var(--hair);padding-left:14px;
 white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:30ch}
.tb-nav{margin-left:auto;display:flex;gap:16px}
.tb-nav a{font-family:var(--mono);font-size:11px;font-weight:500;color:var(--t3);letter-spacing:.4px;transition:color .15s;white-space:nowrap}
.tb-nav a:hover,.tb-nav a.active{color:var(--ink)}
.tb-verdict{font-family:var(--mono);font-size:10.5px;font-weight:600;color:#fff;background:var(--verdict);padding:3px 9px;letter-spacing:.6px;white-space:nowrap}
/* section frame */
.sec{padding:44px 0 6px}
.sec-tag{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:1.4px;color:var(--signal);text-transform:uppercase;margin-bottom:8px}
.sec-tag::before{content:"// ";opacity:.55}
.sec-h{font-family:var(--disp);font-size:23px;font-weight:600;letter-spacing:-.5px;margin:0 0 4px;line-height:1.15}
.sec-hint{font-size:13px;color:var(--t4);margin:0 0 18px}
/* 01 决策卡 */
.hero{margin-top:34px;background:var(--card);border:1px solid var(--hair);box-shadow:var(--shadow)}
.hero-main{display:grid;grid-template-columns:1.45fr 1fr}
.hero-left{padding:30px 34px 26px;border-right:1px solid var(--line-major)}
.hero-meta{font-family:var(--mono);font-size:11px;letter-spacing:1.2px;color:var(--signal);text-transform:uppercase;margin-bottom:14px}
.hero-meta::before{content:"// ";opacity:.55}
.hero-q{font-size:13.5px;color:var(--t3);margin-bottom:4px}
.hero-q b{color:var(--ink);font-weight:600;font-size:15px;margin-right:8px}
.hero-statement{font-family:var(--disp);font-size:29px;font-weight:600;letter-spacing:-.8px;line-height:1.28;margin:16px 0 18px}
.pills{display:flex;gap:8px;flex-wrap:wrap}
.pill{font-family:var(--mono);font-size:10.5px;font-weight:500;letter-spacing:.4px;padding:3px 10px;border:1px solid var(--hair);color:var(--t2);background:var(--paper)}
.pill-good{color:var(--signal-deep);border-color:var(--signal-line);background:var(--signal-soft)}
.pill-bad{color:var(--nogo);border-color:rgba(176,70,59,.3);background:rgba(176,70,59,.06)}
.pill-warn{color:var(--amber);border-color:rgba(176,124,50,.32);background:rgba(176,124,50,.07)}
.hero-right{padding:30px 30px 24px;display:flex;flex-direction:column;gap:14px;background:linear-gradient(180deg,var(--card),var(--soft))}
.verdict-word{font-family:var(--disp);font-size:38px;font-weight:700;letter-spacing:-1px;line-height:1.08;color:var(--verdict)}
.verdict-caption{font-family:var(--mono);font-size:11px;letter-spacing:1.6px;color:var(--t4);text-transform:uppercase;margin-top:6px}
.verdict-nums{font-family:var(--mono);font-size:12px;color:var(--t2);display:flex;flex-direction:column;gap:3px}
.verdict-nums b{font-size:15px;font-weight:600;color:var(--ink)}
.vn-neg{color:var(--nogo)}.vn-pos{color:var(--signal-deep)}
.scale{margin-top:auto}
.scale-track{position:relative;display:flex;height:22px;border:1px solid var(--hair);background:var(--card)}
.scale-track span{flex:1;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:9px;letter-spacing:.5px;color:var(--t5);border-right:1px solid var(--line-major)}
.scale-track span:last-of-type{border-right:none}
.scale-track span.on{background:var(--verdict-soft);color:var(--verdict);font-weight:600}
.scale-needle{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--verdict)}
.scale-needle::after{content:"";position:absolute;top:-4px;left:-3px;border:4px solid transparent;border-top-color:var(--verdict)}
.scale-note{font-family:var(--mono);font-size:10px;color:var(--t4);margin-top:7px;letter-spacing:.3px}
.claims{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));border-top:1px solid var(--line-major)}
.claim{padding:16px 18px 15px;border-right:1px solid var(--line-major)}
.claim:last-child{border-right:none}
.claim-head{display:flex;align-items:center;gap:7px;font-family:var(--mono);font-size:10px;letter-spacing:.8px;color:var(--t4);margin-bottom:7px}
.claim-status{font-weight:600;letter-spacing:.5px;margin-left:auto;display:inline-flex;align-items:center;gap:4px}
.claim-status svg{width:11px;height:11px}
.st-good{color:var(--signal-deep)}.st-bad{color:var(--nogo)}.st-warn{color:var(--amber)}
.claim-title{font-size:13px;font-weight:600;line-height:1.45;margin-bottom:4px}
.claim-note{font-size:12px;color:var(--t3);line-height:1.55}
.claim-bad .claim-title{color:var(--nogo)}
/* one thing（全页唯一的绿色高亮） */
.one-thing{margin-top:14px;display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:center;
 background:var(--signal-soft);border:1px solid var(--signal-line);padding:16px 22px}
.ot-label{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:1.2px;color:var(--signal-deep);text-transform:uppercase;white-space:nowrap}
.ot-label svg{width:15px;height:15px}
.ot-title{font-family:var(--disp);font-size:16.5px;font-weight:600;letter-spacing:-.2px;line-height:1.4}
.ot-detail{font-size:13px;color:var(--t2);margin-top:2px;line-height:1.6}
.ot-window{font-family:var(--mono);font-size:11px;color:var(--signal-deep);white-space:nowrap;border-left:1px solid var(--signal-line);padding-left:16px;align-self:stretch;display:flex;align-items:center}
/* 02 判词 */
.verdict-para{border-left:3px solid var(--verdict);padding:4px 0 4px 20px;font-size:16.5px;line-height:1.85;color:var(--t2);max-width:56em;margin:6px 0 26px}
.ledger{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--hair);background:var(--card);box-shadow:var(--shadow)}
.ledger-col{padding:4px 0 10px}
.ledger-col+.ledger-col{border-left:1px solid var(--line-major)}
.ledger-head{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;padding:14px 22px 8px}
.lh-plus{color:var(--signal-deep)}.lh-minus{color:var(--nogo)}
.lh-note{margin-left:auto;font-weight:500;color:var(--t4);letter-spacing:.4px}
.ledger-item{padding:12px 22px 14px;border-top:1px solid var(--line)}
.li-title{font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.li-lethal{font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.8px;color:#fff;background:var(--nogo);padding:1px 7px}
.li-body{font-size:13px;color:var(--t3);line-height:1.62;margin-top:4px}
.ev-refs{font-family:var(--mono);font-size:10px;color:var(--t5);letter-spacing:.5px;margin-top:6px}
.watch{display:flex;gap:12px;align-items:baseline;border:1px solid rgba(176,124,50,.32);background:rgba(176,124,50,.05);padding:13px 22px;margin-top:12px}
.watch-tag{font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:1px;color:var(--amber);white-space:nowrap;text-transform:uppercase}
.watch p{margin:0;font-size:13.5px;color:var(--t2)}
.watch p b{font-weight:600}
/* 03 行动 */
.act-grid{display:grid;gap:14px;align-items:start}
.act-card{background:var(--card);border:1px solid var(--hair);box-shadow:var(--shadow)}
.act-head{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;padding:14px 22px 6px;color:var(--signal-deep)}
.act-head.dont{color:var(--nogo)}
.act-item{display:grid;grid-template-columns:auto 1fr;gap:14px;padding:14px 22px 16px;border-top:1px solid var(--line)}
.act-num{font-family:var(--mono);font-size:15px;font-weight:600;color:var(--signal);line-height:1.5}
.act-title{font-size:14.5px;font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.act-detail{font-size:13px;color:var(--t3);line-height:1.62;margin-top:4px}
.chip{font-family:var(--mono);font-size:9.5px;font-weight:500;letter-spacing:.4px;padding:1px 7px;border:1px solid var(--hair);color:var(--t3);background:var(--paper)}
.chip-pri-high{color:var(--nogo);border-color:rgba(176,70,59,.3)}
.chip-pri-mid{color:var(--amber);border-color:rgba(176,124,50,.32)}
.chip-fix{color:var(--signal-deep);border-color:var(--signal-line)}
.dont-item{display:grid;grid-template-columns:auto 1fr;gap:12px;padding:14px 22px 16px;border-top:1px solid var(--line)}
.dont-x{color:var(--nogo)}.dont-x svg{width:14px;height:14px;margin-top:4px}
.dont-title{font-size:14.5px;font-weight:600;color:var(--nogo)}
.dont-reason{font-size:13px;color:var(--t3);line-height:1.62;margin-top:3px}
/* 04 评分卡 */
.board{background:var(--card);border:1px solid var(--hair);box-shadow:var(--shadow);padding:6px 0 14px}
.sb-cat{display:flex;align-items:baseline;gap:10px;font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:1.2px;color:var(--t4);text-transform:uppercase;padding:16px 26px 6px}
.sb-row{display:grid;grid-template-columns:172px 1fr 120px;gap:16px;align-items:center;padding:7px 26px}
.sb-row:hover{background:var(--soft)}
.sb-name{font-size:13.5px;color:var(--t2);display:flex;align-items:center;gap:7px}
.sb-bar{height:10px;background:var(--soft);border:1px solid var(--line-major);position:relative}
.sb-fill{position:absolute;inset:1px auto 1px 1px;border-radius:0 2px 2px 0}
.f-good{background:var(--signal)}.f-mid{background:var(--amber)}.f-low{background:var(--nogo)}
.sb-hatch{position:absolute;inset:1px;background:repeating-linear-gradient(45deg,transparent 0 5px,rgba(20,23,28,.14) 5px 7px)}
.sb-val{font-family:var(--mono);font-size:12px;color:var(--t2);display:flex;align-items:center;gap:8px;justify-content:flex-end}
.sb-val b{font-weight:600;color:var(--ink)}
.sb-na{color:var(--t4)}
.badge{font-family:var(--mono);font-size:9px;font-weight:600;letter-spacing:.4px;padding:0 5px;border:1px solid var(--hair);color:var(--t4)}
.badge-w{color:var(--ink)}
.badge-dis{color:var(--amber);border-color:rgba(176,124,50,.4)}
.badge-delta{color:var(--nogo);border:none;padding:0}
.badge-dpos{color:var(--signal-deep)}
.board-foot{font-family:var(--mono);font-size:10px;color:var(--t4);letter-spacing:.4px;padding:12px 26px 0;border-top:1px solid var(--line);margin-top:10px;display:flex;gap:18px;flex-wrap:wrap}
.risk-list{margin-top:14px;border:1px solid var(--hair);background:var(--card);box-shadow:var(--shadow)}
.risk-row{display:grid;grid-template-columns:auto auto 1fr;gap:14px;align-items:baseline;padding:14px 22px;border-top:1px solid var(--line)}
.risk-row:first-child{border-top:none}
.risk-sev{font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.8px;padding:2px 8px;color:#fff}
.sev-high{background:var(--nogo)}.sev-mid{background:var(--amber)}.sev-low{background:var(--t4)}
.risk-type{font-family:var(--mono);font-size:10.5px;color:var(--t4);letter-spacing:.5px;white-space:nowrap}
.risk-title{font-size:14px;font-weight:600}
.risk-body{font-size:13px;color:var(--t3);line-height:1.6;margin-top:3px}
/* 05 依据（档案，默认折叠） */
details.arch{border:1px solid var(--hair);background:var(--card);margin-bottom:10px}
details.arch summary{display:flex;align-items:center;gap:12px;cursor:pointer;list-style:none;padding:14px 22px;user-select:none}
details.arch summary::-webkit-details-marker{display:none}
.arch-idx{font-family:var(--mono);font-size:10px;color:var(--t5);letter-spacing:1px}
.arch-t{font-family:var(--disp);font-size:14.5px;font-weight:600;letter-spacing:-.2px}
.arch-hint{font-size:12px;color:var(--t4);margin-left:auto;text-align:right}
.arch-arrow{font-family:var(--mono);font-size:11px;color:var(--t4);transition:transform .18s}
details[open] .arch-arrow{transform:rotate(90deg)}
.arch-body{padding:4px 22px 20px;border-top:1px solid var(--line)}
.voice{display:grid;grid-template-columns:190px auto 1fr;gap:14px;align-items:baseline;padding:11px 0;border-top:1px solid var(--line)}
.voice:first-child{border-top:none}
.voice-domain{font-size:13px;font-weight:600}
.lean{font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.5px;padding:1px 7px;white-space:nowrap}
.lean-for{color:var(--signal-deep);border:1px solid var(--signal-line)}
.lean-mix{color:var(--amber);border:1px solid rgba(176,124,50,.35)}
.lean-against{color:var(--nogo);border:1px solid rgba(176,70,59,.32)}
.voice-sum{font-size:13px;color:var(--t3);line-height:1.6}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:0}
.duo>div{padding:14px 18px 6px}
.duo>div:nth-child(even){border-left:1px solid var(--line-major)}
.duo-h{font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--t4);margin-bottom:6px}
.duo p{font-size:13px;color:var(--t2);line-height:1.68;margin:0}
table{width:100%;border-collapse:collapse;font-size:13px}
th{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.8px;color:var(--t4);text-transform:uppercase;text-align:left;padding:10px 12px 7px;border-bottom:1px solid var(--line-major)}
td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top;color:var(--t2);line-height:1.55}
tr:last-child td{border-bottom:none}
.tnum{font-family:var(--mono);font-size:12px}
.conf{font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.5px;padding:1px 7px}
.conf-high,.met-good{color:var(--signal-deep);border:1px solid var(--signal-line)}
.conf-mid,.met-warn{color:var(--amber);border:1px solid rgba(176,124,50,.35)}
.conf-lead{color:var(--t4);border:1px solid var(--hair)}
.met-bad{color:var(--nogo);border:1px solid rgba(176,70,59,.32)}
.plat{font-family:var(--mono);font-size:10px;color:var(--t3);background:var(--soft);padding:1px 6px;margin-right:4px;white-space:nowrap}
.sig-hard{color:var(--signal-deep);font-weight:600}
.stats{display:flex;gap:0;border:1px solid var(--line-major);margin:12px 0 14px}
.stat{flex:1;padding:12px 16px;border-right:1px solid var(--line-major)}
.stat:last-child{border-right:none}
.stat b{font-family:var(--mono);font-size:19px;font-weight:600;display:block;line-height:1.2}
.stat span{font-size:11px;color:var(--t4)}
.kv{font-size:12.5px;color:var(--t3);margin:6px 0}
.q{color:var(--t4);font-size:12px;margin-top:2px}
.eid{font-family:var(--mono);font-size:11px;color:var(--t4);white-space:nowrap}
.tag{font-family:var(--mono);font-size:9px;font-weight:600;color:#fff;padding:1px 6px;margin-left:6px}
.nv{border:1px dashed var(--hair);padding:16px 22px;margin:26px 0 0;background:rgba(252,253,251,.6)}
.nv-h{font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:1.2px;color:var(--t4);text-transform:uppercase;margin-bottom:8px}
.nv ul{margin:0;padding-left:18px;font-size:13px;color:var(--t3);line-height:1.7}
.foot{font-family:var(--mono);font-size:10.5px;color:var(--t4);letter-spacing:.4px;padding:34px 0 40px;border-top:1px solid var(--line-major);margin-top:36px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
@media (max-width:820px){
 .hero-main{grid-template-columns:1fr}
 .hero-left{border-right:none;border-bottom:1px solid var(--line-major)}
 .claims{grid-template-columns:1fr 1fr}
 .claim:nth-child(2n){border-right:none}
 .claim{border-bottom:1px solid var(--line-major)}
 .claim:last-child,.claim:nth-last-child(2):nth-child(odd){border-bottom:none}
 .ledger{grid-template-columns:1fr}
 .ledger-col+.ledger-col{border-left:none;border-top:1px solid var(--line-major)}
 .act-grid{grid-template-columns:1fr!important}
 .one-thing{grid-template-columns:1fr}
 .ot-window{border-left:none;padding-left:0}
 .sb-row{grid-template-columns:110px 1fr 96px}
 .voice{grid-template-columns:1fr;gap:4px}
 .duo{grid-template-columns:1fr}
 .duo>div:nth-child(even){border-left:none;border-top:1px solid var(--line-major)}
 .tb-q,.tb-nav{display:none}
}
@media print{
 body{background:none}
 .topbar{position:static}
 .hero,.one-thing,.ledger,.act-card,.board,.risk-list,details.arch{box-shadow:none;break-inside:avoid}
 a{color:inherit}
}
"""


# ── 长度铁律告警（不截断，返工文案） ─────────────────────────────────

def _warn_len(field, text, lang):
    if not text:
        return []
    zh_lim, en_lim = LIMITS[field]
    lim = en_lim if lang == "en" else zh_lim
    n = len(str(text))
    if n > lim:
        return [f"WARNING too long {field}: {n} > {lim} ({'chars' if lang == 'en' else 'zh chars'}) - cut adjectives and the second clause, not evidence"]
    return []


def check_lengths(d):
    lang = "en" if str(d.get("lang", "en")).lower().startswith("en") else "zh"
    warns = []
    warns += _warn_len("verdict_sub", d.get("verdict_sub"), lang)
    warns += _warn_len("verdict_sub2", d.get("verdict_sub2"), lang)
    for w in d.get("why", []) or []:
        warns += _warn_len("why.title", w.get("title"), lang)
        warns += _warn_len("why.body", w.get("body"), lang)
    ot = d.get("one_thing") or {}
    warns += _warn_len("one_thing.detail", ot.get("detail"), lang)
    for a in d.get("actions", []) or []:
        warns += _warn_len("actions.detail", a.get("detail"), lang)
    for x in d.get("do_not", []) or []:
        warns += _warn_len("do_not.reason", x.get("reason"), lang)
    return warns


# ── --run-dir 自动透传（模型写语义，脚本管数学） ─────────────────────

def _load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def autofill_from_run(d, run_dir):
    """从 run 目录补齐数据字段：report.json 已有的字段不覆盖，只对账告警。"""
    notes = []
    agg_f = _load_json(os.path.join(run_dir, "agg-final.json"))
    agg_i = _load_json(os.path.join(run_dir, "agg-initial.json"))
    tri = _load_json(os.path.join(run_dir, "tri.json"))
    evj = _load_json(os.path.join(run_dir, "evidence.json"))
    lang = "en" if str(d.get("lang", "en")).lower().startswith("en") else "zh"

    if agg_f:
        init_med = {}
        if agg_i:
            init_med = {dim_key(r.get("dim", "")): r.get("median")
                        for r in agg_i.get("dimensions", [])}
        if not d.get("scorecard"):
            rows = []
            for r in agg_f.get("dimensions", []):
                canon = dim_key(r.get("dim", ""))
                row = {"dim": r.get("dim"), "score": r.get("median"), "max": 5,
                       "weight": r.get("weight", 1),
                       "disagreement": bool(r.get("disagreement")),
                       "insufficient": bool(r.get("insufficient"))}
                im = init_med.get(canon)
                if im is not None and r.get("median") is not None:
                    delta = round(r["median"] - im, 1)
                    if delta:
                        row["delta"] = delta
                rows.append(row)
            d["scorecard"] = rows
            notes.append("scorecard <- agg-final.json")
        if d.get("weighted_pct") is None:
            d["weighted_pct"] = agg_f.get("weighted_pct")
            notes.append("weighted_pct <- agg-final.json")
        elif agg_f.get("weighted_pct") is not None and abs(float(d["weighted_pct"]) - float(agg_f["weighted_pct"])) > 0.05:
            notes.append(f"WARNING weighted_pct mismatch: report.json {d['weighted_pct']} vs agg-final {agg_f['weighted_pct']} (trust agg-final)")
        if not d.get("verdict"):
            d["verdict"] = agg_f.get("verdict")
            notes.append("verdict <- agg-final.json")
        elif agg_f.get("verdict") and verdict_key(d["verdict"]) != verdict_key(agg_f["verdict"]):
            notes.append(f"WARNING verdict mismatch: report.json '{d['verdict']}' vs agg-final '{agg_f['verdict']}' (trust agg-final)")
        if not d.get("score_history") and agg_i and agg_i.get("weighted_pct") is not None \
                and agg_f.get("weighted_pct") is not None:
            s1 = "Initial" if lang == "en" else "初评"
            s2 = "Post red-team" if lang == "en" else "红队终评"
            d["score_history"] = [{"stage": s1, "pct": agg_i["weighted_pct"]},
                                  {"stage": s2, "pct": agg_f["weighted_pct"]}]
            notes.append("score_history <- agg-initial/final.json")

    if tri and not d.get("signals"):
        rows = [{"signal": s.get("signal"), "n_sources": s.get("n_sources"),
                 "platforms": s.get("platforms", []),
                 "has_hard_evidence": bool(s.get("has_hard_evidence")),
                 "confidence": C.norm_confidence(s.get("confidence", "lead"))}
                for s in tri.get("signals", [])]
        keep = [r for r in rows if r["confidence"] in ("high", "medium")]
        leads = [r for r in rows if r["confidence"] not in ("high", "medium")]
        d["signals"] = keep + leads[:max(0, 12 - len(keep))]
        if len(rows) > len(d["signals"]):
            notes.append(f"signals <- tri.json (kept {len(d['signals'])}/{len(rows)}; remaining leads are in evidence)")
        else:
            notes.append("signals <- tri.json")

    if evj and not d.get("evidence"):
        ev = evj.get("evidence", evj if isinstance(evj, list) else [])
        d["evidence"] = [{k: e.get(k) for k in
                          ("id", "platform", "source_type", "origin", "claim", "quote", "url", "date")
                          if e.get(k) is not None} for e in ev]
        notes.append("evidence <- evidence.json")
    return notes


# ── --check 结构校验 ────────────────────────────────────────────────

def check_report(d):
    """返回 (errors, warns)。errors = 渲染前必须修的硬伤。"""
    errors, warns = [], []
    for f in ("question", "verdict", "verdict_sub"):
        if not d.get(f):
            errors.append(f"missing required field: {f}")
    if not verdict_key(d.get("verdict")):
        warns.append(f"verdict '{d.get('verdict')}' is not in the standard set (Go / Conditional / Pivot / No-go); colour falls back to grey")
    if not d.get("one_thing", {}).get("title"):
        warns.append("missing one_thing: it anchors the recommendations section")
    if len(d.get("why", []) or []) < 3:
        warns.append(f"why has only {len(d.get('why', []) or [])} item(s) (template asks for >=5)")
    if not d.get("claims"):
        warns.append("missing claims (supported / uncertain / refuted per sub-claim): core output, first screen will be incomplete")
    if not d.get("not_verified"):
        warns.append("missing not_verified: required, never write 'not found' as 'does not exist'")
    ev_ids = {str(e.get("id")) for e in d.get("evidence", []) or []}
    if ev_ids:
        def _chk(rows, field):
            for r in rows or []:
                for eid in r.get("evidence_ids", []) or []:
                    if str(eid) not in ev_ids:
                        errors.append(f"{field} references unknown evidence id: {eid}")
        _chk(d.get("why"), "why")
        _chk(d.get("voices"), "voices")
        _chk(d.get("risks"), "risks")
        _chk(d.get("findings"), "findings")
    for x in d.get("scorecard", []) or []:
        if dim_key(x.get("dim", "")) not in DIM_CAT:
            warns.append(f"scorecard dimension not recognised: '{x.get('dim')}' (will be listed last)")
    warns += check_lengths(d)
    return errors, warns


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", required=True)
    ap.add_argument("--output", default="")
    ap.add_argument("--run-dir", default="", help="fill scorecard/score_history/signals/evidence from this run directory")
    ap.add_argument("--check", action="store_true", help="validate only, do not render; exit 1 on hard errors")
    ap.add_argument("--open", action="store_true")
    a = ap.parse_args()
    with open(a.report, encoding="utf-8") as f:
        d = json.load(f)
    if d.get("verdict"):
        d["verdict"] = C.norm_verdict(d["verdict"])
    if a.run_dir:
        for n in autofill_from_run(d, a.run_dir):
            print(f"[run-dir] {n}", file=sys.stderr)
    errors, warns = check_report(d)
    for w in warns:
        print(w if w.startswith("WARNING") else f"WARNING {w}", file=sys.stderr)
    for e in errors:
        print(f"ERROR {e}", file=sys.stderr)
    if a.check:
        print(("check FAILED" if errors else "check passed") + f": {len(errors)} error(s) / {len(warns)} warning(s)")
        sys.exit(1 if errors else 0)
    if not a.output:
        print("ERROR --output is required when rendering", file=sys.stderr)
        sys.exit(2)
    if errors:
        print("ERROR rendering despite errors (run --check and fix first)", file=sys.stderr)
    with open(a.output, "w", encoding="utf-8") as f:
        f.write(render(d))
    print(f"report written: {a.output}")
    if a.open:
        try:
            webbrowser.open("file://" + os.path.abspath(a.output))
        except Exception:
            pass  # headless host: the path printed above is enough


if __name__ == "__main__":
    main()
