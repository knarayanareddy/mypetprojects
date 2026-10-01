// Helpers shared by the engine, fact-checker, validator and renderer.

import type { Block, DistillationReport, Model, SourceRef, WorkDoc } from "./types";
import { blockText, parseMd, type MdBlock } from "./mdparse";
import { countWords, extractFacts, isHedged } from "./text";

// ---------- document index (the "workspace" ground truth) ----------

export class DocIndex {
  blocks: MdBlock[];
  constructor(public doc: WorkDoc) {
    this.blocks = parseMd(doc.contentMd);
  }

  get maxUnit(): number {
    let m = 0;
    for (const b of this.blocks) if (b.unit > m) m = b.unit;
    return m;
  }

  get fullText(): string {
    return this.blocks.map(blockText).join("\n");
  }

  unitText(unit: number): string {
    return this.blocks
      .filter((b) => b.unit === unit)
      .map(blockText)
      .join("\n");
  }

  sectionText(title: string): string | null {
    const idx = this.blocks.findIndex((b) => b.kind === "heading" && b.text.trim() === title.trim());
    if (idx < 0) return null;
    const lvl = (this.blocks[idx] as Extract<MdBlock, { kind: "heading" }>).level;
    const out: string[] = [];
    for (let i = idx; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      if (i > idx && b.kind === "heading" && b.level <= lvl) break;
      out.push(blockText(b));
    }
    return out.join("\n");
  }

  /** Text that a SourceRef points to (null if the locator can't be resolved). */
  textFor(ref: SourceRef): string | null {
    if (ref.page != null) {
      const t = this.unitText(ref.page);
      return t || null;
    }
    if (ref.loc) {
      const loc = ref.loc.replace(/^§\s*/, "");
      const sheet = /^Sheet\s+(.+)$/i.exec(ref.loc);
      if (sheet) {
        const t = this.blocks
          .filter((b) => b.unitLabel && b.unitLabel.toLowerCase() === ref.loc!.toLowerCase())
          .map(blockText)
          .join("\n");
        return t || null;
      }
      const slide = /^Slide\s+(\d+)$/i.exec(ref.loc);
      if (slide) return this.unitText(parseInt(slide[1], 10)) || null;
      return this.sectionText(loc);
    }
    return null;
  }
}

export function refLabel(ref: SourceRef, files: { id: string; name: string }[]): string {
  const f = files.find((x) => x.id === ref.file_id);
  const name = f ? f.name.replace(/\.[A-Za-z0-9]+$/, "") : ref.file_id;
  const where = ref.page != null ? `p.${ref.page}` : ref.loc || "";
  return where ? `${name} · ${where}` : name;
}

// ---------- claims ----------

export interface Claim {
  id: string;
  kind: string;
  text: string;
  sources: SourceRef[];
  mark?: () => void;
}

export function* iterClaims(model: Model): Generator<Claim> {
  let n = 0;
  const id = (k: string) => `${k}-${++n}`;
  if (model.meta.one_liner)
    yield { id: id("verdict"), kind: "verdict", text: model.meta.one_liner, sources: model.meta.one_liner_sources || [] };
  for (let i = 0; i < model.meta.executive_summary.length; i++)
    yield {
      id: id("summary"),
      kind: "summary",
      text: model.meta.executive_summary[i],
      sources: model.meta.executive_summary_sources?.[i] || [],
    };
  for (const h of model.highlights || [])
    yield {
      id: id("metric"),
      kind: "metric",
      text: `${h.value} ${h.label}`,
      sources: h.sources || [],
      mark: () => {
        h.sub = h.sub && !/unverified/.test(h.sub) ? `${h.sub} · unverified` : "unverified";
      },
    };
  for (const k of model.keypoints || [])
    yield { id: id("keypoint"), kind: "keypoint", text: k.text, sources: k.sources, mark: () => (k.unverified = true) };
  for (const c of model.conflicts || [])
    for (const p of c.positions) yield { id: id("conflict"), kind: "conflict", text: p.value, sources: [p.source] };
  for (const q of model.quotes || []) yield { id: id("quote"), kind: "quote", text: q.text, sources: [q.source] };
  for (const d of model.diagrams || [])
    for (const e of d.evidence || []) yield { id: id("edge"), kind: "diagram-edge", text: e.text, sources: [e.source] };
  for (const ch of model.charts || [])
    if (!ch.derived) yield { id: id("chart"), kind: "chart", text: ch.title, sources: ch.sources };
  function* blocks(bs: Block[], inherited: SourceRef[]): Generator<Claim> {
    for (const b of bs) {
      switch (b.type) {
        case "paragraph":
          yield { id: id("para"), kind: "paragraph", text: b.md, sources: b.sources?.length ? b.sources : inherited };
          break;
        case "callout":
          yield { id: id("callout"), kind: "callout", text: b.md, sources: b.sources?.length ? b.sources : inherited };
          break;
        case "keypoints":
          for (const it of b.items)
            yield {
              id: id("point"),
              kind: "chapter-point",
              text: it.text,
              sources: it.sources?.length ? it.sources : inherited,
              mark: () => (it.unverified = true),
            };
          break;
        case "metric":
          for (const it of b.items)
            yield { id: id("cmetric"), kind: "metric", text: `${it.value} ${it.label}`, sources: it.sources?.length ? it.sources : b.sources || inherited };
          break;
        case "quote":
          if ("text" in b) yield { id: id("iquote"), kind: "quote", text: b.text, sources: b.source ? [b.source] : inherited };
          break;
        case "table":
          yield {
            id: id("table"),
            kind: "table",
            text: [b.headers.join(" "), ...b.rows.map((r) => r.join(" "))].join(" "),
            sources: b.sources?.length ? b.sources : inherited,
          };
          break;
        case "subsections":
          for (const s of b.items) yield* blocks(s.blocks, s.sources?.length ? s.sources : inherited);
          break;
        default:
          break;
      }
    }
  }
  for (const ch of model.chapters) yield* blocks(ch.blocks, ch.sources);
}

// ---------- word counts / report ----------

export function modelWords(model: Model): number {
  let words = 0;
  const add = (s?: string | null) => {
    if (s) words += countWords(s);
  };
  add(model.meta.one_liner);
  model.meta.executive_summary.forEach(add);
  for (const h of model.highlights || []) {
    add(h.value);
    add(h.label);
    add(h.sub);
  }
  for (const k of model.keypoints || []) add(k.text);
  for (const c of model.conflicts || []) {
    add(c.topic);
    add(c.resolution);
    c.positions.forEach((p) => add(p.value));
  }
  for (const q of model.quotes || []) add(q.text);
  for (const d of model.diagrams || []) add(d.caption);
  for (const c of model.charts || []) add(c.caption);
  function blocks(bs: Block[]) {
    for (const b of bs) {
      switch (b.type) {
        case "paragraph":
          add(b.md);
          break;
        case "callout":
          add(b.title);
          add(b.md);
          break;
        case "keypoints":
          b.items.forEach((i) => add(i.text));
          break;
        case "metric":
          b.items.forEach((i) => {
            add(i.value);
            add(i.label);
          });
          break;
        case "quote":
          if ("text" in b) add(b.text);
          break;
        case "table":
          b.headers.forEach(add);
          b.rows.forEach((r) => r.forEach(add));
          break;
        case "subsections":
          b.items.forEach((s) => blocks(s.blocks));
          break;
        default:
          break;
      }
    }
  }
  for (const ch of model.chapters) blocks(ch.blocks);
  return words;
}

export function computeReport(
  model: Model,
  docs: WorkDoc[],
  extra: {
    sectionsTotal?: number;
    sectionsMapped?: number;
    unmapped?: string[];
    derived?: number;
    unverified?: number;
    factCheck?: string | null;
    factItems?: DistillationReport["fact_check_items"];
  } = {}
): DistillationReport {
  const srcWords = docs.reduce((a, d) => a + d.words, 0);
  const mw = modelWords(model);
  let claims = 0;
  let withSrc = 0;
  let dataPoints = 0;
  for (const c of iterClaims(model)) {
    claims++;
    if (c.sources.length) withSrc++;
    dataPoints += extractFacts(c.text).length;
  }
  for (const ch of model.charts || []) {
    const ds = (ch.chartjs.data as { datasets?: { data?: unknown[] }[] }).datasets || [];
    for (const d of ds) dataPoints += (d.data || []).length;
  }
  dataPoints = Math.max(dataPoints, 1);
  const todo = extra.unverified ?? 0;
  const ratio = mw > 0 ? Math.round((srcWords / mw) * 10) / 10 : null;
  const prev = model.distillation_report || {};
  const sectionsTotal = extra.sectionsTotal ?? prev.sections_total ?? null;
  const sectionsMapped = extra.sectionsMapped ?? prev.sections_mapped ?? null;
  const pct = Math.round((todo / dataPoints) * 1000) / 10;
  return {
    source_words: srcWords,
    model_words: mw,
    compression_ratio_x: ratio,
    compression_ratio: ratio ? `≈ ${ratio}:1` : null,
    sections_total: sectionsTotal,
    sections_mapped: sectionsMapped,
    section_coverage: sectionsTotal != null ? `${sectionsMapped}/${sectionsTotal} source sections mapped` : null,
    claims_total: claims,
    claims_with_source_count: withSrc,
    claims_with_source: `${claims ? Math.round((withSrc / claims) * 100) : 100}% (${claims - withSrc} without a source)`,
    todo_count: todo,
    data_points: dataPoints,
    todo_ratio: `${todo} to verify / ${dataPoints} data points ≈ ${pct}%`,
    derived_numbers: extra.derived ?? prev.derived_numbers ?? 0,
    unmapped_source_blocks: extra.unmapped ?? prev.unmapped_source_blocks ?? [],
    fact_check: extra.factCheck ?? prev.fact_check ?? null,
    fact_check_items: extra.factItems ?? prev.fact_check_items ?? [],
  };
}

export function countUnverified(model: Model): number {
  let n = 0;
  for (const k of model.keypoints || []) if (k.unverified) n++;
  const walk = (bs: Block[]) => {
    for (const b of bs) {
      if (b.type === "keypoints") n += b.items.filter((i) => i.unverified).length;
      if (b.type === "subsections") b.items.forEach((s) => walk(s.blocks));
      if (b.type === "callout" && isHedged(b.md) && b.tone === "warn" && /to verify/i.test(b.title || "")) n++;
    }
  };
  model.chapters.forEach((c) => walk(c.blocks));
  return n;
}
