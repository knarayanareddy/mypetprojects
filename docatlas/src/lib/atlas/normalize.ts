// Stage 1 — normalize any supported document into the Markdown intermediate layer.
// PDF pages get machine anchors, tables keep their row × column structure,
// images are extracted to base64 assets.

import { createHash } from "node:crypto";
import TurndownService from "turndown";
import type { DocAsset, DocMeta } from "./types";
import { countWords, detectDate } from "./text";

export const SUPPORTED = ["pdf", "docx", "pptx", "xlsx", "html", "htm", "epub", "md", "markdown", "txt", "csv", "json", "xml"];

export interface Normalized {
  name: string;
  type: string;
  size: number;
  sha256: string;
  pages: number | null;
  words: number;
  contentMd: string;
  assets: DocAsset[];
  meta: DocMeta;
}

export function extOf(name: string): string {
  const m = /\.([A-Za-z0-9]+)$/.exec(name);
  return m ? m[1].toLowerCase() : "";
}

const cell = (s: unknown) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "\\|")
    .trim();

function mdTable(rows: string[][]): string {
  const width = Math.max(...rows.map((r) => r.length));
  const norm = rows.map((r) => Array.from({ length: width }, (_, i) => cell(r[i])));
  const head = norm[0];
  const lines = [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`];
  for (const r of norm.slice(1)) lines.push(`| ${r.join(" | ")} |`);
  return lines.join("\n");
}

function headingsOf(md: string): DocMeta["headings"] {
  const out: DocMeta["headings"] = [];
  let unit = 0;
  for (const line of md.split("\n")) {
    const a = /^<!--\s*\[doc-atlas\]\s*(?:p\.|slide\s)(\d+)/i.exec(line.trim());
    if (a) unit = parseInt(a[1], 10);
    const h = /^(#{1,6})\s+(.*?)\s*#*$/.exec(line.trim());
    if (h) out.push({ level: h[1].length, title: h[2], unit });
  }
  return out;
}

function makeTurndown(assets: DocAsset[]) {
  const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
  td.remove(["script", "style", "noscript", "nav", "iframe"]);
  td.addRule("table", {
    filter: "table",
    replacement: (_c, node) => {
      const el = node as unknown as { querySelectorAll?: (s: string) => ArrayLike<{ querySelectorAll: (s: string) => ArrayLike<{ textContent: string | null }> }> };
      const trs = el.querySelectorAll ? Array.from(el.querySelectorAll("tr")) : [];
      const rows = trs.map((tr) => Array.from(tr.querySelectorAll("th,td")).map((c) => cell(c.textContent)));
      const clean = rows.filter((r) => r.some(Boolean));
      return clean.length ? "\n\n" + mdTable(clean) + "\n\n" : "";
    },
  });
  td.addRule("img", {
    filter: "img",
    replacement: (_c, node) => {
      const n = node as unknown as { getAttribute: (k: string) => string | null };
      const src = n.getAttribute("src") || "";
      const alt = (n.getAttribute("alt") || "").replace(/[\[\]]/g, "");
      if (src.startsWith("asset:")) return `\n\n![${alt}](${src})\n\n`;
      const dm = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(src);
      if (dm && assets.length < 40 && dm[2].length < 1_500_000) {
        const id = `img${assets.length + 1}`;
        assets.push({ id, mime: dm[1], data: dm[2], caption: alt || undefined });
        return `\n\n![${alt}](asset:${id})\n\n`;
      }
      return alt ? ` [image: ${alt}] ` : "";
    },
  });
  return td;
}

function finish(
  base: Pick<Normalized, "name" | "type" | "size" | "sha256">,
  md: string,
  pages: number | null,
  assets: DocAsset[],
  extra: Partial<DocMeta>
): Normalized {
  const contentMd = md.replace(/\n{3,}/g, "\n\n").trim() + "\n";
  const headings = headingsOf(contentMd);
  const tables = (contentMd.match(/^\|\s*-{3}/gm) || []).length;
  return {
    ...base,
    pages,
    words: countWords(contentMd),
    contentMd,
    assets,
    meta: {
      headings,
      tables,
      warnings: [],
      date: detectDate(contentMd, base.name),
      unitKind: "section",
      units: pages ?? 0,
      ...extra,
    },
  };
}

// ---------------- PDF ----------------

interface Item {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Line {
  y: number;
  h: number;
  cells: { text: string; x: number }[];
  text: string;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function toLines(items: Item[]): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Item[][] = [];
  for (const it of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= Math.max(2.5, it.h * 0.35)) last.push(it);
    else rows.push([it]);
  }
  return rows.map((r) => {
    r.sort((a, b) => a.x - b.x);
    const cells: { text: string; x: number }[] = [];
    let prevEnd = -1;
    let cur = "";
    let curX = 0;
    const charW = median(r.map((i) => i.w / Math.max(1, i.str.length))) || 5;
    for (const it of r) {
      const gap = it.x - prevEnd;
      if (cur && gap > Math.max(charW * 3.2, 14)) {
        cells.push({ text: cur.trim(), x: curX });
        cur = "";
      }
      if (!cur) curX = it.x;
      cur += (cur && gap > charW * 0.3 && !cur.endsWith(" ") ? " " : "") + it.str;
      prevEnd = it.x + it.w;
    }
    if (cur.trim()) cells.push({ text: cur.trim(), x: curX });
    return {
      y: r[0].y,
      h: Math.max(...r.map((i) => i.h)),
      cells,
      text: cells.map((c) => c.text).join(" "),
    };
  });
}

async function normalizePdf(buf: Buffer, base: Pick<Normalized, "name" | "type" | "size" | "sha256">) {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const n = pdf.numPages;
  const pageLines: Line[][] = [];
  const scanned: number[] = [];
  const heights: number[] = [];
  for (let p = 1; p <= n; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const items: Item[] = [];
    for (const raw of tc.items as unknown[]) {
      const it = raw as { str?: string; transform?: number[]; width?: number; height?: number };
      if (!it.str || !it.str.trim() || !it.transform) continue;
      const h = it.height || Math.abs(it.transform[3]) || 10;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width || it.str.length * 5, h });
      heights.push(Math.round(h * 2) / 2);
    }
    const lines = toLines(items);
    if (lines.map((l) => l.text).join("").length < 20) scanned.push(p);
    pageLines.push(lines);
  }
  // body font height = most frequent
  const freq = new Map<number, number>();
  for (const h of heights) freq.set(h, (freq.get(h) || 0) + 1);
  const body = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 10;

  // repeated header/footer lines
  const repeat = new Map<string, number>();
  if (n >= 3) {
    for (const lines of pageLines) {
      const edge = [...lines.slice(0, 2), ...lines.slice(-2)];
      for (const l of new Set(edge.map((x) => x.text.replace(/\d+/g, "#").toLowerCase()))) repeat.set(l, (repeat.get(l) || 0) + 1);
    }
  }
  const isNoise = (t: string) =>
    /^(page\s*)?\d{1,4}(\s*(of|\/)\s*\d{1,4})?$/i.test(t.trim()) ||
    (n >= 3 && (repeat.get(t.replace(/\d+/g, "#").toLowerCase()) || 0) >= Math.max(3, n * 0.6));

  const out: string[] = [];
  let tables = 0;
  for (let p = 0; p < n; p++) {
    out.push(`<!-- [doc-atlas] p.${p + 1} -->`);
    const lines = pageLines[p].filter((l, idx, arr) => !((idx < 2 || idx >= arr.length - 2) && isNoise(l.text)));
    const gaps = lines.slice(1).map((l, i) => lines[i].y - l.y);
    const lh = median(gaps.filter((g) => g > 0)) || body * 1.3;
    let para: string[] = [];
    const flush = () => {
      if (para.length) out.push(para.join(" ").replace(/(\w)- (\w)/g, "$1$2").replace(/\s+/g, " ") + "\n");
      para = [];
    };
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      // table detection: >=2 consecutive lines with the same >=2 cell count
      if (l.cells.length >= 2) {
        let j = i;
        while (j < lines.length && lines[j].cells.length >= 2 && Math.abs(lines[j].cells.length - l.cells.length) <= 1) j++;
        if (j - i >= 2 && l.cells.length >= 2) {
          flush();
          const w = Math.max(...lines.slice(i, j).map((x) => x.cells.length));
          const colX = lines[i].cells.map((c) => c.x);
          const rows = lines.slice(i, j).map((x) => {
            const row = Array.from({ length: w }, () => "");
            for (const c of x.cells) {
              let best = 0;
              let bd = Infinity;
              colX.forEach((cx, k) => {
                const d = Math.abs(cx - c.x);
                if (d < bd) {
                  bd = d;
                  best = k;
                }
              });
              best = Math.min(best, w - 1);
              row[best] = row[best] ? row[best] + " " + c.text : c.text;
            }
            return row;
          });
          out.push(mdTable(rows) + "\n");
          tables++;
          i = j;
          continue;
        }
      }
      const t = l.text.trim();
      const ratio = l.h / body;
      const numbered = /^\d+(\.\d+){0,3}\.?\s+[A-Z][^.!?]{2,80}$/.test(t);
      const caps = /^[A-Z][A-Z0-9 ,&:/-]{3,60}$/.test(t) && /[A-Z]{3}/.test(t);
      const big = ratio >= 1.18 && t.length < 100 && !/[.,;]$/.test(t);
      const isBullet = /^([•▪◦●\-–*]|\d+[.)])\s+/.test(t);
      if ((big || ((numbered || caps) && t.length < 90 && !isBullet)) && !(isBullet && !big && !numbered)) {
        flush();
        const level = ratio >= 1.6 ? 1 : ratio >= 1.3 ? 2 : numbered ? Math.min(4, (t.match(/\./g) || []).length + 2 - (/\.$/.test(t) ? 1 : 0)) : 3;
        out.push(`${"#".repeat(Math.max(1, Math.min(4, level)))} ${t.replace(/\s+/g, " ")}\n`);
        i++;
        continue;
      }
      const prev = lines[i - 1];
      if (isBullet) {
        flush();
        para.push("- " + t.replace(/^([•▪◦●\-–*]|\d+[.)])\s+/, ""));
        // bullet gets its own paragraph; following wrapped lines are appended until next bullet
        const next = lines[i + 1];
        if (!next || /^([•▪◦●\-–*]|\d+[.)])\s+/.test(next.text.trim()) || next.cells.length >= 2) flush();
        i++;
        continue;
      }
      if (prev && prev.y - l.y > lh * 1.6) flush();
      if (para.length && para[0].startsWith("- ") && /[.!?]$/.test(para[para.length - 1]) && prev && prev.y - l.y > lh * 1.25) flush();
      para.push(t);
      i++;
    }
    flush();
  }
  // consecutive bullet lines -> markdown lists (each bullet paragraph was flushed with a blank line)
  const md = out.join("\n").replace(/(^- .*\n)\n(?=- )/gm, "$1");
  const warnings: string[] = [];
  if (scanned.length)
    warnings.push(
      `${scanned.length} of ${n} page(s) have no text layer (likely scanned: p.${scanned.slice(0, 8).join(", ")}${scanned.length > 8 ? "…" : ""}). OCR is not available in this build, so those pages are empty.`
    );
  if (!tables) warnings.push("");
  return finish(base, md, n, [], {
    unitKind: "page",
    units: n,
    scannedPages: scanned,
    warnings: warnings.filter(Boolean),
  });
}

// ---------------- DOCX ----------------

async function normalizeDocx(buf: Buffer, base: Pick<Normalized, "name" | "type" | "size" | "sha256">) {
  const mammoth = await import("mammoth");
  const assets: DocAsset[] = [];
  const res = await mammoth.convertToHtml(
    { buffer: buf },
    {
      convertImage: mammoth.images.imgElement(async (img: { contentType: string; read: (e: string) => Promise<string> }) => {
        const data = await img.read("base64");
        if (assets.length >= 40 || data.length > 1_500_000) return { src: "" };
        const id = `img${assets.length + 1}`;
        assets.push({ id, mime: img.contentType, data });
        return { src: `asset:${id}` };
      }),
    }
  );
  const td = makeTurndown(assets);
  const md = td.turndown(res.value);
  const warnings = res.messages.filter((m) => m.type === "warning").slice(0, 3).map((m) => m.message);
  return finish(base, md, null, assets, { warnings });
}

// ---------------- HTML / EPUB ----------------

function htmlToMd(source: string, assets: DocAsset[]): string {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(source)?.[1] ?? source;
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(source)?.[1]?.trim();
  const td = makeTurndown(assets);
  const md = td.turndown(body.replace(/<!--[\s\S]*?-->/g, ""));
  return title && !/^#\s/m.test(md) ? `# ${title.replace(/\s+/g, " ")}\n\n${md}` : md;
}

async function normalizeEpub(buf: Buffer, base: Pick<Normalized, "name" | "type" | "size" | "sha256">) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  const opfPath = container ? /full-path="([^"]+)"/.exec(container)?.[1] : undefined;
  if (!opfPath) throw new Error("Invalid EPUB: container.xml / OPF not found");
  const opf = (await zip.file(opfPath)?.async("string")) || "";
  const dir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const manifest = new Map<string, string>();
  for (const m of opf.matchAll(/<item\b[^>]*>/g)) {
    const id = /\bid="([^"]+)"/.exec(m[0])?.[1];
    const href = /\bhref="([^"]+)"/.exec(m[0])?.[1];
    if (id && href) manifest.set(id, href);
  }
  const spine = [...opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)].map((m) => m[1]);
  const assets: DocAsset[] = [];
  const parts: string[] = [];
  const title = /<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i.exec(opf)?.[1]?.trim();
  if (title) parts.push(`# ${title}`);
  for (const id of spine) {
    const href = manifest.get(id);
    if (!href) continue;
    const f = zip.file(decodeURIComponent(dir + href));
    if (!f) continue;
    const md = htmlToMd(await f.async("string"), assets);
    if (md.trim()) parts.push(md.replace(/^#\s/gm, "## "));
  }
  return finish(base, parts.join("\n\n"), null, assets, { warnings: ["EPUB images are not extracted."] });
}

// ---------------- XLSX / CSV ----------------

function parseCsv(text: string): string[][] {
  const delim = (text.split("\n", 1)[0].match(/\t/g) || []).length > (text.split("\n", 1)[0].match(/,/g) || []).length ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

async function normalizeXlsx(buf: Buffer, base: Pick<Normalized, "name" | "type" | "size" | "sha256">) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const parts: string[] = [];
  const warnings: string[] = [];
  wb.eachSheet((ws) => {
    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals: string[] = [];
      row.eachCell({ includeEmpty: true }, (c, col) => {
        let v: unknown = c.value;
        if (v && typeof v === "object") {
          const o = v as { result?: unknown; richText?: { text: string }[]; text?: string; hyperlink?: string };
          if (o.richText) v = o.richText.map((r) => r.text).join("");
          else if (o.result !== undefined) v = o.result;
          else if (o.text) v = o.text;
          else if (v instanceof Date) v = v.toISOString().slice(0, 10);
          else v = "";
        }
        if (v instanceof Date) v = v.toISOString().slice(0, 10);
        if (typeof v === "number" && !Number.isInteger(v)) v = Math.round(v * 1e6) / 1e6;
        vals[col - 1] = String(v ?? "");
      });
      rows.push(Array.from(vals, (x) => x ?? ""));
    });
    if (!rows.length) return;
    let shown = rows;
    if (rows.length > 2000) {
      shown = rows.slice(0, 2000);
      warnings.push(`Sheet "${ws.name}" truncated to 2000 of ${rows.length} rows.`);
    }
    parts.push(`<!-- [doc-atlas] sheet: ${ws.name} -->\n## Sheet: ${ws.name}\n\n${mdTable(shown)}`);
  });
  return finish(base, parts.join("\n\n"), null, [], { unitKind: "sheet", units: parts.length, warnings });
}

// ---------------- PPTX ----------------

function xmlText(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function paragraphsOf(xml: string): string[] {
  return [...xml.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)]
    .map((p) => xmlText([...p[0].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((t) => t[1]).join("")).trim())
    .filter(Boolean);
}

async function normalizePptx(buf: Buffer, base: Pick<Normalized, "name" | "type" | "size" | "sha256">) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const slides = Object.keys(zip.files)
    .map((f) => ({ f, n: parseInt(/ppt\/slides\/slide(\d+)\.xml$/.exec(f)?.[1] || "", 10) }))
    .filter((s) => !Number.isNaN(s.n))
    .sort((a, b) => a.n - b.n);
  const parts: string[] = [];
  let idx = 0;
  for (const s of slides) {
    idx++;
    const xml = await zip.file(s.f)!.async("string");
    const lines: string[] = [];
    let title = "";
    const shapes = [...xml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)].map((m) => m[0]);
    const parsed = shapes.map((sp) => ({ isTitle: /<p:ph[^>]*type="(?:title|ctrTitle)"/.test(sp), paras: paragraphsOf(sp) })).filter((x) => x.paras.length);
    if (!parsed.some((x) => x.isTitle) && parsed.length) {
      // no title placeholder (generated decks): a short first paragraph acts as the slide title
      const first = parsed[0];
      if (first.paras[0].length <= 80) first.isTitle = first.paras.length === 1;
      if (!first.isTitle && first.paras[0].length <= 80) {
        title = first.paras.shift() || "";
      }
    }
    for (const { isTitle, paras } of parsed) {
      if (!paras.length) continue;
      if (isTitle && !title) {
        title = paras.join(" ");
        continue;
      }
      if (paras.length === 1 && paras[0].length > 80) lines.push(paras[0] + "\n");
      else for (const p of paras) lines.push("- " + p);
      lines.push("");
    }
    for (const tbl of xml.matchAll(/<a:tbl>[\s\S]*?<\/a:tbl>/g)) {
      const rows = [...tbl[0].matchAll(/<a:tr\b[\s\S]*?<\/a:tr>/g)].map((tr) =>
        [...tr[0].matchAll(/<a:tc\b[\s\S]*?<\/a:tc>/g)].map((tc) => paragraphsOf(tc[0]).join(" "))
      );
      if (rows.length) lines.push(mdTable(rows) + "\n");
    }
    const notes = zip.file(`ppt/notesSlides/notesSlide${s.n}.xml`);
    if (notes) {
      const np = paragraphsOf(await notes.async("string")).filter((x) => !/^\d+$/.test(x));
      if (np.length) lines.push(`Speaker notes: ${np.join(" ")}\n`);
    }
    parts.push(`<!-- [doc-atlas] slide ${idx} -->\n## ${title ? `Slide ${idx}: ${title}` : `Slide ${idx}`}\n\n${lines.join("\n")}`);
  }
  return finish(base, parts.join("\n\n"), slides.length, [], { unitKind: "slide", units: slides.length });
}

// ---------------- entry ----------------

export async function normalizeFile(name: string, buf: Buffer): Promise<Normalized> {
  const ext = extOf(name);
  if (!SUPPORTED.includes(ext)) {
    if (["doc", "ppt", "xls"].includes(ext))
      throw new Error(`Legacy .${ext} files can't be parsed — re-save as .${ext}x first.`);
    throw new Error(`Unsupported file type ".${ext || "?"}"`);
  }
  const base = { name, type: ext === "htm" ? "html" : ext === "markdown" ? "md" : ext, size: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
  switch (ext) {
    case "pdf":
      return normalizePdf(buf, base);
    case "docx":
      return normalizeDocx(buf, base);
    case "pptx":
      return normalizePptx(buf, base);
    case "xlsx":
      return normalizeXlsx(buf, base);
    case "epub":
      return normalizeEpub(buf, base);
    case "html":
    case "htm": {
      const assets: DocAsset[] = [];
      return finish(base, htmlToMd(buf.toString("utf8"), assets), null, assets, {});
    }
    case "csv": {
      const rows = parseCsv(buf.toString("utf8"));
      if (!rows.length) throw new Error("CSV is empty");
      return finish(
        base,
        `<!-- [doc-atlas] sheet: ${name} -->\n## ${name}\n\n${mdTable(rows.slice(0, 2000))}`,
        null,
        [],
        { unitKind: "sheet", units: 1, warnings: rows.length > 2000 ? [`Truncated to 2000 of ${rows.length} rows.`] : [] }
      );
    }
    case "json": {
      let pretty = buf.toString("utf8");
      try {
        pretty = JSON.stringify(JSON.parse(pretty), null, 2);
      } catch {
        /* keep raw */
      }
      return finish(base, `# ${name}\n\n\`\`\`json\n${pretty}\n\`\`\``, null, [], {});
    }
    case "xml":
      return finish(base, `# ${name}\n\n\`\`\`xml\n${buf.toString("utf8")}\n\`\`\``, null, [], {});
    default:
      // md / txt
      return finish(base, buf.toString("utf8"), null, [], {});
  }
}
