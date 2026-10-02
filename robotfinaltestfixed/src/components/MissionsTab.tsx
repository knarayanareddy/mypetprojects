"use client";

import { useEffect, useState } from "react";
import { parseCommand } from "@/lib/commands";
import { CATEGORY_ORDER, INTERACTIVE_USE_CASES, MISSIONS, type Mission } from "@/lib/missions";
import { ArmView } from "./ArmView";
import { useRoom } from "./RoomProvider";
import { Badge, Btn, Card, Num } from "./ui";

export function LogPanel({ max = 14 }: { max?: number }) {
  const { logs } = useRoom();
  const tone = { info: "text-slate-300", warn: "text-amber-300", error: "text-rose-400", ok: "text-emerald-300" };
  return (
    <div className="h-48 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2 font-mono text-[11px]">
      {logs.slice(-max * 6).map((l, i) => (
        <div key={i} className={tone[l.level]}>
          <span className="text-slate-600">{new Date(l.t).toLocaleTimeString()} </span>
          {l.msg}
        </div>
      ))}
      {!logs.length && <div className="text-slate-600">Activity log</div>}
    </div>
  );
}

interface Armed {
  mission: Mission;
  params: Record<string, number>;
  left: number;
}

export function MissionsTab() {
  const { data, update, follower, fState, running, runMission, stopMission, preflight, trail, log } = useRoom();
  const [sel, setSel] = useState<Mission>(MISSIONS[0]);
  const [armed, setArmed] = useState<Armed | null>(null);
  const [cmd, setCmd] = useState("");
  const [cmdMsg, setCmdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const baseParams = (m: Mission, extra: Record<string, number> = {}) => ({ ...Object.fromEntries(m.params.map((p) => [p.key, p.value])), ...(data.missionParams[m.id] ?? {}), ...extra });
  const params = baseParams(sel);
  const pf = preflight(sel);
  const setParam = (k: string, v: number) => {
    setArmed(null);
    update({ missionParams: { ...data.missionParams, [sel.id]: { ...params, [k]: v } } });
  };

  // Scripted control: arm -> countdown -> run. Anything that changes the situation cancels it.
  useEffect(() => {
    if (!armed) return;
    if (!follower || running) {
      setArmed(null);
      return;
    }
    if (armed.left <= 0) {
      const a = armed;
      setArmed(null);
      const blockers = preflight(a.mission).blockers;
      if (blockers.length) log(`Auto-run of "${a.mission.title}" cancelled: ${blockers[0]}`, "warn");
      else void runMission(a.mission, a.params);
      return;
    }
    const t = setTimeout(() => setArmed((x) => (x ? { ...x, left: x.left - 1 } : x)), 1000);
    return () => clearTimeout(t);
  }, [armed, follower, running, runMission, preflight, log]);

  const choose = (m: Mission, extra: Record<string, number> = {}, userGesture = true) => {
    setSel(m);
    if (Object.keys(extra).length) update({ missionParams: { ...data.missionParams, [m.id]: baseParams(m, extra) } });
    if (userGesture && data.autoRun && follower && !running) {
      const delay = follower.kind === "serial" ? Math.max(3, data.autoRunDelayS) : Math.min(2, data.autoRunDelayS);
      setArmed({ mission: m, params: baseParams(m, extra), left: delay });
    } else setArmed(null);
  };

  const submitCommand = () => {
    const { best, alternatives } = parseCommand(cmd);
    if (!best) {
      setCmdMsg({ ok: false, text: `I could not map that to a mission.${alternatives.length ? " Closest: " + alternatives.map((a) => a.title).join(", ") : " Try e.g. “sort the cubes by colour”, “stack 3 blocks”, “draw a circle”, “wave hello”."}` });
      return;
    }
    const extra = Object.entries(best.params).map(([k, v]) => `${k}=${v}`).join(", ");
    setCmdMsg({ ok: true, text: `Understood → ${best.mission.emoji} ${best.mission.title}${extra ? ` (${extra})` : ""} · matched: ${best.because}` });
    log(`Instruction “${cmd}” → ${best.mission.title}`, "info");
    choose(best.mission, best.params);
  };
  const pose = fState ? { pan: fState.deg.shoulder_pan, lift: fState.deg.shoulder_lift, elbow: fState.deg.elbow_flex, wrist: fState.deg.wrist_flex } : null;

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <div className="space-y-4 xl:col-span-2">
        <Card title="Give an instruction">
          <div className="flex gap-2">
            <input value={cmd} onChange={(e) => setCmd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitCommand(); }} placeholder="e.g. sort the cubes by colour · stack 3 blocks · wave hello" className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100" />
            <Btn kind="primary" onClick={submitCommand}>Go</Btn>
          </div>
          {cmdMsg && <p className={`mt-2 text-xs ${cmdMsg.ok ? "text-emerald-300" : "text-amber-300"}`}>{cmdMsg.text}</p>}
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={data.autoRun} onChange={(e) => { update({ autoRun: e.target.checked }); setArmed(null); }} />
            Auto-run: starting a mission is one click (select it or type a command). Real arm: {Math.max(3, data.autoRunDelayS)} s countdown with Cancel.
          </label>
          <p className="mt-1 text-[11px] text-slate-500">The instruction box is an offline keyword matcher onto the verified missions (no cloud LLM). Pre-flight checks still apply.</p>
        </Card>
        {CATEGORY_ORDER.map((cat) => (
          <Card key={cat} title={cat}>
            <div className="grid gap-2">
              {MISSIONS.filter((m) => m.category === cat).map((m) => (
                <button key={m.id} onClick={() => choose(m)} className={`flex items-start gap-3 rounded-lg border p-2 text-left transition ${sel.id === m.id ? "border-cyan-500 bg-cyan-500/10" : "border-slate-800 hover:border-slate-600"}`}>
                  <span className="text-xl">{m.emoji}</span>
                  <span>
                    <span className="block text-sm font-medium text-slate-100">{m.title}</span>
                    <span className="block text-xs text-slate-500">{m.needsCamera ? "camera · " : ""}{m.sensors[0]}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        ))}
        <Card title="More use cases elsewhere">
          <ul className="space-y-2 text-xs text-slate-400">
            {INTERACTIVE_USE_CASES.map((u) => (
              <li key={u.id}><b className="text-slate-200">{u.title}</b> <Badge tone="violet">{u.where}</Badge><br />{u.summary}</li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="space-y-4 xl:col-span-3">
        <Card title={`${sel.emoji} ${sel.title}`} right={running ? <Badge tone="cyan">running: {running}</Badge> : undefined}>
          <p className="text-sm text-slate-300">{sel.summary}</p>
          <p className="mt-1 text-xs italic text-violet-300">Why it&apos;s interesting: {sel.novelty}</p>
          <p className="mt-1 text-xs text-slate-500">Hardware: {sel.sensors.join(" · ")}</p>

          <div className="mt-3 flex flex-wrap gap-3">
            {sel.params.map((p) => (
              <Num key={p.key} label={p.label} step={0.5} w="w-24" value={params[p.key]} onChange={(v) => setParam(p.key, v)} />
            ))}
          </div>

          {(pf.blockers.length > 0 || pf.warnings.length > 0) && (
            <ul className="mt-3 space-y-1 text-xs">
              {pf.blockers.map((b) => <li key={b} className="text-rose-300">⛔ {b}</li>)}
              {pf.warnings.map((b) => <li key={b} className="text-amber-300">⚠ {b}</li>)}
            </ul>
          )}

          {armed && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-100">
              <span>⏱ Starting <b>{armed.mission.title}</b> in <b>{armed.left}</b> s{follower?.kind === "serial" ? " — keep clear of the arm" : ""}</span>
              <Btn small kind="primary" onClick={() => setArmed({ ...armed, left: 0 })}>Start now</Btn>
              <Btn small kind="danger" onClick={() => setArmed(null)}>Cancel</Btn>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn kind="primary" disabled={!!running || pf.blockers.length > 0} onClick={() => { setArmed(null); void runMission(sel, params); }}>▶ Run</Btn>
            <Btn disabled={!!running || !follower || (sel.needsCamera && pf.blockers.some((b) => b.includes("camera") || b.includes("Camera")))} onClick={() => { setArmed(null); void runMission(sel, params, true); }} title="Plans and logs targets without moving">Dry run</Btn>
            <Btn kind="danger" disabled={!running} onClick={() => { setArmed(null); stopMission(); }}>■ Stop</Btn>
            {follower?.world && <Btn onClick={() => { follower.world!.reset(); }}>Reset virtual table</Btn>}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-800 pt-3">
            <Num label="Hover height (cm)" step={0.5} value={data.runner.hover} onChange={(v) => update({ runner: { ...data.runner, hover: v } })} />
            <Num label="Grab height (cm)" step={0.1} value={data.runner.grabZ} onChange={(v) => update({ runner: { ...data.runner, grabZ: v } })} />
            <Num label="Move time (ms)" step={50} w="w-24" value={data.runner.speedMs} onChange={(v) => update({ runner: { ...data.runner, speedMs: v } })} />
          </div>
        </Card>

        <Card title="Live">
          <ArmView pose={pose} geometry={data.calFollower.geometry} gripperPct={fState?.gripperPct} world={follower?.world} trail={trail} />
        </Card>
        <Card title="Activity"><LogPanel /></Card>
      </div>
    </div>
  );
}
