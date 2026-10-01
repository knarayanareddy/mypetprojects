import { useEffect, useRef, useState } from "react";
import { hub } from "../lib/hub";
import { CATEGORIES, MODELS, getModel } from "../lib/models";
import { SKILLS, Skill, readyPose, runSequence, runSkill } from "../lib/skills";
import { LlmConfig, Plan, loadLlm, makePlan, saveLlm } from "../lib/planner";
import { Badge, Btn, Card, Field, inputCls, useHub } from "../components/ui";
import { LogCard } from "./ControlPage";

const EXAMPLES = [
  "put the red cube on the pad",
  "sort the cubes by colour, then do a high five",
  "pour me a drink, then wave hello",
  "play a song on the xylophone",
  "fold the cloth then tidy the desk",
  "write HI then draw a heart",
];

export default function MissionsPage() {
  const h = useHub();
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [cat, setCat] = useState<string>("All");
  const [q, setQ] = useState("");
  const [llm, setLlm] = useState<LlmConfig>(loadLlm());
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const running = h.source === "skill";

  useEffect(() => { if (!hub.sceneName) hub.loadScene(SKILLS[0].name, SKILLS[0].objects()); }, []);

  const doPlan = async (t = text) => {
    if (!t.trim()) return null;
    setBusy(true);
    const p = await makePlan(t, llm);
    setPlan(p); setBusy(false);
    return p;
  };
  const execute = async (p: Plan) => {
    if (p.action === "stop") { hub.abort(); return; }
    if (p.action === "home") { hub.setSource("idle"); for (const a of ["A", "B"] as const) hub.setTarget(a, readyPose(a)); return; }
    if (p.action === "open" || p.action === "close") { for (const a of ["A", "B"] as const) hub.setJoint(a, 5, p.action === "open" ? 70 : 5); return; }
    if (p.skills.length) await runSequence(p.skills);
  };
  const go = async (t = text) => { const p = await doPlan(t); if (p) await execute(p); };

  const voice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition is not supported in this browser (use Chrome/Edge)."); return; }
    if (listening) { recRef.current?.stop(); return; }
    const r = new SR(); r.lang = "en-US"; r.interimResults = false;
    r.onresult = (e: any) => { const t = e.results[0][0].transcript; setText(t); void go(t); };
    r.onend = () => setListening(false);
    recRef.current = r; setListening(true); r.start();
  };

  const list = SKILLS.filter((s) => (cat === "All" || s.category === cat) && (!q || (s.name + s.blurb + s.keywords.join(" ")).toLowerCase().includes(q.toLowerCase())));
  const model = getModel(h.settings.modelId);

  return (
    <div className="space-y-4">
      <Card title="Instruct the robots" right={<Badge tone={running ? "amber" : "slate"}>{running ? `running: ${h.runName}` : "idle"}</Badge>}>
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="e.g. sort the cubes, then high five…" className={inputCls} />
          <Btn onClick={voice} tone={listening ? "danger" : "default"}>{listening ? "● listening" : "🎤"}</Btn>
          <Btn tone="primary" disabled={busy || running} onClick={() => go()}>Run</Btn>
          <Btn disabled={busy} onClick={() => doPlan()}>Plan</Btn>
          <Btn tone="danger" disabled={!running} onClick={() => hub.abort()}>Stop</Btn>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => <button key={e} onClick={() => { setText(e); void doPlan(e); }} className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800">{e}</button>)}
        </div>
        {plan && (
          <div className="mt-3 rounded-lg bg-slate-950/70 p-3 text-xs">
            <div className="mb-1 flex items-center gap-2"><Badge tone={plan.via === "llm" ? "violet" : "cyan"}>{plan.via === "llm" ? "LLM planner" : "keyword router"}</Badge>
              {plan.skills.map((s, i) => <span key={i} className="rounded bg-slate-800 px-2 py-0.5 text-slate-100">{i + 1}. {s.emoji} {s.name}</span>)}</div>
            <p className="text-slate-400">{plan.explain}</p>
            {plan.skills.length > 0 && <Btn className="mt-2" tone="good" disabled={running} onClick={() => execute(plan)}>Execute plan</Btn>}
          </div>
        )}
        <details className="mt-3 text-xs text-slate-400">
          <summary className="cursor-pointer text-slate-300">LLM / VLM planner (optional)</summary>
          <p className="my-2 text-[11px]">Any OpenAI-compatible <code>/chat/completions</code> endpoint (OpenAI, OpenRouter, Ollama <code>http://localhost:11434/v1</code>, vLLM serving Qwen-VL…). The key stays in this browser’s localStorage. The endpoint must allow CORS.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Base URL"><input className={inputCls} value={llm.baseUrl} onChange={(e) => setLlm({ ...llm, baseUrl: e.target.value })} /></Field>
            <Field label="Model"><input className={inputCls} value={llm.model} onChange={(e) => setLlm({ ...llm, model: e.target.value })} /></Field>
            <Field label="API key"><input type="password" className={inputCls} value={llm.apiKey} onChange={(e) => setLlm({ ...llm, apiKey: e.target.value })} /></Field>
            <div className="flex flex-col justify-end gap-1">
              <label className="flex items-center gap-2"><input type="checkbox" checked={llm.enabled} onChange={(e) => setLlm({ ...llm, enabled: e.target.checked })} /> use LLM planner</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={llm.useVision} onChange={(e) => setLlm({ ...llm, useVision: e.target.checked })} /> attach top-camera frame (VLM)</label>
            </div>
          </div>
          <Btn className="mt-2" onClick={() => saveLlm(llm)}>Save</Btn>
        </details>
      </Card>

      <Card title="Execution profile" right={<Badge tone="amber">emulation</Badge>}>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <select className={inputCls} value={h.settings.modelId} onChange={(e) => h.setSetting("modelId", e.target.value)}>
            {MODELS.filter((m) => m.runnable).map((m) => <option key={m.id} value={m.id}>{m.name} — {m.kind}</option>)}
          </select>
          <div className="flex gap-3 text-[11px] text-slate-400">
            <span>think <b className="text-slate-200">{model.profile.latencyMs} ms</b></span>
            <span>speed <b className="text-slate-200">{model.profile.speed}×</b></span>
            <span>jitter <b className="text-slate-200">{model.profile.jitter}</b></span>
            <span>grasp miss <b className="text-slate-200">{Math.round(model.profile.miss * 100)}%</b></span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Runs the selected use-case with that model’s latency, jitter and grasp-miss rate so you can see how it would feel. Estimates, not benchmarks. For real learned policies go to the Models tab.</p>
        {h.settings.drive && <p className="mt-1 text-[11px] text-amber-300">⚠ “Drive real arms” is ON – scripts will move the physical robots. Clear the workspace and keep a hand on Space (E-STOP).</p>}
      </Card>

      <Card title={`Use-case library (${SKILLS.length})`} right={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search…" className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs" />}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {["All", ...CATEGORIES].map((c) => <button key={c} onClick={() => setCat(c)} className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${cat === c ? "bg-orange-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{c}</button>)}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {list.map((s) => <SkillCard key={s.id} s={s} running={running} />)}
        </div>
      </Card>

      <Card title="Run history" right={<Btn tone="ghost" onClick={() => { hub.history = []; localStorage.removeItem("so101.history"); hub.bump(); }}>clear</Btn>}>
        <div className="max-h-56 overflow-y-auto text-[11px]">
          {h.history.length === 0 && <div className="text-slate-500">No runs yet.</div>}
          {h.history.map((r, i) => (
            <div key={i} className="flex items-center justify-between border-b border-slate-800/70 py-1.5">
              <span className="text-slate-200">{r.name} <span className="text-slate-500">· {r.model}</span></span>
              <span className="flex items-center gap-2">
                {r.real && <Badge tone="red">real</Badge>}
                <span className="text-slate-500">{(r.ms / 1000).toFixed(1)}s</span>
                <Badge tone={r.status === "done" ? "green" : r.status === "failed" ? "red" : "amber"}>{r.status}</Badge>
              </span>
            </div>
          ))}
        </div>
      </Card>
      <LogCard />
    </div>
  );
}

function SkillCard({ s, running }: { s: Skill; running: boolean }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-slate-100"><span className="mr-1.5">{s.emoji}</span>{s.name}</div>
        <div className="flex shrink-0 gap-1"><Badge tone={s.arms === 2 ? "violet" : "slate"}>{s.arms} arm{s.arms > 1 ? "s" : ""}</Badge><Badge tone="amber">{"★".repeat(s.difficulty)}</Badge></div>
      </div>
      <p className="mt-1 flex-1 text-[11px] leading-snug text-slate-400">{s.blurb}</p>
      <p className="mt-1.5 text-[10px] text-slate-500"><b className="text-slate-400">Real-world:</b> {s.realWorld}</p>
      <p className="text-[10px] text-slate-500"><b className="text-slate-400">Sensors:</b> {s.sensors.join(", ")}</p>
      <div className="mt-2 flex gap-1.5">
        <Btn tone="primary" disabled={running} onClick={() => runSkill(s)}>▶ Run</Btn>
        <Btn disabled={running} onClick={() => hub.loadScene(s.name, s.objects())}>Set scene</Btn>
      </div>
    </div>
  );
}
