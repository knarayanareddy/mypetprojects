// Natural-language -> skill plan. Keyword router (offline) + optional OpenAI-compatible LLM/VLM planner.
import { SKILLS, Skill, skillById } from "./skills";
import { cameras } from "./cameras";

export interface Plan { skills: Skill[]; via: "keywords" | "llm"; explain: string; action?: "home" | "stop" | "open" | "close" }

export interface LlmConfig { baseUrl: string; apiKey: string; model: string; useVision: boolean; enabled: boolean }
const KEY = "so101.llm";
export const defaultLlm: LlmConfig = { baseUrl: "https://api.openai.com/v1", apiKey: "", model: "gpt-4o-mini", useVision: false, enabled: false };
export const loadLlm = (): LlmConfig => { try { return { ...defaultLlm, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return defaultLlm; } };
export const saveLlm = (c: LlmConfig) => localStorage.setItem(KEY, JSON.stringify(c));

function scoreClause(clause: string): { skill: Skill; score: number } | null {
  const t = " " + clause.toLowerCase().replace(/[^a-z0-9\- ]/g, " ") + " ";
  let best: { skill: Skill; score: number } | null = null;
  for (const s of SKILLS) {
    let sc = 0;
    for (const k of s.keywords) if (t.includes(" " + k + " ") || t.includes(" " + k + "s ") || (k.length > 4 && t.includes(k))) sc += k.length > 5 ? 3 : 2;
    if (t.includes(s.name.toLowerCase().split(/[ (:]/)[0])) sc += 1;
    if (sc > 0 && (!best || sc > best.score)) best = { skill: s, score: sc };
  }
  return best;
}

export function keywordPlan(text: string): Plan {
  const low = text.toLowerCase().trim();
  if (/^(stop|halt|abort|cancel)\b/.test(low)) return { skills: [], via: "keywords", explain: "Stop requested", action: "stop" };
  if (/^(go )?(home|rest|park|ready)\b/.test(low)) return { skills: [], via: "keywords", explain: "Return to ready pose", action: "home" };
  if (/^open (the )?gripper/.test(low)) return { skills: [], via: "keywords", explain: "Open gripper", action: "open" };
  if (/^close (the )?gripper/.test(low)) return { skills: [], via: "keywords", explain: "Close gripper", action: "close" };
  const clauses = text.split(/\bthen\b|\bafter that\b|\band then\b|;|\bnext\b|,/i).map((s) => s.trim()).filter(Boolean);
  const out: Skill[] = [];
  const notes: string[] = [];
  for (const c of clauses) {
    const m = scoreClause(c);
    if (m) { out.push(m.skill); notes.push(`“${c}” → ${m.skill.name}`); } else notes.push(`“${c}” → no matching skill`);
  }
  return { skills: out, via: "keywords", explain: notes.join("  ·  ") };
}

export async function llmPlan(text: string, cfg: LlmConfig): Promise<Plan> {
  const catalog = SKILLS.map((s) => `${s.id}: ${s.name} – ${s.blurb} (arms:${s.arms})`).join("\n");
  const sys = `You are the task planner of a two-arm SO-101 robot workstation. Choose an ordered list of skills from this catalog to fulfil the user's instruction. Reply ONLY with JSON: {"plan":["skill_id",...],"explain":"one short sentence"}. If nothing fits reply {"plan":[],"explain":"why"}.\n\nCatalog:\n${catalog}`;
  const content: unknown[] = [{ type: "text", text }];
  if (cfg.useVision) {
    const f = cameras.grab("top", 448) ?? cameras.activeSlots().map((s) => cameras.grab(s, 448)).find(Boolean);
    if (f) content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${f}` } });
  }
  const r = await fetch(cfg.baseUrl.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}) },
    body: JSON.stringify({ model: cfg.model, temperature: 0, messages: [{ role: "system", content: sys }, { role: "user", content }] }),
  });
  if (!r.ok) throw new Error(`LLM HTTP ${r.status}`);
  const j = await r.json();
  const raw: string = j.choices?.[0]?.message?.content ?? "";
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("LLM did not return JSON");
  const parsed = JSON.parse(m[0]);
  const skills = (parsed.plan as string[]).map((id) => skillById(id)).filter(Boolean) as Skill[];
  return { skills, via: "llm", explain: parsed.explain ?? "" };
}

export async function makePlan(text: string, cfg: LlmConfig): Promise<Plan> {
  if (cfg.enabled && cfg.baseUrl) {
    try { return await llmPlan(text, cfg); } catch (e) {
      const k = keywordPlan(text);
      k.explain = `LLM unavailable (${(e as Error).message}) – used keyword router. ` + k.explain;
      return k;
    }
  }
  return keywordPlan(text);
}
