// Deterministic renderer: model.json (+ workspace) -> one self-contained dashboard.html.
// The AI/engine never writes HTML. Chart.js and Mermaid are inlined for the offline download.

import fs from "node:fs";
import path from "node:path";
import { CLIENT_JS, CSS } from "./render-assets";
import { DocIndex, refLabel } from "./model-utils";
import { clip, esc } from "./text";
import { refKey } from "./sections";
import type { Block, ChartDef, Importance, Model, OutlineNode, SourceRef, ValidationResult, WorkDoc } from "./types";

const DICT = {
  en: {
    kicker: "Doc Atlas · briefing",
    files: "files",
    pages: "pages",
    words: "words",
    goal: "Reading goal",
    bottomLine: "The Bottom Line",
    briefing: "Briefing",
    metrics: "Key metrics",
    summary: "Executive summary",
    logic: "Logic & relationship map",
    charts: "Data charts",
    keypoints: "Key points",
    conflicts: "Where the sources disagree",
    quotes: "In their words",
    chapters: "Chapters",
    appendix: "Appendix — sources, relations, distillation check",
    sourceFiles: "Source files",
    relations: "File relations",
    check: "Distillation check",
    factcheck: "Adversarial fact-check",
    validation: "Validation gates",
    tier_high: "Must know",
    tier_medium: "Worth knowing",
    tier_low: "Background",
    search: "Search the dashboard…  ( / )",
    expandAll: "Expand all",
    briefOnly: "Briefing only",
    tools: "Filters",
    importance: "Importance",
    allFiles: "All files",
    onlyFile: "Source file",
    outline: "Contents",
    readTime: "source ≈ {a} min → this page ≈ {b} min",
    unverified: "unverified",
    zoomHint: "Click to zoom",
    resolution: "Reading",
    confidence: "confidence",
    noHits: "no match",
    noSnippet: "No text could be resolved for this locator.",
    mermaidMissing: "Mermaid is not available — showing the diagram source.",
    diagramError: "This diagram could not be rendered — showing its source.",
    chartMissing: "Chart.js is not available.",
    truncated: "more rows — see the source",
    close: "Close",
    fit: "Fit",
    verdict: { ok: "Accurate", deviation: "Deviation", error: "Error", missing: "Omitted" },
    srcWords: "Source words",
    modelWords: "Dashboard words",
    compression: "Compression",
    coverage: "Section coverage",
    claims: "Claims with source",
    todo: "To verify",
    engine: "Engine",
    generated: "Generated",
    name: "File",
    type: "Type",
    date: "Date",
    role: "Role",
    claim: "Claim",
    verdictCol: "Verdict",
    note: "Note",
    nothing: "Nothing to show.",
    snippetNote: "Original text at this location (normalized from the source file).",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
  },
  zh: {
    kicker: "Doc Atlas · 简报",
    files: "个文件",
    pages: "页",
    words: "字",
    goal: "阅读目标",
    bottomLine: "一句话定论",
    briefing: "简报",
    metrics: "关键指标",
    summary: "执行摘要",
    logic: "逻辑 / 关系图",
    charts: "数据图表",
    keypoints: "核心要点",
    conflicts: "冲突对照",
    quotes: "原文金句",
    chapters: "章节详情",
    appendix: "附录 — 源文件、文件关系、炼化体检",
    sourceFiles: "源文件",
    relations: "文件关系",
    check: "炼化体检",
    factcheck: "对抗式事实核查",
    validation: "机器校验闸",
    tier_high: "必须知道",
    tier_medium: "值得了解",
    tier_low: "背景",
    search: "全文搜索…  ( / )",
    expandAll: "展开全文",
    briefOnly: "只看简报",
    tools: "筛选",
    importance: "重要度",
    allFiles: "全部文件",
    onlyFile: "来源文件",
    outline: "目录",
    readTime: "原文约 {a} 分钟 → 本页约 {b} 分钟读完",
    unverified: "待核实",
    zoomHint: "点击放大",
    resolution: "解读",
    confidence: "置信度",
    noHits: "无匹配",
    noSnippet: "该定位无法解析出原文。",
    mermaidMissing: "Mermaid 不可用 — 显示图的源码。",
    diagramError: "该图无法渲染 — 显示源码。",
    chartMissing: "Chart.js 不可用。",
    truncated: "行 — 见原文",
    close: "关闭",
    fit: "适应",
    verdict: { ok: "准确", deviation: "偏差", error: "错误", missing: "遗漏" },
    srcWords: "原文字数",
    modelWords: "面板字数",
    compression: "压缩比",
    coverage: "章节覆盖",
    claims: "带溯源声明",
    todo: "待核实",
    engine: "引擎",
    generated: "生成于",
    name: "文件",
    type: "类型",
    date: "日期",
    role: "角色",
    claim: "声明",
    verdictCol: "判定",
    note: "说明",
    nothing: "暂无内容。",
    snippetNote: "此处原文（由源文件归一化而来）。",
    zoomIn: "放大",
    zoomOut: "缩小",
  },
};
type Dict = typeof DICT.en;

const vendorCache = new Map<string, string>();
function vendor(file: string): string {
  if (!vendorCache.has(file)) {
    const p = path.join(process.cwd(), "node_modules", file);
    vendorCache.set(file, fs.readFileSync(p, "utf8"));
  }
  return vendorCache.get(file)!;
}
export const VENDOR_FILES: Record<string, string> = {
  "chart.js": "chart.js/dist/chart.umd.min.js",
  "mermaid.js": "mermaid/dist/mermaid.min.js",
};
export function readVendor(name: string): string | null {
  const f = VENDOR_FILES[name];
  return f ? vendor(f) : null;
}

const safeScript = (js: string) => js.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
const safeJson = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028|\u2029/g, " ");

function inlineMd(s: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

const MERMAID_CLASSES = `
  classDef hi fill:#fbe4dd,stroke:#c0392b,color:#3b1a14,stroke-width:2px
  classDef med fill:#e8eefb,stroke:#1f3a8a,color:#1c2434
  classDef lo fill:#f4efe0,stroke:#b9ae8d,color:#5b5340
  classDef root fill:#1f3a8a,stroke:#1f3a8a,color:#ffffff
  classDef file fill:#fdf6e3,stroke:#1f3a8a,color:#1c2434`;

function withClasses(code: string): string {
  let out = code.trim();
  if (/^\s*(flowchart|graph)\b/.test(out) && /:::(hi|med|lo|root|file)\b/.test(out) && !/classDef\s+hi\b/.test(out)) out += "\n" + MERMAID_CLASSES;
  return out;
}

export interface RenderOptions {
  uiLang: "en" | "zh";
  inlineVendor: boolean;
  validation?: ValidationResult | null;
  downloadName?: string;
}

export function renderDashboard(model: Model, docs: WorkDoc[], opts: RenderOptions): string {
  const T: Dict = (DICT[opts.uiLang] || DICT.en) as Dict;
  const idxs = new Map(docs.map((d) => [d.fileId, new DocIndex(d)]));
  const files = model.files.map((f) => ({ id: f.id, name: f.name }));
  const refs: Record<string, { label: string; text: string; note: string }> = {};

  const shortLabel = (r: SourceRef): string => {
    const f = model.files.find((x) => x.id === r.file_id);
    const where = r.page != null ? (r.loc && /^Slide/i.test(r.loc) ? `Slide ${r.page}` : `p.${r.page}`) : r.loc ? clip(r.loc, 26) : "";
    if (model.files.length <= 1) return where || (f ? clip(f.name, 20) : r.file_id);
    const name = f ? clip(f.name.replace(/\.[A-Za-z0-9]+$/, ""), 16) : r.file_id;
    return where ? `${name} · ${where}` : name;
  };
  const register = (r: SourceRef): string => {
    const key = refKey(r);
    if (!refs[key]) {
      const idx = idxs.get(r.file_id);
      let text = idx?.textFor(r) || "";
      let note = T.snippetNote;
      if (!text && idx) {
        text = idx.fullText.slice(0, 3000);
        note = T.snippetNote + " (locator is a section label — showing the start of the document)";
      }
      refs[key] = { label: refLabel(r, files), text: text.slice(0, 6000), note };
    }
    return key;
  };
  const badges = (rs?: SourceRef[] | null, max = 3): string =>
    (rs || [])
      .slice(0, max)
      .map((r) => `<button class="src" data-ref="${esc(register(r))}" title="${esc(refLabel(r, files))}">${esc(shortLabel(r))}</button>`)
      .join("");
  const fileAttr = (rs?: SourceRef[] | null) => ` data-files="${esc([...new Set((rs || []).map((r) => r.file_id))].join(" "))}"`;

  // ---------------- charts data
  const charts: Record<string, unknown> = {};
  const chartCard = (c: { id: string; title: string; caption?: string | null; chartjs: ChartDef["chartjs"]; sources?: SourceRef[] }) => {
    charts[c.id] = c.chartjs;
    return `<div class="chartcard"${fileAttr(c.sources)}><h3>${esc(c.title)}</h3><div class="cv"><canvas data-chart="${esc(c.id)}"></canvas></div><div class="cap">${c.caption ? esc(c.caption) + " " : ""}${badges(c.sources)}</div></div>`;
  };

  // ---------------- diagrams
  let dcount = 0;
  const diagramBox = (title: string, code: string) =>
    `<div class="mmd" data-title="${esc(title)}" data-code="${esc(withClasses(code))}" role="img" aria-label="${esc(title)}"></div>`;

  // ---------------- blocks
  const inheritedFiles = (b: SourceRef[] | undefined) => fileAttr(b);
  function blocks(bs: Block[]): string {
    return bs
      .map((b): string => {
        switch (b.type) {
          case "paragraph":
            return `<p data-claim="${esc(clip(b.md, 160))}"${inheritedFiles(b.sources)}>${inlineMd(b.md)} ${badges(b.sources)}</p>`;
          case "callout":
            return `<div class="callout ${b.tone}" data-claim="${esc(clip(b.md, 160))}"${inheritedFiles(b.sources)}>${b.title ? `<b class="t">${esc(b.title)}</b>` : ""}${inlineMd(b.md)} ${badges(b.sources, 4)}</div>`;
          case "keypoints":
            return `<ul class="pts">${b.items
              .map(
                (i) =>
                  `<li class="${i.importance}" data-imp="${i.importance}" data-claim="${esc(clip(i.text, 160))}"${fileAttr(i.sources)}>${inlineMd(i.text)}${i.unverified ? `<span class="unv">${T.unverified}</span>` : ""} ${badges(i.sources)}</li>`
              )
              .join("")}</ul>`;
          case "metric":
            return `${b.title ? `<div class="tcap">${esc(b.title)}</div>` : ""}<div class="chips">${b.items
              .map((i) => `<span class="chip" data-claim="${esc(clip(i.label, 100))}"><b>${esc(i.value)}</b>${esc(i.label)} ${badges(i.sources, 2)}</span>`)
              .join("")}</div>`;
          case "quote": {
            if ("quote_id" in b) {
              const q = (model.quotes || []).find((x) => x.id === b.quote_id);
              return q ? `<blockquote class="q" data-claim="${esc(clip(q.text, 100))}">“${esc(q.text)}”<footer>${q.attribution ? esc(q.attribution) + " " : ""}${badges([q.source])}</footer></blockquote>` : "";
            }
            return `<blockquote class="q" data-claim="${esc(clip(b.text, 100))}">“${esc(b.text)}”<footer>${b.attribution ? esc(b.attribution) + " " : ""}${badges(b.source ? [b.source] : [])}</footer></blockquote>`;
          }
          case "diagram": {
            if ("diagram_id" in b) {
              const d = (model.diagrams || []).find((x) => x.id === b.diagram_id);
              return d ? diagramBox(d.title, d.mermaid) : "";
            }
            return diagramBox(b.title || "Diagram", b.mermaid) + (b.caption ? `<div class="tcap">${esc(b.caption)}</div>` : "");
          }
          case "chart": {
            if ("chart_id" in b) {
              const c = (model.charts || []).find((x) => x.id === b.chart_id);
              return c ? chartCard(c) : "";
            }
            return chartCard({ id: `ic${++dcount}`, title: b.title || "Chart", caption: b.caption, chartjs: b.chartjs, sources: b.sources });
          }
          case "table": {
            const numeric = b.headers.map((_, j) => b.rows.length > 0 && b.rows.filter((r) => /^[-+(]?\s*[$€£¥]?\s?\d[\d,.]*\s?(%|[kKmMbB])?\)?$/.test((r[j] || "").trim())).length >= b.rows.length * 0.7);
            return `${b.title ? `<div class="tcap">${esc(b.title)} ${badges(b.sources, 1)}</div>` : ""}<div class="tblwrap"${fileAttr(b.sources)} data-claim=""><table class="t"><thead><tr>${b.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows
              .map((r) => `<tr>${b.headers.map((_, j) => `<td class="${numeric[j] && j > 0 ? "num" : ""}">${esc(r[j] ?? "")}</td>`).join("")}</tr>`)
              .join("")}</tbody></table>${b.truncated ? `<div class="trunc">+ ${b.truncated} ${T.truncated}</div>` : ""}</div>`;
          }
          case "image": {
            const d = docs.find((x) => x.fileId === b.file_id);
            const a = d?.assets.find((x) => x.id === b.asset);
            return a ? `<figure class="img"><img alt="${esc(b.caption || "")}" src="data:${esc(a.mime)};base64,${a.data}">${b.caption ? `<figcaption>${esc(b.caption)} ${badges(b.sources, 1)}</figcaption>` : ""}</figure>` : "";
          }
          case "subsections":
            return b.items
              .map(
                (s) =>
                  `<details class="sub" id="n-${esc(s.id)}" data-toc data-imp="${s.importance}"${fileAttr(s.sources)}><summary>${esc(s.title)} <span class="pill ${s.importance}">${s.importance}</span> ${badges(s.sources, 2)}</summary><div class="subbody">${blocks(s.blocks)}</div></details>`
              )
              .join("");
        }
      })
      .join("\n");
  }

  // ---------------- sections
  const sections: string[] = [];
  let secNo = 0;
  const section = (id: string, title: string, body: string) => {
    sections.push(`<section class="sec" id="${id}" data-toc><h2><span class="no">§${++secNo}</span>${esc(title)}</h2>${body}</section>`);
  };

  const m = model.meta;
  const tocBrief: { id: string; title: string }[] = [];
  const brief = (id: string, title: string, body: string) => {
    tocBrief.push({ id, title });
    section(id, title, body);
  };

  const oneLiner = m.one_liner || m.executive_summary[0];
  const oneSrc = m.one_liner ? m.one_liner_sources : m.executive_summary_sources?.[0];
  const bottom = `<section class="sec" id="bottom" data-toc><div class="bottomline" data-claim="${esc(clip(oneLiner, 160))}"><div class="lab">${T.bottomLine}</div><div class="txt">${esc(oneLiner)}</div><div style="margin-top:12px">${badges(oneSrc, 4)}</div></div></section>`;
  tocBrief.push({ id: "bottom", title: T.bottomLine });

  if (model.highlights?.length)
    brief(
      "metrics",
      T.metrics,
      `<div class="metrics">${model.highlights
        .map(
          (h) =>
            `<div class="metric ${h.importance === "high" ? "high" : ""}" data-claim="${esc(clip(h.label, 100))}"${fileAttr(h.sources)}><div class="v">${esc(h.value)}</div><div class="l">${esc(h.label)}</div>${h.sub ? `<div class="s">${esc(h.sub)}</div>` : ""}<div>${badges(h.sources, 2)}</div></div>`
        )
        .join("")}</div>`
    );

  brief(
    "summary",
    T.summary,
    `<ul class="exec">${m.executive_summary.map((s, i) => `<li data-claim="${esc(clip(s, 160))}"${fileAttr(m.executive_summary_sources?.[i])}>${esc(s)} ${badges(m.executive_summary_sources?.[i], 3)}</li>`).join("")}</ul>`
  );

  if (model.diagrams?.length) {
    const tabs = model.diagrams.length > 1 ? `<div class="dtabs">${model.diagrams.map((d, i) => `<button data-p="dp${i}" class="${i === 0 ? "on" : ""}">${esc(d.title)}</button>`).join("")}</div>` : "";
    const panels = model.diagrams
      .map(
        (d, i) =>
          `<div class="dpanel ${i === 0 ? "on" : ""}" id="dp${i}">${diagramBox(d.title, d.mermaid)}<div class="dcap"><span>${d.caption ? esc(d.caption) : esc(d.title)} ${badges(d.sources, 3)}</span><span class="zoomhint">⤢ ${T.zoomHint}</span></div></div>`
      )
      .join("");
    brief("logic", T.logic, `<div class="diagram-wrap">${tabs}${panels}</div>`);
  }
  if (model.charts?.length) brief("charts", T.charts, `<div class="charts">${model.charts.map((c) => chartCard(c)).join("")}</div>`);

  if (model.keypoints?.length) {
    const tiers = (["high", "medium", "low"] as Importance[])
      .map((t) => {
        const ks = model.keypoints!.filter((k) => k.importance === t);
        if (!ks.length) return "";
        return `<div class="tier" data-imp="${t}"><h3><span class="dot ${t}"></span>${T[`tier_${t}` as "tier_high"]}</h3><ul class="kp">${ks
          .map(
            (k) =>
              `<li class="${k.importance}" data-imp="${k.importance}" data-claim="${esc(clip(k.text, 160))}"${fileAttr(k.sources)}>${k.kind ? `<span class="kind ${k.kind === "risk" ? "risk" : ""}">${esc(k.kind)}</span>` : "<span></span>"}<div>${esc(k.text)}${k.unverified ? `<span class="unv">${T.unverified}</span>` : ""} ${badges(k.sources, 3)}</div></li>`
          )
          .join("")}</ul></div>`;
      })
      .join("");
    brief("keypoints", T.keypoints, tiers);
  }

  if (model.conflicts?.length)
    brief(
      "conflicts",
      T.conflicts,
      model.conflicts
        .map(
          (c) =>
            `<div class="conf"${fileAttr(c.positions.map((p) => p.source))}><h3><span>${esc(c.topic)}</span>${c.confidence ? `<span class="pill ${c.confidence}">${T.confidence}: ${c.confidence}</span>` : ""}</h3><div class="cols">${c.positions
              .map((p) => `<div class="pos" data-claim="${esc(clip(p.value, 120))}">${esc(p.value)}<div style="margin-top:6px">${badges([p.source], 1)}</div></div>`)
              .join("")}</div>${c.resolution ? `<div class="res"><b>${T.resolution}:</b> ${esc(c.resolution)}</div>` : ""}</div>`
        )
        .join("")
    );

  if (model.quotes?.length)
    brief(
      "quotes",
      T.quotes,
      `<div class="quotes">${model.quotes.map((q) => `<blockquote class="q" data-claim="${esc(clip(q.text, 100))}"${fileAttr([q.source])}>“${esc(q.text)}”<footer>${q.attribution ? esc(q.attribution) + " " : ""}${badges([q.source])}</footer></blockquote>`).join("")}</div>`
    );

  // chapters
  const chapterHtml = model.chapters
    .map((c, i) => {
      const allRefs: SourceRef[] = [...c.sources];
      const collect = (bs: Block[]) =>
        bs.forEach((b) => {
          if ("sources" in b && b.sources) allRefs.push(...b.sources);
          if (b.type === "subsections") b.items.forEach((s) => (allRefs.push(...(s.sources || [])), collect(s.blocks)));
        });
      collect(c.blocks);
      return `<details class="chap" id="n-${esc(c.id)}" data-toc data-imp="${c.importance}"${fileAttr(allRefs)}><summary><span class="no">${i + 1}</span><span class="grow">${esc(c.title)}</span><span class="pill ${c.importance}">${c.importance}</span></summary><div class="chapbody">${blocks(c.blocks)}<div>${badges(c.sources, 3)}</div></div></details>`;
    })
    .join("");
  brief("chapters", T.chapters, chapterHtml);

  // ---------------- appendix
  const rep = model.distillation_report;
  const apx: string[] = [];
  apx.push(
    `<h3>${T.sourceFiles}</h3><div class="tblwrap"><table class="t"><thead><tr><th>${T.name}</th><th>${T.type}</th><th>${T.pages}</th><th>${T.words}</th><th>${T.date}</th><th>${T.role}</th></tr></thead><tbody>${model.files
      .map((f) => `<tr><td>${esc(f.name)}</td><td>${esc(f.type)}</td><td class="num">${f.pages ?? "—"}</td><td class="num">${f.words ?? "—"}</td><td>${esc(f.date || "—")}</td><td>${esc(f.role || "")}</td></tr>`)
      .join("")}</tbody></table></div>`
  );
  if (model.file_relations)
    apx.push(`<h3>${T.relations}</h3><div class="diagram-wrap">${diagramBox(T.relations, model.file_relations.mermaid)}${model.file_relations.note ? `<div class="dcap"><span>${esc(model.file_relations.note)}</span></div>` : ""}</div>`);
  if (rep) {
    const cell = (k: string, v: string) => `<div class="apx-c"><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`;
    apx.push(
      `<h3>${T.check}</h3><div class="apx-grid">${[
        cell(T.srcWords, String(rep.source_words ?? "—")),
        cell(T.modelWords, String(rep.model_words ?? "—")),
        cell(T.compression, rep.compression_ratio || "—"),
        cell(T.coverage, rep.section_coverage || "—"),
        cell(T.claims, rep.claims_with_source || "—"),
        cell(T.todo, rep.todo_ratio || "—"),
        cell(T.engine, m.engine || "—"),
        cell(T.generated, m.generated_at || "—"),
      ].join("")}</div>`
    );
  }
  if (opts.validation)
    apx.push(
      `<h3>${T.validation}</h3>${opts.validation.gates.map((g) => `<div class="gate ${g.pass ? "pass" : "fail"}"><i>${g.pass ? "✓" : "✗"}</i> ${esc(g.name)} — ${esc(g.detail)}</div>`).join("")}${opts.validation.issues
        .slice(0, 12)
        .map((i) => `<div class="gate ${i.level === "error" ? "fail" : ""}" style="margin-left:18px;color:var(--muted)">${i.level === "error" ? "✗" : "!"} ${esc(i.message)}</div>`)
        .join("")}`
    );
  if (rep?.fact_check_items?.length)
    apx.push(
      `<h3>${T.factcheck}${rep.fact_check ? ` — ${esc(rep.fact_check)}` : ""}</h3><details><summary style="cursor:pointer;color:var(--ink);font-weight:600">${rep.fact_check_items.length} ▾</summary><div class="tblwrap"><table class="t fc"><thead><tr><th>${T.claim}</th><th>${T.verdictCol}</th><th>${T.note}</th></tr></thead><tbody>${rep.fact_check_items
        .map((it) => `<tr><td>${esc(it.claim)} ${badges(it.source ? [it.source] : [], 1)}</td><td class="v-${it.verdict}">${T.verdict[it.verdict]}</td><td>${esc(it.note || "")}</td></tr>`)
        .join("")}</tbody></table></div></details>`
    );
  const appendix = `<details class="appx" id="appendix" data-toc><summary>${T.appendix}</summary>${apx.join("")}</details>`;

  // ---------------- TOC
  const outlineToc = (nodes: OutlineNode[]): string =>
    `<ul>${nodes
      .map(
        (n) =>
          `<li data-imp="${n.importance}"><div class="node"><button class="tg ${n.children?.length ? "" : "empty"}" aria-label="toggle">${n.children?.length ? "▾" : ""}</button><a class="imp-${n.importance}" href="#n-${esc(n.id)}" title="${esc(n.summary || n.title)}"><span class="dot ${n.importance}"></span>${esc(n.id.includes(".") ? "" : n.id + " · ")}${esc(clip(n.title, 54))}</a></div>${n.children?.length ? outlineToc(n.children) : ""}</li>`
      )
      .join("")}</ul>`;
  const toc = `<div class="toc-title">${T.briefing}</div><div class="toc"><ul>${tocBrief.map((b) => `<li><div class="node"><button class="tg empty"></button><a href="#${b.id}">${esc(b.title)}</a></div></li>`).join("")}</ul></div><div class="toc-title">${T.outline}</div><div class="toc">${outlineToc(model.outline)}</div><div class="toc-title"> </div><div class="toc"><ul><li><div class="node"><button class="tg empty"></button><a href="#appendix">${T.appendix.split(" — ")[0]}</a></div></li></ul></div>`;

  // ---------------- header line
  const st = m.stats;
  const srcMin = st.reading_minutes ?? Math.max(1, Math.round((st.total_words || 0) / 230));
  const modelMin = Math.max(1, Math.round((rep?.model_words || 0) / 230));
  const mastBits = [
    `<span><b>${st.file_count}</b> ${T.files}</span>`,
    st.total_pages ? `<span><b>${st.total_pages}</b> ${T.pages}</span>` : "",
    st.total_words ? `<span><b>${st.total_words.toLocaleString("en-US")}</b> ${T.words}</span>` : "",
    `<span>${T.readTime.replace("{a}", String(srcMin)).replace("{b}", String(modelMin))}</span>`,
    m.generated_at ? `<span>${T.generated} ${esc(m.generated_at)}</span>` : "",
  ].filter(Boolean);

  const fileOptions = model.files.map((f) => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join("");

  const vendorTags = opts.inlineVendor
    ? `<script>${safeScript(vendor(VENDOR_FILES["chart.js"]))}</script>${model.diagrams?.length || model.file_relations ? `<script>${safeScript(vendor(VENDOR_FILES["mermaid.js"]))}</script>` : ""}`
    : `<script src="/api/vendor/chart.js"></script>${model.diagrams?.length || model.file_relations ? `<script src="/api/vendor/mermaid.js"></script>` : ""}`;

  const body = `<div class="layout">
<aside class="side">
  <div class="brand"><i></i>DOC ATLAS</div>
  <div class="searchbox"><input id="q" type="search" placeholder="${esc(T.search)}" autocomplete="off"><span class="cnt"><span id="cnt"></span><button id="prev" aria-label="prev">↑</button><button id="next" aria-label="next">↓</button></span></div>
  <div class="row"><button class="btn" id="modeBtn">${T.expandAll}</button></div>
  <details class="tools"><summary>⚙ ${T.tools}</summary><div class="inner">
    <div><b style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">${T.importance}</b></div>
    <label><input type="checkbox" data-imp="high" checked><span class="dot high"></span> ${T.tier_high}</label>
    <label><input type="checkbox" data-imp="medium" checked><span class="dot medium"></span> ${T.tier_medium}</label>
    <label><input type="checkbox" data-imp="low" checked><span class="dot low"></span> ${T.tier_low}</label>
    <div><b style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">${T.onlyFile}</b></div>
    <select id="srcFilter"><option value="">${T.allFiles}</option>${fileOptions}</select>
  </div></details>
  ${toc}
</aside>
<main>
  <header class="mast">
    <div class="kicker">${T.kicker}</div>
    <h1 class="title">${esc(m.title)}</h1>
    <div class="mastline">${mastBits.join("")}</div>
    ${m.reading_goal ? `<div class="goal nosearch"><span>${T.goal}:</span> ${esc(m.reading_goal)}</div>` : ""}
  </header>
  ${bottom}
  ${sections.join("\n")}
  ${appendix}
</main>
</div>
<div id="drawer"><header><b></b><button class="btn" data-x>${T.close}</button></header><div class="body"></div><div class="note"></div></div>
<div id="zoom"><div class="bar"><b></b><button class="btn" data-z="out">−</button><button class="btn" data-z="in">+</button><button class="btn" data-z="fit">${T.fit}</button><button class="btn" data-z="close">${T.close} ✕</button></div><div class="stage"><div class="inner"></div></div></div>`;

  const data = {
    ui: {
      expandAll: T.expandAll,
      briefOnly: T.briefOnly,
      noHits: T.noHits,
      noSnippet: T.noSnippet,
      mermaidMissing: T.mermaidMissing,
      diagramError: T.diagramError,
      chartMissing: T.chartMissing,
    },
    refs,
    charts,
  };

  return `<!doctype html>
<html lang="${opts.uiLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(m.title)} — Doc Atlas</title>
<style>${CSS}</style>
</head>
<body>
${body}
<script type="application/json" id="atlas-data">${safeJson(data)}</script>
${vendorTags}
<script>${safeScript(CLIENT_JS)}</script>
</body>
</html>`;
}
