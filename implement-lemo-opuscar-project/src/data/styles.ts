export const REPO = "https://github.com/lemomo-ai/lemo-opuscar";
export const RAW = "https://raw.githubusercontent.com/lemomo-ai/lemo-opuscar/main";
export const GALLERY = "https://lemomo-ai.github.io/lemo-opuscar/";

export type StyleItem = {
  en: string;
  zh: string;
  folder: string;
  demo: string;
  isNew?: boolean;
  hue: number; // fallback colour when the frame cannot load
};

export type Category = {
  id: string;
  en: string;
  zh: string;
  icon: string;
  styles: StyleItem[];
};

export const categories: Category[] = [
  {
    id: "hand-drawn",
    en: "Hand-drawn & Painting",
    zh: "手绘与绘画",
    icon: "🖌️",
    styles: [
      { en: "Crayon Picture Book", zh: "蜡笔儿童绘本", folder: "crayon-book", demo: "The Moon Can't Sleep", hue: 40 },
      { en: "Watercolor Brush", zh: "水彩笔刷", folder: "watercolor", demo: "Follow the Rain", hue: 200 },
      { en: "Chinese Ink Wash", zh: "中国水墨", folder: "ink-wash", demo: "The Swordsman and the River", hue: 210 },
      { en: "Impasto Oil Painting", zh: "油画厚涂", folder: "impasto", demo: "The Colour of Rain", hue: 25 },
      { en: "One-line Drawing", zh: "一笔画", folder: "one-line", demo: "The Line That Never Lifted", hue: 0 },
      { en: "Whiteboard Explainer", zh: "白板讲解", folder: "whiteboard", demo: "Einstein in Your Pocket", hue: 220 },
      { en: "Urban Sketch · Pen & Wash", zh: "钢笔淡彩", folder: "urban-sketch", demo: "Where the Wind Went", hue: 35 },
    ],
  },
  {
    id: "east-asian",
    en: "East Asian Traditions",
    zh: "东方传统",
    icon: "🏮",
    styles: [
      { en: "Shadow Puppetry", zh: "皮影戏", folder: "shadow-puppet", demo: "Hou Yi Shoots the Suns", hue: 15 },
      { en: "Ukiyo-e", zh: "浮世绘", folder: "ukiyoe", demo: "A Journey Toward the Mountain", hue: 205 },
      { en: "Red Paper-cut", zh: "红色窗花剪纸", folder: "papercut-red", demo: "Nian Comes to Town", hue: 355 },
      { en: "Paper-cut Lightbox", zh: "纸雕灯影", folder: "paper-lantern", demo: "A Mooncake's Longing", hue: 30 },
    ],
  },
  {
    id: "print",
    en: "Print & Printmaking",
    zh: "印刷与版画",
    icon: "🖨️",
    styles: [
      { en: "Risograph Print", zh: "Risograph 丝网印刷", folder: "risograph", demo: "Sunday Ride", hue: 330 },
      { en: "Halftone Dossier", zh: "复古半调案卷", folder: "halftone-dossier", demo: "Case File: Chubby", hue: 45 },
      { en: "Woodcut Print", zh: "木刻版画", folder: "woodcut", demo: "The Bell Founder", hue: 20 },
      { en: "Copperplate Engraving", zh: "铜版画", folder: "engraving", demo: "The Honeybee, Plate VII", isNew: true, hue: 38 },
      { en: "Silkscreen Travel Poster", zh: "丝印旅行海报", folder: "silkscreen-poster", demo: "Three Trails", isNew: true, hue: 175 },
    ],
  },
  {
    id: "graphic",
    en: "Graphic & Type",
    zh: "图形与排版",
    icon: "🔠",
    styles: [
      { en: "Swiss Motion Graphics", zh: "瑞士动态排版", folder: "swiss-motion", demo: "Five Rules for a Poster", hue: 5 },
      { en: "60s Spy Title Sequence", zh: "60s 间谍片头", folder: "spy-titles", demo: "The Velvet Cipher", hue: 340 },
      { en: "Art Deco", zh: "装饰艺术", folder: "art-deco", demo: "Midnight at the Starlight Hotel", hue: 48 },
      { en: "Blueprint", zh: "蓝图 / 工程制图", folder: "blueprint", demo: "Patent Pending: The Cloud Catcher", hue: 215 },
      { en: "Stained Glass", zh: "彩色玻璃窗", folder: "stained-glass", demo: "The Dragon of the East Window", hue: 270 },
      { en: "Pictogram Motion", zh: "象形运动图形", folder: "pictogram-motion", demo: "Aichi-Nagoya 2026 — All 43 Sports", hue: 190 },
      { en: "ASCII / CRT Terminal", zh: "ASCII / CRT 终端", folder: "ascii-crt", demo: "Tranquility.log", hue: 135 },
    ],
  },
  {
    id: "info",
    en: "Information & Keynote",
    zh: "信息与发布",
    icon: "📊",
    styles: [
      { en: "Data Storytelling", zh: "数据叙事", folder: "dataviz", demo: "A Hundred Summers", hue: 20 },
      { en: "Isometric Infographic", zh: "等距信息图", folder: "iso-infographic", demo: "From Bean to Cup", hue: 160 },
      { en: "Dark Tech Keynote", zh: "暗色科技发布", folder: "dark-keynote", demo: "Room to Think", hue: 250 },
      { en: "Living Screencast", zh: "活体实机录屏", folder: "living-screencast", demo: "Clawd Moves In", hue: 15 },
      { en: "Sci-fi Hologram HUD", zh: "科幻全息界面", folder: "hologram-hud", demo: "Volt · Spec Scan", isNew: true, hue: 185 },
    ],
  },
  {
    id: "cartoon",
    en: "Cartoon & Anime",
    zh: "卡通与动画",
    icon: "🎞️",
    styles: [
      { en: "1930s Rubber Hose Cartoon", zh: "1930s 橡皮管卡通", folder: "rubber-hose", demo: "Coffee Cup Chase", hue: 50 },
      { en: "80s Cel Anime", zh: "80 年代赛璐璐动画", folder: "cel-anime-80s", demo: "City Lights, 1987", hue: 300 },
      { en: "Sci-Fi Sitcom Toon", zh: "科幻情景喜剧卡通", folder: "scifi-toon", demo: "Coffee Run", hue: 165 },
      { en: "Mid-century Cartoon", zh: "50s 扁平卡通", folder: "midcentury-toon", demo: "Meet Pip", isNew: true, hue: 28 },
    ],
  },
  {
    id: "games",
    en: "Games",
    zh: "游戏",
    icon: "🎮",
    styles: [
      { en: "16-bit Pixel RPG", zh: "16-bit 像素 RPG", folder: "pixel-rpg", demo: "The Last Save Point", hue: 230 },
      { en: "HD-2D", zh: "HD-2D", folder: "hd-2d", demo: "The Lampbearer", hue: 35 },
      { en: "Microgame Frenzy", zh: "微游戏快闪（瓦里奥制造式）", folder: "microgame", demo: "Five-Second Astronaut", hue: 60 },
      { en: "Game Show Flat", zh: "综艺节奏扁平", folder: "game-show", demo: "Rhythm of AI, 1997 → 2026", hue: 320 },
    ],
  },
  {
    id: "cinema",
    en: "Cinema & Eras",
    zh: "电影与时代",
    icon: "🎬",
    styles: [
      { en: "1920s Silent Film", zh: "1920s 默片", folder: "silent-film", demo: "The Runaway Loaf", hue: 40 },
      { en: "Liminal Found Footage", zh: "后室 / 新怪谈", folder: "backrooms", demo: "Night Shift Orientation", hue: 55 },
    ],
  },
  {
    id: "materials",
    en: "Materials & 3D",
    zh: "材质与 3D",
    icon: "🧱",
    styles: [
      { en: "Brick Toy", zh: "积木玩具", folder: "brick-toy", demo: "Rocket from Spare Parts", hue: 0 },
      { en: "Paper Pop-up Book", zh: "纸片立体书", folder: "paper-popup", demo: "Pip's Paper Adventure", hue: 30 },
      { en: "Tilt-Shift Miniature", zh: "移轴微缩", folder: "tilt-shift", demo: "Toy Town Rush Hour", hue: 120 },
      { en: "Low-poly Isometric Island", zh: "低多边形等距", folder: "lowpoly-island", demo: "The Island That Grew", hue: 170 },
      { en: "Glass Product Render", zh: "玻璃质感产品", folder: "glass-product", demo: "Aura — Hear the Light", hue: 200 },
    ],
  },
];

export const allStyles = categories.flatMap((c) =>
  c.styles.map((s) => ({ ...s, category: c }))
);
