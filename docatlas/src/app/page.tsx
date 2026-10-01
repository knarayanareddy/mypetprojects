import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import NewAtlas from "@/components/NewAtlas";

export const dynamic = "force-dynamic";

const STEPS = [
  ["Scan + one-shot confirm", "Pick the files, the dashboard language and — most important — what you want out of the documents."],
  ["Normalize", "Every file becomes Markdown. PDFs get per-page anchors, tables keep their rows × columns, images become assets."],
  ["Consolidate", "Cross-file de-duplication, conflicts surfaced instead of silently resolved, importance graded against your goal."],
  ["Fact-check", "An adversarial pass goes back to the original text, refutes what it can, recomputes numbers and recovers omissions."],
  ["Render", "A machine validation gate, then one deterministic single-file HTML — Chart.js and Mermaid inlined, zero external links."],
  ["Self-check & deliver", "Distillation report reconciled against ground truth: coverage, compression, share still to verify."],
];

const FEATURES = [
  ["The Bottom Line", "A one-sentence verdict that answers your reading goal, right at the top."],
  ["Logic diagram as the star", "Cause-and-effect read from the text, drawn large; click to zoom, pan and fit."],
  ["Every claim cited", "Source badges open the original text at that page, slide, sheet or section."],
  ["Conflicts side by side", "When two files disagree on a number or date, both are shown with their sources."],
  ["Paper briefing skin", "Rice-paper and blue ink, one reading spine: verdict → briefing → chapters → quiet appendix."],
  ["Truly offline", "Download one HTML file. Search, filters, TOC, charts and diagrams all work with no network."],
];

export default async function Home() {
  const recent = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      updatedAt: projects.updatedAt,
      files: sql<number>`(select count(*)::int from documents d where d.project_id = ${projects.id})`,
    })
    .from(projects)
    .orderBy(desc(projects.updatedAt))
    .limit(8);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex items-center justify-between border-b-[3px] border-double border-ink pb-4">
        <div className="flex items-center gap-2 font-serif text-lg font-bold tracking-wide text-ink">
          <span className="inline-block h-2.5 w-2.5 rotate-45 bg-verm" /> DOC ATLAS
        </div>
        <div className="text-xs text-muted">documents in · one traceable dashboard out</div>
      </header>

      <section className="grid gap-10 py-12 lg:grid-cols-[1.05fr_1fr] lg:items-start">
        <div>
          <div className="kicker">Document distillation</div>
          <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-ink md:text-5xl">
            Many documents in. One briefing out. Every claim traceable.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed">
            Doc Atlas distils PDF, Word, PowerPoint, Excel, EPUB, HTML and Markdown files into a single, offline,
            self-contained dashboard — with a one-sentence verdict, a large logic diagram, conflicts between files surfaced,
            and every statement linked back to <em>which file, which page</em>.
          </p>
          <div className="mt-6 grid gap-2 text-sm sm:grid-cols-3">
            {[
              ["① Highly distilled", "the dashboard is enough — no need to open the source"],
              ["② Accurate & traceable", "zero hallucination, honest “unverified” flags, adversarial fact-check"],
              ["③ Logic diagram first", "the core causality as a big, zoomable picture"],
            ].map(([t, d]) => (
              <div key={t} className="border-l-[3px] border-verm bg-[#fbf7ea] px-3 py-2">
                <div className="font-semibold text-ink">{t}</div>
                <div className="text-xs text-muted">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <NewAtlas />
      </section>

      {recent.length > 0 && (
        <section className="pb-10">
          <h2 className="border-b border-rule pb-2 font-serif text-xl text-ink">Recent atlases</h2>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/p/${p.id}`} className="paper-card flex items-center justify-between px-4 py-3 hover:border-ink">
                  <span>
                    <span className="font-semibold text-ink">{p.name}</span>
                    <span className="block text-xs text-muted">
                      {p.files} file{p.files === 1 ? "" : "s"} · {p.updatedAt.toLocaleString("en-US")}
                    </span>
                  </span>
                  <span className={`border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${p.status === "distilled" ? "border-[#2f7d4f] text-[#2f7d4f]" : "border-rule text-muted"}`}>
                    {p.status === "distilled" ? "dashboard ready" : "draft"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="py-6">
        <h2 className="border-b border-rule pb-2 font-serif text-xl text-ink">What you get</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="paper-card p-4">
              <div className="font-serif text-lg font-bold text-ink">{t}</div>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-6">
        <h2 className="border-b border-rule pb-2 font-serif text-xl text-ink">Six-step workflow</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="paper-card relative p-4 pl-14">
              <span className="absolute left-4 top-3 font-serif text-3xl font-bold text-verm">{i}</span>
              <div className="font-semibold text-ink">{t}</div>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-8 border-t border-rule pt-4 text-xs text-muted">
        Optional: set <code>OPENAI_API_KEY</code> or <code>ANTHROPIC_API_KEY</code> to let an LLM write the judgement layer; without a key
        the built-in extractive engine copies sentences verbatim from your files, so nothing can be invented.
      </footer>
    </div>
  );
}
