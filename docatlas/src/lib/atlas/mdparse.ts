// Minimal Markdown block parser for the normalized "content.md" layer.

export type MdBlock =
  | { kind: "heading"; level: number; text: string; unit: number; unitLabel: string | null }
  | { kind: "para"; text: string; unit: number; unitLabel: string | null }
  | { kind: "list"; items: string[]; text: string; unit: number; unitLabel: string | null }
  | { kind: "table"; headers: string[]; rows: string[][]; unit: number; unitLabel: string | null }
  | { kind: "quote"; text: string; unit: number; unitLabel: string | null }
  | { kind: "image"; asset: string; alt: string; unit: number; unitLabel: string | null }
  | { kind: "code"; text: string; unit: number; unitLabel: string | null };

export const ANCHOR_RE = /^<!--\s*\[doc-atlas\]\s*(p\.|slide\s|sheet:\s?)(.*?)\s*-->$/i;

export function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|").trim());
}

const isSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.includes("-");

export function parseMd(md: string): MdBlock[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: MdBlock[] = [];
  let unit = 0;
  let unitLabel: string | null = null;
  let sheetIdx = 0;
  let i = 0;
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      const text = para.join(" ").replace(/\s+/g, " ").trim();
      if (text) out.push({ kind: "para", text, unit, unitLabel });
      para = [];
    }
  };
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      flush();
      i++;
      continue;
    }
    const a = ANCHOR_RE.exec(t);
    if (a) {
      flush();
      const kind = a[1].toLowerCase();
      if (kind.startsWith("p")) {
        unit = parseInt(a[2], 10) || unit + 1;
        unitLabel = `p.${unit}`;
      } else if (kind.startsWith("slide")) {
        unit = parseInt(a[2], 10) || unit + 1;
        unitLabel = `Slide ${unit}`;
      } else {
        sheetIdx++;
        unit = sheetIdx;
        unitLabel = `Sheet ${a[2]}`;
      }
      i++;
      continue;
    }
    if (t.startsWith("<!--")) {
      i++;
      continue;
    }
    if (t.startsWith("```")) {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) body.push(lines[i++]);
      i++;
      out.push({ kind: "code", text: body.join("\n"), unit, unitLabel });
      continue;
    }
    const h = /^(#{1,6})\s+(.*?)\s*#*$/.exec(t);
    if (h) {
      flush();
      out.push({ kind: "heading", level: h[1].length, text: stripInline(h[2]), unit, unitLabel });
      i++;
      continue;
    }
    const img = /^!\[([^\]]*)\]\(asset:([^)\s]+)\)$/.exec(t);
    if (img) {
      flush();
      out.push({ kind: "image", asset: img[2], alt: img[1], unit, unitLabel });
      i++;
      continue;
    }
    if (t.startsWith("|") && i + 1 < lines.length && isSep(lines[i + 1])) {
      flush();
      const headers = splitRow(t).map(stripInline);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]).map(stripInline));
        i++;
      }
      out.push({ kind: "table", headers, rows, unit, unitLabel });
      continue;
    }
    if (/^>\s?/.test(t)) {
      flush();
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) q.push(lines[i++].trim().replace(/^>\s?/, ""));
      out.push({ kind: "quote", text: stripInline(q.join(" ")), unit, unitLabel });
      continue;
    }
    if (/^([-*+•]|\d+[.)])\s+/.test(t)) {
      flush();
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (/^([-*+•]|\d+[.)])\s+/.test(l)) items.push(stripInline(l.replace(/^([-*+•]|\d+[.)])\s+/, "")));
        else if (l && /^\s{2,}\S/.test(lines[i]) && items.length) items[items.length - 1] += " " + stripInline(l);
        else break;
        i++;
      }
      out.push({ kind: "list", items, text: items.join("; "), unit, unitLabel });
      continue;
    }
    para.push(stripInline(t));
    i++;
  }
  flush();
  return out;
}

export function stripInline(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(?<![\w*])[*_](?!\s)(.+?)(?<!\s)[*_](?![\w*])/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\\([*_`#|\\])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Plain text of a block (for search / fact-check / source drawer). */
export function blockText(b: MdBlock): string {
  switch (b.kind) {
    case "heading":
    case "para":
    case "quote":
    case "code":
      return b.text;
    case "list":
      return b.items.map((x) => "• " + x).join("\n");
    case "table":
      return [b.headers.join(" | "), ...b.rows.map((r) => r.join(" | "))].join("\n");
    case "image":
      return b.alt ? `[image: ${b.alt}]` : "[image]";
  }
}
