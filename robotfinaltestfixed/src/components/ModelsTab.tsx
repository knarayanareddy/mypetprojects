"use client";

import { useRef, useState } from "react";
import { MODELS, SENSORS, rolloutCmd, setupCommands, show, type ModelEntry } from "@/lib/models";
import { useRoom } from "./RoomProvider";
import { Badge, Btn, Card, Code, Num } from "./ui";

const KIND_TONE = { classical: "green", policy: "cyan", vla: "violet", agent: "amber", "world-model": "red" } as const;

function Bar({ v }: { v: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-2 w-4 rounded-sm ${i <= v ? "bg-cyan-400" : "bg-slate-800"}`} />)}
    </div>
  );
}

export function ModelsTab() {
  const { data, update, follower, leader, disconnect, log, cameraMode, setCameraMode } = useRoom();
  const [sel, setSel] = useState<ModelEntry>(MODELS[3]);
  const cfg = data.rollout;
  const set = (p: Partial<typeof cfg>) => update({ rollout: { ...cfg, ...p } });
  const [token, setToken] = useState("");
  const [ws, setWs] = useState<"off" | "connecting" | "on">("off");
  const [out, setOut] = useState<string[]>([]);
  const [proc, setProc] = useState(false);
  const sock = useRef<WebSocket | null>(null);

  const cmd = rolloutCmd(sel, { ...cfg, rtc: cfg.rtc || (sel.extraRolloutArgs ?? []).some((a) => a.includes("rtc")) });
  const repo = "<your-hf-user>/so101_task";
  const setup = setupCommands(cfg, repo, sel.policyType ?? "act");

  const connectBridge = () => {
    sock.current?.close();
    setWs("connecting");
    const s = new WebSocket(data.bridgeUrl);
    sock.current = s;
    s.onopen = () => s.send(JSON.stringify({ type: "hello", token }));
    s.onmessage = (e) => {
      const m = JSON.parse(e.data as string) as { type: string; line?: string; message?: string; code?: number; ok?: boolean; ports?: { device: string; desc: string }[] };
      if (m.type === "hello") {
        setWs("on");
        setOut((o) => [...o, "bridge connected"]);
        s.send(JSON.stringify({ type: "ports" }));
      } else if (m.type === "log") setOut((o) => [...o.slice(-400), m.line ?? ""]);
      else if (m.type === "exit") {
        setProc(false);
        setOut((o) => [...o, `■ process exited (${m.code})`]);
      } else if (m.type === "error") setOut((o) => [...o, `⚠ ${m.message}`]);
      else if (m.type === "ports") setOut((o) => [...o, "ports: " + (m.ports ?? []).map((p) => `${p.device} (${p.desc})`).join(" | ")]);
    };
    s.onclose = () => setWs("off");
    s.onerror = () => setOut((o) => [...o, "⚠ cannot reach bridge. Is so101_bridge.py running?"]);
  };

  const runViaBridge = async (argv: string[]) => {
    // LeRobot needs exclusive access to every USB device it will open: serial ports and cameras.
    if (follower?.kind === "serial") {
      log("Releasing the follower serial port so LeRobot can use it…", "warn");
      await disconnect("follower");
    }
    if (leader?.kind === "serial") {
      log("Releasing the leader serial port so LeRobot can use it…", "warn");
      await disconnect("leader");
    }
    if (cameraMode === "webcam") {
      log("Releasing the browser webcam so LeRobot can open it…", "warn");
      await setCameraMode("sim");
    }
    sock.current?.send(JSON.stringify({ type: "run", argv }));
    setProc(true);
  };

  return (
    <div className="space-y-4">
      <Card title="Model registry: how each option behaves on an SO-101">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {MODELS.map((m) => (
            <button key={m.id} onClick={() => setSel(m)} className={`rounded-lg border p-3 text-left transition ${sel.id === m.id ? "border-cyan-500 bg-cyan-500/10" : "border-slate-800 hover:border-slate-600"}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-slate-100">{m.name}</span>
                <Badge tone={KIND_TONE[m.kind]}>{m.kind}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">{m.org} · {m.params}</p>
              <div className="mt-2 grid grid-cols-[90px_1fr] gap-x-2 gap-y-1 text-[11px] text-slate-500">
                <span>Data efficiency</span><Bar v={m.ratings.dataEfficiency} />
                <span>Generalisation</span><Bar v={m.ratings.generalization} />
                <span>Speed</span><Bar v={m.ratings.speed} />
                <span>Setup ease</span><Bar v={m.ratings.setupEase} />
                <span>Demo wow</span><Bar v={m.ratings.hackathonWow} />
              </div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Ratings are editorial estimates for hackathon planning, not benchmark results. Check each model card before relying on them.</p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={sel.name} right={<Badge tone={KIND_TONE[sel.kind]}>{sel.kind}</Badge>}>
          <p className="text-sm text-slate-300">{sel.summary}</p>
          <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-1 text-xs">
            <dt className="text-slate-500">Hardware</dt><dd className="text-slate-300">{sel.gpu}</dd>
            <dt className="text-slate-500">Data</dt><dd className="text-slate-300">{sel.dataNeeded}</dd>
            <dt className="text-slate-500">Language</dt><dd className="text-slate-300">{sel.language ? "yes: free-text task" : "no (one policy per task)"}</dd>
            <dt className="text-slate-500">Cameras</dt><dd className="text-slate-300">{sel.cameras}</dd>
          </dl>
          <div className="mt-3 text-xs"><b className="text-emerald-300">Best for</b><ul className="list-disc pl-5 text-slate-300">{sel.bestFor.map((b) => <li key={b}>{b}</li>)}</ul></div>
          <div className="mt-2 text-xs"><b className="text-amber-300">Caveats</b><ul className="list-disc pl-5 text-slate-300">{sel.caveats.map((b) => <li key={b}>{b}</li>)}</ul></div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">{sel.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-cyan-400 underline">{l.label}</a>)}</div>
          {sel.id === "visionary" && (
            <div className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 text-xs text-violet-100">
              <b>Does Visionary improve your hackathon chances?</b> Only as an add-on. It is a world model (it predicts video), not a controller, so it cannot move your arms today. It would not make a pick-and-place more reliable by itself. The real value is a planning story (“imagine, then act”), and its training data (community SO-101 + MolmoAct2 data) validates your platform choice. A working calibrated pipeline beats a research model that never touches the robot, so build the verified task first and show Visionary as a stretch feature.
            </div>
          )}
        </Card>

        <Card title="Rollout configuration">
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
            <label className="flex flex-col gap-1">Follower port<input value={cfg.port} onChange={(e) => set({ port: e.target.value })} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
            <label className="flex flex-col gap-1">Robot id (calibration name)<input value={cfg.robotId} onChange={(e) => set({ robotId: e.target.value })} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
            <label className="col-span-2 flex flex-col gap-1">Policy (HF repo id or local path)<input placeholder={sel.hfRepo || "user/policy"} value={cfg.policyPath} onChange={(e) => set({ policyPath: e.target.value })} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
            <label className="col-span-2 flex flex-col gap-1">Task prompt (must match training wording)<input value={cfg.task} onChange={(e) => set({ task: e.target.value })} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
            <Num label="Duration (s)" value={cfg.duration} onChange={(v) => set({ duration: v })} />
            <label className="flex items-center gap-2 pt-5"><input type="checkbox" checked={!!cfg.rtc} onChange={(e) => set({ rtc: e.target.checked })} />Real-time chunking</label>
            <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={!!cfg.useLeader} onChange={(e) => set({ useLeader: e.target.checked })} />Also attach the leader arm (only for human-in-the-loop strategies; plain policy rollout does not use it)</label>
          </div>
          <div className="mt-3 space-y-2">
            <div className="text-xs font-semibold text-slate-400">Cameras: names MUST equal the observation keys the policy was trained with</div>
            {cfg.cameras.map((c, i) => (
              <div key={i} className="flex items-end gap-2">
                <label className="flex flex-col gap-1 text-xs text-slate-400">name<input value={c.name} onChange={(e) => set({ cameras: cfg.cameras.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
                <label className="flex flex-col gap-1 text-xs text-slate-400">index/path<input value={c.index} onChange={(e) => set({ cameras: cfg.cameras.map((x, k) => (k === i ? { ...x, index: e.target.value } : x)) })} className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
                <Btn small onClick={() => set({ cameras: cfg.cameras.filter((_, k) => k !== i) })}>✕</Btn>
              </div>
            ))}
            <Btn small onClick={() => set({ cameras: [...cfg.cameras, { name: "wrist", index: "2", width: 640, height: 480, fps: 30 }] })}>+ camera</Btn>
          </div>
        </Card>
      </div>

      <Card title="Run the policy">
        {!sel.runsViaRollout ? (
          <p className="text-sm text-slate-300">
            {sel.id === "builtin" && "Use the Missions tab: it runs entirely in this browser."}
            {sel.id === "vlm-agent" && "Pattern: a VLM chooses a skill + target from the camera image; this app executes the verified skill. Wire any VLM API behind a Next.js route and map its JSON output to Runner.pick/place. Keep the controller's pre-flight checks in the loop."}
            {sel.id === "molmoact2" && "Run the model on a GPU server per its model card, send it camera frames + joint state, and execute the returned joint targets through Arm.setGoals (this app's smoothing, limits and E-stop stay in force)."}
            {sel.id === "visionary" && "No robot command: this is a world model. Use it offline to preview/evaluate candidate plans."}
          </p>
        ) : (
          <>
            <Code>{show(cmd.argv)}</Code>
            <p className="mt-2 text-xs text-slate-500">Needs LeRobot installed on the machine with the arm. Only one program may own the serial port: the browser releases it before launching.</p>
          </>
        )}

        <div className="mt-4 rounded-lg border border-slate-800 p-3">
          <div className="mb-2 flex flex-wrap items-end gap-2 text-xs text-slate-400">
            <b className="text-slate-200">LeRobot bridge</b>
            <label className="flex flex-col gap-1">url<input value={data.bridgeUrl} onChange={(e) => update({ bridgeUrl: e.target.value })} className="w-44 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
            <label className="flex flex-col gap-1">token (printed by the script)<input value={token} onChange={(e) => setToken(e.target.value)} className="w-44 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></label>
            <Btn small kind="primary" onClick={connectBridge}>{ws === "on" ? "Reconnect" : "Connect"}</Btn>
            <Badge tone={ws === "on" ? "green" : "slate"}>{ws}</Badge>
            <a href="/bridge/so101_bridge.py" download className="text-cyan-400 underline">download so101_bridge.py</a>
            {ws === "on" && <Btn small onClick={() => sock.current?.send(JSON.stringify({ type: "ports" }))}>List ports</Btn>}
          </div>
          {sel.runsViaRollout && (
            <div className="flex gap-2">
              <Btn kind="ok" disabled={ws !== "on" || proc} onClick={() => runViaBridge(cmd.argv)}>▶ Run on robot</Btn>
              <Btn kind="danger" disabled={!proc} onClick={() => sock.current?.send(JSON.stringify({ type: "stop" }))}>■ Stop (Ctrl-C)</Btn>
            </div>
          )}
          <div className="mt-2 h-40 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[11px] text-slate-300">
            {out.map((l, i) => <div key={i}>{l}</div>)}
            {!out.length && <span className="text-slate-600">bridge output</span>}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Python: <code>pip install websockets pyserial</code> then <code>python so101_bridge.py</code> inside your lerobot environment. It binds to 127.0.0.1, demands the token and runs only whitelisted lerobot-* commands.</p>
        </div>
      </Card>

      <Card title="Full pipeline commands (setup → record → train → deploy)">
        <div className="space-y-3">
          {setup.map((c) => (
            <div key={c.title}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-400">{c.title}
                <Btn small disabled={ws !== "on" || proc} onClick={() => runViaBridge(c.argv)}>run via bridge</Btn></div>
              <Code>{show(c.argv)}</Code>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Sensors & extra hardware">
        <div className="grid gap-2 md:grid-cols-2">
          {SENSORS.map((s) => (
            <div key={s.name} className="rounded-lg border border-slate-800 p-2 text-xs">
              <div className="flex items-center justify-between"><b className="text-slate-200">{s.name}</b><Badge tone={s.need.startsWith("Required") || s.need.startsWith("Strongly") ? "amber" : "slate"}>{s.need}</Badge></div>
              <p className="mt-1 text-slate-400">{s.why}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
