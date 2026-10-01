// Stage 2 — the built-in consolidation engine (extractive, deterministic, zero hallucination).
// Every sentence in the output is copied from a source document and carries a source reference.

import {
  buildCorpus,
  descendants,
  makeRef,
  pickSentences,
  refKey,
  sentRef,
  totalWords,
  uniqRefs,
  type Corpus,
  type Section,
  type Sent,
  type TableItem,
} from "./sections";
import type {
  Block,
  Chapter,
  ChartDef,
  Conflict,
  Diagram,
  FileEntry,
  Importance,
  KeyPoint,
  MetricItem,
  Model,
  OutlineNode,
  Quote,
  SourceRef,
  Tone,
  WorkDoc,
} from "./types";
import { clip, countWords, extractFacts, isHedged, jaccard, tokens, tokenSet, type FactUnit } from "./text";
import { computeReport, countUnverified } from "./model-utils";

export interface DistillOptions {
  goal: string;
  uiLang: string;
  title?: string;
}

export interface DistillOutput {
  model: Model;
  sectionsTotal: number;
  sectionsMapped: number;
  unmapped: string[];
}

// ------------------------------------------------------------------ helpers

const imp = (pct: number): Importance => (pct >= 0.8 ? "high" : pct >= 0.45 ? "medium" : "low");
const IMP_RANK: Record<Importance, number> = { high: 0, medium: 1, low: 2 };

function refsOf(c: Corpus, s: Sent): SourceRef[] {
  const base = sentRef(c, s);
  const extra = s.alsoIn.map((a) => ({ ...a }));
  return uniqRefs([base, ...extra], 3);
}

function kindOf(s: Sent): string {
  const t = s.text;
  if (/\b(risk|threat|concern|blocker|vulnerab|breach|shortfall|exposure)\b/i.test(t)) return "risk";
  if (/\b(recommend|should|must|need(?:s)? to|next step|action)\b/i.test(t)) return "action";
  if (/\b(decid|approved|rejected|agreed|selected|chosen)\w*\b/i.test(t)) return "decision";
  if (/\b(is defined as|refers to|means that|is a|are a)\b/i.test(t)) return "definition";
  if (/\b(therefore|conclude|overall|in summary|in short|as a result)\b/i.test(t)) return "conclusion";
  if (s.facts.some((f) => f.unit !== "date")) return "number";
  if (/\b(increase|decrease|growth|decline|fell|rose|dropped|grew|improv)\w*\b/i.test(t)) return "trend";
  return "finding";
}

const TRAIL = new Set(
  "to of by at from was were is are be been reached hit totals total totalled rose fell dropped increased decreased grew reaching up down about approximately around over under than a an the and in for with only just roughly reduced improved cut saved cost costs stands stood expected projected forecast estimated now currently still already into on as has have had will would could should may can remain remains remained increase decrease growth declined jumped climbed slipped or but that which while falls fall falling drops rises rise grows reaches adds saves exceeds requires takes shows expects assumes estimates comes goes stays equals costing worth per so also".split(
    " "
  )
);

export function labelFor(text: string, factStart: number, factEnd: number): string {
  const cutB = Math.max(...[",", ";", ":", "—", "–", "(", ")", ". "].map((c) => text.lastIndexOf(c, factStart - 1)));
  const clean = (w: string) => w.replace(/^[^\p{L}\p{N}$€£¥]+|[^\p{L}\p{N}%]+$/gu, "");
  const before = text
    .slice(cutB >= 0 ? cutB + 1 : 0, factStart)
    .split(/\s+/)
    .map(clean)
    .filter(Boolean);
  const np: string[] = [];
  for (let i = before.length - 1; i >= 0 && np.length < 4; i--) {
    const w = before[i];
    const skip = TRAIL.has(w.toLowerCase()) || /[\d$€£¥%]/.test(w) || /^(million|billion|thousand|percent)$/i.test(w);
    if (skip) {
      if (np.length) break;
      continue;
    }
    np.unshift(w);
  }
  let words = np;
  if (np.length < 1) {
    const rest = text.slice(factEnd);
    const m = /^[^,;:—–()]*/.exec(rest)?.[0] || "";
    const after = m.split(/\s+/).map(clean).filter(Boolean);
    while (after.length && /^(was|were|is|are|by|to|and|but|that|which|from|per|of)$/i.test(after[0])) after.shift();
    while (after.length && /^(the|a|an|and|or|but|to|of|in)$/i.test(after[after.length - 1])) after.pop();
    words = after.slice(0, 5);
  }
  if (np.length === 1 && words === np) {
    const rest = text.slice(factEnd);
    const m = /^[^,;:—–().]*/.exec(rest)?.[0] || "";
    const after = m.split(/\s+/).map(clean).filter(Boolean);
    while (after.length && /^(was|were|is|are|by|to|and|but|that|which|from|per|of|million|billion|thousand|percent)$/i.test(after[0])) after.shift();
    const more: string[] = [];
    for (const w of after) {
      if (more.length >= 3 || /^(and|but|to|that|which|from|by)$/i.test(w)) break;
      more.push(w);
    }
    if (more.length) words = [...np, ...more];
  }
  const label = words.join(" ").trim();
  return label ? label[0].toUpperCase() + label.slice(1) : "";
}

const UNIT_BONUS: Record<FactUnit, number> = { money: 1, pct: 0.8, multiple: 0.8, count: 0.5, duration: 0.5, plain: 0.3, date: 0 };

interface MetricCand {
  item: MetricItem;
  score: number;
  secKey: string;
  tokens: Set<string>;
  sentId?: number;
}

const META_DATE = /\b(prepar|publish|updat|creat|issu|version|author|revis|modif|date)/i;

const NUM_CELL = /^[-+(]?\s*[$€£¥]?\s?\d[\d,]*(?:\.\d+)?\s?(?:%|[kKmMbB]\b|x|×|pts?|pp)?\)?$/;

function cellValue(cell: string): { raw: string; unit: FactUnit; value: number } | null {
  const c = cell.trim();
  if (!c || !NUM_CELL.test(c)) return null;
  const num = parseFloat(c.replace(/[^\d.\-]/g, ""));
  if (Number.isNaN(num)) return null;
  const unit: FactUnit = /%|pp|pts/.test(c) ? "pct" : /[$€£¥]/.test(c) ? "money" : /[x×]$/.test(c) ? "multiple" : "plain";
  let value = num;
  const suf = /([kKmMbB])\b/.exec(c)?.[1]?.toLowerCase();
  if (suf) value *= suf === "k" ? 1e3 : suf === "m" ? 1e6 : 1e9;
  return { raw: c, unit, value };
}

function metricCandidates(c: Corpus, secs: Section[], goalTok: Set<string>): MetricCand[] {
  const out: MetricCand[] = [];
  for (const sec of secs) {
    for (const s of sec.sents) {
      if (s.dupe) continue;
      for (const f of s.facts) {
        if (f.unit === "date") continue;
        const label = labelFor(s.text, f.start, f.end);
        if (label.length < 3 || countWords(label) < 1) continue;
        const lt = tokenSet(label);
        let g = 0;
        for (const t of goalTok) if (lt.has(t) || s.tokens.has(t)) g++;
        out.push({
          item: {
            value: f.raw,
            label,
            sub: clip(s.text, 96),
            importance: imp(s.pct),
            sources: refsOf(c, s),
          },
          score: s.pct * 2 + UNIT_BONUS[f.unit] + (goalTok.size ? (g / goalTok.size) * 2 : 0) - (s.hedged ? 0.2 : 0),
          secKey: sec.key,
          tokens: lt,
          sentId: s.id,
        });
      }
    }
    for (const t of sec.tables) {
      t.rows.slice(0, 40).forEach((row, ri) => {
        row.forEach((cell, j) => {
          if (j === 0) return;
          const cv = cellValue(cell);
          if (!cv) return;
          const header = t.headers[j] || "";
          const rowLabel = row[0] && !cellValue(row[0]) ? row[0] : "";
          const label = [rowLabel, header].filter(Boolean).join(" — ");
          if (label.length < 3) return;
          const lt = tokenSet(label);
          let g = 0;
          for (const x of goalTok) if (lt.has(x)) g++;
          out.push({
            item: {
              value: cv.raw,
              label: clip(label, 60),
              sub: clip(t.title, 50),
              importance: "medium",
              sources: [makeRef(c.docs[t.docIdx], t.unit, t.loc)],
            },
            score: 0.9 + UNIT_BONUS[cv.unit] + (goalTok.size ? (g / goalTok.size) * 2 : 0) - ri * 0.02,
            secKey: sec.key,
            tokens: lt,
          });
        });
      });
    }
  }
  return out;
}

function selectMetrics(cands: MetricCand[], max: number, perSection = 2, maxTable = 2): MetricItem[] {
  const sorted = [...cands].sort((a, b) => b.score - a.score);
  const picked: MetricCand[] = [];
  const perSec = new Map<string, number>();
  let tableN = 0;
  for (const m of sorted) {
    if (picked.length >= max) break;
    if (picked.some((p) => p.item.value === m.item.value && p.sentId === m.sentId)) continue;
    if (picked.some((p) => jaccard(p.tokens, m.tokens) >= 0.5)) continue;
    if ((perSec.get(m.secKey) || 0) >= perSection) continue;
    const isTable = m.sentId === undefined;
    if (isTable && tableN >= maxTable) continue;
    picked.push(m);
    perSec.set(m.secKey, (perSec.get(m.secKey) || 0) + 1);
    if (isTable) tableN++;
  }
  return picked.map((p, i) => ({ ...p.item, importance: (i < 2 ? "high" : p.item.importance) as Importance }));
}

// ------------------------------------------------------------------ outline nodes

interface Node {
  id: string;
  title: string;
  secs: Section[];
  children: Node[];
  score: number;
  importance: Importance;
}

const titleTokens = (t: string) => tokenSet(t.replace(/^(slide|page)s?\s*\d+(–\d+)?:?/i, ""));

function cluster(lists: Section[][], idPrefix: string, multi: boolean): Node[] {
  const nodes: Node[] = [];
  lists.forEach((list, di) => {
    for (const sec of list) {
      let target: Node | null = null;
      if (multi && !sec.synthetic) {
        const st = titleTokens(sec.title);
        for (const n of nodes) {
          if (n.secs.some((x) => x.docIdx === di) || n.secs.some((x) => x.synthetic)) continue;
          const nt = titleTokens(n.title);
          const same = n.title.trim().toLowerCase() === sec.title.trim().toLowerCase();
          if (same || (st.size > 0 && nt.size > 0 && (jaccard(st, nt) >= 0.5 || (Math.min(st.size, nt.size) >= 2 && [...st].every((x) => nt.has(x)))))) {
            target = n;
            break;
          }
        }
      }
      if (target) target.secs.push(sec);
      else nodes.push({ id: "", title: sec.title, secs: [sec], children: [], score: 0, importance: "medium" });
    }
  });
  nodes.forEach((n, i) => {
    n.id = idPrefix ? `${idPrefix}.${i + 1}` : String(i + 1);
    n.children = cluster(
      lists.map((_, di) => n.secs.filter((s) => s.docIdx === di).flatMap((s) => s.children)),
      n.id,
      multi
    );
    n.score = Math.max(...n.secs.map((s) => s.score));
  });
  return nodes;
}

function assignImportance(nodes: Node[], goalTok: Set<string>) {
  const n = nodes.length;
  const ranked = [...nodes].sort((a, b) => b.score - a.score);
  const nHigh = n >= 3 ? Math.max(1, Math.ceil(n * 0.25)) : n === 2 ? 1 : 0;
  const nLow = n >= 3 ? Math.floor(n * 0.3) : 0;
  ranked.forEach((node, i) => {
    node.importance = i < nHigh ? "high" : i >= n - nLow ? "low" : "medium";
    if (goalTok.size) {
      const tt = tokenSet(node.title);
      let g = 0;
      for (const t of goalTok) if (tt.has(t)) g++;
      if (g >= Math.max(1, Math.ceil(goalTok.size * 0.4))) node.importance = "high";
    }
  });
  if (n === 1) nodes[0].importance = "high";
  nodes.forEach((x) => assignImportance(x.children, goalTok));
}

const allSecs = (n: Node): Section[] => n.secs.flatMap(descendants);
const subtreeSents = (n: Node): Sent[] => allSecs(n).flatMap((s) => s.sents);

function nodeSources(c: Corpus, n: Node): SourceRef[] {
  const top = pickSentences(subtreeSents(n), 2);
  if (top.length) return uniqRefs(top.flatMap((s) => [sentRef(c, s)]), 3);
  return uniqRefs(
    n.secs.map((s) => makeRef(c.docs[s.docIdx], s.startUnit || s.endUnit, s.synthetic ? null : "§ " + s.title)),
    3
  );
}

function outlineOf(c: Corpus, n: Node): OutlineNode {
  const top = pickSentences(subtreeSents(n).filter((s) => !s.fragment), 1)[0] || pickSentences(subtreeSents(n), 1)[0];
  return {
    id: n.id,
    title: n.title,
    summary: top ? clip(top.text, 170) : null,
    importance: n.importance,
    sources: nodeSources(c, n),
    children: n.children.length ? n.children.map((x) => outlineOf(c, x)) : undefined,
  };
}

// ------------------------------------------------------------------ chapter blocks

const RISK = /\b(risk|threat|concern|issue|problem|blocker|blocked|delay|delayed|failure|fail|vulnerab\w*|breach|shortfall|churn|decline[sd]?|loss|overrun|exposure|dependency|bottleneck|warning|caution|critical|outage)\b/i;
const DANGER = /\b(critical|breach|failure|blocker|loss|violation|outage|shortfall|overrun)\b/i;
const WIN = /\b(achieved|exceeded|completed|on track|ahead of (?:plan|schedule)|delivered|milestone reached|successful(?:ly)?|met (?:the|its) target)\b/i;

function tableBlock(c: Corpus, t: TableItem): Block {
  const maxRows = 10;
  return {
    type: "table",
    title: t.title,
    headers: t.headers.map((h) => h || " "),
    rows: t.rows.slice(0, maxRows),
    truncated: t.rows.length > maxRows ? t.rows.length - maxRows : undefined,
    sources: [makeRef(c.docs[t.docIdx], t.unit, t.loc)],
  };
}

function toKp(c: Corpus, s: Sent) {
  return {
    text: s.text,
    importance: imp(s.pct),
    sources: refsOf(c, s),
    unverified: s.hedged && s.facts.some((f) => f.unit !== "date") ? true : undefined,
  };
}

function leafBlocks(c: Corpus, n: Node, used: Set<number>, conflictBySent: Map<number, Conflict[]>): Block[] {
  const blocks: Block[] = [];
  const secs = allSecs(n);
  const cand = secs.flatMap((s) => s.sents);
  const words = n.secs.reduce((a, s) => a + totalWords(s), 0);
  const brief = pickSentences(cand.filter((s) => !s.fragment), words >= 25 ? 1 : 0, used);
  brief.forEach((s) => used.add(s.id));
  if (brief.length)
    blocks.push({ type: "paragraph", md: brief.map((s) => s.text).join(" "), sources: uniqRefs(brief.flatMap((s) => refsOf(c, s)), 3) });
  const nKp = Math.max(0, Math.min(3, Math.floor(words / 130)));
  const kps = pickSentences(cand, nKp, used);
  kps.forEach((s) => used.add(s.id));
  if (kps.length) blocks.push({ type: "keypoints", items: kps.map((s) => toKp(c, s)) });
  for (const t of secs.flatMap((s) => s.tables).slice(0, 2)) blocks.push(tableBlock(c, t));
  for (const im of n.secs.flatMap((s) => s.images).slice(0, 2))
    blocks.push({ type: "image", asset: im.asset, file_id: im.fileId, caption: im.alt || null, sources: [makeRef(c.docs[c.docs.findIndex((d) => d.fileId === im.fileId)], im.unit, im.loc)] });
  void conflictBySent;
  return blocks;
}

function chapterBlocks(c: Corpus, n: Node, goalTok: Set<string>, conflictBySent: Map<number, Conflict[]>, globalUsed: Set<number>): Block[] {
  const used = new Set<number>(globalUsed);
  const blocks: Block[] = [];
  const secs = allSecs(n);
  const cand = secs.flatMap((s) => s.sents);
  const words = n.secs.reduce((a, s) => a + totalWords(s), 0);

  let brief = pickSentences(cand.filter((s) => !s.fragment), words > 500 ? 2 : 1, used);
  if (!brief.length) brief = pickSentences(cand.filter((s) => !s.fragment), 1);
  brief.forEach((s) => used.add(s.id));
  if (brief.length)
    blocks.push({ type: "paragraph", md: brief.map((s) => s.text).join(" "), sources: uniqRefs(brief.flatMap((s) => refsOf(c, s)), 3) });

  const nKp = Math.max(0, Math.min(n.children.length ? 3 : 6, Math.floor(words / 120)));
  const kps = pickSentences(cand, nKp, used);
  kps.forEach((s) => used.add(s.id));
  if (kps.length) blocks.push({ type: "keypoints", items: kps.map((s) => toKp(c, s)) });

  // risk / win callouts
  const risk = pickSentences(cand.filter((s) => RISK.test(s.text)), 1, used);
  for (const s of risk) {
    used.add(s.id);
    blocks.push({
      type: "callout",
      tone: (DANGER.test(s.text) ? "danger" : "warn") as Tone,
      title: "Risk",
      md: s.text,
      sources: refsOf(c, s),
    });
  }
  const win = pickSentences(cand.filter((s) => WIN.test(s.text)), 1, used);
  for (const s of win) {
    used.add(s.id);
    blocks.push({ type: "callout", tone: "success", title: "Progress", md: s.text, sources: refsOf(c, s) });
  }

  // conflicts touching this chapter
  const seen = new Set<string>();
  for (const s of cand) {
    for (const cf of conflictBySent.get(s.id) || []) {
      if (seen.has(cf.id)) continue;
      seen.add(cf.id);
      blocks.push({
        type: "callout",
        tone: "warn",
        title: `Sources disagree · ${cf.topic}`,
        md: cf.positions.map((p) => p.value).join("  ↔  "),
        sources: cf.positions.map((p) => p.source),
      });
    }
  }

  // metrics inside the chapter
  const mc = selectMetrics(metricCandidates(c, secs, goalTok), 3, 2, 1);
  if (mc.length >= 2) blocks.push({ type: "metric", title: "Numbers in this chapter", items: mc });

  for (const t of n.secs.flatMap((s) => s.tables).slice(0, 3)) blocks.push(tableBlock(c, t));
  for (const im of n.secs.flatMap((s) => s.images).slice(0, 3)) {
    const di = c.docs.findIndex((d) => d.fileId === im.fileId);
    blocks.push({ type: "image", asset: im.asset, file_id: im.fileId, caption: im.alt || null, sources: [makeRef(c.docs[di], im.unit, im.loc)] });
  }

  if (n.children.length) {
    blocks.push({
      type: "subsections",
      items: n.children.map((ch) => ({
        id: ch.id,
        title: ch.title,
        importance: ch.importance,
        sources: nodeSources(c, ch),
        blocks: leafBlocks(c, ch, used, conflictBySent),
      })),
    });
  }
  return blocks;
}

// ------------------------------------------------------------------ conflicts

interface Inst {
  doc: number;
  fileId: string;
  unit: FactUnit;
  noun: string;
  value: number | null;
  raw: string;
  key: Set<string>;
  table: boolean;
  label: string;
  text: string;
  ref: SourceRef;
  sentId?: number;
  weight: number;
  tkey?: string;
  tTitle?: string;
}

function findConflicts(c: Corpus, docs: WorkDoc[]): { conflicts: Conflict[]; bySent: Map<number, Conflict[]> } {
  const insts: Inst[] = [];
  const nounOf = (raw: string) => raw.replace(/[\d.,\s\-–$€£¥%]+/g, " ").trim().toLowerCase().replace(/s$/, "");
  for (const s of c.sents) {
    if (s.dupe || !s.facts.length) continue;
    const counts = new Map<FactUnit, number>();
    for (const f of s.facts) counts.set(f.unit, (counts.get(f.unit) || 0) + 1);
    for (const f of s.facts) {
      if ((counts.get(f.unit) || 0) > 1 && f.unit !== "date") continue;
      const factTok = tokenSet(f.raw);
      const key = new Set([...s.tokens].filter((t) => !factTok.has(t)));
      insts.push({
        doc: s.docIdx,
        fileId: s.fileId,
        unit: f.unit,
        noun: f.unit === "count" || f.unit === "duration" ? nounOf(f.raw) : "",
        value: f.value,
        raw: f.raw,
        key,
        table: false,
        label: labelFor(s.text, f.start, f.end),
        text: s.text,
        ref: sentRef(c, s),
        sentId: s.id,
        weight: s.score,
      });
    }
  }
  for (const sec of c.all) {
    for (const t of sec.tables) {
      for (const row of t.rows.slice(0, 60)) {
        row.forEach((cell, j) => {
          if (j === 0) return;
          const cv = cellValue(cell);
          if (!cv || !row[0] || cellValue(row[0])) return;
          const header = t.headers[j] || "";
          insts.push({
            doc: t.docIdx,
            fileId: t.fileId,
            unit: cv.unit,
            noun: "",
            value: cv.value,
            raw: cv.raw,
            key: tokenSet(`${row[0]} ${header}`),
            table: true,
            label: [row[0], header].filter(Boolean).join(" — "),
            text: `${row[0]} — ${header}: ${cell}`,
            ref: makeRef(docs[t.docIdx], t.unit, t.loc),
            weight: 1,
            tkey: `${t.fileId}|${t.unit}|${t.title}`,
            tTitle: t.title,
          });
        });
      }
    }
  }
  const pool = insts.sort((a, b) => b.weight - a.weight).slice(0, 1800);
  const byUnit = new Map<string, Inst[]>();
  for (const i of pool) {
    const k = i.unit === "plain" ? "plain" : i.unit;
    if (!byUnit.has(k)) byUnit.set(k, []);
    byUnit.get(k)!.push(i);
  }
  type Pair = { a: Inst; b: Inst; sim: number; shared: number };
  const pairs: Pair[] = [];
  const tablePairs = new Map<string, Pair[]>();
  for (const list of byUnit.values()) {
    for (let x = 0; x < list.length; x++) {
      for (let y = x + 1; y < list.length; y++) {
        const a = list[x];
        const b = list[y];
        if (a.doc === b.doc) continue;
        if (a.noun !== b.noun) continue;
        if (a.key.size < 2 || b.key.size < 2) continue;
        let shared = 0;
        for (const t of a.key) if (b.key.has(t)) shared++;
        const sim = shared / (a.key.size + b.key.size - shared);
        const both = a.table && b.table;
        const mixed = a.table !== b.table;
        if (both ? !(sim >= 0.6 && shared >= 2) : mixed ? !(sim >= 0.5 && shared >= 2) : !(sim >= 0.5 && shared >= 3)) continue;
        if (a.unit === "date" && (META_DATE.test([...a.key].join(" ")) || META_DATE.test([...b.key].join(" ")))) continue;
        let differ: boolean;
        if (a.value === null || b.value === null) differ = a.raw.toLowerCase().replace(/\W/g, "") !== b.raw.toLowerCase().replace(/\W/g, "");
        else differ = Math.abs(a.value - b.value) / Math.max(Math.abs(a.value), Math.abs(b.value), 1e-9) > 0.01;
        if (!differ) continue;
        if (both) {
          const k = [a.tkey, b.tkey].sort().join("||");
          if (!tablePairs.has(k)) tablePairs.set(k, []);
          tablePairs.get(k)!.push({ a, b, sim, shared });
        } else pairs.push({ a, b, sim, shared });
      }
    }
  }
  pairs.sort((p, q) => q.sim * q.shared - p.sim * p.shared);
  const groups: { insts: Inst[]; topic: string; sim: number }[] = [];
  for (const p of pairs) {
    let g = groups.find((x) => x.insts.includes(p.a) || x.insts.includes(p.b));
    if (g) {
      for (const i of [p.a, p.b]) if (!g.insts.includes(i) && !g.insts.some((o) => o.doc === i.doc)) g.insts.push(i);
    } else groups.push({ insts: [p.a, p.b], topic: p.a.label || p.b.label || "Figure", sim: p.sim * p.shared });
    if (groups.length >= 24) break;
  }
  const conflicts: Conflict[] = [];
  const bySent = new Map<number, Conflict[]>();
  const used = new Set<string>();
  for (const g of groups) {
    if (g.insts.length < 2) continue;
    const sig = g.insts.map((i) => `${i.fileId}:${i.raw}`).sort().join("|");
    if (used.has(sig)) continue;
    used.add(sig);
    const dated = g.insts
      .map((i) => ({ i, d: docs[i.doc].meta.date || null }))
      .filter((x) => x.d)
      .sort((p, q) => String(p.d).localeCompare(String(q.d)));
    const latest = dated.length >= 2 && dated[0].d !== dated[dated.length - 1].d ? dated[dated.length - 1] : null;
    const cf: Conflict = {
      id: `c${conflicts.length + 1}`,
      topic: clip(g.topic, 70),
      positions: g.insts.map((i) => ({
        value: i.table ? `${i.raw} (${i.label})` : `${i.raw} — “${clip(i.text, 110)}”`,
        source: i.ref,
      })),
      resolution: latest
        ? `${docs[latest.i.doc].name} is dated latest (${latest.d}) and is probably the current figure — confirm with the document owner.`
        : "Unresolved: the files carry no dates to tell which figure is current. Verify before relying on either.",
      confidence: g.sim >= 3 ? "medium" : "low",
    };
    conflicts.push(cf);
    for (const i of g.insts) if (i.sentId !== undefined) bySent.set(i.sentId, [...(bySent.get(i.sentId) || []), cf]);
    if (conflicts.length >= 8) break;
  }
  // tables that differ between two files become ONE conflict listing the changed cells
  for (const list of tablePairs.values()) {
    if (conflicts.length >= 8) break;
    const fileA = list[0].a;
    const fileB = list[0].b;
    const cellText = (side: "a" | "b") =>
      list
        .slice(0, 5)
        .map((p) => `${p[side].label.replace(/ — /, " · ")}: ${p[side].raw}`)
        .join("; ") + (list.length > 5 ? `; +${list.length - 5} more` : "");
    const cf: Conflict = {
      id: `c${conflicts.length + 1}`,
      topic: `${fileA.tTitle || "Table"}: ${list.length} figure${list.length > 1 ? "s" : ""} differ between files`,
      positions: [
        { value: cellText("a"), source: fileA.ref },
        { value: cellText("b"), source: fileB.ref },
      ],
      resolution: (() => {
        const da = docs[fileA.doc].meta.date;
        const db2 = docs[fileB.doc].meta.date;
        if (da && db2 && da !== db2) return `${docs[da > db2 ? fileA.doc : fileB.doc].name} is dated later (${da > db2 ? da : db2}) and is probably current — confirm with the document owner.`;
        return "Unresolved: the files carry no dates to tell which table is current.";
      })(),
      confidence: "medium",
    };
    conflicts.push(cf);
  }
  return { conflicts, bySent };
}

// ------------------------------------------------------------------ diagrams

const VERBS =
  "leads? to|led to|results? in|resulted in|causes?|caused|drives?|drove|enables?|enabled|triggers?|triggered|reduces?|reduced|increases?|increased|improves?|improved|depends? on|relies on|rely on|requires?|required|blocks?|blocked|delays?|delayed|supports?|supported|accelerates?|accelerated|lowers?|lowered|raises?|raised|boosts?|boosted|undermines?|threatens?|mitigates?|prevents?|prevented|allows?|allowed|creates?|created|generates?|generated|feeds?|informs?|unlocks?|limits?|amplifies?|exposes?";
const RE_SVO = new RegExp(`^([^,;:]{5,90}?)\\s+(${VERBS})\\s+(.{4,100}?)(?:[.;:,](?=\\s|$)|\\s+(?:and|but|while|which|because|so|if|when)\\b|$)`, "i");
const RE_BECAUSE = /^(?:because|since|as a result of|owing to|given)\s+(.{6,90}?),\s+(.{6,100}?)(?:[.;](?=\s|$)|$)/i;
const RE_SO = /^(.{8,100}?),\s+(?:so|therefore|which means|thus|hence|which is why)\s+(.{6,100}?)(?:[.;](?=\s|$)|$)/i;
const RE_DUE = /^(.{8,100}?)\s+(?:because of|due to|as a result of|owing to)\s+(.{6,90}?)(?:[.;,](?=\s|$)|$)/i;

function cleanPhrase(p: string, side: "subject" | "object"): string | null {
  let t = p
    .replace(/\([^)]*\)/g, "")
    .replace(/["“”]/g, "")
    .replace(/^(?:the|a|an|this|that|these|those|our|their|its|we|it|they|which|also|then|and|but|however|while|although|because|since|when|if|as|so)\s+/i, "")
    .replace(/^(?:the|a|an|our|their|its)\s+/i, "")
    .replace(/[.,;:\s]+$/g, "")
    .trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const cut = side === "subject" ? words.slice(-7) : words.slice(0, 7);
  while (cut.length && /^(of|to|and|or|the|a|an|in|for|with|by|is|are|was|were|may|might|will|would|can|could|should|must|has|have|had|not|also|then|before|after|during|until|within|than|from|at|on|as)$/i.test(cut[cut.length - 1])) cut.pop();
  while (cut.length && /^(of|to|and|or|the|a|an|in|for|with|by|is|are|was|were)$/i.test(cut[0])) cut.shift();
  t = cut.join(" ");
  if (!t || tokens(t).length === 0 || t.length < 4 || /^(it|this|that|they|we|he|she|first|second|third|finally|overall|however|additionally|also|management|leadership)$/i.test(t)) return null;
  if (/[$€£]\s?\d*$/.test(t)) return null;
  if (side === "object" && /^(is|are|was|were|be|been|will|would|may|can|could|should|has|have|had|now)\b/i.test(t)) return null;
  return t[0].toUpperCase() + t.slice(1);
}

const mq = (s: string) => s.replace(/["`#\[\]{}|<>]/g, "'").replace(/\s+/g, " ").trim();

interface Edge {
  from: string;
  to: string;
  label: string;
  sent: Sent;
}

function causalDiagram(c: Corpus): Diagram | null {
  const edges: Edge[] = [];
  const cand = c.sents.filter((s) => !s.dupe && !s.fragment && countWords(s.text) <= 55).sort((a, b) => b.score - a.score).slice(0, 600);
  for (const s of cand) {
    let m: RegExpExecArray | null;
    let cause: string | null = null;
    let effect: string | null = null;
    let label = "";
    if ((m = RE_BECAUSE.exec(s.text))) {
      cause = cleanPhrase(m[1], "subject");
      effect = cleanPhrase(m[2], "object");
      label = "because";
    } else if ((m = RE_SVO.exec(s.text))) {
      cause = cleanPhrase(m[1], "subject");
      effect = cleanPhrase(m[3], "object");
      label = m[2].toLowerCase();
    } else if ((m = RE_DUE.exec(s.text))) {
      effect = cleanPhrase(m[1], "subject");
      cause = cleanPhrase(m[2], "object");
      label = "because";
    } else if ((m = RE_SO.exec(s.text))) {
      cause = cleanPhrase(m[1], "object");
      effect = cleanPhrase(m[2], "object");
      label = "so";
    }
    if (cause && effect && jaccard(tokenSet(cause), tokenSet(effect)) < 0.6 && tokens(cause).length + tokens(effect).length >= 3) edges.push({ from: cause, to: effect, label, sent: s });
  }
  // node identity by token overlap
  const nodes: { id: string; label: string; toks: Set<string>; pct: number }[] = [];
  const nodeFor = (label: string, pct: number) => {
    const tk = tokenSet(label);
    let n = nodes.find((x) => jaccard(x.toks, tk) >= 0.6);
    if (!n) {
      n = { id: `n${nodes.length + 1}`, label, toks: tk, pct };
      nodes.push(n);
    }
    n.pct = Math.max(n.pct, pct);
    return n;
  };
  const picked: { a: string; b: string; label: string; sent: Sent }[] = [];
  const seen = new Set<string>();
  for (const e of edges) {
    if (picked.length >= 12) break;
    const a = nodeFor(e.from, e.sent.pct);
    const b = nodeFor(e.to, e.sent.pct);
    if (a.id === b.id) continue;
    const k = `${a.id}>${b.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    picked.push({ a: a.id, b: b.id, label: e.label, sent: e.sent });
  }
  if (picked.length < 3) return null;
  const lines = ["flowchart LR"];
  const usedIds = new Set(picked.flatMap((p) => [p.a, p.b]));
  for (const n of nodes) {
    if (!usedIds.has(n.id)) continue;
    lines.push(`  ${n.id}["${mq(n.label)}"]:::${n.pct >= 0.8 ? "hi" : n.pct >= 0.45 ? "med" : "lo"}`);
  }
  for (const p of picked) lines.push(`  ${p.a} -->|"${mq(p.label)}"| ${p.b}`);
  return {
    id: "d-logic",
    title: "Core cause-and-effect logic",
    kind: "flowchart",
    mermaid: lines.join("\n"),
    caption: `${picked.length} causal links read directly from the text; each arrow is backed by a cited sentence.`,
    sources: uniqRefs(picked.map((p) => sentRef(c, p.sent)), 6),
    evidence: picked.map((p) => ({ text: p.sent.text, source: sentRef(c, p.sent) })),
  };
}

function structureDiagram(c: Corpus, themes: Node[], title: string): Diagram {
  const lines = ["flowchart LR", `  root(["${mq(clip(title, 50))}"]):::root`];
  const cls = (i: Importance) => (i === "high" ? "hi" : i === "medium" ? "med" : "lo");
  let count = 0;
  themes.forEach((t) => {
    lines.push(`  t${t.id}["${t.id} · ${mq(clip(t.title, 40))}"]:::${cls(t.importance)}`);
    lines.push(`  root --> t${t.id}`);
    for (const ch of t.children.slice(0, 3)) {
      if (count++ > 26) break;
      lines.push(`  c${ch.id.replace(/\./g, "_")}["${mq(clip(ch.title, 34))}"]:::${cls(ch.importance)}`);
      lines.push(`  t${t.id} --> c${ch.id.replace(/\./g, "_")}`);
    }
  });
  // cross references: theme B has sentences that mention all distinctive title tokens of theme A
  const evidence: { text: string; source: SourceRef }[] = [];
  let cross = 0;
  for (const a of themes) {
    const at = [...titleTokens(a.title)].filter((t) => t.length >= 4);
    if (!at.length) continue;
    for (const b of themes) {
      if (a === b || cross >= 8) continue;
      const hits = subtreeSents(b).filter((s) => !s.dupe && at.every((t) => s.tokens.has(t)));
      if (hits.length >= 1 && (at.length >= 2 || hits.length >= 2)) {
        lines.push(`  t${b.id} -.->|"mentions"| t${a.id}`);
        evidence.push({ text: hits[0].text, source: sentRef(c, hits[0]) });
        cross++;
      }
    }
  }
  return {
    id: "d-structure",
    title: "Structure map",
    kind: "flowchart",
    mermaid: lines.join("\n"),
    caption: "How the material is organised. Colour shows importance for your reading goal; dashed lines mark topics that refer to each other.",
    sources: uniqRefs(themes.flatMap((t) => nodeSources(c, t).slice(0, 1)), 6),
    evidence,
  };
}

// ------------------------------------------------------------------ charts

function parseNumeric(cell: string): number | null {
  const v = cellValue(cell);
  return v ? v.value : null;
}

const PALETTE = ["#1f3a8a", "#c0392b", "#0e7490", "#b45309", "#6d28d9", "#15803d"];

function chartFromTable(c: Corpus, t: TableItem, idx: number): ChartDef | null {
  const rows = t.rows.slice(0, 15);
  if (rows.length < 3 || t.headers.length < 2) return null;
  const cols: number[] = [];
  for (let j = 1; j < t.headers.length; j++) {
    const nums = rows.map((r) => parseNumeric(r[j] || ""));
    if (nums.filter((x) => x !== null).length >= Math.ceil(rows.length * 0.8)) cols.push(j);
  }
  if (!cols.length) return null;
  const labels = rows.map((r) => r[0] || "");
  if (labels.some((l) => !l)) return null;
  if (labels.every((l) => parseNumeric(l) !== null && !/^(19|20)\d{2}$/.test(l.trim()))) return null;
  const first = cols[0];
  const med = (j: number) => {
    const v = rows.map((r) => Math.abs(parseNumeric(r[j] || "") ?? 0)).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)] || 1e-9;
  };
  const sig = (h: string) => (/\(([^)]*)\)/.exec(h)?.[1] || (/%/.test(h) ? "%" : "")).toLowerCase().trim();
  const use = cols
    .filter((j) => j === first || (sig(t.headers[j]) === sig(t.headers[first]) && med(j) / med(first) > 0.05 && med(j) / med(first) < 20))
    .slice(0, 3);
  const timeLike = labels.every((l) => /^(19|20)\d{2}$|^Q[1-4]|^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|^\d{4}-\d{2}|^FY|^W\d+|^Week/i.test(l.trim()));
  const sums = parseNumeric(rows[0][first]) !== null ? rows.reduce((a, r) => a + (parseNumeric(r[first]) ?? 0), 0) : 0;
  const unitPct = rows.every((r) => /%/.test(r[first] || ""));
  const doughnut = use.length === 1 && unitPct && sums >= 95 && sums <= 105 && rows.length <= 8;
  const type = doughnut ? "doughnut" : timeLike ? "line" : "bar";
  const datasets = use.map((j, k) => ({
    label: t.headers[j] || `Series ${k + 1}`,
    data: rows.map((r) => parseNumeric(r[j] || "")),
    backgroundColor: doughnut ? rows.map((_, i) => PALETTE[i % PALETTE.length]) : PALETTE[k % PALETTE.length] + (type === "line" ? "33" : "dd"),
    borderColor: PALETTE[k % PALETTE.length],
    borderWidth: type === "line" ? 2 : 1,
    tension: 0.25,
  }));
  return {
    id: `ch${idx}`,
    title: `${t.title} — ${use.map((j) => t.headers[j]).filter(Boolean).join(", ") || "values"}${c.docs.length > 1 ? " · " + c.docs[t.docIdx].name.replace(/\.[A-Za-z0-9]+$/, "") : ""}`,
    caption: `Plotted from the source table (${rows.length} rows${t.rows.length > 15 ? ` of ${t.rows.length}` : ""}).`,
    chartjs: {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: doughnut || use.length > 1 } },
        ...(doughnut ? {} : { scales: { y: { beginAtZero: true } } }),
      },
    },
    sources: [makeRef(c.docs[t.docIdx], t.unit, t.loc)],
  };
}

// ------------------------------------------------------------------ main

export function distill(docs: WorkDoc[], opts: DistillOptions): DistillOutput {
  const goal = opts.goal.trim();
  const goalTok = new Set(tokens(goal));
  const c = buildCorpus(docs, goal);
  const multi = docs.length > 1;

  const nodes = cluster(c.roots, "", multi);
  if (!nodes.length) throw new Error("No extractable text found in the selected files.");
  assignImportance(nodes, goalTok);

  // mapping ground truth
  const mapped = new Set<string>();
  const mark = (n: Node) => {
    n.secs.forEach((s) => mapped.add(s.key));
    n.children.forEach(mark);
  };
  nodes.forEach(mark);
  const unmapped = c.all.filter((s) => !mapped.has(s.key)).map((s) => s.title);

  const { conflicts, bySent } = findConflicts(c, docs);
  const outline = nodes.map((n) => outlineOf(c, n));

  // ---- verdict + summary
  const live = c.sents.filter((s) => !s.dupe && !s.quote);
  const verdictCand = live.filter((s) => !s.fragment && countWords(s.text) >= 8 && countWords(s.text) <= 40);
  const verdict = [...(verdictCand.length ? verdictCand : live)].sort((a, b) => b.score - a.score)[0];
  const summarySents: Sent[] = [];
  const themeRank = [...nodes].sort((a, b) => b.score - a.score);
  const nSum = Math.min(5, Math.max(3, nodes.length >= 5 ? 4 : nodes.length));
  for (const t of themeRank) {
    if (summarySents.length >= nSum) break;
    const s = pickSentences(subtreeSents(t).filter((x) => !x.fragment && countWords(x.text) <= 45), 1, new Set(verdict ? [verdict.id] : []))[0];
    if (s && !summarySents.includes(s)) summarySents.push(s);
  }
  if (summarySents.length < 3) {
    for (const s of pickSentences(live.filter((x) => !x.fragment), 4, new Set([...(verdict ? [verdict.id] : []), ...summarySents.map((x) => x.id)])))
      if (summarySents.length < 4) summarySents.push(s);
  }
  summarySents.sort((a, b) => a.id - b.id);
  if (!summarySents.length && verdict) summarySents.push(verdict);

  // ---- key points (global)
  const perTheme = new Map<string, number>();
  const themeOf = new Map<string, string>();
  for (const n of nodes) for (const s of allSecs(n)) themeOf.set(s.key, n.id);
  const kpPool = live.filter((s) => !s.fragment || s.score > 1.5).sort((a, b) => b.score - a.score);
  const kpSents: Sent[] = [];
  for (const s of kpPool) {
    if (kpSents.length >= Math.min(10, Math.max(5, nodes.length + 2))) break;
    const th = themeOf.get(s.secKey) || "";
    if ((perTheme.get(th) || 0) >= 2) continue;
    if (verdict && s.id === verdict.id) continue;
    if (kpSents.some((o) => jaccard(o.tokens, s.tokens) >= 0.45)) continue;
    kpSents.push(s);
    perTheme.set(th, (perTheme.get(th) || 0) + 1);
  }
  const keypoints: KeyPoint[] = kpSents
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({
      id: `k${i + 1}`,
      text: s.text,
      kind: kindOf(s),
      importance: i < Math.ceil(kpSents.length * 0.35) ? "high" : i < Math.ceil(kpSents.length * 0.75) ? "medium" : "low",
      sources: refsOf(c, s),
      unverified: s.hedged && s.facts.some((f) => f.unit !== "date") ? true : undefined,
    }));

  const globalUsed = new Set<number>([...(verdict ? [verdict.id] : []), ...summarySents.map((x) => x.id), ...kpSents.map((x) => x.id)]);
  const chapters: Chapter[] = nodes.map((n) => ({
    id: n.id,
    title: n.title,
    importance: n.importance,
    sources: nodeSources(c, n),
    blocks: chapterBlocks(c, n, goalTok, bySent, globalUsed),
  }));

  // ---- highlights
  const highlights = selectMetrics(metricCandidates(c, c.all, goalTok), 6, 2, 2);

  // ---- diagrams
  const diagrams: Diagram[] = [];
  const logic = causalDiagram(c);
  const structure = structureDiagram(c, nodes.slice(0, 14), opts.title || c.title[0]);
  if (logic) diagrams.push(logic);
  if (nodes.length >= 2 || structure.mermaid.split("\n").length > 4) diagrams.push(structure);

  // ---- charts
  const charts: ChartDef[] = [];
  const tableOrder = nodes.flatMap((n) => allSecs(n).flatMap((s) => s.tables));
  for (const t of tableOrder) {
    if (charts.length >= 4) break;
    const ch = chartFromTable(c, t, charts.length + 1);
    if (ch) charts.push(ch);
  }
  let derived = 0;
  if (!charts.length && nodes.length >= 3) {
    const w = nodes.map((n) => n.secs.reduce((a, s) => a + totalWords(s), 0));
    derived = w.length;
    charts.push({
      id: "ch-words",
      title: "Where the source spends its words",
      caption: "Derived by Doc Atlas: words of source text per top-level theme (not a figure from the documents).",
      derived: true,
      chartjs: {
        type: "bar",
        data: {
          labels: nodes.map((n) => clip(n.title, 28)),
          datasets: [{ label: "Words", data: w, backgroundColor: nodes.map((n) => (n.importance === "high" ? "#c0392b" : "#1f3a8a") + "cc"), borderColor: "#1f3a8a", borderWidth: 1 }],
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { display: false } } },
      },
      sources: uniqRefs(nodes.flatMap((n) => nodeSources(c, n).slice(0, 1)), 6),
    });
  }

  // ---- quotes
  const quotes: Quote[] = [];
  const qCand: { text: string; ref: SourceRef; score: number; attribution: string | null }[] = [];
  for (const sec of c.all) {
    for (const q of sec.quotes) {
      const m = /^(.*?)\s*[—–-]{1,2}\s*([A-Z][\w.' ,-]{2,50})$/.exec(q.text);
      const text = (m ? m[1] : q.text).replace(/^["“]|["”]$/g, "");
      if (countWords(text) >= 6) qCand.push({ text, ref: makeRef(docs[sec.docIdx], q.unit, q.loc), score: 5, attribution: m ? m[2] : null });
    }
  }
  for (const s of live) {
    const m = /[“"]([^”"]{40,220})[”"]/.exec(s.text);
    if (m && countWords(m[1]) >= 8) qCand.push({ text: m[1], ref: sentRef(c, s), score: 3 + s.pct, attribution: null });
  }
  if (qCand.length < 2) {
    for (const s of live)
      if (!s.fragment && countWords(s.text) >= 9 && countWords(s.text) <= 26 && s.pct >= 0.85) qCand.push({ text: s.text, ref: sentRef(c, s), score: s.pct, attribution: null });
  }
  for (const q of qCand.sort((a, b) => b.score - a.score)) {
    if (quotes.length >= 3) break;
    if (quotes.some((x) => jaccard(tokenSet(x.text), tokenSet(q.text)) > 0.5)) continue;
    quotes.push({ id: `q${quotes.length + 1}`, text: q.text, attribution: q.attribution, source: q.ref });
  }

  // ---- files + relations
  const dated = docs.map((d, i) => ({ d, i })).filter((x) => x.d.meta.date).sort((a, b) => String(a.d.meta.date).localeCompare(String(b.d.meta.date)));
  const primary = [...docs].sort((a, b) => b.words - a.words)[0];
  const files: FileEntry[] = docs.map((d) => {
    let role = d === primary && multi ? "Primary document (most content)" : null;
    if (d.type === "xlsx" || d.type === "csv") role = "Data source";
    else if (d.type === "pptx") role = "Presentation";
    if (multi && dated.length >= 2 && dated[0].d === d && dated[0].d.meta.date !== dated[dated.length - 1].d.meta.date) role = "Earliest in the set";
    if (multi && dated.length >= 2 && dated[dated.length - 1].d === d && dated[0].d.meta.date !== d.meta.date) role = "Latest in the set";
    if (!multi) role = "Single source";
    return { id: d.fileId, name: d.name, type: d.type, pages: d.pages, words: d.words, date: d.meta.date || null, role };
  });

  let file_relations: Model["file_relations"] = null;
  if (multi) {
    const lines = ["flowchart TD"];
    docs.forEach((d, i) => lines.push(`  F${i}["${mq(clip(d.name.replace(/\.[A-Za-z0-9]+$/, ""), 40))}<br/>${d.type.toUpperCase()}${d.meta.date ? " · " + d.meta.date : ""}"]:::file`));
    const notes: string[] = [];
    for (let i = 0; i < docs.length; i++)
      for (let j = i + 1; j < docs.length; j++) {
        const shared = nodes.filter((n) => n.secs.some((s) => s.docIdx === i) && n.secs.some((s) => s.docIdx === j)).length;
        const conf = conflicts.filter((cf) => cf.positions.some((p) => p.source.file_id === docs[i].fileId) && cf.positions.some((p) => p.source.file_id === docs[j].fileId)).length;
        let overlap = 0;
        const ti = new Set(c.sents.filter((s) => s.docIdx === i).flatMap((s) => [...s.tokens]));
        const tj = new Set(c.sents.filter((s) => s.docIdx === j).flatMap((s) => [...s.tokens]));
        overlap = jaccard(ti, tj);
        if (!shared && !conf && overlap < 0.08) continue;
        const parts = [] as string[];
        if (shared) parts.push(`${shared} shared topic${shared > 1 ? "s" : ""}`);
        if (conf) parts.push(`${conf} conflict${conf > 1 ? "s" : ""}`);
        if (!parts.length) parts.push(`${Math.round(overlap * 100)}% vocabulary overlap`);
        const older = docs[i].meta.date && docs[j].meta.date && docs[i].meta.date! > docs[j].meta.date! ? j : i;
        const newer = older === i ? j : i;
        const hasDates = docs[i].meta.date && docs[j].meta.date && docs[i].meta.date !== docs[j].meta.date;
        lines.push(`  F${hasDates ? older : i} ${conf ? "<-->" : hasDates ? "-->" : "---"}|"${mq(parts.join(" · "))}"| F${hasDates ? newer : j}`);
        notes.push(`${docs[i].name} ↔ ${docs[j].name}: ${parts.join(", ")}`);
      }
    lines.push("  classDef file fill:#fdf6e3,stroke:#1f3a8a,color:#1b2a4a");
    file_relations = {
      mermaid: lines.join("\n"),
      note: notes.length ? "Arrows point from older to newer when both files are dated. " + notes.join(" · ") : "No strong relations detected between the files.",
    };
  }

  const totalWordsAll = docs.reduce((a, d) => a + d.words, 0);
  const totalPages = docs.some((d) => d.pages) ? docs.reduce((a, d) => a + (d.pages || 0), 0) : null;
  const cjk = (docs.map((d) => d.contentMd).join("").match(/[\u3400-\u9fff]/g) || []).length;
  const lang = cjk > totalWordsAll * 0.2 ? "zh" : "en";
  const title = opts.title && multi ? opts.title : c.title[0] || docs[0].name;

  const model: Model = {
    meta: {
      title: clip(title, 120),
      content_lang: lang,
      ui_lang: opts.uiLang,
      generated_at: new Date().toISOString().slice(0, 10),
      stats: { file_count: docs.length, total_pages: totalPages, total_words: totalWordsAll, reading_minutes: Math.max(1, Math.round(totalWordsAll / 230)) },
      executive_summary: summarySents.map((s) => s.text),
      executive_summary_sources: summarySents.map((s) => refsOf(c, s)),
      one_liner: verdict ? verdict.text : null,
      one_liner_sources: verdict ? refsOf(c, verdict) : [],
      reading_goal: goal || null,
      engine: "built-in extractive engine",
      schema_version: 2,
    },
    files,
    file_relations,
    highlights,
    conflicts,
    keypoints,
    diagrams,
    charts,
    quotes,
    outline,
    chapters,
  };
  model.distillation_report = computeReport(model, docs, {
    sectionsTotal: c.all.length,
    sectionsMapped: mapped.size,
    unmapped,
    derived,
    unverified: countUnverified(model),
  });
  void isHedged;
  void extractFacts;
  void IMP_RANK;
  void refKey;
  return { model, sectionsTotal: c.all.length, sectionsMapped: mapped.size, unmapped };
}
