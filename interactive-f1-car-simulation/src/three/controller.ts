import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildCar, type CarRig } from "./car";
import { CarField, vortexList } from "./field";
import { FlowSim, Weather, cpColor } from "./flow";
import { Tunnel } from "./tunnel";
import { ARRIVAL, BEATS, IDX, PART_COUNT, START, TOTAL, clamp, easeIO, lerp, locate, smooth } from "../lib/timeline";
import { DEFAULTS, computeAero, flowParams, type AeroResult, type FlowParams, type Params, type ViewName } from "../lib/aero";

export interface LabelPos {
  id: string;
  x: number;
  y: number;
  v: boolean;
}

export interface Hooks {
  onBeat: (beat: number) => void;
  onFrame: (s: number, mix: number) => void;
  onTunnel: (active: boolean) => void;
  onLabels: (l: LabelPos[]) => void;
  onReady: () => void;
}

interface CamKey {
  s: number;
  t: THREE.Vector3;
  az: number;
  el: number;
  dist: number;
  sx: number;
}

const ANCHORS: { id: string; p: [number, number, number] }[] = [
  { id: "stag", p: [-2.95, 0.11, 0] },
  { id: "fwv", p: [-2.55, 0.3, 0.97] },
  { id: "tyre", p: [-1.1, 0.42, 1.06] },
  { id: "airbox", p: [-0.1, 0.88, 0] },
  { id: "edge", p: [0.3, 0.1, 0.8] },
  { id: "venturi", p: [0.7, 0.03, 0.0] },
  { id: "undercut", p: [1.4, 0.26, 0.4] },
  { id: "diff", p: [2.45, 0.16, 0] },
  { id: "rw", p: [2.55, 1.05, 0] },
  { id: "wake", p: [4.2, 0.5, 0] },
];

const VIEWS: Record<ViewName, { p: [number, number, number]; t: [number, number, number] }> = {
  iso: { p: [-5.5, 2.4, 6.5], t: [0, 0.5, 0] },
  side: { p: [0, 0.9, 10.5], t: [0, 0.5, 0] },
  top: { p: [0, 10.5, 1.2], t: [0, 0, 0] },
  front: { p: [-7.6, 0.9, 0.05], t: [0, 0.5, 0] },
  rear: { p: [7.4, 1.1, 0.05], t: [0, 0.5, 0] },
  low: { p: [-3.4, 0.4, 3.4], t: [0.4, 0.22, 0] },
};

const TUNNEL_AZ = Math.atan2(-5.5, 6.5);
const TUNNEL_DIST = Math.hypot(5.5, 1.9, 6.5);
const TUNNEL_EL = Math.asin(1.9 / TUNNEL_DIST);

export class Controller {
  host: HTMLElement;
  hooks: Hooks;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  rig: CarRig;
  tunnel = new Tunnel();
  field: CarField;
  flow: FlowSim;
  weather = new Weather();
  studio = new THREE.Group();
  studioMats: THREE.Material[] = [];
  vortexGroup = new THREE.Group();
  vortexMats: THREE.LineDashedMaterial[] = [];
  vortexAttrs: { attr: THREE.BufferAttribute; base: Float32Array }[] = [];
  keys: CamKey[] = [];
  params: Params = { ...DEFAULTS };
  aero: AeroResult;
  fp: FlowParams;
  yOffBase = 0;
  s = 0;
  lastBeat = -1;
  raf = 0;
  last = 0;
  time = 0;
  active = false;
  mix = 0;
  drsCur = 0;
  tween: { t: number; fp: THREE.Vector3; ft: THREE.Vector3; tp: THREE.Vector3; tt: THREE.Vector3 } | null = null;
  userPos = new THREE.Vector3(-5.5, 2.4, 6.5);
  userTgt = new THREE.Vector3(0, 0.5, 0);
  painted = false;
  paintAt = 0;
  paintDirty = false;
  lastApplied = new Map<string, number>();
  size = { w: 1, h: 1 };
  disposed = false;
  ro: ResizeObserver;
  bgStudio = new THREE.Color(0x07080b);
  bgTunnel = new THREE.Color(0x090e14);
  tmpV = new THREE.Vector3();
  popV = new THREE.Vector3();
  labelsSent = false;
  keyLight: THREE.DirectionalLight;

  constructor(host: HTMLElement, hooks: Hooks) {
    this.host = host;
    this.hooks = hooks;
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.style.display = "block";
    r.domElement.style.touchAction = "pan-y";
    host.appendChild(r.domElement);
    this.renderer = r;

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    this.scene.background = this.bgStudio.clone();
    this.scene.fog = new THREE.FogExp2(0x07080b, 0.02);

    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    // lights
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(6, 11, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -10;
    sc.right = 10;
    sc.top = 10;
    sc.bottom = -10;
    sc.near = 1;
    sc.far = 40;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);
    this.keyLight = key;
    const rim = new THREE.DirectionalLight(0xff4030, 1.6);
    rim.position.set(-8, 4, -7);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0x4aa8ff, 0.7);
    fill.position.set(-7, 3, 8);
    this.scene.add(fill);
    this.scene.add(new THREE.HemisphereLight(0x8899bb, 0x0a0a0f, 0.25));

    // studio ground
    const gm = new THREE.MeshStandardMaterial({
      color: 0x0a0b0f,
      roughness: 0.45,
      metalness: 0.7,
      transparent: true,
    });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 72), gm);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const grid = new THREE.GridHelper(80, 80, 0x232a35, 0x141a22);
    grid.position.y = 0.004;
    const gmat = grid.material as THREE.LineBasicMaterial;
    gmat.transparent = true;
    gmat.opacity = 0.7;
    this.studio.add(ground, grid);
    this.studioMats.push(gm, gmat);
    this.scene.add(this.studio);

    // car
    this.rig = buildCar();
    this.scene.add(this.rig.group);
    this.rig.group.rotation.order = "YZX";

    // tunnel + flow
    this.scene.add(this.tunnel.group);
    this.aero = computeAero(this.params);
    this.fp = flowParams(this.params, this.aero, 0);
    this.field = new CarField(this.fp);
    this.flow = new FlowSim(this.field, this.fp);
    this.flow.group.visible = false;
    this.scene.add(this.flow.group);
    this.scene.add(this.weather.group);
    this.buildVortexOverlay();
    this.rig.group.add(this.vortexGroup);

    // controls
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 28;
    this.controls.maxPolarAngle = 1.56;
    this.controls.enabled = false;

    this.buildKeys();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.last = performance.now();
    this.s = window.scrollY / Math.max(1, window.innerHeight);
    this.raf = requestAnimationFrame(this.frame);
    setTimeout(() => this.hooks.onReady(), 50);
  }

  /* ------------------------------------------------------------- setup */
  private buildVortexOverlay() {
    const colors: Record<string, number> = { fw: 0xff6b5a, floor: 0x36d6ff, tyre: 0xb7bfcc, rw: 0xffd21f };
    for (const v of vortexList) {
      const d = new THREE.Vector3(v.dx, v.dy, v.dz);
      const a = new THREE.Vector3(v.ax, v.ay, v.az);
      const e1 = new THREE.Vector3(0, 1, 0);
      if (Math.abs(d.dot(e1)) > 0.9) e1.set(0, 0, 1);
      e1.cross(d).normalize();
      const e2 = d.clone().cross(e1).normalize();
      const len = v.kind === "tyre" ? 4 : 5.5;
      for (let strand = 0; strand < 2; strand++) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 90; i++) {
          const s = (i / 90) * len;
          const th = s * 9 * Math.sign(v.g) + strand * Math.PI;
          const rad = (v.rc * 1.4 + 0.025 * s) * (1 + 0.1 * Math.sin(s * 3));
          pts.push(
            a
              .clone()
              .addScaledVector(d, s)
              .addScaledVector(e1, Math.cos(th) * rad)
              .addScaledVector(e2, Math.sin(th) * rad),
          );
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineDashedMaterial({
          color: colors[v.kind],
          dashSize: 0.16,
          gapSize: 0.09,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const line = new THREE.Line(geo, mat);
        line.computeLineDistances();
        const attr = geo.getAttribute("lineDistance") as THREE.BufferAttribute;
        this.vortexAttrs.push({ attr, base: Float32Array.from(attr.array as Float32Array) });
        this.vortexGroup.add(line);
        this.vortexMats.push(mat);
      }
    }
    this.vortexGroup.visible = false;
  }

  private buildKeys() {
    const K = (s: number, t: [number, number, number], az: number, el: number, dist: number, sx: number) =>
      this.keys.push({ s, t: new THREE.Vector3(...t), az, el, dist, sx });
    K(0, [0, 0.8, 0], 0.35, 0.22, 15.5, 0);
    K(START[IDX.tour0] - 0.25, [0, 0.8, 0], 0.35, 0.22, 15.5, 0);
    for (let j = 0; j < PART_COUNT; j++) {
      const p = this.rig.parts[j];
      const b = IDX.tour0 + j;
      const a = START[b] + 0.3 * BEATS[b].len;
      const l = START[b] + 0.88 * BEATS[b].len;
      const az = (j % 2 === 0 ? -0.6 : 0.6) + 0.15 * Math.sin(j * 1.7);
      const el = 0.2 + 0.05 * ((j * 7) % 3);
      const dist = clamp(p.focusRadius * 2.9 + 1.8, 3.8, 12.5);
      const sx = j % 2 === 0 ? 0.17 : -0.17;
      const t: [number, number, number] = [p.focusCenter.x, p.focusCenter.y, p.focusCenter.z];
      K(a, t, az, el, dist, sx);
      K(l, t, az + (j % 2 === 0 ? 0.3 : -0.3), el, dist * 0.96, sx);
    }
    K(START[IDX.rebuildIntro] + 0.45, [0, 0.9, 0], 0.45, 0.25, 15.5, 0);
    K(START[IDX.skeleton], [0, 0.9, 0], 0.65, 0.3, 13.5, -0.14);
    K(START[IDX.muscle], [0, 0.9, 0], -0.25, 0.22, 12.8, 0.14);
    K(START[IDX.skin], [0, 0.7, 0], -1.3, 0.2, 11.8, -0.14);
    K(START[IDX.complete], [0, 0.5, 0], 0.5, 0.18, 9.8, 0);
    K(START[IDX.tunnelIn], [0, 0.45, 0], 0.95, 0.16, 9.2, 0);
    K(START[IDX.tunnel], [0, 0.5, 0], TUNNEL_AZ, TUNNEL_EL, TUNNEL_DIST, 0);
    this.keys.sort((a, b) => a.s - b.s);
  }

  /* ------------------------------------------------------------- public API */
  setParams(p: Params) {
    this.params = p;
    this.aero = computeAero(p);
    const hMean = (p.rideF + p.rideR) / 2;
    this.yOffBase = ((hMean - 40) / 1000) * 1.5;
    this.fp = flowParams(p, this.aero, this.yOffBase);
    this.paintDirty = true;
    this.paintAt = performance.now() + 220;
  }

  setView(v: ViewName) {
    if (!this.active) return;
    const d = VIEWS[v];
    this.tween = {
      t: 0,
      fp: this.camera.position.clone(),
      ft: this.controls.target.clone(),
      tp: new THREE.Vector3(...d.p),
      tt: new THREE.Vector3(...d.t),
    };
  }

  zoom(f: number) {
    if (!this.active) return;
    const off = this.camera.position.clone().sub(this.controls.target);
    const len = clamp(off.length() * f, 2.4, 28);
    off.setLength(len);
    this.camera.position.copy(this.controls.target).add(off);
  }

  resetFlow() {
    this.flow.reset();
  }

  scrollToBeat(i: number) {
    const y = (START[i] + 0.35 * BEATS[i].len) * window.innerHeight;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.host.removeChild(this.renderer.domElement);
  }

  /* ------------------------------------------------------------- frame */
  private resize() {
    const w = this.host.clientWidth || window.innerWidth;
    const h = this.host.clientHeight || window.innerHeight;
    this.size = { w, h };
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.active) {
      const d = TUNNEL_DIST * this.distScale();
      this.userTgt.set(0, 0.5, 0);
      this.userPos.set(
        d * Math.sin(TUNNEL_AZ) * Math.cos(TUNNEL_EL),
        0.5 + d * Math.sin(TUNNEL_EL),
        d * Math.cos(TUNNEL_AZ) * Math.cos(TUNNEL_EL),
      );
    }
  }

  private distScale() {
    const as = this.camera.aspect;
    return as < 1.4 ? Math.min(2.2, Math.pow(1.4 / as, 0.75)) : 1;
  }

  private scriptedCam(s: number, out: { pos: THREE.Vector3; tgt: THREE.Vector3; sx: number }) {
    const ks = this.keys;
    let a = ks[0];
    let b = ks[ks.length - 1];
    if (s <= ks[0].s) b = ks[0];
    else if (s >= ks[ks.length - 1].s) a = ks[ks.length - 1];
    else {
      for (let i = 0; i < ks.length - 1; i++) {
        if (s >= ks[i].s && s <= ks[i + 1].s) {
          a = ks[i];
          b = ks[i + 1];
          break;
        }
      }
    }
    let t = b.s === a.s ? 1 : clamp((s - a.s) / (b.s - a.s));
    t = 0.45 * t + 0.55 * (t * t * (3 - 2 * t));
    const az = lerp(a.az, b.az, t);
    const el = lerp(a.el, b.el, t);
    const dist = lerp(a.dist, b.dist, t) * this.distScale();
    out.tgt.lerpVectors(a.t, b.t, t);
    out.pos.set(
      out.tgt.x + dist * Math.sin(az) * Math.cos(el),
      out.tgt.y + dist * Math.sin(el),
      out.tgt.z + dist * Math.cos(az) * Math.cos(el),
    );
    out.sx = lerp(a.sx, b.sx, t);
  }

  private camOut = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), sx: 0 };

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    const vh = Math.max(1, window.innerHeight);
    const target = Math.min(TOTAL, Math.max(0, window.scrollY / vh));
    this.s += (target - this.s) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - this.s) < 0.0005) this.s = target;
    const s = this.s;
    const { i: beat } = locate(s);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      this.hooks.onBeat(beat);
    }

    const mix = smooth(START[IDX.tunnelIn] + 0.05, START[IDX.tunnel] + 0.25, s);
    this.mix = mix;
    const isActive = mix > 0.985;
    if (isActive !== this.active) {
      this.active = isActive;
      this.hooks.onTunnel(isActive);
      this.renderer.domElement.style.touchAction = isActive ? "none" : "pan-y";
      if (isActive) {
        this.userPos.copy(this.camera.position);
        this.userTgt.copy(this.controls.target);
      }
    }
    this.hooks.onFrame(s, mix);

    this.updateParts(dt, s);
    this.updateCar(dt, mix);
    this.updateCamera(dt, s, mix);
    this.updateTunnel(dt, mix);
    this.updatePaint(mix);
    this.updateLabels();

    this.renderer.render(this.scene, this.camera);
  };

  private updateParts(dt: number, s: number) {
    const parts = this.rig.parts;
    const e = lerp(0.72, 1, smooth(START[0] + 0.15, START[1] + 0.3, s));
    const tourAmt =
      smooth(START[1] - 0.4, START[1] + 0.25, s) * (1 - smooth(START[IDX.rebuildIntro] - 0.4, START[IDX.rebuildIntro] + 0.2, s));
    const rebuildAmt = smooth(START[IDX.rebuildIntro] - 0.2, START[IDX.rebuildIntro] + 0.4, s);
    let asmSum = 0;
    parts.forEach((p, idx) => {
      // tour highlight
      let hlT = 0;
      if (idx < PART_COUNT) {
        const b = IDX.tour0 + idx;
        const u = (s - START[b]) / BEATS[b].len;
        hlT = smooth(0, 0.3, u) * (1 - smooth(0.78, 1.0, u));
      }
      // assembly
      const order = ARRIVAL[p.phase];
      const k = order.indexOf(p.id);
      const n = order.length;
      const beatIdx = p.phase === "skeleton" ? IDX.skeleton : p.phase === "muscle" ? IDX.muscle : IDX.skin;
      let T = (s - START[beatIdx]) / BEATS[beatIdx].len;
      T = (T - 0.04) / 0.86;
      const w = 0.42;
      const st = n > 1 ? (k * (1 - w)) / (n - 1) : 0;
      const a = clamp((T - st) / w);
      const ea = easeIO(a);
      asmSum += ea;

      const drift = Math.sin(this.time * 0.8 + idx * 1.7) * 0.07 * (1 - ea);
      const ex = 1 - ea;
      p.root.position.set(
        p.assembled.x + p.offset.x * e * ex,
        p.assembled.y + p.offset.y * e * ex + drift * e,
        p.assembled.z + p.offset.z * e * ex,
      );
      const popK = hlT * tourAmt * ex;
      if (popK > 0.001) {
        this.popV.copy(this.camera.position).sub(p.focusCenter).normalize();
        p.root.position.addScaledVector(this.popV, 1.2 * popK);
      }
      for (const sub of p.subs) {
        sub.obj.position.set(
          sub.base.x + sub.off.x * e * ex,
          sub.base.y + sub.off.y * e * ex,
          sub.base.z + sub.off.z * e * ex,
        );
      }
      const hlVal = Math.max(hlT * tourAmt, rebuildAmt * Math.sin(Math.PI * a) * (a > 0 && a < 1 ? 1 : 0));
      if (p.spin) p.spinY = (p.spinY + dt * 0.45 * hlT * tourAmt) % (Math.PI * 2);
      p.root.rotation.set(p.tumble.x * e * ex, p.tumble.y * e * ex + p.spinY * ex, p.tumble.z * e * ex);
      const sc = 1 + 0.035 * hlVal;
      p.root.scale.setScalar(sc);

      // brightness
      const tourDim = lerp(1, lerp(0.26, 1, hlT), tourAmt);
      const rebuildDim = lerp(0.3, 1, smooth(0, 0.3, a));
      const dim = lerp(tourDim, rebuildDim, rebuildAmt);
      const pulse = hlVal * (0.75 + 0.25 * Math.sin(this.time * 5));
      const key = p.id;
      const sig = Math.round(dim * 200) + Math.round(pulse * 200) * 1000;
      if (hlVal > 0.01 || this.lastApplied.get(key) !== sig) {
        if (!this.painted) p.mats.apply(dim, pulse);
        this.lastApplied.set(key, sig);
      }
    });
    // studio floor rises as the car assembles
    const asm = asmSum / parts.length;
    const gy = lerp(-2.6, -0.002, smooth(0.0, 0.98, asm));
    this.studio.position.y = gy * (1 - this.mix) + 0 * this.mix;
    const fade = 1 - this.mix;
    this.studioMats.forEach((m, i) => {
      (m as THREE.Material & { opacity: number }).opacity = (i === 1 ? 0.7 : 1) * fade;
    });
    this.studio.visible = fade > 0.003;
  }

  private updateCar(dt: number, mix: number) {
    const p = this.params;
    const rig = this.rig;
    const aero = this.aero;
    // wing settings
    for (const f of rig.fwFlaps) f.mesh.rotation.z = f.base + f.k * ((p.fwAngle - 15) * Math.PI) / 180;
    rig.rwMain.mesh.rotation.z = rig.rwMain.base + ((p.rwAngle - 24) * 0.3 * Math.PI) / 180;
    const drsTarget = p.drs ? 1 : 0;
    this.drsCur += (drsTarget - this.drsCur) * Math.min(1, dt * 6);
    rig.rwFlap.pivot.rotation.z = rig.rwFlap.base + ((p.rwAngle - 24) * Math.PI) / 180 - this.drsCur * 0.42;

    const bounce = aero.porpoise > 0.02 ? aero.porpoise * 0.028 * Math.sin(this.time * Math.PI * 2 * 5.5) : 0;
    const pitchOsc = aero.porpoise > 0.02 ? aero.porpoise * 0.012 * Math.cos(this.time * Math.PI * 2 * 5.5) : 0;
    const rake = Math.atan((p.rideR - p.rideF) / 3600) * 4;
    rig.group.rotation.y = (-p.yaw * Math.PI) / 180 * mix;
    rig.group.rotation.z = (rake + pitchOsc) * mix;
    rig.group.position.y = (this.yOffBase + bounce) * mix;

    // wheel spin
    if (mix > 0.3) {
      const om = Math.min(20, this.fp.vis / 0.36) * p.slowmo;
      for (const w of rig.wheels) w.spin.rotation.z += om * dt;
    }
    // keep flow field car transform in sync
    this.fp.yOff = this.yOffBase + bounce;
    this.fp.yaw = (-p.yaw * Math.PI) / 180;
  }

  private updateCamera(dt: number, s: number, mix: number) {
    const cam = this.camera;
    const o = this.camOut;
    this.scriptedCam(s, o);
    const mobile = this.size.w < 820;
    const shift = o.sx * (1 - mix);
    if (mobile) {
      const sy = Math.abs(shift) > 0.001 ? 0.2 * (1 - mix) : 0;
      this.setOffset(0, sy);
    } else this.setOffset(shift, 0);

    if (this.active) {
      this.controls.enabled = true;
      if (this.tween) {
        const tw = this.tween;
        tw.t = Math.min(1, tw.t + dt / 1.1);
        const k = easeIO(tw.t);
        cam.position.lerpVectors(tw.fp, tw.tp, k);
        this.controls.target.lerpVectors(tw.ft, tw.tt, k);
        if (tw.t >= 1) this.tween = null;
      }
      this.controls.update();
      this.userPos.copy(cam.position);
      this.userTgt.copy(this.controls.target);
    } else {
      this.controls.enabled = false;
      if (mix > 0.001) {
        const k = mix;
        cam.position.lerpVectors(o.pos, this.userPos, k);
        this.tmpV.lerpVectors(o.tgt, this.userTgt, k);
        cam.lookAt(this.tmpV);
        this.controls.target.copy(this.tmpV);
      } else {
        cam.position.copy(o.pos);
        cam.lookAt(o.tgt);
        this.controls.target.copy(o.tgt);
      }
    }
    // small idle sway in hero
    const swayK = 1 - smooth(START[1] * 0.3, START[1] * 0.95, s);
    if (swayK > 0.001) {
      cam.position.x += Math.sin(this.time * 0.25) * 0.35 * swayK;
      cam.position.y += Math.sin(this.time * 0.31) * 0.12 * swayK;
      cam.lookAt(o.tgt);
    }
  }

  private setOffset(sx: number, sy: number) {
    const { w, h } = this.size;
    if (Math.abs(sx) > 0.001 || Math.abs(sy) > 0.001) {
      this.camera.setViewOffset(w, h, -sx * w, sy * h, w, h);
    } else if (this.camera.view?.enabled) {
      this.camera.clearViewOffset();
    }
  }

  private updateTunnel(dt: number, mix: number) {
    const p = this.params;
    const sc = this.scene;
    this.tunnel.setMix(mix);
    (sc.background as THREE.Color).copy(this.bgStudio).lerp(this.bgTunnel, mix);
    const fog = sc.fog as THREE.FogExp2;
    fog.color.copy(sc.background as THREE.Color);
    fog.density = lerp(0.02, 0.008, mix);
    this.keyLight.intensity = lerp(2.6, 1.6, mix);
    this.tunnel.update(dt, this.fp.vis, p.slowmo, p.rain);

    if (mix > 0.02) {
      this.field.setParams(this.fp);
      const f = this.flow;
      f.slow = p.slowmo;
      f.mode = p.mode;
      f.trailLen = Math.round(6 + p.trail * 26);
      f.setCount(Math.round(p.density * 2400));
      f.setSource(p.source, p.slice);
      f.group.visible = true;
      f.update(dt, this.fp, smooth(0.35, 0.95, mix), true);
    } else {
      this.flow.group.visible = false;
    }
    this.weather.update(
      dt * p.slowmo * 1.2,
      p.rain && mix > 0.4,
      this.fp.vis,
      this.fp.yaw,
      this.fp.yOff,
      clamp(this.fp.airKmh / 380),
    );
    // vortex overlay
    const showV = p.vortices && mix > 0.6;
    this.vortexGroup.visible = showV;
    if (showV) {
      const off = this.time * 0.9;
      for (const m of this.vortexMats) m.opacity = 0.85 * smooth(0.6, 1, mix);
      for (const va of this.vortexAttrs) {
        const arr = va.attr.array as Float32Array;
        for (let i = 0; i < arr.length; i++) arr[i] = va.base[i] + off;
        va.attr.needsUpdate = true;
      }
    }
  }

  private updatePaint(mix: number) {
    const p = this.params;
    const want = p.surface && mix > 0.985;
    if (!want && this.painted) this.unpaint();
    if (want && (!this.painted || (this.paintDirty && performance.now() > this.paintAt))) {
      this.paintSurface();
      this.paintDirty = false;
    }
  }

  private paintSurface() {
    const group = this.rig.group;
    this.field.setParams(this.fp);
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const m4 = new THREE.Matrix4();
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const col = [0, 0, 0];
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.parent === this.vortexGroup) return;
      const geo = mesh.geometry;
      const pos = geo.getAttribute("position");
      const nor = geo.getAttribute("normal");
      if (!pos || !nor) return;
      let ca = geo.getAttribute("color") as THREE.BufferAttribute | undefined;
      if (!ca || ca.count !== pos.count) {
        ca = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3);
        geo.setAttribute("color", ca);
      }
      m4.multiplyMatrices(inv, mesh.matrixWorld);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m4);
        n.fromBufferAttribute(nor, i).transformDirection(m4);
        const ratio = this.field.ratioAtLocal(v.x + n.x * 0.05, v.y + n.y * 0.05, v.z + n.z * 0.05);
        cpColor(1 - ratio * ratio, col);
        ca.setXYZ(i, col[0], col[1], col[2]);
      }
      ca.needsUpdate = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat.vertexColors) {
        mat.vertexColors = true;
        mat.needsUpdate = true;
      }
      mat.color.set(0xffffff);
    });
    this.painted = true;
  }

  private unpaint() {
    this.rig.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.vertexColors) {
        mat.vertexColors = false;
        mat.needsUpdate = true;
      }
    });
    this.painted = false;
    this.rig.parts.forEach((p) => p.mats.apply(1, 0));
    this.lastApplied.clear();
  }

  private updateLabels() {
    const show = this.params.labels && this.mix > 0.985;
    if (!show) {
      if (this.labelsSent) {
        this.hooks.onLabels(ANCHORS.map((a) => ({ id: a.id, x: 0, y: 0, v: false })));
        this.labelsSent = false;
      }
      return;
    }
    this.labelsSent = true;
    const out: LabelPos[] = [];
    const { w, h } = this.size;
    this.rig.group.updateMatrixWorld(true);
    for (const a of ANCHORS) {
      const v = this.tmpV.set(a.p[0], a.p[1], a.p[2]);
      this.rig.group.localToWorld(v);
      v.project(this.camera);
      out.push({ id: a.id, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, v: v.z < 1 && v.z > -1 });
    }
    this.hooks.onLabels(out);
  }
}
