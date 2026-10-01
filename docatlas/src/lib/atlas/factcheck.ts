// Stage 3 — adversarial fact-check. Every claim is taken back to the *original* text
// (the workspace ground truth) and tried to be refuted: numbers must be present on the cited
// page, wording must be supported, derived numbers are recomputed, and high-value source facts
// that the model silently dropped are recovered.

import { DocIndex, iterClaims, modelWords, refLabel, type Claim } from "./model-utils";
import { buildCorpus } from "./sections";
import type { FactCheckItem, KeyPoint, Model, SourceRef, WorkDoc } from "./types";
import { clip, jaccard, numberTokens, overlapShare, tokenSet } from "./text";
import { sentRef, uniqRefs } from "./sections";

export interface FactCheckResult {
  items: FactCheckItem[];
  summary: string;
  checked: number;
  confirmed: number;
  corrected: number;
  flagged: number;
  recovered: number;
}

function bestUnit(idx: DocIndex, claim: string): { unit: number; cov: number } | null {
  const max = idx.maxUnit;
  if (!max) return null;
  const ct = tokenSet(claim);
  const nums = numberTokens(claim);
  let best: { unit: number; cov: number } | null = null;
  for (let u = 1; u <= max; u++) {
    const t = idx.unitText(u);
    if (!t) continue;
    const have = new Set(numberTokens(t));
    if (!nums.every((n) => have.has(n))) continue;
    const cov = overlapShare(ct, tokenSet(t));
    if (!best || cov > best.cov) best = { unit: u, cov };
  }
  return best;
}

export function factCheck(model: Model, docs: WorkDoc[]): FactCheckResult {
  const index = new Map(docs.map((d) => [d.fileId, new DocIndex(d)]));
  const items: FactCheckItem[] = [];
  const files = model.files.map((f) => ({ id: f.id, name: f.name }));
  const seen = new Set<string>();
  let confirmed = 0;
  let corrected = 0;
  let flagged = 0;
  let checked = 0;

  const push = (it: FactCheckItem) => {
    if (items.length < 400) items.push(it);
  };

  for (const claim of iterClaims(model) as Generator<Claim>) {
    const key = claim.kind + "|" + claim.text.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    checked++;
    const ref: SourceRef | undefined = claim.sources[0];
    if (!ref) {
      flagged++;
      claim.mark?.();
      push({ claim: clip(claim.text, 160), verdict: "error", source: null, note: "No source cited — flagged as unverified." });
      continue;
    }
    const idx = index.get(ref.file_id);
    if (!idx) {
      flagged++;
      claim.mark?.();
      push({ claim: clip(claim.text, 160), verdict: "error", source: ref, note: `Cited file ${ref.file_id} does not exist.` });
      continue;
    }
    if (claim.kind === "chart") continue;
    const nums = numberTokens(claim.text.replace(/“[^”]*”/g, (m) => m)); // include quoted context
    const unitText = idx.textFor(ref);
    const full = idx.fullText;
    const fullNums = new Set(claim.sources.flatMap((r) => numberTokens(index.get(r.file_id)?.fullText || "")));
    for (const n of numberTokens(full)) fullNums.add(n);
    const claimToks = tokenSet(claim.text);

    // all cited sources may support the claim (merged duplicates cite several)
    const texts = claim.sources.map((s) => index.get(s.file_id)?.textFor(s)).filter(Boolean) as string[];
    const supportText = texts.join("\n") || unitText || full;
    const unitNums = new Set(numberTokens(supportText));
    const missingInUnit = nums.filter((n) => !unitNums.has(n));
    const missingInDoc = nums.filter((n) => !fullNums.has(n));
    const cov = supportText ? overlapShare(claimToks, tokenSet(supportText)) : 0;

    if (missingInDoc.length && claim.kind !== "paragraph") {
      flagged++;
      claim.mark?.();
      push({
        claim: clip(claim.text, 160),
        verdict: "error",
        source: ref,
        note: `Number${missingInDoc.length > 1 ? "s" : ""} ${missingInDoc.slice(0, 3).join(", ")} not found anywhere in ${files.find((f) => f.id === ref.file_id)?.name}. Flagged as unverified.`,
      });
      continue;
    }
    if (!supportText || missingInUnit.length || cov < 0.45) {
      // try to relocate the citation
      const b = ref.page != null || idx.maxUnit ? bestUnit(idx, claim.text) : null;
      if (b && b.cov >= 0.6 && (ref.page == null || b.unit !== ref.page)) {
        const old = refLabel(ref, files);
        ref.page = b.unit;
        if (ref.loc && /^Slide/i.test(ref.loc)) ref.loc = `Slide ${b.unit}`;
        corrected++;
        push({ claim: clip(claim.text, 160), verdict: "deviation", source: ref, note: `Citation corrected: ${old} → ${refLabel(ref, files)} (best textual match).` });
        continue;
      }
      if (missingInUnit.length) {
        flagged++;
        claim.mark?.();
        push({
          claim: clip(claim.text, 160),
          verdict: "deviation",
          source: ref,
          note: `Number ${missingInUnit.slice(0, 3).join(", ")} exists in the document but not at the cited location. Flagged as unverified.`,
        });
        continue;
      }
      if (supportText && cov < 0.45) {
        flagged++;
        push({
          claim: clip(claim.text, 160),
          verdict: "deviation",
          source: ref,
          note: `Wording only ${Math.round(cov * 100)}% supported by the cited text — treat as paraphrase.`,
        });
        continue;
      }
    }
    confirmed++;
    push({
      claim: clip(claim.text, 160),
      verdict: "ok",
      source: ref,
      note: nums.length ? `Numbers ${nums.slice(0, 4).join(", ")} found at ${refLabel(ref, files)}.` : `Wording supported at ${refLabel(ref, files)}.`,
    });
  }

  // ---- charts: every plotted value must exist in the cited source
  const keepCharts = [];
  for (const ch of model.charts || []) {
    if (ch.derived) {
      push({ claim: `Chart "${clip(ch.title, 80)}"`, verdict: "ok", source: ch.sources[0] || null, note: "Derived chart: values are recomputed word counts from the workspace." });
      keepCharts.push(ch);
      continue;
    }
    checked++;
    const idx = ch.sources[0] ? index.get(ch.sources[0].file_id) : null;
    const t = idx && ch.sources[0] ? idx.textFor(ch.sources[0]) || idx.fullText : "";
    const have = new Set(numberTokens(t));
    const ds = (ch.chartjs.data as { datasets?: { data?: (number | null)[] }[] }).datasets || [];
    const bad: string[] = [];
    for (const d of ds)
      for (const v of d.data || []) {
        if (v === null || v === undefined) continue;
        const s = String(v);
        if (!have.has(s) && !have.has(String(Math.round(v * 100) / 100)) && !have.has(String(Math.abs(v)))) bad.push(s);
      }
    if (bad.length) {
      flagged++;
      push({ claim: `Chart "${clip(ch.title, 80)}"`, verdict: "error", source: ch.sources[0] || null, note: `Removed: values ${bad.slice(0, 3).join(", ")} not found in the cited table.` });
    } else {
      confirmed++;
      push({ claim: `Chart "${clip(ch.title, 80)}"`, verdict: "ok", source: ch.sources[0] || null, note: "Every plotted value matches the source table." });
      keepCharts.push(ch);
    }
  }
  model.charts = keepCharts;

  // ---- derived numbers recomputed from ground truth
  const srcWords = docs.reduce((a, d) => a + d.words, 0);
  const pages = docs.some((d) => d.pages) ? docs.reduce((a, d) => a + (d.pages || 0), 0) : null;
  const derivedChecks: [string, number | null | undefined, number | null][] = [
    ["Total source words", model.meta.stats.total_words, srcWords],
    ["Total pages", model.meta.stats.total_pages, pages],
    ["File count", model.meta.stats.file_count, docs.length],
    ["Reading minutes (words ÷ 230)", model.meta.stats.reading_minutes, Math.max(1, Math.round(srcWords / 230))],
  ];
  for (const [label, got, want] of derivedChecks) {
    checked++;
    if ((got ?? null) === want) {
      confirmed++;
      push({ claim: `${label} = ${want ?? "n/a"}`, verdict: "ok", source: null, note: "Recomputed from the workspace — matches." });
    } else {
      corrected++;
      push({ claim: `${label} = ${got ?? "n/a"}`, verdict: "deviation", source: null, note: `Recomputed from the workspace: ${want ?? "n/a"}. Corrected.` });
      if (label.startsWith("Total source")) model.meta.stats.total_words = want;
      if (label.startsWith("Total pages")) model.meta.stats.total_pages = want;
      if (label.startsWith("File")) model.meta.stats.file_count = want ?? docs.length;
      if (label.startsWith("Reading")) model.meta.stats.reading_minutes = want;
    }
  }
  for (const f of model.files) {
    const d = docs.find((x) => x.fileId === f.id);
    if (d && (f.pages !== d.pages || f.words !== d.words)) {
      f.pages = d.pages;
      f.words = d.words;
      corrected++;
      push({ claim: `File entry ${f.name}`, verdict: "deviation", source: null, note: "Page/word counts reconciled with the workspace." });
    }
  }

  // ---- omissions: high-value numeric source sentences not represented anywhere in the model
  const goal = model.meta.reading_goal || "";
  const corpus = buildCorpus(docs, goal);
  const texts: { set: Set<string>; nums: Set<string> }[] = [];
  for (const c of iterClaims(model)) texts.push({ set: tokenSet(c.text), nums: new Set(numberTokens(c.text)) });
  for (const f of model.highlights || []) texts.push({ set: tokenSet(f.label), nums: new Set(numberTokens(f.value)) });
  const candidates = corpus.sents
    .filter((s) => !s.dupe && !s.fragment && s.pct >= 0.85 && s.facts.some((f) => f.unit !== "date"))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  let recovered = 0;
  const recoveredKps: KeyPoint[] = [];
  for (const s of candidates) {
    if (recovered >= 3) break;
    const sn = numberTokens(s.text);
    const covered = texts.some((t) => {
      const jac = jaccard(t.set, s.tokens);
      return jac >= 0.45 || (sn.length > 0 && sn.every((n) => t.nums.has(n)) && jac >= 0.2);
    });
    checked++;
    if (covered) {
      confirmed++;
      continue;
    }
    const ref = sentRef(corpus, s);
    const kp: KeyPoint = {
      id: `k${(model.keypoints?.length || 0) + recoveredKps.length + 1}`,
      text: s.text,
      kind: "recovered",
      importance: "medium",
      sources: uniqRefs([ref, ...s.alsoIn], 3),
      unverified: s.hedged ? true : undefined,
    };
    recoveredKps.push(kp);
    texts.push({ set: s.tokens, nums: new Set(sn) });
    recovered++;
    push({
      claim: clip(s.text, 160),
      verdict: "missing",
      source: ref,
      note: "High-value fact present in the source but absent from the dashboard — recovered into Key points.",
    });
  }
  if (recoveredKps.length) model.keypoints = [...(model.keypoints || []), ...recoveredKps];

  const parts = [`${checked} claims checked`, `${confirmed} confirmed`];
  if (corrected) parts.push(`${corrected} corrected`);
  if (flagged) parts.push(`${flagged} flagged`);
  if (recovered) parts.push(`${recovered} omission${recovered > 1 ? "s" : ""} recovered`);
  void modelWords;
  return { items, summary: parts.join(" · "), checked, confirmed, corrected, flagged, recovered };
}
