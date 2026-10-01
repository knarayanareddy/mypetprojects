"use client";

import { useState } from "react";

type Tab = {
  id: string;
  label: string;
  intro: string;
  code: string;
  invoke: string;
  notes: string[];
  guide: string;
};

const TABS: Tab[] = [
  {
    id: "hermes",
    label: "Hermes Agent",
    intro: "Skills live in ~/.hermes/skills. The skill is already in Hermes' SKILL.md format; no conversion.",
    code: `unzip demand-radar.zip && cd demand-radar
python3 install.py --target hermes          # -> ~/.hermes/skills/research/demand-radar

# or straight from a Git repo that contains the kit
hermes skills install <you>/<repo>/skills/demand-radar

hermes skills list                           # confirm it is visible`,
    invoke: "/demand-radar a simpler Notion for 5-20 person remote teams",
    notes: [
      "Uses terminal, read_file / write_file, web_search + web_extract, delegate_task.",
      "delegate_task children start with no context and cannot ask questions: the prompts in prompts/ carry everything.",
      "Default batch concurrency is small; the skill batches within it. On one local GPU set max_concurrent_children: 1 (Mode B).",
      "Re-validate monthly with Hermes' scheduler and diff the verdicts.",
    ],
    guide: "adapters/hermes/README.md",
  },
  {
    id: "roo",
    label: "Roo Code",
    intro: "Skill + a custom mode (📡 Demand Radar) + a /demand slash command + mode rules, all wired by one installer.",
    code: `unzip demand-radar.zip && cd demand-radar
python3 install.py --target roo --dest ~/code/my-project
#   .roo/skills/demand-radar   .roo/commands/demand.md
#   .roo/rules-demand-radar/   .roomodes   (merged safely if you already have one)

# global instead of per project
python3 install.py --target roo --scope global`,
    invoke: "/demand A CLI that generates typed API clients from Postgres schemas",
    notes: [
      "Roo has no built-in web search: add a search MCP server (Brave, Tavily, Exa, SearXNG) or set SEARXNG_URL.",
      "new_task runs one subtask at a time, so the skill uses execution Mode B (same roles, one after another, isolated contexts).",
      "The mode can only edit files inside .demand-radar/; commands, browser and MCP are enabled.",
      "Reload the VS Code window if the mode does not show up.",
    ],
    guide: "adapters/roo-code/README.md",
  },
  {
    id: "agents",
    label: "Codex & Agent Skills hosts",
    intro: "~/.agents/skills is the cross-agent location. Roo Code and Codex read it; Hermes reads it through skills.external_dirs.",
    code: `python3 install.py --target agents                   # ~/.agents/skills/demand-radar
python3 install.py --target agents --scope project    # ./.agents/skills/demand-radar
python3 install.py --target claude                    # ./.claude/skills/demand-radar
python3 install.py --target agents --with-agents-md   # also tell AGENTS.md-aware agents it exists`,
    invoke: "Is there real demand for a self-hosted alternative to Linear? Validate it before I build.",
    notes: [
      "Claude Code plugin route is kept: /plugin marketplace add <this kit>, then /plugin install demand-radar@demand-radar-marketplace.",
      "Any host that loads SKILL.md folders works; only the folder location differs.",
    ],
    guide: "docs/COMPATIBILITY.md",
  },
  {
    id: "generic",
    label: "Any other agent",
    intro: "Aider, Cline, Continue, OpenHands, LangGraph/CrewAI scripts or a plain model with a shell: paste one prompt and point it at the kit.",
    code: `# 1. put the kit anywhere the agent can read, e.g. ./vendor/demand-radar
python3 install.py --target path --dest ./vendor

# 2. paste the Prompt block from adapters/generic/system-prompt.md
#    into your system prompt / rules file (replace <KIT>)

# 3. or drive the pipeline from your own code, file in / file out:
python3 vendor/demand-radar/skills/demand-radar/scripts/init_run.py "my idea"`,
    invoke: "Validate the demand for: <idea>. Follow <KIT>/skills/demand-radar/SKILL.md.",
    notes: [
      "Needs only python3 (standard library) and a way to read and write files.",
      "No subagents? The agent plays each role in turn (Mode C). The report states the weaker independence.",
      "No web tool? Use connectors/searxng.py with SEARXNG_URL; otherwise confidence is capped at low.",
    ],
    guide: "adapters/generic/system-prompt.md",
  },
];

export default function InstallTabs() {
  const [active, setActive] = useState(TABS[0].id);
  const [copied, setCopied] = useState("");
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* clipboard unavailable: ignore */
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60">
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-zinc-800 p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              t.id === active
                ? "bg-emerald-400 font-medium text-zinc-950"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <p className="mb-3 text-sm text-zinc-400">{tab.intro}</p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-[13px] leading-relaxed text-emerald-200">
              {tab.code}
            </pre>
            <button
              onClick={() => copy(tab.code, "code")}
              className="absolute right-2 top-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              {copied === "code" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-4">
            <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-zinc-500">Then run</div>
            <div className="relative">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-3 pr-16 text-[13px] text-zinc-100">
                {tab.invoke}
              </pre>
              <button
                onClick={() => copy(tab.invoke, "invoke")}
                className="absolute right-2 top-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {copied === "invoke" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-zinc-500">Host notes</div>
          <ul className="space-y-2 text-sm text-zinc-300">
            {tab.notes.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="mt-2 h-1 w-1 flex-none rounded-full bg-emerald-400" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
          <a
            href={`/kit?file=${encodeURIComponent(tab.guide)}`}
            className="mt-4 inline-block text-sm text-emerald-300 underline-offset-4 hover:underline"
          >
            Read {tab.guide} →
          </a>
        </div>
      </div>
    </div>
  );
}
