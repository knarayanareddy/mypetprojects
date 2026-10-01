"use client";

import { useMemo, useState } from "react";
import {
  DIM_LABELS,
  aggregate,
  triangulate,
  type AggResult,
  type EvidenceItem,
  type JudgeCard,
  type TriResult,
} from "@/lib/radar";

const BASE = "skills/demand-radar/examples/notion-lite/";

const VERDICT_STYLE: Record<string, string> = {
  Go: "text-emerald-300 border-emerald-400/60",
  Conditional: "text-amber-300 border-amber-400/60",
  Pivot: "text-orange-300 border-orange-400/60",
  "No-go": "text-red-300 border-red-400/60",
};

const CONF_STYLE: Record<string, string> = {
  high: "bg-emerald-400/15 text-emerald-300",
  medium: "bg-amber-400/15 text-amber-300",
  lead: "bg-zinc-700/50 text-zinc-300",
};

function parse<T>(text: string): { value?: T; error?: string } {
  if (!text.trim()) return {};
  try {
    return { value: JSON.parse(text) as T };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "invalid JSON" };
  }
}

async function loadExample(file: string): Promise<string> {
  const res = await fetch(`/api/kit/file?path=${encodeURIComponent(BASE + file)}`);
  return res.ok ? res.text() : "";
}

function barColor(score: number) {
  return score >= 3.5 ? "bg-emerald-400" : score >= 2.5 ? "bg-amber-400" : "bg-red-400";
}

export default function Playground() {
  const [tab, setTab] = useState<"tri" | "agg">("agg");
  const [evidenceText, setEvidenceText] = useState("");
  const [judgesText, setJudgesText] = useState("");

  const tri = useMemo(() => {
    const p = parse<{ evidence?: EvidenceItem[] } | EvidenceItem[]>(evidenceText);
    if (p.error || !p.value) return { error: p.error } as { error?: string; result?: TriResult };
    const ev = Array.isArray(p.value) ? p.value : (p.value.evidence ?? []);
    return { result: triangulate(ev) };
  }, [evidenceText]);

  const agg = useMemo(() => {
    const p = parse<JudgeCard[] | { judges: JudgeCard[] }>(judgesText);
    if (p.error || !p.value) return { error: p.error } as { error?: string; result?: AggResult };
    return { result: aggregate(p.value) };
  }, [judgesText]);

  return (
    <div>
      <div role="tablist" className="mb-5 inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-sm">
        {[
          ["agg", "Aggregate judges"],
          ["tri", "Triangulate evidence"],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id as "tri" | "agg")}
            className={`rounded-md px-4 py-1.5 ${tab === id ? "bg-emerald-400 font-medium text-zinc-950" : "text-zinc-400 hover:text-zinc-100"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "agg" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="judges" className="text-sm font-medium text-zinc-200">judges.json</label>
              <div className="flex gap-2 text-xs">
                <button onClick={async () => setJudgesText(await loadExample("judges-initial.json"))} className="rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800">
                  Example: initial
                </button>
                <button onClick={async () => setJudgesText(await loadExample("judges.json"))} className="rounded border border-zinc-700 px-2 py-1 text-zinc-300 hover:bg-zinc-800">
                  Example: post red-team
                </button>
              </div>
            </div>
            <textarea
              id="judges"
              value={judgesText}
              onChange={(e) => setJudgesText(e.target.value)}
              spellCheck={false}
              placeholder='[{"judge":"optimist","scores":[{"dim":"pain_intensity","score":4,"evidence_ids":["E1"]}, ...]}, ...]'
              className="h-[28rem] w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 outline-none focus:border-emerald-400/60"
            />
            {agg.error && <p className="mt-2 text-sm text-red-300">JSON error: {agg.error}</p>}
          </section>

          <section>
            <div className="mb-2 text-sm font-medium text-zinc-200">Result</div>
            {agg.result ? <AggView r={agg.result} /> : <Empty text="Paste judge scorecards or load an example. Dimensions accept canonical ids, English names or the upstream Chinese names." />}
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="evidence" className="text-sm font-medium text-zinc-200">evidence.json</label>
              <button onClick={async () => setEvidenceText(await loadExample("evidence.json"))} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
                Load example
              </button>
            </div>
            <textarea
              id="evidence"
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              spellCheck={false}
              placeholder='{"evidence":[{"id":"E1","signal":"...","platform":"HN","source_type":"behavioral","origin":"primary","dims":["pain_intensity"]}, ...]}'
              className="h-[28rem] w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300 outline-none focus:border-emerald-400/60"
            />
            {tri.error && <p className="mt-2 text-sm text-red-300">JSON error: {tri.error}</p>}
          </section>
          <section>
            <div className="mb-2 text-sm font-medium text-zinc-200">Result</div>
            {tri.result ? <TriView r={tri.result} /> : <Empty text="Paste evidence items or load the example. 'HN' and 'Hacker News' count as one platform." />}
          </section>
        </div>
      )}
      <p className="mt-6 text-xs text-zinc-500">
        This is a TypeScript port of <code>triangulate.py</code> and <code>aggregate_scores.py</code> running in your browser; nothing is sent anywhere. In a real run the Python scripts do this, then
        <code> generate_report.py</code> renders the HTML report.
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-[28rem] items-center justify-center rounded-lg border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">{text}</div>;
}

function AggView({ r }: { r: AggResult }) {
  return (
    <div className="space-y-4">
      <div className={`flex items-end justify-between rounded-xl border bg-zinc-900/60 p-4 ${VERDICT_STYLE[r.verdict]}`}>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">Verdict</div>
          <div className="text-3xl font-semibold">{r.verdict}</div>
          {r.verdict_capped && <div className="mt-1 text-xs text-amber-300">Capped: willingness to pay or market size has no data</div>}
        </div>
        <div className="text-right">
          <div className="text-4xl font-semibold text-zinc-50">{r.weighted_pct}</div>
          <div className="text-xs text-zinc-500">/100 weighted · {r.n_judges} judges</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {r.demand_state.demand_reality && <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-200">{r.demand_state.demand_reality.text}</span>}
        {r.demand_state.opportunity && <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-200">{r.demand_state.opportunity.text}</span>}
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-400">confidence cap: {r.confidence_cap}</span>
      </div>

      <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        {r.dimensions.map((d) => (
          <div key={d.dim} className="grid grid-cols-[170px_1fr_64px] items-center gap-3 text-sm">
            <div className="text-zinc-300">
              {DIM_LABELS[d.dim] ?? d.dim}
              <span className="ml-1 text-[10px] text-zinc-500">×{d.weight}</span>
            </div>
            <div className="h-3 overflow-hidden rounded bg-zinc-800">
              {d.median === null ? (
                <div className="h-full w-full bg-[repeating-linear-gradient(135deg,#3f3f46_0,#3f3f46_4px,#27272a_4px,#27272a_8px)]" />
              ) : (
                <div className={`h-full ${barColor(d.median)}`} style={{ width: `${(d.median / 5) * 100}%` }} />
              )}
            </div>
            <div className="text-right font-mono text-xs text-zinc-300">
              {d.median === null ? "no data" : `${d.median}/5`}
              {d.disagreement && <span title="Judges disagree by 2 or more" className="ml-1 text-amber-300">⚠</span>}
            </div>
          </div>
        ))}
        <div className="pt-2 text-[11px] text-zinc-500">Green ≥ 3.5 · amber 2.5–3.4 · red &lt; 2.5 · hatch = no data, not scored as 0 · ⚠ judge spread ≥ 2</div>
      </div>

      {(r.flags.length > 0 || r.insufficient_dims.length > 0 || r.unrecognized_dims) && (
        <ul className="space-y-1 text-sm text-zinc-400">
          {r.flags.length > 0 && <li>Disagreement: {r.flags.map((f) => DIM_LABELS[f] ?? f).join(", ")}</li>}
          {r.insufficient_dims.length > 0 && <li>No data (excluded from the weighted total): {r.insufficient_dims.map((f) => DIM_LABELS[f] ?? f).join(", ")}</li>}
          {r.unrecognized_dims && <li className="text-red-300">Unrecognized dimensions ignored: {r.unrecognized_dims.join(", ")}</li>}
        </ul>
      )}
    </div>
  );
}

function TriView({ r }: { r: TriResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          [r.total_signals, "signals"],
          [r.verified.length, "verified (≥2 sources)"],
          [r.leads_only.length, "single-source leads"],
        ].map(([n, l]) => (
          <div key={String(l)} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="text-2xl font-semibold text-zinc-50">{n}</div>
            <div className="text-[11px] text-zinc-500">{l}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2">Signal</th>
              <th className="px-3 py-2">Platforms</th>
              <th className="px-3 py-2">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {r.signals.map((s) => (
              <tr key={s.signal} className="align-top">
                <td className="px-3 py-2 text-zinc-200">
                  {s.signal}
                  {s.all_secondhand && <div className="text-[11px] text-amber-300">all secondary: downgraded one level</div>}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-400">
                  {s.platforms.join(", ")} <span className="text-zinc-600">({s.n_sources})</span>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${CONF_STYLE[s.confidence]}`}>{s.confidence}</span>
                  {s.has_hard_evidence && <span className="ml-1 text-[11px] text-emerald-300">hard</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
        <div className="mb-2 font-medium text-zinc-200">Evidence per dimension (gap check)</div>
        <div className="space-y-1">
          {Object.entries(r.gaps.per_dim).map(([d, v]) => (
            <div key={d} className="flex items-center justify-between text-zinc-400">
              <span>{DIM_LABELS[d] ?? d}</span>
              <span className={`font-mono text-xs ${v.evidence < 2 ? "text-amber-300" : "text-zinc-300"}`}>
                {v.evidence} items · {v.platforms} platforms {v.evidence < 2 && "· lacking"}
              </span>
            </div>
          ))}
        </div>
        {r.gaps.unlabeled_evidence > 0 && <div className="mt-2 text-xs text-zinc-500">{r.gaps.unlabeled_evidence} items have no dims label.</div>}
        {r.unrecognized_platforms.length > 0 && (
          <div className="mt-2 text-xs text-amber-300">Platform names outside the vocabulary: {r.unrecognized_platforms.join(", ")}</div>
        )}
      </div>
    </div>
  );
}
