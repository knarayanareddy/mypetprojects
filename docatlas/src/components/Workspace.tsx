"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface DocRow {
  id: string;
  fileId: string;
  name: string;
  type: string;
  size: number;
  pages: number | null;
  words: number;
  included: boolean;
  cached: boolean;
  images: number;
  tables: number;
  sections: number;
  warnings: string[];
  date: string | null;
  unitKind: string;
}
interface Gate {
  name: string;
  pass: boolean;
  detail: string;
}
interface Validation {
  ok: boolean;
  errors: number;
  warnings: number;
  gates: Gate[];
  issues: { level: string; message: string }[];
}
interface LogLine {
  stage: string;
  status: "ok" | "warn" | "error" | "info";
  message: string;
}
interface Project {
  id: string;
  name: string;
  status: string;
  uiLang: "en" | "zh";
  readingGoal: string;
  engine: string;
  hasModel: boolean;
  validation: Validation | null;
  factcheck: { summary: string } | null;
  log: LogLine[] | null;
  updatedAt: string;
}

const STAGES = ["Scan", "Normalize", "Consolidate", "Fact-check", "Render", "Deliver"];

export default function Workspace({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [llm, setLlm] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [notes, setNotes] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ name: string; content: string; truncated: boolean } | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
    if (res.status === 404) return setNotFound(true);
    const j = await res.json();
    setProject(j.project);
    setDocs(j.docs);
    setLlm(j.llm);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      await fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    },
    [id]
  );

  const debounced = (body: Record<string, unknown>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => patch(body), 500);
  };

  async function upload(list: FileList | File[]) {
    setUploading(true);
    setErr("");
    setNotes([]);
    const fd = new FormData();
    Array.from(list).forEach((f) => fd.append("files", f));
    const res = await fetch(`/api/projects/${id}/files`, { method: "POST", body: fd });
    const j = await res.json();
    setUploading(false);
    if (!res.ok) return setErr(j.error || "Upload failed");
    setNotes((j.results as { name: string; status: string; message?: string }[]).filter((r) => r.message).map((r) => `${r.name}: ${r.message}`));
    await load();
  }

  async function removeDoc(docId: string) {
    await fetch(`/api/projects/${id}/files/${docId}`, { method: "DELETE" });
    await load();
  }

  async function toggleDoc(d: DocRow) {
    setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, included: !x.included } : x)));
    await patch({ included: { [d.id]: !d.included } });
  }

  async function showPreview(d: DocRow) {
    const res = await fetch(`/api/projects/${id}/docs/${d.id}`);
    const j = await res.json();
    setPreview({ name: j.name, content: j.content, truncated: j.truncated });
  }

  async function distill() {
    if (!project) return;
    setRunning(true);
    setErr("");
    setStage(1);
    await patch({ readingGoal: project.readingGoal, uiLang: project.uiLang, engine: project.engine, name: project.name });
    const t = [setTimeout(() => setStage(2), 500), setTimeout(() => setStage(3), 1800), setTimeout(() => setStage(4), 3200)];
    const res = await fetch(`/api/projects/${id}/distill`, { method: "POST" });
    t.forEach(clearTimeout);
    const j = await res.json();
    setRunning(false);
    if (!res.ok) {
      setStage(0);
      return setErr(j.error || "Distillation failed");
    }
    setStage(6);
    await load();
    setFrameKey((k) => k + 1);
    setTimeout(() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" }), 200);
  }

  async function remove() {
    if (!confirm("Delete this atlas and its files?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (notFound)
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-ink">Atlas not found</h1>
        <Link href="/" className="btn-primary mt-6 inline-block">
          Back to start
        </Link>
      </div>
    );
  if (!project) return <div className="p-10 text-muted">Loading…</div>;

  const included = docs.filter((d) => d.included);
  const totalWords = included.reduce((a, d) => a + d.words, 0);
  const done = project.hasModel;
  const dashUrl = `/api/projects/${id}/dashboard?lang=${project.uiLang}`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-double border-ink pb-4">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-bold tracking-wide text-ink">
          <span className="inline-block h-2.5 w-2.5 rotate-45 bg-verm" /> DOC ATLAS
        </Link>
        <button className="text-xs text-verm hover:underline" onClick={remove}>
          delete atlas
        </button>
      </header>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="kicker">Atlas workspace</div>
          <input
            className="mt-1 w-full border-0 border-b border-dashed border-rule bg-transparent font-serif text-3xl font-bold text-ink outline-none focus:border-ink"
            value={project.name}
            onChange={(e) => {
              setProject({ ...project, name: e.target.value });
              debounced({ name: e.target.value });
            }}
          />
        </div>
        <ol className="flex flex-wrap gap-1 text-[11px] font-bold uppercase tracking-wider">
          {STAGES.map((s, i) => {
            const state = done && !running ? "done" : running ? (i < stage ? "done" : i === stage ? "now" : "todo") : i <= 1 ? "done" : "todo";
            return (
              <li key={s} className={`border px-2 py-1 ${state === "done" ? "border-[#2f7d4f] text-[#2f7d4f]" : state === "now" ? "border-ink bg-ink text-white" : "border-rule text-muted"}`}>
                {i}·{s}
              </li>
            );
          })}
        </ol>
      </div>

      {/* ---- step 0/1 : scan + one-shot confirm */}
      <section className="paper-card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3">
          <h2 className="font-serif text-xl text-ink">1 · Scan &amp; confirm</h2>
          <div className="text-xs text-muted">
            {included.length} of {docs.length} files · {totalWords.toLocaleString("en-US")} words · ≈ {Math.max(1, Math.round(totalWords / 230))} min to read
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper2 text-left text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2">Include</th>
                <th className="px-2 py-2">File</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2 text-right">Pages</th>
                <th className="px-2 py-2 text-right">Words</th>
                <th className="px-2 py-2 text-right">Tables</th>
                <th className="px-2 py-2 text-right">Images</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-t border-rule align-top">
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={d.included} onChange={() => toggleDoc(d)} className="h-4 w-4 accent-[#1f3a8a]" aria-label={`Include ${d.name}`} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-[11px] text-muted">
                      {d.fileId}
                      {d.cached ? " · reused from cache" : ""} · {d.sections} headings
                    </div>
                    {d.warnings.map((w, i) => (
                      <div key={i} className="mt-1 max-w-md border-l-2 border-[#b45309] bg-[#fbefd5] px-2 py-1 text-[11px] text-[#b45309]">
                        {w}
                      </div>
                    ))}
                  </td>
                  <td className="px-2 py-2 uppercase text-muted">{d.type}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{d.pages ?? "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{d.words.toLocaleString("en-US")}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{d.tables}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{d.images}</td>
                  <td className="px-2 py-2 text-muted">{d.date ?? "—"}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    <button className="mr-3 text-xs text-ink hover:underline" onClick={() => showPreview(d)}>
                      content.md
                    </button>
                    <button className="text-xs text-verm hover:underline" onClick={() => removeDoc(d.id)}>
                      remove
                    </button>
                  </td>
                </tr>
              ))}
              {!docs.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-muted">
                    No files yet — add some below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-rule px-5 py-3">
          <button className="btn-ghost" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? "Normalizing…" : "+ Add more files"}
          </button>
          <input ref={fileInput} type="file" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
          {notes.map((n, i) => (
            <span key={i} className="text-xs text-muted">
              {n}
            </span>
          ))}
        </div>

        <div className="grid gap-5 border-t border-rule px-5 py-5 md:grid-cols-[1.6fr_1fr]">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted" htmlFor="goal">
              Your reading goal — what do you want out of these documents?
            </label>
            <textarea
              id="goal"
              rows={3}
              className="field mt-1"
              placeholder="e.g. Decide whether to renew the contract · Understand what changed between versions · Find the risks I must escalate"
              value={project.readingGoal}
              onChange={(e) => {
                setProject({ ...project, readingGoal: e.target.value });
                debounced({ readingGoal: e.target.value });
              }}
            />
            <p className="mt-1 text-xs text-muted">The goal drives importance grading, metric selection and the one-sentence verdict.</p>
          </div>
          <div className="grid content-start gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Dashboard language</div>
              <div className="mt-1 flex gap-2">
                {(["en", "zh"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setProject({ ...project, uiLang: l });
                      patch({ uiLang: l });
                      if (done) setFrameKey((k) => k + 1);
                    }}
                    className={project.uiLang === l ? "btn-primary" : "btn-ghost"}
                  >
                    {l === "en" ? "English" : "中文"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted" htmlFor="engine">
                Consolidation engine
              </label>
              <select
                id="engine"
                className="field mt-1"
                value={project.engine}
                onChange={(e) => {
                  setProject({ ...project, engine: e.target.value });
                  patch({ engine: e.target.value });
                }}
              >
                <option value="auto">Auto ({llm ? `LLM · ${llm}` : "built-in extractive"})</option>
                <option value="builtin">Built-in extractive (verbatim, offline)</option>
                <option value="llm" disabled={!llm}>
                  LLM judgement layer {llm ? `(${llm})` : "— no API key set"}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-rule bg-paper2 px-5 py-4">
          <button className="btn-primary" disabled={running || !included.length} onClick={distill}>
            {running ? `${STAGES[Math.min(stage, 4)]}…` : done ? "Re-distil with these settings" : "Distil into a dashboard →"}
          </button>
          {err && <span className="text-sm text-verm">{err}</span>}
          {!err && !included.length && <span className="text-sm text-muted">Select at least one file.</span>}
        </div>
      </section>

      {/* ---- results */}
      {done && project.validation && (
        <section className="paper-card mt-6" id="results">
          <div className="border-b border-rule px-5 py-3">
            <h2 className="font-serif text-xl text-ink">2 · Fact-check &amp; validation</h2>
            {project.factcheck && <p className="mt-1 text-sm text-muted">{project.factcheck.summary}</p>}
          </div>
          <div className="grid gap-5 px-5 py-4 md:grid-cols-[1fr_1.2fr]">
            <ul className="grid content-start gap-1.5 text-sm">
              {project.validation.gates.map((g) => (
                <li key={g.name} className="flex items-center gap-2">
                  <span className={`inline-flex h-5 w-5 items-center justify-center text-xs font-bold text-white ${g.pass ? "bg-[#2f7d4f]" : "bg-verm"}`}>{g.pass ? "✓" : "✗"}</span>
                  <b>{g.name}</b>
                  <span className="text-muted">— {g.detail}</span>
                </li>
              ))}
              {project.validation.issues.slice(0, 6).map((i, k) => (
                <li key={k} className={`ml-7 text-xs ${i.level === "error" ? "text-verm" : "text-muted"}`}>
                  {i.level === "error" ? "✗" : "!"} {i.message}
                </li>
              ))}
            </ul>
            <ol className="max-h-56 overflow-auto border border-rule bg-[#fffdf5] p-3 font-mono text-[12px] leading-relaxed">
              {(project.log || []).map((l, i) => (
                <li key={i} className={l.status === "error" ? "text-verm" : l.status === "warn" ? "text-[#b45309]" : ""}>
                  <span className="text-muted">[{l.stage}]</span> {l.message}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {done && (
        <section className="mt-6" id="dashboard">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <h2 className="font-serif text-xl text-ink">3 · Dashboard</h2>
            <div className="flex flex-wrap gap-2">
              <a className="btn-ghost" href={dashUrl} target="_blank" rel="noreferrer">
                Open full page ↗
              </a>
              <a className="btn-primary" href={`/api/projects/${id}/dashboard?download=1&lang=${project.uiLang}`}>
                Download offline HTML
              </a>
              <a className="btn-ghost" href={`/api/projects/${id}/model`}>
                model.json
              </a>
            </div>
          </div>
          <iframe key={frameKey} title="Dashboard preview" src={dashUrl} className="h-[85vh] w-full border border-ink bg-white" />
          <p className="mt-2 text-xs text-muted">
            The download is one self-contained file: Chart.js and Mermaid are inlined, source text is embedded for the citation drawer, and nothing is fetched from the network.
          </p>
        </section>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPreview(null)}>
          <div className="paper-card flex max-h-[85vh] w-full max-w-3xl flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-rule px-4 py-2">
              <b className="font-serif text-ink">{preview.name} — normalized content.md</b>
              <button className="btn-ghost" onClick={() => setPreview(null)}>
                Close
              </button>
            </div>
            <pre className="overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">
              {preview.content}
              {preview.truncated ? "\n\n… (preview truncated)" : ""}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
