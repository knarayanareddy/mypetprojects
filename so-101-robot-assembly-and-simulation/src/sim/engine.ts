import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildArm, ArmRig } from './arm';
import { ik, jointsToPose, Pose, Joints, V3, clamp, lerp, ease, D2R, R2D, wrapPi } from './kinematics';
import type { Scenario, Prim, PropSpec, FixtureSpec, LiveCtx, Telemetry, SoundSpec, PosePartial, PourSpec, LiveOut, Theme } from './types';

const DEFAULT_BASES: [V3, V3] = [
  [-12, 0, -12],
  [12, 0, -12],
];

const THEMES: Record<Theme, { bg: number; table: number; rough: number }> = {
  lab: { bg: 0x0d1420, table: 0x3a4a60, rough: 0.7 },
  warm: { bg: 0x17120e, table: 0xc7ae86, rough: 0.8 },
  zen: { bg: 0x11171a, table: 0x6f6858, rough: 0.9 },
  stage: { bg: 0x100a1c, table: 0x2a1c44, rough: 0.5 },
  space: { bg: 0x01020a, table: 0x1a2236, rough: 0.35 },
  kitchen: { bg: 0x12171c, table: 0xdfe3e6, rough: 0.5 },
  paper: { bg: 0x141619, table: 0xeeeae0, rough: 0.9 },
};

function homePose(i: number, bases: [V3, V3]): Pose {
  const b = bases[i];
  return { p: [b[0] + (i === 0 ? 7 : -7), 14, b[2] + 9], pitch: -35, roll: 0, grip: 0.5 };
}

function halfHeight(p: Prim) {
  switch (p.shape) {
    case 'box':
      return p.size[1] / 2;
    case 'cyl':
    case 'cone':
      return p.size[1] / 2;
    case 'sphere':
      return p.size[0];
    default:
      return p.size[1];
  }
}

function labelSprite(text: string) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = 'bold 34px system-ui, sans-serif';
  const w = Math.ceil(ctx.measureText(text).width) + 36;
  c.width = w;
  c.height = 64;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(8,12,20,0.72)';
  const r = 18;
  ctx.beginPath();
  ctx.moveTo(r, 4);
  ctx.arcTo(w - 4, 4, w - 4, 60, r);
  ctx.arcTo(w - 4, 60, 4, 60, r);
  ctx.arcTo(4, 60, 4, 4, r);
  ctx.arcTo(4, 4, w - 4, 4, r);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 18, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const h = 2.4;
  sp.scale.set((h * w) / 64, h, 1);
  sp.renderOrder = 10;
  return sp;
}

function buildPrim(p: Prim): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  const s = p.size;
  switch (p.shape) {
    case 'box':
      geo = new THREE.BoxGeometry(s[0], s[1], s[2]);
      break;
    case 'cyl':
      geo = new THREE.CylinderGeometry(s[0], s[0], s[1], 36);
      break;
    case 'sphere':
      geo = new THREE.SphereGeometry(s[0], 28, 18);
      break;
    case 'cone':
      geo = new THREE.ConeGeometry(s[0], s[1], 28);
      break;
    default:
      geo = new THREE.TorusGeometry(s[0], s[1], 12, 40);
      geo.rotateX(Math.PI / 2);
  }
  const op = p.opacity ?? 1;
  const mat = new THREE.MeshStandardMaterial({
    color: p.color,
    roughness: p.rough ?? 0.55,
    metalness: p.metal ?? 0.05,
    emissive: p.emissive ?? 0x000000,
    emissiveIntensity: p.emissive ? 0.8 : 0,
    transparent: op < 1,
    opacity: op,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p.pos);
  if (p.rot) m.rotation.set(p.rot[0] * D2R, p.rot[1] * D2R, p.rot[2] * D2R);
  if (p.scale) m.scale.set(...p.scale);
  m.castShadow = op >= 1;
  m.receiveShadow = true;
  for (const c of p.children ?? []) m.add(buildPrim(c));
  if (p.label) {
    const sp = labelSprite(p.label);
    sp.position.set(0, (halfHeight(p) + 2.4) / (p.scale ? p.scale[1] : 1), 0);
    m.add(sp);
  }
  return m;
}

interface PropState {
  spec: PropSpec;
  obj: THREE.Object3D;
  halfH: number;
  hx: number;
  hz: number;
  round: boolean;
  width: number;
  held: number; // -1 none, 0/1 arm
  vy: number;
  locked: boolean; // kinematic until first grabbed
  settle: THREE.Quaternion | null;
}

interface FixState {
  spec: FixtureSpec;
  obj: THREE.Object3D;
  x: number;
  y: number;
  z: number;
  hx: number;
  hz: number;
  r: number;
  top: number;
  yaw: number;
  isBox: boolean;
  at: THREE.Vector3;
  inside: boolean;
  on: boolean;
  flashT: number;
  last: number;
  press: number;
  baseY: number;
  mats: THREE.MeshStandardMaterial[];
}

interface ArmState {
  rig: ArmRig;
  base: V3;
  cmd: Pose;
  joints: Joints;
  target: Joints;
  reached: boolean;
  holding: PropState | null;
  holdFrac: number;
  direct: boolean;
  tipPos: THREE.Vector3;
  manual: Pose;
}

export interface SimCallbacks {
  onTelemetry: (t: Telemetry) => void;
  onLog: (msg: string) => void;
  onFinish: () => void;
}

interface Particle {
  mesh: THREE.Mesh;
  v: THREE.Vector3;
  life: number;
  floor: number;
}

export class Sim {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.5, 900);
  private controls: OrbitControls;
  private world = new THREE.Group();
  private tableMesh: THREE.Mesh;
  private stars: THREE.Points;
  private arms: ArmState[] = [];
  private props: PropState[] = [];
  private fixtures: FixState[] = [];
  private scenario: Scenario | null = null;
  private ro: ResizeObserver;
  private raf = 0;
  private clock = new THREE.Clock();
  private pmrem: THREE.PMREMGenerator;

  playing = true;
  speed = 1;
  muted = false;
  private manualMode = false;
  private selectedArm = 0;
  private time = 0;
  private episode = 1;
  private finished = false;
  private endHold = 0;
  private triggerCount = 0;
  private lastSay = '';

  // phase runner
  private phaseIdx = 0;
  private phaseT = 0;
  private phaseBegun = false;
  private phaseStart: Pose[] = [];
  private phaseTarget: Pose[] = [];
  private pour: PourSpec | null = null;

  // recording (teleop lab)
  private recording = false;
  private replaying = false;
  private recFrames: { t: number; j: Joints }[] = [];
  private recClock = 0;
  private replayT = 0;
  private history: { t: number; j: Joints }[] = [];

  // visuals
  private trail: THREE.InstancedMesh;
  private trailCount = 0;
  private trailLast: (THREE.Vector3 | null)[] = [null, null];
  private readonly TRAIL_MAX = 18000;
  private particles: Particle[] = [];
  private partAcc = 0;
  private laserLine: THREE.Line;
  private laserDot: THREE.Mesh;
  private laserPos: V3 | null = null;
  private cursor: THREE.Mesh;
  private markers: THREE.Mesh[] = [];
  private pointer: V3 | null = null;
  private audio: AudioContext | null = null;
  private teleAcc = 0;
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private dispos: (() => void)[] = [];

  constructor(private el: HTMLElement, private cb: SimCallbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    el.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x223044, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(25, 70, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -60;
    sc.right = 60;
    sc.top = 50;
    sc.bottom = -50;
    sc.near = 10;
    sc.far = 200;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.05;
    this.scene.add(sun);

    this.tableMesh = new THREE.Mesh(
      new THREE.BoxGeometry(110, 1.6, 64),
      new THREE.MeshStandardMaterial({ color: 0x3a4a60, roughness: 0.7, metalness: 0.05 }),
    );
    this.tableMesh.position.set(0, -0.8, 6);
    this.tableMesh.receiveShadow = true;
    this.scene.add(this.tableMesh);

    // stars
    const sp = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const r = 220 + Math.random() * 60;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 1.6 - 0.6);
      sp[i * 3] = r * Math.sin(ph) * Math.cos(th);
      sp[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.8 + 10;
      sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 40;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false }));
    this.stars.visible = false;
    this.scene.add(this.stars);

    this.scene.add(this.world);

    // arms
    const colors = [0xf59e0b, 0x22d3ee];
    for (let i = 0; i < 2; i++) {
      const rig = buildArm({ color: colors[i], variant: 'follower', controller: true });
      rig.root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this.scene.add(rig.root);
      const pose = homePose(i, DEFAULT_BASES);
      this.arms.push({
        rig,
        base: DEFAULT_BASES[i],
        cmd: pose,
        joints: { pan: 0, a1: 1, a2: 0, a3: 0, roll: 0, grip: 0.5 },
        target: { pan: 0, a1: 1, a2: 0, a3: 0, roll: 0, grip: 0.5 },
        reached: true,
        holding: null,
        holdFrac: 0,
        direct: false,
        tipPos: new THREE.Vector3(),
        manual: { ...pose, p: [...pose.p] as V3 },
      });
      const mk = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 16, 12),
        new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: 0.7, depthTest: false }),
      );
      mk.visible = false;
      mk.renderOrder = 20;
      this.scene.add(mk);
      this.markers.push(mk);
    }

    // trail
    const tg = new THREE.CircleGeometry(1, 10);
    tg.rotateX(-Math.PI / 2);
    this.trail = new THREE.InstancedMesh(tg, new THREE.MeshBasicMaterial({ color: 0xffffff }), this.TRAIL_MAX);
    this.trail.count = 0;
    this.trail.frustumCulled = false;
    this.trail.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.TRAIL_MAX * 3), 3);
    this.scene.add(this.trail);

    // particles
    const pg = new THREE.SphereGeometry(0.28, 8, 6);
    for (let i = 0; i < 110; i++) {
      const m = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ color: 0x4aa3ff, roughness: 0.2, transparent: true, opacity: 0.9 }));
      m.visible = false;
      this.scene.add(m);
      this.particles.push({ mesh: m, v: new THREE.Vector3(), life: 0, floor: 0 });
    }

    // laser
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.laserLine = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.8 }));
    this.laserLine.frustumCulled = false;
    this.laserLine.visible = false;
    this.scene.add(this.laserLine);
    this.laserDot = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    this.laserDot.visible = false;
    this.scene.add(this.laserDot);

    // cursor ring
    this.cursor = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.5, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    this.cursor.visible = false;
    this.scene.add(this.cursor);

    // controls
    this.camera.position.set(0, 40, 60);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 5, 4);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 160;

    const dom = this.renderer.domElement;
    let dx = 0;
    let dy = 0;
    const move = (e: PointerEvent) => this.updatePointer(e);
    const down = (e: PointerEvent) => {
      dx = e.clientX;
      dy = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - dx, e.clientY - dy) < 5) {
        this.updatePointer(e);
        if (this.manualMode && this.pointer && !this.replaying) {
          const a = this.arms[this.selectedArm];
          a.manual.p = [this.pointer[0], Math.max(a.manual.p[1], 1.2), this.pointer[2]];
        }
      }
    };
    const leave = () => {
      this.pointer = null;
    };
    dom.addEventListener('pointermove', move);
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointerleave', leave);
    this.dispos.push(() => {
      dom.removeEventListener('pointerleave', leave);
      dom.removeEventListener('pointermove', move);
      dom.removeEventListener('pointerdown', down);
      dom.removeEventListener('pointerup', up);
    });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.resize();
    this.loop();
  }

  // ---------------------------------------------------------------- public API
  load(s: Scenario, keepEpisode = false) {
    this.scenario = s;
    this.clearWorld();
    const th = THEMES[s.theme ?? 'lab'];
    this.scene.background = new THREE.Color(th.bg);
    this.scene.fog = new THREE.Fog(th.bg, 140, 320);
    const tm = this.tableMesh.material as THREE.MeshStandardMaterial;
    tm.color.setHex(th.table);
    tm.roughness = th.rough;
    this.stars.visible = s.theme === 'space';

    const bases = s.bases ?? DEFAULT_BASES;
    this.arms.forEach((a, i) => {
      if (a.holding) {
        a.holding = null;
      }
      a.base = bases[i];
      a.rig.root.position.set(...bases[i]);
      const hp = homePose(i, bases);
      const h = s.home?.[i];
      a.cmd = { p: (h?.p ?? hp.p).slice() as V3, pitch: h?.pitch ?? hp.pitch, roll: h?.roll ?? hp.roll, grip: h?.grip ?? hp.grip };
      a.manual = { ...a.cmd, p: [...a.cmd.p] as V3 };
      a.direct = false;
      const r = ik(a.base, a.cmd.p, a.cmd.pitch, a.cmd.roll, a.cmd.grip, -Math.PI / 2);
      a.joints = { pan: r.pan, a1: r.a1, a2: r.a2, a3: r.a3, roll: r.roll, grip: r.grip };
      a.target = { ...a.joints };
      a.rig.setJoints(a.joints);
      a.rig.root.updateMatrixWorld(true);
      a.rig.tip.getWorldPosition(a.tipPos);
    });

    for (const p of s.props ?? []) this.addProp(p);
    for (const f of s.fixtures ?? []) this.addFixture(f);

    this.time = 0;
    this.phaseIdx = 0;
    this.phaseT = 0;
    this.phaseBegun = false;
    this.finished = false;
    this.endHold = 0;
    this.pour = null;
    this.lastSay = '';
    this.triggerCount = 0;
    this.trailCount = 0;
    this.trail.count = 0;
    this.trailLast = [null, null];
    this.history = [];
    this.laserPos = null;
    this.laserLine.visible = s.laser !== undefined;
    this.laserDot.visible = s.laser !== undefined;
    if (!keepEpisode) {
      this.episode = 1;
      this.recording = false;
      this.replaying = false;
      this.recFrames = [];
    }
    this.manualMode = s.program.kind === 'manual';
    this.selectedArm = 0;
    this.markers.forEach((m) => (m.visible = this.manualMode));
    this.cursor.visible = false;
    for (const pt of this.particles) pt.mesh.visible = false;
    this.gravity = s.gravity ?? 600;

    const c = s.cam ?? { pos: [0, 40, 60], target: [0, 5, 4] };
    if (!keepEpisode) {
      this.camera.position.set(...c.pos);
      this.controls.target.set(...c.target);
    }
    this.cb.onLog(`Loaded “${s.title}”`);
  }

  private gravity = 600;

  setPlaying(p: boolean) {
    this.playing = p;
    if (p) this.ensureAudio();
  }
  setSpeed(s: number) {
    this.speed = s;
  }
  setMuted(m: boolean) {
    this.muted = m;
  }
  restart() {
    if (this.scenario) {
      const manual = this.manualMode;
      this.load(this.scenario, true);
      this.episode = 1;
      this.manualMode = manual;
    }
  }
  setManual(on: boolean) {
    if (!this.scenario) return;
    if (on) {
      this.manualMode = true;
      this.arms.forEach((a) => (a.manual = { ...a.cmd, p: [...a.cmd.p] as V3 }));
      this.markers.forEach((m) => (m.visible = true));
    } else if (this.scenario.program.kind !== 'manual') {
      this.manualMode = false;
      this.markers.forEach((m) => (m.visible = false));
      this.load(this.scenario, true);
    }
  }
  isManual() {
    return this.manualMode;
  }
  getManual(i: number): Pose {
    const m = this.arms[i].manual;
    return { p: [...m.p] as V3, pitch: m.pitch, roll: m.roll, grip: m.grip };
  }
  selectArm(i: number) {
    this.selectedArm = i;
  }
  setManualPose(i: number, part: PosePartial) {
    if (this.replaying && i === 0) return;
    const a = this.arms[i];
    if (part.p) a.manual.p = [...part.p] as V3;
    if (part.pitch !== undefined) a.manual.pitch = part.pitch;
    if (part.roll !== undefined) a.manual.roll = part.roll;
    if (part.grip !== undefined) a.manual.grip = part.grip;
  }
  /** deg: [panRelForward, lift, elbowRel, wristRel, roll, grip01] */
  setManualJoints(i: number, deg: number[]) {
    if (this.replaying && i === 0) return;
    const a = this.arms[i];
    const a1 = deg[1] * D2R;
    const a2 = a1 + deg[2] * D2R;
    const a3 = a2 + deg[3] * D2R;
    const j: Joints = { pan: (deg[0] - 90) * D2R, a1, a2, a3, roll: deg[4] * D2R, grip: deg[5] };
    const pose = jointsToPose(a.base, j);
    a.manual = pose;
    a.manual.p = [...pose.p] as V3;
  }
  startRecording() {
    this.recFrames = [];
    this.recClock = 0;
    this.recording = true;
    this.replaying = false;
  }
  stopRecording() {
    this.recording = false;
  }
  playRecording() {
    if (!this.recFrames.length) return;
    this.recording = false;
    this.replaying = true;
    this.replayT = 0;
  }
  stopReplay() {
    this.replaying = false;
  }
  clearRecording() {
    this.recFrames = [];
    this.recording = false;
    this.replaying = false;
  }
  resetCamera() {
    const c = this.scenario?.cam ?? { pos: [0, 40, 60] as V3, target: [0, 5, 4] as V3 };
    this.camera.position.set(...c.pos);
    this.controls.target.set(...c.target);
  }
  ensureAudio() {
    if (!this.audio) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audio = new AC();
      } catch {
        this.audio = null;
      }
    }
    if (this.audio && this.audio.state === 'suspended') this.audio.resume();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.dispos.forEach((d) => d());
    this.controls.dispose();
    this.clearWorld();
    this.renderer.dispose();
    this.pmrem.dispose();
    if (this.renderer.domElement.parentElement) this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    this.audio?.close().catch(() => {});
  }

  // ---------------------------------------------------------------- world
  private clearWorld() {
    for (const a of this.arms) {
      if (a.holding) a.rig.tip.remove(a.holding.obj);
      a.holding = null;
    }
    while (this.world.children.length) {
      const c = this.world.children[0];
      this.world.remove(c);
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh || (o as THREE.Sprite).isSprite) {
          m.geometry?.dispose?.();
          const mat = m.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose?.();
        }
      });
    }
    this.props = [];
    this.fixtures = [];
  }

  private addProp(spec: PropSpec) {
    const obj = buildPrim(spec);
    this.world.add(obj);
    const s = spec.size;
    let hx = 1;
    let hz = 1;
    let round = true;
    let width = 3;
    if (spec.shape === 'box') {
      hx = s[0] / 2;
      hz = s[2] / 2;
      round = false;
      width = Math.min(s[0], s[2]);
    } else if (spec.shape === 'cyl' || spec.shape === 'cone') {
      hx = hz = s[0];
      width = s[0] * 2;
    } else if (spec.shape === 'sphere') {
      hx = hz = s[0];
      width = s[0] * 2;
    } else {
      hx = hz = s[0] + s[1];
      width = (s[0] + s[1]) * 2;
    }
    this.props.push({
      spec,
      obj,
      halfH: halfHeight(spec),
      hx,
      hz,
      round,
      width: spec.width ?? width,
      held: -1,
      vy: 0,
      locked: !!spec.motion,
      settle: null,
    });
  }

  private addFixture(spec: FixtureSpec) {
    const obj = buildPrim(spec);
    if (spec.showAfter !== undefined) obj.visible = false;
    this.world.add(obj);
    const s = spec.size;
    const isBox = spec.shape === 'box';
    const hh = halfHeight(spec);
    const mats: THREE.MeshStandardMaterial[] = [];
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !(o as THREE.Sprite).isSprite) mats.push(m.material as THREE.MeshStandardMaterial);
    });
    const top = spec.pos[1] + hh;
    this.fixtures.push({
      spec,
      obj,
      x: spec.pos[0],
      y: spec.pos[1],
      z: spec.pos[2],
      hx: isBox ? s[0] / 2 : s[0],
      hz: isBox ? s[2] / 2 : s[0],
      r: s[0],
      top,
      yaw: (spec.rot?.[1] ?? 0) * D2R,
      isBox,
      at: new THREE.Vector3(...(spec.trigger?.at ?? [spec.pos[0], top, spec.pos[2]])),
      inside: false,
      on: false,
      flashT: 0,
      last: -10,
      press: 0,
      baseY: spec.pos[1],
      mats,
    });
  }

  // ---------------------------------------------------------------- pointer / resize
  private updatePointer(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = new THREE.Vector3();
    if (this.ray.ray.intersectPlane(this.plane, hit) && Math.abs(hit.x) < 55 && hit.z > -26 && hit.z < 38) {
      this.pointer = [hit.x, 0, hit.z];
      this.cursor.position.set(hit.x, 0.1, hit.z);
    } else {
      this.pointer = null;
    }
  }

  private resize() {
    const w = this.el.clientWidth || 800;
    const h = this.el.clientHeight || 500;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- sound
  private sound(s: SoundSpec) {
    if (this.muted || !this.audio) return;
    const ac = this.audio;
    const t = ac.currentTime;
    const g = ac.createGain();
    g.connect(ac.destination);
    const osc = (type: OscillatorType, f: number) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(g);
      return o;
    };
    const f = s.freq ?? 440;
    switch (s.type) {
      case 'tone': {
        const o = osc('triangle', f);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        o.start(t);
        o.stop(t + 0.55);
        break;
      }
      case 'chime': {
        const o = osc('sine', f);
        const o2 = osc('sine', f * 2.01);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        o.start(t);
        o2.start(t);
        o.stop(t + 1.2);
        o2.stop(t + 1.2);
        break;
      }
      case 'kick': {
        const o = osc('sine', 150);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
        g.gain.setValueAtTime(0.9, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.start(t);
        o.stop(t + 0.32);
        break;
      }
      case 'snare':
      case 'hat': {
        const len = Math.floor(ac.sampleRate * (s.type === 'snare' ? 0.18 : 0.06));
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ac.createBufferSource();
        src.buffer = buf;
        const hp = ac.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = s.type === 'snare' ? 1500 : 6000;
        src.connect(hp);
        hp.connect(g);
        g.gain.setValueAtTime(s.type === 'snare' ? 0.5 : 0.25, t);
        src.start(t);
        if (s.type === 'snare') {
          const o = osc('triangle', 190);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
          o.start(t);
          o.stop(t + 0.2);
        }
        break;
      }
      case 'click': {
        const o = osc('square', f || 1400);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        o.start(t);
        o.stop(t + 0.06);
        break;
      }
      default: {
        const o = osc('sine', f || 420);
        o.frequency.exponentialRampToValueAtTime((f || 420) * 1.8, t + 0.08);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        o.start(t);
        o.stop(t + 0.14);
      }
    }
  }

  // ---------------------------------------------------------------- main loop
  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.scenario) {
      if (this.manualMode) this.step(dt);
      else if (this.playing) this.step(dt * this.speed);
      this.visuals(dt);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.teleAcc += dt;
    if (this.teleAcc > 0.1 && this.scenario) {
      this.teleAcc = 0;
      this.cb.onTelemetry(this.telemetry());
    }
  };

  private ctx(dt: number): LiveCtx {
    return {
      t: this.time,
      dt,
      tips: [this.arms[0].tipPos.toArray() as V3, this.arms[1].tipPos.toArray() as V3],
      bases: [this.arms[0].base, this.arms[1].base],
      prop: (id) => {
        const p = this.props.find((q) => q.spec.id === id);
        return p ? (p.obj.getWorldPosition(new THREE.Vector3()).toArray() as V3) : undefined;
      },
      laser: this.laserPos,
      pointer: this.pointer,
      triggers: this.triggerCount,
    };
  }

  private step(dt: number) {
    const s = this.scenario!;
    this.time += dt;
    const ctx = this.ctx(dt);

    // moving props
    for (const p of this.props) {
      if (p.spec.motion && p.locked && p.held < 0) {
        const cur = p.obj.position.toArray() as V3;
        const out = p.spec.motion(this.time, ctx, cur);
        if (Array.isArray(out)) p.obj.position.set(...out);
        else {
          p.obj.position.set(...out.p);
          if (out.yaw !== undefined) p.obj.rotation.y = out.yaw;
        }
      }
    }

    // ---- program
    let jointOverride: [number[] | undefined, number[] | undefined] = [undefined, undefined];
    if (this.manualMode) {
      this.runManual(dt);
    } else if (s.program.kind === 'phases') {
      this.runPhases(dt, s.program.phases, !!s.program.loop);
    } else if (s.program.kind === 'live') {
      const out: LiveOut = s.program.fn(ctx);
      if (out.say && out.say !== this.lastSay) {
        this.lastSay = out.say;
        this.cb.onLog(out.say);
      }
      if (out.a) this.applyPartial(0, out.a);
      if (out.b) this.applyPartial(1, out.b);
      jointOverride = [out.ja, out.jb];
    }

    // ---- joints
    this.arms.forEach((a, i) => {
      const ov = jointOverride[i];
      let direct = false;
      if (ov) {
        const a1 = ov[1] * D2R;
        const a2 = a1 + ov[2] * D2R;
        a.target = { pan: ov[0] * D2R, a1, a2, a3: a2 + ov[3] * D2R, roll: ov[4] * D2R, grip: ov[5] };
        direct = true;
        a.reached = true;
      } else if (this.manualMode && s.mirror && i === 1) {
        // follower copies the leader with latency
        const lag = this.time - 0.22;
        let j = this.history[0]?.j;
        for (let k = this.history.length - 1; k >= 0; k--) {
          if (this.history[k].t <= lag) {
            j = this.history[k].j;
            break;
          }
        }
        if (j) a.target = { ...j };
        direct = true;
        a.reached = true;
      } else if (this.replaying && i === 0) {
        direct = true;
        this.runReplay(dt);
      }
      a.direct = direct;
      if (!direct) {
        const r = ik(a.base, a.cmd.p, a.cmd.pitch, a.cmd.roll, a.cmd.grip, a.joints.pan);
        a.target = { pan: r.pan, a1: r.a1, a2: r.a2, a3: r.a3, roll: r.roll, grip: r.grip };
        a.reached = r.reached;
      }
      const k = 1 - Math.exp(-dt * (direct ? 22 : 30));
      const t = a.target;
      let dp = t.pan - a.joints.pan;
      dp = wrapPi(dp);
      a.joints.pan += dp * k;
      a.joints.a1 += (t.a1 - a.joints.a1) * k;
      a.joints.a2 += (t.a2 - a.joints.a2) * k;
      a.joints.a3 += (t.a3 - a.joints.a3) * k;
      a.joints.roll += (t.roll - a.joints.roll) * k;
      a.joints.grip += (t.grip - a.joints.grip) * k;
      a.rig.setJoints(a.joints, a.holding ? a.holdFrac : 0);
      a.rig.root.updateMatrixWorld(true);
      a.rig.tip.getWorldPosition(a.tipPos);
      if (direct) {
        a.cmd.p = a.tipPos.toArray() as V3;
      }
    });

    // history for the mirror follower & recording
    this.history.push({ t: this.time, j: { ...this.arms[0].joints } });
    if (this.history.length > 120) this.history.shift();
    if (this.recording) {
      this.recClock += dt;
      if (this.recFrames.length === 0 || this.recClock - this.recFrames[this.recFrames.length - 1].t >= 1 / 30) {
        this.recFrames.push({ t: this.recClock, j: { ...this.arms[0].joints } });
      }
    }

    // ---- interactions
    this.arms.forEach((_, i) => this.grasp(i));
    this.physics(dt);
    this.triggers(dt);
    this.drawTrail();
    this.spawnPour(dt);
    this.updateLaser();
  }

  private applyPartial(i: number, p: PosePartial) {
    const c = this.arms[i].cmd;
    if (p.p) c.p = [...p.p] as V3;
    if (p.pitch !== undefined) c.pitch = p.pitch;
    if (p.roll !== undefined) c.roll = p.roll;
    if (p.grip !== undefined) c.grip = p.grip;
  }

  private runManual(dt: number) {
    const k = 1 - Math.exp(-dt * 9);
    this.arms.forEach((a, i) => {
      if (this.scenario?.mirror && i === 1) return;
      if (this.replaying && i === 0) return;
      const m = a.manual;
      a.cmd.p = [lerp(a.cmd.p[0], m.p[0], k), lerp(a.cmd.p[1], m.p[1], k), lerp(a.cmd.p[2], m.p[2], k)];
      a.cmd.pitch = lerp(a.cmd.pitch, m.pitch, k);
      a.cmd.roll = lerp(a.cmd.roll, m.roll, k);
      a.cmd.grip = lerp(a.cmd.grip, m.grip, k);
    });
  }

  private runReplay(dt: number) {
    this.replayT += dt;
    const fr = this.recFrames;
    const a = this.arms[0];
    if (!fr.length || this.replayT > fr[fr.length - 1].t) {
      this.replaying = false;
      this.cb.onLog('Replay finished');
      return;
    }
    let k = 0;
    while (k < fr.length - 2 && fr[k + 1].t < this.replayT) k++;
    const f0 = fr[k];
    const f1 = fr[Math.min(k + 1, fr.length - 1)];
    const u = f1.t > f0.t ? clamp((this.replayT - f0.t) / (f1.t - f0.t), 0, 1) : 0;
    a.target = {
      pan: lerp(f0.j.pan, f1.j.pan, u),
      a1: lerp(f0.j.a1, f1.j.a1, u),
      a2: lerp(f0.j.a2, f1.j.a2, u),
      a3: lerp(f0.j.a3, f1.j.a3, u),
      roll: lerp(f0.j.roll, f1.j.roll, u),
      grip: lerp(f0.j.grip, f1.j.grip, u),
    };
  }

  private runPhases(dt: number, phases: import('./types').Phase[], loop: boolean) {
    if (this.finished) return;
    if (this.phaseIdx >= phases.length) {
      this.pour = null;
      this.endHold += dt;
      if (this.endHold > 1.4) {
        if (loop) {
          this.episode++;
          this.cb.onLog(`Episode ${this.episode - 1} complete – resetting scene for the next rollout`);
          this.load(this.scenario!, true);
        } else {
          this.finished = true;
          this.cb.onFinish();
          this.cb.onLog('Demo complete ✓');
        }
      }
      return;
    }
    const ph = phases[this.phaseIdx];
    if (!this.phaseBegun) {
      this.phaseBegun = true;
      this.phaseT = 0;
      this.phaseStart = this.arms.map((a) => ({ ...a.cmd, p: [...a.cmd.p] as V3 }));
      this.phaseTarget = this.arms.map((a, i) => {
        const part = i === 0 ? ph.a : ph.b;
        return {
          p: (part?.p ?? a.cmd.p).slice() as V3,
          pitch: part?.pitch ?? a.cmd.pitch,
          roll: part?.roll ?? a.cmd.roll,
          grip: part?.grip ?? a.cmd.grip,
        };
      });
      this.pour = ph.pour ?? null;
      if (ph.say) this.cb.onLog(ph.say);
    }
    this.phaseT += dt;
    const k = clamp(this.phaseT / Math.max(ph.dur, 0.01), 0, 1);
    const e = ph.lin ? k : ease(k);
    this.arms.forEach((a, i) => {
      const s0 = this.phaseStart[i];
      const s1 = this.phaseTarget[i];
      a.cmd.p = [lerp(s0.p[0], s1.p[0], e), lerp(s0.p[1], s1.p[1], e), lerp(s0.p[2], s1.p[2], e)];
      a.cmd.pitch = lerp(s0.pitch, s1.pitch, e);
      a.cmd.roll = lerp(s0.roll, s1.roll, e);
      a.cmd.grip = lerp(s0.grip, s1.grip, e);
    });
    if (k >= 1) {
      this.phaseIdx++;
      this.phaseBegun = false;
    }
  }

  // ---------------------------------------------------------------- grasping & physics
  private grasp(ai: number) {
    const a = this.arms[ai];
    const g = a.joints.grip;
    if (!a.holding) {
      if (g < 0.4) {
        let best: PropState | null = null;
        let bd = 3.4;
        const wp = new THREE.Vector3();
        for (const p of this.props) {
          if (p.spec.grab === false || p.held === ai) continue;
          p.obj.getWorldPosition(wp);
          const d = wp.distanceTo(a.tipPos);
          if (d < bd) {
            bd = d;
            best = p;
          }
        }
        if (best) {
          if (best.held >= 0) this.arms[best.held].holding = null;
          best.held = ai;
          best.locked = false;
          best.settle = null;
          best.vy = 0;
          a.rig.tip.attach(best.obj);
          a.holding = best;
          a.holdFrac = clamp(best.width / 4.2, 0, 0.85);
        }
      }
    } else if (g > Math.max(0.5, a.holdFrac + 0.06)) {
      const p = a.holding;
      this.world.attach(p.obj);
      p.held = -1;
      p.vy = 0;
      const e = new THREE.Euler().setFromQuaternion(p.obj.quaternion, 'YXZ');
      p.settle = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, e.y, 0));
      a.holding = null;
      a.holdFrac = 0;
    }
  }

  private supportAt(x: number, z: number, self: PropState, bottom: number) {
    let best = 0;
    for (const f of this.fixtures) {
      if (f.spec.support === false) continue;
      if (f.spec.shape !== 'box' && f.spec.shape !== 'cyl') continue;
      let inside = false;
      const dx = x - f.x;
      const dz = z - f.z;
      if (f.isBox) {
        const c = Math.cos(f.yaw);
        const s = Math.sin(f.yaw);
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;
        inside = Math.abs(lx) <= f.hx && Math.abs(lz) <= f.hz;
      } else inside = Math.hypot(dx, dz) <= f.r;
      if (inside && f.top <= bottom + 0.8 && f.top > best) best = f.top;
    }
    for (const p of this.props) {
      if (p === self || p.held >= 0 || p.spec.support === false || p.locked) continue;
      const dx = x - p.obj.position.x;
      const dz = z - p.obj.position.z;
      const inside = p.round ? Math.hypot(dx, dz) <= p.hx : Math.abs(dx) <= p.hx && Math.abs(dz) <= p.hz;
      const top = p.obj.position.y + p.halfH;
      if (inside && top <= bottom + 0.8 && top > best) best = top;
    }
    return best;
  }

  private physics(dt: number) {
    if (this.gravity === 0) {
      for (const p of this.props) {
        if (p.settle && p.held < 0) {
          p.obj.quaternion.slerp(p.settle, 1 - Math.exp(-dt * 8));
        }
      }
      return;
    }
    for (const p of this.props) {
      if (p.held >= 0 || p.locked) continue;
      const pos = p.obj.position;
      const sup = this.supportAt(pos.x, pos.z, p, pos.y - p.halfH);
      const target = sup + p.halfH;
      if (pos.y > target + 0.02) {
        p.vy += this.gravity * dt;
        pos.y = Math.max(target, pos.y - p.vy * dt);
        if (pos.y === target) p.vy = 0;
      } else {
        pos.y = target;
        p.vy = 0;
      }
      if (p.settle) {
        p.obj.quaternion.slerp(p.settle, 1 - Math.exp(-dt * 10));
        if (p.obj.quaternion.angleTo(p.settle) < 0.002) {
          p.obj.quaternion.copy(p.settle);
          p.settle = null;
        }
      }
    }
  }

  private triggers(dt: number) {
    for (const f of this.fixtures) {
      if (f.spec.showAfter !== undefined) f.obj.visible = this.time >= f.spec.showAfter;
      const tr = f.spec.trigger;
      if (!tr) continue;
      let d = 1e9;
      for (const a of this.arms) d = Math.min(d, a.tipPos.distanceTo(f.at));
      const inside = d <= tr.r;
      if (inside && !f.inside && this.time - f.last > 0.18) {
        f.last = this.time;
        this.triggerCount++;
        if (tr.latch) f.on = !f.on;
        f.flashT = 0.4;
        if (tr.sound) this.sound(tr.sound);
        if (tr.text) this.cb.onLog(tr.text);
      }
      f.inside = inside;
      f.flashT = Math.max(0, f.flashT - dt);
      const intensity = tr.latch ? (f.on ? 1.2 : 0) : f.flashT / 0.4;
      for (const m of f.mats) {
        if (intensity > 0.01) {
          m.emissive.setHex(tr.flash);
          m.emissiveIntensity = intensity * 1.1;
        } else if (!f.spec.emissive) {
          m.emissiveIntensity = 0;
        }
      }
      const press = inside ? (tr.depress ?? 0) : 0;
      f.press += (press - f.press) * (1 - Math.exp(-dt * 25));
      f.obj.position.y = f.baseY - f.press;
    }
  }

  private drawTrail() {
    const tr = this.scenario?.trail;
    if (!tr) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    this.arms.forEach((a, i) => {
      if (tr.arm !== 2 && tr.arm !== i) return;
      const down = a.tipPos.y < tr.penY;
      if (!down) {
        this.trailLast[i] = null;
        return;
      }
      const cur = new THREE.Vector3(a.tipPos.x, tr.y, a.tipPos.z);
      const last = this.trailLast[i];
      const r = tr.r ?? 0.24;
      const c = i === 1 && tr.color2 !== undefined ? tr.color2 : tr.color;
      col.setHex(c);
      const add = (v: THREE.Vector3) => {
        if (this.trailCount >= this.TRAIL_MAX) return;
        m.compose(v, q, new THREE.Vector3(r, 1, r));
        this.trail.setMatrixAt(this.trailCount, m);
        this.trail.setColorAt(this.trailCount, col);
        this.trailCount++;
      };
      if (!last) add(cur);
      else {
        const d = last.distanceTo(cur);
        const n = Math.ceil(d / (r * 0.7));
        for (let k = 1; k <= n; k++) add(last.clone().lerp(cur, k / n));
      }
      this.trailLast[i] = cur;
      this.trail.count = this.trailCount;
      this.trail.instanceMatrix.needsUpdate = true;
      if (this.trail.instanceColor) this.trail.instanceColor.needsUpdate = true;
    });
  }

  private spawnPour(dt: number) {
    if (!this.pour) return;
    const ai = this.pour.arm === 'a' ? 0 : 1;
    const a = this.arms[ai];
    this.partAcc += dt * (this.pour.rate ?? 55);
    const dir = new THREE.Vector3(1, 0, 0).transformDirection(a.rig.tip.matrixWorld);
    while (this.partAcc >= 1) {
      this.partAcc -= 1;
      const p = this.particles.find((q) => q.life <= 0);
      if (!p) break;
      p.mesh.visible = true;
      p.mesh.position.copy(a.tipPos).addScaledVector(dir, 1.2);
      p.v.copy(dir).multiplyScalar(5 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5) * 3, -2, (Math.random() - 0.5) * 3));
      (p.mesh.material as THREE.MeshStandardMaterial).color.setHex(this.pour.color);
      p.life = 2.5;
      p.floor = this.pour.floor ?? 0.3;
    }
  }

  private updateLaser() {
    const li = this.scenario?.laser;
    if (li === undefined) return;
    const a = this.arms[li];
    const dir = new THREE.Vector3(1, 0, 0).transformDirection(a.rig.tip.matrixWorld);
    const pos = this.laserLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    if (dir.y < -0.05) {
      const t = -a.tipPos.y / dir.y;
      const hit = a.tipPos.clone().addScaledVector(dir, t);
      this.laserPos = [hit.x, 0, hit.z];
      pos.setXYZ(0, a.tipPos.x, a.tipPos.y, a.tipPos.z);
      pos.setXYZ(1, hit.x, 0.1, hit.z);
      this.laserDot.position.set(hit.x, 0.3, hit.z);
      this.laserDot.visible = true;
      this.laserLine.visible = true;
    } else {
      this.laserPos = null;
      this.laserDot.visible = false;
      this.laserLine.visible = false;
    }
    pos.needsUpdate = true;
  }

  private visuals(dt: number) {
    // particles
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.v.y -= 500 * dt;
      p.mesh.position.addScaledVector(p.v, dt);
      if (p.mesh.position.y <= p.floor || p.life <= 0) {
        p.life = 0;
        p.mesh.visible = false;
      }
    }
    // manual markers
    if (this.manualMode) {
      this.arms.forEach((a, i) => {
        this.markers[i].visible = !(this.scenario?.mirror && i === 1);
        this.markers[i].position.set(...a.manual.p);
        const sel = i === this.selectedArm;
        this.markers[i].scale.setScalar(sel ? 1 : 0.6);
      });
    }
    this.cursor.visible = (this.manualMode || !!this.scenario?.usesPointer) && !!this.pointer;
    // gently pulse the held-object grasp indicator via tip emissive: none
  }

  private telemetry(): Telemetry {
    const phases = this.scenario?.program.kind === 'phases' ? this.scenario.program.phases.length : 0;
    const arm = (a: ArmState) => {
      const j = a.joints;
      let pan = wrapPi(j.pan + Math.PI / 2) * R2D;
      if (Math.abs(pan) > 179.9) pan = 180;
      return {
        pan,
        lift: j.a1 * R2D,
        elbow: (j.a2 - j.a1) * R2D,
        wrist: wrapPi(j.a3 - j.a2) * R2D,
        roll: j.roll * R2D,
        grip: j.grip,
        tip: a.tipPos.toArray() as V3,
        holding: a.holding ? a.holding.spec.id : null,
        reached: a.reached,
      };
    };
    return {
      t: this.time,
      phase: Math.min(this.phaseIdx + 1, phases),
      phaseCount: phases,
      arms: [arm(this.arms[0]), arm(this.arms[1])],
      episode: this.episode,
      finished: this.finished,
      triggers: this.triggerCount,
      rec: { recording: this.recording, replaying: this.replaying, frames: this.recFrames.length },
      props: [],
    };
  }
}
