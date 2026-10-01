import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Kinematics (cm / radians). Dimensions are approximations of the    */
/*  SO-101 follower used for visualisation & simulation purposes.      */
/* ------------------------------------------------------------------ */
export const L1 = 11.6; // shoulder -> elbow
export const L2 = 13.5; // elbow -> wrist flex
export const L3 = 12; // wrist flex -> gripper centre (TCP)
export const HS = 10.5; // shoulder axis height above table
export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;
export const PAN_LIM = 115 * D2R;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export interface Pose {
  pan: number; // rotation of base (rad, + turns toward -z)
  a1: number; // absolute direction of upper arm from forward axis
  a2: number; // absolute direction of forearm
  a3: number; // absolute direction of gripper axis (pitch)
  roll: number;
  grip: number; // 0 closed .. 1 open
}
export const REST: Pose = { pan: 0, a1: 105 * D2R, a2: -15 * D2R, a3: -60 * D2R, roll: 0, grip: 0 };
export const clonePose = (p: Pose): Pose => ({ ...p });

export function fkLocal(p: Pose) {
  const r = L1 * Math.cos(p.a1) + L2 * Math.cos(p.a2) + L3 * Math.cos(p.a3);
  const y = HS + L1 * Math.sin(p.a1) + L2 * Math.sin(p.a2) + L3 * Math.sin(p.a3);
  return { r, y };
}

function ik2(r: number, y: number, pp: number) {
  const wr = r - L3 * Math.cos(pp);
  const wh = y - HS - L3 * Math.sin(pp);
  const d = Math.hypot(wr, wh);
  if (d > L1 + L2 - 0.05 || d < Math.abs(L1 - L2) + 0.5) return null;
  if (wh + HS < 1.2) return null;
  const a1 = Math.atan2(wh, wr) + Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const a2 = Math.atan2(wh - L1 * Math.sin(a1), wr - L1 * Math.cos(a1));
  return { a1, a2 };
}

/** Solve IK for a tip target in the arm-local frame (x forward, y up, z lateral). */
export function solveIK(x: number, y: number, z: number, pitch: number, roll = 0, grip = 0): { pose: Pose; ok: boolean } {
  let ok = true;
  let pan = Math.atan2(-z, x);
  if (Math.abs(pan) > PAN_LIM) {
    pan = clamp(pan, -PAN_LIM, PAN_LIM);
    ok = false;
  }
  const r0 = Math.max(Math.hypot(x, z), 6);
  for (let s = 0; s < 40; s++) {
    const rr = r0 - s * 0.6;
    for (let pp = pitch; pp <= Math.max(pitch, 10 * D2R) + 1e-6; pp += 5 * D2R) {
      const sol = ik2(rr, y, pp);
      if (sol) return { pose: { pan, a1: sol.a1, a2: sol.a2, a3: pp, roll, grip }, ok: ok && s === 0 };
    }
  }
  return { pose: { ...REST, pan, roll, grip }, ok: false };
}

/* ------------------------------------------------------------------ */
/*  Procedural SO-101 model                                            */
/* ------------------------------------------------------------------ */
export type GroupId = 'base' | 'pan' | 'shoulder' | 'elbow' | 'wrist' | 'roll' | 'jaw';
export type Variant = 'follower' | 'leader';
type ColKey = 'printed' | 'motor' | 'horn' | 'board' | 'chip';
interface Prim {
  k: 'b' | 'c';
  s: number[];
  p: number[];
  col: ColKey;
  ax?: 'x' | 'y' | 'z';
}
export interface PartSpec {
  id: string;
  group: GroupId;
  kind: 'printed' | 'motor' | 'electronics';
  prims: Prim[];
  ex: number[];
  anchor: number[];
}
const B = (s: number[], p: number[], col: ColKey = 'printed'): Prim => ({ k: 'b', s, p, col });
const C = (s: number[], p: number[], ax: 'x' | 'y' | 'z', col: ColKey = 'horn'): Prim => ({ k: 'c', s, p, col, ax });
const MOT: number[] = [4.5, 2.5, 3.5];

export const GROUP_EXPLODE: Record<GroupId, number[]> = {
  base: [0, 0, 0],
  pan: [0, 16, 0],
  shoulder: [0, 0, 0],
  elbow: [6, 0, 0],
  wrist: [6, 0, 0],
  roll: [4, 0, 0],
  jaw: [0, 0, 0],
};

export function buildSpecs(variant: Variant): PartSpec[] {
  const leader = variant === 'leader';
  const gripperBody: Prim[] = leader
    ? [
        B([3.2, 3.4, 3.4], [8.0, 0, 0]),
        B([2.8, 9.5, 3.0], [10.2, -5.6, 0]), // handle
        B([1.6, 1.0, 3.0], [9.4, -1.4, 0]),
      ]
    : [B([3.2, 3.4, 3.4], [8.0, 0, 0]), B([6.2, 1.0, 2.6], [9.9, -1.0, 0]), B([1.4, 1.4, 2.6], [12.3, -0.4, 0])];
  const jaw: Prim[] = leader
    ? [B([1.2, 4.6, 1.8], [1.4, -1.2, 0]), B([1.8, 1.2, 2.2], [0.6, 0.6, 0])] // trigger
    : [B([5.4, 0.9, 2.4], [2.9, 0, 0]), B([1.2, 1.8, 2.4], [0.3, 0.4, 0]), B([1.0, 1.2, 2.4], [5.4, -0.3, 0])];
  return [
    { id: 'base', group: 'base', kind: 'printed', prims: [B([13, 2, 10], [0, 1, 0]), B([7, 4, 6], [0, 4, 0]), B([13, 0.6, 2], [0, 2.3, 4.2])], ex: [0, 0, 0], anchor: [0, 1, 5] },
    { id: 'm1', group: 'base', kind: 'motor', prims: [B([3.5, 4.5, 2.5], [0, 4, 0], 'motor'), C([1, 0.5], [0, 6.5, 0], 'y')], ex: [0, 8, 0], anchor: [0, 4, 1.4] },
    { id: 'm1_holder', group: 'base', kind: 'printed', prims: [B([6, 1, 5], [0, 6.7, 0])], ex: [0, 14, 0], anchor: [3, 6.7, 0] },
    { id: 'board', group: 'base', kind: 'electronics', prims: [B([0.5, 4.2, 5.2], [-6.8, 4, 0], 'board'), B([0.3, 1.4, 1.4], [-7.2, 4.6, 0.8], 'chip')], ex: [-9, 0, 2], anchor: [-7, 4, 0] },
    { id: 'shoulder', group: 'pan', kind: 'printed', prims: [B([6, 1, 5], [0, 7.5, 0]), B([4.6, 4.4, 0.8], [0, 9.2, 2.2]), B([4.6, 4.4, 0.8], [0, 9.2, -2.2])], ex: [0, 0, 0], anchor: [0, 9.2, 2.6] },
    { id: 'm2', group: 'pan', kind: 'motor', prims: [B(MOT, [-1.1, HS, 0], 'motor'), C([1, 0.6], [0, HS, 2.05], 'z')], ex: [0, 0, 9], anchor: [-1.1, HS + 1.3, 0] },
    { id: 'm2_holder', group: 'pan', kind: 'printed', prims: [B([5, 3.2, 0.7], [-1.1, HS, -3.0])], ex: [0, 0, -9], anchor: [-1.1, HS, -3.3] },
    { id: 'upper_arm', group: 'shoulder', kind: 'printed', prims: [B([10.1, 2.6, 0.8], [6.05, 0, 3.3]), B([10.1, 2.6, 0.8], [6.05, 0, -3.3]), B([1, 2, 6.6], [4, 0, 0])], ex: [3, 0, 0], anchor: [6, 1.3, 3.7] },
    { id: 'm3', group: 'shoulder', kind: 'motor', prims: [B(MOT, [L1 - 1.1, 0, 0], 'motor'), C([1, 0.6], [L1, 0, 2.05], 'z')], ex: [0, 0, 9], anchor: [L1 - 1.1, 1.3, 0] },
    { id: 'forearm', group: 'elbow', kind: 'printed', prims: [B([11.9, 2.6, 0.8], [7.0, 0, 3.3]), B([11.9, 2.6, 0.8], [7.0, 0, -3.3]), B([1, 2, 6.6], [5, 0, 0])], ex: [3, 0, 0], anchor: [7, 1.3, 3.7] },
    { id: 'm4_holder', group: 'elbow', kind: 'printed', prims: [B([5, 3.2, 0.6], [L2 - 1.1, 0, -2.4])], ex: [0, 0, -9], anchor: [L2 - 1.1, 0, -2.8] },
    { id: 'm4', group: 'elbow', kind: 'motor', prims: [B(MOT, [L2 - 1.1, 0, 0], 'motor'), C([1, 0.6], [L2, 0, 2.05], 'z')], ex: [0, 0, 9], anchor: [L2 - 1.1, 1.3, 0] },
    { id: 'wrist_bracket', group: 'wrist', kind: 'printed', prims: [B([6.2, 3.2, 0.8], [3.2, 0, -2.3]), B([6.2, 3.2, 0.8], [3.2, 0, 2.3]), B([1, 3.2, 5.4], [0.8, 0, 0])], ex: [0, 0, -3], anchor: [3.2, 1.6, -2.7] },
    { id: 'm5', group: 'wrist', kind: 'motor', prims: [B(MOT, [3.55, 0, 0], 'motor'), C([1, 0.6], [6.1, 0, 0], 'x')], ex: [0, 0, 8], anchor: [3.5, 1.3, 0] },
    { id: 'gripper_body', group: 'roll', kind: 'printed', prims: gripperBody, ex: [3, 0, 0], anchor: [8, 1.8, 0] },
    { id: 'm6', group: 'roll', kind: 'motor', prims: [B(MOT, [9.0, 1.2, 3.4], 'motor')], ex: [0, 0, 9], anchor: [9, 2.5, 3.4] },
    { id: 'moving_jaw', group: 'jaw', kind: 'printed', prims: jaw, ex: [0, 3, -6], anchor: [2.9, 0.6, 0] },
  ];
}

export interface PartInst {
  spec: PartSpec;
  holder: THREE.Group;
  mats: THREE.Material[];
  lines: THREE.LineBasicMaterial[];
  rest: THREE.Vector3;
}

export class RobotModel {
  root = new THREE.Group();
  g: Record<GroupId, THREE.Group>;
  parts = new Map<string, PartInst>();
  variant: Variant;
  explode = 0;
  private colors: Record<ColKey, string>;
  private baseOffsets: Record<GroupId, THREE.Vector3>;

  constructor(variant: Variant = 'follower', printedColor?: string) {
    this.variant = variant;
    const pc = printedColor ?? (variant === 'leader' ? '#14b8a6' : '#ff7a1a');
    this.colors = { printed: pc, motor: '#272c38', horn: '#e5e7eb', board: '#0f8a5f', chip: '#111827' };
    const mk = () => new THREE.Group();
    this.g = { base: mk(), pan: mk(), shoulder: mk(), elbow: mk(), wrist: mk(), roll: mk(), jaw: mk() };
    this.baseOffsets = {
      base: new THREE.Vector3(0, 0, 0),
      pan: new THREE.Vector3(0, 0, 0),
      shoulder: new THREE.Vector3(0, HS, 0),
      elbow: new THREE.Vector3(L1, 0, 0),
      wrist: new THREE.Vector3(L2, 0, 0),
      roll: new THREE.Vector3(0, 0, 0),
      jaw: new THREE.Vector3(7.6, 0.2, 0),
    };
    this.root.add(this.g.base);
    this.g.base.add(this.g.pan);
    this.g.pan.add(this.g.shoulder);
    this.g.shoulder.add(this.g.elbow);
    this.g.elbow.add(this.g.wrist);
    this.g.wrist.add(this.g.roll);
    this.g.roll.add(this.g.jaw);

    for (const spec of buildSpecs(variant)) {
      const holder = new THREE.Group();
      const mats: THREE.Material[] = [];
      const lines: THREE.LineBasicMaterial[] = [];
      const jawOff = new THREE.Vector3(); // jaw prims are authored in jaw-local coordinates
      for (const pr of spec.prims) {
        const m = new THREE.MeshStandardMaterial({ color: this.colors[pr.col], roughness: pr.col === 'printed' ? 0.55 : 0.4, metalness: pr.col === 'horn' ? 0.6 : 0.08 });
        mats.push(m);
        let geo: THREE.BufferGeometry;
        if (pr.k === 'b') geo = new THREE.BoxGeometry(pr.s[0], pr.s[1], pr.s[2]);
        else geo = new THREE.CylinderGeometry(pr.s[0], pr.s[0], pr.s[1], 24);
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.set(pr.p[0], pr.p[1], pr.p[2]).sub(jawOff);
        if (pr.k === 'c') {
          if (pr.ax === 'x') mesh.rotation.z = Math.PI / 2;
          if (pr.ax === 'z') mesh.rotation.x = Math.PI / 2;
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.partId = spec.id;
        holder.add(mesh);
        if (pr.k === 'b') {
          const lm = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
          lines.push(lm);
          const ls = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lm);
          ls.position.copy(mesh.position);
          ls.userData.partId = spec.id;
          holder.add(ls);
        }
      }
      this.g[spec.group].add(holder);
      this.parts.set(spec.id, { spec, holder, mats, lines, rest: new THREE.Vector3() });
    }
    this.setExplode(0);
    this.setPose(REST);
  }

  setExplode(e: number) {
    this.explode = e;
    (Object.keys(this.g) as GroupId[]).forEach((k) => {
      const o = GROUP_EXPLODE[k];
      this.g[k].position.set(
        this.baseOffsets[k].x + o[0] * e,
        this.baseOffsets[k].y + o[1] * e,
        this.baseOffsets[k].z + o[2] * e,
      );
    });
    this.parts.forEach((p) => p.holder.position.set(p.spec.ex[0] * e, p.spec.ex[1] * e, p.spec.ex[2] * e));
  }

  setPose(p: Pose) {
    this.g.pan.rotation.y = p.pan;
    this.g.shoulder.rotation.z = p.a1;
    this.g.elbow.rotation.z = p.a2 - p.a1;
    this.g.wrist.rotation.z = p.a3 - p.a2;
    this.g.roll.rotation.x = p.roll;
    this.g.jaw.rotation.z = this.variant === 'leader' ? -p.grip * 0.5 : p.grip * 0.95;
  }

  /** focus: ids to emphasise (others fade). xray: make everything translucent. */
  setFocus(ids: string[] | null, xray = false) {
    this.parts.forEach((p, id) => {
      const on = !ids || ids.includes(id);
      p.mats.forEach((m) => {
        const mm = m as THREE.MeshStandardMaterial;
        const op = ids ? (on ? 1 : 0.1) : xray ? 0.4 : 1;
        mm.transparent = op < 1;
        mm.opacity = op;
        mm.depthWrite = op >= 0.9;
        mm.emissive.set(ids && on ? '#ffffff' : '#000000');
        mm.emissiveIntensity = ids && on ? 0.28 : 0;
      });
      p.lines.forEach((l) => (l.opacity = ids ? (on ? 0.5 : 0.04) : xray ? 0.2 : 0.35));
    });
  }

  anchorWorld(id: string): THREE.Vector3 | null {
    const p = this.parts.get(id);
    if (!p) return null;
    const a = p.spec.anchor;
    const v = new THREE.Vector3(a[0], a[1], a[2]);
    return p.holder.localToWorld(v);
  }

  /** World position of the TCP (grip centre). */
  tcpWorld(): THREE.Vector3 {
    return this.g.roll.localToWorld(new THREE.Vector3(L3, 0, 0));
  }
}

/* ------------------------------------------------------------------ */
/*  Shared 3D stage                                                    */
/* ------------------------------------------------------------------ */
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  onFrame: ((dt: number, t: number) => void) | null = null;
  private raf = 0;
  private last = performance.now();
  private ro: ResizeObserver;
  private disposed = false;

  constructor(public el: HTMLElement, opts: { bg?: string; shadows?: boolean } = {}) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = opts.shadows ?? true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color(opts.bg ?? '#0b0f17');
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 1000);
    this.camera.position.set(60, 55, 85);
    el.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    const hemi = new THREE.HemisphereLight(0xdbe7ff, 0x1a1d27, 0.85);
    hemi.name = 'hemi';
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.name = 'sun';
    sun.position.set(40, 90, 50);
    sun.castShadow = opts.shadows ?? true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 260;
    this.scene.add(sun);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.resize();
    const loop = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.onFrame?.(dt, now / 1000);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  resize() {
    const w = this.el.clientWidth || 300;
    const h = this.el.clientHeight || 300;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = (m as any).material;
      if (mat) Array.isArray(mat) ? mat.forEach((x: THREE.Material) => x.dispose()) : mat.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
