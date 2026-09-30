import type { V3 } from "./helpers";

export interface Palette {
  skyTop: number;
  skyHorizon: number;
  fog: number;
  fogDensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiI: number;
  moonCol: number;
  moonSize: number;
  moonDir: V3;
  moonLight: number;
  moonLightI: number;
  stars: number;
  ground: number;
  bloom: number;
  exposure: number;
  rain: number;
  petal: number;
  petalAmt: number;
  ember: number;
  emberAmt: number;
}

export const PALETTES: Palette[] = [
  // 0 Kyoto — rain, vermilion moon
  {
    skyTop: 0x04060c,
    skyHorizon: 0x2a1a1e,
    fog: 0x1b2130,
    fogDensity: 0.0105,
    hemiSky: 0x7d8fc0,
    hemiGround: 0x2a2218,
    hemiI: 2.8,
    moonCol: 0xff5a2e,
    moonSize: 0.072,
    moonDir: [0.16, 0.3, -0.94],
    moonLight: 0x8aa0d8,
    moonLightI: 3.6,
    stars: 0.7,
    ground: 0x16201a,
    bloom: 0.6,
    exposure: 1.15,
    rain: 1.0,
    petal: 0xff6a3a,
    petalAmt: 0.9,
    ember: 0xffa060,
    emberAmt: 0.35,
  },
  // 1 India — marigold dusk
  {
    skyTop: 0x0a0716,
    skyHorizon: 0x6a2a3a,
    fog: 0x3a2030,
    fogDensity: 0.0085,
    hemiSky: 0xb08aa8,
    hemiGround: 0x3a2414,
    hemiI: 3.0,
    moonCol: 0xffb347,
    moonSize: 0.05,
    moonDir: [-0.35, 0.3, -0.89],
    moonLight: 0xd8a0b0,
    moonLightI: 3.4,
    stars: 0.5,
    ground: 0x2b2118,
    bloom: 0.72,
    exposure: 1.15,
    rain: 0,
    petal: 0xffa21a,
    petalAmt: 0.8,
    ember: 0xffb347,
    emberAmt: 1.0,
  },
  // 2 China — jade mist
  {
    skyTop: 0x050f0e,
    skyHorizon: 0x24463f,
    fog: 0x1a302e,
    fogDensity: 0.0095,
    hemiSky: 0x8fc0b4,
    hemiGround: 0x1c2420,
    hemiI: 2.8,
    moonCol: 0xf5e7b8,
    moonSize: 0.06,
    moonDir: [0.3, 0.34, -0.89],
    moonLight: 0xa8d0cc,
    moonLightI: 3.6,
    stars: 0.6,
    ground: 0x1b2520,
    bloom: 0.66,
    exposure: 1.15,
    rain: 0,
    petal: 0xffb3c6,
    petalAmt: 0.7,
    ember: 0xff8a5a,
    emberAmt: 0.4,
  },
  // 3 Tibet — thin blue air
  {
    skyTop: 0x02040c,
    skyHorizon: 0x1e3560,
    fog: 0x142444,
    fogDensity: 0.0042,
    hemiSky: 0x8fa8e0,
    hemiGround: 0x2a2426,
    hemiI: 3.0,
    moonCol: 0xe0eaff,
    moonSize: 0.045,
    moonDir: [-0.25, 0.42, -0.87],
    moonLight: 0xb4c8ff,
    moonLightI: 4.2,
    stars: 1.0,
    ground: 0x2a2a2e,
    bloom: 0.55,
    exposure: 1.2,
    rain: 0,
    petal: 0xffffff,
    petalAmt: 0.55,
    ember: 0xffc070,
    emberAmt: 0.3,
  },
  // 4 Thailand — amber haze, rising lanterns
  {
    skyTop: 0x060a12,
    skyHorizon: 0x4a2a18,
    fog: 0x2c2016,
    fogDensity: 0.0085,
    hemiSky: 0x98aabc,
    hemiGround: 0x2a2012,
    hemiI: 2.8,
    moonCol: 0xffd27a,
    moonSize: 0.05,
    moonDir: [0.4, 0.3, -0.86],
    moonLight: 0xb0c4dc,
    moonLightI: 3.4,
    stars: 0.7,
    ground: 0x1a2418,
    bloom: 0.82,
    exposure: 1.15,
    rain: 0,
    petal: 0xffe066,
    petalAmt: 0.6,
    ember: 0xffb060,
    emberAmt: 0.7,
  },
  // 5 Vatican — blue hour
  {
    skyTop: 0x040716,
    skyHorizon: 0x2c4070,
    fog: 0x1c2842,
    fogDensity: 0.0072,
    hemiSky: 0x8aa0d8,
    hemiGround: 0x2c241a,
    hemiI: 3.0,
    moonCol: 0xf4f1e8,
    moonSize: 0.05,
    moonDir: [-0.3, 0.4, -0.87],
    moonLight: 0xa8bcf0,
    moonLightI: 3.8,
    stars: 0.8,
    ground: 0x25252a,
    bloom: 0.6,
    exposure: 1.15,
    rain: 0,
    petal: 0xffffff,
    petalAmt: 0.22,
    ember: 0xffc880,
    emberAmt: 0.3,
  },
  // 6 Mecca — black sky, white light
  {
    skyTop: 0x010103,
    skyHorizon: 0x141826,
    fog: 0x121722,
    fogDensity: 0.0062,
    hemiSky: 0x98a4c0,
    hemiGround: 0x2a2a28,
    hemiI: 2.8,
    moonCol: 0xfff2d0,
    moonSize: 0.04,
    moonDir: [0.25, 0.42, -0.87],
    moonLight: 0xb8c0d8,
    moonLightI: 3.0,
    stars: 1.0,
    ground: 0x2a2826,
    bloom: 0.95,
    exposure: 1.15,
    rain: 0,
    petal: 0xffffff,
    petalAmt: 0.0,
    ember: 0xffe0a0,
    emberAmt: 0.6,
  },
];
