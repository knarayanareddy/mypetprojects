"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ACTING_MODELS, MODELS, limits, score, type ModelDef } from "@/lib/models";
import { SCENARIOS } from "@/lib/scenarios";

interface Reg {
  id: number;
  name: string;
  family: string;
  source: string;
  location: string;
  endpoint: string;
  instruction: string;
  notes: string;
  languageConditioned: boolean;
}

const KIND_LABEL: Record<string, string> = { baseline: "baseline", imitation: "imitation learning", vla: "vision-language-action", "world-model": "world model", composite: "composite · experimental" };
const KIND_COLOR: Record<string, string> = { baseline: "#94a3b8", imitation: "#34d399", vla: "#a78bfa", "world-model": "#fbbf24", composite: "#f472b6" };

export default function ModelsHub() {
  const [open, setOpen] = useState<string | null>("act");
  const [regs, setRegs] = useState<Reg[]>([]);
  const [form, setForm] = useState({ name: "", family: "act", source: "hf", location: "", endpoint: "http://localhost:8787", instruction: "", notes: "", languageConditioned: false });
  const [err, setErr] = useState("");
  const [hover, setHover] = useState("");

  const load = useCallback(async () => {
    const j = await fetch("/api/models").then((r) => r.json());
    setRegs(j.models ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setErr("");
    const r = await fetch("/api/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!r.ok) return setErr((await r.json()).error ?? "failed");
    setForm({ ...form, name: "", location: "", instruction: "", notes: "" });
    void load();
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold">Model hub</h1>
        <p className="mt-1 max-w-4xl text-slate-400">
          Every model you could drive the arms with — what it needs, what it is good at, and how it is expected to behave on each of the {SCENARIOS.length} use cases. Register your own checkpoints below and run them from the Control Center.
        </p>
      </div>

      {/* Visionary verdict */}
      <section className="card border-amber-500/30 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">Is “visionary” relevant to your hackathon?</h2>
          <span className="chip !border-amber-400/60 !text-amber-200">verdict: yes — as a verifier, not as the driver</span>
        </div>
        <div className="mt-3 grid gap-5 text-sm text-slate-300 md:grid-cols-3">
          <div>
            <div className="font-semibold text-slate-100">What it is</div>
            <p className="mt-1">
              A Dreamer-4-style <b>video world model</b>. The SO-101 variant (300M params) was trained on community SO-101 datasets, co-trained with SOAR and BridgeData V2 for physics transfer, and shows rigid-body pushing, doors/shelves and cloth. It predicts <i>what will happen</i> for a sequence of actions. It does <b>not</b> output actions, so it cannot replace ACT/SmolVLA.
            </p>
          </div>
          <div>
            <div className="font-semibold text-slate-100">How it could boost your robots</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li><b>Dream-before-you-act:</b> sample N action chunks from your policy, roll each out in the world model, execute the best.</li>
              <li><b>Offline policy evaluation:</b> rank checkpoints in imagination instead of burning hardware time.</li>
              <li><b>Safety preview:</b> show the predicted future in the UI before a risky move.</li>
              <li>Stretch: RL / data augmentation inside the model.</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-slate-100">Honest risks</div>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Verify that weights are actually released and run on your GPU before planning around them.</li>
              <li>Fidelity on <i>your</i> table/camera angle is unproven; it adds latency.</li>
              <li>It will not raise task success by itself — your dataset quality will.</li>
              <li>Best use of limited hackathon time: ship ACT/SmolVLA first; add Visionary as a clearly-labelled “imagination preview” (the policy server already exposes an <code className="inline">/imagine</code> hook).</li>
            </ul>
          </div>
        </div>
      </section>

      {/* model cards */}
      <section>
        <h2 className="mb-3 text-xl font-bold">Catalog</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {MODELS.map((m) => (
            <ModelCard key={m.id} m={m} open={open === m.id} toggle={() => setOpen(open === m.id ? null : m.id)} />
          ))}
        </div>
      </section>

      {/* matrix */}
      <section>
        <h2 className="mb-1 text-xl font-bold">How each model is expected to perform per use case</h2>
        <p className="mb-3 max-w-4xl text-sm text-slate-400">
          Heuristic first-try success estimates from a transparent capability-gap model (precision, contact-richness, horizon, reaction speed, generalisation). These are planning aids — <b>not</b> benchmark results; the same numbers drive the lag/jitter/missed-grasp emulation in the Playground. Hover a cell for the limiting factors.
        </p>
        <div className="card scroll-thin overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="sticky left-0 z-10 bg-[#0c111c] p-2">Use case</th>
                {ACTING_MODELS.map((m) => (
                  <th key={m.id} className="p-2 text-center font-medium">
                    {m.name.replace(/ \(.*\)/, "").replace("NVIDIA ", "").replace(" look-ahead (experimental)", "+VIS*")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCENARIOS.map((s) => (
                <tr key={s.id} className="border-t border-slate-800/70">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-[#0c111c] p-2">
                    <Link href={`/playground?scenario=${s.id}`} className="hover:text-[#ff7a1a]">
                      {s.emoji} {s.title}
                    </Link>
                  </td>
                  {ACTING_MODELS.map((m) => {
                    const sc = score(m, s.needs);
                    const lim = limits(m, s.needs);
                    return (
                      <td key={m.id} className="p-1 text-center" onMouseEnter={() => setHover(`${m.name} on ${s.title}: ${Math.round(sc * 100)}%${lim.length ? " · limited by " + lim.join(" & ") : " · no major gaps"}`)} onMouseLeave={() => setHover("")}>
                        <div className="rounded-md py-1 font-semibold tabular-nums text-white" style={{ background: `hsl(${sc * 125}, 60%, ${20 + sc * 8}%)` }}>
                          {Math.round(sc * 100)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 h-5 text-xs text-slate-300">{hover}</div>
        <p className="text-xs text-slate-500">* the Visionary composite is hypothetical. “Scripted (oracle)” is an upper bound that knows exact object poses in simulation.</p>
      </section>

      {/* registry */}
      <section>
        <h2 className="mb-1 text-xl font-bold">Register your own model</h2>
        <p className="mb-3 max-w-4xl text-sm text-slate-400">
          Point to a Hugging Face repo or checkpoint path that your policy server can load, or to any HTTP endpoint that implements <code className="inline">/predict</code>. Registered models show up in the Control Center → Model tab.
        </p>
        <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
          <div className="card space-y-2 p-4 text-sm">
            <input className="input" placeholder="Name (e.g. ACT cube → bin v3)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value })}>
                {["act", "diffusion", "smolvla", "pi0", "pi05", "groot", "molmoact2", "custom"].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option value="hf">Hugging Face repo (server loads)</option>
                <option value="local">Local path (on server)</option>
                <option value="http">Custom HTTP server</option>
              </select>
            </div>
            <input className="input" placeholder={form.source === "http" ? "Full server URL, e.g. https://gpu.example.com:8787" : form.source === "hf" ? "user/my_act_policy" : "/path/to/pretrained_model"} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            {form.source !== "http" && <input className="input" placeholder="Policy server URL" value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} />}
            <input className="input" placeholder="Default task / instruction" value={form.instruction} onChange={(e) => setForm({ ...form, instruction: e.target.value })} />
            <textarea className="input h-16" placeholder="Notes (dataset, cameras, results…)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.languageConditioned} onChange={(e) => setForm({ ...form, languageConditioned: e.target.checked })} /> language-conditioned
            </label>
            {err && <p className="text-xs text-red-300">{err}</p>}
            <button className="btn btn-primary w-full justify-center" onClick={submit}>
              Register model
            </button>
          </div>
          <div className="space-y-2">
            {regs.length === 0 && <div className="card p-4 text-sm text-slate-400">No models registered yet.</div>}
            {regs.map((r) => (
              <div key={r.id} className="card flex items-start gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.name}</span>
                    <span className="chip">{r.family}</span>
                    <span className="chip">{r.source}</span>
                    {r.languageConditioned && <span className="chip">language</span>}
                  </div>
                  <div className="mt-1 truncate font-mono text-xs text-slate-400">{r.location}</div>
                  {r.instruction && <div className="text-xs text-slate-300">task: {r.instruction}</div>}
                  {r.notes && <div className="text-xs text-slate-500">{r.notes}</div>}
                </div>
                <Link href="/control" className="btn !py-1">
                  Use →
                </Link>
                <button
                  className="btn !py-1"
                  onClick={async () => {
                    await fetch(`/api/models?id=${r.id}`, { method: "DELETE" });
                    void load();
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ModelCard({ m, open, toggle }: { m: ModelDef; open: boolean; toggle: () => void }) {
  return (
    <div className="card p-4 text-sm">
      <button onClick={toggle} className="flex w-full items-start gap-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold">{m.name}</span>
            <span className="chip" style={{ borderColor: KIND_COLOR[m.kind], color: KIND_COLOR[m.kind] }}>{KIND_LABEL[m.kind]}</span>
            {m.language && <span className="chip">language</span>}
            {m.experimental && <span className="chip !border-amber-400/60 !text-amber-200">experimental</span>}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{m.org} · {m.params} params · {m.hz}</div>
          <p className="mt-1.5 text-slate-300">{m.summary}</p>
        </div>
        <span className="text-slate-500">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mt-3 grid gap-3 border-t border-slate-800 pt-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase text-emerald-300">Strengths</div>
            <ul className="mt-1 list-disc pl-5 text-slate-300">{m.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
            <div className="mt-2 text-xs font-semibold uppercase text-red-300">Weaknesses</div>
            <ul className="mt-1 list-disc pl-5 text-slate-300">{m.weaknesses.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div><b className="text-slate-100">Inputs:</b> {m.inputs.join(", ")}</div>
            <div><b className="text-slate-100">Hardware:</b> {m.hardware}</div>
            <div><b className="text-slate-100">Data:</b> {m.data}</div>
            <div><b className="text-amber-200">Sensors:</b> {m.sensors.join(" · ")}</div>
            {m.hfRepo && <div><b className="text-slate-100">Hub:</b> <code className="inline">{m.hfRepo}</code> (verify the exact id)</div>}
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-semibold uppercase text-slate-400">Setup</div>
            <pre className="code mt-1 whitespace-pre-wrap">{m.setup.join("\n")}</pre>
            {m.links.length > 0 && (
              <div className="mt-1 flex gap-3 text-xs">
                {m.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-[#ff9340] underline">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
