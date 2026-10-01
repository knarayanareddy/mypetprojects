import { useState } from "react";
import { hub } from "../lib/hub";
import { CATEGORIES, CustomModel, MODELS, loadCustom, saveCustom } from "../lib/models";
import { SKILLS } from "../lib/skills";
import { Badge, Btn, Card, Code, Field, inputCls, useHub } from "../components/ui";
import { LogCard } from "./ControlPage";

const heat = (v: number) => (v === 0 ? "bg-slate-800 text-slate-500" : v >= 85 ? "bg-emerald-500/30 text-emerald-200" : v >= 70 ? "bg-lime-500/20 text-lime-200" : v >= 50 ? "bg-amber-500/20 text-amber-200" : "bg-red-500/20 text-red-200");

export default function ModelsPage() {
  const h = useHub();
  const p = h.policy;
  const [custom, setCustom] = useState<CustomModel[]>(loadCustom());
  const [draft, setDraft] = useState<CustomModel>({ id: "", name: "", transport: "http", url: "http://localhost:8000", task: "pick up the cube", fps: 15 });
  const [repo, setRepo] = useState("lerobot/smolvla_base");
  const [msg, setMsg] = useState("");

  const start = async () => {
    setMsg("");
    try {
      if (h.settings.drive && !(["A", "B"] as const).some((a) => h.arms[a].torque)) setMsg("Drive is ON but no arm has torque – the policy will only move the sim.");
      if (p.kind !== "bridge" && !hub.objects.some((o) => o.pickable)) hub.loadScene("Policy arena", SKILLS[0].objects());
      await hub.startPolicy({ repo });
    } catch (e) { setMsg((e as Error).message); }
  };
  const saveModel = () => {
    if (!draft.name) return;
    const m = [...custom, { ...draft, id: crypto.randomUUID() }];
    setCustom(m); saveCustom(m); setDraft({ ...draft, name: "" });
  };
  const load = (m: CustomModel) => {
    if (m.transport === "http") hub.policy.kind = "http", hub.policy.url = m.url; else { hub.policy.kind = "bridge"; setRepo(m.url); }
    hub.policy.task = m.task; hub.policy.fps = m.fps; hub.bump();
  };
  const probe = async () => {
    try { const r = await fetch(p.url.replace(/\/$/, "") + "/health"); setMsg(`health: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`); } catch (e) { setMsg(`unreachable: ${(e as Error).message}`); }
  };

  return (
    <div className="space-y-4">
      <Card title="Policy runner" right={<Badge tone={p.running ? "green" : "slate"}>{p.running ? "RUNNING" : "stopped"}</Badge>}>
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          {([["loopback", "Built-in demo policy", "no server – privileged pick→place, for UI testing"], ["http", "HTTP endpoint", "POST /predict → action chunks (browser executes)"], ["bridge", "Python bridge + LeRobot", "HF repo / checkpoint run on the PC with the arms"]] as const).map(([k, t, d]) => (
            <button key={k} onClick={() => { hub.policy.kind = k; hub.bump(); }} className={`rounded-xl border p-2.5 text-left text-xs ${p.kind === k ? "border-orange-400 bg-orange-500/10" : "border-slate-800 hover:bg-slate-800/60"}`}>
              <div className="font-semibold text-slate-100">{t}</div><div className="text-[10px] text-slate-400">{d}</div>
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {p.kind === "http" && <Field label="Endpoint base URL" hint="must allow CORS – bridge/policy_server.py does"><input className={inputCls} value={p.url} onChange={(e) => { hub.policy.url = e.target.value; hub.bump(); }} /></Field>}
          {p.kind === "bridge" && <Field label="HF repo id or local checkpoint path" hint="e.g. lerobot/smolvla_base, ${HF_USER}/act_so101_task, outputs/train/…/pretrained_model"><input className={inputCls} value={repo} onChange={(e) => setRepo(e.target.value)} /></Field>}
          <Field label="Task / instruction"><input className={inputCls} value={p.task} onChange={(e) => { hub.policy.task = e.target.value; hub.bump(); }} /></Field>
          <Field label="Control rate (Hz)"><input type="number" min={5} max={60} className={inputCls} value={p.fps} onChange={(e) => { hub.policy.fps = +e.target.value; hub.bump(); }} /></Field>
          <Field label="Arms controlled">
            <select className={inputCls} value={p.arms} onChange={(e) => { hub.policy.arms = +e.target.value as 1 | 2; hub.bump(); }}><option value={1}>1 – arm A (6 joints)</option><option value={2}>2 – A+B (12 joints: A then B)</option></select>
          </Field>
          {p.kind === "http" && <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={p.useCams} onChange={(e) => { hub.policy.useCams = e.target.checked; hub.bump(); }} /> send camera frames (Hardware → Cameras)</label>}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {!p.running ? <Btn tone="primary" onClick={start}>▶ Start policy</Btn> : <Btn tone="danger" onClick={() => hub.stopPolicy()}>■ Stop policy</Btn>}
          {p.kind === "http" && <Btn onClick={probe}>Health check</Btn>}
          <Btn onClick={() => { const s = SKILLS[0]; hub.loadScene("Policy arena", s.objects()); hub.say("Policy arena ready"); }}>Load pick-place arena</Btn>
          <Btn onClick={() => hub.loadScene("Policy arena", [...SKILLS[0].objects(), ...SKILLS[2].objects().slice(0, 2)])}>Add extra cubes</Btn>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
          {[["status", p.status], ["steps", p.steps], ["round-trip", `${p.latency} ms`], ["queued", p.queue.length]].map(([k, v]) => <div key={k as string} className="rounded-lg bg-slate-950/60 p-2"><div className="text-slate-500">{k}</div><div className="truncate font-mono text-slate-100">{String(v)}</div></div>)}
        </div>
        {msg && <p className="mt-2 break-all text-[11px] text-amber-300">{msg}</p>}
        {p.lastAction && <p className="mt-2 break-all font-mono text-[10px] text-slate-500">last action: [{p.lastAction.slice(0, 12).map((v) => v.toFixed(1)).join(", ")}]</p>}
        <p className="mt-2 text-[11px] text-slate-500">Actions are absolute LeRobot-normalised joints (−100…100, gripper 0…100), exactly what a LeRobot SO-101 policy emits. With “Drive real arms” on and torque enabled the same stream moves the hardware (rate-limited by your safety settings).</p>
      </Card>

      <Card title="HTTP protocol (implement your own model server)">
        <Code>{`POST {url}/predict
{ "task": "pick up the cube", "arms": 1, "state": [6 or 12 floats],
  "state_by_arm": {"A":[6], "B":[6]}, "joint_names": [...],
  "images": {"top": "<base64 jpeg 448²>", "wrist": "..."}, "timestamp": 1712345678.9 }

200 → { "actions": [[6 or 12 floats], ... N steps] }     // absolute, normalised, played at "Control rate"
GET {url}/health → 200`}</Code>
      </Card>

      <Card title="Your model registry">
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Name"><input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="my-act-pickplace" /></Field>
          <Field label="Transport"><select className={inputCls} value={draft.transport} onChange={(e) => setDraft({ ...draft, transport: e.target.value as CustomModel["transport"] })}><option value="http">HTTP endpoint</option><option value="bridge-hf">Bridge: HF repo / path</option></select></Field>
          <Field label={draft.transport === "http" ? "URL" : "HF repo / path"}><input className={inputCls} value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></Field>
          <Field label="Default task"><input className={inputCls} value={draft.task} onChange={(e) => setDraft({ ...draft, task: e.target.value })} /></Field>
        </div>
        <Btn className="mt-2" onClick={saveModel}>Add to registry</Btn>
        <ul className="mt-3 space-y-1.5">
          {custom.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-xs">
              <span className="truncate text-slate-200">{m.name} <span className="text-slate-500">· {m.transport} · {m.url}</span></span>
              <span className="flex gap-1"><Btn onClick={() => load(m)}>Load</Btn><Btn tone="ghost" onClick={() => { const n = custom.filter((x) => x.id !== m.id); setCustom(n); saveCustom(n); }}>✕</Btn></span>
            </li>
          ))}
          {custom.length === 0 && <li className="text-[11px] text-slate-500">Nothing registered yet. Fine-tuned checkpoints and endpoints saved here persist in your browser.</li>}
        </ul>
      </Card>

      <Card title="Expected performance matrix" right={<Badge tone="amber">editorial estimates</Badge>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[11px]">
            <thead><tr className="text-left text-slate-400"><th className="py-1 pr-2">Model</th>{CATEGORIES.map((c) => <th key={c} className="px-1 text-center font-medium">{c.replace(" & ", "/")}</th>)}</tr></thead>
            <tbody>
              {MODELS.map((m) => (
                <tr key={m.id} className="border-t border-slate-800/60">
                  <td className="py-1 pr-2 text-slate-200">{m.name}</td>
                  {CATEGORIES.map((c) => <td key={c} className="p-0.5"><div className={`rounded px-1 py-0.5 text-center font-mono ${heat(m.scores[c])}`}>{m.runnable ? m.scores[c] : "n/a"}</div></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Scores = how well each approach is expected to do on that family of tasks on SO-101-class hardware after a hackathon-scale effort (≈50 demos or a single fine-tune). They drive the Playground emulation and are my judgement from published reports, not measured results. Measure your own with the run history.</p>
      </Card>

      <Card title="Model catalogue">
        <div className="space-y-3">
          {MODELS.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-100">{m.name}</h4><Badge tone={m.kind === "World model" ? "amber" : "cyan"}>{m.kind}</Badge><Badge>{m.org}</Badge><Badge>{m.params}</Badge>{m.language && <Badge tone="violet">language</Badge>}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{m.summary}</p>
              <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
                <ul className="list-inside list-disc text-emerald-300/90">{m.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                <ul className="list-inside list-disc text-amber-300/90">{m.risks.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <p className="mt-2 text-[10px] text-slate-500">GPU: {m.gpu} · Cameras: {m.cams}{m.hf ? ` · HF: ${m.hf}` : ""}{m.link ? " · " : ""}{m.link && <a className="text-orange-300 underline" href={m.link} target="_blank" rel="noreferrer">{m.link.replace("https://", "")}</a>}</p>
              {m.trainCmd && <div className="mt-2"><Code>{m.trainCmd}</Code></div>}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Is “visionary” worth using for the hackathon?">
        <div className="space-y-2 text-xs leading-relaxed text-slate-300">
          <p><b className="text-slate-100">Short answer: relevant, but not as a controller.</b> james0248/visionary is a Dreamer-4 style <i>world model</i> (300M params) trained on community SO-101 datasets (plus SOAR and BridgeData V2). It predicts future video given actions; it does not output joint commands, so it cannot operate the arms by itself.</p>
          <p><b className="text-slate-100">Where it could help:</b> (1) rank several candidate policies/checkpoints inside the world model before risking hardware, (2) generate synthetic rollouts for demos or data augmentation, (3) a strong talking point for judges. <b className="text-slate-100">Where it won’t:</b> live control within 24–48 h. The code is research-stage, not plug-and-play.</p>
          <p><b className="text-slate-100">Highest-leverage stack for your two arms:</b> SmolVLA or ACT fine-tuned on 30–50 episodes of your own task for a reliable demo, MolmoAct 2 (remote GPU) for open-ended language commands, and the built-in scripted skills as a safety net so there is always something that works on stage.</p>
        </div>
      </Card>
      <LogCard />
    </div>
  );
}
