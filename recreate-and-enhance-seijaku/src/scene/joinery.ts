import * as THREE from "three";
import * as TX from "./textures";

export interface JoineryPart {
  id: string;
  name: string;
  jp: string;
  blurb: string;
}

export const JOINERY_PARTS: JoineryPart[] = [
  { id: "stone", name: "Foundation stone", jp: "礎石", blurb: "Timber never touches the earth. Each post rests on a river stone, free to breathe and shift in an earthquake." },
  { id: "sill", name: "Sill beam", jp: "土台", blurb: "A hinoki beam ties the stones together and carries the floor frame." },
  { id: "tatami", name: "Tatami", jp: "畳", blurb: "A rush mat over a straw core, sized 1.8 × 0.9 m — the module that measures the whole house." },
  { id: "posts", name: "Posts", jp: "柱", blurb: "Square cypress posts, joined with cut tenons and no nails." },
  { id: "shoji", name: "Shoji panel", jp: "障子", blurb: "Washi over a fine lattice. It slides in grooves and turns hard sun into a soft glow." },
  { id: "lintel", name: "Lintel", jp: "鴨居", blurb: "Grooved on its underside, the lintel guides the sliding screens." },
  { id: "pegs", name: "Wedge pegs", jp: "楔", blurb: "Driven through the joint to lock it tight. Remove them and the frame comes apart by hand." },
  { id: "masu", name: "Bracket blocks", jp: "斗", blurb: "Stacked blocks spread the roof load into each post and deepen the eaves." },
  { id: "girder", name: "Girder", jp: "桁", blurb: "The long beam that receives the rafters and carries the tiled roof." },
];

interface Part {
  id: string;
  objs: THREE.Mesh[];
  basePos: THREE.Vector3[];
  dir: THREE.Vector3;
  mats: THREE.MeshStandardMaterial[];
}

export class JoineryScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  root = new THREE.Group();
  parts: Part[] = [];
  explode = 0;
  yaw = -0.6;
  yawTarget = -0.6;
  pitch = 0.12;
  dragging = false;
  lastX = 0;
  lastY = 0;
  idle = 0;
  visible = false;
  highlight: string | null = null;
  hover: string | null = null;
  raf = 0;
  ro: ResizeObserver;
  ray = new THREE.Raycaster();
  ptr = new THREE.Vector2(9, 9);
  time = 0;
  last = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private onHover: (id: string | null) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.add(new THREE.HemisphereLight(0xfff4e4, 0x7a6a55, 1.9));
    const key = new THREE.DirectionalLight(0xfff0dc, 2.6);
    key.position.set(5, 9, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xbcd0ff, 0.9);
    rim.position.set(-6, 4, -5);
    this.scene.add(rim);
    this.scene.add(this.root);
    this.build();

    const dom = canvas;
    dom.addEventListener("pointerdown", this.down);
    dom.addEventListener("pointermove", this.move);
    dom.addEventListener("pointerup", this.up);
    dom.addEventListener("pointercancel", this.up);
    dom.addEventListener("pointerleave", this.leave);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private tex(c: HTMLCanvasElement, rx = 1, ry = 1) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 8;
    return t;
  }

  private build() {
    const hinoki = this.tex(TX.wood(512, "#e2c494", "#9a7346", 7));
    const hinokiV = this.tex(TX.wood(512, "#e2c494", "#9a7346", 8, true));
    const dark = this.tex(TX.wood(512, "#6a4a34", "#2a1a10", 9));
    const tat = this.tex(TX.tatami(512, 4), 1.4, 0.7);
    const shoji = this.tex(TX.shoji(), 1, 1);
    const stone = this.tex(TX.stone(512, 15));

    const mk = (map: THREE.Texture, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.8, ...extra });
    const add = (id: string, dir: [number, number, number], items: { geo: THREE.BufferGeometry; mat: THREE.MeshStandardMaterial; pos: [number, number, number]; rot?: [number, number, number] }[]) => {
      const part: Part = { id, objs: [], basePos: [], dir: new THREE.Vector3(...dir), mats: [] };
      for (const it of items) {
        const m = new THREE.Mesh(it.geo, it.mat);
        m.position.set(...it.pos);
        if (it.rot) m.rotation.set(...it.rot);
        m.userData.part = id;
        this.root.add(m);
        part.objs.push(m);
        part.basePos.push(m.position.clone());
        if (!part.mats.includes(it.mat)) part.mats.push(it.mat);
      }
      this.parts.push(part);
    };

    const rock = new THREE.DodecahedronGeometry(1, 1);
    rock.scale(0.5, 0.26, 0.5);
    add("stone", [0, -1.5, 0], [
      { geo: rock, mat: mk(stone, { flatShading: true }), pos: [-1, 0.14, 0] },
      { geo: rock, mat: mk(stone, { flatShading: true }), pos: [1, 0.14, 0], rot: [0, 1.2, 0] },
    ]);
    add("sill", [0, -0.8, 0], [{ geo: new THREE.BoxGeometry(2.9, 0.22, 0.32), mat: mk(hinoki), pos: [0, 0.48, 0] }]);
    add("tatami", [0, 0.1, 2.2], [
      { geo: new THREE.BoxGeometry(2.7, 0.12, 1.4), mat: mk(tat, { roughness: 1 }), pos: [0, 0.65, 1.0] },
    ]);
    const pm = mk(hinokiV);
    add("posts", [0, 0, 0], [
      { geo: new THREE.BoxGeometry(0.27, 2.5, 0.27), mat: pm, pos: [-1, 1.84, 0] },
      { geo: new THREE.BoxGeometry(0.27, 2.5, 0.27), mat: pm, pos: [1, 1.84, 0] },
    ]);
    add("shoji", [0, 0, -2.2], [
      {
        geo: new THREE.BoxGeometry(1.72, 1.75, 0.05),
        mat: mk(shoji, { emissive: new THREE.Color("#fff0d4"), emissiveMap: shoji, emissiveIntensity: 0.35, roughness: 0.95 }),
        pos: [0, 1.5, 0],
      },
    ]);
    add("lintel", [0, 0.9, -1.1], [{ geo: new THREE.BoxGeometry(1.74, 0.18, 0.24), mat: mk(dark), pos: [0, 2.5, 0] }]);
    const wm = mk(dark);
    add("pegs", [0, 0.45, 1.7], [
      { geo: new THREE.BoxGeometry(0.06, 0.07, 0.75), mat: wm, pos: [-1, 2.78, 0] },
      { geo: new THREE.BoxGeometry(0.06, 0.07, 0.75), mat: wm, pos: [1, 2.78, 0] },
    ]);
    const mm = mk(dark);
    add("masu", [0, 1.3, 0], [
      { geo: new THREE.BoxGeometry(0.46, 0.28, 0.46), mat: mm, pos: [-1, 3.25, 0] },
      { geo: new THREE.BoxGeometry(0.46, 0.28, 0.46), mat: mm, pos: [1, 3.25, 0] },
    ]);
    add("girder", [0, 2.6, 0], [{ geo: new THREE.BoxGeometry(3.3, 0.32, 0.32), mat: mk(hinoki), pos: [0, 3.55, 0] }]);

    // ground disc
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.0;
    this.scene.add(disc);
    this.disc = disc;
  }
  disc!: THREE.Mesh;

  setExplode(p: number) {
    this.explode = p;
  }
  setHighlight(id: string | null) {
    this.highlight = id;
  }
  setVisible(v: boolean) {
    this.visible = v;
    if (v) this.last = performance.now();
  }

  resize() {
    const p = this.canvas.parentElement ?? this.canvas;
    const w = p.clientWidth || 600;
    const h = p.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  down = (e: PointerEvent) => {
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.canvas.setPointerCapture(e.pointerId);
    this.canvas.style.cursor = "grabbing";
  };
  move = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (this.dragging) {
      this.yawTarget += (e.clientX - this.lastX) * 0.008;
      this.pitch = Math.max(-0.25, Math.min(0.55, this.pitch + (e.clientY - this.lastY) * 0.004));
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.idle = 0;
    }
  };
  up = (e: PointerEvent) => {
    this.dragging = false;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.canvas.style.cursor = "grab";
  };
  leave = () => {
    this.ptr.set(9, 9);
  };

  loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.visible) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.idle += dt;
    if (!this.dragging && this.idle > 2.5) this.yawTarget += dt * 0.12;
    this.yaw += (this.yawTarget - this.yaw) * (1 - Math.exp(-dt * 6));
    this.root.rotation.y = this.yaw;
    this.root.rotation.x = this.pitch * 0.35;

    const p = this.explode;
    const e = p * p * (3 - 2 * p);
    for (const part of this.parts) {
      part.objs.forEach((o, i) => o.position.copy(part.basePos[i]).addScaledVector(part.dir, e));
      const active = this.highlight === part.id || this.hover === part.id;
      for (const m of part.mats) {
        if (m.emissiveMap) {
          m.emissiveIntensity += ((active ? 0.9 : 0.35) - m.emissiveIntensity) * 0.2;
          continue;
        }
        m.emissive.set(active ? "#b5482d" : "#000000");
        m.emissiveIntensity += ((active ? 0.55 : 0) - m.emissiveIntensity) * 0.2;
      }
    }
    const d = 13.5 + e * 5.5;
    this.camera.position.set(0, 3.8 + e * 0.5, d);
    this.camera.lookAt(0, 1.9 + e * 0.45, 0);
    this.disc.position.y = -0.0;
    this.disc.scale.setScalar(1 + e * 0.15);
    this.disc.position.y = -1.5 * e - 0.02;

    // hover
    this.ray.setFromCamera(this.ptr, this.camera);
    const objs = this.parts.flatMap((p2) => p2.objs);
    const hit = this.ray.intersectObjects(objs, false)[0];
    const id = hit ? (hit.object.userData.part as string) : null;
    if (id !== this.hover) {
      this.hover = id;
      this.onHover(id);
      if (!this.dragging) this.canvas.style.cursor = id ? "pointer" : "grab";
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener("pointerdown", this.down);
    this.canvas.removeEventListener("pointermove", this.move);
    this.canvas.removeEventListener("pointerup", this.up);
    this.canvas.removeEventListener("pointercancel", this.up);
    this.canvas.removeEventListener("pointerleave", this.leave);
    this.renderer.dispose();
  }
}
