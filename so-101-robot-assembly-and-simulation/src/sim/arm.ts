import * as THREE from 'three';
import { H0, L1, L2, L3, Joints, lerp } from './kinematics';

export const PAN_Y = 4.1;
export const LIFT_Y = H0 - PAN_Y;
export const JAW_CLOSED = (34.7 * Math.PI) / 180;
export const JAW_OPEN = (-60 * Math.PI) / 180;

export type Variant = 'follower' | 'leader';

export interface ArmRig {
  root: THREE.Group;
  pan: THREE.Group;
  lift: THREE.Group;
  elbow: THREE.Group;
  wrist: THREE.Group;
  roll: THREE.Group;
  jaw: THREE.Group;
  tip: THREE.Object3D;
  parts: Record<string, THREE.Group>;
  setJoints: (j: Joints, holdWidthFrac?: number) => void;
}

export interface ArmOptions {
  color: number;
  variant?: Variant;
  clamps?: boolean;
  controller?: boolean;
}

const MOTOR_COLOR = 0x1d2025;

function mk(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  return mk(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
}

function cyl(r: number, h: number, mat: THREE.Material, axis: 'x' | 'y' | 'z', x = 0, y = 0, z = 0, seg = 28) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  return mk(g, mat, x, y, z);
}

function extrude(shape: THREE.Shape, thick: number, bevel = 0.05) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thick,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 20,
  });
  g.translate(0, 0, -thick / 2);
  return g;
}

function stadiumGeo(len: number, r: number, thick: number) {
  const s = new THREE.Shape();
  s.moveTo(0, -r);
  s.lineTo(len, -r);
  s.absarc(len, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(0, r);
  s.absarc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  // pivot holes
  const h1 = new THREE.Path();
  h1.absarc(0, 0, r * 0.38, 0, Math.PI * 2, true);
  const h2 = new THREE.Path();
  h2.absarc(len, 0, r * 0.38, 0, Math.PI * 2, true);
  s.holes.push(h1, h2);
  return extrude(s, thick);
}

function polyGeo(pts: [number, number][], thick: number) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return extrude(s, thick);
}

function slabGeo(x0: number, x1: number, z0: number, z1: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(x0 + r, z0);
  s.lineTo(x1 - r, z0);
  s.quadraticCurveTo(x1, z0, x1, z0 + r);
  s.lineTo(x1, z1 - r);
  s.quadraticCurveTo(x1, z1, x1 - r, z1);
  s.lineTo(x0 + r, z1);
  s.quadraticCurveTo(x0, z1, x0, z1 - r);
  s.lineTo(x0, z0 + r);
  s.quadraticCurveTo(x0, z0, x0 + r, z0);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(Math.PI / 2);
  g.translate(0, h, 0);
  return g;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function orient(g: THREE.Object3D, shaft: THREE.Vector3, body: THREE.Vector3) {
  const xa = body.clone().multiplyScalar(-1).normalize();
  const za = shaft.clone().normalize();
  const ya = new THREE.Vector3().crossVectors(za, xa);
  const m = new THREE.Matrix4().makeBasis(xa, ya, za);
  g.quaternion.setFromRotationMatrix(m);
}

export function buildArm(opts: ArmOptions): ArmRig {
  const variant = opts.variant ?? 'follower';
  const print = new THREE.MeshStandardMaterial({ color: opts.color, roughness: 0.48, metalness: 0.04 });
  const motorMat = new THREE.MeshStandardMaterial({ color: MOTOR_COLOR, roughness: 0.55, metalness: 0.25 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xe9edf2, roughness: 0.35, metalness: 0.7 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.9 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b0, roughness: 0.35, metalness: 0.75 });
  const pcbMat = new THREE.MeshStandardMaterial({ color: 0x1b8a57, roughness: 0.6, metalness: 0.1 });
  const labelMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 });

  const parts: Record<string, THREE.Group> = {};
  const part = (id: string, parent: THREE.Object3D) => {
    const g = new THREE.Group();
    g.userData.partId = id;
    g.name = id;
    parent.add(g);
    parts[id] = g;
    return g;
  };

  function motor(pos: [number, number, number], shaft: THREE.Vector3, body: THREE.Vector3, hornLen = 0.4) {
    const g = new THREE.Group();
    g.position.set(...pos);
    orient(g, shaft, body);
    g.add(box(4.5, 3.4, 2.5, motorMat, -1.05, 0, 0));
    g.add(cyl(1.7, 2.5, motorMat, 'z', 0, 0, 0, 32));
    g.add(box(2.4, 1.0, 0.04, labelMat, -1.7, 0, 1.27));
    for (const s of [1, -1]) {
      g.add(cyl(0.98, hornLen, hornMat, 'z', 0, 0, s * (1.25 + hornLen / 2)));
      g.add(cyl(0.3, hornLen + 0.12, motorMat, 'z', 0, 0, s * (1.25 + hornLen / 2)));
    }
    return g;
  }

  const root = new THREE.Group();

  // ---------- BASE ----------
  const base = part('base', root);
  base.add(mk(slabGeo(-5, 3.2, -4.2, 4.2, 1.2, 0.9), print));
  for (const s of [1, -1]) base.add(box(8.2, 2.4, 0.4, print, -0.9, 2.4, s * 3.5));
  base.add(box(0.4, 2.4, 7.4, print, -4.8, 2.4, 0));

  // ---------- MOTOR 1 (shoulder pan) ----------
  const m1 = part('motor1', root);
  m1.add(motor([0, 2.45, 0], v(0, 1, 0), v(-1, 0, 0), 0.4));

  const h1 = part('holder1', root);
  h1.add(box(2.6, 0.3, 3.6, print, -2.5, 3.85, 0));
  for (const s of [1, -1]) h1.add(box(2.6, 2.5, 0.3, print, -2.5, 2.45, s * 1.95));

  if (opts.controller !== false) {
    const c = part('controller', root);
    c.add(box(0.2, 3.0, 4.4, pcbMat, -5.15, 3.0, 0));
    c.add(box(0.7, 0.8, 1.2, metalMat, -5.6, 2.2, -1.2));
    c.add(box(0.8, 1.0, 1.6, padMat, -5.6, 3.6, 1.0));
    c.add(box(0.5, 0.5, 0.5, padMat, -5.5, 4.2, -1.4));
    c.add(box(0.3, 0.3, 0.3, new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0x551100 }), -5.4, 4.2, -0.3));
  }

  if (opts.clamps) {
    const cl = part('clamps', root);
    for (const s of [1, -1]) {
      cl.add(box(1.4, 4.4, 0.8, metalMat, -1, 0.4, s * 5.1));
      cl.add(box(1.4, 0.8, 2.8, metalMat, -1, 2.2, s * 4.0));
      cl.add(box(1.4, 0.6, 2.4, metalMat, -1, -1.5, s * 4.2));
      cl.add(cyl(0.32, 1.4, metalMat, 'y', -1, 1.4, s * 3.4));
      cl.add(cyl(0.7, 0.3, padMat, 'y', -1, 0.8, s * 3.4));
    }
  }

  // ---------- PAN NODE ----------
  const pan = new THREE.Group();
  pan.position.set(0, PAN_Y, 0);
  root.add(pan);

  const shoulder = part('shoulder', pan);
  shoulder.add(box(6, 0.5, 5.6, print, 0, 0.25, 0));
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-2.4, 0);
  wallShape.lineTo(2.4, 0);
  wallShape.lineTo(2.4, LIFT_Y);
  wallShape.absarc(0, LIFT_Y, 2.4, 0, Math.PI, false);
  wallShape.lineTo(-2.4, 0);
  const hole = new THREE.Path();
  hole.absarc(0, LIFT_Y, 0.9, 0, Math.PI * 2, true);
  wallShape.holes.push(hole);
  const wallGeo = extrude(wallShape, 0.45, 0.03);
  for (const s of [1, -1]) shoulder.add(mk(wallGeo, print, 0, 0, s * 1.52));
  shoulder.add(box(0.4, 3.2, 3.6, print, -2.6, 1.9, 0));

  const m2 = part('motor2', pan);
  m2.add(motor([0, LIFT_Y, 0], v(0, 0, 1), v(-1, 0, 0), 0.5));

  // ---------- LIFT NODE ----------
  const lift = new THREE.Group();
  lift.position.set(0, LIFT_Y, 0);
  pan.add(lift);

  const upper = part('upperarm', lift);
  const upperGeo = stadiumGeo(L1, 1.9, 0.5);
  for (const s of [1, -1]) upper.add(mk(upperGeo, print, 0, 0, s * 2.03));
  upper.add(box(5.5, 0.4, 4.6, print, 6.2, -1.7, 0));
  upper.add(box(0.4, 3.4, 4.6, print, 2.0, 0, 0));

  const m3 = part('motor3', lift);
  m3.add(motor([L1, 0, 0], v(0, 0, 1), v(-1, 0, 0), 1.1));

  // ---------- ELBOW NODE ----------
  const elbow = new THREE.Group();
  elbow.position.set(L1, 0, 0);
  lift.add(elbow);

  const fore = part('forearm', elbow);
  const foreGeo = stadiumGeo(L2, 1.7, 0.5);
  for (const s of [1, -1]) fore.add(mk(foreGeo, print, 0, 0, s * 2.6));
  fore.add(box(5.5, 0.4, 5.7, print, 7.0, -1.55, 0));
  fore.add(box(0.4, 3.0, 5.7, print, 2.4, 0, 0));

  const h4 = part('holder4', elbow);
  for (const s of [1, -1]) h4.add(box(2.0, 3.4, 1.1, print, L2 - 2.3, 0, s * 1.8));
  h4.add(box(2.0, 0.35, 5.7, print, L2 - 2.3, 1.75, 0));

  const m4 = part('motor4', elbow);
  m4.add(motor([L2, 0, 0], v(0, 0, 1), v(-1, 0, 0), 0.5));

  // ---------- WRIST NODE ----------
  const wrist = new THREE.Group();
  wrist.position.set(L2, 0, 0);
  elbow.add(wrist);

  const wr = part('wrist', wrist);
  const wristGeo = stadiumGeo(5.0, 1.9, 0.4);
  for (const s of [1, -1]) {
    wr.add(mk(wristGeo, print, 0, 0, s * 1.95));
    wr.add(box(3.4, 3.4, 0.4, print, 4.4, -2.4, s * 1.95));
  }
  wr.add(box(3.4, 0.4, 4.3, print, 4.4, -4.0, 0));

  const m5 = part('motor5', wrist);
  m5.add(motor([4.6, 0, 0], v(1, 0, 0), v(0, -1, 0), 0.4));

  // ---------- ROLL NODE ----------
  const roll = new THREE.Group();
  roll.position.set(6.3, 0, 0);
  wrist.add(roll);

  const hand = part('hand', roll);
  for (const s of [1, -1]) hand.add(box(3.4, 0.35, 4.2, print, 1.7, s * 1.45, 0.7));
  hand.add(box(0.4, 3.3, 4.2, print, 0.2, 0, 0.7));

  const m6 = part('motor6', roll);
  m6.add(motor([3.0, 0, 1.0], v(0, 1, 0), v(-1, 0, 0), 0.3));

  const jaw = new THREE.Group();
  jaw.position.set(3.0, 0, 1.0);
  roll.add(jaw);
  const jawPart = part('jaw', jaw);

  if (variant === 'follower') {
    hand.add(box(3.6, 3.3, 0.5, print, 1.8, 0, -1.15));
    hand.add(mk(polyGeo([[3.6, -1.65], [5.7, -0.8], [5.7, 0.8], [3.6, 1.65]], 0.5), print, 0, 0, -1.15));
    hand.add(box(1.6, 1.4, 0.2, padMat, 4.9, 0, -0.8));
    jawPart.add(mk(polyGeo([[0, -1.1], [3.1, -0.8], [3.1, 0.8], [0, 1.1]], 0.5), print, 0, 0, 0));
    jawPart.add(box(1.5, 1.4, 0.2, padMat, 2.2, 0, -0.35));
  } else {
    // leader: pistol handle + trigger
    hand.add(cyl(1.05, 7.0, print, 'y', 2.4, -4.2, 0.2));
    hand.add(box(3.0, 0.5, 2.6, print, 2.4, -0.9, 0.2));
    jawPart.add(box(2.6, 1.7, 0.5, print, 1.3, -0.6, 0));
    jawPart.add(box(1.0, 1.0, 0.7, padMat, 2.2, -0.9, 0));
  }

  const tip = new THREE.Object3D();
  tip.position.set(L3 - 6.3, 0, 0.3);
  roll.add(tip);

  const rig: ArmRig = {
    root,
    pan,
    lift,
    elbow,
    wrist,
    roll,
    jaw,
    tip,
    parts,
    setJoints(j, holdFrac = 0) {
      pan.rotation.y = j.pan;
      lift.rotation.z = j.a1;
      elbow.rotation.z = j.a2 - j.a1;
      wrist.rotation.z = j.a3 - j.a2;
      roll.rotation.x = j.roll;
      const g = Math.max(j.grip, holdFrac);
      jaw.rotation.y = lerp(JAW_CLOSED, JAW_OPEN, g);
    },
  };
  return rig;
}
