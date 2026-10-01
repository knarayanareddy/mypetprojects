import * as THREE from 'three';
import { RobotModel, Stage, REST, clonePose, solveIK, fkLocal, D2R, clamp, type Pose, type Variant } from '../robot/model';
import { type Policy, predictSuccess, type Demand } from './policies';

export type Vec3 = [number, number, number];
export type LogKind = 'info' | 'ok' | 'warn' | 'err' | 'plan' | 'sys';

export interface EntDef {
  id: string;
  kind: 'box' | 'cyl' | 'sph' | 'bin' | 'pad';
  x: number;
  z: number;
  y?: number;
  w?: number;
  d?: number;
  h?: number;
  r?: number;
  color: string;
  movable?: boolean;
  support?: boolean;
  yaw?: number;
  label?: string;
  tol?: number;
  emissive?: boolean;
  orient?: 'full' | 'yaw';
  floor?: number;
  taper?: number;
  data?: Record<string, any>;
}

export type Step =
  | { t: 'move'; p: Vec3; pitch?: number; roll?: number; speed?: number; dur?: number; ink?: string; noerr?: boolean; grip?: number; lin?: boolean }
  | { t: 'grip'; to: number; dur?: number }
  | { t: 'wait'; s: number }
  | { t: 'sync'; id: string }
  | { t: 'do'; fn: (sim: Sim, arm: Arm) => void; label?: string }
  | { t: 'say'; msg: string; kind?: LogKind }
  | { t: 'pose'; p: Partial<Pose>; dur?: number }
  | { t: 'pick'; id: string; side?: boolean; hover?: number; tries?: number; noThink?: boolean }
  | { t: 'place'; x: number; z: number; y?: number; hover?: number; yaw?: number }
  | { t: 'think' }
  | { t: 'err' }
  | { t: 'grab'; id: string }
  | { t: 'verify'; step: Extract<Step, { t: 'pick' }> }
  | { t: 'release' };

export interface ArmCfg { name: string; x: number; z: number; yaw: number; variant?: Variant; color?: string }
export interface Report { success: boolean; score: number; max: number; msg: string; time: number; grasps: number; misses: number; slips: number; retries: number }
export interface Built {
  ents: EntDef[];
  arms?: ArmCfg[];
  steps: Step[][];
  check: (sim: Sim) => { score: number; max: number; msg: string };
  decal?: (ctx: CanvasRenderingContext2D, X: (x: number) => number, Z: (z: number) => number, k: number) => void;
  dark?: boolean;
  tick?: (sim: Sim, dt: number) => void;
}

export const DEFAULT_ARMS: ArmCfg[] = [
  { name: 'Arm A', x: -15, z: 0, yaw: 0, color: '#ff7a1a' },
  { name: 'Arm B', x: 15, z: 0, yaw: Math.PI, color: '#38bdf8' },
];

/* ------------------------------------------------------------------ */
export class Ent {
  g = new THREE.Group();
  tiltG = new THREE.Group();
  mesh: THREE.Object3D;
  fill?: THREE.Mesh;
  x: number; y: number; z: number; yaw: number;
  tilt = 0; tiltTarget = 0; vy = 0;
  held: Arm | null = null;
  slipAt = -1;
  w: number; h: number; d: number; r: number;
  kind: EntDef['kind'];
  movable: boolean; support: boolean;
  data: Record<string, any>;
  color: string;
  constructor(public def: EntDef) {
    this.kind = def.kind;
    this.r = def.r ?? 0;
    this.w = def.w ?? (def.kind === 'box' ? 2 : this.r * 2);
    this.d = def.d ?? (def.kind === 'box' ? 2 : this.r * 2);
    this.h = def.h ?? (def.kind === 'pad' ? 0.06 : def.kind === 'sph' ? this.r * 2 : 2);
    this.x = def.x; this.z = def.z;
    this.y = def.y ?? this.h / 2;
    this.yaw = def.yaw ?? 0;
    this.movable = !!def.movable;
    this.support = def.support ?? (this.movable || def.kind === 'bin');
    this.data = { ...(def.data ?? {}) };
    this.color = def.color;
    this.mesh = makeMesh(this);
    const px = def.kind === 'box' ? this.w / 2 : 0;
    this.tiltG.position.set(px, -this.h / 2, 0);
    this.mesh.position.set(-px, this.h / 2, 0);
    this.tiltG.add(this.mesh);
    this.g.add(this.tiltG);
    if (def.data?.receiver) {
      this.fill = new THREE.Mesh(new THREE.CylinderGeometry(this.r * 0.82, this.r * 0.82, 1, 20), new THREE.MeshStandardMaterial({ color: def.data.fillColor ?? '#60a5fa', roughness: 0.2, transparent: true, opacity: 0.85 }));
      this.fill.scale.y = 0.001;
      this.mesh.add(this.fill);
    }
    if (def.label) {
      const sp = labelSprite(def.label);
      sp.position.set(0, this.h / 2 + 2.2, 0);
      this.g.add(sp);
    }
    this.sync();
  }
  sync() {
    this.g.position.set(this.x, this.y, this.z);
    if (!this.held || this.def.orient !== 'full') this.g.rotation.set(0, this.yaw, 0);
    this.tiltG.rotation.z = -this.tilt;
  }
  setColor(c: string) {
    this.color = c;
    this.mesh.traverse((o) => {
      const mm = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!mm || (o as THREE.Mesh) === this.fill) return;
      (Array.isArray(mm) ? mm : [mm]).forEach((m) => (m as THREE.MeshStandardMaterial).color?.set(c));
    });
  }
}

function labelSprite(text: string) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgba(8,12,20,0.72)';
  x.beginPath(); x.roundRect(4, 8, 248, 48, 12); x.fill();
  x.fillStyle = '#e2e8f0'; x.font = 'bold 28px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 33);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.set(9, 2.25, 1);
  sp.renderOrder = 10;
  return sp;
}

function makeMesh(e: Ent): THREE.Object3D {
  const def = e.def;
  const mat = (c = def.color) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.05, emissive: def.emissive ? c : '#000000', emissiveIntensity: def.emissive ? 0.8 : 0 });
  const sh = (m: THREE.Mesh) => { m.castShadow = def.kind !== 'pad'; m.receiveShadow = true; return m; };
  if (def.kind === 'box') {
    const geo = new THREE.BoxGeometry(e.w, e.h, e.d);
    if (def.data?.text) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const cx = cv.getContext('2d')!;
      cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, 64, 64);
      cx.fillStyle = '#0f172a'; cx.font = 'bold 44px system-ui'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(String(def.data.text), 32, 34);
      const top = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), color: def.color, roughness: 0.5 });
      const side = mat();
      return sh(new THREE.Mesh(geo, [side, side, top, side, side, side]));
    }
    return sh(new THREE.Mesh(geo, mat()));
  }
  if (def.kind === 'cyl') return sh(new THREE.Mesh(new THREE.CylinderGeometry(e.r * (def.taper ?? 1), e.r, e.h, 28), mat()));
  if (def.kind === 'sph') return sh(new THREE.Mesh(new THREE.SphereGeometry(e.r, 16, 12), mat()));
  if (def.kind === 'pad') {
    const geo = e.w && def.w ? new THREE.PlaneGeometry(e.w, e.d) : new THREE.CircleGeometry(e.r, 40);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.55 }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0;
    return m;
  }
  const g = new THREE.Group();
  const t = 0.5;
  const floor = sh(new THREE.Mesh(new THREE.BoxGeometry(e.w, 0.6, e.d), mat()));
  floor.position.y = -e.h / 2 + 0.3;
  g.add(floor);
  const wall = (w: number, d: number, x: number, z: number) => { const m = sh(new THREE.Mesh(new THREE.BoxGeometry(w, e.h, d), mat())); m.position.set(x, 0, z); g.add(m); };
  wall(e.w, t, 0, e.d / 2 - t / 2); wall(e.w, t, 0, -e.d / 2 + t / 2); wall(t, e.d, e.w / 2 - t / 2, 0); wall(t, e.d, -e.w / 2 + t / 2, 0);
  return g;
}

/* ------------------------------------------------------------------ */
export class Arm {
  model: RobotModel;
  actual: Pose = clonePose(REST);
  cmd: Pose = clonePose(REST);
  tip: Vec3 = [0, 10, 0];
  pitch = -60 * D2R; roll = 0; grip = 0;
  mode: 'ik' | 'joint' = 'joint';
  jointCmd: Pose = clonePose(REST);
  queue: Step[] = [];
  cur: Step | null = null;
  ctx: any = {};
  t = 0;
  held: Ent | null = null;
  err: [number, number] = [0, 0];
  done = true;
  syncId: string | null = null;
  syncReleased = false;
  label = 'idle';
  ph = [0, 1, 2, 3, 4, 5].map(() => Math.random() * 6.28);
  lastInk: Vec3 | null = null;
  mirror?: Arm;
  direct?: { x: number; y: number; z: number; pitch: number; roll: number; grip: number };
  auto = false;
  lastWarn = -99;
  constructor(public cfg: ArmCfg) {
    this.model = new RobotModel(cfg.variant ?? 'follower', cfg.color);
    this.model.root.position.set(cfg.x, 0, cfg.z);
    this.model.root.rotation.y = cfg.yaw;
    this.model.setPose(REST);
  }
}

/* ------------------------------------------------------------------ */
export class Sim {
  stage: Stage;
  arms: Arm[] = [];
  ents = new Map<string, Ent>();
  built: Built | null = null;
  policy!: Policy;
  demand: Demand = {};
  opts = { demos: 50, foresight: 0 };
  timeScale = 1;
  running = false;
  finished = false;
  time = 0;
  q = 1;
  sigma = 0;
  stats = { grasps: 0, misses: 0, slips: 0, retries: 0 };
  onLog: (m: string, k: LogKind) => void = () => {};
  onFinish: (r: Report) => void = () => {};
  onHud: (h: { arms: string[]; time: number; score: string; running: boolean; finished: boolean }) => void = () => {};
  private sceneRoot = new THREE.Group();
  private ink = new Map<string, { pts: THREE.Points; n: number; arr: Float32Array }>();
  private parts: THREE.Points;
  private pPos = new Float32Array(900 * 3);
  private pCol = new Float32Array(900 * 3);
  private pVel = new Float32Array(900 * 3);
  private pLife = new Float32Array(900);
  private pN = 0;
  private audio: AudioContext | null = null;
  private hudT = 0;
  private barriers = new Map<string, Set<Arm>>();
  private pourAcc = 0;
  tableMat!: THREE.MeshStandardMaterial;

  constructor(el: HTMLElement) {
    this.stage = new Stage(el, { bg: '#0a0e16' });
    this.stage.scene.add(this.sceneRoot);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    pg.setDrawRange(0, 0);
    this.parts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.55, vertexColors: true, sizeAttenuation: true }));
    this.parts.frustumCulled = false;
    this.stage.scene.add(this.parts);
    this.stage.onFrame = (dt) => this.update(dt);
    this.setView('iso');
  }

  setView(v: 'iso' | 'top' | 'front' | 'side') {
    const c = this.stage.camera, t = this.stage.controls.target;
    t.set(0, 3, 0);
    if (v === 'iso') c.position.set(0, 58, 78);
    if (v === 'top') c.position.set(0.01, 100, 0.01);
    if (v === 'front') c.position.set(0, 24, 90);
    if (v === 'side') c.position.set(88, 30, 10);
    this.stage.controls.update();
  }

  log(m: string, k: LogKind = 'info') { this.onLog(`[${this.time.toFixed(1)}s] ${m}`, k); }

  /* ---------------------------- scene building --------------------- */
  load(built: Built, policy: Policy, demand: Demand, opts: { demos: number; foresight: number }) {
    this.clear();
    this.built = built;
    this.policy = policy;
    this.demand = demand;
    this.opts = { ...opts };
    this.finished = false;
    this.running = false;
    this.time = 0;
    this.stats = { grasps: 0, misses: 0, slips: 0, retries: 0 };
    const sc = this.stage.scene;
    sc.background = new THREE.Color(built.dark ? '#02040a' : '#0a0e16');
    (sc.getObjectByName('hemi') as THREE.HemisphereLight).intensity = built.dark ? 0.12 : 0.85;
    (sc.getObjectByName('sun') as THREE.DirectionalLight).intensity = built.dark ? 0.25 : 1.5;

    // table + decal
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 640;
    const cx = cv.getContext('2d')!;
    const k = 16;
    cx.fillStyle = built.dark ? '#0a0d14' : '#243044';
    cx.fillRect(0, 0, 1024, 640);
    cx.strokeStyle = built.dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)';
    cx.lineWidth = 1;
    for (let i = 0; i <= 64; i += 4) { cx.beginPath(); cx.moveTo(i * k, 0); cx.lineTo(i * k, 640); cx.stroke(); }
    for (let j = 0; j <= 40; j += 4) { cx.beginPath(); cx.moveTo(0, j * k); cx.lineTo(1024, j * k); cx.stroke(); }
    built.decal?.(cx, (x) => (x + 32) * k, (z) => (z + 20) * k, k);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    this.tableMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
    const top = new THREE.Mesh(new THREE.PlaneGeometry(64, 40), this.tableMat);
    top.rotation.x = -Math.PI / 2;
    top.receiveShadow = true;
    this.sceneRoot.add(top);
    const body = new THREE.Mesh(new THREE.BoxGeometry(64.4, 3, 40.4), new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.9 }));
    body.position.y = -1.55;
    this.sceneRoot.add(body);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: built.dark ? '#02030a' : '#0d121c', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.1;
    ground.receiveShadow = true;
    this.sceneRoot.add(ground);

    for (const cfg of built.arms ?? DEFAULT_ARMS) {
      const a = new Arm(cfg);
      this.arms.push(a);
      this.sceneRoot.add(a.model.root);
    }
    for (const d of built.ents) {
      const e = new Ent(d);
      this.ents.set(d.id, e);
      this.sceneRoot.add(e.g);
    }
    // success model
    const nPicks = built.steps.flat().filter((s) => s.t === 'pick').length;
    const p = predictSuccess(policy, demand, opts);
    this.q = clamp(Math.pow(p, 1 / Math.max(1, nPicks)), 0.02, 0.999);
    const dataF = policy.zeroShot + (1 - policy.zeroShot) * (1 - Math.exp(-opts.demos / policy.dataNeed));
    this.sigma =
      policy.sigmaCm * (1 + 1.5 * (demand.generalization ?? 0) * (1 - policy.skills.generalization)) * (1 + 0.6 * (demand.precision ?? 0)) * (1 + (1 - dataF) * 1.5) * (1 - 0.4 * opts.foresight);
    built.steps.forEach((s, i) => {
      if (!this.arms[i]) return;
      this.arms[i].queue = s.map((x) => ({ ...x } as Step));
      this.arms[i].done = s.length === 0;
    });
    this.log(`Loaded with ${policy.name}. Predicted task success ≈ ${(p * 100).toFixed(0)} % · σ position ≈ ${(this.sigma * 10).toFixed(1)} mm · latency ${policy.latencyMs} ms`, 'sys');
  }

  loadFree(arms: ArmCfg[], ents: EntDef[], policy: Policy) {
    const built: Built = { ents, arms, steps: arms.map(() => []), check: () => ({ score: 0, max: 0, msg: '' }) };
    this.load(built, policy, {}, { demos: 50, foresight: 0 });
    this.arms.forEach((a) => (a.done = true));
    this.running = true;
  }

  clear() {
    this.sceneRoot.clear();
    this.arms = [];
    this.ents.clear();
    this.ink.forEach((v) => this.stage.scene.remove(v.pts));
    this.ink.clear();
    this.pN = 0;
    this.barriers.clear();
  }

  dispose() {
    this.stage.dispose();
    this.audio?.close();
  }

  start() {
    if (this.finished) return;
    this.running = true;
    this.log('▶ Run started', 'sys');
  }
  pause() { this.running = false; }

  /* ---------------------------- helpers ---------------------------- */
  ent(id: string) { return this.ents.get(id); }
  spawn(d: EntDef) { const e = new Ent(d); this.ents.set(d.id, e); this.sceneRoot.add(e.g); return e; }
  remove(id: string) { const e = this.ents.get(id); if (!e) return; this.sceneRoot.remove(e.g); this.ents.delete(id); }
  gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 0.7; }

  supportAt(x: number, z: number, self?: Ent, bottom = Infinity): number {
    let best = 0;
    this.ents.forEach((e) => {
      if (e === self || e.held || !e.support || !e.movable && e.kind !== 'bin' && !e.support) return;
      let inside = false;
      if (e.kind === 'bin') inside = Math.abs(x - e.x) < e.w / 2 - 0.4 && Math.abs(z - e.z) < e.d / 2 - 0.4;
      else if (e.kind === 'box') inside = Math.abs(x - e.x) <= e.w / 2 + 0.3 && Math.abs(z - e.z) <= e.d / 2 + 0.3;
      else inside = Math.hypot(x - e.x, z - e.z) <= e.r + 0.3;
      if (inside && e.data.holes) for (const h of e.data.holes as { x: number; z: number; r: number }[]) if (Math.hypot(x - h.x, z - h.z) < h.r) inside = false;
      if (!inside) return;
      const top = e.kind === 'bin' ? e.def.floor ?? 0.6 : e.y + e.h / 2;
      if (top <= bottom + 0.9 && top > best) best = top;
    });
    return best;
  }

  toLocal(a: Arm, p: Vec3): Vec3 {
    const dx = p[0] - a.cfg.x, dz = p[2] - a.cfg.z;
    const c = Math.cos(a.cfg.yaw), s = Math.sin(a.cfg.yaw);
    return [dx * c - dz * s, p[1], dx * s + dz * c];
  }
  tcp(a: Arm): Vec3 {
    const v = a.model.tcpWorld();
    return [v.x, v.y, v.z];
  }
  panWorld(a: Arm, x: number, z: number) { return Math.atan2(-(z - a.cfg.z), x - a.cfg.x); }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, color: string, life = 2) {
    if (this.pN >= 900) return;
    const i = this.pN++;
    const c = new THREE.Color(color);
    this.pPos.set([x, y, z], i * 3); this.pVel.set([vx, vy, vz], i * 3); this.pCol.set([c.r, c.g, c.b], i * 3); this.pLife[i] = life;
  }

  inkAdd(color: string, x: number, y: number, z: number, glow = false) {
    let rec = this.ink.get(color);
    if (!rec) {
      const arr = new Float32Array(9000 * 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      g.setDrawRange(0, 0);
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: glow ? 0.9 : 0.5, sizeAttenuation: true, transparent: glow, opacity: glow ? 0.8 : 1, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false }));
      pts.frustumCulled = false;
      this.stage.scene.add(pts);
      rec = { pts, n: 0, arr };
      this.ink.set(color, rec);
    }
    if (rec.n >= 9000) return;
    rec.arr.set([x, y, z], rec.n * 3);
    rec.n++;
    rec.pts.geometry.setDrawRange(0, rec.n);
    (rec.pts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  playNote(freq: number, dur = 0.7) {
    try {
      this.audio ??= new AudioContext();
      const ac = this.audio;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.35, ac.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      o.connect(g).connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur + 0.05);
    } catch { /* audio unavailable */ }
  }

  /* ---------------------------- main loop -------------------------- */
  update(dtRaw: number) {
    const dt = this.running ? dtRaw * this.timeScale : 0;
    if (dt > 0) {
      this.time += dt;
      for (const a of this.arms) this.stepArm(a, dt);
      this.built?.tick?.(this, dt);
    }
    for (const a of this.arms) this.poseArm(a, dt);
    this.physics(dt);
    this.updateParticles(dt);
    if (this.running && !this.finished && this.built && this.built.steps.some((s) => s.length) && this.arms.every((a) => a.done) && [...this.ents.values()].every((e) => e.vy === 0 || !e.movable)) {
      this.finish();
    }
    this.hudT += dtRaw;
    if (this.hudT > 0.15) {
      this.hudT = 0;
      const c = this.built?.check(this);
      this.onHud({ arms: this.arms.map((a) => `${a.cfg.name}: ${a.label}`), time: this.time, score: c && c.max ? `${c.score}/${c.max}` : '', running: this.running, finished: this.finished });
    }
  }

  finish() {
    this.finished = true;
    this.running = false;
    const c = this.built!.check(this);
    const r: Report = { success: c.score >= c.max, score: c.score, max: c.max, msg: c.msg, time: this.time, ...this.stats };
    this.log(`■ Finished – ${c.msg} (${c.score}/${c.max}) in ${this.time.toFixed(1)} s`, r.success ? 'ok' : 'warn');
    this.onFinish(r);
  }

  /* ---------------------------- arm control ------------------------ */
  private poseArm(a: Arm, dt: number) {
    let target: Pose;
    if (a.mirror) target = clonePose(a.mirror.actual);
    else if (a.direct) {
      const d = a.direct;
      target = solveIK(d.x, d.y, d.z, d.pitch, d.roll, d.grip).pose;
    } else if (a.mode === 'ik') {
      const l = this.toLocal(a, a.tip);
      const r = solveIK(l[0], l[1], l[2], a.pitch, a.roll, a.grip);
      target = r.pose;
      if (!r.ok && this.time - a.lastWarn > 4 && this.running) {
        a.lastWarn = this.time;
        this.log(`${a.cfg.name}: target out of reach (${l[0].toFixed(0)}, ${l[2].toFixed(0)}) cm – clamped`, 'warn');
      }
    } else target = clonePose(a.jointCmd);
    a.cmd = target;
    const pol = this.policy;
    const j = (pol?.jitterDeg ?? 0) * D2R * (a.mirror ? 0.4 : 1);
    const tt = this.time;
    const noisy: Pose = {
      pan: target.pan + j * Math.sin(tt * 5.3 + a.ph[0]),
      a1: target.a1 + j * Math.sin(tt * 6.7 + a.ph[1]),
      a2: target.a2 + j * Math.sin(tt * 7.9 + a.ph[2]),
      a3: target.a3 + j * Math.sin(tt * 9.1 + a.ph[3]),
      roll: target.roll + j * Math.sin(tt * 4.1 + a.ph[4]),
      grip: target.grip,
    };
    const lat = a.mirror ? 0.12 : (pol?.latencyMs ?? 50) / 1000;
    const tau = 0.02 + lat * 0.12;
    const k = dt > 0 ? 1 - Math.exp(-dt / tau) : 1;
    const act = a.actual;
    if (dt > 0 || a.mirror || a.direct) {
      (Object.keys(act) as (keyof Pose)[]).forEach((key) => (act[key] += (noisy[key] - act[key]) * (dt > 0 ? k : 0)));
    }
    a.model.setPose(act);
    a.model.root.updateMatrixWorld(true);

    // held object follows TCP
    if (a.held) {
      const e = a.held;
      const t = this.tcp(a);
      e.x = t[0]; e.y = t[1]; e.z = t[2];
      if (e.def.orient === 'full') {
        const q = new THREE.Quaternion();
        a.model.g.roll.getWorldQuaternion(q);
        e.g.quaternion.copy(q);
      } else e.yaw = a.cfg.yaw + act.pan - act.roll;
      if (e.slipAt >= 0 && this.time >= e.slipAt) {
        this.stats.slips++;
        this.log(`${a.cfg.name}: ⚠ ${e.def.id} slipped out of the gripper`, 'warn');
        e.held = null; a.held = null; e.slipAt = -1; e.vy = -0.01;
      }
    }
    if (a.auto) this.autoGrab(a);
  }

  private autoGrab(a: Arm) {
    const g = a.actual.grip;
    if (!a.held && g < 0.2) {
      const t = this.tcp(a);
      let best: Ent | null = null, bd = 99;
      this.ents.forEach((e) => {
        if (!e.movable || e.held) return;
        const d = Math.hypot(e.x - t[0], e.z - t[2]);
        if (d < (e.def.tol ?? 2) + 0.6 && Math.abs(e.y - t[1]) < e.h / 2 + 2 && d < bd) { best = e; bd = d; }
      });
      if (best) { (best as Ent).held = a; a.held = best; (best as Ent).vy = 0; this.log(`${a.cfg.name}: grasped ${(best as Ent).def.id}`, 'ok'); }
    } else if (a.held && g > 0.5) {
      a.held.held = null; a.held.vy = -0.01; this.log(`${a.cfg.name}: released ${a.held.def.id}`, 'info'); a.held = null;
    }
  }

  private physics(dt: number) {
    this.ents.forEach((e) => {
      if (e.held) { e.sync(); return; }
      if (e.movable && dt > 0) {
        const bottom = e.y - e.h / 2;
        const sup = this.supportAt(e.x, e.z, e, bottom);
        if (bottom > sup + 0.02) {
          e.vy -= 300 * dt;
          e.y += e.vy * dt;
          if (e.y - e.h / 2 <= sup) { e.y = sup + e.h / 2; e.vy = 0; }
        } else { e.y = sup + e.h / 2; e.vy = 0; }
        if (e.def.orient === 'full') { e.g.quaternion.setFromEuler(new THREE.Euler(0, e.yaw, 0)); }
      }
      if (Math.abs(e.tilt - e.tiltTarget) > 1e-3 && dt > 0) {
        e.tilt += (e.tiltTarget - e.tilt) * Math.min(1, dt * 4.5);
      }
      if (e.fill) {
        const f = clamp((e.data.fill ?? 0) / (e.data.cap ?? 60), 0, 1);
        const hh = Math.max(0.001, f * e.h * 0.85);
        e.fill.scale.y = hh;
        e.fill.position.y = -e.h / 2 + 0.4 + hh / 2;
      }
      e.sync();
    });
    // pouring
    if (dt > 0) {
      for (const a of this.arms) {
        const e = a.held;
        if (e && e.def.orient === 'full' && (e.data.liquid ?? 0) > 0) {
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(e.g.quaternion);
          if (up.y < 0.5) {
            this.pourAcc += dt * 70;
            while (this.pourAcc >= 1 && e.data.liquid > 0) {
              this.pourAcc -= 1; e.data.liquid -= 1;
              const top = new THREE.Vector3(e.x, e.y, e.z).addScaledVector(up, e.h / 2);
              this.emit(top.x, top.y, top.z, up.x * 7 + this.gauss() * 0.5, Math.min(0, up.y * 7), up.z * 7 + this.gauss() * 0.5, e.data.liquidColor ?? '#60a5fa', 2.5);
            }
          }
        }
      }
    }
  }

  private updateParticles(dt: number) {
    if (dt <= 0 || this.pN === 0) { this.parts.geometry.setDrawRange(0, this.pN); return; }
    let i = 0;
    const receivers = [...this.ents.values()].filter((e) => e.data.receiver);
    while (i < this.pN) {
      const o = i * 3;
      this.pVel[o + 1] -= 260 * dt;
      this.pPos[o] += this.pVel[o] * dt; this.pPos[o + 1] += this.pVel[o + 1] * dt; this.pPos[o + 2] += this.pVel[o + 2] * dt;
      this.pLife[i] -= dt;
      let kill = this.pLife[i] <= 0;
      if (!kill) {
        for (const r of receivers) {
          if (Math.hypot(this.pPos[o] - r.x, this.pPos[o + 2] - r.z) < r.r + 0.4 && this.pPos[o + 1] < r.y + r.h / 2 && this.pPos[o + 1] > r.y - r.h / 2) { r.data.fill = (r.data.fill ?? 0) + 1; kill = true; break; }
        }
      }
      if (!kill && this.pPos[o + 1] < 0.15) { this.pPos[o + 1] = 0.15; this.pVel[o] *= 0.2; this.pVel[o + 1] = 0; this.pVel[o + 2] *= 0.2; this.pLife[i] -= dt * 4; }
      if (kill) {
        const last = --this.pN;
        if (i !== last) {
          this.pPos.copyWithin(o, last * 3, last * 3 + 3); this.pVel.copyWithin(o, last * 3, last * 3 + 3); this.pCol.copyWithin(o, last * 3, last * 3 + 3); this.pLife[i] = this.pLife[last];
        }
      } else i++;
    }
    this.parts.geometry.setDrawRange(0, this.pN);
    (this.parts.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.parts.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  /* ---------------------------- step machine ----------------------- */
  private stepArm(a: Arm, dt: number) {
    for (let guard = 0; guard < 12; guard++) {
      if (!a.cur) {
        a.cur = a.queue.shift() ?? null;
        if (!a.cur) { a.done = true; a.label = a.held ? `idle (holding ${a.held.def.id})` : 'idle'; return; }
        a.done = false;
        this.begin(a, a.cur);
      }
      if (!this.tick(a, a.cur, dt)) return;
      a.cur = null;
    }
  }

  private ensureIK(a: Arm) {
    if (a.mode === 'ik') return;
    const f = fkLocal(a.actual);
    const tcp = this.tcp(a);
    void f;
    a.tip = [tcp[0], tcp[1], tcp[2]];
    a.pitch = a.actual.a3; a.roll = a.actual.roll; a.grip = a.actual.grip;
    a.mode = 'ik';
  }

  private begin(a: Arm, s: Step) {
    a.t = 0;
    const c: any = (a.ctx = {});
    const pol = this.policy;
    switch (s.t) {
      case 'move': {
        this.ensureIK(a);
        const p: Vec3 = [s.p[0] + (s.noerr ? 0 : a.err[0]), s.p[1], s.p[2] + (s.noerr ? 0 : a.err[1])];
        if (Number.isNaN(p[1])) p[1] = this.supportAt(p[0], p[2], a.held ?? undefined) + (a.held ? a.held.h / 2 : 0.4) + 0.12;
        c.from = [...a.tip]; c.to = p; c.p0 = a.pitch; c.p1 = (s.pitch ?? -90) * D2R; c.r0 = a.roll; c.r1 = (s.roll ?? 0) * D2R; c.g0 = a.grip; c.g1 = s.grip;
        const dist = Math.hypot(p[0] - c.from[0], p[1] - c.from[1], p[2] - c.from[2]);
        const sp = (s.speed ?? 14) * pol.speed;
        c.dur = s.dur ?? Math.max(0.22, dist / sp, (Math.abs(c.p1 - c.p0) / (140 * D2R)) / pol.speed, Math.abs(c.r1 - c.r0) / (200 * D2R));
        a.label = s.ink ? 'drawing' : 'moving';
        if (!s.ink) a.lastInk = null;
        break;
      }
      case 'grip': c.g0 = a.mode === 'ik' ? a.grip : a.actual.grip; c.dur = s.dur ?? 0.35; a.label = s.to > 0.5 ? 'opening' : 'closing'; break;
      case 'wait': c.dur = s.s; a.label = 'waiting'; break;
      case 'think': c.dur = pol.think * (1 + this.opts.foresight * 2.2); a.label = this.opts.foresight > 0 ? 'imagining futures…' : 'thinking'; break;
      case 'pose': {
        const j = a.jointCmd;
        Object.assign(j, clonePose(a.actual));
        c.from = clonePose(a.actual);
        c.to = { ...c.from };
        for (const k of Object.keys(s.p) as (keyof Pose)[]) c.to[k] = k === 'grip' ? s.p[k] : (s.p[k] as number) * D2R;
        c.dur = s.dur ?? 0.8; a.mode = 'joint'; a.label = 'posing';
        break;
      }
      case 'sync': a.syncId = s.id; a.syncReleased = false; a.label = `sync:${s.id}`; { const set = this.barriers.get(s.id) ?? new Set<Arm>(); set.add(a); this.barriers.set(s.id, set); } break;
      default: break;
    }
  }

  private tick(a: Arm, s: Step, dt: number): boolean {
    const c = a.ctx;
    const pol = this.policy;
    switch (s.t) {
      case 'move': {
        a.t += dt;
        const u = clamp(a.t / c.dur, 0, 1);
        const e = s.lin ? u : u * u * (3 - 2 * u);
        a.tip = [c.from[0] + (c.to[0] - c.from[0]) * e, c.from[1] + (c.to[1] - c.from[1]) * e, c.from[2] + (c.to[2] - c.from[2]) * e];
        a.pitch = c.p0 + (c.p1 - c.p0) * e;
        a.roll = c.r0 + (c.r1 - c.r0) * e;
        if (c.g1 !== undefined) a.grip = c.g0 + (c.g1 - c.g0) * e;
        if (s.ink && a.held && a.held.data.tipDrop !== undefined) {
          const p: Vec3 = [a.tip[0], Math.max(0.1, a.tip[1] - a.held.data.tipDrop), a.tip[2]];
          const glow = !!this.built?.dark;
          if (a.lastInk) {
            const d = Math.hypot(p[0] - a.lastInk[0], p[1] - a.lastInk[1], p[2] - a.lastInk[2]);
            const n = Math.floor(d / 0.18);
            for (let i = 1; i <= n; i++) this.inkAdd(s.ink, a.lastInk[0] + ((p[0] - a.lastInk[0]) * i) / n, a.lastInk[1] + ((p[1] - a.lastInk[1]) * i) / n, a.lastInk[2] + ((p[2] - a.lastInk[2]) * i) / n, glow);
            if (n > 0) a.lastInk = p;
          } else { this.inkAdd(s.ink, p[0], p[1], p[2], glow); a.lastInk = p; }
        }
        return u >= 1;
      }
      case 'grip': {
        a.t += dt;
        const u = clamp(a.t / c.dur, 0, 1);
        const v = c.g0 + (s.to - c.g0) * u;
        if (a.mode === 'ik') a.grip = v; else a.jointCmd.grip = v;
        return u >= 1;
      }
      case 'wait': case 'think': a.t += dt; return a.t >= c.dur;
      case 'pose': {
        a.t += dt;
        const u = clamp(a.t / c.dur, 0, 1);
        const e = u * u * (3 - 2 * u);
        (Object.keys(c.from) as (keyof Pose)[]).forEach((k) => (a.jointCmd[k] = c.from[k] + (c.to[k] - c.from[k]) * e));
        return u >= 1;
      }
      case 'sync': {
        const set = this.barriers.get(s.id)!;
        const waiting = this.arms.filter((o) => !o.done || o.syncId === s.id);
        if (a.syncReleased) { a.syncId = null; a.syncReleased = false; return true; }
        const active = this.arms.filter((o) => !(o.done && !o.cur) && o.queue.length + (o.cur ? 1 : 0) > 0);
        void waiting;
        if (active.every((o) => o.syncId === s.id)) {
          active.forEach((o) => { o.syncReleased = true; });
          set.clear();
          a.syncId = null; a.syncReleased = false;
          return true;
        }
        return false;
      }
      case 'say': this.log(`${a.cfg.name}: ${s.msg}`, s.kind ?? 'plan'); return true;
      case 'do': a.label = s.label ?? 'action'; s.fn(this, a); return true;
      case 'err': {
        const lim = 2.5 * this.sigma;
        a.err = [clamp(this.gauss() * this.sigma, -lim, lim), clamp(this.gauss() * this.sigma, -lim, lim)];
        return true;
      }
      case 'grab': return this.grab(a, s.id);
      case 'verify': {
        const st = s.step;
        if (a.held && a.held.def.id === st.id) return true;
        const tries = st.tries ?? 0;
        if (tries < pol.retries) {
          this.stats.retries++;
          this.log(`${a.cfg.name}: lost ${st.id} – retrying (${tries + 1}/${pol.retries})`, 'warn');
          a.queue.unshift({ ...st, tries: tries + 1, noThink: true });
        } else {
          this.log(`${a.cfg.name}: ✗ gave up on ${st.id}`, 'err');
        }
        return true;
      }
      case 'release': {
        if (a.t === 0) { a.ctx.g0 = a.grip; }
        a.t += dt;
        const u = clamp(a.t / 0.25, 0, 1);
        a.grip = a.ctx.g0 + (1 - a.ctx.g0) * u;
        if (u >= 1) {
          if (a.held) { const e = a.held; e.held = null; e.slipAt = -1; e.vy = -0.01; a.held = null; this.log(`${a.cfg.name}: released ${e.def.id}`, 'info'); }
          return true;
        }
        return false;
      }
      case 'pick': a.queue.unshift(...this.expandPick(a, s)); return true;
      case 'place': a.queue.unshift(...this.expandPlace(a, s)); return true;
      default: return true;
    }
  }

  private grab(a: Arm, id: string): boolean {
    const e = this.ents.get(id);
    if (!e) return true;
    const t = this.tcp(a);
    const d = Math.hypot(t[0] - e.x, t[2] - e.z);
    const tol = e.def.tol ?? 1.6;
    if (d <= tol && Math.abs(t[1] - e.y) <= e.h / 2 + 1.4 && !e.held) {
      a.held = e; e.held = a; e.vy = 0;
      this.stats.grasps++;
      if (Math.random() > this.q) {
        e.slipAt = this.time + 0.2 + Math.random() * 0.35;
        this.log(`${a.cfg.name}: grasped ${id} (weak grip…)`, 'info');
      } else this.log(`${a.cfg.name}: grasped ${id}`, 'ok');
    } else {
      this.stats.misses++;
      this.log(`${a.cfg.name}: ✗ missed ${id} by ${(d * 10).toFixed(0)} mm`, 'warn');
      if (a.mode === 'ik') a.grip = 0;
    }
    return true;
  }

  private expandPick(a: Arm, s: Extract<Step, { t: 'pick' }>): Step[] {
    const e = this.ents.get(s.id);
    if (!e) return [{ t: 'say', msg: `cannot find ${s.id}`, kind: 'err' }];
    if (a.held) return [{ t: 'say', msg: `hand already full – skipping ${s.id}`, kind: 'warn' }];
    const hover = s.hover ?? 9;
    const out: Step[] = [];
    if (!s.noThink) { out.push({ t: 'say', msg: `picking ${e.def.label ?? s.id}`, kind: 'plan' }); out.push({ t: 'think' }); }
    out.push({ t: 'err' }, { t: 'grip', to: 1, dur: 0.2 });
    if (s.side) {
      const dx = e.x - a.cfg.x, dz = e.z - a.cfg.z, L = Math.hypot(dx, dz) || 1;
      out.push({ t: 'move', p: [e.x - (dx / L) * 6, e.y, e.z - (dz / L) * 6], pitch: 0 }, { t: 'move', p: [e.x, e.y, e.z], pitch: 0, speed: 7 });
    } else out.push({ t: 'move', p: [e.x, e.y + hover, e.z] }, { t: 'move', p: [e.x, e.y, e.z], speed: 8 });
    const wd = Math.min(e.kind === 'box' ? Math.min(e.w, e.d) : e.r * 2, 4.5);
    out.push({ t: 'grip', to: clamp(wd / 4.6, 0.03, 1), dur: 0.45 }, { t: 'grab', id: s.id });
    if (s.side) out.push({ t: 'move', p: [e.x, e.y + 7, e.z], pitch: 0, speed: 10 });
    else out.push({ t: 'move', p: [e.x, e.y + hover, e.z], speed: 12 });
    out.push({ t: 'verify', step: s });
    return out;
  }

  private expandPlace(a: Arm, s: Extract<Step, { t: 'place' }>): Step[] {
    if (!a.held) return [{ t: 'say', msg: 'nothing in gripper – skipping place', kind: 'warn' }];
    const hover = s.hover ?? 12 + a.held.h;
    let roll = 0;
    if (s.yaw !== undefined) roll = (this.panWorld(a, s.x, s.z) - s.yaw) / D2R;
    const y = s.y ?? NaN;
    return [
      { t: 'think' }, { t: 'err' },
      { t: 'move', p: [s.x, hover, s.z], roll },
      { t: 'move', p: [s.x, y, s.z], roll, speed: 8 },
      { t: 'release' },
      { t: 'move', p: [s.x, hover, s.z], roll, speed: 12 },
    ];
  }
}
