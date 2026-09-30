import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Temple, Shot, V3, uTime, clamp, lerp, smooth } from "./helpers";
import { PALETTES, Palette } from "./palettes";
import { buildKyoto } from "./temples/kyoto";
import { buildIndia } from "./temples/india";
import { buildChina } from "./temples/china";
import { buildTibet } from "./temples/tibet";
import { buildThailand } from "./temples/thailand";
import { buildVatican } from "./temples/vatican";
import { buildMecca } from "./temples/mecca";

const SPACING = 340;
const BUILDERS: { name: string; fn: () => Temple }[] = [
  { name: "Kyoto", fn: buildKyoto },
  { name: "Madurai", fn: buildIndia },
  { name: "Beijing", fn: buildChina },
  { name: "Lhasa", fn: buildTibet },
  { name: "Bangkok", fn: buildThailand },
  { name: "Vatican City", fn: buildVatican },
  { name: "Mecca", fn: buildMecca },
];

export interface Engine {
  render(dt: number, S: number, px: number, py: number): void;
  resize(): void;
  dispose(): void;
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = position;
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;
}`;
const SKY_FRAG = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uFog;
uniform vec3 uMoonCol; uniform vec3 uMoonDir; uniform float uMoonSize;
uniform float uStars; uniform float uTime;
varying vec3 vDir;
float h13(vec3 p){ p = fract(p*.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.-2.*f);
  float a = h13(i), b = h13(i+vec3(1,0,0)), c = h13(i+vec3(0,1,0)), d = h13(i+vec3(1,1,0));
  float e = h13(i+vec3(0,0,1)), g = h13(i+vec3(1,0,1)), h = h13(i+vec3(0,1,1)), k = h13(i+vec3(1,1,1));
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h,k,f.x),f.y), f.z);
}
void main(){
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 col = mix(uHor, uTop, pow(clamp(y,0.,1.), .5));
  col = mix(uFog, col, smoothstep(-0.02, 0.22, y));
  // stars
  vec3 sp = d*230.; vec3 id = floor(sp); vec3 fp = fract(sp)-.5;
  float r = h13(id);
  vec3 off = vec3(h13(id+7.1), h13(id+13.7), h13(id+3.3)) - .5;
  float st = step(.9968, r) * smoothstep(.2, .0, length(fp - off*.6));
  st *= .55 + .45*sin(uTime*1.6 + r*90.);
  col += vec3(.85,.9,1.) * st * uStars * smoothstep(.04,.4,y) * 1.6;
  // moon
  vec3 md = normalize(uMoonDir);
  float ang = acos(clamp(dot(d, md), -1., 1.));
  float disc = smoothstep(uMoonSize, uMoonSize*.965, ang);
  float n = vnoise(d*85.) * .6 + vnoise(d*190.) * .4;
  float limb = 1. - .28*pow(clamp(ang/uMoonSize,0.,1.), 3.);
  vec3 surf = uMoonCol * (.72 + .5*n) * limb * 1.5;
  float halo = exp(-pow(ang/(uMoonSize*3.2), 2.)) * .42 + exp(-ang*7.) * .10;
  col += uMoonCol * halo * smoothstep(-.05,.1,y);
  col = mix(col, surf, disc);
  gl_FragColor = vec4(col, 1.);
}`;

const FILM_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uGrain: { value: 0.03 },
    uVig: { value: 0.55 },
    uDip: { value: 0 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; uniform float uVig; uniform float uDip;
varying vec2 vUv;
void main(){
  vec4 c = texture2D(tDiffuse, vUv);
  float vig = smoothstep(.98, .28, length((vUv-.5)*vec2(1.15,1.0)));
  c.rgb *= mix(1.0 - uVig, 1.0, vig);
  c.rgb *= 1.0 - uDip;
  float g = fract(sin(dot(vUv*vec2(1234.,873.) + fract(uTime)*37., vec2(12.9898,78.233)))*43758.5453);
  c.rgb += (g-.5) * uGrain;
  gl_FragColor = vec4(c.rgb, 1.0);
}`,
};

const PARTICLE_VERT = /* glsl */ `
uniform float uTime; uniform vec3 uCam; uniform float uSize; uniform float uAmt; uniform float uRes; uniform float uDir; uniform vec3 uWind;
varying float vA; varying float vRot;
void main(){
  vec3 s = position;
  vec3 box = vec3(130., 60., 130.);
  vec3 p = s*box;
  float sp = (1.0 + s.x*1.6)*uDir;
  p.y -= uTime*sp;
  p.x += sin(uTime*(.4+s.y)+s.z*30.)*2.5 + uTime*uWind.x;
  p.z += cos(uTime*(.35+s.x)+s.y*30.)*2.5 + uTime*uWind.z;
  p = mod(p - uCam + box*.5, box) - box*.5 + uCam;
  vec4 mv = viewMatrix*vec4(p,1.);
  float dist = -mv.z;
  gl_Position = projectionMatrix*mv;
  float show = step(fract(s.x*17.31+s.z*9.17), uAmt);
  gl_PointSize = uSize*(0.6+s.y*0.8) * projectionMatrix[1][1]*uRes*0.5/max(dist,0.1);
  vA = show*smoothstep(150.,30.,dist)*smoothstep(1.5,5.,dist);
  vRot = s.z*6.283 + uTime*(.5+s.x);
}`;
const PARTICLE_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uMode; varying float vA; varying float vRot;
void main(){
  vec2 c = gl_PointCoord-.5;
  float a;
  if(uMode<.5){ float cs=cos(vRot), sn=sin(vRot); c = mat2(cs,-sn,sn,cs)*c; c.x *= 2.2; float d=length(c); a = smoothstep(.5,.25,d); }
  else { float d=length(c); a = pow(smoothstep(.5,.0,d),2.); }
  if(a*vA<.01) discard;
  gl_FragColor = vec4(uColor*(uMode<.5?0.85:2.2), a*vA*(uMode<.5?.85:.9));
}`;

const RAIN_VERT = /* glsl */ `
attribute float aEnd; uniform float uTime; uniform vec3 uCam; uniform float uInt; varying float vA;
void main(){
  vec3 box = vec3(100., 50., 100.);
  vec3 s = position;
  vec3 p = s*box;
  p.y -= uTime*(40. + s.x*12.);
  p.x += uTime*4.;
  p = mod(p - uCam + box*.5, box) - box*.5 + uCam;
  p += vec3(0.28, 1.0, 0.0)*aEnd*2.0;
  vec4 mv = viewMatrix*vec4(p,1.);
  gl_Position = projectionMatrix*mv;
  float dist = -mv.z;
  vA = (1.0 - aEnd*.75) * step(fract(s.z*91.3+s.x*17.7), uInt) * smoothstep(110.,20.,dist);
}`;
const RAIN_FRAG = /* glsl */ `varying float vA; void main(){ gl_FragColor = vec4(.72,.82,1.0, vA*.32); }`;

function makePoints(count: number, mode: number, size: number, uRes: { value: number }, additive: boolean) {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < arr.length; i++) arr[i] = Math.random();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uTime: uTime,
      uCam: { value: new THREE.Vector3() },
      uSize: { value: size },
      uAmt: { value: 1 },
      uRes: uRes,
      uDir: { value: mode === 0 ? 1 : -0.35 },
      uWind: { value: new THREE.Vector3(mode === 0 ? 1.8 : 0.3, 0, mode === 0 ? 0.6 : 0.1) },
      uColor: { value: new THREE.Color(0xffffff) },
      uMode: { value: mode },
    },
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  return pts;
}

type PalC = {
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  fog: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  moonCol: THREE.Color;
  moonLight: THREE.Color;
  ground: THREE.Color;
  petal: THREE.Color;
  ember: THREE.Color;
};
const colorKeys: (keyof PalC)[] = ["skyTop", "skyHorizon", "fog", "hemiSky", "hemiGround", "moonCol", "moonLight", "ground", "petal", "ember"];
const numKeys: (keyof Palette)[] = ["fogDensity", "hemiI", "moonSize", "moonLightI", "stars", "bloom", "exposure", "rain", "petalAmt", "emberAmt"];

export async function createEngine(
  canvas: HTMLCanvasElement,
  onProgress: (label: string, frac: number) => void,
  opts: { reduced: boolean; isCancelled: () => boolean }
): Promise<Engine> {
  const mobile = window.matchMedia("(max-width: 820px)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  const pr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x101420, 0.01);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.8, 2600);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  (scene as unknown as { environmentIntensity: number }).environmentIntensity = 0.22;

  // ---- sky
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color() },
      uHor: { value: new THREE.Color() },
      uFog: { value: new THREE.Color() },
      uMoonCol: { value: new THREE.Color() },
      uMoonDir: { value: new THREE.Vector3(0, 0.3, -1) },
      uMoonSize: { value: 0.06 },
      uStars: { value: 1 },
      uTime: uTime,
    },
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  // ---- ground
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x16201a, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(7000, 4000), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(SPACING * 3, -0.06, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 2.5);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xffffff, 3);
  moon.castShadow = true;
  const sm = mobile ? 2048 : 4096;
  moon.shadow.mapSize.set(sm, sm);
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.4;
  moon.shadow.camera.near = 20;
  moon.shadow.camera.far = 900;
  scene.add(moon, moon.target);
  const pool = Array.from({ length: 4 }, () => {
    const l = new THREE.PointLight(0xffffff, 0, 100, 1.6);
    scene.add(l);
    return l;
  });

  // ---- particles & rain
  const uRes = { value: 800 };
  const petals = makePoints(mobile ? 700 : 1300, 0, 0.3, uRes, false);
  const embers = makePoints(mobile ? 350 : 700, 1, 0.22, uRes, true);
  scene.add(petals, embers);
  const rainN = mobile ? 1800 : 3600;
  const rp = new Float32Array(rainN * 2 * 3),
    re = new Float32Array(rainN * 2);
  for (let i = 0; i < rainN; i++) {
    const x = Math.random(),
      y = Math.random(),
      z = Math.random();
    for (let k = 0; k < 2; k++) {
      rp.set([x, y, z], (i * 2 + k) * 3);
      re[i * 2 + k] = k;
    }
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  rg.setAttribute("aEnd", new THREE.BufferAttribute(re, 1));
  const rainMat = new THREE.ShaderMaterial({
    vertexShader: RAIN_VERT,
    fragmentShader: RAIN_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: uTime, uCam: { value: new THREE.Vector3() }, uInt: { value: 1 } },
  });
  const rain = new THREE.LineSegments(rg, rainMat);
  rain.frustumCulled = false;
  rain.renderOrder = 6;
  scene.add(rain);

  // ---- post
  const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
  const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(size.clone(), 0.6, 0.7, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FILM_SHADER);
  composer.addPass(film);

  const resize = () => {
    const w = window.innerWidth,
      h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.9 ? 66 : camera.aspect < 1.3 ? 56 : 48;
    camera.updateProjectionMatrix();
    uRes.value = h * pr;
  };
  resize();

  // ---- build temples progressively
  const offsets = BUILDERS.map((_, i) => new THREE.Vector3(i * SPACING, 0, 0));
  const temples: (Temple | null)[] = [];
  const nextFrame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
  for (let i = 0; i < BUILDERS.length; i++) {
    if (opts.isCancelled()) break;
    onProgress(BUILDERS[i].name, i / BUILDERS.length);
    await nextFrame();
    try {
      const t = BUILDERS[i].fn();
      t.group.position.copy(offsets[i]);
      scene.add(t.group);
      temples.push(t);
    } catch (e) {
      console.error("Failed to build", BUILDERS[i].name, e);
      temples.push(null);
    }
  }
  if (opts.isCancelled()) {
    renderer.dispose();
    throw new Error("cancelled");
  }
  onProgress("the lamps", 0.96);
  await nextFrame();

  // ---- camera path
  const fallback: Shot[] = [
    { pos: [0, 24, 140], look: [0, 18, 0] },
    { pos: [0, 26, 90], look: [0, 20, 0] },
  ];
  const pp: THREE.Vector3[] = [],
    ll: THREE.Vector3[] = [];
  const pushShot = (i: number, s: Shot) => {
    pp.push(new THREE.Vector3(...s.pos).add(offsets[i]));
    ll.push(new THREE.Vector3(...s.look).add(offsets[i]));
  };
  pushShot(0, temples[0]?.hero?.[0] ?? fallback[0]);
  pushShot(0, temples[0]?.hero?.[1] ?? fallback[1]);
  for (let i = 0; i < 7; i++) {
    pushShot(i, temples[i]?.a ?? fallback[0]);
    pushShot(i, temples[i]?.b ?? fallback[1]);
  }
  pushShot(6, temples[6]?.outro?.[0] ?? fallback[0]);
  pushShot(6, temples[6]?.outro?.[1] ?? fallback[1]);
  const curveP = new THREE.CatmullRomCurve3(pp, false, "centripetal");
  const curveL = new THREE.CatmullRomCurve3(ll, false, "centripetal");
  const NP = pp.length - 1;

  const uOf = (S: number) => {
    const k = Math.min(8, Math.max(0, Math.floor(S)));
    const f = clamp(S - k, 0, 1);
    if (k === 8) return 16 + f * f * (3 - 2 * f) * 0.6 + f * 0.4;
    if (f < 0.72) {
      const x = f / 0.72;
      return 2 * k + lerp(x, x * x * (3 - 2 * x), 0.45);
    }
    const x = (f - 0.72) / 0.28;
    return 2 * k + 1 + x * x * (3 - 2 * x);
  };

  // ---- palette state
  const PC = PALETTES.map((p) => {
    const o = {} as PalC;
    colorKeys.forEach((k) => {
      o[k] = new THREE.Color((p as unknown as Record<string, number>)[k]);
    });
    return o;
  });
  const cur: PalC = {} as PalC;
  colorKeys.forEach((k) => (cur[k] = new THREE.Color()));
  const curN: Record<string, number> = {};
  const curMoonDir = new THREE.Vector3();
  const mdA = new THREE.Vector3(),
    mdB = new THREE.Vector3();
  const paletteAt = (S: number): [number, number, number] => {
    const k = Math.min(8, Math.max(0, Math.floor(S)));
    const f = clamp(S - k, 0, 1);
    if (k === 0) return [0, 0, 0];
    if (k >= 8) return [6, 6, 0];
    const ti = k - 1;
    const t = f > 0.72 ? smooth(0.72, 1, f) : 0;
    return [ti, Math.min(6, ti + 1), t];
  };

  // ---- compile once to avoid hitches
  temples.forEach((t) => t && (t.group.visible = true));
  try {
    camera.position.set(0, 30, 120);
    camera.lookAt(0, 20, 0);
    await renderer.compileAsync(scene, camera);
  } catch {
    /* ignore */
  }

  const centers = offsets.map((o) => o.clone().add(new THREE.Vector3(0, 25, 0)));
  let active = 0;
  let time = 0;
  let spx = 0,
    spy = 0;
  const tmpV = new THREE.Vector3(),
    tmpR = new THREE.Vector3(),
    tmpU = new THREE.Vector3(),
    camPos = new THREE.Vector3(),
    camLook = new THREE.Vector3();
  const lightTarget = pool.map(() => ({ intensity: 0 }));
  let firstFrame = true;

  const applyActive = (i: number) => {
    active = i;
    const t = temples[i];
    const R = t?.shadowR ?? 120;
    const c = moon.shadow.camera;
    c.left = -R;
    c.right = R;
    c.top = R;
    c.bottom = -R;
    c.updateProjectionMatrix();
    pool.forEach((l, k) => {
      const a = t?.anchors[k];
      if (a) {
        l.position.set(a.pos[0], a.pos[1], a.pos[2]).add(offsets[i]);
        l.color.setHex(a.color);
        l.distance = a.distance;
        lightTarget[k].intensity = a.intensity;
      } else lightTarget[k].intensity = 0;
    });
  };
  applyActive(0);

  const render = (dt: number, S: number, px: number, py: number) => {
    dt = Math.min(dt, 0.1);
    time += dt;
    uTime.value = time;
    S = clamp(S, 0, 9);

    // palette
    const [ia, ib, pt] = paletteAt(S);
    colorKeys.forEach((k) => cur[k].copy(PC[ia][k]).lerp(PC[ib][k], pt));
    numKeys.forEach((k) => {
      curN[k] = lerp(PALETTES[ia][k] as number, PALETTES[ib][k] as number, pt);
    });
    mdA.set(...PALETTES[ia].moonDir).normalize();
    mdB.set(...PALETTES[ib].moonDir).normalize();
    curMoonDir.copy(mdA).lerp(mdB, pt).normalize();

    // camera
    const u = uOf(S);
    const tt = clamp(u / NP, 0, 1);
    curveP.getPoint(tt, camPos);
    curveL.getPoint(tt, camLook);
    spx += (px - spx) * (1 - Math.exp(-dt * 3));
    spy += (py - spy) * (1 - Math.exp(-dt * 3));
    const sway = opts.reduced ? 0 : 1;
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    tmpR.set(1, 0, 0).applyQuaternion(camera.quaternion);
    tmpU.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const swx = Math.sin(time * 0.31) * 0.35 * sway,
      swy = Math.cos(time * 0.42) * 0.22 * sway;
    camera.position.addScaledVector(tmpR, spx * 1.6 * sway + swx).addScaledVector(tmpU, -spy * 0.9 * sway + swy);
    camLook.addScaledVector(tmpR, spx * 1.2 * sway).addScaledVector(tmpU, -spy * 0.7 * sway);
    camera.lookAt(camLook);

    // nearest temple
    let near = 0,
      nd = 1e9;
    const dists = centers.map((c, i) => {
      const d = camera.position.distanceTo(c);
      if (d < nd) {
        nd = d;
        near = i;
      }
      return d;
    });
    const thr = clamp(2.6 / curN.fogDensity, 260, 620);
    temples.forEach((t, i) => {
      if (!t) return;
      const vis = dists[i] < thr;
      t.group.visible = vis;
      if (vis && t.update) t.update(time, dt);
    });

    // light pool
    const aFade = 1 - smooth(70, 200, dists[active]);
    if (near !== active && aFade < 0.03) applyActive(near);
    const fade = 1 - smooth(70, 200, dists[active]);
    pool.forEach((l, k) => {
      const flick = 0.96 + 0.04 * Math.sin(time * (5 + k * 1.7) + k);
      l.intensity = lightTarget[k].intensity * fade * flick;
    });
    moon.target.position.copy(centers[active]);
    moon.position.copy(centers[active]).addScaledVector(curMoonDir, 320);
    moon.color.copy(cur.moonLight);
    moon.intensity = curN.moonLightI;
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGround);
    hemi.intensity = curN.hemiI;
    groundMat.color.copy(cur.ground);

    // fog / sky
    const fog = scene.fog as THREE.FogExp2;
    fog.color.copy(cur.fog);
    fog.density = curN.fogDensity;
    sky.position.copy(camera.position);
    const su = skyMat.uniforms;
    su.uTop.value.copy(cur.skyTop);
    su.uHor.value.copy(cur.skyHorizon);
    su.uFog.value.copy(cur.fog);
    su.uMoonCol.value.copy(cur.moonCol);
    su.uMoonDir.value.copy(curMoonDir);
    su.uMoonSize.value = curN.moonSize;
    su.uStars.value = curN.stars;

    // particles
    tmpV.copy(camera.position);
    (petals.material as THREE.ShaderMaterial).uniforms.uCam.value.copy(tmpV);
    (petals.material as THREE.ShaderMaterial).uniforms.uAmt.value = curN.petalAmt;
    (petals.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(cur.petal);
    (embers.material as THREE.ShaderMaterial).uniforms.uCam.value.copy(tmpV);
    (embers.material as THREE.ShaderMaterial).uniforms.uAmt.value = curN.emberAmt;
    (embers.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(cur.ember);
    rainMat.uniforms.uCam.value.copy(tmpV);
    rainMat.uniforms.uInt.value = curN.rain;
    rain.visible = curN.rain > 0.02;

    // post
    bloom.strength = curN.bloom;
    renderer.toneMappingExposure = curN.exposure;
    const k = Math.floor(S);
    const f = S - k;
    const dip = k < 8 && f > 0.72 ? Math.sin(((f - 0.72) / 0.28) * Math.PI) * 0.32 : 0;
    film.uniforms.uDip.value = dip;
    film.uniforms.uTime.value = time;

    composer.render(dt);
    if (firstFrame) {
      firstFrame = false;
    }
  };

  onProgress("the night", 1);

  return {
    render,
    resize,
    dispose() {
      composer.dispose();
      renderer.dispose();
      envTex.dispose();
      pmrem.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
    },
  };
}

export type { V3 };
