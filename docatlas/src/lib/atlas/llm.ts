// Optional LLM engine. When an API key is configured (OPENAI_API_KEY or ANTHROPIC_API_KEY) the
// model writes the *judgement* layer — verdict, summary, key points, metrics, conflicts, logic
// diagram and chapter briefs — while the deterministic engine keeps providing structure, tables,
// charts and file relations. Everything the LLM writes is then fact-checked against the sources.

import { distill, type DistillOptions, type DistillOutput } from "./distill";
import { DocIndex } from "./model-utils";
import type { Conflict, Diagram, Importance, KeyPoint, MetricItem, Model, SourceRef, WorkDoc } from "./types";
import { clip } from "./text";

export function llmProvider(): "openai" | "anthropic" | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

async function callLLM(system: string, user: string): Promise<string> {
  const provider = llmProvider();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 150_000);
  try {
    if (provider === "openai") {
      const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return j.choices?.[0]?.message?.content || "";
    }
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
          max_tokens: 8000,
          temperature: 0.2,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const j = (await res.json()) as { content?: { text?: string }[] };
      return j.content?.map((c) => c.text || "").join("") || "";
    }
    throw new Error("No LLM API key configured");
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM = `You are Doc Atlas' consolidation engine. You distil one or more documents into a briefing.
Rules:
- ZERO hallucination. Only state what the documents say. Quote numbers exactly as written.
- Every claim carries sources: [{"file_id": "f1", "page": 3}] (use "loc": "§ Heading" or "Slide 4" or "Sheet X" when there is no page number).
- Merge across files: de-duplicate, and when files disagree on a number/date/conclusion list it under "conflicts" instead of picking one.
- Grade importance (high|medium|low) against the reader's goal.
- If something is uncertain, say so in the text ("the source estimates…").
- Output ONE JSON object only, no prose.`;

function jsonOf(s: string): Record<string, unknown> {
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("LLM did not return JSON");
  return JSON.parse(s.slice(a, b + 1));
}

const asImp = (x: unknown): Importance => (x === "high" || x === "low" ? x : "medium");
const str = (x: unknown): string => (typeof x === "string" ? x.trim() : "");

function refs(x: unknown, docs: WorkDoc[]): SourceRef[] {
  if (!Array.isArray(x)) return [];
  const out: SourceRef[] = [];
  for (const r of x) {
    const o = r as Record<string, unknown>;
    const id = str(o?.file_id);
    if (!docs.some((d) => d.fileId === id)) continue;
    const page = typeof o.page === "number" ? Math.round(o.page) : null;
    const loc = str(o.loc) || null;
    if (page == null && !loc) continue;
    out.push({ file_id: id, ...(page != null ? { page } : {}), ...(loc && page == null ? { loc } : {}) });
  }
  return out;
}

export async function distillWithLLM(docs: WorkDoc[], opts: DistillOptions): Promise<DistillOutput & { note: string }> {
  const base = distill(docs, opts);
  const model: Model = base.model;

  // ---- build the content payload (page anchors preserved)
  const budget = 110_000;
  const per = Math.floor(budget / docs.length);
  const content = docs
    .map((d) => {
      const md = new DocIndex(d).doc.contentMd;
      return `===== FILE ${d.fileId}: ${d.name} (${d.type}${d.pages ? `, ${d.pages} pages` : ""}${d.meta.date ? `, dated ${d.meta.date}` : ""}) =====\n${md.length > per ? md.slice(0, per) + "\n[…truncated…]" : md}`;
    })
    .join("\n\n");
  const outlineList = model.outline.map((o) => `${o.id}: ${o.title}`).join("\n");

  const user = `READER'S GOAL: ${opts.goal || "(none given — give a balanced overview)"}

CHAPTERS (use these ids in chapter_briefs):
${outlineList}

Return JSON with exactly these keys:
{
 "one_liner": "single sentence that answers the reader's goal",
 "one_liner_sources": [SourceRef],
 "executive_summary": ["3-5 sentences"],
 "executive_summary_sources": [[SourceRef]],   // one array per sentence
 "highlights": [{"value":"8 hours","label":"what the number means","sub":"basis or null","importance":"high","sources":[SourceRef]}],   // 4-6
 "keypoints": [{"text":"...","kind":"conclusion|number|risk|action|decision|definition","importance":"high|medium|low","sources":[SourceRef]}],   // 6-10
 "conflicts": [{"topic":"...","positions":[{"value":"...","source":SourceRef}],"resolution":"...or null","confidence":"high|medium|low"}],
 "logic_diagram": {"title":"...","mermaid":"flowchart LR\\n  a[\\"Cause\\"] -->|\\"leads to\\"| b[\\"Effect\\"]","caption":"...","evidence":[{"text":"exact sentence from the source","source":SourceRef}]},
 "chapter_briefs": [{"id":"1","md":"2-3 sentence brief of that chapter","sources":[SourceRef]}]
}

DOCUMENTS:
${content}`;

  let raw: string;
  try {
    raw = await callLLM(SYSTEM, user);
  } catch (e) {
    throw new Error(`LLM call failed: ${(e as Error).message}`);
  }
  const j = jsonOf(raw);

  const ol = str(j.one_liner);
  const olSrc = refs(j.one_liner_sources, docs);
  if (ol && olSrc.length) {
    model.meta.one_liner = ol;
    model.meta.one_liner_sources = olSrc;
  }
  if (Array.isArray(j.executive_summary) && j.executive_summary.length) {
    const sums: string[] = [];
    const srcs: SourceRef[][] = [];
    (j.executive_summary as unknown[]).forEach((s, i) => {
      const t = str(s);
      const r = refs((j.executive_summary_sources as unknown[])?.[i], docs);
      if (t) {
        sums.push(t);
        srcs.push(r);
      }
    });
    if (sums.length) {
      model.meta.executive_summary = sums.slice(0, 5);
      model.meta.executive_summary_sources = srcs.slice(0, 5);
    }
  }
  if (Array.isArray(j.highlights)) {
    const hs: MetricItem[] = [];
    for (const h of j.highlights as Record<string, unknown>[]) {
      if (str(h.value) && str(h.label)) hs.push({ value: str(h.value), label: str(h.label), sub: str(h.sub) || null, importance: asImp(h.importance), sources: refs(h.sources, docs) });
    }
    if (hs.length >= 2) model.highlights = hs.slice(0, 6);
  }
  if (Array.isArray(j.keypoints)) {
    const ks: KeyPoint[] = [];
    for (const k of j.keypoints as Record<string, unknown>[]) {
      if (str(k.text)) ks.push({ id: `k${ks.length + 1}`, text: str(k.text), kind: str(k.kind) || null, importance: asImp(k.importance), sources: refs(k.sources, docs) });
    }
    if (ks.length >= 3) model.keypoints = ks.slice(0, 10);
  }
  if (Array.isArray(j.conflicts)) {
    const cs: Conflict[] = [];
    for (const c of j.conflicts as Record<string, unknown>[]) {
      const pos = (Array.isArray(c.positions) ? (c.positions as Record<string, unknown>[]) : [])
        .map((p) => ({ value: str(p.value), source: refs([p.source], docs)[0] }))
        .filter((p) => p.value && p.source);
      if (str(c.topic) && pos.length >= 2)
        cs.push({ id: `c${cs.length + 1}`, topic: str(c.topic), positions: pos, resolution: str(c.resolution) || null, confidence: asImp(c.confidence) });
    }
    if (cs.length) model.conflicts = cs.slice(0, 8);
  }
  const ld = j.logic_diagram as Record<string, unknown> | undefined;
  if (ld && /^\s*(flowchart|graph)\b/.test(str(ld.mermaid))) {
    const ev = (Array.isArray(ld.evidence) ? (ld.evidence as Record<string, unknown>[]) : [])
      .map((e) => ({ text: str(e.text), source: refs([e.source], docs)[0] }))
      .filter((e) => e.text && e.source);
    if (ev.length) {
      const d: Diagram = {
        id: "d-logic",
        title: str(ld.title) || "Core logic",
        kind: "flowchart",
        mermaid: str(ld.mermaid),
        caption: str(ld.caption) || null,
        sources: ev.map((e) => e.source).slice(0, 6),
        evidence: ev,
      };
      model.diagrams = [d, ...(model.diagrams || []).filter((x) => x.id !== "d-logic")];
    }
  }
  if (Array.isArray(j.chapter_briefs)) {
    for (const b of j.chapter_briefs as Record<string, unknown>[]) {
      const ch = model.chapters.find((c) => c.id === str(b.id));
      const md = str(b.md);
      const r = refs(b.sources, docs);
      if (ch && md && r.length) {
        const first = ch.blocks[0];
        if (first && first.type === "paragraph") ch.blocks[0] = { type: "paragraph", md, sources: r };
        else ch.blocks.unshift({ type: "paragraph", md, sources: r });
      }
    }
  }
  model.meta.engine = `LLM (${llmProvider()}) + built-in structure engine`;
  void clip;
  return { ...base, model, note: "LLM judgement layer applied" };
}
