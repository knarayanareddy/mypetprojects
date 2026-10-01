// Orchestrates stages 2–4: consolidate → adversarial fact-check → validation gate.

import { distill } from "./distill";
import { factCheck } from "./factcheck";
import { distillWithLLM, llmProvider } from "./llm";
import { computeReport, countUnverified } from "./model-utils";
import { validateModel } from "./validate";
import type { FactCheckItem, LogLine, Model, ValidationResult, WorkDoc } from "./types";

export interface PipelineResult {
  model: Model;
  factcheck: { summary: string; items: FactCheckItem[] };
  validation: ValidationResult;
  log: LogLine[];
}

export async function runPipeline(
  docs: WorkDoc[],
  opts: { goal: string; uiLang: string; title?: string; engine: string }
): Promise<PipelineResult> {
  const log: LogLine[] = [];
  const say = (stage: string, status: LogLine["status"], message: string) => log.push({ stage, status, message, at: new Date().toISOString() });

  const totalWords = docs.reduce((a, d) => a + d.words, 0);
  say("normalize", "ok", `${docs.length} file(s) normalized — ${totalWords.toLocaleString("en-US")} words in the workspace`);
  for (const d of docs) for (const w of d.meta.warnings) say("normalize", "warn", `${d.name}: ${w}`);

  let out;
  const wantLLM = opts.engine === "llm" || (opts.engine === "auto" && llmProvider());
  if (wantLLM && llmProvider()) {
    try {
      out = await distillWithLLM(docs, opts);
      say("consolidate", "ok", `LLM judgement layer (${llmProvider()}) + deterministic structure engine`);
    } catch (e) {
      say("consolidate", "warn", `${(e as Error).message} — falling back to the built-in engine`);
      out = distill(docs, opts);
    }
  } else {
    if (opts.engine === "llm") say("consolidate", "warn", "No LLM API key configured — using the built-in engine");
    out = distill(docs, opts);
  }
  const model = out.model;
  say(
    "consolidate",
    "ok",
    `${model.outline.length} chapters · ${model.keypoints?.length || 0} key points · ${model.conflicts?.length || 0} conflicts · ${model.diagrams?.length || 0} diagram(s) · ${model.charts?.length || 0} chart(s)`
  );
  if (docs.length > 1) say("consolidate", "info", `Cross-file merge: ${docs.length} files → ${model.outline.length} unified themes, ${model.conflicts?.length || 0} conflict(s) surfaced`);

  const fc = factCheck(model, docs);
  say("factcheck", fc.flagged ? "warn" : "ok", fc.summary);

  const report = computeReport(model, docs, {
    sectionsTotal: out.sectionsTotal,
    sectionsMapped: out.sectionsMapped,
    unmapped: out.unmapped,
    derived: model.distillation_report?.derived_numbers ?? 0,
    unverified: countUnverified(model),
    factCheck: fc.summary,
    factItems: fc.items,
  });
  model.distillation_report = report;

  const validation = validateModel(model, docs);
  say("validate", validation.ok ? "ok" : "error", validation.ok ? `All gates passed (${validation.warnings} warning${validation.warnings === 1 ? "" : "s"})` : `${validation.errors} error(s) — see the validation gates`);
  say("render", "ok", "Single-file dashboard compiled (Chart.js + Mermaid inlined for offline use)");

  return { model, factcheck: { summary: fc.summary, items: fc.items }, validation, log };
}
