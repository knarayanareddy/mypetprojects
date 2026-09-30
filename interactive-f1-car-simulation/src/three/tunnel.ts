import * as THREE from "three";

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export const TUNNEL = { x0: -9.2, x1: 9.2, h: 4.2, hw: 3.9 };

export class Tunnel {
  group = new THREE.Group();
  fan = new THREE.Group();
  belt: THREE.Mesh;
  beltTex: THREE.CanvasTexture;
  floorMats: THREE.MeshStandardMaterial[] = [];
  fades: { m: THREE.Material & { opacity: number }; base: number }[] = [];
  lights: THREE.PointLight[] = [];
  honey: THREE.Mesh;
  mix = 0;

  constructor() {
    const g = this.group;
    const L = TUNNEL.x1 - TUNNEL.x0;
    const W = TUNNEL.hw * 2;

    // rolling road
    this.beltTex = canvasTex(512, 512, (c) => {
      c.fillStyle = "#15171c";
      c.fillRect(0, 0, 512, 512);
      c.fillStyle = "#1c1f26";
      for (let i = 0; i < 512; i += 8) c.fillRect(i, 0, 3, 512);
      c.fillStyle = "rgba(255,255,255,0.75)";
      c.fillRect(0, 0, 4, 512);
      c.fillStyle = "rgba(255,43,43,0.85)";
      c.fillRect(0, 10, 512, 6);
      c.fillRect(0, 496, 512, 6);
      c.fillStyle = "rgba(255,255,255,0.35)";
      for (let i = 0; i < 4; i++) c.fillRect(128 * i + 60, 250, 40, 10);
    });
    this.beltTex.wrapS = this.beltTex.wrapT = THREE.RepeatWrapping;
    this.beltTex.repeat.set(L / 2, 1);
    const beltMat = new THREE.MeshStandardMaterial({
      map: this.beltTex,
      roughness: 0.55,
      metalness: 0.35,
      transparent: true,
    });
    this.floorMats.push(beltMat);
    this.belt = new THREE.Mesh(new THREE.PlaneGeometry(L, 3.6), beltMat);
    this.belt.rotation.x = -Math.PI / 2;
    this.belt.position.set(0, -0.001, 0);
    this.belt.receiveShadow = true;
    g.add(this.belt);
    this.fades.push({ m: beltMat, base: 1 });

    // side floors
    const sideTex = canvasTex(256, 256, (c) => {
      c.fillStyle = "#0d0f13";
      c.fillRect(0, 0, 256, 256);
      c.strokeStyle = "rgba(120,160,190,0.14)";
      c.lineWidth = 2;
      c.strokeRect(0, 0, 256, 256);
    });
    sideTex.wrapS = sideTex.wrapT = THREE.RepeatWrapping;
    sideTex.repeat.set(L / 1.5, 1.05 / 1.5 + 0.2);
    const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.5, metalness: 0.5, transparent: true });
    this.floorMats.push(sideMat);
    for (const s of [1, -1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L, (W - 3.6) / 2), sideMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, -0.002, s * (1.8 + (W - 3.6) / 4));
      m.receiveShadow = true;
      g.add(m);
    }
    this.fades.push({ m: sideMat, base: 1 });

    // glass walls + ceiling
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x9ed8ff,
      transparent: true,
      opacity: 0.05,
      roughness: 0.05,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.fades.push({ m: glass, base: 0.05 });
    for (const s of [1, -1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(L, TUNNEL.h), glass);
      w.position.set(0, TUNNEL.h / 2, s * TUNNEL.hw);
      if (s < 0) w.rotation.y = Math.PI;
      g.add(w);
    }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(L, W), glass);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = TUNNEL.h;
    g.add(ceil);

    // frame lines
    const pts: number[] = [];
    const ln = (a: number[], b: number[]) => pts.push(...a, ...b);
    for (let x = TUNNEL.x0; x <= TUNNEL.x1 + 0.01; x += 1.8) {
      for (const s of [1, -1]) ln([x, 0, s * TUNNEL.hw], [x, TUNNEL.h, s * TUNNEL.hw]);
      ln([x, TUNNEL.h, -TUNNEL.hw], [x, TUNNEL.h, TUNNEL.hw]);
    }
    for (const s of [1, -1]) {
      ln([TUNNEL.x0, TUNNEL.h, s * TUNNEL.hw], [TUNNEL.x1, TUNNEL.h, s * TUNNEL.hw]);
      ln([TUNNEL.x0, 0.02, s * TUNNEL.hw], [TUNNEL.x1, 0.02, s * TUNNEL.hw]);
      ln([TUNNEL.x0, TUNNEL.h / 2, s * TUNNEL.hw], [TUNNEL.x1, TUNNEL.h / 2, s * TUNNEL.hw]);
    }
    // ground grid lines on the belt for speed reference
    for (let x = TUNNEL.x0; x <= TUNNEL.x1; x += 2) ln([x, 0.004, -1.8], [x, 0.004, 1.8]);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const lm = new THREE.LineBasicMaterial({ color: 0x4fb8e0, transparent: true, opacity: 0.22 });
    this.fades.push({ m: lm, base: 0.22 });
    g.add(new THREE.LineSegments(lg, lm));

    // inlet honeycomb
    const hexTex = canvasTex(512, 512, (c) => {
      c.clearRect(0, 0, 512, 512);
      c.strokeStyle = "rgba(120,220,255,0.85)";
      c.lineWidth = 2;
      const r = 20;
      const hh = Math.sqrt(3) * r;
      for (let row = -1; row < 512 / hh + 1; row++) {
        for (let col = -1; col < 512 / (1.5 * r) + 1; col++) {
          const cx = col * 1.5 * r;
          const cy = row * hh + (col % 2 ? hh / 2 : 0);
          c.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k;
            const px = cx + r * Math.cos(a);
            const py = cy + r * Math.sin(a);
            if (k === 0) c.moveTo(px, py);
            else c.lineTo(px, py);
          }
          c.closePath();
          c.stroke();
        }
      }
    });
    hexTex.wrapS = hexTex.wrapT = THREE.RepeatWrapping;
    hexTex.repeat.set(2, 1.1);
    const hexMat = new THREE.MeshBasicMaterial({
      map: hexTex,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.fades.push({ m: hexMat, base: 0.35 });
    this.honey = new THREE.Mesh(new THREE.PlaneGeometry(W, TUNNEL.h), hexMat);
    this.honey.rotation.y = Math.PI / 2;
    this.honey.position.set(TUNNEL.x0 - 0.05, TUNNEL.h / 2, 0);
    g.add(this.honey);

    // fan
    const fanMat = new THREE.MeshStandardMaterial({ color: 0x2c3038, metalness: 0.8, roughness: 0.4, transparent: true });
    this.fades.push({ m: fanMat, base: 1 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.1, 10, 48), fanMat);
    ring.rotation.y = Math.PI / 2;
    this.fan.add(ring);
    const blades = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.9, 0.42), fanMat);
      const a = (i / 9) * Math.PI * 2;
      b.position.set(0, Math.cos(a) * 1.05, Math.sin(a) * 1.05);
      b.rotation.x = -a;
      b.rotateY(0.45);
      blades.add(b);
    }
    blades.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 20).rotateZ(Math.PI / 2), fanMat));
    this.fan.add(blades);
    (this.fan as THREE.Group & { blades?: THREE.Group }).blades = blades;
    this.fan.position.set(TUNNEL.x1 + 0.1, TUNNEL.h / 2, 0);
    g.add(this.fan);

    // wake rake (total-pressure rake)
    const rakeMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b0, metalness: 0.9, roughness: 0.3, transparent: true });
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff3b2e, transparent: true });
    this.fades.push({ m: rakeMat, base: 1 }, { m: tipMat, base: 1 });
    for (let i = 0; i < 15; i++) {
      const z = -1.4 + (i / 14) * 2.8;
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.7, 6), rakeMat);
      s.position.set(5.6, 0.85, z);
      g.add(s);
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), tipMat);
      t.position.set(5.6, 1.7, z);
      g.add(t);
    }
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 3.0), rakeMat).translateX(5.6).translateY(1.7));

    // ceiling light strips + light
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true });
    this.fades.push({ m: stripMat, base: 1 });
    for (const x of [-6, -2, 2, 6]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 5.6), stripMat);
      s.position.set(x, TUNNEL.h - 0.04, 0);
      g.add(s);
      const pl = new THREE.PointLight(0xcfeaff, 0, 14, 1.6);
      pl.position.set(x, TUNNEL.h - 0.4, 0);
      g.add(pl);
      this.lights.push(pl);
    }
    g.visible = false;
  }

  setMix(mix: number) {
    this.mix = mix;
    this.group.visible = mix > 0.002;
    for (const f of this.fades) {
      f.m.opacity = f.base * mix;
    }
    for (const l of this.lights) l.intensity = 22 * mix;
  }

  update(dt: number, visSpeed: number, slowmo: number, wet: boolean) {
    if (!this.group.visible) return;
    this.beltTex.offset.x -= (visSpeed * dt * slowmo) / 2;
    const blades = (this.fan as THREE.Group & { blades?: THREE.Group }).blades;
    if (blades) blades.rotation.x -= dt * visSpeed * 0.9 * slowmo;
    for (const m of this.floorMats) {
      m.roughness += ((wet ? 0.12 : 0.55) - m.roughness) * Math.min(1, dt * 3);
      m.metalness += ((wet ? 0.8 : 0.35) - m.metalness) * Math.min(1, dt * 3);
    }
  }
}
