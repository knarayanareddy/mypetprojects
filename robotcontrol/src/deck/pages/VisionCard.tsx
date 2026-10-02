import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ARMS, ArmId, hub } from "../lib/hub";
import { ARM_BASE, ik } from "../lib/kin";
import { CAM_SLOTS, CamSlot, cameras } from "../lib/cameras";
import { vision, Pt } from "../lib/vision";
import { Badge, Btn, Card, inputCls, useCameras, useHub } from "../components/ui";

const useVision = () => { useSyncExternalStore(vision.subscribe, vision.getVersion); return vision; };

export function VisionCard() {
  const v = useVision();
  const h = useHub();
  useCameras();
  const cv = useRef<HTMLCanvasElement>(null);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"calibrate" | "reach">("calibrate");
  const [probe, setProbe] = useState<Pt | null>(null);
  const live = cameras.active(v.slot);

  // live preview with overlays
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = cv.current, vid = cameras.slots[vision.slot].video;
      if (c && vid && vid.videoWidth) {
        if (c.width !== vid.videoWidth) { c.width = vid.videoWidth; c.height = vid.videoHeight; }
        const g = c.getContext("2d")!;
        g.drawImage(vid, 0, 0);
        g.lineWidth = 2; g.font = "bold 16px ui-monospace, monospace";
        vision.draftPx.forEach((p, i) => { g.strokeStyle = "#22d3ee"; g.beginPath(); g.arc(p[0], p[1], 9, 0, 7); g.moveTo(p[0] - 14, p[1]); g.lineTo(p[0] + 14, p[1]); g.moveTo(p[0], p[1] - 14); g.lineTo(p[0], p[1] + 14); g.stroke(); g.fillStyle = "#22d3ee"; g.fillText(String(i + 1), p[0] + 12, p[1] - 10); });
        if (vision.cal) {
          for (const [bx, name] of [[ARM_BASE.A, "A"], [ARM_BASE.B, "B"]] as const) { const px = vision.worldToPx([bx[0], bx[2]]); if (px) { g.fillStyle = "#fb923c"; g.fillRect(px[0] - 6, px[1] - 6, 12, 12); g.fillText(name, px[0] + 10, px[1] + 5); } }
          for (const b of vision.lastBlobs) { g.strokeStyle = b.color; g.lineWidth = 3; g.strokeRect(b.px[0] - 18, b.px[1] - 18, 36, 36); g.fillStyle = "#fff"; g.fillText(`${b.id} ${b.world[0].toFixed(1)},${b.world[1].toFixed(1)}`, b.px[0] + 20, b.px[1] - 4); }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toNative = (e: React.MouseEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect(), c = e.currentTarget;
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height];
  };
  const reachTo = (w: Pt) => {
    const arm: ArmId = w[0] < 0 ? "A" : "B";
    const r = ik([w[0], 6, w[1]], ARM_BASE[arm], { pitch: 170, grip: 40 });
    if (!r.ok) { setMsg(`(${w[0].toFixed(1)}, ${w[1].toFixed(1)}) cm is out of arm ${arm}’s reach – nearest reachable pose used`); } else setMsg(`arm ${arm} hovering at (${w[0].toFixed(1)}, ${w[1].toFixed(1)}) cm, 6 cm above table`);
    hub.setTarget(arm, r.pose); hub.bump();
  };
  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = toNative(e);
    if (mode === "calibrate") { if (v.draftPx.length < v.draftWorld.length) v.addPoint(p); return; }
    const w = v.pxToWorld(p);
    if (!w) { setMsg("calibrate first"); return; }
    setProbe(w); reachTo(w);
  };

  const solve = () => {
    try {
      const vid = cameras.slots[v.slot].video;
      const cal = v.solve(vid?.videoWidth ?? 640, vid?.videoHeight ?? 480);
      setMsg(`Solved. Reprojection RMSE ${cal.rmse.toFixed(2)} cm ${cal.rmse > 0.8 ? "– high: re-click the marks more carefully" : "– good"}`);
    } catch (e) { setMsg((e as Error).message); }
  };
  const detect = () => {
    try {
      const want = hub.objects.filter((o) => o.pickable).map((o) => ({ id: o.id, color: o.color, expect: [o.pos[0], o.pos[2]] as Pt }));
      if (!want.length) { setMsg("No pickable objects in the scene – load a mission first (Missions tab) so the deck knows which colours to look for."); return; }
      const ids = hub.relocate();
      setMsg(ids.length ? `Found ${ids.join(", ")}` : "Nothing matched – check lighting / colours (objects must be saturated red, green, blue …)");
    } catch (e) { setMsg((e as Error).message); }
  };

  return (
    <Card title="Vision · camera → table calibration" right={<div className="flex gap-1.5">{v.cal ? <Badge tone={v.cal.rmse < 0.8 ? "green" : "amber"}>calibrated · {v.cal.rmse.toFixed(2)} cm</Badge> : <Badge tone="amber">not calibrated</Badge>}{live ? <Badge tone="green">camera live</Badge> : <Badge>camera off</Badge>}</div>}>
      <p className="mb-2 text-[11px] leading-relaxed text-slate-400">
        Scripted skills used hard-coded object coordinates. With this calibrated, <b>every pick first finds the object in the camera image</b> and converts it to table cm. Start the overhead camera below (slot <code>top</code>), tape ≥4 marks to the table, enter each mark’s position in cm
        (x: right of the midpoint between the arms, z: toward you from the base line; arm bases are the orange squares), click them in order, <b>Solve</b>.
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400">camera slot</span>
        <select className={`${inputCls} !w-24`} value={v.slot} onChange={(e) => { vision.slot = e.target.value as CamSlot; vision.clearPoints(); }}>{CAM_SLOTS.map((s) => <option key={s}>{s}</option>)}</select>
        <div className="ml-auto flex gap-1.5">
          <Btn tone={mode === "calibrate" ? "primary" : "default"} onClick={() => setMode("calibrate")}>1 · Calibrate</Btn>
          <Btn tone={mode === "reach" ? "primary" : "default"} disabled={!v.cal} onClick={() => setMode("reach")}>2 · Click-to-reach</Btn>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-black">
        <canvas ref={cv} onClick={onClick} className="block aspect-[4/3] w-full cursor-crosshair" width={640} height={480} />
        {!live && <div className="absolute inset-0 grid place-items-center text-xs text-slate-500">Start the “{v.slot}” camera in the Cameras card below</div>}
      </div>
      {mode === "calibrate" && (
        <div className="mt-2 space-y-1.5">
          <div className="grid grid-cols-[28px_1fr_1fr_70px] items-center gap-1.5 text-[10px] text-slate-500"><span>#</span><span>world x (cm)</span><span>world z (cm)</span><span>clicked</span></div>
          {v.draftWorld.map((w, i) => (
            <div key={i} className="grid grid-cols-[28px_1fr_1fr_70px] items-center gap-1.5 text-xs">
              <span className="font-mono text-cyan-300">{i + 1}</span>
              <input type="number" step={0.5} className={inputCls} value={w[0]} onChange={(e) => v.setWorld(i, [+e.target.value, w[1]])} />
              <input type="number" step={0.5} className={inputCls} value={w[1]} onChange={(e) => v.setWorld(i, [w[0], +e.target.value])} />
              <span className="text-[10px] text-slate-400">{v.draftPx[i] ? `${v.draftPx[i][0].toFixed(0)},${v.draftPx[i][1].toFixed(0)}` : i === v.draftPx.length ? "← click" : "—"}</span>
            </div>
          ))}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Btn tone="primary" disabled={v.draftPx.length < 4 || v.draftPx.length !== v.draftWorld.length} onClick={solve}>Solve</Btn>
            <Btn onClick={() => v.clearPoints()}>Clear clicks</Btn>
            <Btn onClick={() => v.addRef()}>+ mark</Btn><Btn onClick={() => v.popRef()}>− mark</Btn>
            <Btn tone="ghost" onClick={() => v.clear()}>Forget calibration</Btn>
          </div>
        </div>
      )}
      {mode === "reach" && (
        <p className="mt-2 text-[11px] text-slate-400">Click anywhere on the table in the image: the nearer arm hovers its gripper 6 cm above that point{h.settings.drive ? " (REAL arms live if torque is on)" : " (simulation – enable Drive + torque to move the real arm)"}. {probe && <span className="font-mono text-emerald-300">→ ({probe[0].toFixed(1)}, {probe[1].toFixed(1)}) cm</span>}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2">
        <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={h.settings.useVision} onChange={(e) => h.setSetting("useVision", e.target.checked)} /> Use vision in skills (re-locate objects before every pick)</label>
        <Btn disabled={!v.cal || !live} onClick={detect}>Detect scene objects now</Btn>
        {ARMS.length > 0 && v.lastDetectAt > 0 && <span className="text-[10px] text-slate-500">last: {new Date(v.lastDetectAt).toLocaleTimeString()} · {v.lastBlobs.length} found</span>}
      </div>
      {msg && <p className="mt-2 text-[11px] text-amber-300">{msg}</p>}
    </Card>
  );
}

export function GraspCard() {
  const h = useHub();
  const [arm, setArm] = useState<ArmId>("A");
  const [res, setRes] = useState<{ held: boolean; why: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const s = h.settings;
  const g = h.gripperTelemetry(arm);
  const test = async () => {
    setBusy(true); setRes(null);
    try {
      if (!h.arms[arm].torque) throw new Error(`Arm ${arm} needs torque ON (Control tab) and “Drive real arms” enabled`);
      h.setJoint(arm, 5, 60); await new Promise((r) => setTimeout(r, 900));
      h.setJoint(arm, 5, 6);
      setRes(await h.verifyGrasp(arm, 6));
    } catch (e) { setRes({ held: false, why: (e as Error).message }); }
    setBusy(false);
  };
  const Sl = ({ label, k, min, max, step }: { label: string; k: "gripGap" | "gripLoad"; min: number; max: number; step: number }) => (
    <label className="grid grid-cols-[130px_1fr_46px] items-center gap-2 text-[11px] text-slate-300">{label}
      <input type="range" min={min} max={max} step={step} value={s[k]} onChange={(e) => h.setSetting(k, +e.target.value)} /><span className="font-mono">{s[k]}</span></label>
  );
  return (
    <Card title="Grasp sensing (servo load, not dice)" right={<Badge tone={g ? "green" : "slate"}>{g ? "gripper telemetry live" : "no telemetry"}</Badge>}>
      <p className="mb-2 text-[11px] leading-relaxed text-slate-400">
        A grasp counts as <b>held</b> when the jaws stopped <i>gap</i> units above the commanded closure <b>and</b> the gripper servo is still pushing (<i>load</i> ‰ of max torque). Closing on nothing reaches the goal with ~0 gap. The same test runs again after the lift to catch slips.
      </p>
      <div className="space-y-1.5"><Sl label="min gap (norm units)" k="gripGap" min={2} max={30} step={1} /><Sl label="min load (‰)" k="gripLoad" min={20} max={500} step={5} /></div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select className={`${inputCls} !w-20`} value={arm} onChange={(e) => setArm(e.target.value as ArmId)}><option>A</option><option>B</option></select>
        <Btn tone="primary" disabled={busy} onClick={test}>{busy ? "measuring…" : "Close & measure"}</Btn>
        <Btn onClick={() => h.setJoint(arm, 5, 60)}>Open gripper</Btn>
        {g && <span className="font-mono text-[10px] text-slate-400">pos {g.pos.toFixed(1)} · load {g.load} · {g.current.toFixed(0)} mA</span>}
      </div>
      {res && <p className={`mt-2 text-[11px] ${res.held ? "text-emerald-300" : "text-amber-300"}`}>{res.held ? "✔ object detected: " : "✘ "}{res.why}</p>}
      <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-800 pt-2 text-xs text-slate-300">
        <label className="flex items-center gap-2"><input type="checkbox" checked={s.allowUncalibrated} onChange={(e) => h.setSetting("allowUncalibrated", e.target.checked)} /> <span className="text-red-300">allow torque on uncalibrated arms (unsafe)</span></label>
      </div>
    </Card>
  );
}
