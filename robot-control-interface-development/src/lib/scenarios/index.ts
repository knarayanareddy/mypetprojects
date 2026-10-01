import { musicArt } from "./music-art";
import { homeCare, games } from "./home-games";
import { industry, outOfBox } from "./industry-oob";
import type { Category, Scenario } from "./types";

export const SCENARIOS: Scenario[] = [...musicArt, ...homeCare, ...games, ...industry, ...outOfBox];
export const SCENARIO_BY_ID: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
export const CATEGORIES: Category[] = ["Music & Art", "Home & Care", "Games & Magic", "Industry & Lab", "Out-of-the-box"];

export type { Scenario } from "./types";

/** Tiny keyword router: natural-language instruction -> best scenario. */
export function routeInstruction(text: string): { scenario: Scenario | null; score: number; alternatives: Scenario[] } {
  const t = text.toLowerCase();
  const scored = SCENARIOS.map((s) => {
    let score = 0;
    for (const k of s.keywords) if (t.includes(k.toLowerCase())) score += k.length > 4 ? 3 : 2;
    for (const w of s.title.toLowerCase().split(/\W+/)) if (w.length > 3 && t.includes(w)) score += 1;
    return { s, score };
  }).sort((a, b) => b.score - a.score);
  const best = scored[0];
  return { scenario: best && best.score > 0 ? best.s : null, score: best?.score ?? 0, alternatives: scored.slice(1, 4).filter((x) => x.score > 0).map((x) => x.s) };
}
