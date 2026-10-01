// Turns normalized documents into a section tree of scored sentences, tables and images.

import { parseMd, type MdBlock } from "./mdparse";
import type { SourceRef, WorkDoc } from "./types";
import { clip, countWords, extractFacts, isHedged, jaccard, splitSentences, tokenSet, tokens, type Fact } from "./text";

export interface Sent {
  id: number;
  text: string;
  fileId: string;
  docIdx: number;
  unit: number;
  loc: string | null;
  secKey: string;
  first: boolean;
  facts: Fact[];
  tokens: Set<string>;
  hedged: boolean;
  fragment: boolean;
  quote: boolean;
  score: number;
  pct: number;
  alsoIn: SourceRef[];
  dupe: boolean;
}

export interface TableItem {
  fileId: string;
  docIdx: number;
  headers: string[];
  rows: string[][];
  unit: number;
  loc: string | null;
  secKey: string;
  title: string;
}

export interface ImageItem {
  fileId: string;
  asset: string;
  alt: string;
  unit: number;
  loc: string | null;
  secKey: string;
}

export interface Section {
  key: string;
  fileId: string;
  docIdx: number;
  level: number;
  title: string;
  parent: Section | null;
  children: Section[];
  sents: Sent[];
  tables: TableItem[];
  images: ImageItem[];
  quotes: { text: string; unit: number; loc: string | null }[];
  words: number;
  startUnit: number;
  endUnit: number;
  score: number;
  synthetic?: boolean;
}

export interface Corpus {
  docs: WorkDoc[];
  roots: Section[][]; // per doc
  all: Section[];
  sents: Sent[];
  title: string[]; // doc titles
}

export function makeRef(doc: WorkDoc, unit: number, loc: string | null): SourceRef {
  if (doc.meta.unitKind === "page" && unit > 0) return { file_id: doc.fileId, page: unit };
  if (doc.meta.unitKind === "slide" && unit > 0) return { file_id: doc.fileId, page: unit, loc: `Slide ${unit}` };
  if (loc) return { file_id: doc.fileId, loc };
  return { file_id: doc.fileId, loc: "§ " + doc.name.replace(/\.[A-Za-z0-9]+$/, "") };
}

export function sentRef(corpus: Corpus, s: Sent): SourceRef {
  return makeRef(corpus.docs[s.docIdx], s.unit, s.loc);
}

export function refKey(r: SourceRef): string {
  return `${r.file_id}|${r.page ?? ""}|${r.loc ?? ""}`;
}

export function uniqRefs(refs: SourceRef[], max = 4): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const r of refs) {
    const k = refKey(r);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  }
  return out.slice(0, max);
}

let sentCounter = 0;

function buildDoc(doc: WorkDoc, docIdx: number, all: Section[], sents: Sent[]): { roots: Section[]; title: string } {
  const blocks = parseMd(doc.contentMd);
  const heads = blocks.filter((b): b is Extract<MdBlock, { kind: "heading" }> => b.kind === "heading");
  const docBase = doc.name.replace(/\.[A-Za-z0-9]+$/, "");
  let title = docBase;
  let skip: MdBlock | null = null;
  let minLevel = heads.length ? Math.min(...heads.map((h) => h.level)) : 1;
  if (heads.length > 1) {
    const atMin = heads.filter((h) => h.level === minLevel);
    const firstHead = blocks.find((b) => b.kind === "heading");
    if (atMin.length === 1 && firstHead === atMin[0]) {
      skip = atMin[0];
      title = atMin[0].text;
      minLevel = Math.min(...heads.filter((h) => h !== skip).map((h) => h.level));
    }
  } else if (heads.length === 1) {
    title = heads[0].text;
  }

  const roots: Section[] = [];
  const stack: Section[] = [];
  let seq = 0;
  const mk = (level: number, t: string, parent: Section | null): Section => {
    const s: Section = {
      key: `${doc.fileId}:s${++seq}`,
      fileId: doc.fileId,
      docIdx,
      level,
      title: t,
      parent,
      children: [],
      sents: [],
      tables: [],
      images: [],
      quotes: [],
      words: 0,
      startUnit: 0,
      endUnit: 0,
      score: 0,
    };
    all.push(s);
    if (parent) parent.children.push(s);
    else roots.push(s);
    return s;
  };

  let preamble: Section | null = null;
  const current = (): Section => {
    if (stack.length) return stack[stack.length - 1];
    if (!preamble) preamble = mk(1, skip || !heads.length ? title : "Overview", null);
    return preamble;
  };

  const locFor = (b: MdBlock, sec: Section): string | null => {
    if (b.unitLabel && doc.meta.unitKind === "sheet") return b.unitLabel;
    return "§ " + sec.title;
  };

  for (const b of blocks) {
    if (b === skip) continue;
    if (b.kind === "heading") {
      const eff = Math.max(1, Math.min(3, b.level - minLevel + 1));
      while (stack.length && stack[stack.length - 1].level >= eff) stack.pop();
      const parent = stack.length ? stack[stack.length - 1] : null;
      // preamble becomes the first root; headings after it are independent roots
      const s = mk(eff, b.text, parent);
      s.startUnit = b.unit;
      stack.push(s);
      continue;
    }
    const sec = current();
    const loc = locFor(b, sec);
    const unit = b.unit;
    const words = countWords(blockText2(b));
    sec.words += words;
    if (unit) {
      sec.startUnit = sec.startUnit ? Math.min(sec.startUnit, unit) : unit;
      sec.endUnit = Math.max(sec.endUnit, unit);
    }
    if (b.kind === "table") {
      sec.tables.push({ fileId: doc.fileId, docIdx, headers: b.headers, rows: b.rows, unit, loc, secKey: sec.key, title: sec.title });
      continue;
    }
    if (b.kind === "image") {
      sec.images.push({ fileId: doc.fileId, asset: b.asset, alt: b.alt, unit, loc, secKey: sec.key });
      continue;
    }
    if (b.kind === "code") continue;
    const pieces: string[] = [];
    if (b.kind === "list") for (const it of b.items) pieces.push(...(countWords(it) > 45 ? splitSentences(it) : [it]));
    else pieces.push(...splitSentences(b.text));
    if (b.kind === "quote") sec.quotes.push({ text: b.text, unit, loc });
    let first = sec.sents.length === 0;
    for (const p of pieces) {
      const text = p.replace(/^[•\-–*]\s*/, "").trim();
      const wc = countWords(text);
      if (wc < 4 || !/[\p{L}]/u.test(text)) continue;
      const s: Sent = {
        id: sentCounter++,
        text,
        fileId: doc.fileId,
        docIdx,
        unit,
        loc,
        secKey: sec.key,
        first,
        facts: extractFacts(text),
        tokens: tokenSet(text),
        hedged: isHedged(text),
        fragment: b.kind === "list" || (!/[.!?。]["”')]?$/.test(text) && wc < 9),
        quote: b.kind === "quote",
        score: 0,
        pct: 0,
        alsoIn: [],
        dupe: false,
      };
      first = false;
      sec.sents.push(s);
      sents.push(s);
    }
  }

  // A tiny preamble (author / date line) is folded into the first real section instead of becoming a chapter
  if (preamble && roots.length > 1) {
    const pre = preamble as Section;
    if (pre.words < 25 && !pre.tables.length) {
      const next = roots.find((r) => r !== pre)!;
      for (const x of pre.sents) {
        x.secKey = next.key;
        x.first = false;
      }
      next.sents.unshift(...pre.sents);
      next.words += pre.words;
      roots.splice(roots.indexOf(pre), 1);
      all.splice(all.indexOf(pre), 1);
    }
  }

  // No headings at all: chunk into synthetic sections
  const secCount = all.filter((s) => s.docIdx === docIdx).length;
  if (!roots.length || (secCount <= 1 && doc.words > 400)) {
    return { roots: chunkDoc(doc, docIdx, blocks, all, sents, title, roots), title };
  }
  return { roots, title };
}

function blockText2(b: MdBlock): string {
  if (b.kind === "table") return [b.headers.join(" "), ...b.rows.map((r) => r.join(" "))].join(" ");
  if (b.kind === "list") return b.items.join(" ");
  if (b.kind === "image") return "";
  return b.text;
}

function chunkDoc(
  doc: WorkDoc,
  docIdx: number,
  blocks: MdBlock[],
  all: Section[],
  sents: Sent[],
  title: string,
  existing: Section[]
): Section[] {
  // drop the single preamble section and rebuild as chunks
  for (const e of existing) {
    const i = all.indexOf(e);
    if (i >= 0) all.splice(i, 1);
    for (const s of e.sents) sents.splice(sents.indexOf(s), 1);
  }
  const roots: Section[] = [];
  const paged = doc.meta.unitKind === "page" || doc.meta.unitKind === "slide";
  const chunks: MdBlock[][] = [];
  if (paged) {
    const per = Math.max(1, Math.ceil((doc.meta.units || 1) / Math.min(8, Math.max(1, Math.ceil((doc.meta.units || 1) / 3)))));
    const byUnit = new Map<number, MdBlock[]>();
    for (const b of blocks) {
      if (b.kind === "heading" && b.level === 1 && !b.unit) continue;
      const k = Math.floor((Math.max(1, b.unit) - 1) / per);
      if (!byUnit.has(k)) byUnit.set(k, []);
      byUnit.get(k)!.push(b);
    }
    for (const k of [...byUnit.keys()].sort((a, b) => a - b)) chunks.push(byUnit.get(k)!);
  } else {
    let cur: MdBlock[] = [];
    let w = 0;
    for (const b of blocks) {
      if (b.kind === "heading") continue;
      cur.push(b);
      w += countWords(blockText2(b));
      if (w >= 350) {
        chunks.push(cur);
        cur = [];
        w = 0;
      }
    }
    if (cur.length) {
      if (chunks.length && w < 120) chunks[chunks.length - 1].push(...cur);
      else chunks.push(cur);
    }
  }
  chunks.forEach((chunk, i) => {
    const units = chunk.map((b) => b.unit).filter(Boolean);
    const u0 = units.length ? Math.min(...units) : 0;
    const u1 = units.length ? Math.max(...units) : 0;
    const firstPara = chunk.find((b) => b.kind === "para" || b.kind === "list");
    const label = paged
      ? `${doc.meta.unitKind === "slide" ? "Slides" : "Pages"} ${u0}${u1 !== u0 ? `–${u1}` : ""}`
      : `Part ${i + 1}`;
    const hint = firstPara ? clip(splitSentences(blockText2(firstPara))[0] || "", 48) : "";
    const sec: Section = {
      key: `${doc.fileId}:c${i + 1}`,
      fileId: doc.fileId,
      docIdx,
      level: 1,
      title: hint ? `${label}: ${hint.replace(/[….]+$/, "")}` : label,
      parent: null,
      children: [],
      sents: [],
      tables: [],
      images: [],
      quotes: [],
      words: 0,
      startUnit: u0,
      endUnit: u1,
      score: 0,
      synthetic: true,
    };
    all.push(sec);
    roots.push(sec);
    for (const b of chunk) {
      sec.words += countWords(blockText2(b));
      const loc = "§ " + sec.title;
      if (b.kind === "table") {
        sec.tables.push({ fileId: doc.fileId, docIdx, headers: b.headers, rows: b.rows, unit: b.unit, loc, secKey: sec.key, title: sec.title });
        continue;
      }
      if (b.kind === "image") {
        sec.images.push({ fileId: doc.fileId, asset: b.asset, alt: b.alt, unit: b.unit, loc, secKey: sec.key });
        continue;
      }
      if (b.kind === "heading" || b.kind === "code") continue;
      const pieces = b.kind === "list" ? b.items : splitSentences(b.text);
      if (b.kind === "quote") sec.quotes.push({ text: b.text, unit: b.unit, loc });
      for (const p of pieces) {
        const wc = countWords(p);
        if (wc < 4 || !/[\p{L}]/u.test(p)) continue;
        const s: Sent = {
          id: sentCounter++,
          text: p,
          fileId: doc.fileId,
          docIdx,
          unit: b.unit,
          loc,
          secKey: sec.key,
          first: sec.sents.length === 0,
          facts: extractFacts(p),
          tokens: tokenSet(p),
          hedged: isHedged(p),
          fragment: b.kind === "list" || (!/[.!?。]["”')]?$/.test(p) && wc < 9),
          quote: b.kind === "quote",
          score: 0,
          pct: 0,
          alsoIn: [],
          dupe: false,
        };
        sec.sents.push(s);
        sents.push(s);
      }
    }
  });
  return roots;
}

/** Too many top-level sections (e.g. a 40-slide deck): group neighbours under synthetic parents. */
function groupRoots(doc: WorkDoc, roots: Section[], all: Section[]): Section[] {
  if (roots.length <= 12) return roots;
  const size = Math.ceil(roots.length / 8);
  const out: Section[] = [];
  for (let i = 0; i < roots.length; i += size) {
    const group = roots.slice(i, i + size);
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const u0 = Math.min(...group.map((g) => g.startUnit || 1e9));
    const u1 = Math.max(...group.map((g) => g.endUnit || 0));
    const paged = doc.meta.unitKind === "page" || doc.meta.unitKind === "slide";
    const label = paged && u0 < 1e9
      ? `${doc.meta.unitKind === "slide" ? "Slides" : "Pages"} ${u0}${u1 !== u0 ? `–${u1}` : ""}`
      : `${clip(group[0].title, 28)} → ${clip(group[group.length - 1].title, 28)}`;
    const parent: Section = {
      key: `${doc.fileId}:g${i}`,
      fileId: doc.fileId,
      docIdx: group[0].docIdx,
      level: 1,
      title: `${label}: ${clip(group[0].title.replace(/^(Slide|Page)s? \d+:?\s*/i, ""), 36)}`,
      parent: null,
      children: group,
      sents: [],
      tables: [],
      images: [],
      quotes: [],
      words: 0,
      startUnit: u0 < 1e9 ? u0 : 0,
      endUnit: u1,
      score: 0,
      synthetic: true,
    };
    for (const g of group) {
      g.parent = parent;
      g.level = 2;
      for (const c of g.children) c.level = 3;
    }
    all.push(parent);
    out.push(parent);
  }
  return out;
}

export function totalWords(s: Section): number {
  return s.words + s.children.reduce((a, c) => a + totalWords(c), 0);
}

export function descendants(s: Section): Section[] {
  return [s, ...s.children.flatMap(descendants)];
}

const CUES =
  /\b(must|should|needs? to|require[sd]?|critical|key|important|major|significant|primary|main|essential|decid(?:e|ed|ion)|recommend(?:s|ed|ation)?|conclude[sd]?|conclusion|therefore|result(?:s|ed)?|risk|impact|priority|goal|objective|target|forecast|growth|decline[sd]?|increase[sd]?|decrease[sd]?|reduce[sd]?|improve[sd]?|saves?|cost|revenue|budget|deadline|launch|milestone|approved|rejected|blocked|delay(?:ed)?|fail(?:ed|ure)?|success(?:ful)?|achieved?|exceed(?:s|ed)?|below|above|however|despite)\b/gi;

export function buildCorpus(docs: WorkDoc[], goal: string): Corpus {
  sentCounter = 0;
  const all: Section[] = [];
  const sents: Sent[] = [];
  const roots: Section[][] = [];
  const titles: string[] = [];
  docs.forEach((d, i) => {
    const r = buildDoc(d, i, all, sents);
    roots.push(groupRoots(d, r.roots, all));
    titles.push(r.title);
  });

  // dedupe near-identical sentences (cross-file merge)
  const kept: Sent[] = [];
  for (const s of sents) {
    const twin = kept.find((k) => Math.abs(k.tokens.size - s.tokens.size) <= 4 && jaccard(k.tokens, s.tokens) >= 0.72);
    if (twin) {
      s.dupe = true;
      twin.alsoIn.push({ file_id: s.fileId, ...(s.unit ? { page: s.unit } : { loc: s.loc }) });
    } else kept.push(s);
  }

  // scoring: tf-idf-ish term weight + numbers + cues + position + goal overlap
  const df = new Map<string, number>();
  for (const s of kept) for (const t of s.tokens) df.set(t, (df.get(t) || 0) + 1);
  const N = Math.max(1, kept.length);
  const goalTok = new Set(tokens(goal));
  for (const s of sents) {
    let w = 0;
    for (const t of s.tokens) w += Math.log(1 + N / (df.get(t) || 1)) * (goalTok.has(t) ? 1.8 : 1);
    const len = Math.max(1, s.tokens.size);
    let sc = w / Math.sqrt(len + 4);
    const factBonus = Math.min(2, s.facts.filter((f) => f.unit !== "date").length) * 0.6 + (s.facts.some((f) => f.unit === "money" || f.unit === "pct") ? 0.4 : 0);
    sc += factBonus;
    sc += Math.min(1.4, new Set((s.text.match(CUES) || []).map((x) => x.toLowerCase())).size * 0.35);
    if (s.first) sc += 0.5;
    if (goalTok.size) {
      let g = 0;
      for (const t of goalTok) if (s.tokens.has(t)) g++;
      sc += (g / goalTok.size) * 3;
    }
    const wc = countWords(s.text);
    if (wc < 7) sc *= 0.55;
    else if (wc > 45) sc *= 0.7;
    if (s.fragment) sc *= 0.8;
    if (s.dupe) sc *= 0.5;
    s.score = sc;
  }
  const ranked = [...sents].sort((a, b) => a.score - b.score);
  ranked.forEach((s, i) => (s.pct = ranked.length > 1 ? i / (ranked.length - 1) : 1));

  // section scores
  const rootsAll = all;
  for (const sec of rootsAll) {
    const top = sec.sents.map((x) => x.pct).sort((a, b) => b - a).slice(0, 3);
    sec.score = top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
    if (goalTok.size) {
      const tt = new Set(tokens(sec.title));
      let g = 0;
      for (const t of goalTok) if (tt.has(t)) g++;
      sec.score += (g / goalTok.size) * 0.8;
    }
  }
  // parents: blend with children
  const blend = (s: Section): number => {
    const c = s.children.map(blend);
    const own = s.score;
    s.score = c.length ? Math.max(own, c.reduce((a, b) => a + b, 0) / c.length * 0.9 + 0.05) : own;
    s.score += Math.log10(1 + totalWords(s)) * 0.08;
    return s.score;
  };
  for (const r of roots.flat()) blend(r);
  return { docs, roots, all, sents, title: titles };
}

/** Choose up to n diverse high-scoring sentences, returned in document order. */
export function pickSentences(candidates: Sent[], n: number, exclude: Set<number> = new Set(), sim = 0.5): Sent[] {
  const pool = candidates.filter((s) => !s.dupe && !exclude.has(s.id)).sort((a, b) => b.score - a.score);
  const out: Sent[] = [];
  for (const s of pool) {
    if (out.length >= n) break;
    if (out.some((o) => jaccard(o.tokens, s.tokens) >= sim)) continue;
    out.push(s);
  }
  return out.sort((a, b) => a.id - b.id);
}
