import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RobotModel, Stage, D2R, clonePose, REST, type Pose, type Variant } from '../robot/model';
import { ASSEMBLY, MOTOR_GEARS, PART_INFO, PART_BY_ID } from '../robot/partsInfo';

const POSES: Record<string, Pose> = {
  upright: { pan: 0, a1: 90 * D2R, a2: 90 * D2R, a3: 90 * D2R, roll: 0, grip: 0.5 },
  rest: { ...REST, grip: 0.3 },
  reach: { pan: 0, a1: 62 * D2R, a2: -18 * D2R, a3: -75 * D2R, roll: 0, grip: 0.8 },
};

const kindColor: Record<string, string> = {
  'Printed part': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'Servo motor': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  Electronics: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export default function ExplodedView() {
  const mountRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [explode, setExplode] = useState(0.85);
  const [variant, setVariant] = useState<Variant>('follower');
  const [xray, setXray] = useState(false);
  const [labels, setLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pose, setPose] = useState<keyof typeof POSES>('upright');
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const [tab, setTab] = useState<'parts' | 'assembly'>('parts');
  const [hover, setHover] = useState<string | null>(null);

  const st = useRef({ explode, xray, labels, autoRotate, pose, selected, step, hover });
  st.current = { explode, xray, labels, autoRotate, pose, selected, step, hover };
  const fitRef = useRef<{ on: boolean }>({ on: true });
  const selectRef = useRef<(id: string | null) => void>(() => {});
  selectRef.current = (id) => {
    setSelected(id);
    if (id) setStep(null);
  };

  useEffect(() => {
    const el = mountRef.current!;
    const stage = new Stage(el, { bg: '#0a0e16' });
    const model = new RobotModel(variant);
    stage.scene.add(model.root);
    const grid = new THREE.GridHelper(160, 32, 0x2a3446, 0x182030);
    stage.scene.add(grid);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 48), new THREE.ShadowMaterial({ opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    stage.scene.add(floor);

    // guide lines
    const ids = Array.from(model.parts.keys());
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ids.length * 6), 3));
    const guide = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.55 }));
    guide.frustumCulled = false;
    stage.scene.add(guide);

    stage.camera.position.set(95, 62, 120);
    stage.controls.target.set(0, 34, 0);
    stage.controls.autoRotateSpeed = 1.1;

    const cur = { e: st.current.explode, pose: clonePose(POSES[st.current.pose]) };
    const rest = new Map<string, THREE.Vector3>();
    let prevFocus = '';
    const tmp = new THREE.Vector3();

    stage.onFrame = (dt) => {
      const s = st.current;
      cur.e += (s.explode - cur.e) * Math.min(1, dt * 6);
      const tp = POSES[s.pose];
      (Object.keys(tp) as (keyof Pose)[]).forEach((k) => (cur.pose[k] += (tp[k] - cur.pose[k]) * Math.min(1, dt * 5)));
      model.setPose(cur.pose);
      // focus
      const focusIds = s.hover ? [s.hover] : s.selected ? [s.selected] : s.step !== null ? ASSEMBLY[s.step].parts : null;
      const key = (focusIds ? focusIds.join(',') : '-') + s.xray;
      if (key !== prevFocus) {
        model.setFocus(focusIds && focusIds.length ? focusIds : null, s.xray);
        prevFocus = key;
      }
      // rest anchors for guide lines
      model.setExplode(0);
      model.root.updateMatrixWorld(true);
      ids.forEach((id) => rest.set(id, model.anchorWorld(id)!.clone()));
      model.setExplode(cur.e);
      model.root.updateMatrixWorld(true);
      const pos = lineGeo.getAttribute('position') as THREE.BufferAttribute;
      ids.forEach((id, i) => {
        const a = model.anchorWorld(id)!;
        const r = rest.get(id)!;
        pos.setXYZ(i * 2, r.x, r.y, r.z);
        pos.setXYZ(i * 2 + 1, a.x, a.y, a.z);
      });
      pos.needsUpdate = true;
      guide.visible = cur.e > 0.03;
      // camera fit
      if (fitRef.current.on) {
        const ty = 22 + 22 * cur.e;
        stage.controls.target.y += (ty - stage.controls.target.y) * Math.min(1, dt * 3);
        const off = stage.camera.position.clone().sub(stage.controls.target);
        const want = 85 + 95 * cur.e;
        off.setLength(off.length() + (want - off.length()) * Math.min(1, dt * 3));
        stage.camera.position.copy(stage.controls.target).add(off);
      }
      stage.controls.autoRotate = s.autoRotate && !s.selected;
      // pins
      const w = el.clientWidth, h = el.clientHeight;
      ids.forEach((id) => {
        const b = pinRefs.current[id];
        if (!b) return;
        const a = model.anchorWorld(id)!;
        tmp.copy(a).project(stage.camera);
        const visible = s.labels && tmp.z < 1;
        b.style.display = visible ? 'flex' : 'none';
        b.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w - 11}px, ${(-tmp.y * 0.5 + 0.5) * h - 11}px)`;
      });
    };

    // click-to-select
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down: [number, number] | null = null;
    const dom = stage.renderer.domElement;
    const pd = (e: PointerEvent) => { down = [e.clientX, e.clientY]; fitRef.current.on = false; };
    const pu = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
      down = null;
      if (moved > 4) return;
      const r = dom.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, stage.camera);
      const hits = ray.intersectObject(model.root, true).filter((h) => h.object.userData.partId && (h.object as THREE.Mesh).isMesh);
      const hit = hits.find((h) => ((h.object as THREE.Mesh).material as THREE.Material).opacity > 0.5);
      selectRef.current(hit ? hit.object.userData.partId : null);
    };
    dom.addEventListener('pointerdown', pd);
    dom.addEventListener('pointerup', pu);
    dom.addEventListener('wheel', () => (fitRef.current.on = false), { passive: true });
    return () => {
      dom.removeEventListener('pointerdown', pd);
      dom.removeEventListener('pointerup', pu);
      stage.dispose();
    };
  }, [variant]);

  const info = selected ? PART_BY_ID[selected] : null;
  const gear = selected && MOTOR_GEARS[selected] ? MOTOR_GEARS[selected] : null;
  const partIndex = useMemo(() => Object.fromEntries(PART_INFO.map((p, i) => [p.id, i + 1])), []);

  const pickStep = (i: number) => {
    setStep(step === i ? null : i);
    setSelected(null);
    fitRef.current.on = true;
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Exploded View</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Drag to orbit, scroll to zoom, click any part (or numbered pin) for a full explanation. Guide lines show the path every part takes during assembly. The 3D model is a procedural
            approximation of the SO-101 – it is for understanding, not for printing (use the official STL files).
          </p>
        </div>
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-1 text-sm">
          {(['follower', 'leader'] as Variant[]).map((v) => (
            <button key={v} onClick={() => { setVariant(v); setSelected(null); }} className={`rounded-md px-3 py-1.5 capitalize transition ${variant === v ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'}`}>
              {v} arm
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0e16]">
          <div className="relative h-[62vh] min-h-[460px] w-full">
            <div ref={mountRef} className="absolute inset-0" />
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {PART_INFO.map((p) => (
                <button
                  key={p.id}
                  ref={(r) => { pinRefs.current[p.id] = r; }}
                  onClick={() => setSelected(p.id === selected ? null : p.id)}
                  onMouseEnter={() => setHover(p.id)}
                  onMouseLeave={() => setHover(null)}
                  style={{ display: 'none' }}
                  className={`pointer-events-auto absolute left-0 top-0 h-[22px] w-[22px] items-center justify-center rounded-full border text-[10px] font-bold shadow-lg transition-colors ${
                    selected === p.id ? 'border-white bg-white text-slate-900' : p.kind === 'Servo motor' ? 'border-sky-300/70 bg-sky-500/80 text-white' : p.kind === 'Electronics' ? 'border-emerald-300/70 bg-emerald-500/80 text-white' : 'border-orange-300/70 bg-orange-500/85 text-white'
                  }`}
                >
                  {partIndex[p.id]}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute left-3 top-3 flex gap-2 text-[11px]">
              <span className="rounded bg-orange-500/80 px-2 py-0.5 text-white">printed</span>
              <span className="rounded bg-sky-500/80 px-2 py-0.5 text-white">STS3215 servo</span>
              <span className="rounded bg-emerald-500/80 px-2 py-0.5 text-white">electronics</span>
            </div>
            {hover && (
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/70 px-3 py-1.5 text-sm text-white">{PART_BY_ID[hover].name}</div>
            )}
          </div>
          <div className="grid gap-4 border-t border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>Assembled</span>
                <span className="font-medium text-orange-300">Explode: {Math.round(explode * 100)}%</span>
                <span>Exploded</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01} value={explode}
                onChange={(e) => { setExplode(+e.target.value); fitRef.current.on = true; }}
                className="w-full accent-orange-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {(['upright', 'rest', 'reach'] as const).map((k) => (
                <button key={k} onClick={() => setPose(k)} className={`rounded-md border px-2.5 py-1.5 capitalize ${pose === k ? 'border-orange-400 bg-orange-500/20 text-orange-200' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>
                  {k === 'upright' ? 'Assembly pose' : k === 'rest' ? 'Rest pose' : 'Reaching'}
                </button>
              ))}
              <Toggle on={xray} set={setXray} label="X-ray" />
              <Toggle on={labels} set={setLabels} label="Pins" />
              <Toggle on={autoRotate} set={setAutoRotate} label="Spin" />
              <button onClick={() => { fitRef.current.on = true; }} className="rounded-md border border-white/10 px-2.5 py-1.5 text-slate-300 hover:bg-white/5">Fit view</button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex max-h-[calc(62vh+120px)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex border-b border-white/10 text-sm">
            {(['parts', 'assembly'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 px-4 py-3 font-medium capitalize ${tab === t ? 'border-b-2 border-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                {t === 'parts' ? `Parts (${PART_INFO.length})` : 'Assembly steps'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'parts' && (
              <>
                {info ? (
                  <div className="mb-4 rounded-xl border border-orange-400/30 bg-orange-500/[0.07] p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-orange-300">Part #{partIndex[info.id]} · {info.joint}</div>
                        <h3 className="text-lg font-semibold text-white">{info.name}</h3>
                      </div>
                      <button onClick={() => setSelected(null)} className="rounded-md px-2 text-slate-400 hover:bg-white/10 hover:text-white">✕</button>
                    </div>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] ${kindColor[info.kind]}`}>{info.kind} · qty {info.qty}</span>
                    <p className="mt-3 text-sm leading-relaxed text-slate-200">{info.role}</p>
                    {gear && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className={`rounded-lg border p-2 ${variant === 'follower' ? 'border-orange-400/50 bg-orange-500/10' : 'border-white/10'}`}>
                          <div className="text-slate-400">Follower gearing</div>
                          <div className="font-mono text-base text-white">{gear.follower}</div>
                        </div>
                        <div className={`rounded-lg border p-2 ${variant === 'leader' ? 'border-teal-400/50 bg-teal-500/10' : 'border-white/10'}`}>
                          <div className="text-slate-400">Leader gearing</div>
                          <div className="font-mono text-base text-white">{gear.leader}</div>
                        </div>
                      </div>
                    )}
                    <Block title="Specs" items={info.specs} />
                    <Block title="Build tips" items={info.tips} />
                    {info.fasteners && <p className="mt-3 rounded-lg bg-black/30 p-2 text-xs text-slate-300"><b className="text-slate-100">Fasteners:</b> {info.fasteners}</p>}
                  </div>
                ) : (
                  <p className="mb-4 rounded-lg border border-dashed border-white/15 p-3 text-sm text-slate-400">Select a part in the 3D view or from this list to see what it does, its specs and assembly tips.</p>
                )}
                <ul className="space-y-1">
                  {PART_INFO.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => { setSelected(p.id === selected ? null : p.id); fitRef.current.on = true; }}
                        onMouseEnter={() => setHover(p.id)}
                        onMouseLeave={() => setHover(null)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${selected === p.id ? 'bg-orange-500/20 text-white' : 'text-slate-300 hover:bg-white/5'}`}
                      >
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${p.kind === 'Servo motor' ? 'bg-sky-500' : p.kind === 'Electronics' ? 'bg-emerald-500' : 'bg-orange-500'}`}>{partIndex[p.id]}</span>
                        <span className="flex-1">{p.name}</span>
                        <span className="text-[11px] text-slate-500">{p.joint}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {tab === 'assembly' && (
              <ol className="space-y-2">
                {ASSEMBLY.map((a, i) => (
                  <li key={i} className={`rounded-xl border transition ${step === i ? 'border-orange-400/50 bg-orange-500/[0.08]' : 'border-white/10 bg-white/[0.02]'}`}>
                    <button onClick={() => pickStep(i)} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-white">
                      {a.title}
                      <span className="text-xs text-slate-500">{step === i ? 'hide' : 'show'}</span>
                    </button>
                    {step === i && (
                      <div className="px-3 pb-3">
                        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
                          {a.actions.map((x, j) => <li key={j}>{x}</li>)}
                        </ul>
                        {a.parts.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {a.parts.map((p) => (
                              <button key={p} onClick={() => { setSelected(p); setTab('parts'); }} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-white/20">{PART_BY_ID[p].name}</button>
                            ))}
                          </div>
                        )}
                        {a.warn && <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-xs text-amber-200">⚠ {a.warn}</p>}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => set(!on)} className={`rounded-md border px-2.5 py-1.5 ${on ? 'border-orange-400 bg-orange-500/20 text-orange-200' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>
      {label}
    </button>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      <ul className="list-disc space-y-1 pl-5 text-[13px] text-slate-300">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}
