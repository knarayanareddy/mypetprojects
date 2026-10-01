import Link from "next/link";
import InstallTabs from "@/components/InstallTabs";
import { listKitFiles } from "@/lib/kit";

export const dynamic = "force-dynamic";

const PIPELINE = [
  { n: "01", t: "Frame", d: "Turn the idea into a falsifiable hypothesis: ICP, job, workaround, and 2-4 sub-claims whose fates are independent. One round of questions, never more." },
  { n: "02", t: "Collect", d: "Six collectors in parallel (or in turn): analyst reports, community pain, competitor reviews, search demand, social sentiment. Free official APIs plus web search." },
  { n: "03", t: "Triangulate", d: "A signal is verified only at 2 or more independent platforms. Names are normalised, reposts are downgraded, gaps per dimension are computed by script." },
  { n: "04", t: "Judge", d: "Optimist, strict and neutral personas score 7 axes in isolation. No evidence means null, never 0. Medians, disagreement flags, weighted verdict." },
  { n: "05", t: "Red-team", d: "A nine-method attack tries to kill each sub-claim. Data-backed counter-evidence goes back to the judges; the delta is shown in the report." },
  { n: "06", t: "Report", d: "Answer first: verdict, plain judgement, why, the one thing to do next. Evidence collapsed and traceable, plus what could not be verified." },
];

const MATRIX: { cap: string; hermes: string; roo: string; claude: string; fallback: string }[] = [
  { cap: "Ask once", hermes: "clarify", roo: "ask_followup_question", claude: "AskUserQuestion", fallback: "plain message" },
  { cap: "Shell", hermes: "terminal", roo: "execute_command", claude: "Bash", fallback: "python3 only" },
  { cap: "Files", hermes: "read_file / write_file / patch", roo: "read_file / write_to_file / apply_diff", claude: "Read / Write / Edit", fallback: "any file tool" },
  { cap: "Web search", hermes: "web_search", roo: "search MCP server", claude: "WebSearch", fallback: "connectors/searxng.py" },
  { cap: "Fetch page", hermes: "web_extract", roo: "browser_action / fetch MCP", claude: "WebFetch", fallback: "connectors/fetch_url.py" },
  { cap: "Subagents", hermes: "delegate_task (parallel)", roo: "new_task (sequential)", claude: "Agent tool", fallback: "single-agent mode" },
];

const BANDS = [
  { v: "No-go", r: "< 30%", c: "border-red-400/50 text-red-300", d: "Evidence does not support it" },
  { v: "Pivot", r: "30 – 50%", c: "border-orange-400/50 text-orange-300", d: "Real pain is elsewhere" },
  { v: "Conditional", r: "50 – 70%", c: "border-amber-400/50 text-amber-300", d: "Defuse one blocker first" },
  { v: "Go", r: "≥ 70%", c: "border-emerald-400/60 text-emerald-300", d: "Cheap next test" },
];

const RULES = [
  "A signal is verified only at 2+ independent platforms. One source is a lead.",
  "Competition proves demand. A red ocean only lowers the differentiation wedge, and only if you have no cut nobody holds.",
  "Opinion never supports willingness to pay. Stars and upvotes are attention, not payment.",
  "No Go while willingness to pay or market size has no data (verdict capped at Conditional).",
  "No login, no scraping, no bypassing blocks. A blocked source goes into “not verified”.",
  "Never invent data. Every claim has a URL, a verbatim quote and a date.",
];

export default function Home() {
  const files = listKitFiles();
  const scripts = files.filter((f) => f.path.includes("/scripts/") && f.path.endsWith(".py")).length;

  return (
    <main>
      {/* hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20">
          <div className="mb-5 flex flex-wrap gap-2">
            {["Hermes Agent", "Roo Code", "Claude Code", "Codex CLI", "any open-source agent"].map((h) => (
              <span key={h} className="rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-zinc-300">
                {h}
              </span>
            ))}
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-50 sm:text-6xl">
            Find out if the demand is real <span className="text-emerald-400">before you build.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-400">
            A portable agent skill that frames a falsifiable hypothesis, collects evidence from two pillars, triangulates it, scores seven axes with three judge personas,
            and sends a red team to kill the idea. You get an answer-first report: <strong className="text-zinc-200">Go, Conditional, Pivot or No-go</strong>.
            No login, no scrapers, no API keys.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/api/kit/zip" className="rounded-lg bg-emerald-400 px-5 py-3 font-medium text-zinc-950 hover:bg-emerald-300">
              Download the kit (.zip)
            </a>
            <Link href="/playground" className="rounded-lg border border-zinc-700 px-5 py-3 font-medium text-zinc-100 hover:bg-zinc-900">
              Try the scoring playground
            </Link>
            <Link href="/kit" className="px-2 py-3 text-sm text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline">
              Browse {files.length} files
            </Link>
          </div>
          <dl className="mt-12 grid max-w-2xl grid-cols-3 gap-4 border-t border-zinc-800 pt-6">
            {[
              [String(scripts), "Python scripts, stdlib only"],
              ["3", "execution modes (parallel, sequential, solo)"],
              ["15", "offline regression tests"],
            ].map(([a, b]) => (
              <div key={b}>
                <dt className="text-3xl font-semibold text-zinc-50">{a}</dt>
                <dd className="mt-1 text-xs text-zinc-500">{b}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* install */}
      <section id="install" className="mx-auto max-w-6xl scroll-mt-16 px-5 py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">Install on your agent</h2>
        <p className="mb-6 mt-2 max-w-2xl text-zinc-400">
          One folder in the Agent Skills format, one installer. The method lives in the skill; adapters hold only host glue.
        </p>
        <InstallTabs />
      </section>

      {/* pipeline */}
      <section id="pipeline" className="border-y border-zinc-800 bg-zinc-900/30">
        <div className="mx-auto max-w-6xl scroll-mt-16 px-5 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">How a run works</h2>
          <p className="mb-8 mt-2 max-w-2xl text-zinc-400">
            The model judges; scripts do the arithmetic. Every artifact is a JSON file in one run folder, so a run can be audited, resumed, or re-rendered without re-collecting.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PIPELINE.map((s) => (
              <div key={s.n} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="font-mono text-xs text-emerald-400">{s.n}</div>
                <div className="mt-1 text-lg font-medium text-zinc-100">{s.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-4">
            {BANDS.map((b) => (
              <div key={b.v} className={`rounded-xl border bg-zinc-950/60 p-4 ${b.c}`}>
                <div className="text-lg font-semibold">{b.v}</div>
                <div className="font-mono text-xs opacity-80">{b.r}</div>
                <div className="mt-2 text-xs text-zinc-400">{b.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* matrix + rules */}
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">One method, any toolset</h2>
          <p className="mb-5 mt-2 text-zinc-400">
            The skill is written against abstract capabilities and maps them per host, so swapping the agent does not change the method.
          </p>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  {["Capability", "Hermes", "Roo Code", "Claude Code", "Fallback shipped"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {MATRIX.map((r) => (
                  <tr key={r.cap} className="align-top">
                    <td className="px-3 py-2 font-medium text-zinc-200">{r.cap}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-400">{r.hermes}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-400">{r.roo}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-400">{r.claude}</td>
                    <td className="px-3 py-2 font-mono text-xs text-emerald-300">{r.fallback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">Rules it will not break</h2>
          <ul className="mt-5 space-y-3 text-sm text-zinc-300">
            {RULES.map((r) => (
              <li key={r} className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-emerald-400" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* license */}
      <section className="border-t border-zinc-800 bg-zinc-900/30">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="text-xl font-semibold text-zinc-50">Credit and license</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
            Demand Radar is by Leif Diao (
            <a className="text-emerald-300 underline" href="https://github.com/lemomo-ai/demand-radar">lemomo-ai/demand-radar</a>
            ), released under CC BY-NC 4.0. This edition keeps the method and rewrites the packaging so it runs on Hermes, Roo Code and other open-source agents; the list of changes is in
            <Link className="text-emerald-300 underline" href="/kit?file=CHANGES.md"> CHANGES.md</Link>. Free for personal, educational, research and other non-commercial use, with attribution. Commercial use needs a separate license from the original author.
          </p>
        </div>
      </section>
    </main>
  );
}
