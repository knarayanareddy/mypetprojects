import { NextResponse } from "next/server";
import { routeInstruction, SCENARIOS } from "@/lib/scenarios";

export const dynamic = "force-dynamic";

/** Maps a natural-language instruction to a skill. Uses an OpenAI-compatible LLM when
 *  LLM_API_KEY is set (optional LLM_BASE_URL / LLM_MODEL); otherwise a keyword router. */
export async function POST(req: Request) {
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text || !text.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
  const local = routeInstruction(text);
  const base = { scenarioId: local.scenario?.id ?? null, via: "keyword-router", alternatives: local.alternatives.map((s) => s.id), reason: local.scenario ? `matched keywords for “${local.scenario.title}”` : "no keyword matched" };

  const key = process.env.LLM_API_KEY;
  if (!key) return NextResponse.json(base);
  try {
    const catalog = SCENARIOS.map((s) => `${s.id}: ${s.title} — ${s.tagline}. Example: ${s.prompt}`).join("\n");
    const r = await fetch(`${process.env.LLM_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `You map a user's instruction for two SO-101 robot arms to ONE skill id from this list, or null if none fits. Reply as JSON {"scenario": "<id or null>", "reason": "<short>"}.\n${catalog}` },
          { role: "user", content: text },
        ],
      }),
    });
    if (!r.ok) throw new Error(`LLM ${r.status}`);
    const j = (await r.json()) as { choices: { message: { content: string } }[] };
    const out = JSON.parse(j.choices[0].message.content) as { scenario: string | null; reason?: string };
    const valid = out.scenario && SCENARIOS.some((s) => s.id === out.scenario) ? out.scenario : null;
    return NextResponse.json({ ...base, scenarioId: valid ?? base.scenarioId, via: valid ? "llm" : base.via, reason: out.reason ?? base.reason });
  } catch {
    return NextResponse.json(base);
  }
}
