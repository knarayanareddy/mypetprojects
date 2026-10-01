import { useEffect, useRef, useState } from "react";
import { ARMS, ArmId, hub } from "../lib/hub";
import { ARM_BASE, JOINTS, JOINT_LABEL, REST, fk, ik } from "../lib/kin";
import { SKILLS, readyPose } from "../lib/skills";
import { Badge, Btn, Card, download, useHub } from "../components/ui";

const KEYS: Record<string, [number, number]> = {
  q: [0, 1], a: [0, -1], w: [1, 1], s: [1, -1], e: [2, 1], d: [2, -1], r: [3, 1], f: [3, -1], t: [4, 1], g: [4, -1], y: [5, 1], h: [5, -1],
};

export default function ControlPage() {
  const h = useHub();
  const [active, setActive] = useState<ArmId>("A");
  const [cart, setCart] = useState(true);
  const [recName, setRecName] = useState("");
  const [err, setErr] = useState("");
  const held = useRef(new Set<string>());
  const st = useRef({ active, cart });
  st.current = { active, cart };
  useEffect(() => {
    if (!hub.sceneName) {
      const s = SKILLS[0];
      hub.loadScene("Sandbox", [...s.objects(), { id: "ball", kind: "ball", pos: [-10, 1.3, 6], color: "#facc15", size: 2.6, held: null, pickable: true }]);
    }
  }, []);

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName)) return;
      if (e.key === "1") setActive("A"); else if (e.key === "2") setActive("B");
      held.current.add(e.key.toLowerCase());
      if (e.key.startsWith("Arrow") || e.key === "PageUp" || e.key === "PageDown") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    const iv = setInterval(() => {
      if (hub.busyMotion || hub.estopped || held.current.size === 0) return;
      const { active: a, cart: c } = st.current;
      const tgt = [...hub.arms[a].target];
      let changed = false;
      const k = held.current;
      if (c) {
        const f = fk(tgt, ARM_BASE[a]);
        const tip = [...f.pts[4]] as [number, number, number];
        const s = 0.5 * hub.settings.speed;
        let moved = false;
        if (k.has("arrowleft")) { tip[0] -= s; moved = true; }
        if (k.has("arrowright")) { tip[0] += s; moved = true; }
        if (k.has("arrowup")) { tip[2] -= s; moved = true; }
        if (k.has("arrowdown")) { tip[2] += s; moved = true; }
        if (k.has("pageup") || k.has("+") || k.has("=")) { tip[1] += s; moved = true; }
        if (k.has("pagedown") || k.has("-")) { tip[1] = Math.max(0.5, tip[1] - s); moved = true; }
        if (moved) { const r = ik(tip, ARM_BASE[a], { pitch: f.phi3, roll: tgt[4], grip: tgt[5] }); for (let i = 0; i < 4; i++) tgt[i] = r.pose[i]; changed = true; }
        if (k.has("t")) { tgt[4] += 2; changed = true; } if (k.has("g")) { tgt[4] -= 2; changed = true; }
        if (k.has("y")) { tgt[5] += 3; changed = true; } if (k.has("h")) { tgt[5] -= 3; changed = true; }
      } else {
        for (const key of k) { const m = KEYS[key]; if (m) { tgt[m[0]] += m[1] * 1.5 * hub.settings.speed * (m[0] === 5 ? 2 : 1); changed = true; } }
      }
      if (changed) { hub.setSource("idle"); hub.setTarget(a, tgt); }
    }, 33);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); clearInterval(iv); };
  }, []);

  const guard = async (fn: () => Promise<void>) => { setErr(""); try { await fn(); } catch (e) { setErr((e as Error).message); } };

  return (
    <div className="space-y-4">
      <Card title="Drive mode" right={<Badge tone={h.settings.drive ? "red" : "cyan"}>{h.settings.drive ? "REAL ARMS LIVE" : "simulation only"}</Badge>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-xs text-slate-200">
            <input type="checkbox" checked={h.settings.drive} onChange={(e) => h.setSetting("drive", e.target.checked)} />
            <span><b>Drive real arms</b> – stream every sim target to hardware (torque must be ON per arm)</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-200">
            <input type="checkbox" checked={h.settings.twin} onChange={(e) => h.setSetting("twin", e.target.checked)} />
            <span><b>Digital twin</b> – sim follows the real arm while torque is OFF (move it by hand)</span>
          </label>
          <Slider label="Motion speed" v={h.settings.speed} min={0.2} max={2} step={0.05} fmt={(v) => `${v.toFixed(2)}×`} on={(v) => h.setSetting("speed", v)} />
          <Slider label="Max joint rate (hardware)" v={h.settings.maxRate} min={20} max={250} step={5} fmt={(v) => `${v} u/s`} on={(v) => h.setSetting("maxRate", v)} />
          <Slider label="Servo speed cap" v={h.settings.hwSpeed} min={100} max={3000} step={50} fmt={(v) => `${v} st/s`} on={(v) => h.setSetting("hwSpeed", v)} />
          <Slider label="Torque cap (applied at enable)" v={h.settings.torqueCap} min={150} max={1000} step={25} fmt={(v) => `${v}/1000`} on={(v) => h.setSetting("torqueCap", v)} />
        </div>
        {h.settings.drive && !ARMS.some((a) => h.arms[a].torque) && <p className="mt-2 text-[11px] text-amber-300">Drive is on but no arm has torque enabled – connect hardware (Hardware tab) and press “Torque ON” below.</p>}
        {err && <p className="mt-2 text-[11px] text-red-300">{err}</p>}
      </Card>

      {ARMS.map((id) => {
        const a = h.arms[id];
        const real = h.realPose(id);
        const lead = h.leaderPoseOf(id);
        return (
          <Card key={id} title={<span style={{ color: id === "A" ? "#fb923c" : "#2dd4bf" }}>Arm {id}</span>}
            right={<div className="flex flex-wrap items-center gap-1.5">
              {h.hasReal(id) ? <Badge tone="green">follower linked</Badge> : <Badge>no follower</Badge>}
              {h.hasLeader(id) ? <Badge tone="violet">leader linked</Badge> : null}
              {a.torque ? <Badge tone="red">torque ON</Badge> : <Badge>torque off</Badge>}
            </div>}>
            <div className="space-y-2">
              {JOINTS.map((j, i) => {
                const max = i === 5 ? 100 : 100, min = i === 5 ? 0 : -100;
                return (
                  <div key={j} className="grid grid-cols-[92px_1fr_44px] items-center gap-2 text-[11px]">
                    <span className="text-slate-400">{JOINT_LABEL[j]}</span>
                    <div className="relative">
                      <input type="range" min={min} max={max} step={0.5} value={a.target[i]} className="w-full accent-orange-400"
                        onChange={(e) => { hub.setSource("idle"); hub.setJoint(id, i, +e.target.value); }} />
                      {real && <div className="pointer-events-none absolute top-0 h-full w-0.5 bg-cyan-400/80" style={{ left: `calc(${((real[i] - min) / (max - min)) * 100}% )` }} title={`real ${real[i].toFixed(1)}`} />}
                      {lead && <div className="pointer-events-none absolute bottom-0 h-1 w-1 rounded-full bg-violet-400" style={{ left: `calc(${((lead[i] - min) / (max - min)) * 100}% )` }} />}
                    </div>
                    <span className="text-right font-mono text-slate-200">{a.target[i].toFixed(0)}</span>
                  </div>
                );
              })}
              <p className="text-[10px] text-slate-500">cyan tick = real follower position · violet dot = leader arm</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Btn onClick={() => { hub.setSource("idle"); hub.setTarget(id, readyPose(id)); }}>Ready pose</Btn>
              <Btn onClick={() => { hub.setSource("idle"); hub.setTarget(id, REST); }}>Rest (folded)</Btn>
              <Btn onClick={() => hub.setJoint(id, 5, 70)}>Open</Btn>
              <Btn onClick={() => hub.setJoint(id, 5, 5)}>Close</Btn>
              <Btn disabled={!real} onClick={() => hub.alignSimToReal(id)}>Align sim → real</Btn>
              <Btn tone={a.torque ? "danger" : "good"} disabled={!h.hasReal(id)} onClick={() => guard(() => hub.setTorque(id, !a.torque))}>{a.torque ? "Torque OFF" : "Torque ON"}</Btn>
              <Btn tone={a.mirror ? "primary" : "default"} disabled={!h.hasLeader(id)}
                onClick={() => { if (!a.mirror) { hub.setSource("mirror"); hub.arms[id].mirror = true; } else hub.arms[id].mirror = false; hub.bump(); }}>
                {a.mirror ? "Stop mirroring" : "Mirror leader → follower"}
              </Btn>
            </div>
          </Card>
        );
      })}

      <Card title="Keyboard jog" right={<div className="flex gap-1.5"><Btn tone={active === "A" ? "primary" : "default"} onClick={() => setActive("A")}>Arm A (1)</Btn><Btn tone={active === "B" ? "primary" : "default"} onClick={() => setActive("B")}>Arm B (2)</Btn></div>}>
        <div className="mb-2 flex gap-2 text-xs">
          <Btn tone={cart ? "primary" : "default"} onClick={() => setCart(true)}>Cartesian (IK)</Btn>
          <Btn tone={!cart ? "primary" : "default"} onClick={() => setCart(false)}>Joint-by-joint</Btn>
        </div>
        {cart ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-300">
            <li><kbd>← →</kbd> tip left / right</li><li><kbd>↑ ↓</kbd> tip forward / back</li>
            <li><kbd>PgUp / +</kbd> tip up</li><li><kbd>PgDn / −</kbd> tip down</li>
            <li><kbd>T / G</kbd> wrist roll</li><li><kbd>Y / H</kbd> gripper open / close</li>
          </ul>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-300">
            <li><kbd>Q / A</kbd> shoulder pan</li><li><kbd>W / S</kbd> shoulder lift</li><li><kbd>E / D</kbd> elbow</li>
            <li><kbd>R / F</kbd> wrist flex</li><li><kbd>T / G</kbd> wrist roll</li><li><kbd>Y / H</kbd> gripper</li>
          </ul>
        )}
      </Card>

      <Card title="Record & replay" right={h.rec.on ? <Badge tone="red">● REC {h.rec.frames.length} frames</Badge> : <Badge>{h.recordings.length} saved</Badge>}>
        <p className="mb-2 text-[11px] text-slate-400">Records both arms’ targets (leader mirroring, jog, sliders). Replay drives sim and – if enabled – the real arms. Export JSON to feed your own training pipeline.</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <input value={recName} onChange={(e) => setRecName(e.target.value)} placeholder="name…" className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs" />
          {!h.rec.on ? <Btn tone="danger" onClick={() => hub.startRec()}>● Record</Btn> : <Btn onClick={() => { hub.stopRec(recName); setRecName(""); }}>■ Stop & save</Btn>}
          {h.source === "replay" && <Btn tone="danger" onClick={() => hub.abort()}>Stop replay</Btn>}
        </div>
        <ul className="mt-3 space-y-1.5">
          {h.recordings.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-xs">
              <span className="truncate text-slate-200">{r.name} <span className="text-slate-500">· {r.frames[r.frames.length - 1].t.toFixed(1)}s</span></span>
              <span className="flex shrink-0 gap-1">
                <Btn onClick={() => hub.replay(r)}>▶ Replay</Btn>
                <Btn tone="ghost" onClick={() => download(`${r.name}.json`, JSON.stringify(r, null, 1), "application/json")}>JSON</Btn>
                <Btn tone="ghost" onClick={() => hub.deleteRec(r.id)}>✕</Btn>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <LogCard />
    </div>
  );
}

export function LogCard() {
  const h = useHub();
  return (
    <Card title="Event log" right={<span className="text-[10px] text-slate-500">{h.logs.length} events</span>}>
      <div className="max-h-48 overflow-y-auto font-mono text-[10.5px] leading-relaxed">
        {h.logs.length === 0 && <div className="text-slate-500">Nothing yet.</div>}
        {[...h.logs].reverse().map((l, i) => (
          <div key={i} className={l.level === "error" ? "text-red-300" : l.level === "warn" ? "text-amber-300" : "text-slate-400"}>
            <span className="text-slate-600">{new Date(l.t).toLocaleTimeString()} </span>{l.msg}
          </div>
        ))}
      </div>
    </Card>
  );
}

function Slider({ label, v, min, max, step, fmt, on }: { label: string; v: number; min: number; max: number; step: number; fmt: (v: number) => string; on: (v: number) => void }) {
  return (
    <label className="block text-[11px] text-slate-400">
      <span className="flex justify-between"><span>{label}</span><span className="font-mono text-slate-200">{fmt(v)}</span></span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(+e.target.value)} className="w-full accent-orange-400" />
    </label>
  );
}
