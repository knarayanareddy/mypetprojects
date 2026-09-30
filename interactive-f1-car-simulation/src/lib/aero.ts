export type VizMode = "smoke" | "velocity" | "pressure" | "turbulence";
export type SourceMode = "volume" | "side" | "plan" | "wheels" | "floor" | "wings" | "intakes";
export type ViewName = "iso" | "side" | "top" | "front" | "rear" | "low";

export interface Params {
  // conditions
  speed: number; // km/h ground speed
  headwind: number; // km/h (+ head, - tail)
  yaw: number; // deg
  temp: number; // C
  altitude: number; // m
  humidity: number; // %
  rain: boolean;
  // setup
  fwAngle: number; // deg flap
  rwAngle: number; // deg flap
  drs: boolean;
  rideF: number; // mm
  rideR: number; // mm
  cooling: number; // 0..100
  // traffic
  dirty: boolean;
  gap: number; // m
  // visualisation
  mode: VizMode;
  source: SourceMode;
  slice: number; // 0..1
  density: number; // 0.15..1
  slowmo: number; // 0.1..1.6
  trail: number; // 0.2..1
  vortices: boolean;
  surface: boolean;
  labels: boolean;
}

export const DEFAULTS: Params = {
  speed: 250,
  headwind: 0,
  yaw: 0,
  temp: 25,
  altitude: 0,
  humidity: 40,
  rain: false,
  fwAngle: 15,
  rwAngle: 24,
  drs: false,
  rideF: 38,
  rideR: 52,
  cooling: 50,
  dirty: false,
  gap: 15,
  mode: "velocity",
  source: "volume",
  slice: 0.5,
  density: 0.55,
  slowmo: 0.6,
  trail: 0.7,
  vortices: true,
  surface: false,
  labels: true,
};

export interface Preset {
  id: string;
  name: string;
  tag: string;
  p: Partial<Params>;
}

export const PRESETS: Preset[] = [
  {
    id: "base",
    name: "Baseline",
    tag: "Balanced race trim",
    p: {
      speed: 250,
      headwind: 0,
      yaw: 0,
      temp: 25,
      altitude: 0,
      humidity: 40,
      rain: false,
      fwAngle: 15,
      rwAngle: 24,
      drs: false,
      rideF: 38,
      rideR: 52,
      cooling: 50,
      dirty: false,
      gap: 15,
    },
  },
  {
    id: "monza",
    name: "Monza · Low drag",
    tag: "Skinny wings, DRS open",
    p: { speed: 340, fwAngle: 6, rwAngle: 9, drs: true, rideF: 34, rideR: 44, cooling: 25, yaw: 0, rain: false, dirty: false, altitude: 160, temp: 28, headwind: 0 },
  },
  {
    id: "monaco",
    name: "Monaco · Max downforce",
    tag: "Big wings, low speed",
    p: { speed: 140, fwAngle: 26, rwAngle: 32, drs: false, rideF: 36, rideR: 54, cooling: 70, yaw: 0, rain: false, dirty: false, altitude: 10, temp: 22, headwind: 0 },
  },
  {
    id: "spa",
    name: "Spa · Wet",
    tag: "Rain, crosswind, medium wings",
    p: { speed: 230, fwAngle: 20, rwAngle: 28, drs: false, rideF: 44, rideR: 60, cooling: 40, yaw: 6, rain: true, dirty: false, altitude: 400, temp: 12, humidity: 90, headwind: 10 },
  },
  {
    id: "mexico",
    name: "Mexico City · Thin air",
    tag: "2,240 m altitude",
    p: { speed: 250, fwAngle: 28, rwAngle: 34, drs: false, rideF: 36, rideR: 52, cooling: 90, yaw: 0, rain: false, dirty: false, altitude: 2240, temp: 22, humidity: 35, headwind: 0 },
  },
  {
    id: "dirty",
    name: "Following closely",
    tag: "8 m behind the leader",
    p: { speed: 250, dirty: true, gap: 8, fwAngle: 15, rwAngle: 24, drs: false, yaw: 0, rain: false },
  },
  {
    id: "porpoise",
    name: "Porpoising",
    tag: "Floor stalls too low, too fast",
    p: { speed: 320, rideF: 12, rideR: 18, fwAngle: 15, rwAngle: 24, drs: false, cooling: 50 },
  },
];

export interface AeroResult {
  rho: number;
  pressure: number; // Pa
  tempK: number;
  vAir: number; // m/s
  q: number; // Pa
  re: number;
  mach: number;
  cla: number;
  cda: number;
  clTotal: number;
  cdTotal: number;
  downforce: number; // N
  drag: number; // N
  side: number; // N
  ld: number;
  balanceFront: number; // %
  topSpeed: number; // km/h
  dragPower: number; // kW
  downforceKg: number;
  cornerSpeed: number; // km/h (120 m radius)
  latG: number;
  mu: number;
  brakeG: number;
  puTemp: number;
  coolMargin: number;
  porpoise: number; // 0..1
  stalled: boolean;
  floorFactor: number;
  rake: number;
  comps: { name: string; cl: number; cd: number; color: string }[];
  curve: { v: number; df: number; dr: number }[];
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function atmosphere(temp: number, alt: number, hum: number) {
  const T = temp + 273.15;
  const p = 101325 * Math.pow(Math.max(0.2, 1 - 2.25577e-5 * alt), 5.25588);
  const es = 610.78 * Math.exp((17.27 * temp) / (temp + 237.3));
  const pv = (hum / 100) * es;
  const pd = Math.max(0, p - pv);
  const rho = pd / (287.058 * T) + pv / (461.495 * T);
  return { rho, p, T };
}

export function floorFactor(h: number) {
  if (h >= 30) return Math.max(0.35, 1 - 0.0115 * (h - 30));
  if (h >= 18) return 1 + 0.012 * (30 - h);
  return Math.max(0.5, 1.144 - 0.032 * (18 - h));
}

/** cla/cda as function of params (not of speed) */
function coefficients(p: Params, e: number) {
  const hMean = (p.rideF + p.rideR) / 2;
  const rake = p.rideR - p.rideF;
  const ff = floorFactor(hMean);
  const rk = 1 + 0.0035 * clamp(rake, -15, 40) - (rake > 40 ? 0.012 * (rake - 40) : 0);
  let floorCL = 1.95 * ff * rk;
  const fwStall = p.fwAngle > 26 ? 0.07 * (p.fwAngle - 26) : 0;
  const gef = clamp(1 + 0.012 * (35 - p.rideF), 0.85, 1.15);
  let fwCL = 0.78 * (1 + 0.04 * (p.fwAngle - 15) - fwStall) * gef;
  const rwStall = p.rwAngle > 32 ? 0.08 * (p.rwAngle - 32) : 0;
  let rwCL = 0.92 * (1 + 0.045 * (p.rwAngle - 24) - rwStall);
  if (p.drs) rwCL *= 0.45;
  let bodyCL = 0.4;
  // dirty air
  fwCL *= 1 - 0.5 * e;
  floorCL *= 1 - 0.26 * e;
  rwCL *= 1 - 0.15 * e;
  bodyCL *= 1 - 0.2 * e;

  const fwCD = 0.04 + 0.00042 * p.fwAngle ** 2;
  const rwCD = (0.05 + 0.00035 * p.rwAngle ** 2) * (p.drs ? 0.3 : 1);
  const wheelCD = 0.42;
  const coolCD = 0.02 + 0.0012 * p.cooling;
  const bodyCD = 0.22 + coolCD;
  const floorCD = 0.06 + 0.05 * (floorCL / 1.95);

  const yawRad = (p.yaw * Math.PI) / 180;
  const yawL = 1 - 0.0011 * p.yaw ** 2;
  const yawD = 1 + 0.0015 * p.yaw ** 2;
  const dragRed = 1 - 0.14 * e;
  return {
    hMean,
    rake,
    ff,
    yawRad,
    comps: [
      { name: "Front wing", cl: fwCL * yawL, cd: fwCD * yawD * dragRed, color: "#ff5a4a" },
      { name: "Floor & diffuser", cl: floorCL * yawL, cd: floorCD * yawD * dragRed, color: "#36d6ff" },
      { name: "Rear wing", cl: rwCL * yawL, cd: rwCD * yawD * dragRed, color: "#ffd21f" },
      { name: "Bodywork & cooling", cl: bodyCL * yawL, cd: bodyCD * yawD * dragRed, color: "#a78bfa" },
      { name: "Wheels & tyres", cl: 0, cd: wheelCD * yawD * dragRed, color: "#8b93a1" },
    ],
    fwCL,
    floorCL,
    rwCL,
    bodyCL,
  };
}

export function computeAero(p: Params): AeroResult {
  const { rho, p: pressure, T } = atmosphere(p.temp, p.altitude, p.humidity);
  const vAir = Math.max(1, (p.speed + p.headwind) / 3.6);
  const q = 0.5 * rho * vAir * vAir;
  const e = p.dirty ? Math.exp(-p.gap / 14) : 0;
  const k = coefficients(p, e);
  const cla = k.comps.reduce((a, c) => a + c.cl, 0);
  const cda = k.comps.reduce((a, c) => a + c.cd, 0);

  const mass = 798;
  const mu = p.rain ? 1.05 : 1.75;

  // porpoising
  const hMean = k.hMean;
  const porpoise = clamp(((24 - hMean) / 14) * clamp((vAir * 3.6 - 200) / 120, 0, 1.2), 0, 1);
  const stalled = hMean < 18;

  const downforce = q * cla;
  const drag = q * cda;
  const side = q * 0.055 * p.yaw;

  // balance
  const floorFront = clamp(0.4 - 0.004 * (k.rake - 20), 0.3, 0.5);
  const front = k.comps[0].cl + k.comps[1].cl * floorFront + k.comps[3].cl * 0.4;
  const balanceFront = (front / Math.max(0.001, cla)) * 100;

  // top speed (no wind, current aero setup)
  const P = 740e3 * Math.pow(rho / 1.225, 0.35);
  let lo = 10;
  let hi = 130;
  const crr = 0.013;
  for (let i = 0; i < 40; i++) {
    const v = (lo + hi) / 2;
    const qv = 0.5 * rho * v * v;
    const f = qv * cda + crr * (mass * 9.81 + qv * cla);
    if (f * v > P) hi = v;
    else lo = v;
  }
  const topSpeed = Math.min(385, ((lo + hi) / 2) * 3.6);

  // cornering 120 m radius
  const R = 120;
  let vc = 50;
  for (let i = 0; i < 40; i++) {
    vc = Math.sqrt(R * mu * (9.81 + (0.5 * rho * vc * vc * cla) / mass));
    if (vc > 120) break;
  }
  const latG = mu * (1 + downforce / (mass * 9.81));
  const brakeG = latG * 1.25;

  // cooling
  const capacity = (0.5 + 0.01 * p.cooling) * Math.sqrt(rho / 1.2) * (0.6 + 0.4 * Math.min(1, vAir / 70));
  const demand = 1 + 0.02 * (p.temp - 25);
  const coolMargin = capacity / demand;
  const puTemp = 100 + (1 - coolMargin) * 45 + (p.temp - 25) * 0.25;

  // reynolds / mach
  const mu0 = (1.716e-5 * Math.pow(T / 273.15, 1.5) * (273.15 + 110.4)) / (T + 110.4);
  const re = (rho * vAir * 5.5) / mu0;
  const mach = vAir / Math.sqrt(1.4 * 287.058 * T);

  const curve: { v: number; df: number; dr: number }[] = [];
  for (let v = 40; v <= 380; v += 20) {
    const qv = 0.5 * rho * (v / 3.6) ** 2;
    curve.push({ v, df: qv * cla, dr: qv * cda });
  }
  const comps = k.comps.map((c) => ({ ...c }));
  return {
    rho,
    pressure,
    tempK: T,
    vAir,
    q,
    re,
    mach,
    cla,
    cda,
    clTotal: cla / 1.4,
    cdTotal: cda / 1.4,
    downforce,
    drag,
    side,
    ld: cla / cda,
    balanceFront,
    topSpeed,
    dragPower: (drag * (p.speed / 3.6)) / 1000,
    downforceKg: downforce / 9.81,
    cornerSpeed: vc * 3.6,
    latG,
    mu,
    brakeG,
    puTemp,
    coolMargin,
    porpoise,
    stalled,
    floorFactor: k.ff,
    rake: k.rake,
    comps,
    curve,
  };
}

/** parameters driving the visual flow field */
export interface FlowParams {
  wakeDef: number;
  floorUp: number;
  fwV: number;
  floorV: number;
  rwV: number;
  tyreV: number;
  turbBase: number;
  turbWake: number;
  dirtyDef: number;
  dirtyAmp: number;
  yaw: number;
  yOff: number;
  vis: number; // visual m/s for freestream
  airKmh: number;
  cooling: number;
}

export function flowParams(p: Params, a: AeroResult, yOff: number): FlowParams {
  const e = p.dirty ? Math.exp(-p.gap / 16) : 0;
  const hMean = (p.rideF + p.rideR) / 2;
  const ff = floorFactor(hMean);
  return {
    wakeDef: clamp(0.38 + 0.006 * p.rwAngle + (p.drs ? -0.1 : 0) + 0.002 * p.fwAngle, 0.2, 0.8),
    floorUp: clamp(0.2 + (ff - 0.5) * 0.55, 0.05, 0.6),
    fwV: clamp(0.55 + 0.035 * (p.fwAngle - 15), 0.15, 1.3),
    floorV: clamp(ff * 0.9, 0.2, 1.1),
    rwV: p.drs ? 0.22 : clamp(0.6 + 0.035 * (p.rwAngle - 24), 0.2, 1.3),
    tyreV: 0.8 + (p.rain ? 0.2 : 0),
    turbBase: 0.03 + (p.rain ? 0.03 : 0) + a.porpoise * 0.1,
    turbWake: 0.55 + 0.01 * p.rwAngle + a.porpoise * 0.3,
    dirtyDef: 0.3 * e,
    dirtyAmp: 1.0 * e,
    yaw: (p.yaw * Math.PI) / 180,
    yOff,
    vis: 3 + 8 * clamp(a.vAir * 3.6, 0, 400) / 380,
    airKmh: a.vAir * 3.6,
    cooling: p.cooling / 100,
  };
}
