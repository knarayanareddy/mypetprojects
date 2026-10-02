"use client";

import { useEffect, useRef, useState } from "react";
import { simProject } from "@/lib/sim";
import { applyH, ACCURACY_TARGET_CM, type Detection, type Mark } from "@/lib/vision";
import { useRoom } from "./RoomProvider";
import { Badge, Btn, Card, Num } from "./ui";

type ClickMode = "fit" | "probe" | "sample" | "test";

export function VisionTab() {
  const { cameraMode, setCameraMode, grabFrame, data, update, report, perceive, hasBackground, captureBackground, sampleColor, follower, fState, log } = useRoom();
  const cv = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<ClickMode>("fit");
  const [world, setWorld] = useState({ x: 16, y: 0 });
  const [dets, setDets] = useState<Detection[]>([]);
  const [err, setErr] = useState("");
  const [label, setLabel] = useState("my object");
  const [test, setTest] = useState<{ px: { x: number; y: number }; world: { x: number; y: number } } | null>(null);
  const marksRef = useRef(data.marks);
  marksRef.current = data.marks;
  const detsRef = useRef(dets);
  detsRef.current = dets;
  const testRef = useRef(test);
  testRef.current = test;

  useEffect(() => {
    const id = setInterval(() => {
      const c = cv.current;
      const f = grabFrame();
      if (!c || !f) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(f.data), f.width, f.height), 0, 0);
      ctx.lineWidth = 2;
      ctx.font = "12px sans-serif";
      for (const m of marksRef.current) {
        ctx.strokeStyle = m.role === "fit" ? "#22d3ee" : "#fbbf24";
        ctx.beginPath();
        ctx.arc(m.px.x, m.px.y, 7, 0, Math.PI * 2);
        ctx.moveTo(m.px.x - 11, m.px.y);
        ctx.lineTo(m.px.x + 11, m.px.y);
        ctx.moveTo(m.px.x, m.px.y - 11);
        ctx.lineTo(m.px.x, m.px.y + 11);
        ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(`${m.world.x},${m.world.y}`, m.px.x + 9, m.px.y - 9);
      }
      for (const d of detsRef.current) {
        ctx.strokeStyle = "#a3e635";
        ctx.strokeRect(d.bbox[0], d.bbox[1], d.bbox[2] - d.bbox[0], d.bbox[3] - d.bbox[1]);
        ctx.fillStyle = "#a3e635";
        ctx.fillText(`${d.label}${d.world ? ` (${d.world.x.toFixed(1)}, ${d.world.y.toFixed(1)})` : ""}`, d.bbox[0], d.bbox[1] - 4);
      }
      const t = testRef.current;
      if (t) {
        ctx.strokeStyle = "#f472b6";
        ctx.beginPath();
        ctx.arc(t.px.x, t.px.y, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }, 120);
    return () => clearInterval(id);
  }, [grabFrame]);

  useEffect(() => {
    const id = setInterval(() => {
      perceive().then(
        (d) => {
          setDets(d);
          setErr("");
        },
        (e) => {
          setDets([]);
          setErr(e instanceof Error ? e.message : String(e));
        },
      );
    }, 700);
    return () => clearInterval(id);
  }, [perceive]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = { x: ((e.clientX - r.left) / r.width) * 640, y: ((e.clientY - r.top) / r.height) * 480 };
    if (mode === "fit" || mode === "probe") {
      const m: Mark = { id: `${mode}-${Date.now()}`, px, world: { ...world }, role: mode };
      update({ marks: [...data.marks, m] });
    } else if (mode === "sample") {
      const rgb = sampleColor(px);
      if (rgb) {
        update({ palette: [...data.palette.filter((p) => p.label !== label), { label, rgb, tol: 45 }] });
        log(`Sampled colour for "${label}": rgb(${rgb.join(",")})`, "ok");
      }
    } else if (report.H) {
      setTest({ px, world: applyH(report.H, px) });
    }
  };

  const fillFromTip = () => {
    const t = follower?.arm.tip(fState);
    if (t) setWorld({ x: Number(t.tip[0].toFixed(1)), y: Number(t.tip[1].toFixed(1)) });
  };

  const autoCalSim = () => {
    const pts: [number, number, "fit" | "probe"][] = [[12, -10, "fit"], [12, 10, "fit"], [24, -10, "fit"], [24, 10, "fit"], [18, 0, "fit"], [15, 5, "fit"], [14, -3, "probe"], [21, 4, "probe"], [19, -7, "probe"]];
    const n = () => (Math.random() * 2 - 1) * 1.5;
    update({
      marks: pts.map(([x, y, role], i) => {
        const p = simProject(x, y);
        return { id: `sim-${i}`, px: { x: p.u + n(), y: p.v + n() }, world: { x, y }, role };
      }),
    });
    log("Virtual camera calibrated with 6 fit + 3 probe marks (±1.5 px click noise)", "ok");
  };

  const tone = report.status === "ok" ? "green" : report.status === "warn" ? "amber" : report.status === "unvalidated" ? "amber" : "red";

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-3 xl:col-span-2">
        <Card
          title="Camera"
          right={
            <div className="flex items-center gap-2">
              <Btn small kind={cameraMode === "sim" ? "primary" : "ghost"} onClick={() => setCameraMode("sim")}>Virtual camera</Btn>
              <Btn small kind={cameraMode === "webcam" ? "primary" : "ghost"} onClick={() => setCameraMode("webcam")}>USB webcam</Btn>
            </div>
          }
        >
          <canvas ref={cv} width={640} height={480} onClick={onClick} className="w-full cursor-crosshair rounded-lg border border-slate-700 bg-black" />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Click action:</span>
            {([["fit", "Add FIT mark"], ["probe", "Add PROBE mark"], ["sample", "Sample colour"], ["test", "Test point"]] as const).map(([k, t]) => (
              <Btn key={k} small kind={mode === k ? "primary" : "ghost"} onClick={() => setMode(k)}>{t}</Btn>
            ))}
          </div>
          {(mode === "fit" || mode === "probe") && (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-800 p-3">
              <Num label="World X (cm)" step={0.1} value={world.x} onChange={(x) => setWorld({ ...world, x })} />
              <Num label="World Y (cm)" step={0.1} value={world.y} onChange={(y) => setWorld({ ...world, y })} />
              <Btn small disabled={!follower} onClick={fillFromTip} title="Place the fingertip on the mark, then press">Use fingertip position</Btn>
              <p className="basis-full text-xs text-slate-500">
                1) Touch the gripper tip to a mark on the table (or type its measured coordinates). 2) Press “Use fingertip position”. 3) Click that same spot in the image. Repeat for ≥4 FIT marks spread over the whole working area, then add 2–3 PROBE marks at <i>other</i> spots to measure the true error.
              </p>
            </div>
          )}
          {mode === "sample" && (
            <div className="mt-3 flex items-end gap-2 text-xs text-slate-400">
              <label className="flex flex-col gap-1">Label for the clicked object
                <input value={label} onChange={(e) => setLabel(e.target.value)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" />
              </label>
              <span>Click on an object. Works for black/dark objects too (sampled colour).</span>
            </div>
          )}
          {mode === "test" && test && (
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="font-mono text-pink-300">→ ({test.world.x.toFixed(1)}, {test.world.y.toFixed(1)}) cm</span>
              <Btn small disabled={!follower || !fState?.torque} onClick={() => follower?.arm.moveTip([test.world.x, test.world.y, 5], { ms: 1500 }).catch((e) => log(String(e), "error"))}>Hover the fingertip here (verify physically)</Btn>
            </div>
          )}
          {err && <p className="mt-2 text-xs text-amber-300">{err}</p>}
        </Card>
      </div>

      <div className="space-y-3">
        <Card title="Calibration accuracy" right={<Badge tone={tone}>{report.status.toUpperCase()}</Badge>}>
          <p className="text-sm text-slate-300">{report.message}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-slate-950 p-2">
              <div className="text-slate-500">Held-out error ({report.heldOut?.method ?? "n/a"})</div>
              {report.heldOut ? (
                <div className="font-mono text-slate-200">median {report.heldOut.median.toFixed(2)} · p90 {report.heldOut.p90.toFixed(2)} · max {report.heldOut.max.toFixed(2)} cm</div>
              ) : (
                <div className="font-mono text-amber-300">unknown</div>
              )}
            </div>
            <div className="rounded bg-slate-950 p-2 opacity-70">
              <div className="text-slate-500">In-sample fit (NOT accuracy)</div>
              <div className="font-mono text-slate-400">{report.inSampleRmse === null ? "-" : `${report.inSampleRmse.toFixed(3)} cm`}</div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Target: median ≤ {ACCURACY_TARGET_CM} cm on spots the fit has never seen. The in-sample number is ~0 by construction, so it is never used for pass/fail.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Btn small onClick={autoCalSim} disabled={cameraMode !== "sim"}>Auto-calibrate virtual camera</Btn>
            <Btn small onClick={() => update({ marks: [] })}>Clear marks</Btn>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={data.acceptUnvalidated} onChange={(e) => update({ acceptUnvalidated: e.target.checked })} />Allow missions with an unvalidated calibration (not recommended)</label>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
            {data.marks.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded border border-slate-800 px-2 py-1">
                <span><Badge tone={m.role === "fit" ? "cyan" : "amber"}>{m.role}</Badge> <span className="font-mono text-slate-400">({m.world.x}, {m.world.y}) ← ({m.px.x.toFixed(0)}, {m.px.y.toFixed(0)})</span></span>
                <span className="flex gap-1">
                  <Btn small onClick={() => update({ marks: data.marks.map((x) => (x.id === m.id ? { ...x, role: x.role === "fit" ? "probe" : "fit" } : x)) })}>↔</Btn>
                  <Btn small onClick={() => update({ marks: data.marks.filter((x) => x.id !== m.id) })}>✕</Btn>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Detection">
          <div className="flex gap-2 text-xs">
            <Btn small kind={data.detectMode === "color" ? "primary" : "ghost"} onClick={() => update({ detectMode: "color" })}>Colour palette</Btn>
            <Btn small kind={data.detectMode === "diff" ? "primary" : "ghost"} onClick={() => update({ detectMode: "diff" })}>Background subtraction</Btn>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {data.detectMode === "color"
              ? "Matches sampled colours: add any colour (even black) with “Sample colour”. Needs steady lighting and objects unlike the table."
              : "Compares against an empty-table reference frame: colour independent, so dark objects on a dark table work. Do not move the camera after capturing."}
          </p>
          {data.detectMode === "diff" && (
            <div className="mt-2 flex items-center gap-2">
              <Btn small onClick={captureBackground}>Capture empty table</Btn>
              <Badge tone={hasBackground ? "green" : "amber"}>{hasBackground ? "reference set" : "missing"}</Badge>
              <Num label="Threshold" value={data.diffThresh} onChange={(v) => update({ diffThresh: v })} />
            </div>
          )}
          <div className="mt-2"><Num label="Min blob area (px²)" value={data.minArea} step={50} w="w-24" onChange={(v) => update({ minArea: v })} /></div>
          <ul className="mt-2 space-y-1 text-xs">
            {data.palette.map((p) => (
              <li key={p.label} className="flex items-center gap-2">
                <span className="h-4 w-4 rounded border border-slate-600" style={{ background: `rgb(${p.rgb.join(",")})` }} />
                <span className="flex-1">{p.label}</span>
                <input type="number" value={p.tol} className="w-14 rounded border border-slate-700 bg-slate-950 px-1 text-slate-200" onChange={(e) => update({ palette: data.palette.map((x) => (x.label === p.label ? { ...x, tol: Number(e.target.value) } : x)) })} />
                <Btn small onClick={() => update({ palette: data.palette.filter((x) => x.label !== p.label) })}>✕</Btn>
              </li>
            ))}
          </ul>
          <div className="mt-2 text-xs text-slate-400">{dets.length} detection(s): {dets.map((d) => d.label).join(", ") || "none"}</div>
        </Card>
      </div>
    </div>
  );
}
