import * as THREE from "three";

export const TAU = Math.PI * 2;
export const uTime = { value: 0 };

export type V3 = [number, number, number];

export interface Shot {
  pos: V3;
  look: V3;
}
export interface Anchor {
  pos: V3;
  color: number;
  intensity: number;
  distance: number;
}
export interface Temple {
  group: THREE.Group;
  a: Shot;
  b: Shot;
  hero?: [Shot, Shot];
  outro?: [Shot, Shot];
  anchors: Anchor[];
  shadowR: number;
  update?: (t: number, dt: number) => void;
}

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
export function noise2(x: number, z: number) {
  const xi = Math.floor(x),
    zi = Math.floor(z);
  const xf = x - xi,
    zf = z - zi;
  const u = xf * xf * (3 - 2 * xf),
    v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi),
    b = hash2(xi + 1, zi),
    c = hash2(xi, zi + 1),
    d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x: number, z: number) {
  return noise2(x, z) * 0.55 + noise2(x * 2.1, z * 2.1) * 0.3 + noise2(x * 4.3, z * 4.3) * 0.15;
}

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */
export function std(color: number, o: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, flatShading: true, ...o });
}
export function glow(color: number, intensity = 2.2, o: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    color: 0x060606,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 1,
    ...o,
  });
}
export function gold(intensity = 0.55, o: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    color: 0xd9a93a,
    metalness: 0.85,
    roughness: 0.32,
    emissive: 0x7a4c0a,
    emissiveIntensity: intensity,
    ...o,
  });
}

/* ------------------------------------------------------------------ */
/* primitives (all anchored at their base, except ball)                */
/* ------------------------------------------------------------------ */
export function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  parent?: THREE.Object3D
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
export function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  parent?: THREE.Object3D
) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return mesh(g, mat, x, y, z, parent);
}
export function cyl(
  rt: number,
  rb: number,
  h: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  parent?: THREE.Object3D,
  seg = 14
) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(0, h / 2, 0);
  return mesh(g, mat, x, y, z, parent);
}
export function cone(
  r: number,
  h: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  parent?: THREE.Object3D,
  seg = 8
) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(0, h / 2, 0);
  return mesh(g, mat, x, y, z, parent);
}
export function ball(
  r: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  parent?: THREE.Object3D,
  seg = 14
) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)));
  return mesh(g, mat, x, y, z, parent);
}
export function torus(
  r: number,
  tube: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  parent?: THREE.Object3D,
  seg = 20
) {
  const g = new THREE.TorusGeometry(r, tube, 6, seg);
  g.rotateX(Math.PI / 2);
  return mesh(g, mat, x, y, z, parent);
}

/** Rectangular frustum: wider at the bottom than the top (battered wall). */
export function taper(
  wBot: number,
  wTop: number,
  h: number,
  dBot: number,
  dTop: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  parent?: THREE.Object3D
) {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const top = p.getY(i) > 0;
    p.setXYZ(i, p.getX(i) * (top ? wTop : wBot), p.getY(i) * h + h / 2, p.getZ(i) * (top ? dTop : dBot));
  }
  g.computeVertexNormals();
  return mesh(g, mat, x, y, z, parent);
}

export function lathe(
  pts: [number, number][],
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  parent?: THREE.Object3D,
  seg = 40
) {
  const g = new THREE.LatheGeometry(
    pts.map((p) => new THREE.Vector2(p[0], p[1])),
    seg
  );
  return mesh(g, mat, x, y, z, parent);
}

/** Sloped slab between two points; the top surface follows the line. */
export function slab(
  from: THREE.Vector3,
  to: THREE.Vector3,
  w: number,
  t: number,
  mat: THREE.Material,
  parent: THREE.Object3D
) {
  const len = from.distanceTo(to);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, t, len), mat);
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.position.y -= t / 2;
  const dir = to.clone().sub(from).normalize();
  m.rotation.order = "YXZ";
  m.rotation.set(-Math.asin(dir.y), Math.atan2(dir.x, dir.z), 0);
  parent.add(m);
  return m;
}

/* ------------------------------------------------------------------ */
/* instancing                                                          */
/* ------------------------------------------------------------------ */
export interface Item {
  p: V3;
  r?: number;
  rx?: number;
  rz?: number;
  s?: number | V3;
  c?: number;
}
export function inst(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  items: Item[],
  parent: THREE.Object3D
) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  mesh.count = items.length;
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    s = new THREE.Vector3(),
    p = new THREE.Vector3(),
    col = new THREE.Color();
  items.forEach((it, i) => {
    p.set(it.p[0], it.p[1], it.p[2]);
    e.set(it.rx ?? 0, it.r ?? 0, it.rz ?? 0);
    q.setFromEuler(e);
    const sc = it.s ?? 1;
    if (typeof sc === "number") s.set(sc, sc, sc);
    else s.set(sc[0], sc[1], sc[2]);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    if (it.c !== undefined) mesh.setColorAt(i, col.setHex(it.c));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** A wall of dressed stone blocks facing +z. */
export function masonry(
  parent: THREE.Object3D,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z: number,
  bw: number,
  bh: number,
  base: number,
  depth = 1.2,
  seed = 3
) {
  const r = rng(seed);
  const items: Item[] = [];
  const rows = Math.max(1, Math.round((y1 - y0) / bh));
  const c = new THREE.Color();
  for (let j = 0; j < rows; j++) {
    const off = (j % 2) * bw * 0.5;
    for (let x = x0 - off; x < x1; x += bw) {
      const l = Math.max(x, x0),
        rr = Math.min(x + bw, x1);
      if (rr - l < 0.3) continue;
      c.setHex(base).offsetHSL(0, 0, (r() - 0.5) * 0.09);
      items.push({
        p: [(l + rr) / 2, y0 + (j + 0.5) * ((y1 - y0) / rows), z],
        s: [(rr - l) * 0.965, ((y1 - y0) / rows) * 0.94, depth],
        c: c.getHex(),
      });
    }
  }
  return inst(new THREE.BoxGeometry(1, 1, 1), std(0xffffff, { roughness: 0.95 }), items, parent);
}

/* ------------------------------------------------------------------ */
/* East-Asian curved roof                                              */
/* ------------------------------------------------------------------ */
export interface RoofOpts {
  curve?: number;
  up?: number;
  thick?: number;
  seg?: number;
  top?: THREE.Material;
  under?: THREE.Material;
  ridge?: THREE.Material;
}
const defaultRoofTop = () => std(0x2b2f36, { roughness: 0.55, flatShading: false });
export function eastRoof(w: number, d: number, h: number, o: RoofOpts = {}) {
  const g = new THREE.Group();
  let W = w,
    D = d,
    rot = false;
  if (D > W) {
    W = d;
    D = w;
    rot = true;
  }
  const { curve = 1.75, up = 0.45, thick = 0.24, seg = 36 } = o;
  const hw = W / 2,
    hd = D / 2,
    L = Math.max(W - D, 0) / 2;
  const hf = (x: number, z: number) => {
    const ax = Math.abs(x),
      az = Math.abs(z);
    const s = Math.max(az, Math.max(ax - L, 0));
    const t = Math.max(0, 1 - s / hd);
    return h * Math.pow(t, curve) + up * Math.pow(ax / hw, 5) * Math.pow(az / hd, 5);
  };
  const nx = seg,
    nz = Math.max(10, Math.round((seg * D) / W));
  const geo = new THREE.PlaneGeometry(W, D, nx, nz);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, hf(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  const topMat = o.top ?? defaultRoofTop();
  topMat.shadowSide = THREE.DoubleSide;
  const underMat = o.under ?? std(0x3a2a1e, { side: THREE.BackSide });
  const topMesh = new THREE.Mesh(geo, topMat);
  const underMesh = new THREE.Mesh(geo, underMat);
  underMesh.position.y = -thick;
  g.add(topMesh, underMesh);

  // fascia
  const pts: [number, number][] = [];
  for (let i = 0; i <= nx; i++) pts.push([-hw + (W * i) / nx, hd]);
  for (let i = 1; i <= nz; i++) pts.push([hw, hd - (D * i) / nz]);
  for (let i = 1; i <= nx; i++) pts.push([hw - (W * i) / nx, -hd]);
  for (let i = 1; i <= nz; i++) pts.push([-hw, -hd + (D * i) / nz]);
  const fpos: number[] = [];
  pts.forEach(([x, z]) => {
    const y = hf(x, z);
    fpos.push(x, y, z, x, y - thick, z);
  });
  const fidx: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    fidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(fpos, 3));
  fg.setIndex(fidx);
  fg.computeVertexNormals();
  g.add(new THREE.Mesh(fg, std(0x1c1511, { side: THREE.DoubleSide })));

  // ridge & finials
  const ridgeMat = o.ridge ?? topMat;
  if (L > 0) {
    box(L * 2 + 1.4, h * 0.07 + 0.3, 0.75, ridgeMat, 0, h - 0.12, 0, g);
    box(0.9, h * 0.13 + 1.0, 0.9, ridgeMat, -L - 0.9, h - 0.4, 0, g).rotation.z = 0.18;
    box(0.9, h * 0.13 + 1.0, 0.9, ridgeMat, L + 0.9, h - 0.4, 0, g).rotation.z = -0.18;
  } else {
    cone(0.5, h * 0.22 + 0.6, ridgeMat, 0, h - 0.1, 0, g, 6);
  }
  if (rot) g.rotation.y = Math.PI / 2;
  return g;
}

/* ------------------------------------------------------------------ */
/* mountains                                                           */
/* ------------------------------------------------------------------ */
export function peakGeo(
  h: number,
  r: number,
  low: THREE.Color,
  high: THREE.Color,
  snow?: THREE.Color,
  snowLine = 0.62
) {
  const g = new THREE.ConeGeometry(r, h, 7, 5, true);
  g.translate(0, h / 2, 0);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const t = y / h;
    const n1 = (hash2(Math.round(x * 10) / 10 + 1.3, Math.round(z * 10) / 10 + 7.1) - 0.5) * r * 0.45 * (1 - t);
    const n2 = (hash2(Math.round(z * 10) / 10 + 4.4, Math.round(x * 10) / 10 + 2.9) - 0.5) * r * 0.45 * (1 - t);
    x += n1;
    z += n2;
    if (t > 0.02 && t < 0.98) y += (hash2(x * 0.7, z * 0.7) - 0.5) * h * 0.07;
    pos.setXYZ(i, x, y, z);
    const sl = snowLine + (hash2(x * 0.3, z * 0.3) - 0.5) * 0.14;
    if (snow && t > sl) c.copy(snow);
    else c.copy(low).lerp(high, Math.pow(t, 0.8));
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g;
}

export interface RingOpts {
  n: number;
  rMin: number;
  rMax: number;
  hMin: number;
  hMax: number;
  wMin: number;
  wMax: number;
  low: number;
  high: number;
  snow?: number;
  snowLine?: number;
  seed?: number;
  maxZ?: number;
  cx?: number;
  cz?: number;
}
export function ringMountains(parent: THREE.Object3D, o: RingOpts) {
  const r = rng(o.seed ?? 11);
  const low = new THREE.Color(o.low),
    high = new THREE.Color(o.high);
  const snow = o.snow !== undefined ? new THREE.Color(o.snow) : undefined;
  const variants = 3;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  const lists: Item[][] = [[], [], []];
  let tries = 0;
  let placed = 0;
  while (placed < o.n && tries < o.n * 20) {
    tries++;
    const a = r() * TAU;
    const rad = lerp(o.rMin, o.rMax, r());
    const x = (o.cx ?? 0) + Math.cos(a) * rad;
    const z = (o.cz ?? 0) + Math.sin(a) * rad;
    if (z > (o.maxZ ?? 30)) continue;
    const h = lerp(o.hMin, o.hMax, Math.pow(r(), 1.3));
    const w = lerp(o.wMin, o.wMax, r());
    const shade = 0.85 + r() * 0.3;
    const cc = new THREE.Color(0xffffff).multiplyScalar(shade).getHex();
    lists[placed % variants].push({
      p: [x, -h * 0.06, z],
      r: r() * TAU,
      s: [w / 40, h / 100, (w / 40) * (0.8 + r() * 0.4)],
      c: cc,
    });
    placed++;
  }
  for (let v = 0; v < variants; v++) {
    const geo = peakGeo(100, 40, low, high, snow, o.snowLine ?? 0.62);
    // change per-variant silhouette
    geo.rotateY(v * 1.1);
    const m = inst(geo, mat, lists[v], parent);
    m.castShadow = false;
    m.receiveShadow = false;
  }
}

/* ------------------------------------------------------------------ */
/* textures                                                            */
/* ------------------------------------------------------------------ */
export function windowTex(cols: number, rows: number, seed = 1, lit = 0.45) {
  const cell = 8;
  const c = document.createElement("canvas");
  c.width = cols * cell;
  c.height = rows * cell;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  const r = rng(seed);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (r() < lit) {
        const b = 0.45 + r() * 0.55;
        ctx.fillStyle = `rgb(${(255 * b) | 0},${((196 + 50 * r()) * b) | 0},${((120 + 70 * r()) * b) | 0})`;
        ctx.fillRect(x * cell + 1, y * cell + 2, cell - 3, cell - 4);
      }
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

export function enableShadows(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if ((m as THREE.Mesh).isMesh) {
      if (m.userData.noShadow) return;
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
}

/** Heightfield mesh with vertex colours. */
export function heightMesh(
  sizeX: number,
  sizeZ: number,
  segX: number,
  segZ: number,
  fn: (x: number, z: number) => number,
  colorFn: (x: number, y: number, z: number) => THREE.Color,
  cx = 0,
  cz = 0
) {
  const geo = new THREE.PlaneGeometry(sizeX, sizeZ, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx,
      z = pos.getZ(i) + cz;
    const y = fn(x, z);
    pos.setY(i, y);
    const c = colorFn(x, y, z);
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  geo.translate(cx, 0, cz);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })
  );
  m.receiveShadow = true;
  m.castShadow = true;
  return m;
}
