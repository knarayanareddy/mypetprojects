"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RobotModel, Stage, type Variant } from "@/lib/robot3d";
import { D2R, lerpPose, REST, type Pose } from "@/lib/kin";
import { BUILD_STEPS, LEADER_MOTORS, PART_BY_ID, PARTS, TYPE_META } from "@/lib/parts";

const STRAIGHT: Pose = { pan: 0, a1: 28 * D2R, a2: 0, a3: -8 * D2R, roll: 0, grip: 0.6 };

export default function ExplodedView({ compact = false }: { compact?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<Variant>("follower");
  const [explode, setExplode] = useState(compact ? 0.8 : 0.85);
  const [xray, setXray] = useState(false);
  const [labels, setLabels] = useState(true);
  const [auto, setAuto] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const state = useRef({ explode, xray, labels, auto, sel, step, hover, compact });
  state.current = { explode, xray, labels, auto, sel, step, hover, compact };
  const modelRef = useRef<RobotModel | null>(null);
  const stageRef = useRef<Stage | null>(null);
  const markerEls = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const stage = new Stage(el, { bg: "#080c16" });
    stageRef.current = stage;
    stage.camera.position.set(34, 30, 56);
    stage.controls.target.set(14, 12, 0);
    stage.controls.minDistance = 20;
    stage.controls.maxDistance = 160;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(70, 64), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    stage.scene.add(floor);
    const grid = new THREE.GridHelper(120, 24, 0x334155, 0x1e293b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    stage.scene.add(grid);

    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const pick = (ev: PointerEvent): string | null => {
      const m = modelRef.current;
      if (!m) return null;
      const r = stage.renderer.domElement.getBoundingClientRect();
      mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, stage.camera);
      const hit = ray.intersectObjects(m.pickables(), false)[0];
      return hit ? (hit.object.userData.partId as string) : null;
    };
    let down = { x: 0, y: 0 };
    const dom = stage.renderer.domElement;
    const onMove = (e: PointerEvent) => {
      if (state.current.compact) return;
      const id = pick(e);
      setHover((h) => (h === id ? h : id));
      dom.style.cursor = id ? "pointer" : "grab";
    };
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (state.current.compact) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) setSel(pick(e));
    };
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointerup", onUp);

    const v = new THREE.Vector3();
    stage.onFrame = (_dt, t) => {
      const s = state.current;
      const m = modelRef.current;
      if (!m) return;
      stage.controls.autoRotate = s.auto;
      stage.controls.autoRotateSpeed = 0.9;
      const e = s.compact ? 0.5 + 0.5 * Math.sin(t * 0.7) : s.explode;
      m.setExplode(e * 1.25);
      m.setPose(lerpPose(REST, STRAIGHT, Math.min(1, e * 1.4)));
      const ids = s.step !== null ? PARTS.filter((p) => p.step <= (s.step as number)).map((p) => p.id) : null;
      const focus = s.sel ? [s.sel] : s.hover ? [s.hover] : ids;
      m.setFocus(focus, s.xray);
      if (!s.compact) {
        const w = el.clientWidth;
        const h = el.clientHeight;
        for (const p of PARTS) {
          const mk = markerEls.current[p.id];
          if (!mk) continue;
          const a = m.anchorWorld(p.id);
          if (!a || !s.labels) {
            mk.style.display = "none";
            continue;
          }
          v.copy(a).project(stage.camera);
          if (v.z > 1) {
            mk.style.display = "none";
            continue;
          }
          mk.style.display = "grid";
          mk.style.transform = `translate(${(v.x * 0.5 + 0.5) * w - 11}px, ${(-v.y * 0.5 + 0.5) * h - 11}px)`;
        }
      }
    };
    return () => {
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointerup", onUp);
      modelRef.current?.dispose();
      stage.dispose();
      stageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (modelRef.current) {
      stage.scene.remove(modelRef.current.root);
      modelRef.current.dispose();
    }
    const m = new RobotModel(variant);
    stage.scene.add(m.root);
    modelRef.current = m;
  }, [variant]);

  const part = sel ? PART_BY_ID[sel] : null;
  const grouped = useMemo(() => (["printed", "actuator", "electronics"] as const).map((t) => ({ t, items: PARTS.filter((p) => p.type === t) })), []);

  if (compact) return <div ref={host} className="h-full w-full" />;

  return (
    <div className="mx-auto grid max-w-[1600px] gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_400px]" style={{ height: "calc(100vh - 56px)" }}>
      <section className="card relative min-h-[460px] overflow-hidden">
        <div ref={host} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {PARTS.map((p) => (
            <button
              key={p.id}
              ref={(el) => {
                markerEls.current[p.id] = el;
              }}
              onClick={() => setSel(p.id === sel ? null : p.id)}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              className={`pointer-events-auto absolute left-0 top-0 hidden h-[22px] w-[22px] place-items-center rounded-full border text-[11px] font-bold shadow ${sel === p.id ? "border-white bg-[#ff7a1a] text-slate-900" : "border-slate-500 bg-slate-900/90 text-slate-100 hover:border-[#ff7a1a]"}`}
            >
              {p.num}
            </button>
          ))}
        </div>
        <div className="absolute left-3 top-3 rounded-xl bg-slate-950/80 p-3 backdrop-blur">
          <div className="text-lg font-bold">Exploded view</div>
          <div className="text-xs text-slate-400">Drag to orbit · scroll to zoom · click a part</div>
          <div className="mt-2 flex gap-1.5">
            {(["follower", "leader"] as Variant[]).map((v) => (
              <button key={v} onClick={() => setVariant(v)} className={`btn ${variant === v ? "btn-primary" : ""}`}>
                {v === "follower" ? "Follower arm" : "Leader arm"}
              </button>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-3 bottom-3 space-y-2 rounded-xl bg-slate-950/85 p-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <label className="flex flex-1 items-center gap-2">
              explode
              <input className="flex-1" type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(+e.target.value)} />
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={xray} onChange={(e) => setXray(e.target.checked)} /> x-ray
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> labels
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> auto-rotate
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="mr-1 text-slate-400">Assembly order:</span>
            <button onClick={() => setStep(null)} className={`chip ${step === null ? "!border-[#ff7a1a] !text-white" : ""}`}>
              all
            </button>
            {BUILD_STEPS.map((b, i) => (
              <button key={b} title={b} onClick={() => setStep(i)} className={`chip ${step === i ? "!border-[#ff7a1a] !text-white" : ""}`}>
                {i}
              </button>
            ))}
            {step !== null && <span className="ml-2 text-slate-300">{BUILD_STEPS[step]}</span>}
          </div>
        </div>
      </section>

      <aside className="card flex min-h-0 flex-col overflow-hidden">
        {part ? (
          <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            <button className="text-xs text-slate-400 hover:text-white" onClick={() => setSel(null)}>
              ← all parts
            </button>
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ff7a1a] font-bold text-slate-900">{part.num}</span>
              <div>
                <div className="text-lg font-bold leading-tight">{variant === "leader" && part.leaderName ? part.leaderName : part.name}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="chip" style={{ borderColor: TYPE_META[part.type].color, color: TYPE_META[part.type].color }}>
                    {TYPE_META[part.type].label}
                  </span>
                  <span className="chip">qty {part.qty}</span>
                  <span className="chip">{part.joint}</span>
                </div>
              </div>
            </div>
            <p className="text-slate-100">{part.blurb}</p>
            <ul className="list-disc space-y-1.5 pl-5 text-slate-300">
              {part.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <table className="w-full text-xs">
              <tbody>
                {(variant === "leader" && part.leaderSpecs ? [...part.specs.filter((s) => !s[0].startsWith("Follower")), ...part.leaderSpecs] : part.specs).map(([k, v]) => (
                  <tr key={k} className="border-t border-slate-800">
                    <td className="py-1.5 pr-3 text-slate-400">{k}</td>
                    <td className="py-1.5">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {part.tip && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-emerald-100">💡 {part.tip}</div>}
            <div className="text-xs text-slate-400">
              Built in step {part.step}: <b className="text-slate-200">{BUILD_STEPS[part.step]}</b>
            </div>
          </div>
        ) : (
          <div className="scroll-thin flex-1 space-y-4 overflow-y-auto p-4 text-sm">
            <div>
              <div className="text-lg font-bold">{variant === "follower" ? "Follower arm" : "Leader arm"} · 17 parts</div>
              <p className="mt-1 text-slate-400">
                {variant === "follower"
                  ? "Six identical STS3215 servos (1/345 gearing) + printed links. This is the arm that does the work."
                  : "Same geometry, but with a handle + trigger and three different gear ratios so you can move it by hand and it still holds its weight."}
              </p>
            </div>
            {variant === "leader" && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-1">Axis</th>
                    <th>ID</th>
                    <th>Gear ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {LEADER_MOTORS.map((m) => (
                    <tr key={m.id} className="border-t border-slate-800">
                      <td className="py-1">{m.axis}</td>
                      <td>{m.id}</td>
                      <td>{m.ratio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {grouped.map((g) => (
              <div key={g.t}>
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: TYPE_META[g.t].color }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: TYPE_META[g.t].color }} />
                  {TYPE_META[g.t].label} ({g.items.length})
                </div>
                <div className="space-y-1">
                  {g.items.map((p) => (
                    <button key={p.id} onClick={() => setSel(p.id)} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} className="flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-2.5 py-1.5 text-left hover:border-[#ff7a1a]">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-700 text-[10px] font-bold">{p.num}</span>
                      <span className="flex-1 truncate">{variant === "leader" && p.leaderName ? p.leaderName : p.name}</span>
                      <span className="text-[10px] text-slate-500">{p.qty}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-500">Dimensions are approximations for visualisation. Always follow the official SO-ARM100 bill of materials and STL files.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
