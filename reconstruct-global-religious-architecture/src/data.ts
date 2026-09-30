export interface Chapter {
  id: string;
  no: string;
  short: string;
  place: string;
  kind: string;
  title: string[];
  glyph: string;
  glyphVertical: boolean;
  glyphSub: string;
  intro: string;
  quote: string;
  specs: [string, string][];
  coords: string;
  accent: string;
  elevation: () => string;
  fg: "maple" | "marigold" | "bamboo" | "tibet" | "palm" | "pine" | "dunes";
}

const hh = (n: number) => n.toFixed(1);

/* line-art elevations (viewBox 0 0 240 120) ----------------------------- */
function kyotoEl() {
  let d = "M8 104H232 M40 104V84 M52 104V84 M64 104V84 M76 104V84 M88 104V84 M34 84H98 M44 84V64H92V84";
  d += "M34 64Q68 58 102 64L92 52Q68 44 44 52Z M52 52Q68 36 84 52 M50 76H86 M50 70H86";
  d += "M150 104V90H170V104 M136 90Q160 86 184 90L176 84H144Z M150 84V74H170V84 M138 74Q160 70 182 74L174 68H146Z M152 68V60H168V68 M142 60Q160 56 178 60L170 54H150Z M160 54V28 M156 40H164 M157 35H163 M158 31H162";
  d += "M112 104V86 M122 104V86 M110 86H124 M112 92H122";
  return d;
}
function indiaEl() {
  let d = "M8 104H232 M84 104V86H156V104 M112 104V92Q120 82 128 92V104";
  let y = 86;
  for (let i = 0; i < 7; i++) {
    const hw = 34 - i * 4;
    d += `M${120 - hw} ${y}L${120 - hw + 2} ${y - 7}H${120 + hw - 2}L${120 + hw} ${y}M${120 - hw - 2} ${y - 7}H${120 + hw + 2}`;
    y -= 7;
  }
  d += `M${112} ${y}Q120 ${y - 10} ${128} ${y}M120 ${y - 9}V${y - 16}M117 ${y - 12}H123`;
  d += "M16 104V90H52V104 M20 90L24 80H44L48 90 M190 104V90H226V104 M194 90L198 80H218L222 90";
  return d;
}
function chinaEl() {
  let d = "M20 104H220 M34 104V99H206V104 M48 99V94H192V99 M62 94V89H178V94 M86 89V70H154V89";
  const roofs: [number, number, number][] = [
    [50, 70, 15],
    [40, 56, 14],
    [30, 43, 13],
  ];
  roofs.forEach(([hw, y, h]) => {
    d += `M${120 - hw - 4} ${y - 3}Q${120 - hw * 0.35} ${y} 120 ${y - h}Q${120 + hw * 0.35} ${y} ${120 + hw + 4} ${y - 3}M${120 - hw - 4} ${y - 3}L${120 - hw} ${y}H${120 + hw}L${120 + hw + 4} ${y - 3}`;
  });
  d += "M120 30V14M118 22H122M116 18H124";
  for (let i = 0; i < 7; i++) d += `M${92 + i * 9} 89V72`;
  return d;
}
function tibetEl() {
  let d = "M8 104H232 M20 104Q60 80 100 66H140Q180 80 220 104 M52 66L56 50H184L188 66 M62 50L66 38H174L178 50 M96 38L98 18H142L144 38";
  d += "M98 18H142 M100 18L105 11H135L140 18 M108 11L113 6H127L132 11 M30 104L100 92L50 84L104 76";
  for (let i = 0; i < 18; i++) d += `M${62 + i * 6.4} 58h2M${70 + i * 6.4} 46h2`;
  d += "M112 50V66 M128 50V66 M112 66H128 M60 38V30 M58 30h4 M180 38V30 M178 30h4";
  d += "M20 92L70 84 M220 92L170 84";
  return d;
}
function thailandEl() {
  let d = "M8 104H232 M74 104V96H166V104 M86 96V90H154V96 M98 90V84H142V90";
  let y = 84;
  for (let i = 0; i < 14; i++) {
    const hw = (13 * (1 - 0.8 * Math.pow(i / 13, 0.95))) * 1.25;
    d += `M${hh(120 - hw)} ${y}L${hh(120 - hw * 0.93)} ${y - 3.4}H${hh(120 + hw * 0.93)}L${hh(120 + hw)} ${y}`;
    y -= 3.4;
  }
  d += `M120 ${hh(y)}V${hh(y - 12)}M117 ${hh(y - 8)}H123`;
  d += "M14 104V94H62V104 M10 94Q38 89 66 94L60 87Q38 82 16 87Z M18 87Q38 79 58 87 M22 80Q38 73 54 80";
  d += "M178 104C178 92 184 84 190 72C194 64 196 58 198 50L198 30L200 50C202 58 204 64 208 72C214 84 220 92 220 104";
  d += "M199 30V22";
  return d;
}
function vaticanEl() {
  let d = "M14 104H226 M22 104V68H218V104 M22 62H218V68 M22 62V58H218V62";
  for (let i = 0; i < 9; i++) d += `M${34 + i * 21.5} 104V70`;
  for (let i = 0; i < 13; i++) d += `M${30 + i * 15.2} 58V53`;
  d += "M94 58V46H146V58 M94 46H146 M94 46C94 28 106 14 120 14C134 14 146 28 146 46";
  d += "M120 14V46 M108 17C104 26 103 36 103 46 M132 17C136 26 137 36 137 46 M114 15C112 26 112 36 112 46 M126 15C128 26 128 36 128 46";
  d += "M116 14V8H124V14 M120 8V1 M118 3H122";
  d += "M22 104Q-2 92 10 78 M218 104Q242 92 230 78";
  return d;
}
function meccaEl() {
  let d = "M8 104H232 M40 104A80 10 0 0 1 200 104A80 10 0 0 1 40 104 M104 104V74H136V104 M104 83H136 M104 86H136 M116 104V94H124V104";
  d += "M20 104V58H220V104 M20 82H220";
  for (let i = 0; i < 24; i++) d += `M${26 + i * 8.2} 82V62`;
  [20, 58, 182, 220].forEach((x) => {
    d += `M${x - 2.4} 58L${x - 1.5} 18M${x + 2.4} 58L${x + 1.5} 18M${x - 3} 18H${x + 3}L${x} 6Z M${x - 3} 40H${x + 3}`;
  });
  return d;
}

export const CHAPTERS: Chapter[] = [
  {
    id: "kyoto",
    no: "01",
    short: "Kyoto",
    place: "Kyoto, Japan",
    kind: "Mountain temple · Buddhist",
    title: ["The", "Rain", "Stage"],
    glyph: "京都",
    glyphVertical: true,
    glyphSub: "Kyōto",
    intro:
      "Lanterns climb a wet stone stair beneath a vermilion moon. A two-storey gate, seven torii, a pagoda among the pines, and a great wooden stage held out over the valley on pillars of zelkova — joined without a single nail.",
    quote: "The stage does not hold the hall up. It holds the night out.",
    specs: [
      ["Inspired by", "Kiyomizu-dera, Higashiyama"],
      ["Founded", "778 CE · main hall rebuilt 1633"],
      ["The stage", "13 m over the slope · no nails"],
      ["Hour", "02:10 · rain, low cloud"],
    ],
    coords: "34.9949° N · 135.7850° E",
    accent: "#ff5a2e",
    elevation: kyotoEl,
    fg: "maple",
  },
  {
    id: "madurai",
    no: "02",
    short: "Madurai",
    place: "Madurai, India",
    kind: "Dravidian temple · Hindu",
    title: ["The", "Tower", "of", "Lamps"],
    glyph: "मंदिर",
    glyphVertical: false,
    glyphSub: "Mandir",
    intro:
      "Oil lamps float on the temple tank while a gopuram climbs tier by tier into the dusk, every ledge crowded with painted gods, sages and beasts. Behind the pillared hall a golden vimana keeps the dark at a distance.",
    quote: "Every tier is a story told in colour, and every colour is relit each year.",
    specs: [
      ["Inspired by", "Meenakshi Amman Temple"],
      ["Gopurams", "14 towers · the tallest ≈ 52 m"],
      ["The tank", "Golden Lotus · stepped ghats"],
      ["Hour", "19:40 · marigold dusk"],
    ],
    coords: "9.9195° N · 78.1193° E",
    accent: "#ffb02e",
    elevation: indiaEl,
    fg: "marigold",
  },
  {
    id: "beijing",
    no: "03",
    short: "Beijing",
    place: "Beijing, China",
    kind: "Imperial altar · Ming dynasty",
    title: ["Three", "Roofs", "of", "Heaven"],
    glyph: "天坛",
    glyphVertical: true,
    glyphSub: "Tiān Tán",
    intro:
      "A round hall stands on three terraces of white marble, because heaven is round and earth is square. Blue glazed roofs stack toward a golden finial, and red lanterns line the road the Emperor walked once a year to ask for a good harvest.",
    quote: "Nothing here is sharp. The whole temple is an instrument for looking up.",
    specs: [
      ["Inspired by", "Hall of Prayer for Good Harvests"],
      ["Built", "1420 · rebuilt 1889 after lightning"],
      ["The hall", "38 m · three roofs · 28 pillars"],
      ["Hour", "04:30 · jade mist"],
    ],
    coords: "39.8822° N · 116.4066° E",
    accent: "#ff5f4a",
    elevation: chinaEl,
    fg: "bamboo",
  },
  {
    id: "lhasa",
    no: "04",
    short: "Lhasa",
    place: "Lhasa, Tibet",
    kind: "Palace-fortress · Tibetan Buddhism",
    title: ["Above", "the", "Thin", "Air"],
    glyph: "པོ་ཏ་ལ།",
    glyphVertical: false,
    glyphSub: "Potala",
    intro:
      "At 3,700 metres the night is almost black and the stars come close. Whitewashed walls lean inward up Marpo Ri, a red palace crowns them, the gold roofs hold the last of the lamplight, and prayer flags send mantras into the wind.",
    quote: "The walls lean toward the mountain, as if listening.",
    specs: [
      ["Inspired by", "Potala Palace"],
      ["Begun", "1645 · the Fifth Dalai Lama"],
      ["Scale", "117 m · 13 storeys · ≈ 3,700 m up"],
      ["Hour", "05:15 · thin, cold air"],
    ],
    coords: "29.6578° N · 91.1172° E",
    accent: "#9fc4ff",
    elevation: tibetEl,
    fg: "tibet",
  },
  {
    id: "bangkok",
    no: "05",
    short: "Bangkok",
    place: "Bangkok, Thailand",
    kind: "Riverside wat · Theravada Buddhism",
    title: ["Lanterns", "Over", "the", "River"],
    glyph: "วัด",
    glyphVertical: false,
    glyphSub: "Wat",
    intro:
      "On the Chao Phraya a central prang climbs in steep terraces of porcelain and shell, a golden chedi holds the light, and a steep-gabled hall gleams orange and green. Paper lanterns lift off the water; krathongs drift out into the dark.",
    quote: "Everything that floats here was made to be let go.",
    specs: [
      ["Inspired by", "Wat Arun Ratchawararam"],
      ["Central prang", "≈ 70 m · porcelain & shell mosaic"],
      ["Festival", "Loy Krathong · Yi Peng lanterns"],
      ["Hour", "21:15 · warm haze"],
    ],
    coords: "13.7437° N · 100.4888° E",
    accent: "#37d0b6",
    elevation: thailandEl,
    fg: "palm",
  },
  {
    id: "vatican",
    no: "06",
    short: "Vatican",
    place: "Vatican City",
    kind: "Basilica · Renaissance & Baroque",
    title: ["Arms", "of", "Stone"],
    glyph: "VATICANUM",
    glyphVertical: true,
    glyphSub: "Roma",
    intro:
      "Two arcs of columns open around an oval square like arms. At the far end a ribbed dome, drawn by Michelangelo, floats over a floodlit travertine façade, and an Egyptian obelisk keeps time in the middle of it all.",
    quote: "The square is an embrace you walk into.",
    specs: [
      ["Inspired by", "St. Peter’s Basilica & Square"],
      ["The dome", "Michelangelo · completed 1590"],
      ["Colonnade", "Bernini · 1656–67 · 284 columns"],
      ["Hour", "20:10 · blue hour"],
    ],
    coords: "41.9022° N · 12.4539° E",
    accent: "#f0e6cf",
    elevation: vaticanEl,
    fg: "pine",
  },
  {
    id: "mecca",
    no: "07",
    short: "Mecca",
    place: "Mecca, Saudi Arabia",
    kind: "The Sacred Mosque · Islam",
    title: ["Seven", "Circuits", "of", "Light"],
    glyph: "مكة",
    glyphVertical: false,
    glyphSub: "Makkah",
    intro:
      "Pilgrims circle the Kaaba counter-clockwise, seven times, in white and in black, in every language, at one slow shared pace. Black silk banded in gold; glowing arcades; nine minarets counting the hour above a city that never quite sleeps.",
    quote: "Seen from above, it is the quietest machine in the world.",
    specs: [
      ["Inspired by", "Masjid al-Haram"],
      ["The Kaaba", "≈ 13 m · black silk, gold band"],
      ["The rite", "Tawaf · seven circuits · nine minarets"],
      ["Hour", "03:40 · before dawn"],
    ],
    coords: "21.4225° N · 39.8262° E",
    accent: "#5fe3a8",
    elevation: meccaEl,
    fg: "dunes",
  },
];
