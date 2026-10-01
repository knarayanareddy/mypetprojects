// Machine validation gate: structure, cross-references, page bounds, distillation thresholds,
// and reconciliation against the workspace ground truth. Nothing is "self-reported".

import { iterClaims, modelWords } from "./model-utils";
import type { Block, Model, OutlineNode, SourceRef, ValidationIssue, ValidationResult, WorkDoc } from "./types";

const IMPORTANCE = new Set(["high", "medium", "low"]);
const MERMAID_START = /^\s*(flowchart|graph|mindmap|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|timeline|gantt|journey|pie|quadrantChart)\b/;

export function validateModel(model: Model, docs: WorkDoc[]): ValidationResult {
  const issues: (ValidationIssue & { gate: string })[] = [];
  const add = (gate: string, level: "error" | "warning", code: string, message: string) => issues.push({ gate, level, code, message });

  // ---- 1. structure
  const S = "Structure";
  if (!model.meta?.title) add(S, "error", "meta.title", "meta.title is required");
  if (!model.meta?.content_lang) add(S, "error", "meta.content_lang", "meta.content_lang is required");
  if (!model.meta?.executive_summary?.length) add(S, "error", "meta.executive_summary", "executive_summary needs at least one sentence");
  if (!model.files?.length) add(S, "error", "files", "files must not be empty");
  if (!model.outline?.length) add(S, "error", "outline", "outline must not be empty");
  if (!model.chapters?.length) add(S, "error", "chapters", "chapters must not be empty");
  const ids = new Set<string>();
  const walkOutline = (nodes: OutlineNode[]) => {
    for (const n of nodes) {
      if (ids.has(n.id)) add(S, "error", "outline.id", `duplicate outline id ${n.id}`);
      ids.add(n.id);
      if (!IMPORTANCE.has(n.importance)) add(S, "error", "outline.importance", `outline ${n.id}: invalid importance`);
      if (n.children) walkOutline(n.children);
    }
  };
  walkOutline(model.outline || []);
  const chapterIds = new Set((model.chapters || []).map((c) => c.id));
  for (const n of model.outline || []) if (!chapterIds.has(n.id)) add(S, "error", "chapters.missing", `top-level outline node ${n.id} has no chapter`);
  for (const c of model.chapters || []) {
    if (!(model.outline || []).some((n) => n.id === c.id)) add(S, "error", "chapters.orphan", `chapter ${c.id} has no outline node`);
    if (!IMPORTANCE.has(c.importance)) add(S, "error", "chapter.importance", `chapter ${c.id}: invalid importance`);
  }
  for (const k of model.keypoints || []) if (!IMPORTANCE.has(k.importance)) add(S, "error", "keypoint.importance", `keypoint ${k.id}: invalid importance`);
  for (const d of model.diagrams || []) {
    if (!MERMAID_START.test(d.mermaid)) add(S, "error", "diagram.syntax", `diagram ${d.id}: not a recognised Mermaid diagram`);
  }
  if (model.file_relations && !MERMAID_START.test(model.file_relations.mermaid)) add(S, "error", "relations.syntax", "file_relations.mermaid is not a recognised Mermaid diagram");
  for (const ch of model.charts || []) {
    const d = (ch.chartjs?.data || {}) as { datasets?: unknown[] };
    if (!ch.chartjs?.type || !Array.isArray(d.datasets) || !d.datasets.length) add(S, "error", "chart.config", `chart ${ch.id}: invalid Chart.js config`);
  }
  for (const c of model.conflicts || []) if (c.positions.length < 2) add(S, "error", "conflict.positions", `conflict ${c.id} needs ≥ 2 positions`);

  // ---- 2. cross references
  const X = "Cross-references";
  const fileIds = new Set((model.files || []).map((f) => f.id));
  const diagIds = new Set((model.diagrams || []).map((d) => d.id));
  const chartIds = new Set((model.charts || []).map((d) => d.id));
  const quoteIds = new Set((model.quotes || []).map((d) => d.id));
  const refs: SourceRef[] = [];
  const collectRefs = (rs?: SourceRef[] | null) => rs?.forEach((r) => refs.push(r));
  const collectNode = (n: OutlineNode) => {
    collectRefs(n.sources);
    n.children?.forEach(collectNode);
  };
  model.outline?.forEach(collectNode);
  collectRefs(model.meta.one_liner_sources);
  model.meta.executive_summary_sources?.forEach(collectRefs);
  model.highlights?.forEach((h) => collectRefs(h.sources));
  model.keypoints?.forEach((k) => collectRefs(k.sources));
  model.conflicts?.forEach((c) => c.positions.forEach((p) => refs.push(p.source)));
  model.quotes?.forEach((q) => refs.push(q.source));
  model.diagrams?.forEach((d) => collectRefs(d.sources));
  model.charts?.forEach((d) => collectRefs(d.sources));
  const assetIds = new Set(docs.flatMap((d) => d.assets.map((a) => `${d.fileId}:${a.id}`)));
  const walkBlocks = (bs: Block[], where: string) => {
    for (const b of bs) {
      switch (b.type) {
        case "paragraph":
        case "callout":
        case "table":
          collectRefs(b.sources);
          break;
        case "keypoints":
          b.items.forEach((i) => collectRefs(i.sources));
          break;
        case "metric":
          collectRefs(b.sources);
          b.items.forEach((i) => collectRefs(i.sources));
          break;
        case "quote":
          if ("quote_id" in b) {
            if (!quoteIds.has(b.quote_id)) add(X, "error", "quote_id", `${where}: unknown quote_id ${b.quote_id}`);
          } else if (b.source) refs.push(b.source);
          break;
        case "diagram":
          if ("diagram_id" in b) {
            if (!diagIds.has(b.diagram_id)) add(X, "error", "diagram_id", `${where}: unknown diagram_id ${b.diagram_id}`);
          } else {
            collectRefs(b.sources);
            if (!MERMAID_START.test(b.mermaid)) add(S, "error", "diagram.syntax", `${where}: inline diagram is not valid Mermaid`);
          }
          break;
        case "chart":
          if ("chart_id" in b) {
            if (!chartIds.has(b.chart_id)) add(X, "error", "chart_id", `${where}: unknown chart_id ${b.chart_id}`);
          } else collectRefs(b.sources);
          break;
        case "image":
          if (!assetIds.has(`${b.file_id}:${b.asset}`)) add(X, "error", "asset", `${where}: image ${b.asset} not found in workspace of ${b.file_id}`);
          collectRefs(b.sources);
          break;
        case "subsections":
          b.items.forEach((s) => {
            collectRefs(s.sources);
            walkBlocks(s.blocks, `${where}/${s.id}`);
          });
          break;
      }
    }
  };
  for (const c of model.chapters || []) {
    collectRefs(c.sources);
    walkBlocks(c.blocks, `chapter ${c.id}`);
  }
  for (const it of model.distillation_report?.fact_check_items || []) if (it.source) refs.push(it.source);
  let badFile = 0;
  for (const r of refs) if (!fileIds.has(r.file_id)) badFile++;
  if (badFile) add(X, "error", "source.file_id", `${badFile} source reference(s) point to an unknown file_id`);
  for (const r of refs) if (r.page == null && !r.loc) add(X, "warning", "source.locator", `a source reference to ${r.file_id} has neither page nor loc`);

  // ---- 3. page bounds
  const P = "Page bounds";
  let oob = 0;
  for (const r of refs) {
    if (r.page == null) continue;
    const d = docs.find((x) => x.fileId === r.file_id);
    if (!d) continue;
    const max = d.pages ?? d.meta.units ?? 0;
    if (!Number.isInteger(r.page) || r.page < 1 || (max && r.page > max)) {
      oob++;
      if (oob <= 5) add(P, "error", "page.bounds", `${d.name}: page ${r.page} is outside 1–${max || "?"}`);
    }
  }
  if (oob > 5) add(P, "error", "page.bounds", `…and ${oob - 5} more out-of-range page references`);

  // ---- 4. distillation thresholds
  const D = "Distillation thresholds";
  const rep = model.distillation_report;
  let claims = 0;
  let withSrc = 0;
  for (const c of iterClaims(model)) {
    claims++;
    if (c.sources.length) withSrc++;
  }
  if (rep) {
    if (rep.sections_total != null && rep.sections_mapped !== rep.sections_total)
      add(D, "error", "coverage", `section coverage ${rep.sections_mapped}/${rep.sections_total} — must be 100%`);
    if (rep.todo_count != null && rep.data_points) {
      const r = rep.todo_count / rep.data_points;
      if (r > 0.1) add(D, "error", "todo.ratio", `${rep.todo_count} to-verify / ${rep.data_points} data points = ${(r * 100).toFixed(1)}% (limit 10%)`);
    }
    const x = rep.compression_ratio_x;
    const srcW = rep.source_words ?? 0;
    if (x != null && srcW >= 400) {
      if (x < 2 && srcW >= 3000) add(D, "warning", "compression.low", `compression ${x}:1 is below 2:1 — the page may be copying the source rather than distilling it`);
      if (x > 15) add(D, "warning", "compression.high", `compression ${x}:1 is above 15:1 — material may have been omitted`);
    }
  } else add(D, "warning", "report.missing", "no distillation report present");
  if (claims !== withSrc) add(D, "error", "claims.source", `${claims - withSrc} claim(s) carry no source — source rate must be 100%`);

  // ---- 5. ground truth
  const G = "Ground truth";
  const srcWords = docs.reduce((a, d) => a + d.words, 0);
  if (model.meta.stats.file_count !== docs.length) add(G, "error", "stats.files", `stats.file_count=${model.meta.stats.file_count} but workspace has ${docs.length}`);
  if ((model.meta.stats.total_words ?? srcWords) !== srcWords) add(G, "error", "stats.words", `stats.total_words=${model.meta.stats.total_words} but workspace has ${srcWords}`);
  for (const f of model.files || []) {
    const d = docs.find((x) => x.fileId === f.id);
    if (!d) {
      add(G, "error", "files.unknown", `file ${f.id} is not in the workspace`);
      continue;
    }
    if (d.pages != null && f.pages !== d.pages) add(G, "error", "files.pages", `${f.name}: model says ${f.pages} pages, source has ${d.pages}`);
    if (f.words != null && Math.abs(f.words - d.words) > Math.max(5, d.words * 0.02)) add(G, "error", "files.words", `${f.name}: model says ${f.words} words, source has ${d.words}`);
  }
  if (rep?.source_words != null && rep.source_words !== srcWords) add(G, "error", "report.source_words", `report.source_words=${rep.source_words}, workspace=${srcWords}`);
  const mw = modelWords(model);
  if (rep?.model_words != null && Math.abs(rep.model_words - mw) > Math.max(10, mw * 0.05))
    add(G, "error", "report.model_words", `report.model_words=${rep.model_words}, recounted=${mw}`);
  for (const d of docs) if (d.words < 5) add(G, "warning", "doc.empty", `${d.name} yielded almost no text${d.meta.scannedPages?.length ? " (scanned PDF without OCR)" : ""}`);

  const gateNames = [S, X, P, D, G];
  const gates = gateNames.map((name) => {
    const here = issues.filter((i) => i.gate === name);
    const errs = here.filter((i) => i.level === "error").length;
    const warns = here.length - errs;
    return { name, pass: errs === 0, detail: errs ? `${errs} error${errs > 1 ? "s" : ""}` : warns ? `passed with ${warns} warning${warns > 1 ? "s" : ""}` : "passed" };
  });
  const errors = issues.filter((i) => i.level === "error").length;
  return {
    ok: errors === 0,
    errors,
    warnings: issues.length - errors,
    issues: issues.map(({ level, code, message }) => ({ level, code, message })),
    gates,
  };
}
