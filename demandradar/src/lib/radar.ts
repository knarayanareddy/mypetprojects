/**
 * Browser/Node port of the Demand Radar scoring rules (skills/demand-radar/scripts/dr_common.py,
 * triangulate.py, aggregate_scores.py). Same vocabulary, same rules, so the playground gives the
 * same numbers as the Python scripts.
 */

export const DIMS = [
  "pain_intensity",
  "prevalence",
  "current_alternatives",
  "willingness_to_pay",
  "market_size",
  "differentiation_wedge",
  "reachability",
] as const;
export type Dim = (typeof DIMS)[number];

export const DIM_LABELS: Record<string, string> = {
  pain_intensity: "Pain intensity",
  prevalence: "Prevalence / frequency",
  current_alternatives: "Current-alternative gap",
  willingness_to_pay: "Willingness to pay",
  market_size: "Market size & trend",
  differentiation_wedge: "Differentiation wedge",
  reachability: "Reachability",
};

const DEMAND_DIMS: Dim[] = ["pain_intensity", "prevalence", "current_alternatives"];
const CORE_DIMS: Dim[] = ["willingness_to_pay", "market_size"];

export function weightOf(dim: string): number {
  if (dim === "willingness_to_pay") return 2;
  if (dim === "pain_intensity") return 1.5;
  return 1;
}

const DIM_ALIASES: Record<string, Dim> = {
  pain_intensity: "pain_intensity", "pain intensity": "pain_intensity", pain: "pain_intensity",
  painkiller: "pain_intensity", 痛点强度: "pain_intensity", 痛点: "pain_intensity",
  prevalence: "prevalence", frequency: "prevalence", "prevalence / frequency": "prevalence",
  普遍性: "prevalence", 普遍: "prevalence", 频率: "prevalence",
  current_alternatives: "current_alternatives", "current alternatives": "current_alternatives",
  "current alternative": "current_alternatives", "current-alternative": "current_alternatives",
  "current-alternative gap": "current_alternatives", "alternative gap": "current_alternatives",
  alternatives: "current_alternatives", alternative: "current_alternatives",
  workaround: "current_alternatives", workarounds: "current_alternatives",
  现有替代: "current_alternatives", 现有替代缺口: "current_alternatives",
  现有替代方案: "current_alternatives", 替代缺口: "current_alternatives", 替代: "current_alternatives",
  willingness_to_pay: "willingness_to_pay", "willingness to pay": "willingness_to_pay",
  "willingness-to-pay": "willingness_to_pay", wtp: "willingness_to_pay", payment: "willingness_to_pay",
  付费意愿: "willingness_to_pay", 付费: "willingness_to_pay",
  market_size: "market_size", "market size": "market_size", market: "market_size",
  "market size & trend": "market_size", "market size and trend": "market_size",
  市场规模: "market_size", "市场规模+趋势": "market_size", 市场: "market_size",
  differentiation_wedge: "differentiation_wedge", "differentiation wedge": "differentiation_wedge",
  differentiation: "differentiation_wedge", wedge: "differentiation_wedge",
  competition: "differentiation_wedge", whitespace: "differentiation_wedge",
  差异化楔子: "differentiation_wedge", 差异化: "differentiation_wedge", 差异化空间: "differentiation_wedge",
  楔子: "differentiation_wedge", 切口: "differentiation_wedge", 竞争空白: "differentiation_wedge",
  竞争: "differentiation_wedge",
  reachability: "reachability", reach: "reachability", accessibility: "reachability",
  可触达性: "reachability", 可触达: "reachability", 触达: "reachability",
};
const ALIAS_SUBSTR = Object.keys(DIM_ALIASES)
  .filter((k) => k.length >= 2)
  .sort((a, b) => b.length - a.length);

export function matchDim(name: unknown): string {
  const raw = String(name ?? "").trim();
  if (!raw) return raw;
  const low = raw.toLowerCase().replace(/_/g, " ").split(/\s+/).join(" ");
  if ((DIMS as readonly string[]).includes(raw)) return raw;
  for (const cand of [raw, raw.toLowerCase(), low]) {
    if (cand in DIM_ALIASES) return DIM_ALIASES[cand];
  }
  for (const k of ALIAS_SUBSTR) {
    if (raw.includes(k) || low.includes(k)) return DIM_ALIASES[k];
  }
  return raw;
}

const PLATFORM_ALIASES: Record<string, string> = {
  hn: "HN", hackernews: "HN", "hacker news": "HN", "news.ycombinator": "HN", ycombinator: "HN", algolia: "HN",
  "app store": "App Store", appstore: "App Store", itunes: "App Store", "apple app store": "App Store",
  ios: "App Store", 应用商店: "App Store",
  "google play": "Google Play", googleplay: "Google Play", "play store": "Google Play",
  reddit: "Reddit", "product hunt": "Product Hunt", producthunt: "Product Hunt",
  x: "X", twitter: "X", 推特: "X", mastodon: "Mastodon", bluesky: "Bluesky", bsky: "Bluesky",
  lobsters: "Lobsters", "lobste.rs": "Lobsters",
  "stack overflow": "Stack Overflow", stackoverflow: "Stack Overflow",
  "stack exchange": "Stack Exchange", stackexchange: "Stack Exchange",
  github: "GitHub", gitlab: "GitLab", "dev.to": "DEV", discord: "Discord", slack: "Slack",
  discourse: "Discourse", linkedin: "LinkedIn", quora: "Quora", youtube: "YouTube", medium: "Medium",
  substack: "Substack", g2: "G2", capterra: "Capterra", trustpilot: "Trustpilot",
  "google trends": "Google Trends", wikipedia: "Wikipedia",
  小红书: "小红书", xiaohongshu: "小红书", rednote: "小红书", 知乎: "知乎", zhihu: "知乎",
  微博: "微博", weibo: "微博", b站: "B站", bilibili: "B站", v2ex: "V2EX", 即刻: "即刻",
  百度贴吧: "百度贴吧", 贴吧: "百度贴吧", tieba: "百度贴吧",
  "app annie": "data.ai", "data.ai": "data.ai", "sensor tower": "Sensor Tower",
  searxng: "Web search", "web search": "Web search",
};
const PLAT_SUBSTR = Object.keys(PLATFORM_ALIASES)
  .filter((k) => k.length >= 2)
  .sort((a, b) => b.length - a.length);

export function normPlatform(name: unknown, unrecognized?: Set<string>): string {
  const raw = String(name ?? "").trim();
  if (!raw) return "";
  const low = raw.toLowerCase().split(/\s+/).join(" ");
  if (low in PLATFORM_ALIASES) return PLATFORM_ALIASES[low];
  for (const k of PLAT_SUBSTR) if (low.includes(k)) return PLATFORM_ALIASES[k];
  unrecognized?.add(raw);
  return raw;
}

export type Confidence = "high" | "medium" | "lead";
const PRIMARY = new Set(["", "primary", "firsthand", "first-hand", "first hand", "official", "一手", "官方"]);
const isPrimary = (o: unknown) => PRIMARY.has(String(o ?? "").trim().toLowerCase());
const isHard = (s: unknown) => ["hard", "硬"].includes(String(s ?? "").trim().toLowerCase());

export type EvidenceItem = {
  id?: string;
  signal?: string;
  platform?: string;
  source_type?: string;
  origin?: string;
  dims?: string[];
  [k: string]: unknown;
};

export type SignalRow = {
  signal: string;
  n_sources: number;
  platforms: string[];
  has_hard_evidence: boolean;
  all_secondhand: boolean;
  evidence_ids: (string | undefined)[];
  confidence: Confidence;
};

export type TriResult = {
  total_signals: number;
  verified: SignalRow[];
  leads_only: SignalRow[];
  signals: SignalRow[];
  unrecognized_platforms: string[];
  gaps: {
    per_dim: Record<string, { evidence: number; signals: number; platforms: number }>;
    dims_lacking: string[];
    unlabeled_evidence: number;
  };
};

function grade(n: number, hasHard: boolean, hasPrimary: boolean): Confidence {
  let g: Confidence = n >= 3 && hasHard ? "high" : n >= 2 ? "medium" : "lead";
  if (!hasPrimary) g = g === "high" ? "medium" : "lead";
  return g;
}

export function triangulate(evidence: EvidenceItem[]): TriResult {
  const unrecognized = new Set<string>();
  const groups = new Map<
    string,
    { platforms: Set<string>; ids: (string | undefined)[]; hard: boolean; primary: boolean }
  >();
  for (const e of evidence) {
    const sig = String(e.signal ?? "").trim() || "ungrouped";
    if (!groups.has(sig)) groups.set(sig, { platforms: new Set(), ids: [], hard: false, primary: false });
    const g = groups.get(sig)!;
    const p = normPlatform(e.platform, unrecognized);
    if (p) g.platforms.add(p);
    g.ids.push(e.id);
    if (isHard(e.source_type)) g.hard = true;
    if (isPrimary(e.origin)) g.primary = true;
  }
  const rows: SignalRow[] = [...groups.entries()].map(([signal, g]) => {
    const platforms = [...g.platforms].sort();
    return {
      signal,
      n_sources: platforms.length,
      platforms,
      has_hard_evidence: g.hard,
      all_secondhand: !g.primary,
      evidence_ids: g.ids,
      confidence: grade(platforms.length, g.hard, g.primary),
    };
  });
  const order: Record<Confidence, number> = { high: 0, medium: 1, lead: 2 };
  rows.sort((a, b) => b.n_sources - a.n_sources || order[a.confidence] - order[b.confidence]);

  const perDim: Record<string, { evidence: number; signals: Set<string>; platforms: Set<string> }> = {};
  for (const d of DIMS) perDim[d] = { evidence: 0, signals: new Set(), platforms: new Set() };
  let unlabeled = 0;
  for (const e of evidence) {
    const dims = (e.dims ?? []).map(matchDim);
    if (!dims.length) {
      unlabeled++;
      continue;
    }
    for (const d of dims) {
      perDim[d] ??= { evidence: 0, signals: new Set(), platforms: new Set() };
      perDim[d].evidence++;
      if (e.signal) perDim[d].signals.add(String(e.signal).trim());
      const p = normPlatform(e.platform);
      if (p) perDim[d].platforms.add(p);
    }
  }
  const per_dim = Object.fromEntries(
    Object.entries(perDim).map(([d, v]) => [
      d,
      { evidence: v.evidence, signals: v.signals.size, platforms: v.platforms.size },
    ]),
  );
  return {
    total_signals: rows.length,
    verified: rows.filter((r) => r.confidence !== "lead"),
    leads_only: rows.filter((r) => r.confidence === "lead"),
    signals: rows,
    unrecognized_platforms: [...unrecognized].sort(),
    gaps: {
      per_dim,
      dims_lacking: DIMS.filter((d) => (per_dim[d]?.evidence ?? 0) < 2),
      unlabeled_evidence: unlabeled,
    },
  };
}

// ── aggregation ──────────────────────────────────────────────────────

export type JudgeScore = {
  dim?: string;
  score?: number | null;
  confidence?: string;
  insufficient?: boolean;
  evidence_ids?: string[];
  note?: string;
};
export type JudgeCard = { judge?: string; scores?: JudgeScore[] };

export type Verdict = "Go" | "Conditional" | "Pivot" | "No-go";
export function verdictFor(pct: number): Verdict {
  if (pct >= 70) return "Go";
  if (pct >= 50) return "Conditional";
  if (pct >= 30) return "Pivot";
  return "No-go";
}

const INSUFFICIENT = new Set(["insufficient", "insufficient data", "no data", "n/a", "na", "数据不足"]);
function isInsufficient(s: JudgeScore): boolean {
  if (s.insufficient) return true;
  if (s.score === null || s.score === undefined) return true;
  return INSUFFICIENT.has(String(s.confidence ?? "").trim().toLowerCase());
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const round1 = (n: number) => Math.round(n * 10) / 10;

export type DimRow = {
  dim: string;
  median: number | null;
  spread: number | null;
  n_judges: number;
  n_insufficient: number;
  weight: number;
  disagreement: boolean;
  insufficient: boolean;
  raw: number[];
};

export type AggResult = {
  weighted_pct: number;
  verdict: Verdict;
  verdict_capped: boolean;
  demand_state: {
    demand_reality_pct?: number;
    demand_reality?: { text: string; kind: string };
    opportunity?: { text: string; kind: string };
  };
  n_judges: number;
  dimensions: DimRow[];
  flags: string[];
  insufficient_dims: string[];
  confidence_cap: "medium" | "high";
  unrecognized_dims?: string[];
};

export function aggregate(input: JudgeCard[] | { judges: JudgeCard[] }): AggResult {
  const judges = Array.isArray(input) ? input : (input.judges ?? []);
  const per: Record<string, number[]> = {};
  const insuff: Record<string, number> = {};
  for (const d of DIMS) {
    per[d] = [];
    insuff[d] = 0;
  }
  const extra = new Set<string>();
  for (const j of judges) {
    for (const s of j.scores ?? []) {
      const d = matchDim(s.dim);
      if (!(d in per)) {
        extra.add(d);
        continue;
      }
      if (isInsufficient(s)) insuff[d]++;
      else per[d].push(Number(s.score));
    }
  }
  const rows: DimRow[] = [];
  const insufficientDims: string[] = [];
  const medBy: Record<string, number> = {};
  let wsum = 0;
  let wmax = 0;
  for (const d of DIMS) {
    const scores = per[d];
    const w = weightOf(d);
    if (!scores.length) {
      insufficientDims.push(d);
      rows.push({ dim: d, median: null, spread: null, n_judges: 0, n_insufficient: insuff[d], weight: w,
        disagreement: false, insufficient: true, raw: [] });
      continue;
    }
    const med = median(scores);
    const spread = Math.max(...scores) - Math.min(...scores);
    medBy[d] = med;
    wsum += med * w;
    wmax += 5 * w;
    rows.push({ dim: d, median: round1(med), spread, n_judges: scores.length, n_insufficient: insuff[d],
      weight: w, disagreement: spread >= 2, insufficient: false, raw: scores });
  }
  const pct = wmax ? round1((100 * wsum) / wmax) : 0;
  let verdict = verdictFor(pct);
  let capped = false;
  if (verdict === "Go" && CORE_DIMS.some((d) => insufficientDims.includes(d))) {
    verdict = "Conditional";
    capped = true;
  }

  const state: AggResult["demand_state"] = {};
  const dem = DEMAND_DIMS.filter((d) => d in medBy).map((d) => medBy[d]);
  if (dem.length) {
    const p = Math.round((100 * (dem.reduce((a, b) => a + b, 0) / dem.length)) / 5);
    state.demand_reality_pct = p;
    state.demand_reality =
      p < 30 ? { text: "Phantom demand", kind: "bad" }
      : p < 50 ? { text: "Weak demand", kind: "warn" }
      : p < 75 ? { text: "Real demand", kind: "good" }
      : { text: "Must-have demand", kind: "good" };
  }
  if ("differentiation_wedge" in medBy) {
    const w = medBy.differentiation_wedge;
    state.opportunity =
      w < 1 ? { text: "No wedge", kind: "bad" }
      : w < 3 ? { text: "Wedge only in a niche", kind: "warn" }
      : { text: "Clear wedge", kind: "good" };
  }

  return {
    weighted_pct: pct,
    verdict,
    verdict_capped: capped,
    demand_state: state,
    n_judges: judges.length,
    dimensions: [...rows].sort((a, b) => b.weight - a.weight),
    flags: rows.filter((r) => r.disagreement).map((r) => r.dim),
    insufficient_dims: insufficientDims,
    confidence_cap: insufficientDims.length ? "medium" : "high",
    ...(extra.size ? { unrecognized_dims: [...extra].sort() } : {}),
  };
}
