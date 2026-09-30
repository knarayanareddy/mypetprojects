import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  FLOOR_Y as Y,
  CEIL_H,
  HX0,
  HX1,
  DOOR,
  GATE,
  POND,
  KEYFRAMES,
  FRONT_PATH,
  BACK_PATH,
  ROOMS,
  type Season,
  type Hour,
} from "./layout";
import * as TX from "./textures";

const C = (h: string) => new THREE.Color(h);
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/* ------------------------------------------------------------------ */
/* Environment (season × hour)                                         */
/* ------------------------------------------------------------------ */
interface Env {
  skyTop: THREE.Color;
  skyBot: THREE.Color;
  sun: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  maple: THREE.Color;
  cherry: THREE.Color;
  moss: THREE.Color;
  leaf: THREE.Color;
  sunInt: number;
  hemiInt: number;
  snow: number;
  foliage: number;
  fly: number;
  daylight: number;
  night: number;
  leafCount: number;
  leafSize: number;
  leafFall: number;
  sunEl: number;
  sunAz: number;
  stars: number;
  lantern: number;
  exposure: number;
}

const SEASON_DEF = {
  spring: { skyTop: "#86b4dc", skyBot: "#f3e3e0", maple: "#9cc75a", cherry: "#f6b3c7", moss: "#6d9c3c", leaf: "#f8c9d6", snow: 0, foliage: 1, fly: 0, leafCount: 170, leafSize: 0.075, leafFall: 0.45, sunInt: 2.7, hemi: 1.0 },
  summer: { skyTop: "#4794d8", skyBot: "#e0eff3", maple: "#3f8035", cherry: "#4c8c3a", moss: "#3f8a2c", leaf: "#b9df7c", snow: 0, foliage: 1, fly: 1, leafCount: 70, leafSize: 0.055, leafFall: 0.3, sunInt: 3.1, hemi: 1.05 },
  autumn: { skyTop: "#7aa3c6", skyBot: "#f5dcbc", maple: "#d2341c", cherry: "#e2902e", moss: "#72833a", leaf: "#dc622c", snow: 0, foliage: 1, fly: 0, leafCount: 230, leafSize: 0.09, leafFall: 0.6, sunInt: 2.4, hemi: 0.95 },
  winter: { skyTop: "#9cb0c8", skyBot: "#eaeff4", maple: "#7b6a5a", cherry: "#7b6a5a", moss: "#9fb2a0", leaf: "#ffffff", snow: 1, foliage: 0, fly: 0, leafCount: 320, leafSize: 0.07, leafFall: 0.35, sunInt: 1.7, hemi: 1.15 },
} as const;

const HOUR_DEF = {
  dawn: { skyTop: "#6f82b0", skyBot: "#f6b59a", sun: "#ffb58a", sunMul: 0.55, hemiMul: 0.7, daylight: 0.55, night: 0.15, el: 0.16, az: 0.9, lantern: 0.45, stars: 0.1, exposure: 1.0 },
  noon: { skyTop: null, skyBot: null, sun: "#fff6e8", sunMul: 1, hemiMul: 1, daylight: 1, night: 0, el: 0.95, az: 0.3, lantern: 0, stars: 0, exposure: 1.0 },
  dusk: { skyTop: "#3f3f78", skyBot: "#f08a5e", sun: "#ff8a50", sunMul: 0.45, hemiMul: 0.55, daylight: 0.3, night: 0.45, el: 0.12, az: -0.9, lantern: 0.85, stars: 0.3, exposure: 1.0 },
  night: { skyTop: "#050916", skyBot: "#19224a", sun: "#8ea6ff", sunMul: 0.16, hemiMul: 0.3, daylight: 0, night: 1, el: 0.5, az: 2.4, lantern: 1, stars: 1, exposure: 1.1 },
} as const;

function makeEnv(season: Season, hour: Hour): Env {
  const s = SEASON_DEF[season];
  const h = HOUR_DEF[hour];
  const skyTop = h.skyTop ? C(h.skyTop).lerp(C(s.skyTop), 0.18) : C(s.skyTop);
  const skyBot = h.skyBot ? C(h.skyBot).lerp(C(s.skyBot), 0.18) : C(s.skyBot);
  return {
    skyTop,
    skyBot,
    sun: C(h.sun),
    hemiSky: C("#e8f0ff").lerp(C("#5468a8"), h.night),
    hemiGround: C("#ab9d85").lerp(C("#22212f"), h.night),
    maple: C(s.maple),
    cherry: C(s.cherry),
    moss: C(s.moss),
    leaf: C(s.leaf),
    sunInt: s.sunInt * h.sunMul,
    hemiInt: s.hemi * h.hemiMul,
    snow: s.snow,
    foliage: s.foliage,
    fly: s.fly,
    daylight: h.daylight,
    night: h.night,
    leafCount: s.leafCount,
    leafSize: s.leafSize,
    leafFall: s.leafFall,
    sunEl: h.el,
    sunAz: h.az,
    stars: h.stars,
    lantern: h.lantern,
    exposure: h.exposure,
  };
}

function lerpEnv(a: Env, b: Env, k: number) {
  for (const key of Object.keys(a) as (keyof Env)[]) {
    const av = a[key];
    if (av instanceof THREE.Color) av.lerp(b[key] as THREE.Color, k);
    else (a[key] as number) = (av as number) + ((b[key] as number) - (av as number)) * k;
  }
}

/* ------------------------------------------------------------------ */
/* Koi                                                                 */
/* ------------------------------------------------------------------ */
interface Food {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  life: number;
}

const KOI_STYLES = [
  { base: "#f4f1ea", patches: ["#e8521c", "#e8521c", "#1a1a1a"] },
  { base: "#e8521c", patches: ["#f4f1ea", "#f4f1ea"] },
  { base: "#e2b23a", patches: [] as string[] },
  { base: "#f4f1ea", patches: ["#d6301a", "#d6301a"] },
  { base: "#202024", patches: ["#f4f1ea", "#e8521c"] },
  { base: "#e8521c", patches: ["#1a1a1a"] },
  { base: "#f0e6d0", patches: ["#e8a21c", "#e8521c"] },
];

class Koi {
  group = new THREE.Group();
  s1 = new THREE.Group();
  s2 = new THREE.Group();
  s3 = new THREE.Group();
  x: number;
  z: number;
  heading = Math.random() * 6.28;
  speed = 0.5;
  phase = Math.random() * 10;
  tx = 0;
  tz = 0;
  timer = 0;
  id: number;
  scale: number;

  constructor(style: (typeof KOI_STYLES)[number], geo: THREE.SphereGeometry, id: number) {
    this.id = id;
    this.scale = 0.9 + Math.random() * 0.6;
    const mat = new THREE.MeshStandardMaterial({ color: style.base, roughness: 0.35, metalness: 0.05 });
    const body = new THREE.Mesh(geo, mat);
    body.scale.set(0.42, 0.11, 0.15);
    this.s1.add(body);
    style.patches.forEach((p, i) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: p, roughness: 0.4 }));
      m.scale.set(0.15 + Math.random() * 0.06, 0.07, 0.09 + Math.random() * 0.03);
      m.position.set(0.22 - i * 0.2, 0.055, (Math.random() - 0.5) * 0.06);
      this.s1.add(m);
    });
    // pectoral fins
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(geo, mat);
      f.scale.set(0.11, 0.008, 0.05);
      f.position.set(0.2, -0.03, s * 0.14);
      f.rotation.y = s * 0.6;
      this.s1.add(f);
    }
    // eyes
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: "#111" }));
      e.scale.setScalar(0.022);
      e.position.set(0.36, 0.04, s * 0.085);
      this.s1.add(e);
    }
    this.s2.position.x = -0.3;
    const b2 = new THREE.Mesh(geo, mat);
    b2.scale.set(0.3, 0.08, 0.11);
    b2.position.x = -0.18;
    this.s2.add(b2);
    this.s3.position.x = -0.36;
    const tail = new THREE.Mesh(geo, mat);
    tail.scale.set(0.24, 0.01, 0.13);
    tail.position.x = -0.15;
    this.s3.add(tail);
    const tail2 = new THREE.Mesh(geo, mat);
    tail2.scale.set(0.2, 0.01, 0.09);
    tail2.position.x = -0.22;
    tail2.rotation.y = 0.35;
    this.s3.add(tail2);
    this.s2.add(this.s3);
    this.s1.add(this.s2);
    this.group.add(this.s1);
    this.group.scale.setScalar(this.scale);
    const a = Math.random() * 6.28;
    const r = Math.sqrt(Math.random()) * 0.7;
    this.x = POND.cx + Math.cos(a) * POND.rx * r;
    this.z = POND.cz + Math.sin(a) * POND.rz * r;
    this.pickTarget();
  }

  pickTarget() {
    const a = Math.random() * 6.28;
    const r = 0.25 + Math.random() * 0.6;
    this.tx = POND.cx + Math.cos(a) * POND.rx * r;
    this.tz = POND.cz + Math.sin(a) * POND.rz * r;
    this.timer = 4 + Math.random() * 6;
  }

  update(dt: number, time: number, foods: Food[], onEat: (f: Food) => void) {
    let goal = 0.45 + (this.id % 3) * 0.12;
    let tx = this.tx;
    let tz = this.tz;
    let best: Food | null = null;
    let bd = 1e9;
    for (const f of foods) {
      const d = Math.hypot(f.x - this.x, f.z - this.z);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    if (best && bd < 14) {
      tx = best.x;
      tz = best.z;
      goal = 1.5;
      if (bd < 0.4) onEat(best);
    } else {
      this.timer -= dt;
      if (this.timer <= 0 || Math.hypot(tx - this.x, tz - this.z) < 0.8) this.pickTarget();
    }
    const ex = (this.x - POND.cx) / POND.rx;
    const ez = (this.z - POND.cz) / POND.rz;
    if (ex * ex + ez * ez > 0.72) {
      tx = POND.cx;
      tz = POND.cz;
    }
    const want = Math.atan2(tz - this.z, tx - this.x);
    let diff = want - this.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const turn = 1.7 * dt;
    this.heading += Math.max(-turn, Math.min(turn, diff));
    this.speed += (goal - this.speed) * Math.min(1, dt * 2);
    this.x += Math.cos(this.heading) * this.speed * dt;
    this.z += Math.sin(this.heading) * this.speed * dt;
    this.phase += dt * (2.5 + this.speed * 5);
    this.group.position.set(this.x, -0.3 + Math.sin(time * 0.7 + this.id) * 0.03, this.z);
    this.group.rotation.y = -this.heading;
    this.s1.rotation.y = Math.sin(this.phase) * 0.1;
    this.s2.rotation.y = Math.sin(this.phase - 0.9) * 0.3;
    this.s3.rotation.y = Math.sin(this.phase - 1.8) * 0.45;
  }
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */
export interface FrameInfo {
  x: number;
  z: number;
  fx: number;
  fz: number;
  idx: number;
}
export interface Mood {
  daylight: number;
  night: number;
  snow: number;
  season: Season;
  pond: number;
  courtyard: number;
  inside: number;
}
export interface EngineCallbacks {
  onProgress?: (p: number) => void;
  onFrame?: (f: FrameInfo) => void;
  onMood?: (m: Mood) => void;
  onSplash?: () => void;
  onLamp?: (on: boolean) => void;
}

interface Lamp {
  mat: THREE.MeshStandardMaterial;
  halo: THREE.Sprite;
  override: boolean | null;
  glow: number;
  kind: "lantern" | "lamp";
  pos: THREE.Vector3;
}

interface SnowReg {
  mat: THREE.MeshStandardMaterial;
  base: THREE.Color;
  k: number;
}

export class SeijakuEngine {
  canvas: HTMLCanvasElement;
  cb: EngineCallbacks;
  renderer!: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  walkCam = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  orbitCam = new THREE.PerspectiveCamera(42, 1, 0.1, 900);
  controls!: OrbitControls;
  posCurve: THREE.CatmullRomCurve3;
  lookCurve: THREE.CatmullRomCurve3;

  season: Season = "spring";
  hour: Hour = "noon";
  cur: Env = makeEnv("spring", "noon");
  tgt: Env = makeEnv("spring", "noon");

  targetT = 0;
  curT = 0;
  pointer = new THREE.Vector2();
  pm = new THREE.Vector2();
  inspecting = false;
  cutaway = false;
  blend = 0;
  lift = 0;
  active = true;
  ready = false;
  disposed = false;
  time = 0;
  idx = 0;
  gust = 0;
  windDir = 0;
  focusGoal: { target: THREE.Vector3; dist: number } | null = null;

  base: Record<string, THREE.Texture> = {};
  snowRegs: SnowReg[] = [];
  shojiMats: THREE.MeshStandardMaterial[] = [];
  lamps: Lamp[] = [];
  pickables: THREE.Object3D[] = [];
  roofGroup = new THREE.Group();
  house = new THREE.Group();

  sun!: THREE.DirectionalLight;
  hemi!: THREE.HemisphereLight;
  inner!: THREE.PointLight;
  sky!: THREE.Mesh;
  skyMat!: THREE.ShaderMaterial;
  waterMat!: THREE.ShaderMaterial;
  ripples: THREE.Vector4[] = Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, -100, 0));
  ripIdx = 0;
  koi: Koi[] = [];
  foods: Food[] = [];
  foodPool: THREE.Mesh[] = [];

  mapleMat!: THREE.MeshStandardMaterial;
  cherryMat!: THREE.MeshStandardMaterial;
  pineMat!: THREE.MeshStandardMaterial;
  pineSnowMat!: THREE.MeshStandardMaterial;
  mapleMesh?: THREE.InstancedMesh;
  cherryMesh?: THREE.InstancedMesh;
  pineSnowMesh?: THREE.InstancedMesh;
  mossMat!: THREE.MeshStandardMaterial;
  leafMat!: THREE.MeshBasicMaterial;
  leafMesh!: THREE.InstancedMesh;
  leafN = 340;
  leafPos = new Float32Array(340 * 3);
  leafVel = new Float32Array(340 * 3);
  leafPh = new Float32Array(340 * 2);

  raycaster = new THREE.Raycaster();
  downAt = new THREE.Vector2();
  lastMood = 0;
  frameTimes: number[] = [];
  pixelRatio = 1;
  lastT = 0;
  raf = 0;
  lastCursorCheck = 0;

  private dummy = new THREE.Object3D();
  private rand = TX.rng(4242);

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks = {}) {
    this.canvas = canvas;
    this.cb = cb;
    this.posCurve = new THREE.CatmullRomCurve3(KEYFRAMES.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
    this.lookCurve = new THREE.CatmullRomCurve3(KEYFRAMES.map((k) => new THREE.Vector3(...k.look)), false, "centripetal");
  }

  /* ---------------- init ---------------- */
  async init() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer = r;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    r.setPixelRatio(this.pixelRatio);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    this.resize();

    this.scene.fog = new THREE.Fog(0xcccccc, 60, 260);
    this.scene.add(this.house);
    this.scene.add(this.roofGroup);

    this.cb.onProgress?.(0.04);
    await tick();
    this.makeTextures();
    this.makeLights();
    this.makeSky();
    this.cb.onProgress?.(0.14);
    await tick();

    this.buildGround();
    this.cb.onProgress?.(0.3);
    await tick();

    this.buildHouse();
    this.cb.onProgress?.(0.5);
    await tick();

    this.buildFurniture();
    this.cb.onProgress?.(0.62);
    await tick();

    this.buildGardens();
    this.cb.onProgress?.(0.78);
    await tick();

    this.buildPond();
    this.buildLeaves();
    this.cb.onProgress?.(0.88);
    await tick();

    // controls
    this.orbitCam.position.set(34, 22, 40);
    this.controls = new OrbitControls(this.orbitCam, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.target.set(0, 1.5, -14);
    this.controls.minDistance = 8;
    this.controls.maxDistance = 120;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.enabled = false;
    this.controls.addEventListener("start", () => (this.focusGoal = null));

    // warm shaders + geometry before reveal
    lerpEnv(this.cur, this.tgt, 1);
    this.applyEnv(0.016);
    this.updateCamera(0.016);
    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
    await tick();
    for (const k of [0.3, 0.7, 1]) {
      this.curT = k;
      this.updateCamera(0.016);
      this.renderer.render(this.scene, this.camera);
    }
    this.curT = this.targetT;
    this.updateCamera(0.016);
    this.cb.onProgress?.(1);

    window.addEventListener("resize", this.resize);
    window.addEventListener("pointermove", this.onMove, { passive: true });
    window.addEventListener("pointerdown", this.onDown, { passive: true });
    window.addEventListener("pointerup", this.onUp, { passive: true });
    this.ready = true;
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointerup", this.onUp);
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  /* ---------------- public API ---------------- */
  setSeason(s: Season) {
    this.season = s;
    this.tgt = makeEnv(s, this.hour);
  }
  setHour(h: Hour) {
    this.hour = h;
    this.tgt = makeEnv(this.season, h);
  }
  setScroll(t: number) {
    this.targetT = Math.max(0, Math.min(1, t));
  }
  setInspect(v: boolean) {
    if (v === this.inspecting) return;
    this.inspecting = v;
    if (v && this.controls) {
      this.controls.enabled = true;
      this.focusGoal = null;
    } else if (this.controls) {
      this.controls.enabled = false;
      this.cutaway = false;
    }
  }
  setCutaway(v: boolean) {
    this.cutaway = v;
  }
  setActive(v: boolean) {
    this.active = v;
  }
  focusRoom(id: string) {
    if (id === "pond") {
      this.focusGoal = { target: new THREE.Vector3(POND.cx, 0, POND.cz), dist: 34 };
      return;
    }
    if (id === "front") {
      this.focusGoal = { target: new THREE.Vector3(-1, 1, 17), dist: 34 };
      return;
    }
    const r = ROOMS.find((x) => x.id === id);
    if (!r) return;
    this.focusGoal = { target: new THREE.Vector3(0, 1.2, (r.z0 + r.z1) / 2), dist: 20 };
  }
  resetInspect() {
    this.focusGoal = { target: new THREE.Vector3(0, 1.5, -14), dist: 66 };
  }

  /* ---------------- events ---------------- */
  resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const a = w / h;
    for (const c of [this.camera, this.walkCam, this.orbitCam]) {
      c.aspect = a;
      c.updateProjectionMatrix();
    }
  };

  onMove = (e: PointerEvent) => {
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    if (e.target === this.canvas && e.timeStamp - this.lastCursorCheck > 60) {
      this.lastCursorCheck = e.timeStamp;
      const hit = this.pick();
      this.canvas.style.cursor = hit ? "pointer" : this.inspecting ? "grab" : "default";
    }
  };
  onDown = (e: PointerEvent) => {
    this.downAt.set(e.clientX, e.clientY);
  };
  onUp = (e: PointerEvent) => {
    if (e.target !== this.canvas || !this.ready) return;
    if (Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 6) return;
    const hit = this.pick();
    if (hit?.type === "lamp") {
      const lamp = this.lamps[hit.idx];
      const effective = lamp.glow > 0.4;
      lamp.override = !effective;
      this.cb.onLamp?.(lamp.override);
      return;
    }
    if (hit?.type === "pond") {
      this.addRipple(hit.x, hit.z, 1);
      this.dropFood(hit.x, hit.z);
      this.cb.onSplash?.();
      return;
    }
    this.gust = 1;
    this.windDir = (this.pointer.x > 0 ? 1 : -1) * 0.6;
  };

  pick(): { type: "lamp"; idx: number } | { type: "pond"; x: number; z: number } | null {
    if (!this.ready) return null;
    const cam = this.camera;
    this.raycaster.setFromCamera(this.pointer, cam);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    if (hits.length) {
      const idx = hits[0].object.userData.lamp as number;
      if (idx !== undefined && hits[0].distance < 40) return { type: "lamp", idx };
    }
    const p = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) {
      const ex = (p.x - POND.cx) / POND.rx;
      const ez = (p.z - POND.cz) / POND.rz;
      if (ex * ex + ez * ez < 0.95) return { type: "pond", x: p.x, z: p.z };
    }
    return null;
  }

  addRipple(x: number, z: number, s: number) {
    this.ripples[this.ripIdx].set(x, z, this.time, s);
    this.ripIdx = (this.ripIdx + 1) % this.ripples.length;
  }

  dropFood(x: number, z: number) {
    for (let i = 0; i < 4; i++) {
      const m = this.foodPool.find((p) => !p.visible);
      if (!m) return;
      const fx = x + (Math.random() - 0.5) * 1.1;
      const fz = z + (Math.random() - 0.5) * 1.1;
      m.visible = true;
      m.position.set(fx, 0.05, fz);
      this.foods.push({ mesh: m, x: fx, z: fz, life: 14 });
    }
  }

  /* ---------------- textures & materials ---------------- */
  private reg(name: string, c: HTMLCanvasElement) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.base[name] = t;
  }

  tx(name: string, rx = 1, ry = 1, rot = 0) {
    const t = this.base[name].clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    if (rot) {
      t.center.set(0.5, 0.5);
      t.rotation = rot;
    }
    return t;
  }

  private makeTextures() {
    this.reg("hinoki", TX.wood(512, "#e2c494", "#9a7346", 1));
    this.reg("hinokiV", TX.wood(512, "#e2c494", "#9a7346", 1, true));
    this.reg("cedarV", TX.wood(512, "#b98a5a", "#6a4526", 2, true, 4));
    this.reg("dark", TX.wood(512, "#5d4130", "#2a1a10", 3));
    this.reg("tatami", TX.tatami(512));
    this.reg("shoji", TX.shoji());
    this.reg("plaster", TX.plaster(512));
    this.reg("earth", TX.earth(512));
    this.reg("gravel", TX.gravel(512));
    this.reg("rake", TX.rake(512));
    this.reg("moss", TX.moss(512));
    this.reg("roof", TX.roofTile(512));
    this.reg("stone", TX.stone(512));
    this.reg("linen", TX.linen(512, 37, 4));
    this.reg("scroll", TX.scrollPainting());
    this.reg("halo", TX.halo());
  }

  private std(map: THREE.Texture | null, opts: THREE.MeshStandardMaterialParameters = {}) {
    return new THREE.MeshStandardMaterial({ map, roughness: 0.85, metalness: 0, ...opts });
  }

  private snowy(mat: THREE.MeshStandardMaterial, k = 1) {
    this.snowRegs.push({ mat, base: mat.color.clone(), k });
    return mat;
  }

  private shojiMat(len: number) {
    const t = this.tx("shoji", len / 0.9, 1);
    const m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color("#fff3dc"), emissiveIntensity: 0.5, roughness: 0.95, side: THREE.DoubleSide });
    this.shojiMats.push(m);
    return m;
  }

  M: Record<string, THREE.MeshStandardMaterial> = {};

  private makeLights() {
    this.hemi = new THREE.HemisphereLight(0xe8f0ff, 0xab9d85, 1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.05;
    const sc = this.sun.shadow.camera;
    sc.near = 1;
    sc.far = 220;
    sc.left = sc.bottom = -28;
    sc.right = sc.top = 28;
    this.scene.add(this.sun, this.sun.target);
    this.inner = new THREE.PointLight(0xffd9a8, 0, 12, 1.6);
    this.scene.add(this.inner);

    const M = this.M;
    M.wood = this.std(this.tx("hinoki"));
    M.woodV = this.std(this.tx("hinokiV"));
    M.dark = this.std(this.tx("dark"), { roughness: 0.7 });
    M.plaster = this.std(this.tx("plaster", 2, 1));
    M.stone = this.snowy(this.std(this.tx("stone", 2, 2), { roughness: 0.95 }), 0.9);
    M.stoneRock = this.snowy(this.std(this.tx("stone", 1, 1), { roughness: 0.95, flatShading: true }), 0.9);
    M.earth = this.std(this.tx("earth", 6, 1));
    M.linen = this.std(this.tx("linen", 1, 1), { roughness: 1 });
    M.white = this.std(null, { color: "#efe9dc", roughness: 1 });
    M.iron = this.std(null, { color: "#1d1d20", roughness: 0.45, metalness: 0.7 });
    M.bamboo = this.std(null, { color: "#b9b36a", roughness: 0.6 });
    M.ceramic = this.std(null, { color: "#3a3f46", roughness: 0.3, metalness: 0.1 });
    M.water = this.std(null, { color: "#6f9ea4", roughness: 0.1, transparent: true, opacity: 0.85 });
  }

  private makeSky() {
    const geo = new THREE.SphereGeometry(450, 32, 18);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color() },
        uBot: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunCol: { value: new THREE.Color() },
        uStars: { value: 0 },
        uSunAmt: { value: 1 },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uStars; uniform float uSunAmt;
        float hash(vec3 p){ p = fract(p*.3183099+.1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0., 1.);
          vec3 col = mix(uBot, uTop, pow(h, .5));
          float s = max(dot(d, normalize(uSunDir)), 0.);
          col += uSunCol * (pow(s, 900.) * 1.6 + pow(s, 14.) * .28 * uSunAmt + pow(s, 3.) * .07 * uSunAmt);
          float st = step(.9978, hash(floor(d*240.))) * uStars * smoothstep(.03, .3, d.y);
          col += vec3(st);
          col = mix(col, uBot, smoothstep(0., -.08, d.y));
          gl_FragColor = vec4(col, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(geo, this.skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }

  /* ---------------- geometry helpers ---------------- */
  private box(parent: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, cast = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  private instanced(geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], colors?: THREE.Color[], cast = true) {
    const im = new THREE.InstancedMesh(geo, mat, mats.length);
    mats.forEach((m, i) => {
      im.setMatrixAt(i, m);
      if (colors) im.setColorAt(i, colors[i]);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = cast;
    im.receiveShadow = true;
    im.frustumCulled = false;
    return im;
  }

  private mtx(x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) {
    const d = this.dummy;
    d.position.set(x, y, z);
    d.scale.set(sx, sy, sz);
    d.rotation.set(rx, ry, rz);
    d.updateMatrix();
    return d.matrix.clone();
  }

  private shade(lo = 0.75, hi = 1.1) {
    return new THREE.Color().setScalar(lo + this.rand() * (hi - lo));
  }

  /* ---------------- ground & paths ---------------- */
  private buildGround() {
    // ground with elliptical pond hole
    const R = 160;
    const shape = new THREE.Shape();
    shape.moveTo(-R, -R);
    shape.lineTo(R, -R);
    shape.lineTo(R, R);
    shape.lineTo(-R, R);
    shape.lineTo(-R, -R);
    const hole = new THREE.Path();
    hole.absellipse(POND.cx, -POND.cz, POND.rx * 0.985, POND.rz * 0.985, 0, Math.PI * 2, true, 0);
    shape.holes.push(hole);
    const geo = new THREE.ShapeGeometry(shape, 48);
    const mat = this.snowy(this.std(this.tx("gravel", 1 / 5, 1 / 5), { color: "#d9d4c6", roughness: 1 }), 0.95);
    // ShapeGeometry uvs are in world units; repeat handled above
    const g = new THREE.Mesh(geo, mat);
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    this.scene.add(g);

    // pond bottom
    const bot = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 48),
      new THREE.MeshStandardMaterial({ color: "#20302f", roughness: 1 }),
    );
    bot.rotation.x = -Math.PI / 2;
    bot.scale.set(POND.rx * 1.02, POND.rz * 1.02, 1);
    bot.position.set(POND.cx, -0.7, POND.cz);
    this.scene.add(bot);

    // raked gravel beds (courtyard + front yard)
    const rakeMat = this.snowy(this.std(this.tx("rake", 4.5 / 2.4, 7 / 2.4), { color: "#e5e1d4", roughness: 1 }), 0.9);
    const court = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 7), rakeMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(3.25, 0.02, -7.5);
    court.receiveShadow = true;
    this.scene.add(court);

    const yardMat = this.snowy(this.std(this.tx("rake", 16 / 3, 13 / 3, Math.PI / 2), { color: "#e5e1d4", roughness: 1 }), 0.9);
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(16, 13), yardMat);
    yard.rotation.x = -Math.PI / 2;
    yard.position.set(-1, 0.02, 15.5);
    yard.receiveShadow = true;
    this.scene.add(yard);

    // moss patches
    this.mossMat = this.std(this.tx("moss", 2, 2), { color: "#6d9c3c", roughness: 1 });
    const patches: [number, number, number, number][] = [
      [-10, 20, 5, 3.5],
      [8, 19, 4.5, 3],
      [-13, 6, 4, 6],
      [11, 4, 4, 5],
      [13, -14, 5, 7],
      [-12, -16, 4, 8],
      [-9, -42, 6, 4],
      [15, -40, 5, 3],
      [-14, -55, 6, 5],
      [18, -58, 5, 3],
      [-4, 38, 6, 3],
      [9, 34, 5, 3],
      [-12, 34, 4, 4],
      [14, 46, 6, 4],
    ];
    patches.forEach(([x, z, rx, rz], i) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), this.mossMat);
      m.rotation.x = -Math.PI / 2;
      m.scale.set(rx, rz, 1);
      m.position.set(x, 0.03 + i * 0.002, z);
      m.receiveShadow = true;
      this.scene.add(m);
    });

    // moss mounds
    const mats: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];
    const curve = new THREE.CatmullRomCurve3(FRONT_PATH.map((p) => new THREE.Vector3(p[0], 0, p[1])));
    const pathPts = curve.getPoints(80);
    for (let i = 0; i < 170; i++) {
      const x = (this.rand() - 0.5) * 50;
      const z = 52 - this.rand() * 130;
      if (this.nearHouse(x, z, 2) || this.inPond(x, z, 1.05)) continue;
      if (z > 8 && pathPts.some((p) => Math.hypot(p.x - x, p.z - z) < 2.2)) continue;
      if (x > 0.5 && x < 6 && z < -3 && z > -12) continue;
      const s = 0.4 + this.rand() * 0.9;
      mats.push(this.mtx(x, 0, z, s, s * 0.35, s * (0.8 + this.rand() * 0.5), 0, this.rand() * 3));
      cols.push(this.shade(0.7, 1.15));
    }
    this.scene.add(this.instanced(new THREE.SphereGeometry(1, 10, 6), this.mossMat, mats, cols, false));

    // stepping stones (front)
    this.steppingStones(FRONT_PATH, 0.95);
    this.steppingStones(BACK_PATH, 0.9);
    // entrance stone + pond-side stones
    this.box(this.scene, 2.6, 0.12, 1.1, this.M.stone, -1.5, 0.06, 8.0);
    this.box(this.scene, 2.2, 0.1, 0.9, this.M.stone, -1.5, 0.05, 9.2);
  }

  private nearHouse(x: number, z: number, m = 0) {
    return x > HX0 - 2.5 - m && x < HX1 + 2.5 + m && z < 11 + m && z > -40 - m;
  }
  private inPond(x: number, z: number, k = 1) {
    const ex = (x - POND.cx) / POND.rx;
    const ez = (z - POND.cz) / POND.rz;
    return ex * ex + ez * ez < k * k;
  }

  private steppingStones(pts: [number, number][], spacing: number) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])));
    const L = curve.getLength();
    const n = Math.floor(L / spacing);
    const mats: THREE.Matrix4[] = [];
    const cols: THREE.Color[] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      const off = (i % 2 ? 1 : -1) * 0.13;
      const a = Math.atan2(t.x, t.z);
      const sx = 0.42 + this.rand() * 0.14;
      const sz = 0.34 + this.rand() * 0.12;
      mats.push(this.mtx(p.x + Math.cos(a) * off, 0.04, p.z - Math.sin(a) * off, sx, 0.14, sz, 0, a + (this.rand() - 0.5) * 0.6));
      cols.push(this.shade(0.8, 1.15));
    }
    this.scene.add(this.instanced(new THREE.CylinderGeometry(1, 1.05, 1, 8), this.M.stone, mats, cols, false));
  }

  /* ---------------- house ---------------- */
  private posts(g: THREE.Object3D, pts: [number, number][]) {
    for (const [x, z] of pts) this.box(g, 0.22, CEIL_H, 0.22, this.M.dark, x, Y + CEIL_H / 2, z);
  }

  private wallZ(x: number, z0: number, z1: number, type: "shoji" | "plaster" | "window" | "open") {
    const len = z0 - z1;
    const cz = (z0 + z1) / 2;
    const g = new THREE.Group();
    g.position.set(x, Y, cz);
    this.house.add(g);
    if (type === "shoji") {
      this.box(g, 0.12, 0.55, len, this.M.dark, 0, 0.275, 0);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.75), this.shojiMat(len));
      p.rotation.y = Math.PI / 2;
      p.position.y = 0.55 + 0.875;
      g.add(p);
      this.box(g, 0.12, 0.3, len, this.M.dark, 0, 2.45, 0);
    } else if (type === "plaster") {
      this.box(g, 0.16, CEIL_H, len, this.M.plaster, 0, CEIL_H / 2, 0);
    } else if (type === "window") {
      this.box(g, 0.14, 0.9, len, this.M.dark, 0, 0.45, 0);
      this.box(g, 0.14, 0.3, len, this.M.dark, 0, 2.45, 0);
      const n = Math.floor(len / 0.22);
      const mats: THREE.Matrix4[] = [];
      for (let i = 0; i < n; i++) mats.push(this.mtx(0, 1.6, -len / 2 + ((i + 0.5) * len) / n, 0.035, 1.4, 0.035));
      g.add(this.instanced(new THREE.BoxGeometry(1, 1, 1), this.M.dark, mats, undefined, false));
      this.box(g, 0.1, 0.05, len, this.M.dark, 0, 1.0, 0, false);
    } else {
      this.box(g, 0.14, 0.08, len, this.M.dark, 0, 0.04, 0);
    }
  }

  private wallX(z: number, type: "shoji" | "plaster") {
    const g = new THREE.Group();
    g.position.set(0, Y, z);
    this.house.add(g);
    const pieces: [number, number][] = [
      [HX0, DOOR.x0],
      [DOOR.x1, HX1],
    ];
    for (const [a, b] of pieces) {
      const len = b - a;
      const cx = (a + b) / 2;
      if (type === "shoji") {
        this.box(g, len, 0.55, 0.12, this.M.dark, cx, 0.275, 0);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.75), this.shojiMat(len));
        p.position.set(cx, 0.55 + 0.875, 0);
        g.add(p);
        this.box(g, len, 0.3, 0.12, this.M.dark, cx, 2.45, 0);
      } else {
        this.box(g, len, CEIL_H, 0.16, this.M.plaster, cx, CEIL_H / 2, 0);
      }
    }
    // header above the doorway (kamoi) + sill
    this.box(g, DOOR.x1 - DOOR.x0, 0.62, 0.14, this.M.dark, (DOOR.x0 + DOOR.x1) / 2, 2.29, 0);
    this.box(g, DOOR.x1 - DOOR.x0, 0.03, 0.2, this.M.dark, (DOOR.x0 + DOOR.x1) / 2, 0.015, 0);
    // jambs
    this.posts(g, []);
    this.box(g, 0.2, CEIL_H, 0.2, this.M.dark, DOOR.x0, CEIL_H / 2, 0);
    this.box(g, 0.2, CEIL_H, 0.2, this.M.dark, DOOR.x1, CEIL_H / 2, 0);
  }

  private gableRoof(L: number, half: number, rise: number, baseY: number) {
    const g = new THREE.Group();
    const slope = Math.hypot(half, rise);
    const a = Math.atan2(rise, half);
    const thick = 0.2;
    for (const s of [-1, 1]) {
      const tile = this.snowy(this.std(this.tx("roof", slope / 2.4, L / 2.4), { roughness: 0.6 }), 1);
      const mats = [this.M.dark, this.M.dark, tile, this.M.wood, this.M.dark, this.M.dark];
      const m = this.box(g, slope, thick, L, mats, (s * half) / 2, baseY + rise / 2, 0);
      m.rotation.z = -s * a;
    }
    const capMat = this.snowy(this.std(this.tx("roof", 0.3, L / 2.4), { roughness: 0.6 }), 1);
    this.box(g, 0.5, 0.24, L, capMat, 0, baseY + rise + 0.06, 0);
    return g;
  }

  private pentagon(z: number, faceFront: boolean) {
    const s = new THREE.Shape();
    s.moveTo(-6.3, 0);
    s.lineTo(6.3, 0);
    s.lineTo(6.3, 0.4);
    s.lineTo(0, 2.12);
    s.lineTo(-6.3, 0.4);
    s.lineTo(-6.3, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ map: this.tx("plaster", 2, 0.6), side: THREE.DoubleSide, roughness: 1 }));
    m.position.set(0, Y + CEIL_H, z);
    if (!faceFront) m.rotation.y = Math.PI;
    m.receiveShadow = true;
    this.roofGroup.add(m);
    // timber frame on the gable
    const frame = this.box(this.roofGroup, 12.6, 0.12, 0.14, this.M.dark, 0, Y + CEIL_H + 0.3, z);
    frame.castShadow = false;
    const king = this.box(this.roofGroup, 0.14, 1.9, 0.14, this.M.dark, 0, Y + CEIL_H + 1.0, z);
    king.castShadow = false;
  }

  private buildHouse() {
    const M = this.M;
    const h = this.house;

    // plinth
    const plinth = (x0: number, x1: number, z0: number, z1: number) => this.box(h, x1 - x0, 0.4, z0 - z1, M.stone, (x0 + x1) / 2, 0.2, (z0 + z1) / 2);
    plinth(HX0 - 0.2, HX0 + 0.1, 7.2, -34.2);
    plinth(HX1 - 0.1, HX1 + 0.2, 7.2, -4);
    plinth(HX1 - 0.1, HX1 + 0.2, -11, -34.2);
    plinth(HX0 - 0.2, DOOR.x0, 7.2, 6.9);
    plinth(DOOR.x1, HX1 + 0.2, 7.2, 6.9);
    plinth(HX0 - 0.2, HX1 + 0.2, -33.9, -34.2);
    plinth(0.85, 1.1, -4, -11);

    // floors
    const floor = (x0: number, x1: number, z0: number, z1: number, mat: THREE.Material, top = Y, th = 0.12) => {
      const m = this.box(h, x1 - x0, th, z0 - z1, mat, (x0 + x1) / 2, top - th / 2, (z0 + z1) / 2, false);
      return m;
    };
    // genkan stone (one step below)
    floor(HX0, HX1, 7, 4, this.snowy(this.std(this.tx("stone", 4, 1.2), { roughness: 0.9 }), 0.3), 0.12, 0.12);
    this.box(h, HX1 - HX0, Y - 0.12, 0.15, M.dark, 0, (Y + 0.12) / 2, 4.0, false);
    // tatami rooms
    const tat = (x0: number, x1: number, z0: number, z1: number) =>
      floor(x0, x1, z0, z1, this.std(this.tx("tatami", (x1 - x0) / 1.8, (z0 - z1) / 1.8), { roughness: 1 }));
    tat(HX0, HX1, 4, -4);
    tat(HX0, HX1, -20, -28);
    // hall strip
    floor(HX0, 0.9, -4, -11, this.std(this.tx("cedarV", (0.9 - HX0) / 2, 7 / 2), { roughness: 0.75 }));
    // living cedar
    floor(HX0, HX1, -11, -20, this.std(this.tx("cedarV", 11 / 2, 9 / 2), { roughness: 0.7 }));
    // bath stone
    floor(HX0, HX1, -28, -34, this.snowy(this.std(this.tx("stone", 4, 2.4), { roughness: 0.8, color: "#9aa2a0" }), 0.2));
    // deck
    floor(HX0 - 0.5, HX1 + 0.5, -34, -37.6, this.std(this.tx("cedarV", 12 / 2, 3.6 / 2), { roughness: 0.8 }));
    this.box(h, HX1 - HX0 + 1.4, 0.4, 0.3, M.stone, 0, 0.2, -37.75);
    // deck steps
    this.box(h, 4.2, 0.3, 0.7, M.stone, -1.6, 0.15, -38.1);
    this.box(h, 4.6, 0.15, 0.7, M.stone, -1.6, 0.075, -38.75);
    // hall step stone
    this.box(h, 1.2, 0.22, 1.6, M.stone, 1.6, 0.11, -7.5);

    // side walls
    this.wallZ(HX0, 7, 4, "plaster");
    this.wallZ(HX0, 4, -4, "shoji");
    this.wallZ(HX0, -4, -11, "shoji");
    this.wallZ(HX0, -11, -20, "window");
    this.wallZ(HX0, -20, -28, "shoji");
    this.wallZ(HX0, -28, -34, "plaster");
    this.wallZ(HX1, 7, 4, "plaster");
    this.wallZ(HX1, 4, -4, "shoji");
    this.wallZ(HX1, -4, -11, "open");
    this.wallZ(HX1, -11, -20, "shoji");
    this.wallZ(HX1, -20, -28, "window");
    this.wallZ(HX1, -28, -34, "window");
    // partitions
    this.wallX(7, "shoji");
    this.wallX(-4, "shoji");
    this.wallX(-11, "shoji");
    this.wallX(-20, "shoji");
    this.wallX(-28, "plaster");
    this.wallX(-34, "shoji");

    // posts & beams
    const zs = [7, 4, 0, -4, -7.5, -11, -15.5, -20, -24, -28, -34];
    const pts: [number, number][] = [];
    zs.forEach((z) => {
      pts.push([HX0, z]);
      if (!(z < -4 && z > -11)) pts.push([HX1, z]);
    });
    pts.push([HX1, -4], [HX1, -11], [HX1, -7.5]);
    pts.push([HX0 - 0.5, -37.6], [HX1 + 0.5, -37.6]);
    this.posts(h, pts);
    const top = Y + CEIL_H - 0.08;
    this.box(h, 0.26, 0.16, 41.4, M.dark, HX0, top, -13.5);
    this.box(h, 0.26, 0.16, 11, M.dark, HX1, top, 1.5);
    this.box(h, 0.26, 0.16, 23.4, M.dark, HX1, top, -22.5);
    for (const z of [7, -4, -11, -20, -28, -34, -37.6]) this.box(h, 12, 0.16, 0.22, M.dark, 0, top, z);

    // ceilings + roofs (lift together in cutaway)
    const rg = this.roofGroup;
    const ceil = (x0: number, x1: number, z0: number, z1: number) => this.box(rg, x1 - x0, 0.1, z0 - z1, this.std(this.tx("hinoki", (x1 - x0) / 2, (z0 - z1) / 2), { roughness: 0.8 }), (x0 + x1) / 2, Y + CEIL_H + 0.05, (z0 + z1) / 2);
    ceil(-7.2, 7.2, 8.8, -4.8);
    ceil(-7.2, 7.2, -10.4, -38.6);
    // lean-to over the hall
    const flatTile = this.snowy(this.std(this.tx("roof", 8.4 / 2.4, 6.6 / 2.4), { roughness: 0.6 }), 1);
    this.box(rg, 8.6, 0.3, 6.6, [M.dark, M.dark, flatTile, M.wood, M.dark, M.dark], (-7.2 + 1.4) / 2, Y + CEIL_H + 0.2, -7.5);

    const roofA = this.gableRoof(13.6, 7.3, 2.0, Y + CEIL_H + 0.3);
    roofA.position.z = 2;
    rg.add(roofA);
    const roofB = this.gableRoof(28.2, 7.3, 2.0, Y + CEIL_H + 0.3);
    roofB.position.z = -24.5;
    rg.add(roofB);

    this.pentagon(7, true);
    this.pentagon(-4.05, false);
    this.pentagon(-11.05, true);
    this.pentagon(-37.6, false);

    // gate + earthen wall
    this.buildGate();
  }

  private buildGate() {
    const M = this.M;
    const gx = GATE.x;
    const gz = GATE.z;
    const half = GATE.w / 2 + 0.3;
    const g = new THREE.Group();
    this.scene.add(g);
    for (const s of [-1, 1]) this.box(g, 0.4, 3.3, 0.4, M.dark, gx + s * half, 1.65, gz);
    this.box(g, half * 2 + 0.8, 0.3, 0.45, M.dark, gx, 3.05, gz);
    this.box(g, half * 2 + 0.2, 0.22, 0.3, M.dark, gx, 2.55, gz);
    for (const s of [-1, 1]) this.box(g, 0.14, 0.14, 2.4, M.dark, gx + s * half, 3.15, gz);
    const roof = this.gableRoof(half * 2 + 2.2, 1.9, 0.85, 3.3);
    roof.rotation.y = Math.PI / 2;
    roof.position.set(gx, 0, gz);
    g.add(roof);
    // walls
    const wl = 44;
    const earthMat = this.snowy(this.std(this.tx("earth", 14, 1), { roughness: 1 }), 0.7);
    const capMat = this.snowy(this.std(this.tx("roof", 14, 0.4), { roughness: 0.6 }), 1);
    const segs: [number, number][] = [
      [gx - half - 0.2 - wl, gx - half - 0.2],
      [gx + half + 0.2, gx + half + 0.2 + wl],
    ];
    for (const [a, b] of segs) {
      this.box(g, b - a, 2.3, 0.45, earthMat, (a + b) / 2, 1.15, gz);
      this.box(g, b - a, 0.14, 0.75, [M.dark, M.dark, capMat, M.dark, M.dark, M.dark], (a + b) / 2, 2.4, gz);
    }
    // threshold stone + lantern-by-gate
  }

  /* ---------------- furniture & props ---------------- */
  private addLamp(mesh: THREE.Mesh, mat: THREE.MeshStandardMaterial, kind: "lantern" | "lamp", scale: number, pos: THREE.Vector3) {
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.base.halo, color: 0xffb35c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.scale.setScalar(scale);
    halo.position.copy(pos);
    halo.visible = false;
    this.scene.add(halo);
    const idx = this.lamps.length;
    this.lamps.push({ mat, halo, override: null, glow: 0, kind, pos });
    mesh.userData.lamp = idx;
    this.pickables.push(mesh);
  }

  private lampMat() {
    return new THREE.MeshStandardMaterial({ color: "#efe2c3", emissive: new THREE.Color("#ffb05a"), emissiveIntensity: 0, roughness: 0.9 });
  }

  private buildFurniture() {
    const M = this.M;
    const h = this.house;
    const cushion = (x: number, z: number, rot = 0) => {
      const m = this.box(h, 0.66, 0.09, 0.66, M.linen, x, Y + 0.05, z);
      m.rotation.y = rot;
    };

    /* tea room: hearth + tokonoma */
    const hx = -3.4;
    const hz = 1.0;
    this.box(h, 0.95, 0.04, 0.95, M.dark, hx, Y + 0.02, hz, false);
    this.box(h, 0.75, 0.05, 0.75, this.std(null, { color: "#6c6a66", roughness: 1 }), hx, Y + 0.01, hz, false);
    const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), M.iron);
    kettle.scale.y = 0.85;
    kettle.position.set(hx, Y + 0.2, hz);
    kettle.castShadow = true;
    h.add(kettle);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.2, 8), M.iron);
    spout.position.set(hx + 0.2, Y + 0.28, hz);
    spout.rotation.z = -0.9;
    h.add(spout);
    cushion(hx + 1.4, hz + 0.5, 0.3);
    cushion(hx + 1.2, hz - 1.0, -0.2);
    cushion(hx - 0.2, hz + 1.5, 0.1);

    // tokonoma alcove
    this.box(h, 1.0, 0.3, 2.3, M.wood, HX0 + 0.58, Y + 0.15, -1);
    const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.75), new THREE.MeshStandardMaterial({ map: this.tx("scroll"), roughness: 1 }));
    scroll.rotation.y = Math.PI / 2;
    scroll.position.set(HX0 + 0.1, Y + 1.35, -1);
    h.add(scroll);
    this.box(h, 0.03, 1.95, 0.85, M.dark, HX0 + 0.04, Y + 1.3, -1, false);
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.3, 14), M.ceramic);
    vase.position.set(HX0 + 0.65, Y + 0.45, -1.5);
    vase.castShadow = true;
    h.add(vase);
    // seasonal branch
    const br = this.std(null, { color: "#4a3425", roughness: 1 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 1.0, 5), br);
    stem.position.set(HX0 + 0.72, Y + 0.95, -1.5);
    stem.rotation.z = -0.25;
    h.add(stem);
    const stem2 = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.6, 5), br);
    stem2.position.set(HX0 + 0.78, Y + 1.0, -1.55);
    stem2.rotation.z = 0.5;
    h.add(stem2);
    this.ikebana = [];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.038 + this.rand() * 0.02, 8, 6), this.getCherryMat());
      m.position.set(HX0 + 0.6 + this.rand() * 0.35, Y + 0.85 + this.rand() * 0.6, -1.5 + (this.rand() - 0.5) * 0.3);
      h.add(m);
    }

    /* living room */
    const tableTop = this.box(h, 1.8, 0.07, 0.95, M.dark, 2.6, Y + 0.38, -15);
    tableTop.rotation.y = 0.05;
    this.box(h, 0.12, 0.34, 0.8, M.dark, 1.85, Y + 0.18, -15);
    this.box(h, 0.12, 0.34, 0.8, M.dark, 3.35, Y + 0.18, -15);
    cushion(2.6, -13.8, 0.05);
    cushion(2.6, -16.2, -0.05);
    cushion(1.2, -15, 1.5);
    cushion(4.0, -15, 1.4);
    // teapot on table
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), M.ceramic);
    pot.position.set(2.5, Y + 0.49, -15);
    pot.scale.y = 0.8;
    pot.castShadow = true;
    h.add(pot);
    for (const dx of [-0.35, 0.3]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.05, 10), M.white);
      cup.position.set(2.6 + dx, Y + 0.445, -14.85);
      h.add(cup);
    }
    // low shelf
    this.box(h, 0.5, 0.8, 3.0, M.dark, HX1 - 0.4, Y + 0.4, -17);
    this.box(h, 0.46, 0.05, 2.9, M.wood, HX1 - 0.4, Y + 0.6, -17, false);
    // andon floor lamp
    const lm = this.lampMat();
    const andon = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.75, 0.34), lm);
    andon.position.set(4.6, Y + 0.6, -12.6);
    h.add(andon);
    this.box(h, 0.4, 0.06, 0.4, M.dark, 4.6, Y + 0.2, -12.6);
    this.box(h, 0.4, 0.06, 0.4, M.dark, 4.6, Y + 1.0, -12.6);
    this.addLamp(andon, lm, "lamp", 3.2, new THREE.Vector3(4.6, Y + 0.65, -12.6));
    // pendant
    const pm = this.lampMat();
    const pend = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 12), pm);
    pend.position.set(2.6, Y + 1.85, -15);
    h.add(pend);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.5, 4), M.dark);
    cord.position.set(2.6, Y + 2.35, -15);
    h.add(cord);
    this.addLamp(pend, pm, "lamp", 3.4, new THREE.Vector3(2.6, Y + 1.85, -15));

    /* bedroom */
    this.box(h, 4.6, 0.35, 6.0, M.wood, 2.9, Y + 0.175, -24.2);
    const mattress = this.box(h, 4.3, 0.18, 5.7, M.linen, 2.9, Y + 0.44, -24.2);
    mattress.castShadow = true;
    this.box(h, 4.32, 0.05, 3.6, M.white, 2.9, Y + 0.56, -25.4, false);
    for (const x of [1.9, 3.9]) this.box(h, 1.1, 0.14, 0.6, M.white, x, Y + 0.6, -21.7);
    const blanket = this.box(h, 4.3, 0.1, 2.2, M.linen, 2.9, Y + 0.6, -26.6);
    blanket.rotation.y = 0.02;
    // nightstand + lamp
    this.box(h, 0.5, 0.45, 0.5, M.dark, 0.25, Y + 0.225, -22.0);
    const bl = this.lampMat();
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.34, 14), bl);
    bed.position.set(0.25, Y + 0.62, -22.0);
    h.add(bed);
    this.addLamp(bed, bl, "lamp", 2.6, new THREE.Vector3(0.25, Y + 0.64, -22.0));
    // folded clothes
    this.box(h, 0.5, 0.15, 0.35, M.linen, -4.5, Y + 0.08, -22);
    this.box(h, 0.5, 0.15, 0.35, M.white, -4.5, Y + 0.22, -22);

    /* bath */
    this.box(h, 2.6, 0.85, 1.6, M.wood, 3.4, Y + 0.425, -31.2);
    const bw = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.3), new THREE.MeshStandardMaterial({ color: "#8ec3cb", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.82 }));
    bw.rotation.x = -Math.PI / 2;
    bw.position.set(3.4, Y + 0.72, -31.2);
    h.add(bw);
    this.box(h, 0.4, 0.3, 0.4, M.wood, 0.2, Y + 0.15, -31.0);
    this.box(h, 0.4, 0.3, 0.4, M.wood, 0.9, Y + 0.15, -32.2);
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.25, 14), M.wood);
    bucket.position.set(0.2, Y + 0.42, -31.0);
    h.add(bucket);

    /* genkan */
    for (const s of [0, 1]) {
      const g = this.box(h, 0.12, 0.03, 0.3, M.dark, -2.9 + s * 0.22, 0.14, 5.4, false);
      g.rotation.y = 0.15;
    }
    this.box(h, 0.9, 0.06, 0.5, M.wood, 2.5, 0.15, 5.4, false);
    this.box(h, 0.4, 0.5, 0.4, M.dark, 4.6, Y + 0.25, 5.5);
    const vase2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.4, 12), M.ceramic);
    vase2.position.set(4.6, Y + 0.7, 5.5);
    h.add(vase2);

    /* courtyard: basin, fence, maple placed in gardens */
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.4, 12), M.stone);
    basin.position.set(2.2, 0.2, -10.2);
    basin.castShadow = true;
    this.scene.add(basin);
    const bwater = new THREE.Mesh(new THREE.CircleGeometry(0.26, 18), new THREE.MeshStandardMaterial({ color: "#1a2b2f", roughness: 0.05, metalness: 0.4 }));
    bwater.rotation.x = -Math.PI / 2;
    bwater.position.set(2.2, 0.385, -10.2);
    this.scene.add(bwater);
    const spoutB = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), M.bamboo);
    spoutB.position.set(2.75, 0.75, -10.3);
    spoutB.rotation.z = Math.PI / 2.4;
    this.scene.add(spoutB);
    const postB = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), M.bamboo);
    postB.position.set(3.0, 0.5, -10.3);
    this.scene.add(postB);

    // bamboo fence on the east edge of the courtyard
    const mats: THREE.Matrix4[] = [];
    for (let z = -4.3; z > -10.9; z -= 0.12) mats.push(this.mtx(HX1, 0.65, z, 1, 1.3, 1));
    this.scene.add(this.instanced(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), M.bamboo, mats, undefined, true));
    this.box(this.scene, 0.06, 0.06, 6.8, M.bamboo, HX1 + 0.04, 0.35, -7.5, false);
    this.box(this.scene, 0.06, 0.06, 6.8, M.bamboo, HX1 + 0.04, 1.0, -7.5, false);
  }

  ikebana: THREE.Mesh[] = [];
  private getCherryMat() {
    if (!this.cherryMat) this.makeTreeMats();
    return this.cherryMat;
  }

  /* ---------------- gardens: trees, rocks, lanterns ---------------- */
  private makeTreeMats() {
    const mk = (c: string) => {
      const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true });
      m.alphaHash = true;
      return m;
    };
    this.mapleMat = mk("#9cc75a");
    this.cherryMat = mk("#f6b3c7");
    this.pineMat = new THREE.MeshStandardMaterial({ color: "#2e4a33", roughness: 0.9, flatShading: true });
    this.pineSnowMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: new THREE.Color("#c8d6e8"), emissiveIntensity: 0.3, roughness: 1, flatShading: true });
    this.pineSnowMat.alphaHash = true;
  }

  private buildGardens() {
    if (!this.cherryMat) this.makeTreeMats();
    const trunks: THREE.Matrix4[] = [];
    const maple: THREE.Matrix4[] = [];
    const mapleC: THREE.Color[] = [];
    const cherry: THREE.Matrix4[] = [];
    const cherryC: THREE.Color[] = [];
    const pine: THREE.Matrix4[] = [];
    const pineC: THREE.Color[] = [];
    const snow: THREE.Matrix4[] = [];
    const R = this.rand;

    const trunk = (x: number, y: number, z: number, h: number, r: number, rx = 0, rz = 0) => trunks.push(this.mtx(x, y, z, r, h, r, rx, 0, rz));

    const addMaple = (x: number, z: number, s: number) => {
      const h = 2.3 * s;
      trunk(x, h / 2, z, h, 0.13 * s);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * 6.28 + R();
        const tilt = 0.55 + R() * 0.3;
        const bl = 1.3 * s;
        trunk(x + Math.sin(a) * Math.sin(tilt) * bl * 0.5, h + Math.cos(tilt) * bl * 0.45, z + Math.cos(a) * Math.sin(tilt) * bl * 0.5, bl, 0.055 * s, Math.cos(a) * tilt, -Math.sin(a) * tilt);
      }
      for (let i = 0; i < 9; i++) {
        const a = R() * 6.28;
        const rr = (0.5 + R() * 1.3) * s;
        const y = h + (0.3 + R() * 1.3) * s;
        const sc = (0.9 + R() * 0.7) * s;
        maple.push(this.mtx(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, sc, sc * 0.75, sc, R(), R() * 3, 0));
        mapleC.push(this.shade(0.78, 1.12));
      }
    };
    const addCherry = (x: number, z: number, s: number) => {
      const h = 1.9 * s;
      trunk(x, h / 2, z, h, 0.17 * s, 0.05, 0.08);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * 6.28 + R();
        const tilt = 0.8 + R() * 0.3;
        const bl = 1.6 * s;
        trunk(x + Math.sin(a) * Math.sin(tilt) * bl * 0.5, h + Math.cos(tilt) * bl * 0.4, z + Math.cos(a) * Math.sin(tilt) * bl * 0.5, bl, 0.07 * s, Math.cos(a) * tilt, -Math.sin(a) * tilt);
      }
      for (let i = 0; i < 12; i++) {
        const a = R() * 6.28;
        const rr = (0.8 + R() * 1.7) * s;
        const y = h + (0.3 + R() * 1.0) * s;
        const sc = (0.9 + R() * 0.8) * s;
        cherry.push(this.mtx(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, sc, sc * 0.62, sc, R(), R() * 3, 0));
        cherryC.push(this.shade(0.82, 1.12));
      }
    };
    const addPine = (x: number, z: number, s: number) => {
      const h = 3.0 * s;
      const lean = (R() - 0.5) * 0.8 * s;
      trunk(x + lean * 0.25, h * 0.27, z, h * 0.55, 0.15 * s, 0, -lean * 0.2);
      trunk(x + lean * 0.7, h * 0.72, z, h * 0.6, 0.11 * s, 0, lean * 0.1);
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const a = R() * 6.28;
        const off = (0.5 + R() * 1.0) * s;
        const px = x + lean * (0.3 + t * 0.7) + Math.cos(a) * off;
        const pz = z + Math.sin(a) * off;
        const py = h * (0.5 + t * 0.5);
        const sx = (1.3 + R() * 0.7 - t * 0.4) * s;
        pine.push(this.mtx(px, py, pz, sx, 0.34 * s, sx * 0.85, 0, R() * 3, (R() - 0.5) * 0.2));
        pineC.push(this.shade(0.8, 1.15));
        snow.push(this.mtx(px, py + 0.22 * s, pz, sx * 0.88, 0.11 * s, sx * 0.75, 0, R() * 3, 0));
        trunk(x + lean * (0.3 + t * 0.7) + Math.cos(a) * off * 0.5, py - 0.15 * s, z + Math.sin(a) * off * 0.5, off, 0.04 * s, Math.sin(a) * 1.2, -Math.cos(a) * 1.2);
      }
    };

    // hero trees
    addPine(-7, 12.5, 1.5);
    addMaple(3.6, -7.8, 1.25);
    addMaple(6.5, 14, 1.3);
    addCherry(-8.5, 22, 1.4);
    addCherry(-3, -44.5, 1.2);
    addMaple(-11, -37, 1.2);
    addPine(11, -40, 1.4);
    addPine(6.5, 20.5, 1.1);
    addMaple(-10.5, -6, 1.1);
    addCherry(-11, 3.5, 1.1);
    addMaple(11, -24, 1.3);

    // scattered
    const pathPts = new THREE.CatmullRomCurve3(FRONT_PATH.map((p) => new THREE.Vector3(p[0], 0, p[1]))).getPoints(80);
    const zones: [number, number, number, number, number][] = [
      [-26, 26, 28, 62, 16],
      [-22, 22, 10, 25, 9],
      [-26, -9, -38, 10, 8],
      [9, 26, -38, 10, 8],
      [-26, 26, -68, -36, 16],
    ];
    let guard = 0;
    for (const [x0, x1, z0, z1, n] of zones) {
      let placed = 0;
      while (placed < n && guard++ < 3000) {
        const x = x0 + R() * (x1 - x0);
        const z = z0 + R() * (z1 - z0);
        if (this.nearHouse(x, z, 1.5) || this.inPond(x, z, 1.2)) continue;
        if (z > 8 && pathPts.some((p) => Math.hypot(p.x - x, p.z - z) < 3.6)) continue;
        if (Math.abs(z - GATE.z) < 2 && Math.abs(x - GATE.x) < 5) continue;
        if (z > 24 && z < 28.5 && x > -8 && x < 6) continue;
        const k = R();
        const s = 0.85 + R() * 0.55;
        if (k < 0.45) addMaple(x, z, s);
        else if (k < 0.75) addPine(x, z, s);
        else addCherry(x, z, s);
        placed++;
      }
    }

    const trunkMat = this.std(null, { color: "#4b392b", roughness: 1 });
    const tm = this.instanced(new THREE.CylinderGeometry(0.7, 1, 1, 7), trunkMat, trunks, undefined, true);
    this.scene.add(tm);
    const blob = new THREE.IcosahedronGeometry(1, 1);
    this.mapleMesh = this.instanced(blob, this.mapleMat, maple, mapleC, true);
    this.cherryMesh = this.instanced(blob, this.cherryMat, cherry, cherryC, true);
    const pm = this.instanced(blob, this.pineMat, pine, pineC, true);
    this.pineSnowMesh = this.instanced(blob, this.pineSnowMat, snow, undefined, false);
    this.scene.add(this.mapleMesh, this.cherryMesh, pm, this.pineSnowMesh);

    // rocks around the pond + scattered
    const rocks: THREE.Matrix4[] = [];
    const rockC: THREE.Color[] = [];
    for (let i = 0; i < 62; i++) {
      const a = (i / 62) * 6.283 + (R() - 0.5) * 0.08;
      const k = 1.0 + R() * 0.12;
      const sc = 0.35 + R() * 0.55;
      rocks.push(this.mtx(POND.cx + Math.cos(a) * POND.rx * k, sc * 0.2, POND.cz + Math.sin(a) * POND.rz * k, sc * 1.2, sc * 0.7, sc, R(), R() * 3, R()));
      rockC.push(this.shade(0.65, 1.1));
    }
    const bigRocks: [number, number, number][] = [
      [-2, -48, 1.1],
      [9, -47, 0.9],
      [2.3, -5.2, 0.8],
      [4.2, -6.2, 0.55],
      [-9.5, 14, 0.9],
      [9.5, 10, 0.75],
      [-6.5, -40, 0.9],
    ];
    for (const [x, z, s] of bigRocks) {
      rocks.push(this.mtx(x, s * 0.35, z, s * 1.3, s, s * 1.1, R(), R() * 3, R()));
      rockC.push(this.shade(0.7, 1.0));
    }
    this.scene.add(this.instanced(new THREE.DodecahedronGeometry(1, 0), this.M.stoneRock, rocks, rockC, true));

    // lanterns
    this.addLantern(-5.2, 11.5, 1.1);
    this.addLantern(4.2, 17.5, 1.0);
    this.addLantern(-6.8, -49.5, 1.15);
    this.addLantern(1.3, -4.6, 0.75);
    this.addLantern(-4.2, 29.5, 0.9);
  }

  private addLantern(x: number, z: number, s: number) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    const st = this.M.stone;
    const add = (geo: THREE.BufferGeometry, y: number, mat: THREE.Material = st) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.y = y;
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };
    add(new THREE.CylinderGeometry(0.34, 0.42, 0.2, 8), 0.1);
    add(new THREE.CylinderGeometry(0.11, 0.14, 0.9, 8), 0.65);
    add(new THREE.CylinderGeometry(0.36, 0.26, 0.1, 8), 1.15);
    const lm = this.lampMat();
    const chamber = add(new THREE.BoxGeometry(0.34, 0.4, 0.34), 1.4, lm);
    const roof = add(new THREE.ConeGeometry(0.58, 0.32, 4), 1.76);
    roof.rotation.y = Math.PI / 4;
    add(new THREE.SphereGeometry(0.07, 8, 6), 1.97);
    this.scene.add(g);
    this.addLamp(chamber, lm, "lantern", 3.0 * s, new THREE.Vector3(x, 1.4 * s, z));
    // larger invisible pick volume
    const pick = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.y = 1.0;
    pick.userData.lamp = this.lamps.length - 1;
    g.add(pick);
    this.pickables.push(pick);
  }

  /* ---------------- pond ---------------- */
  private buildPond() {
    this.waterMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uTop: { value: new THREE.Color() },
        uBot: { value: new THREE.Color() },
        uDeep: { value: new THREE.Color("#16302f") },
        uR: { value: this.ripples },
        uCam: { value: new THREE.Vector3() },
        uC: { value: new THREE.Vector2(POND.cx, POND.cz) },
        uRad: { value: new THREE.Vector2(POND.rx, POND.rz) },
        uSnow: { value: 0 },
        uDay: { value: 1 },
      },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        varying vec3 vW;
        uniform float uTime; uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uDeep; uniform vec4 uR[8];
        uniform vec3 uCam; uniform vec2 uC; uniform vec2 uRad; uniform float uSnow; uniform float uDay;
        void main(){
          vec2 p = vW.xz;
          vec2 e = (p - uC) / uRad;
          float d = length(e);
          vec2 n = vec2(sin(p.x*1.3+uTime*.6)+sin(p.y*1.7-uTime*.5), cos(p.x*1.1-uTime*.4)+cos(p.y*1.5+uTime*.7)) * .012;
          float rip = 0.;
          for(int i=0;i<8;i++){
            vec4 r = uR[i];
            if(r.w > 0.){
              float age = uTime - r.z;
              vec2 dv = p - r.xy;
              float dist = length(dv);
              float front = age * 2.0;
              float w = exp(-pow((dist-front)*2.6, 2.)) * exp(-age*.75) * r.w;
              n += normalize(dv + 1e-4) * w * sin((dist-front)*13.) * .14;
              rip += w;
            }
          }
          vec3 V = normalize(uCam - vW);
          vec3 N = normalize(vec3(n.x, 1., n.y));
          float fres = pow(1. - max(dot(N, V), 0.), 3.) * .85 + .1;
          vec3 R = reflect(-V, N);
          vec3 refl = mix(uBot, uTop, clamp(R.y * 1.3, 0., 1.));
          vec3 col = mix(uDeep * (.35 + .65*uDay), refl, fres);
          col += vec3(.7,.8,.9) * pow(max(rip,0.), 2.) * .1 * uDay;
          col = mix(col, vec3(.78,.86,.93) * (.4+.6*uDay), uSnow * .75);
          float edge = smoothstep(1.0, .94, d);
          float alpha = mix(.5, .93, fres) * edge;
          alpha = mix(alpha, .95*edge, uSnow*.8);
          gl_FragColor = vec4(col, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.03, 64), this.waterMat);
    water.rotation.x = -Math.PI / 2;
    water.scale.set(POND.rx, POND.rz, 1);
    water.position.set(POND.cx, 0.02, POND.cz);
    water.renderOrder = 2;
    this.scene.add(water);

    // lily pads
    const pads: THREE.Matrix4[] = [];
    for (let i = 0; i < 9; i++) {
      const a = this.rand() * 6.28;
      const r = 0.45 + this.rand() * 0.4;
      const s = 0.25 + this.rand() * 0.2;
      pads.push(this.mtx(POND.cx + Math.cos(a) * POND.rx * r, 0.035, POND.cz + Math.sin(a) * POND.rz * r, s, 0.01, s));
    }
    const padMat = new THREE.MeshStandardMaterial({ color: "#3f7d3a", roughness: 0.7 });
    this.lilyMat = padMat;
    const pm = this.instanced(new THREE.CylinderGeometry(1, 1, 1, 12), padMat, pads, undefined, false);
    this.scene.add(pm);
    this.lilies = pm;

    // koi
    const geo = new THREE.SphereGeometry(1, 14, 10);
    KOI_STYLES.forEach((s, i) => {
      const k = new Koi(s, geo, i);
      this.koi.push(k);
      this.scene.add(k.group);
    });

    // food pool
    const fm = new THREE.MeshStandardMaterial({ color: "#f3e3b8", roughness: 0.6 });
    const fg = new THREE.SphereGeometry(0.055, 8, 6);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(fg, fm);
      m.visible = false;
      this.scene.add(m);
      this.foodPool.push(m);
    }
  }
  lilyMat!: THREE.MeshStandardMaterial;
  lilies!: THREE.InstancedMesh;

  /* ---------------- leaves ---------------- */
  private buildLeaves() {
    this.leafMat = new THREE.MeshBasicMaterial({ color: "#ffffff", side: THREE.DoubleSide });
    const geo = new THREE.CircleGeometry(0.5, 7);
    geo.scale(1.3, 0.85, 1);
    this.leafMesh = new THREE.InstancedMesh(geo, this.leafMat, this.leafN);
    this.leafMesh.frustumCulled = false;
    const col = new THREE.Color();
    for (let i = 0; i < this.leafN; i++) {
      this.leafPos[i * 3] = (this.rand() - 0.5) * 44;
      this.leafPos[i * 3 + 1] = this.rand() * 16;
      this.leafPos[i * 3 + 2] = (this.rand() - 0.5) * 44;
      this.leafPh[i * 2] = this.rand() * 6.28;
      this.leafPh[i * 2 + 1] = 0.6 + this.rand() * 0.8;
      col.setScalar(0.75 + this.rand() * 0.35);
      this.leafMesh.setColorAt(i, col);
    }
    this.scene.add(this.leafMesh);
  }

  /* ---------------- per-frame environment ---------------- */
  private applyEnv(dt: number) {
    const e = this.cur;
    const u = this.skyMat.uniforms;
    u.uTop.value.copy(e.skyTop);
    u.uBot.value.copy(e.skyBot);
    const elev = e.sunEl * 1.25;
    const dir = new THREE.Vector3(Math.cos(elev) * Math.sin(e.sunAz), Math.sin(elev), Math.cos(elev) * Math.cos(e.sunAz));
    u.uSunDir.value.copy(dir);
    u.uSunCol.value.copy(e.sun);
    u.uStars.value = e.stars;
    u.uSunAmt.value = Math.max(0.2, e.daylight);
    (this.scene.fog as THREE.Fog).color.copy(e.skyBot).multiplyScalar(0.92);
    this.renderer.toneMappingExposure = e.exposure;

    this.sun.color.copy(e.sun);
    this.sun.intensity = e.sunInt;
    this.sunDir = dir;
    this.hemi.color.copy(e.hemiSky);
    this.hemi.groundColor.copy(e.hemiGround);
    this.hemi.intensity = e.hemiInt * 1.5;

    // foliage
    this.mapleMat.color.copy(e.maple);
    this.cherryMat.color.copy(e.cherry);
    this.mapleMat.opacity = this.cherryMat.opacity = Math.max(0.0001, e.foliage);
    if (this.mapleMesh) this.mapleMesh.visible = e.foliage > 0.02;
    if (this.cherryMesh) this.cherryMesh.visible = e.foliage > 0.02;
    this.pineSnowMat.opacity = Math.max(0.0001, e.snow);
    if (this.pineSnowMesh) this.pineSnowMesh.visible = e.snow > 0.02;
    this.pineMat.color.set("#2e4a33").multiplyScalar(1 - e.snow * 0.1);
    this.mossMat.color.copy(e.moss).lerp(new THREE.Color("#ffffff"), e.snow * 0.85);
    this.mossMat.emissive.setRGB(0.8, 0.88, 0.96).multiplyScalar(e.snow * 0.3);
    this.lilyMat.color.set("#3f7d3a").lerp(new THREE.Color("#5a5a48"), e.snow);
    this.lilies.visible = e.snow < 0.9;

    const white = new THREE.Color("#ffffff");
    for (const s of this.snowRegs) {
      s.mat.color.copy(s.base).lerp(white, e.snow * s.k);
      s.mat.emissive.setRGB(0.82, 0.9, 0.98).multiplyScalar(e.snow * s.k * 0.32);
    }

    // shoji glow
    const warm = new THREE.Color("#fff3dc").lerp(new THREE.Color("#ffad5c"), e.night);
    const gi = 0.3 + e.daylight * 0.25 + e.night * 0.7;
    for (const m of this.shojiMats) {
      m.emissive.copy(warm);
      m.emissiveIntensity = gi;
    }

    // lamps
    for (const l of this.lamps) {
      const target = l.override !== null ? (l.override ? 1 : 0) : l.kind === "lantern" ? e.lantern : Math.max(0.12, e.lantern);
      l.glow += (target - l.glow) * Math.min(1, dt * 4);
      l.mat.emissiveIntensity = l.glow * 2.4;
      const flick = 1 + Math.sin(this.time * 7 + l.pos.x * 3) * 0.04;
      l.halo.visible = l.glow > 0.03;
      (l.halo.material as THREE.SpriteMaterial).opacity = Math.min(1, l.glow * 0.8 * flick);
    }

    // water
    const wu = this.waterMat.uniforms;
    wu.uTop.value.copy(e.skyTop);
    wu.uBot.value.copy(e.skyBot);
    wu.uSnow.value = e.snow;
    wu.uDay.value = 0.25 + 0.75 * e.daylight;
  }
  sunDir = new THREE.Vector3(0, 1, 0);

  /* ---------------- camera ---------------- */
  private updateCamera(dt: number) {
    const t = this.curT;
    this.idx = t * (KEYFRAMES.length - 1);
    const pos = this.posCurve.getPoint(t);
    const look = this.lookCurve.getPoint(t);
    pos.y += Math.sin(this.time * 0.8) * 0.012;
    const fwd = look.clone().sub(pos).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    this.pm.lerp(this.pointer, Math.min(1, dt * 3));
    look.addScaledVector(right, this.pm.x * 2.2).addScaledVector(new THREE.Vector3(0, 1, 0), this.pm.y * 1.0);
    this.walkCam.position.copy(pos);
    this.walkCam.lookAt(look);
    this.walkCam.updateMatrixWorld();
    this.walkFwd = fwd;

    // blend with inspect camera
    const goal = this.inspecting ? 1 : 0;
    this.blend += (goal - this.blend) * (1 - Math.exp(-dt * 3.0));
    if (Math.abs(goal - this.blend) < 0.001) this.blend = goal;
    if (this.inspecting || this.blend > 0) {
      if (this.focusGoal && this.controls) {
        const k = 1 - Math.exp(-dt * 3);
        this.controls.target.lerp(this.focusGoal.target, k);
        const off = this.orbitCam.position.clone().sub(this.controls.target);
        const len = off.length();
        off.setLength(len + (this.focusGoal.dist - len) * k);
        this.orbitCam.position.copy(this.controls.target).add(off);
        if (this.controls.target.distanceTo(this.focusGoal.target) < 0.05 && Math.abs(len - this.focusGoal.dist) < 0.2) this.focusGoal = null;
      }
      this.controls?.update();
      this.orbitCam.updateMatrixWorld();
    }
    const e = this.blend * this.blend * (3 - 2 * this.blend);
    if (this.blend === 0) {
      this.camera.position.copy(this.walkCam.position);
      this.camera.quaternion.copy(this.walkCam.quaternion);
    } else {
      this.camera.position.lerpVectors(this.walkCam.position, this.orbitCam.position, e);
      this.camera.quaternion.slerpQuaternions(this.walkCam.quaternion, this.orbitCam.quaternion, e);
    }
    const portrait = this.camera.aspect < 1;
    const walkFov = portrait ? 76 : 62;
    const fov = walkFov + (42 - walkFov) * e;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    // roof lift (cutaway)
    const liftGoal = this.inspecting && this.cutaway ? 16 : 0;
    this.lift += (liftGoal - this.lift) * (1 - Math.exp(-dt * 3.5));
    this.roofGroup.position.y = this.lift;
    this.roofGroup.visible = this.lift < 15.5;
  }
  walkFwd = new THREE.Vector3(0, 0, -1);

  /* ---------------- particles, koi, lights ---------------- */
  private updateLeaves(dt: number) {
    const e = this.cur;
    const n = Math.round(e.leafCount);
    this.leafMesh.count = n;
    this.gust = Math.max(0, this.gust - dt * 0.35);
    const cp = this.camera.position;
    const fwd = this.walkFwd;
    const cx = cp.x + (this.inspecting ? 0 : fwd.x * 10);
    const cz = cp.z + (this.inspecting ? 0 : fwd.z * 10);
    const W = 44;
    const H = 16;
    const d = this.dummy;
    const wind = 0.35 + Math.sin(this.time * 0.3) * 0.25 + this.gust * 3.5 * (this.windDir || 1);
    const winter = e.snow > 0.5;
    const fireflies = e.fly * e.night;
    for (let i = 0; i < n; i++) {
      const ph = this.leafPh[i * 2];
      const sp = this.leafPh[i * 2 + 1];
      let x = this.leafPos[i * 3];
      let y = this.leafPos[i * 3 + 1];
      let z = this.leafPos[i * 3 + 2];
      const fall = e.leafFall * sp * (fireflies > 0.5 ? 0.0 : 1);
      x += (wind * sp + Math.sin(this.time * 1.3 + ph) * (winter ? 0.1 : 0.5)) * dt;
      z += Math.cos(this.time * 1.1 + ph * 1.7) * (winter ? 0.1 : 0.45) * dt + this.gust * 0.6 * dt;
      y += (-fall + (fireflies > 0.5 ? Math.sin(this.time * 0.8 + ph) * 0.25 : 0) + this.gust * 0.8 * Math.sin(ph)) * dt;
      // wrap around camera
      if (x < cx - W / 2) x += W;
      else if (x > cx + W / 2) x -= W;
      if (z < cz - W / 2) z += W;
      else if (z > cz + W / 2) z -= W;
      if (y < 0.05) y += H;
      else if (y > H) y -= H;
      this.leafPos[i * 3] = x;
      this.leafPos[i * 3 + 1] = y;
      this.leafPos[i * 3 + 2] = z;
      const sc = e.leafSize * (0.6 + sp * 0.6) * (fireflies > 0.5 ? 0.6 : 1) * (winter ? 1 : 1);
      d.position.set(x, y, z);
      d.rotation.set(this.time * sp * 1.5 + ph, ph * 2 + this.time * 0.6 * sp, ph);
      d.scale.setScalar(sc);
      d.updateMatrix();
      this.leafMesh.setMatrixAt(i, d.matrix);
    }
    this.leafMesh.instanceMatrix.needsUpdate = true;
    const lf = 0.35 + 0.65 * e.daylight;
    this.leafMat.color.copy(e.leaf).multiplyScalar(lf).lerp(new THREE.Color("#d6ff5a"), Math.min(1, fireflies * 1.4));
    this.leafMesh.visible = n > 0 && this.inspecting === false ? true : this.blend < 0.6;
  }

  private updateKoi(dt: number) {
    for (const k of this.koi) {
      k.update(dt, this.time, this.foods, (f) => {
        this.addRipple(f.x, f.z, 0.45);
        f.life = 0;
      });
      k.group.visible = this.cur.snow < 0.9 || true;
    }
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i];
      f.life -= dt;
      f.mesh.position.y = 0.045 + Math.sin(this.time * 2 + i) * 0.004;
      if (f.life <= 0) {
        f.mesh.visible = false;
        this.foods.splice(i, 1);
      }
    }
  }

  private updateSun() {
    const b = this.blend;
    const range = 28 + (72 - 28) * b;
    const sc = this.sun.shadow.camera;
    if (Math.abs(sc.right - range) > 0.5) {
      sc.left = sc.bottom = -range;
      sc.right = sc.top = range;
      sc.updateProjectionMatrix();
    }
    const cp = this.camera.position;
    const walkTarget = new THREE.Vector3(cp.x + this.walkFwd.x * 8, 0, cp.z + this.walkFwd.z * 8);
    const inspectTarget = this.controls ? new THREE.Vector3(0, 0, -14) : walkTarget;
    const t = walkTarget.lerp(inspectTarget, b);
    t.x = Math.round(t.x * 2) / 2;
    t.z = Math.round(t.z * 2) / 2;
    this.sun.target.position.copy(t);
    this.sun.position.copy(t).addScaledVector(this.sunDir, 90);
  }

  /* ---------------- loop ---------------- */
  loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.06, (now - this.lastT) / 1000);
    this.lastT = now;
    if (!this.active || document.hidden) return;
    this.time += dt;

    // adaptive resolution
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 90) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.frameTimes = [];
      if (avg > 0.03 && this.pixelRatio > 1) {
        this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight, false);
      }
    }

    lerpEnv(this.cur, this.tgt, 1 - Math.exp(-dt * 1.8));
    this.applyEnv(dt);
    this.curT += (this.targetT - this.curT) * (1 - Math.exp(-dt * 4.2));
    if (Math.abs(this.targetT - this.curT) < 0.00005) this.curT = this.targetT;
    this.updateCamera(dt);
    this.updateSun();
    this.updateLeaves(dt);
    this.updateKoi(dt);

    // interior light follows the camera
    const cp = this.camera.position;
    const inside = this.insideFactor(cp);
    this.inner.position.set(cp.x, cp.y + 0.4, cp.z);
    this.inner.intensity = 14 * inside * (0.45 + 0.55 * (1 - this.cur.daylight * 0.6)) * (1 - this.blend);

    const wu = this.waterMat.uniforms;
    wu.uTime.value = this.time;
    wu.uCam.value.copy(cp);
    this.sky.position.copy(cp);

    this.renderer.render(this.scene, this.camera);

    const f = this.walkFwd;
    this.cb.onFrame?.({ x: this.walkCam.position.x, z: this.walkCam.position.z, fx: f.x, fz: f.z, idx: this.idx });
    if (now - this.lastMood > 300) {
      this.lastMood = now;
      const w = this.walkCam.position;
      const dp = Math.hypot(w.x - POND.cx, w.z - POND.cz);
      this.cb.onMood?.({
        daylight: this.cur.daylight,
        night: this.cur.night,
        snow: this.cur.snow,
        season: this.season,
        pond: Math.max(0, Math.min(1, 1 - (dp - 6) / 40)),
        courtyard: Math.max(0, Math.min(1, 1 - Math.hypot(w.x - 2.2, w.z + 8) / 11)),
        inside: this.insideFactor(w),
      });
    }
  };

  private insideFactor(p: THREE.Vector3) {
    const inX = p.x > HX0 - 0.5 && p.x < HX1 + 0.5;
    const zIn = p.z < 7.5 && p.z > -37;
    if (inX && zIn) return 1;
    const dz = p.z > 7.5 ? p.z - 7.5 : p.z < -37 ? -37 - p.z : 0;
    return Math.max(0, 1 - dz / 4);
  }
}
