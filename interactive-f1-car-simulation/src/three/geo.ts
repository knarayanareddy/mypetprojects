import * as THREE from "three";

/** Airfoil cross-section (chord along x, leading edge at -x). Camber bows DOWN (inverted wing => downforce). */
export function airfoilShape(chord: number, t: number, m: number): THREE.Shape {
  const N = 18;
  const up: [number, number][] = [];
  const lo: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const s = (1 - Math.cos((Math.PI * i) / N)) / 2;
    const yt =
      5 *
      t *
      chord *
      (0.2969 * Math.sqrt(s) - 0.126 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1036 * s ** 4);
    const yc = -m * chord * 4 * s * (1 - s);
    const x = (s - 0.5) * chord;
    up.push([x, yc + yt]);
    lo.push([x, yc - yt]);
  }
  const sh = new THREE.Shape();
  sh.moveTo(up[0][0], up[0][1]);
  for (let i = 1; i <= N; i++) sh.lineTo(up[i][0], up[i][1]);
  for (let i = N - 1; i >= 0; i--) sh.lineTo(lo[i][0], lo[i][1]);
  return sh;
}

export function wingElement(
  chord: number,
  span: number,
  thick: number,
  camber: number,
  mat: THREE.Material,
): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(airfoilShape(chord, thick, camber), {
    depth: span,
    bevelEnabled: false,
    steps: 1,
  });
  geo.translate(0, 0, -span / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

export interface Sec {
  x: number;
  y0: number;
  y1: number;
  hw: number;
  zc?: number;
  n?: number;
}

export function loftGeometry(secs: Sec[], N = 28): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const ring = (s: Sec) => {
    const yc = (s.y0 + s.y1) / 2;
    const hh = (s.y1 - s.y0) / 2;
    const zc = s.zc ?? 0;
    const n = s.n ?? 3;
    const pts: number[] = [];
    for (let j = 0; j < N; j++) {
      const th = (j / N) * Math.PI * 2;
      const c = Math.cos(th);
      const sn = Math.sin(th);
      const z = zc + s.hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const y = yc + hh * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      pts.push(s.x, y, z);
    }
    return pts;
  };
  secs.forEach((s) => pos.push(...ring(s)));
  for (let i = 0; i < secs.length - 1; i++) {
    for (let j = 0; j < N; j++) {
      const a = i * N + j;
      const b = i * N + ((j + 1) % N);
      const c = (i + 1) * N + j;
      const d = (i + 1) * N + ((j + 1) % N);
      idx.push(a, b, c, b, d, c);
    }
  }
  // caps (duplicated verts for crisp edge)
  const cap = (s: Sec, flip: boolean) => {
    const base = pos.length / 3;
    pos.push(...ring(s));
    const c = base + N;
    pos.push(s.x, (s.y0 + s.y1) / 2, s.zc ?? 0);
    for (let j = 0; j < N; j++) {
      const a = base + j;
      const b = base + ((j + 1) % N);
      if (flip) idx.push(c, b, a);
      else idx.push(c, a, b);
    }
  };
  cap(secs[0], false);
  cap(secs[secs.length - 1], true);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function loft(secs: Sec[], mat: THREE.Material, N = 28): THREE.Mesh {
  const m = new THREE.Mesh(loftGeometry(secs, N), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cyl(
  r: number,
  len: number,
  axis: "x" | "y" | "z",
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  seg = 24,
  r2?: number,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r2 ?? r, r, len, seg);
  if (axis === "x") geo.rotateZ(Math.PI / 2);
  if (axis === "z") geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function sphere(r: number, mat: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}

const UP = new THREE.Vector3(0, 1, 0);
export function strut(
  a: [number, number, number],
  b: [number, number, number],
  r: number,
  mat: THREE.Material,
): THREE.Mesh {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
  m.position.copy(va).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  m.castShadow = true;
  return m;
}

export function tube(points: [number, number, number][], r: number, mat: THREE.Material, seg = 40): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 10, false), mat);
  m.castShadow = true;
  return m;
}

/** Extrude a polygon drawn in the x/y plane along z (centered on z=0). */
export function extrudePoly(pts: [number, number][], depth: number, mat: THREE.Material): THREE.Mesh {
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
