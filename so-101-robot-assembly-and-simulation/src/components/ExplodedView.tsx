import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildArm, Variant } from '../sim/arm';
import { PARTS, PART_BY_ID, TYPE_META, LEADER_MOTORS } from '../data/parts';

interface Props {
  onGoBuild: (step: number) => void;
}

const CENTER = new THREE.Vector3(33, 6, 0);

export default function ExplodedView({ onGoBuild }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [explode, setExplode] = useState(1);
  const [variant, setVariant] = useState<Variant>('follower');
  const [selected, setSelected] = useState<string | null>('motor1');
  const [focus, setFocus] = useState(true);
  const [labels, setLabels] = useState(true);
  const [spin, setSpin] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

  const live = useRef({
    explode: 0,
    target: 1,
    selected: 'motor1' as string | null,
    hover: null as string | null,
    focus: true,
    labels: true,
    spin: false,
    dirty: true,
    focusFrames: 0,
  });
  const api = useRef<{ resetView: () => void } | null>(null);

  useEffect(() => {
    live.current.target = explode;
  }, [explode]);
  const firstSel = useRef(true);
  useEffect(() => {
    const L = live.current;
    L.selected = selected;
    L.dirty = true;
    if (firstSel.current) firstSel.current = false;
    else L.focusFrames = 80;
  }, [selected]);
  useEffect(() => {
    live.current.focus = focus;
    live.current.dirty = true;
  }, [focus]);
  useEffect(() => {
    live.current.labels = labels;
  }, [labels]);
  useEffect(() => {
    live.current.spin = spin;
  }, [spin]);
  useEffect(() => {
    live.current.hover = hover;
    live.current.dirty = true;
  }, [hover]);

  useEffect(() => {
    const el = mount.current!;
    const L = live.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(40, 80, 60);
    scene.add(dir);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 800);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotateSpeed = 1.4;
    controls.target.copy(CENTER);

    const grid = new THREE.GridHelper(200, 40, 0x334155, 0x1e293b);
    grid.position.set(33, -20, 0);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.6;
    scene.add(grid);

    // ----- arm -> flatten into independent parts -----
    const rig = buildArm({ color: variant === 'follower' ? 0xf59e0b : 0xdfe5ec, variant, clamps: true });
    rig.setJoints({ pan: 0, a1: 0, a2: 0, a3: 0, roll: 0, grip: 0.55 });
    rig.root.updateMatrixWorld(true);
    const partsRoot = new THREE.Group();
    scene.add(partsRoot);

    interface Item {
      id: string;
      group: THREE.Group;
      base: THREE.Vector3;
      center0: THREE.Vector3;
      meshes: THREE.Mesh[];
      transparent: boolean;
    }
    const items: Item[] = [];
    for (const p of PARTS) {
      const g = rig.parts[p.id];
      if (!g) continue;
      partsRoot.attach(g);
      const meshes: THREE.Mesh[] = [];
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.material = (m.material as THREE.Material).clone();
          meshes.push(m);
        }
      });
      const center0 = new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3());
      items.push({ id: p.id, group: g, base: g.position.clone(), center0, meshes, transparent: false });
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(items.length * 6), 3));
    const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.5 }));
    lines.frustumCulled = false;
    scene.add(lines);

    // ----- fit -----
    const dir0 = new THREE.Vector3(0.1, 0.3, 1).normalize();
    let fitDist = 120;
    const fit = () => {
      const w = el.clientWidth || 800;
      const h = el.clientHeight || 500;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const t = Math.tan((camera.fov * Math.PI) / 360);
      const distW = 56 / (t * camera.aspect);
      const distH = 34 / t;
      fitDist = Math.max(distW, distH) + 12;
    };
    fit();
    camera.position.copy(CENTER).addScaledVector(dir0, fitDist);
    let initialised = true;
    const ro = new ResizeObserver(() => {
      const before = fitDist;
      fit();
      if (initialised) {
        const off = camera.position.clone().sub(controls.target);
        off.multiplyScalar(fitDist / before);
        camera.position.copy(controls.target).add(off);
      }
    });
    ro.observe(el);

    api.current = {
      resetView: () => {
        controls.target.copy(CENTER);
        camera.position.copy(CENTER).addScaledVector(dir0, fitDist);
        L.focusFrames = 0;
      },
    };

    // ----- picking -----
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (e: PointerEvent): string | null => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(partsRoot.children, true);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          if (o.userData.partId) return o.userData.partId as string;
          o = o.parent;
        }
      }
      return null;
    };
    let downX = 0;
    let downY = 0;
    const onMove = (e: PointerEvent) => {
      if (e.buttons) return;
      const id = pick(e);
      renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
      setHover((h) => (h === id ? h : id));
    };
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 5) {
        const id = pick(e);
        if (id) setSelected(id);
      }
    };
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    // ----- loop -----
    const clock = new THREE.Clock();
    let raf = 0;
    const tmp = new THREE.Vector3();
    const applyStyles = () => {
      for (const it of items) {
        const isSel = L.selected === it.id;
        const isHover = L.hover === it.id;
        const dim = L.focus && L.selected && !isSel;
        const op = dim ? 0.22 : 1;
        const tr = op < 1;
        for (const m of it.meshes) {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (isSel) {
            mat.emissive.setHex(0xff7a00);
            mat.emissiveIntensity = 0.55;
          } else if (isHover) {
            mat.emissive.setHex(0x3b82f6);
            mat.emissiveIntensity = 0.45;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
          mat.opacity = op;
          if (mat.transparent !== tr) {
            mat.transparent = tr;
            mat.depthWrite = !tr;
            mat.needsUpdate = true;
          }
        }
        it.transparent = tr;
      }
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      L.explode += (L.target - L.explode) * (1 - Math.exp(-dt * 5));
      const pos = lineGeo.getAttribute('position') as THREE.BufferAttribute;
      items.forEach((it, i) => {
        const d = PART_BY_ID[it.id].explode;
        it.group.position.set(it.base.x + d[0] * L.explode, it.base.y + d[1] * L.explode, it.base.z + d[2] * L.explode);
        pos.setXYZ(i * 2, it.center0.x, it.center0.y, it.center0.z);
        pos.setXYZ(i * 2 + 1, it.center0.x + d[0] * L.explode, it.center0.y + d[1] * L.explode, it.center0.z + d[2] * L.explode);
      });
      pos.needsUpdate = true;

      if (L.dirty) {
        applyStyles();
        L.dirty = false;
      }

      if (L.focusFrames > 0 && L.selected) {
        L.focusFrames--;
        const it = items.find((i) => i.id === L.selected);
        if (it) {
          const d = PART_BY_ID[it.id].explode;
          const goal = it.center0.clone().add(tmp.set(d[0] * L.target, d[1] * L.target, d[2] * L.target));
          const step = goal.sub(controls.target).multiplyScalar(0.1);
          controls.target.add(step);
          camera.position.add(step);
          const off = camera.position.clone().sub(controls.target);
          const want = Math.min(fitDist, 70);
          off.setLength(off.length() + (want - off.length()) * 0.06);
          camera.position.copy(controls.target).add(off);
        }
      }

      controls.autoRotate = L.spin;
      controls.update();
      renderer.render(scene, camera);

      // markers
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      for (const it of items) {
        const mk = markerRefs.current[it.id];
        if (!mk) continue;
        const d = PART_BY_ID[it.id].explode;
        tmp.set(it.center0.x + d[0] * L.explode, it.center0.y + d[1] * L.explode, it.center0.z + d[2] * L.explode).project(camera);
        const vis = L.labels && tmp.z < 1 && tmp.z > -1;
        mk.style.opacity = vis ? '1' : '0';
        mk.style.pointerEvents = vis ? 'auto' : 'none';
        mk.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px) translate(-50%, -50%)`;
      }
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      initialised = false;
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      renderer.dispose();
      pmrem.dispose();
      el.removeChild(renderer.domElement);
      api.current = null;
    };
  }, [variant]);

  const info = selected ? PART_BY_ID[selected] : null;
  const specs = useMemo(() => {
    if (!info) return [];
    if (variant === 'leader' && info.leaderSpecs) return [...info.specs.filter(([k]) => !k.startsWith('Follower')), ...info.leaderSpecs];
    return info.specs;
  }, [info, variant]);

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 pb-10 pt-6 lg:flex-row">
      {/* canvas */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Exploded view</h2>
            <p className="text-sm text-slate-400">Drag to orbit · scroll to zoom · click any part or number to learn what it does.</p>
          </div>
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
            {(['follower', 'leader'] as Variant[]).map((v) => (
              <button
                key={v}
                onClick={() => setVariant(v)}
                className={`rounded-lg px-3 py-1.5 font-medium capitalize transition ${variant === v ? 'bg-amber-400 text-slate-900' : 'text-slate-300 hover:text-white'}`}
              >
                {v} arm
              </button>
            ))}
          </div>
        </div>

        <div className="relative h-[62vh] min-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-black">
          <div ref={mount} className="absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {PARTS.map((p) => (
              <button
                key={p.id}
                ref={(r) => {
                  markerRefs.current[p.id] = r;
                }}
                onClick={() => setSelected(p.id)}
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover(null)}
                className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold shadow-lg transition-colors ${
                  selected === p.id
                    ? 'border-amber-200 bg-amber-400 text-slate-900'
                    : 'border-white/40 bg-slate-900/80 text-white hover:bg-sky-500'
                }`}
                style={{ opacity: 0 }}
              >
                {p.num}
              </button>
            ))}
          </div>

          {/* controls overlay */}
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur">
            <div className="flex min-w-[220px] flex-1 items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Assembled</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explode}
                onChange={(e) => setExplode(parseFloat(e.target.value))}
                className="h-1.5 w-full flex-1 cursor-pointer accent-amber-400"
              />
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Exploded</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Toggle on={focus} onClick={() => setFocus(!focus)} label="Focus mode" />
              <Toggle on={labels} onClick={() => setLabels(!labels)} label="Numbers" />
              <Toggle on={spin} onClick={() => setSpin(!spin)} label="Auto-rotate" />
              <button onClick={() => api.current?.resetView()} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-medium text-slate-200 hover:bg-white/10">
                Reset view
              </button>
            </div>
          </div>
        </div>

        {/* quick chain explainer */}
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniCard title="6 joints, 6 servos" body="Pan · Lift · Elbow · Wrist flex · Wrist roll · Gripper. Five give the arm its pose; the sixth is the claw." />
          <MiniCard title="One shared bus" body="All motors daisy-chain on a single 3-wire cable. Each has its own ID (1–6) so one USB port controls the whole arm." />
          <MiniCard title="Leader ↔ Follower" body="The leader has a handle and lighter gearing so you can move it by hand. The follower copies its joint angles in real time." />
        </div>
      </div>

      {/* sidebar */}
      <aside className="w-full shrink-0 lg:w-[400px]">
        <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto lg:pr-1">
          {info && (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-slate-900">{info.num}</div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-tight text-white">{variant === 'leader' && info.leaderName ? info.leaderName : info.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full px-2 py-0.5 font-medium" style={{ background: TYPE_META[info.type].color + '26', color: TYPE_META[info.type].color }}>
                      {TYPE_META[info.type].label}
                    </span>
                    <span className="text-slate-400">{info.joint}</span>
                    <span className="text-slate-500">· qty {info.qty}</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-100">{info.blurb}</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
                {info.details.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.03] text-xs">
                {specs.map(([k, val]) => (
                  <div key={k} className="flex justify-between gap-4 px-3 py-2">
                    <dt className="text-slate-400">{k}</dt>
                    <dd className="text-right font-medium text-slate-200">{val}</dd>
                  </div>
                ))}
              </dl>
              {info.tip && (
                <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-100">
                  <span className="font-semibold">Hackathon tip · </span>
                  {info.tip}
                </div>
              )}
              {info.buildStep !== undefined && (
                <button onClick={() => onGoBuild(info.buildStep!)} className="mt-3 text-xs font-medium text-sky-300 hover:text-sky-200">
                  See how it is assembled →
                </button>
              )}
            </div>
          )}

          {variant === 'leader' && (
            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 text-xs text-slate-300">
              <div className="mb-2 font-semibold text-sky-200">Leader arm motor gearing</div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1">
                {LEADER_MOTORS.map((m) => (
                  <div key={m.id} className="contents">
                    <span>{m.axis}</span>
                    <span className="text-slate-500">ID {m.id}</span>
                    <span className="font-mono text-sky-200">{m.ratio}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-[320px] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/60 p-2">
            {PARTS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover(null)}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition ${selected === p.id ? 'bg-amber-400/15 text-white' : 'text-slate-300 hover:bg-white/5'}`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${selected === p.id ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-slate-200'}`}>{p.num}</span>
                <span className="min-w-0 flex-1 truncate">{variant === 'leader' && p.leaderName ? p.leaderName : p.name}</span>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TYPE_META[p.type].color }} />
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 font-medium transition ${on ? 'border-amber-400/50 bg-amber-400/15 text-amber-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
    >
      {label}
    </button>
  );
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}
