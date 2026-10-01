"use client";
import { useEffect, useState } from "react";
import { FeetechBus } from "@/lib/feetech";
import { useHub, type SlotId } from "@/lib/hub";
import { exportLerobot, importLerobot, JOINTS, rawToNorm } from "@/lib/calibration";

export default function ArmPanel({ id, title }: { id: SlotId; title: string }) {
  const hub = useHub();
  const s = hub.slots[id];
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(FeetechBus.supported()), []);
  const guard = async (fn: () => Promise<void>) => {
    setMsg("");
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="card p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${s.connected ? (s.torque ? "bg-emerald-400" : "bg-amber-400") : "bg-slate-600"}`} />
        <div className="font-semibold">{title}</div>
        <span className="chip">{s.role}</span>
        {s.connected && <span className="chip">{s.found.length}/6 servos · {s.hz.toFixed(0)} Hz</span>}
        <div className="ml-auto flex gap-1.5">
          {!s.connected ? (
            <button className="btn btn-primary" disabled={!supported} onClick={() => guard(() => hub.connect(id))}>
              Connect
            </button>
          ) : (
            <>
              {s.role === "follower" && (
                <button className={`btn ${s.torque ? "btn-danger" : ""}`} onClick={() => guard(() => hub.setTorque(id, !s.torque))}>
                  {s.torque ? "Torque OFF" : "Torque ON"}
                </button>
              )}
              <button className="btn" onClick={() => guard(() => hub.disconnect(id))}>
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>
      {!supported && <p className="mt-2 text-xs text-amber-300">Web Serial is not available. Use desktop Chrome or Edge over https/localhost.</p>}
      {(msg || s.error) && <p className="mt-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-300">{msg || s.error}</p>}
      {s.role === "leader" && s.connected && <p className="mt-2 text-xs text-slate-400">Leader torque is always OFF — move it by hand. Enable “Mirror” on the dashboard to make the follower copy it.</p>}

      {s.connected && s.raw && (
        <table className="mt-2 w-full text-[11px]">
          <thead>
            <tr className="text-left text-slate-500">
              <th>joint</th>
              <th>raw</th>
              <th className="w-[38%]">normalised</th>
              <th>load</th>
              <th>°C</th>
              <th>V</th>
            </tr>
          </thead>
          <tbody>
            {JOINTS.map((j, i) => {
              const t = s.tele?.[i];
              const n = rawToNorm(s.cal, i, s.raw![i]);
              const pct = i === 5 ? n : (n + 100) / 2;
              return (
                <tr key={j} className="border-t border-slate-800/80">
                  <td className="py-0.5 pr-1">{j}</td>
                  <td className="tabular-nums">{s.raw![i]}</td>
                  <td>
                    <div className="relative h-3 rounded bg-slate-800">
                      <div className="absolute inset-y-0 left-0 rounded bg-[#ff7a1a]/80" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                      <span className="absolute inset-0 text-center text-[9px] leading-3">{n.toFixed(0)}</span>
                    </div>
                  </td>
                  <td className={`tabular-nums ${t && Math.abs(t.load) > 700 ? "text-red-300" : ""}`}>{t?.load ?? "–"}</td>
                  <td className={`tabular-nums ${t && t.temp > 65 ? "text-red-300" : t && t.temp > 55 ? "text-amber-300" : ""}`}>{t?.temp ?? "–"}</td>
                  <td className="tabular-nums">{t?.volt.toFixed(1) ?? "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <button className="mt-2 text-xs text-slate-400 hover:text-white" onClick={() => setOpen((o) => !o)}>
        {open ? "▾" : "▸"} Calibration {s.cal.calibrated ? "✓" : "(not calibrated)"} · alignment {s.cal.aligned ? "✓" : "(not aligned)"}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg bg-slate-950/60 p-2 text-xs">
          <p className="text-slate-400">
            Calibration is LeRobot-compatible (joints → ±100 over the calibrated range, gripper 0–100). Already calibrated with <code className="inline">lerobot-calibrate</code>? Import its JSON from <code className="inline">~/.cache/huggingface/lerobot/calibration/</code>.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <label className="btn cursor-pointer">
              Import LeRobot JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  void f.text().then((t) => guard(async () => hub.setCal(id, importLerobot(t, s.cal))));
                }}
              />
            </label>
            <button
              className="btn"
              onClick={() => {
                const url = URL.createObjectURL(new Blob([exportLerobot(s.cal)], { type: "application/json" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = `${id}_calibration.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export JSON
            </button>
            {s.connected &&
              (s.sweep ? (
                <button className="btn btn-primary" onClick={() => hub.finishSweep(id)}>
                  ✔ Finish range recording
                </button>
              ) : (
                <button className="btn" onClick={() => hub.startSweep(id)}>
                  ● Record joint ranges
                </button>
              ))}
            {s.connected && (
              <button className="btn" onClick={() => hub.captureRest(id)}>
                ⌖ Align sim to this pose
              </button>
            )}
          </div>
          {s.sweep && <p className="text-amber-300">Recording — move EVERY joint through its full range (and open/close the gripper), then press Finish. The arm should be torque-OFF / hand-guided.</p>}
          <p className="text-slate-500">
            Alignment: fold the arm into the simulator’s rest pose (upper arm near vertical leaning slightly back, forearm forward & slightly down, gripper pointing down-forward), then press “Align sim to this pose”. Needed for the digital twin and IK skills (not for pure LeRobot policies).
          </p>
          <div className="grid grid-cols-3 gap-1">
            {JOINTS.slice(0, 5).map((j, i) => (
              <label key={j} className="flex items-center gap-1">
                <input type="checkbox" checked={s.cal.sign[i] < 0} onChange={(e) => hub.updateCal(id, (c) => (c.sign[i] = e.target.checked ? -1 : 1))} />
                flip {j.replace("_", " ")}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
