// Shared architectural layout: drives the 3D scene, the camera walk and the floor plan.

export const FLOOR_Y = 0.45;
export const CEIL_H = 2.6;
export const HX0 = -5.5;
export const HX1 = 5.5;

export const POND = { cx: 3, cz: -52, rx: 9, rz: 6 };
export const GATE = { x: -1, z: 26, w: 3.2 };
export const DOOR = { x0: -3.5, x1: 0.5 };

export type Season = "spring" | "summer" | "autumn" | "winter";
export type Hour = "dawn" | "noon" | "dusk" | "night";

export const SEASONS: { id: Season; en: string; jp: string }[] = [
  { id: "spring", en: "Spring", jp: "春" },
  { id: "summer", en: "Summer", jp: "夏" },
  { id: "autumn", en: "Autumn", jp: "秋" },
  { id: "winter", en: "Winter", jp: "冬" },
];

export const HOURS: { id: Hour; en: string }[] = [
  { id: "dawn", en: "Dawn" },
  { id: "noon", en: "Noon" },
  { id: "dusk", en: "Dusk" },
  { id: "night", en: "Night" },
];

export interface Room {
  id: string;
  name: string;
  jp: string;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  kf: number;
  size: string;
  floor: string;
  blurb: string;
}

export const ROOMS: Room[] = [
  {
    id: "genkan",
    name: "Genkan",
    jp: "玄関",
    x0: -5.5,
    x1: 5.5,
    z0: 7,
    z1: 4,
    kf: 4,
    size: "11 × 3 m",
    floor: "River stone, one step down",
    blurb: "A sunken threshold of river stone. Shoes stay here, and the house begins a step above.",
  },
  {
    id: "tea",
    name: "Tea Room",
    jp: "茶室",
    x0: -5.5,
    x1: 5.5,
    z0: 4,
    z1: -4,
    kf: 5,
    size: "11 × 8 m · 24 mats",
    floor: "Tatami, sunken hearth",
    blurb: "Paper screens soften the light. A hanging scroll, a seasonal branch and an iron kettle on the hearth.",
  },
  {
    id: "courtyard",
    name: "Courtyard",
    jp: "中庭",
    x0: -5.5,
    x1: 5.5,
    z0: -4,
    z1: -11,
    kf: 7,
    size: "4.5 × 7 m open to sky",
    floor: "Raked gravel, maple, stone basin",
    blurb: "A walled pocket of sky. One maple, raked gravel and a bamboo spout that fills a stone basin.",
  },
  {
    id: "living",
    name: "Living Room",
    jp: "居間",
    x0: -5.5,
    x1: 5.5,
    z0: -11,
    z1: -20,
    kf: 8,
    size: "11 × 9 m",
    floor: "Wide-plank cedar",
    blurb: "A low table, indigo cushions and a lattice window that frames the west garden.",
  },
  {
    id: "bedroom",
    name: "Bedroom",
    jp: "寝室",
    x0: -5.5,
    x1: 5.5,
    z0: -20,
    z1: -28,
    kf: 10,
    size: "11 × 8 m",
    floor: "Tatami, low hinoki platform",
    blurb: "A low platform dressed in indigo linen, a paper lamp, and the sound of nothing at all.",
  },
  {
    id: "bath",
    name: "Bath",
    jp: "浴室",
    x0: -5.5,
    x1: 5.5,
    z0: -28,
    z1: -34,
    kf: 11,
    size: "11 × 6 m",
    floor: "Stone, hinoki tub",
    blurb: "A deep hinoki tub beside an open window. The back garden is always within earshot.",
  },
];

export interface KF {
  pos: [number, number, number];
  look: [number, number, number];
}

export const KEYFRAMES: KF[] = [
  { pos: [5, 1.9, 46], look: [-1, 2.6, 20] }, // 0 approach
  { pos: [1.5, 1.7, 35], look: [-1, 2.4, 22] }, // 1 gate
  { pos: [-1, 1.65, 24], look: [-2, 1.9, 6] }, // 2 garden
  { pos: [-1.6, 1.65, 14], look: [-1.5, 1.8, 3] }, // 3 garden mid
  { pos: [-1.5, 1.6, 6], look: [-1.5, 1.5, -6] }, // 4 genkan
  { pos: [-1.5, 1.75, 1.5], look: [-4.2, 1.4, -1] }, // 5 tea room
  { pos: [-1.5, 1.75, -2], look: [-5, 1.3, -0.6] }, // 6 tea hearth
  { pos: [-1.5, 1.75, -7.5], look: [4, 1.1, -7.8] }, // 7 courtyard
  { pos: [-1.5, 1.75, -12.5], look: [2.5, 1.0, -17] }, // 8 living
  { pos: [-1.5, 1.75, -17.5], look: [-5.5, 1.5, -18] }, // 9 living window
  { pos: [-1.5, 1.75, -22.5], look: [3, 0.9, -25] }, // 10 bedroom
  { pos: [-1.5, 1.75, -29.5], look: [2.5, 0.9, -31.5] }, // 11 bath
  { pos: [-1.5, 1.75, -36], look: [2, 0.4, -46] }, // 12 back garden
  { pos: [-0.5, 1.6, -40], look: [3, 0, -50] }, // 13 pond
  { pos: [1, 1.35, -43.5], look: [4, 0, -53] }, // 14 end
];

export interface Chapter {
  id: string;
  title: string;
  jp: string;
  kf: number;
  body: string;
  hint?: string;
}

export const CHAPTERS: Chapter[] = [
  { id: "approach", title: "The Approach", jp: "参道", kf: 0, body: "Gravel, moss and a single line of stepping stones lead toward a roof that seems to rest on the trees.", hint: "Scroll to walk" },
  { id: "garden", title: "The Front Garden", jp: "前庭", kf: 2, body: "Pines are pruned into clouds, maples lean over the path. Try the lanterns — they answer a touch.", hint: "Click a lantern" },
  { id: "genkan", title: "Genkan", jp: "玄関", kf: 4, body: "The threshold of river stone. One step up, the floor turns to timber and the noise of the world drops away." },
  { id: "tea", title: "Tea Room", jp: "茶室", kf: 5, body: "Paper screens, a sunken hearth and a hanging scroll. The branch in the alcove follows the season." },
  { id: "courtyard", title: "Courtyard", jp: "中庭", kf: 7, body: "A pocket of sky held inside the house. Raked gravel, one maple, a stone basin filling drop by drop." },
  { id: "living", title: "Living Room", jp: "居間", kf: 8, body: "Wide cedar planks, a low table and a lattice window that frames the garden like a scroll." },
  { id: "bedroom", title: "Bedroom", jp: "寝室", kf: 10, body: "A low hinoki platform, indigo linen and a paper lamp. Nothing here asks to be looked at." },
  { id: "bath", title: "Bath", jp: "浴室", kf: 11, body: "Hinoki releases its scent into the steam. The window stays open to the back garden." },
  { id: "engawa", title: "Engawa", jp: "縁側", kf: 12, body: "The veranda between inside and out. Below the eaves, stones step down toward the pond." },
  { id: "pond", title: "The Koi Pond", jp: "池", kf: 13, body: "Water holds the sky. Choose a season and an hour, then touch the water to scatter feed.", hint: "Click the water" },
];

// chapter index for each keyframe
export const KF_CHAPTER: number[] = (() => {
  const out: number[] = [];
  for (let i = 0; i < KEYFRAMES.length; i++) {
    let c = 0;
    CHAPTERS.forEach((ch, idx) => {
      if (i >= ch.kf) c = idx;
    });
    out.push(c);
  }
  return out;
})();

export const FRONT_PATH: [number, number][] = [
  [2.5, 48],
  [3, 38],
  [1, 31],
  [-1, 26],
  [-2.4, 20],
  [-0.6, 14],
  [-1.5, 9],
];

export const BACK_PATH: [number, number][] = [
  [-1.5, -38.5],
  [-2.2, -41],
  [-0.4, -43],
  [0.8, -45],
];

// floor-plan projection: travel direction runs left → right
export const PLAN = { s: 10, z0: 28, xoff: 9, w: 860, h: 220 };
export const planX = (z: number) => (PLAN.z0 - z) * PLAN.s;
export const planY = (x: number) => (x + PLAN.xoff) * PLAN.s;
