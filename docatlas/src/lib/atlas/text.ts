// Text utilities shared by the normalizer, the engine, the fact-checker and the renderer.

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/g;

export function countWords(s: string): number {
  const clean = s
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[|#>*_`\-]{1,}/g, " ");
  const cjk = (clean.match(CJK) || []).length;
  const latin = (clean.replace(CJK, " ").match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%$-]*/gu) || []).length;
  return cjk + latin;
}

export const STOP = new Set(
  (
    "a an the and or but if then else of to in on at by for with from into onto over under about as is are was were be been being " +
    "it its this that these those there here which who whom whose what when where why how not no nor so than too very can could " +
    "will would shall should may might must do does did done have has had having i we you he she they them their our your his her " +
    "also just only such more most less least many much some any each every both either neither other another same own per via " +
    "etc use used using one two three new within across between after before during while because since until against among"
  ).split(" ")
);

export function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokens(s: string, keepNumbers = false): string[] {
  const out: string[] = [];
  const re = /[\p{L}][\p{L}\p{N}'’-]*|\d[\d.,]*/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s.toLowerCase()))) {
    const w = m[0].replace(/['’]s$/, "");
    if (/^\d/.test(w)) {
      if (keepNumbers) out.push(w.replace(/,/g, ""));
      continue;
    }
    if (w.length < 3 || STOP.has(w)) continue;
    out.push(stem(w));
  }
  return out;
}

export function tokenSet(s: string): Set<string> {
  return new Set(tokens(s));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function overlapShare(a: Set<string>, b: Set<string>): number {
  // share of a that is found in b
  if (!a.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / a.size;
}

const ABBR = /\b(?:e\.g|i\.e|vs|etc|fig|figs|approx|no|inc|ltd|co|dr|mr|mrs|ms|prof|st|u\.s|u\.k|cf|al|est|avg|max|min|sec|ca)\.$/i;

export function splitSentences(text: string): string[] {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return [];
  const raw = flat.split(/(?<=[.!?。！？])["”')\]]?\s+(?=["“'(\[]?[A-Z0-9\u3400-\u9fff•-])/);
  const out: string[] = [];
  for (const piece of raw) {
    const prev = out[out.length - 1];
    if (prev && ABBR.test(prev)) out[out.length - 1] = prev + " " + piece;
    else out.push(piece);
  }
  return out.map((s) => s.trim()).filter(Boolean);
}

export function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:\s]+$/, "") + "…";
}

export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------- numeric facts ----------

export type FactUnit = "pct" | "money" | "multiple" | "duration" | "count" | "date" | "plain";

export interface Fact {
  raw: string;
  value: number | null;
  unit: FactUnit;
  start: number;
  end: number;
}

const MONTHS =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

const NOUNS =
  "hours?|hrs?|minutes?|mins?|days?|weeks?|months?|years?|quarters?|sprints?|users?|customers?|employees?|people|engineers?|FTEs?|staff|headcount|units?|sites?|clients?|tickets?|requests?|ms|seconds?|GB|TB|MB|km|miles?|kg|tons?|tonnes?|teams?|markets?|regions?|countries|stores|locations|vehicles|devices|accounts|licenses|seats|releases|features|projects|orders|deals|leads|visits|sessions|downloads|transactions|incidents|bugs|defects|pages|slides|files|vendors|suppliers|partners|offices|servers|nodes|clusters|tests|cases|milestones|phases|workshops|interviews|respondents|participants|pilots|tenants|stores|shops|beds|rooms|calls|emails|messages|apps|modules|APIs|endpoints|deployments|picks|pallets|shipments|packages|parcels|robots|trucks|shifts|docks|stations|lines|cartons";

function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

function scale(suffix: string | undefined): number {
  if (!suffix) return 1;
  const x = suffix.toLowerCase();
  if (x === "k" || x === "thousand") return 1e3;
  if (x === "m" || x === "mn" || x === "million") return 1e6;
  if (x === "b" || x === "bn" || x === "billion") return 1e9;
  return 1;
}

export function extractFacts(s: string): Fact[] {
  const facts: Fact[] = [];
  const taken: [number, number][] = [];
  const free = (a: number, b: number) => !taken.some(([x, y]) => a < y && b > x);
  const push = (m: RegExpExecArray, unit: FactUnit, value: number | null) => {
    const a = m.index;
    const b = a + m[0].length;
    if (!free(a, b)) return;
    taken.push([a, b]);
    facts.push({ raw: m[0].trim(), value, unit, start: a, end: b });
  };

  let m: RegExpExecArray | null;
  const dateRes = [
    new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b`, "g"),
    new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\.?(?:,?\\s+\\d{4})?\\b`, "g"),
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\bQ[1-4]\s?(?:FY)?\s?(?:'|’)?\d{2,4}\b/g,
    /\b(?:FY|H[12])\s?'?\d{2,4}\b/g,
    new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{4}\\b`, "g"),
  ];
  for (const re of dateRes) while ((m = re.exec(s))) push(m, "date", null);

  const money = /(?:[$€£¥]|USD\s?|EUR\s?|GBP\s?)\s?\d[\d,]*(?:\.\d+)?\s?(?:[kKmMbB]\b|million|billion|thousand|bn\b|mn\b)?/g;
  while ((m = money.exec(s))) {
    const num = m[0].replace(/^[^\d]+/, "");
    const mm = /^(\d[\d,]*(?:\.\d+)?)\s?(.*)$/.exec(num);
    push(m, "money", mm ? parseNum(mm[1]) * scale(mm[2]) : null);
  }
  const money2 = /\b\d[\d,]*(?:\.\d+)?\s?(?:million|billion|thousand)\s+(?:dollars|euros|pounds|USD|EUR)\b/gi;
  while ((m = money2.exec(s))) {
    const mm = /^(\d[\d,]*(?:\.\d+)?)\s?(\w+)/.exec(m[0]);
    push(m, "money", mm ? parseNum(mm[1]) * scale(mm[2]) : null);
  }
  const pct = /\b\d+(?:\.\d+)?\s?(?:%|percent\b|pp\b|pts\b|percentage points?\b)/gi;
  while ((m = pct.exec(s))) push(m, "pct", parseNum(m[0]));
  const pct2 = /(?<![\w.])\d+(?:\.\d+)?%/g;
  while ((m = pct2.exec(s))) push(m, "pct", parseNum(m[0]));
  const mult = /\b\d+(?:\.\d+)?\s?[x×](?=\W|$)/g;
  while ((m = mult.exec(s))) push(m, "multiple", parseNum(m[0]));
  const dur = new RegExp(`\\b\\d[\\d,]*(?:\\.\\d+)?\\s?(?:-|–)?\\s?(?:${NOUNS})\\b`, "gi");
  while ((m = dur.exec(s))) {
    const unit: FactUnit = /hour|hr|min|day|week|month|year|quarter|sprint|ms|second/i.test(m[0].replace(/[\d.,\s-–]/g, "").slice(0, 3))
      ? "duration"
      : "count";
    push(m, unit, parseNum(m[0]));
  }
  const plain = /(?<![\w.#-])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\w%])|(?<![\w.#-])\d+\.\d+(?![\w%.])/g;
  while ((m = plain.exec(s))) push(m, "plain", parseNum(m[0]));
  return facts.sort((a, b) => a.start - b.start);
}

export function numberTokens(s: string): string[] {
  const out: string[] = [];
  const re = /\d[\d,]*(?:\.\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    let n = m[0].replace(/,/g, "");
    if (n.includes(".")) n = n.replace(/0+$/, "").replace(/\.$/, "");
    out.push(n);
  }
  return out;
}

const HEDGES =
  /\b(?:approximately|approx\.?|around|about|estimated|estimate[sd]?|preliminary|tentative|draft|tbd|tbc|to be (?:confirmed|determined)|assum(?:es|ed|ing|ption)|projected|forecast(?:ed)?|expected to|unconfirmed|not yet (?:confirmed|verified)|pending|roughly|provisional)\b/i;

export function isHedged(s: string): boolean {
  return HEDGES.test(s);
}

const MON: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function detectDate(text: string, name: string): string | null {
  const head = text.slice(0, 2500);
  let m = /\b(20\d{2}|19\d{2})-(\d{2})-(\d{2})\b/.exec(head) || /\b(20\d{2}|19\d{2})-(\d{2})-(\d{2})\b/.exec(name);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2}|19\\d{2})\\b`, "i").exec(head);
  if (m) return `${m[3]}-${MON[m[1].slice(0, 3).toLowerCase()]}-${m[2].padStart(2, "0")}`;
  m = new RegExp(`\\b(${MONTHS})\\.?\\s+(20\\d{2}|19\\d{2})\\b`, "i").exec(head);
  if (m) return `${m[2]}-${MON[m[1].slice(0, 3).toLowerCase()]}`;
  m = /\bQ([1-4])\s?(?:FY)?\s?'?(20\d{2})\b/i.exec(head) || /\b(20\d{2})\s?Q([1-4])\b/i.exec(head);
  if (m) {
    const [q, y] = m[1].length === 4 ? [m[2], m[1]] : [m[1], m[2]];
    return `${y}-${String((Number(q) - 1) * 3 + 1).padStart(2, "0")}`;
  }
  m = /\b(20\d{2})\b/.exec(name);
  if (m) return m[1];
  return null;
}
