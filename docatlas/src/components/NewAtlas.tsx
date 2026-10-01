"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const FORMATS = ["PDF", "DOCX", "PPTX", "XLSX", "HTML", "EPUB", "MD", "TXT", "CSV", "JSON", "XML"];

export default function NewAtlas() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"" | "upload" | "sample">("");
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  const add = (list: FileList | File[]) => setFiles((prev) => [...prev, ...Array.from(list)]);

  async function create(sample: boolean) {
    setError("");
    setBusy(sample ? "sample" : "upload");
    try {
      let res: Response;
      if (sample) {
        res = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sample: true }) });
      } else {
        const fd = new FormData();
        fd.set("name", name || (files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : `Atlas of ${files.length} documents`));
        files.forEach((f) => fd.append("files", f));
        res = await fetch("/api/projects", { method: "POST", body: fd });
      }
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Upload failed");
      router.push(`/p/${j.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }

  return (
    <div className="paper-card p-6">
      <div className="kicker">Step 0 · Scan</div>
      <h2 className="font-serif text-2xl text-ink mt-1">Drop in the documents you want distilled</h2>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        className={`mt-4 cursor-pointer border-2 border-dashed px-6 py-10 text-center transition ${over ? "border-ink bg-[#e8eefb]" : "border-rule bg-[#fffdf5] hover:border-ink"}`}
      >
        <div className="font-serif text-lg text-ink">Drag files here, or click to browse</div>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {FORMATS.map((f) => (
            <span key={f} className="border border-rule bg-card px-2 py-0.5 text-[11px] font-bold tracking-wider text-muted">
              {f}
            </span>
          ))}
        </div>
        <div className="mt-2 text-xs text-muted">Legacy .doc / .ppt / .xls: re-save as .docx / .pptx / .xlsx first.</div>
        <input ref={input} type="file" multiple hidden accept=".pdf,.docx,.pptx,.xlsx,.html,.htm,.epub,.md,.markdown,.txt,.csv,.json,.xml" onChange={(e) => e.target.files && add(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <ul className="divide-y divide-rule border border-rule bg-[#fffdf5] text-sm">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2">
                <span className="truncate">{f.name}</span>
                <span className="flex items-center gap-3 text-xs text-muted">
                  {(f.size / 1024).toFixed(0)} KB
                  <button className="text-verm hover:underline" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                    remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-3">
            <input className="field max-w-xs" placeholder="Atlas name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn-primary" disabled={!!busy} onClick={() => create(false)}>
              {busy === "upload" ? "Normalizing…" : `Scan ${files.length} file${files.length > 1 ? "s" : ""} →`}
            </button>
          </div>
        </div>
      )}

      {error && <div className="mt-3 border-l-4 border-verm bg-[#fbe4dd] px-3 py-2 text-sm text-verm">{error}</div>}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-rule pt-4 text-sm text-muted">
        <span>No documents at hand?</span>
        <button className="btn-ghost" disabled={!!busy} onClick={() => create(true)}>
          {busy === "sample" ? "Loading sample…" : "Try the sample (2 reports + 1 CSV that disagree)"}
        </button>
      </div>
    </div>
  );
}
