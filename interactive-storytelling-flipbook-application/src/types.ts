export type Entry = [kicker: string, title: string, text: string, tokens: string];

export type Story = {
  id: string;
  title: string; // may contain \n for the cover
  sub: string;
  blurb: string;
  cloth: string; // cover cloth colour
  gold: string; // foil colour
  ink: string; // ink colour for line work
  pal: string[]; // watercolour palette
  emblem: string; // glyph used on the cover
  parts: [number, string][]; // [first page number, part name]
  pages: Entry[]; // exactly 52 content pages
};

export const CONTENT_PAGES = 52;
export const TOTAL_SIDES = CONTENT_PAGES + 2; // cover + 52 + back cover
export const LEAVES = TOTAL_SIDES / 2; // 27
