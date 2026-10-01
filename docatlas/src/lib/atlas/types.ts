// Intermediate representation (model.json) — mirrors doc-atlas' schema (v2).
// The engine only ever produces this structure; the renderer compiles it to HTML.

export type Importance = "high" | "medium" | "low";
export type Tone = "info" | "warn" | "success" | "danger";

export interface SourceRef {
  file_id: string;
  page?: number | null;
  loc?: string | null;
}

export interface MetricItem {
  value: string;
  label: string;
  sub?: string | null;
  importance?: Importance | null;
  sources?: SourceRef[];
}

export interface FactCheckItem {
  claim: string;
  verdict: "ok" | "deviation" | "error" | "missing";
  source?: SourceRef | null;
  note?: string | null;
}

export interface DistillationReport {
  source_words?: number | null;
  model_words?: number | null;
  compression_ratio_x?: number | null;
  compression_ratio?: string | null;
  sections_total?: number | null;
  sections_mapped?: number | null;
  section_coverage?: string | null;
  claims_total?: number | null;
  claims_with_source_count?: number | null;
  claims_with_source?: string | null;
  todo_count?: number | null;
  data_points?: number | null;
  todo_ratio?: string | null;
  derived_numbers?: number | null;
  unmapped_source_blocks?: string[];
  fact_check?: string | null;
  fact_check_items?: FactCheckItem[];
}

export interface FileEntry {
  id: string;
  name: string;
  type: string;
  pages?: number | null;
  words?: number | null;
  date?: string | null;
  role?: string | null;
}

export interface Conflict {
  id: string;
  topic: string;
  positions: { value: string; source: SourceRef }[];
  resolution?: string | null;
  confidence?: Importance | null;
}

export interface KeyPoint {
  id: string;
  text: string;
  kind?: string | null;
  importance: Importance;
  sources: SourceRef[];
  unverified?: boolean;
}

export interface Diagram {
  id: string;
  title: string;
  kind?: string | null;
  mermaid: string;
  caption?: string | null;
  sources: SourceRef[];
  /** Sentences the edges were derived from — each is fact-checked against the source. */
  evidence?: { text: string; source: SourceRef }[];
}

export interface ChartDef {
  id: string;
  title: string;
  caption?: string | null;
  chartjs: { type: string; data: Record<string, unknown>; options?: Record<string, unknown> };
  sources: SourceRef[];
  /** true when the numbers are computed by the engine rather than copied from a source table */
  derived?: boolean;
}

export interface Quote {
  id: string;
  text: string;
  attribution?: string | null;
  source: SourceRef;
}

export interface OutlineNode {
  id: string;
  title: string;
  summary?: string | null;
  importance: Importance;
  sources: SourceRef[];
  children?: OutlineNode[];
}

export type Block =
  | { type: "paragraph"; md: string; sources?: SourceRef[] }
  | { type: "callout"; tone: Tone; title?: string; md: string; sources?: SourceRef[] }
  | {
      type: "keypoints";
      items: { text: string; importance: Importance; sources?: SourceRef[]; unverified?: boolean }[];
    }
  | { type: "metric"; title?: string; items: MetricItem[]; sources?: SourceRef[] }
  | { type: "quote"; quote_id: string }
  | { type: "quote"; text: string; attribution?: string | null; source?: SourceRef }
  | { type: "diagram"; diagram_id: string }
  | { type: "diagram"; title?: string; mermaid: string; caption?: string | null; sources?: SourceRef[] }
  | { type: "chart"; chart_id: string }
  | {
      type: "chart";
      title?: string;
      chartjs: ChartDef["chartjs"];
      caption?: string | null;
      sources?: SourceRef[];
    }
  | {
      type: "table";
      title?: string;
      headers: string[];
      rows: string[][];
      truncated?: number;
      sources?: SourceRef[];
    }
  | { type: "image"; asset: string; file_id: string; caption?: string | null; sources?: SourceRef[] }
  | {
      type: "subsections";
      items: { id: string; title: string; importance: Importance; sources?: SourceRef[]; blocks: Block[] }[];
    };

export interface Chapter {
  id: string;
  title: string;
  importance: Importance;
  sources: SourceRef[];
  blocks: Block[];
}

export interface Model {
  meta: {
    title: string;
    content_lang: string;
    ui_lang?: string;
    generated_at?: string | null;
    stats: {
      file_count: number;
      total_pages?: number | null;
      total_words?: number | null;
      reading_minutes?: number | null;
    };
    executive_summary: string[];
    one_liner?: string | null;
    one_liner_sources?: SourceRef[];
    executive_summary_sources?: SourceRef[][];
    reading_goal?: string | null;
    engine?: string | null;
    schema_version?: number | null;
  };
  files: FileEntry[];
  file_relations?: { mermaid: string; note?: string | null } | null;
  highlights?: MetricItem[];
  distillation_report?: DistillationReport | null;
  conflicts?: Conflict[];
  keypoints?: KeyPoint[];
  diagrams?: Diagram[];
  charts?: ChartDef[];
  quotes?: Quote[];
  outline: OutlineNode[];
  chapters: Chapter[];
}

// ---- Normalized documents (the "workspace") ----

export interface DocAsset {
  id: string;
  mime: string;
  data: string; // base64
  caption?: string;
}

export interface DocMeta {
  headings: { level: number; title: string; unit: number }[];
  tables: number;
  warnings: string[];
  date?: string | null;
  unitKind: "page" | "slide" | "sheet" | "section";
  units: number;
  scannedPages?: number[];
}

export interface WorkDoc {
  fileId: string;
  name: string;
  type: string;
  pages: number | null;
  words: number;
  contentMd: string;
  assets: DocAsset[];
  meta: DocMeta;
}

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
  gates: { name: string; pass: boolean; detail: string }[];
}

export interface LogLine {
  stage: string;
  status: "ok" | "warn" | "error" | "info";
  message: string;
  at: string;
}
