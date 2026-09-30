import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M, T, type Spec } from './helpers';
import { getTexture, makeHatch } from './textures';
import * as A from './towersA';
import * as B from './towersB';

const BUILD: Record<string, (t: T) => void> = {
  india: A.india,
  china: A.china,
  usa: B.usa,
  indonesia: A.indonesia,
  pakistan: A.pakistan,
  nigeria: B.nigeria,
  brazil: B.brazil,
  bangladesh: A.bangladesh,
  russia: B.russia,
  ethiopia: B.ethiopia,
  mexico: B.mexico,
  japan: A.japan,
  egypt: B.egypt,
  philippines: A.philippines,
  drc: B.congo,
  vietnam: A.vietnam,
  iran: A.iran,
  turkey: B.turkey,
  germany: B.germany,
  thailand: A.thailand,
};

export const DURATION = 5.2;
export const STAGE_AT = [0.22, 0.58, 0.84];

export interface EngineState {
  p: number;
  stage: number;
  playing: boolean;
  done: boolean;
}

/* ------------------------------------------------------------ environment */
type CK = 'top' | 'mid' | 'hor' | 'fog' | 'sun' | 'hemiSky' | 'hemiGnd' | 'ground' | 'gBase' | 'gTip';
type NK = 'sunI' | 'az' | 'el' | 'hemiI' | 'stars' | 'glow' | 'exp' | 'sunSize' | 'skyGlow';
type Env = Record<CK, THREE.Color> & Record<NK, number>;
type EnvDef = Record<CK, number> & Record<NK, number>;
const CKS: CK[] = ['top', 'mid', 'hor', 'fog', 'sun', 'hemiSky', 'hemiGnd', 'ground', 'gBase', 'gTip'];
const NKS: NK[] = ['sunI', 'az', 'el', 'hemiI', 'stars', 'glow', 'exp', 'sunSize', 'skyGlow'];

function mkEnv(o: EnvDef): Env {
  const e = {} as Env;
  for (const k of CKS) e[k] = new THREE.Color(o[k]);
  for (const k of NKS) e[k] = o[k];
  return e;
}
function copyEnv(dst: Env, src: Env) {
  for (const k of CKS) dst[k].copy(src[k]);
  for (const k of NKS) dst[k] = src[k];
}
function lerpEnv(a: Env, b: Env, k: number) {
  for (const c of CKS) a[c].lerp(b[c], k);
  for (const n of NKS) a[n] += (b[n] - a[n]) * k;
}

const PRESETS: Env[] = [
  // morning
  mkEnv({
    top: 0x6f9bd0, mid: 0xb9cfe3, hor: 0xf6d9b6, fog: 0xe8d8c4, sun: 0xffd6a0,
    hemiSky: 0xbcd0e8, hemiGnd: 0x8a7d66, ground: 0x8c9660, gBase: 0x4e6a34, gTip: 0xaebd6c,
    sunI: 2.6, az: 120, el: 20, hemiI: 0.95, stars: 0, glow: 0, exp: 1, sunSize: 0.9, skyGlow: 0.7,
  }),
  // noon
  mkEnv({
    top: 0x3b7fd4, mid: 0x86b9e6, hor: 0xd3e7f4, fog: 0xcfe0ea, sun: 0xfff4e0,
    hemiSky: 0xcfe3ff, hemiGnd: 0x8a8468, ground: 0x849a55, gBase: 0x45742c, gTip: 0xa3c65a,
    sunI: 3.3, az: 60, el: 62, hemiI: 1.1, stars: 0, glow: 0, exp: 1, sunSize: 0.7, skyGlow: 0.25,
  }),
  // sunset
  mkEnv({
    top: 0x363c7a, mid: 0xc2607c, hor: 0xffa24d, fog: 0xd98c6a, sun: 0xff9748,
    hemiSky: 0xa88aa8, hemiGnd: 0x5b4a4a, ground: 0x7a6a48, gBase: 0x48482a, gTip: 0xd49a4a,
    sunI: 2.8, az: 285, el: 9, hemiI: 0.8, stars: 0.05, glow: 0.35, exp: 1, sunSize: 1.35, skyGlow: 1,
  }),
  // night
  mkEnv({
    top: 0x03071a, mid: 0x0b1633, hor: 0x1c2a52, fog: 0x0c1530, sun: 0x9db7ff,
    hemiSky: 0x2b3c70, hemiGnd: 0x0a0d18, ground: 0x24323a, gBase: 0x0f2118, gTip: 0x35523f,
    sunI: 0.75, az: 235, el: 38, hemiI: 0.7, stars: 1, glow: 1, exp: 1.1, sunSize: 0.55, skyGlow: 0.2,
  }),
];

const WEATHER: { rain: number; storm: number; snow: number }[] = [
  { rain: 0, storm: 0, snow: 0 },
  { rain: 1, storm: 0, snow: 0 },
  { rain: 1, storm: 1, snow: 0 },
  { rain: 0, storm: 0, snow: 1 },
];

/* ------------------------------------------------------------------ noise */
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const sstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function heightAt(x: number, z: number) {
  const r = Math.hypot(x, z);
  const f = sstep(26, 95, r);
  const hills = vnoise(x * 0.035, z * 0.035) * 12 + vnoise(x * 0.1, z * 0.1) * 1.5;
  const near = vnoise(x * 0.15, z * 0.15) * 0.14 * sstep(12, 26, r);
  return f * hills + (1 - f) * near;
}

/* ---------------------------------------------------------------- shaders */
const TONE = `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

const SKY_VERT = `
  varying vec3 vDir;
  void main(){
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = `
  uniform vec3 uTop, uMid, uHor, uSun, uSunDir;
  uniform float uGlow, uFlash;
  varying vec3 vDir;
  void main(){
    vec3 d = normalize(vDir);
    float h = max(d.y, 0.0);
    vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.24, h));
    c = mix(c, uTop, smoothstep(0.16, 0.85, h));
    float s = max(dot(d, uSunDir), 0.0);
    c += uSun * (pow(s, 5.0) * 0.22 + pow(s, 48.0) * 0.55) * uGlow;
    c += vec3(uFlash) * 0.75;
    gl_FragColor = vec4(c, 1.0);
    ${TONE}
  }
`;

const STAR_VERT = `
  attribute float aSize;
  uniform float uPx;
  varying float vTw;
  uniform float uTime;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPx;
    vTw = 0.75 + 0.25 * sin(uTime * 2.0 + position.x * 0.13 + position.z * 0.07);
  }
`;
const STAR_FRAG = `
  uniform float uAlpha;
  varying float vTw;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * uAlpha * vTw;
    gl_FragColor = vec4(vec3(0.9, 0.93, 1.0), a);
    ${TONE}
  }
`;

const GRASS_VERT = `
  attribute vec3 aOffset;
  attribute vec4 aRnd;
  uniform float uTime, uWind, uSnow, uClear;
  varying float vH;
  varying float vDist;
  void main(){
    float h = position.y;
    vH = h;
    float d = length(aOffset.xz);
    float vis = smoothstep(uClear, uClear + 2.5, d);
    float sc = aRnd.x * (1.0 - 0.6 * uSnow) * vis;
    vec3 p = position;
    p.y *= sc;
    float c = cos(aRnd.y), s = sin(aRnd.y);
    p.xz = mat2(c, -s, s, c) * p.xz;
    float sw = sin(uTime * 1.7 + aOffset.x * 0.33 + aOffset.z * 0.27 + aRnd.z * 6.2831);
    sw += 0.5 * sin(uTime * 3.1 + aOffset.z * 0.6 + aRnd.z * 12.0);
    float bend = (0.10 + uWind * 0.55) * h * h * sc;
    p.x += sw * bend + aRnd.w * 0.25 * h * h;
    p.z += sw * bend * 0.5;
    vec4 mv = viewMatrix * vec4(aOffset + p, 1.0);
    vDist = length(mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const GRASS_FRAG = `
  uniform vec3 uBase, uTip, uLight, uFog;
  uniform float uSnow, uFogNear, uFogFar;
  varying float vH;
  varying float vDist;
  void main(){
    vec3 col = mix(uBase, uTip, vH);
    col = mix(col, vec3(0.95, 0.97, 1.0), uSnow * (0.35 + 0.65 * vH));
    col *= uLight;
    float f = smoothstep(uFogNear, uFogFar, vDist);
    col = mix(col, uFog, f);
    gl_FragColor = vec4(col, 1.0);
    ${TONE}
  }
`;

const RAIN_VERT = `
  attribute float aEnd;
  attribute float aRnd;
  uniform float uTime, uSpeed, uAmount, uLen;
  uniform vec2 uWind;
  varying float vA;
  void main(){
    float H = 46.0;
    float sp = uSpeed * (0.85 + fract(aRnd * 13.7) * 0.3);
    float u = fract(position.y / H + uTime * sp / H);
    float y = H * (1.0 - u);
    vec3 p = vec3(position.x + uWind.x * u * H / sp, y, position.z + uWind.y * u * H / sp);
    p.y += uLen * aEnd;
    p.xz -= uWind * (uLen / sp) * aEnd;
    vA = 1.0 - aEnd * 0.85;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    if (aRnd > uAmount) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }
`;
const RAIN_FRAG = `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vA;
  void main(){
    gl_FragColor = vec4(uColor, vA * uAlpha);
    ${TONE}
  }
`;

const SNOW_VERT = `
  attribute float aRnd;
  uniform float uTime, uSpeed, uAmount, uSize;
  uniform vec2 uWind;
  void main(){
    float H = 46.0;
    float sp = uSpeed * (0.6 + fract(aRnd * 9.1) * 0.8);
    float u = fract(position.y / H + uTime * sp / H);
    float y = H * (1.0 - u);
    float t = uTime + aRnd * 100.0;
    vec3 p = vec3(
      position.x + sin(t * 0.7 + aRnd * 20.0) * 0.9 + uWind.x * u * H / sp,
      y,
      position.z + cos(t * 0.6 + aRnd * 15.0) * 0.9 + uWind.y * u * H / sp
    );
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * 2.2, uSize * (0.6 + fract(aRnd * 3.7)) * (40.0 / -mv.z));
    if (aRnd > uAmount) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }
`;
const SNOW_FRAG = `
  uniform vec3 uColor;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.12, d) * 0.9;
    gl_FragColor = vec4(uColor, a);
    ${TONE}
  }
`;

/* ------------------------------------------------------------------ tower */
interface Tower {
  root: THREE.Group;
  geos: THREE.BufferGeometry[];
  scaffold: THREE.Mesh | null;
  height: number; // world units
  width: number;
  s: number;
  clearR: number;
  stencil: THREE.Mesh[];
}

function profileOf(geo: THREE.BufferGeometry, H: number, n: number): Float32Array {
  const pos = (geo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
  const ext = new Float32Array(n + 1);
  const dy = H / n;
  const cnt = pos.length / 9;
  const v = (i: number, k: number) => pos[i * 9 + k];
  const upd = (j: number, e: number) => {
    if (j >= 0 && j <= n && e > ext[j]) ext[j] = e;
  };
  for (let i = 0; i < cnt; i++) {
    for (let e = 0; e < 3; e++) {
      const a = e * 3;
      const b = ((e + 1) % 3) * 3;
      const x0 = v(i, a);
      const y0 = v(i, a + 1);
      const z0 = v(i, a + 2);
      const x1 = v(i, b);
      const y1 = v(i, b + 1);
      const z1 = v(i, b + 2);
      const e0 = Math.max(Math.abs(x0), Math.abs(z0));
      upd(Math.floor(y0 / dy), e0);
      upd(Math.ceil(y0 / dy), e0);
      if (Math.abs(y1 - y0) < 1e-6) continue;
      const lo = Math.min(y0, y1);
      const hi = Math.max(y0, y1);
      for (let j = Math.ceil(lo / dy); j <= Math.floor(hi / dy); j++) {
        const t = (j * dy - y0) / (y1 - y0);
        const x = x0 + (x1 - x0) * t;
        const z = z0 + (z1 - z0) * t;
        upd(j, Math.max(Math.abs(x), Math.abs(z)));
      }
    }
  }
  const out = new Float32Array(n + 1);
  for (let j = 0; j <= n; j++) {
    out[j] = Math.max(ext[j], ext[Math.max(0, j - 1)], ext[Math.min(n, j + 1)]);
  }
  // carry forward over gaps
  for (let j = 1; j <= n; j++) if (out[j] <= 0) out[j] = out[j - 1];
  return out;
}

/* ----------------------------------------------------------------- engine */
export class TowerEngine {
  onState: (s: EngineState) => void = () => {};

  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 1, 2500);

  private cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1);
  private scaffPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private mats = new Map<string, THREE.MeshStandardMaterial>();
  private glowMats: THREE.MeshStandardMaterial[] = [];
  private scaffMat: THREE.MeshStandardMaterial;
  private capMat: THREE.MeshStandardMaterial;
  private cap: THREE.Mesh;

  private tower: Tower | null = null;
  private towerIndex = 0;
  private id = 'india';

  // lights / env
  private sun = new THREE.DirectionalLight(0xffffff, 1);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private stars: THREE.Points;
  private starMat: THREE.ShaderMaterial;
  private sunSprite: THREE.Sprite;
  private terrain: THREE.Mesh;
  private terrainMat: THREE.MeshStandardMaterial;
  private pad: THREE.Mesh;
  private padMat: THREE.MeshStandardMaterial;
  private grassMat: THREE.ShaderMaterial;
  private rainMat: THREE.ShaderMaterial;
  private snowMat: THREE.ShaderMaterial;
  private rain: THREE.LineSegments;
  private snow: THREE.Points;

  private cur: Env;
  private tgt: Env;
  private eff: Env;
  private weatherIndex = 0;
  private wRain = 0;
  private wStorm = 0;
  private wSnow = 0;
  private snowCover = 0;
  private wet = 0;
  private flash = 0;
  private flashQueue: number[] = [];
  private nextBolt = 3;

  // progress
  private p = 0;
  private playing = true;
  private lastEmit = '';

  // camera
  private yaw = 0.65;
  private pitch = 0.17;
  private zoom = 1;
  private yawT = 0.65;
  private pitchT = 0.17;
  private zoomT = 1;
  private leanX = 0;
  private leanY = 0;
  private leanTX = 0;
  private leanTY = 0;
  private fitDist = 40;
  private targetY = 7;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch = 0;

  private raf = 0;
  private last = 0;
  private time = 0;
  private w = 1;
  private h = 1;
  private disposed = false;
  private ro: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.localClippingEnabled = true;
    this.renderer = r;

    this.cur = mkEnv(envDefOf(PRESETS[0]));
    this.tgt = mkEnv(envDefOf(PRESETS[0]));
    this.eff = mkEnv(envDefOf(PRESETS[0]));
    copyEnv(this.cur, PRESETS[0]);
    copyEnv(this.tgt, PRESETS[0]);

    this.scene.fog = new THREE.Fog(0xcccccc, 40, 300);

    // sky
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTop: { value: new THREE.Color() },
        uMid: { value: new THREE.Color() },
        uHor: { value: new THREE.Color() },
        uSun: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uGlow: { value: 0.5 },
        uFlash: { value: 0 },
      },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    // stars in the band of sky the camera can actually see
    const NS = 3500;
    const sp = new Float32Array(NS * 3);
    const ss = new Float32Array(NS);
    for (let i = 0; i < NS; i++) {
      const az = Math.random() * Math.PI * 2;
      const el = (2 + Math.random() * 58) * (Math.PI / 180);
      sp[i * 3] = Math.cos(el) * Math.sin(az) * 900;
      sp[i * 3 + 1] = Math.sin(el) * 900;
      sp[i * 3 + 2] = Math.cos(el) * Math.cos(az) * 900;
      const c = Math.random();
      ss[i] = c > 0.97 ? 3.4 : c > 0.8 ? 2.2 : 1.4;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aSize', new THREE.BufferAttribute(ss, 1));
    this.starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: { uPx: { value: r.getPixelRatio() }, uAlpha: { value: 0 }, uTime: { value: 0 } },
    });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -9;
    this.scene.add(this.stars);

    // sun / moon sprite
    const sc = document.createElement('canvas');
    sc.width = sc.height = 128;
    const sctx = sc.getContext('2d')!;
    const gr = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.12, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.3, 'rgba(255,255,255,0.25)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = gr;
    sctx.fillRect(0, 0, 128, 128);
    this.sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(sc),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    this.sunSprite.renderOrder = -8;
    this.scene.add(this.sunSprite);

    // lights
    this.scene.add(this.hemi);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);

    // terrain
    const tg = new THREE.PlaneGeometry(500, 500, 200, 200);
    tg.rotateX(-Math.PI / 2);
    const tp = tg.getAttribute('position') as THREE.BufferAttribute;
    const col = new Float32Array(tp.count * 3);
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i);
      const z = tp.getZ(i);
      tp.setY(i, heightAt(x, z) - 0.02);
      const n = 0.82 + vnoise(x * 0.3, z * 0.3) * 0.3 + vnoise(x * 0.05, z * 0.05) * 0.2;
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = n;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    tg.computeVertexNormals();
    this.terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    this.terrain = new THREE.Mesh(tg, this.terrainMat);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);

    this.padMat = new THREE.MeshStandardMaterial({
      color: 0xa89c84,
      roughness: 1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const pg = new THREE.CircleGeometry(1, 72);
    pg.rotateX(-Math.PI / 2);
    this.pad = new THREE.Mesh(pg, this.padMat);
    this.pad.position.y = 0.01;
    this.pad.receiveShadow = true;
    this.scene.add(this.pad);

    // grass
    const blade = new THREE.InstancedBufferGeometry();
    const bp: number[] = [];
    const bi: number[] = [];
    const segs = 3;
    for (let i = 0; i <= segs; i++) {
      const y = i / segs;
      const w = 0.075 * (1 - y * 0.88);
      bp.push(-w, y, 0, w, y, 0);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2;
      bi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    blade.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    blade.setIndex(bi);
    const NG = 70000;
    const off = new Float32Array(NG * 3);
    const rnd = new Float32Array(NG * 4);
    for (let i = 0; i < NG; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 4 + 80 * Math.sqrt(Math.random());
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      off[i * 3] = x;
      off[i * 3 + 1] = heightAt(x, z) - 0.02;
      off[i * 3 + 2] = z;
      rnd[i * 4] = 0.55 + Math.random() * 0.9;
      rnd[i * 4 + 1] = Math.random() * Math.PI * 2;
      rnd[i * 4 + 2] = Math.random();
      rnd[i * 4 + 3] = Math.random() - 0.5;
    }
    blade.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 3));
    blade.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 4));
    blade.instanceCount = NG;
    this.grassMat = new THREE.ShaderMaterial({
      vertexShader: GRASS_VERT,
      fragmentShader: GRASS_FRAG,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: 0.2 },
        uSnow: { value: 0 },
        uClear: { value: 10 },
        uBase: { value: new THREE.Color() },
        uTip: { value: new THREE.Color() },
        uLight: { value: new THREE.Color(1, 1, 1) },
        uFog: { value: new THREE.Color() },
        uFogNear: { value: 40 },
        uFogFar: { value: 300 },
      },
    });
    const grass = new THREE.Mesh(blade, this.grassMat);
    grass.frustumCulled = false;
    this.scene.add(grass);

    // weather
    const NR = 14000;
    const rp = new Float32Array(NR * 2 * 3);
    const re = new Float32Array(NR * 2);
    const rr2 = new Float32Array(NR * 2);
    for (let i = 0; i < NR; i++) {
      const x = (Math.random() - 0.5) * 110;
      const y = Math.random() * 46;
      const z = (Math.random() - 0.5) * 110;
      const k = Math.random();
      for (let e = 0; e < 2; e++) {
        const idx = i * 2 + e;
        rp[idx * 3] = x;
        rp[idx * 3 + 1] = y;
        rp[idx * 3 + 2] = z;
        re[idx] = e;
        rr2[idx] = k;
      }
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    rg.setAttribute('aEnd', new THREE.BufferAttribute(re, 1));
    rg.setAttribute('aRnd', new THREE.BufferAttribute(rr2, 1));
    this.rainMat = new THREE.ShaderMaterial({
      vertexShader: RAIN_VERT,
      fragmentShader: RAIN_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 40 },
        uAmount: { value: 0 },
        uLen: { value: 1.6 },
        uWind: { value: new THREE.Vector2() },
        uColor: { value: new THREE.Color() },
        uAlpha: { value: 0.4 },
      },
    });
    this.rain = new THREE.LineSegments(rg, this.rainMat);
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 20;
    this.scene.add(this.rain);

    const NF = 11000;
    const fp = new Float32Array(NF * 3);
    const fr = new Float32Array(NF);
    for (let i = 0; i < NF; i++) {
      fp[i * 3] = (Math.random() - 0.5) * 110;
      fp[i * 3 + 1] = Math.random() * 46;
      fp[i * 3 + 2] = (Math.random() - 0.5) * 110;
      fr[i] = Math.random();
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    fg.setAttribute('aRnd', new THREE.BufferAttribute(fr, 1));
    this.snowMat = new THREE.ShaderMaterial({
      vertexShader: SNOW_VERT,
      fragmentShader: SNOW_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 3.2 },
        uAmount: { value: 0 },
        uSize: { value: 9 * r.getPixelRatio() },
        uWind: { value: new THREE.Vector2() },
        uColor: { value: new THREE.Color(1, 1, 1) },
      },
    });
    this.snow = new THREE.Points(fg, this.snowMat);
    this.snow.frustumCulled = false;
    this.snow.renderOrder = 21;
    this.scene.add(this.snow);

    // scaffolding + cut-plane cap materials
    this.scaffMat = new THREE.MeshStandardMaterial({
      color: 0xa8845a,
      roughness: 0.9,
      clippingPlanes: [this.scaffPlane],
      clipShadows: true,
    });
    const hatch = makeHatch();
    hatch.repeat.set(200, 200);
    this.capMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: hatch,
      emissive: 0xffffff,
      emissiveMap: hatch,
      emissiveIntensity: 0.4,
      roughness: 0.95,
      side: THREE.DoubleSide,
      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.ReplaceStencilOp,
      stencilZFail: THREE.ReplaceStencilOp,
      stencilZPass: THREE.ReplaceStencilOp,
    });
    const pl = new THREE.PlaneGeometry(400, 400);
    pl.rotateX(-Math.PI / 2);
    this.cap = new THREE.Mesh(pl, this.capMat);
    this.cap.renderOrder = 1.1;
    this.cap.onAfterRender = (rend) => rend.clearStencil();
    this.scene.add(this.cap);

    // input
    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('dblclick', this.recenter);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();

    this.setTower(0);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ------------------------------------------------------------ public API */
  setTower(i: number) {
    this.towerIndex = i;
    this.buildTower();
    this.p = 0;
    this.playing = true;
    this.emit(true);
  }
  setTod(i: number) {
    copyEnv(this.tgt, PRESETS[i]);
  }
  setWeather(i: number) {
    this.weatherIndex = i;
    this.flashQueue = [];
    this.nextBolt = 1.5;
  }
  play() {
    if (this.p >= 1) this.p = 0;
    this.playing = true;
    this.emit(true);
  }
  pause() {
    this.playing = false;
    this.emit(true);
  }
  toggle() {
    if (this.playing && this.p < 1) this.pause();
    else this.play();
  }
  rebuild() {
    this.p = 0;
    this.playing = true;
    this.emit(true);
  }
  seek(p: number) {
    this.p = Math.max(0, Math.min(1, p));
    this.playing = false;
    this.emit(true);
  }
  recenter = () => {
    this.yawT = 0.65;
    this.pitchT = 0.17;
    this.zoomT = 1;
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.recenter);
    this.renderer.dispose();
  }

  /* --------------------------------------------------------------- building */
  private material(spec: Spec): THREE.MeshStandardMaterial {
    let m = this.mats.get(spec.key);
    if (m) return m;
    m = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: spec.rough,
      metalness: spec.metal,
      clippingPlanes: [this.cut],
      clipShadows: true,
    });
    const map = getTexture(spec.tex, spec.tile);
    if (map) m.map = map;
    if (spec.tex === 'glass') {
      m.emissive = new THREE.Color(0xffd7a0);
      m.emissiveMap = getTexture('glass', spec.tile, true);
      m.emissiveIntensity = 0;
      m.userData.base = 0;
      this.glowMats.push(m);
    } else if (spec.glow) {
      m.emissive = new THREE.Color(spec.color);
      m.emissiveIntensity = 0.4;
      m.userData.base = 0.35;
      this.glowMats.push(m);
    }
    this.mats.set(spec.key, m);
    return m;
  }

  private disposeTower() {
    if (!this.tower) return;
    this.scene.remove(this.tower.root);
    for (const g of this.tower.geos) g.dispose();
    if (this.tower.scaffold) this.tower.scaffold.geometry.dispose();
    this.tower = null;
  }

  private buildTower() {
    this.disposeTower();
    this.id = ['india', 'china', 'usa', 'indonesia', 'pakistan', 'nigeria', 'brazil', 'bangladesh', 'russia', 'ethiopia', 'mexico', 'japan', 'egypt', 'philippines', 'drc', 'vietnam', 'iran', 'turkey', 'germany', 'thailand'][this.towerIndex];
    const t = new T();
    BUILD[this.id](t);

    const root = new THREE.Group();
    const inner = new THREE.Group();
    root.add(inner);
    const merged: THREE.BufferGeometry[] = [];
    for (const g of t.groups.values()) {
      const geo = mergeGeometries(g.geos, false);
      if (!geo) continue;
      merged.push(geo);
      const mesh = new THREE.Mesh(geo, this.material(g.spec));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.renderOrder = 6;
      inner.add(mesh);
    }
    const all = mergeGeometries(merged, false)!;
    all.computeBoundingBox();
    const bb = all.boundingBox!;
    const H = bb.max.y;
    const W = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
    const s = Math.min(16 / H, 21 / W);

    // stencil passes: count front/back faces to fill the cut section
    const mkStencil = (side: THREE.Side, op: THREE.StencilOp) => {
      const m = new THREE.MeshBasicMaterial({
        side,
        depthWrite: false,
        depthTest: false,
        colorWrite: false,
        stencilWrite: true,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilFail: op,
        stencilZFail: op,
        stencilZPass: op,
        clippingPlanes: [this.cut],
      });
      const mesh = new THREE.Mesh(all, m);
      mesh.renderOrder = 1;
      mesh.frustumCulled = false;
      return mesh;
    };
    const back = mkStencil(THREE.BackSide, THREE.IncrementWrapStencilOp);
    const front = mkStencil(THREE.FrontSide, THREE.DecrementWrapStencilOp);
    inner.add(back, front);
    inner.scale.setScalar(s);

    // scaffolding that follows the tower's silhouette
    const N = 64;
    const prof = profileOf(all, H, N);
    const extAt = (y: number) => {
      const f = Math.max(0, Math.min(N, (y / H) * N));
      const j = Math.floor(f);
      const k = Math.min(N, j + 1);
      return (prof[j] + (prof[k] - prof[j]) * (f - j)) * s;
    };
    const HW = H * s;
    const st = new T();
    const wood = M('wood', 0xa8845a, { tile: 1, rough: 0.9 });
    const step = 1.5;
    const levels: { y: number; e: number }[] = [];
    for (let y = 0; y < HW * 0.97; y += step) levels.push({ y, e: extAt(y) + 0.5 });
    levels.push({ y: HW * 0.97 + 0.2, e: extAt(HW * 0.95) + 0.5 });
    const th = 0.09;
    levels.forEach((L, i) => {
      const { y, e } = L;
      const c: [number, number][] = [
        [-e, -e],
        [e, -e],
        [e, e],
        [-e, e],
      ];
      for (let k = 0; k < 4; k++) {
        const a = c[k];
        const b = c[(k + 1) % 4];
        st.strut(wood, [a[0], y, a[1]], [b[0], y, b[1]], th);
      }
      if (i % 2 === 0) {
        st.box(wood, e * 2, 0.06, 0.55, 0, y + 0.05, -e);
        st.box(wood, e * 2, 0.06, 0.55, 0, y + 0.05, e);
        st.box(wood, 0.55, 0.06, e * 2, -e, y + 0.05, 0);
        st.box(wood, 0.55, 0.06, e * 2, e, y + 0.05, 0);
      }
      const nx = levels[i + 1];
      if (nx) {
        for (let k = 0; k < 4; k++) {
          const a = c[k];
          const sx = Math.sign(a[0]);
          const sz = Math.sign(a[1]);
          st.strut(wood, [a[0], y, a[1]], [sx * nx.e, nx.y, sz * nx.e], th * 1.2);
        }
        // diagonal braces
        if (i % 2 === 1) {
          const f = (i % 4) / 2 === 0.5 ? 1 : -1;
          st.strut(wood, [-e, y, -e * f], [nx.e, nx.y, nx.e * f], th * 0.8);
          st.strut(wood, [-e * f, y, e], [nx.e * f, nx.y, -nx.e], th * 0.8);
        }
      }
    });
    const sgeo = mergeGeometries(st.groups.get(wood.key)!.geos, false)!;
    const scaffold = new THREE.Mesh(sgeo, this.scaffMat);
    scaffold.castShadow = true;
    scaffold.receiveShadow = true;
    root.add(scaffold);

    this.scene.add(root);
    merged.push(all);
    this.tower = { root, geos: merged, scaffold, height: HW, width: W * s, s, clearR: (prof.reduce((m, v) => Math.max(m, v), 0) * s) * 1.25 + 1.5, stencil: [back, front] };

    // frame
    this.targetY = HW * 0.47;
    this.pad.scale.setScalar(this.tower.clearR);
    (this.grassMat.uniforms.uClear as THREE.IUniform<number>).value = this.tower.clearR;
    const half = Math.max(HW, this.tower.width) * 0.95 + 4;
    const sc = this.sun.shadow.camera;
    sc.left = -half;
    sc.right = half;
    sc.top = half;
    sc.bottom = -half;
    sc.near = 1;
    sc.far = 400;
    sc.updateProjectionMatrix();
    this.updateFit();
    this.applyProgress();
  }

  private updateFit() {
    if (!this.tower) return;
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const aspect = this.w / this.h;
    const hFit = (this.tower.height * 0.6) / tanV;
    const wFit = (this.tower.width * 0.68) / (tanV * aspect);
    this.fitDist = Math.max(hFit, wFit, 22);
  }

  private resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    if (w > 900) this.camera.setViewOffset(w, h, -w * 0.06, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.updateFit();
  }

  /* ---------------------------------------------------------------- input */
  private onDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  private onMove = (e: PointerEvent) => {
    this.leanTX = (e.clientX / window.innerWidth - 0.5) * 2;
    this.leanTY = (e.clientY / window.innerHeight - 0.5) * 2;
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    if (this.pointers.size === 1) {
      this.yawT -= (e.clientX - p.x) * 0.007;
      this.pitchT = Math.max(0.02, Math.min(0.8, this.pitchT + (e.clientY - p.y) * 0.004));
      p.x = e.clientX;
      p.y = e.clientY;
    } else if (this.pointers.size === 2) {
      p.x = e.clientX;
      p.y = e.clientY;
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinch > 0) this.zoomT = Math.max(0.5, Math.min(2, this.zoomT * (d / this.pinch)));
      this.pinch = d;
    }
  };
  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
  };
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoomT = Math.max(0.5, Math.min(2, this.zoomT * Math.exp(-e.deltaY * 0.0012)));
  };

  /* --------------------------------------------------------------- update */
  private stageOf(p: number) {
    let s = 0;
    for (const a of STAGE_AT) if (p >= a) s++;
    return s;
  }

  private emit(force = false) {
    const pct = Math.round(this.p * 1000);
    const st = this.stageOf(this.p);
    const key = `${pct}|${st}|${this.playing ? 1 : 0}|${this.p >= 1 ? 1 : 0}`;
    if (!force && key === this.lastEmit) return;
    this.lastEmit = key;
    this.onState({ p: this.p, stage: st, playing: this.playing && this.p < 1, done: this.p >= 1 });
  }

  private applyProgress() {
    const tw = this.tower;
    if (!tw) return;
    const p = this.p;
    const e = 0.55 * p + 0.45 * (p * p * (3 - 2 * p));
    const cut = p >= 1 ? 5000 : -0.06 + e * (tw.height + 0.7);
    this.cut.constant = cut;
    this.scaffPlane.constant = -cut;
    this.cap.position.y = cut;
    const building = p < 1 && p > 0;
    this.cap.visible = building;
    for (const m of tw.stencil) m.visible = building;
    if (tw.scaffold) tw.scaffold.visible = p < 1;
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number) {
    // progress
    if (this.playing && this.p < 1) {
      this.p = Math.min(1, this.p + dt / DURATION);
    }
    this.applyProgress();
    this.emit();

    // environment smoothing
    lerpEnv(this.cur, this.tgt, 1 - Math.exp(-dt * 2.4));
    const wt = WEATHER[this.weatherIndex];
    const kw = 1 - Math.exp(-dt * 1.3);
    this.wRain += (wt.rain - this.wRain) * kw;
    this.wStorm += (wt.storm - this.wStorm) * kw;
    this.wSnow += (wt.snow - this.wSnow) * kw;
    if (this.wSnow > 0.4) this.snowCover = Math.min(1, this.snowCover + dt * 0.035);
    else this.snowCover = Math.max(0, this.snowCover - dt * (0.03 + this.wRain * 0.06));
    this.wet += ((this.wRain > 0.3 ? 1 : 0) - this.wet) * (1 - Math.exp(-dt * 0.4));

    // lightning
    if (this.wStorm > 0.6) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.nextBolt = 3 + Math.random() * 6;
        this.flashQueue.push(0, 0.13 + Math.random() * 0.1);
        if (Math.random() < 0.5) this.flashQueue.push(0.4 + Math.random() * 0.2);
      }
    }
    this.flashQueue = this.flashQueue
      .map((q) => q - dt)
      .filter((q) => {
        if (q <= 0) {
          this.flash = Math.max(this.flash, 0.6 + Math.random() * 0.4);
          return false;
        }
        return true;
      });
    this.flash *= Math.exp(-dt * 9);
    if (this.flash < 0.01) this.flash = 0;

    // effective environment
    const E = this.eff;
    copyEnv(E, this.cur);
    const rain = this.wRain;
    const storm = this.wStorm;
    const snow = this.wSnow;
    const wAmt = Math.max(rain * 0.5, storm * 0.78, snow * 0.55);
    const grey = new THREE.Color();
    for (const k of ['top', 'mid', 'hor', 'fog'] as CK[]) {
      const c = E[k];
      const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      grey.setRGB(lum, lum, lum * 1.03);
      c.lerp(grey, wAmt);
      c.multiplyScalar(1 - storm * 0.5 - rain * 0.12 + snow * 0.12);
    }
    E.sunI *= Math.max(0.06, 1 - rain * 0.5 - storm * 0.42 - snow * 0.4);
    E.hemiI = E.hemiI * (1 - storm * 0.12) + snow * 0.25 * (1 - E.glow) + this.flash * 3.2;
    E.stars = Math.max(0, E.stars * (1 - wAmt * 1.3));
    E.glow = Math.min(1, E.glow + storm * 0.4 + rain * 0.15);
    E.skyGlow *= 1 - wAmt * 0.8;
    const sunVis = Math.max(0, 1 - storm * 1.2 - rain * 0.7 - snow * 0.7);

    // sky / lights
    const az = THREE.MathUtils.degToRad(E.az);
    const el = THREE.MathUtils.degToRad(E.el);
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    const su = this.skyMat.uniforms;
    (su.uTop.value as THREE.Color).copy(E.top);
    (su.uMid.value as THREE.Color).copy(E.mid);
    (su.uHor.value as THREE.Color).copy(E.hor);
    (su.uSun.value as THREE.Color).copy(E.sun);
    (su.uSunDir.value as THREE.Vector3).copy(dir);
    su.uGlow.value = E.skyGlow * (0.4 + 0.6 * sunVis);
    su.uFlash.value = this.flash * 0.6;
    this.starMat.uniforms.uAlpha.value = E.stars;
    this.starMat.uniforms.uTime.value = this.time;

    this.sun.color.copy(E.sun);
    this.sun.intensity = E.sunI;
    this.sun.position.set(0, this.targetY, 0).addScaledVector(dir, 120);
    this.sun.target.position.set(0, this.targetY, 0);
    this.hemi.color.copy(E.hemiSky);
    this.hemi.groundColor.copy(E.hemiGnd);
    this.hemi.intensity = E.hemiI;
    this.renderer.toneMappingExposure = E.exp;

    this.sunSprite.position.copy(this.camera.position).addScaledVector(dir, 800);
    this.sunSprite.scale.setScalar(330 * E.sunSize);
    (this.sunSprite.material as THREE.SpriteMaterial).color.copy(E.sun);
    (this.sunSprite.material as THREE.SpriteMaterial).opacity = E.el > -2 ? 0.95 * sunVis : 0;
    this.sky.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);

    // fog
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(E.fog);
    fog.near = 34 - wAmt * 26;
    fog.far = Math.max(75, 340 - rain * 110 - storm * 90 - snow * 160);

    // ground
    const lightLevel = Math.min(1, 0.2 + E.hemiI * 0.3 + E.sunI * 0.22);
    const snowW = new THREE.Color(0xeef3fa);
    this.terrainMat.color.copy(E.ground).multiplyScalar(1 - this.wet * 0.25).lerp(snowW, this.snowCover * 0.94);
    this.padMat.color.set(0xa89c84).multiplyScalar(1 - this.wet * 0.3).lerp(snowW, this.snowCover * 0.9);
    const gu = this.grassMat.uniforms;
    gu.uTime.value = this.time;
    gu.uWind.value = 0.18 + storm * 0.9 + snow * 0.25 * (0.5 + 0.5 * Math.sin(this.time * 0.1)) + rain * 0.2;
    gu.uSnow.value = this.snowCover;
    (gu.uBase.value as THREE.Color).copy(E.gBase).multiplyScalar(1 - this.wet * 0.25);
    (gu.uTip.value as THREE.Color).copy(E.gTip).multiplyScalar(1 - this.wet * 0.2);
    (gu.uLight.value as THREE.Color)
      .copy(E.hemiSky)
      .multiplyScalar(E.hemiI * 0.28)
      .add(new THREE.Color().copy(E.sun).multiplyScalar(E.sunI * 0.2));
    (gu.uLight.value as THREE.Color).multiplyScalar(1.15).addScalar(0.05);
    (gu.uFog.value as THREE.Color).copy(E.fog);
    gu.uFogNear.value = fog.near;
    gu.uFogFar.value = fog.far;

    // particles
    const blow = 0.5 + 0.5 * Math.sin(this.time * 0.11);
    const ru = this.rainMat.uniforms;
    ru.uTime.value = this.time;
    ru.uAmount.value = Math.min(1, rain * (0.42 + 0.58 * storm)) * (snow < 0.3 ? 1 : 0);
    ru.uSpeed.value = 38 + storm * 12;
    (ru.uWind.value as THREE.Vector2).set(storm * 9, storm * 3.5);
    (ru.uColor.value as THREE.Color).copy(E.fog).lerp(new THREE.Color(1, 1, 1), 0.35).multiplyScalar(0.5 + lightLevel * 0.8);
    ru.uAlpha.value = 0.32 + storm * 0.12;
    ru.uLen.value = 1.4 + storm * 0.8;
    this.rain.visible = ru.uAmount.value > 0.002;

    const nu = this.snowMat.uniforms;
    nu.uTime.value = this.time;
    nu.uAmount.value = snow * (0.55 + 0.45 * blow);
    const ws = (0.6 + blow * 7) * snow;
    (nu.uWind.value as THREE.Vector2).set(ws, ws * 0.35);
    nu.uSpeed.value = 3 + blow * 2.5;
    (nu.uColor.value as THREE.Color).setRGB(1, 1, 1).multiplyScalar(0.3 + lightLevel * 0.7);
    this.snow.visible = nu.uAmount.value > 0.002;

    // glowing windows
    for (const m of this.glowMats) {
      m.emissiveIntensity = (m.userData.base as number) + E.glow * 1.3;
    }
    this.capMat.emissiveIntensity = 0.1 + 0.3 * (1 - E.glow) + this.flash * 0.3;
    this.capMat.color.setScalar(0.8);

    // camera
    const kc = 1 - Math.exp(-dt * 6);
    this.yaw += (this.yawT - this.yaw) * kc;
    this.pitch += (this.pitchT - this.pitch) * kc;
    this.zoom += (this.zoomT - this.zoom) * kc;
    this.leanX += (this.leanTX - this.leanX) * (1 - Math.exp(-dt * 3));
    this.leanY += (this.leanTY - this.leanY) * (1 - Math.exp(-dt * 3));
    const d = this.fitDist / this.zoom;
    const yw = this.yaw + this.leanX * 0.12;
    const pt = Math.max(0.02, this.pitch + this.leanY * 0.04);
    this.camera.position.set(
      Math.sin(yw) * Math.cos(pt) * d,
      this.targetY + Math.sin(pt) * d,
      Math.cos(yw) * Math.cos(pt) * d,
    );
    this.camera.lookAt(0, this.targetY, 0);
    // tower follows the sun flash for window/lightning fill
  }
}

function envDefOf(e: Env): EnvDef {
  const o = {} as EnvDef;
  for (const k of CKS) o[k] = e[k].getHex();
  for (const k of NKS) o[k] = e[k];
  return o;
}
