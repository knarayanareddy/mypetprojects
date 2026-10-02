import { MISSIONS, type Mission } from "./missions";

/**
 * Offline instruction parser: free text -> mission id + parameter overrides.
 * It is a transparent keyword scorer (no network, no LLM), so a command either maps to one of the
 * verified missions or is rejected with suggestions. An LLM agent can sit in front of this later.
 */

const KEYWORDS: Record<string, string[]> = {
  "pick-place": ["pick", "place", "bin", "put", "move", "grab", "collect", "clean", "pick up", "throw"],
  "color-sort": ["sort", "colour", "color", "separate", "group", "recycle"],
  tower: ["tower", "stack", "build", "pile", "tall"],
  hanoi: ["hanoi", "discs", "disks", "puzzle"],
  tictactoe: ["tic", "tac", "toe", "noughts", "crosses"],
  draw: ["draw", "shape", "circle", "square", "triangle", "star", "sketch", "plot"],
  signature: ["sign", "signature", "write", "calligraphy", "handwriting"],
  button: ["button", "press", "doorbell"],
  lightswitch: ["light", "switch", "lamp", "flip"],
  keypad: ["keypad", "type", "pin", "digits"],
  "phone-tap": ["tap", "touchscreen", "phone", "screen"],
  "vial-rack": ["vial", "rack", "lab", "tube", "sample"],
  pour: ["pour", "coffee", "barista", "tea", "water", "drink"],
  domino: ["domino", "topple"],
  dice: ["dice", "die", "roll"],
  follow: ["follow", "track", "watch me"],
  sentry: ["sentry", "guard", "patrol", "security", "intruder"],
  "pet-teaser": ["cat", "pet", "teaser", "dog"],
  wave: ["wave", "hello", "hi", "greet", "handshake", "welcome"],
  "page-turn": ["page", "turn", "book"],
  tidy: ["tidy", "sweep", "push away", "declutter"],
  "cup-stack": ["pyramid", "cup", "cups"],
  inspect: ["inspect", "rotate", "examine"],
  conveyor: ["conveyor", "belt", "feeder", "continuous", "factory"],
};

const NUM_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, single: 1, all: 5, every: 5, both: 2 };

function firstCount(text: string): number | null {
  const m = text.match(/\b(\d+|one|two|three|four|five|six|single|all|every|both)\b/);
  if (!m) return null;
  const v = /^\d+$/.test(m[1]) ? Number(m[1]) : NUM_WORDS[m[1]];
  return v && v > 0 && v <= 20 ? v : null;
}

export interface ParsedCommand {
  mission: Mission;
  params: Record<string, number>;
  score: number;
  because: string;
}

export function parseCommand(text: string): { best: ParsedCommand | null; alternatives: Mission[] } {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()} `;
  if (t.trim().length < 2) return { best: null, alternatives: [] };
  const scored = MISSIONS.map((m) => {
    let score = 0;
    const hits: string[] = [];
    for (const k of KEYWORDS[m.id] ?? []) {
      if (t.includes(` ${k} `) || (k.length > 3 && t.includes(` ${k}`))) {
        score += k.includes(" ") ? 3 : 2;
        hits.push(k);
      }
    }
    if (t.includes(` ${m.id.replace(/-/g, " ")} `)) score += 4;
    for (const w of m.title.toLowerCase().replace(/[^a-z ]/g, " ").split(" ")) {
      if (w.length > 4 && t.includes(` ${w}`)) {
        score += 1;
        hits.push(w);
      }
    }
    return { m, score, hits };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  const alternatives = scored.slice(0, 4).filter((x) => x.score > 0).map((x) => x.m);
  if (!top || top.score < 2) return { best: null, alternatives };
  const params: Record<string, number> = {};
  const secs = t.match(/\b(\d+)\s*(?:s|sec|secs|seconds)\b/);
  if (secs && top.m.params.some((p) => p.key === "seconds")) params.seconds = Number(secs[1]);
  const n = firstCount(secs ? t.replace(secs[0], " ") : t);
  if (n !== null) for (const key of ["count", "max", "levels"]) if (top.m.params.some((p) => p.key === key)) params[key] = n;
  return { best: { mission: top.m, params, score: top.score, because: top.hits.join(", ") }, alternatives };
}
