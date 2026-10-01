import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { runPipeline } from "@/lib/atlas/pipeline";
import { loadWorkDocs, UUID_RE } from "@/lib/atlas/store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const [p] = await db.select().from(projects).where(eq(projects.id, id));
  if (!p) return Response.json({ error: "Not found" }, { status: 404 });
  const docs = await loadWorkDocs(id, true);
  if (!docs.length) return Response.json({ error: "Select at least one file to include." }, { status: 400 });
  try {
    const res = await runPipeline(docs, { goal: p.readingGoal, uiLang: p.uiLang, title: p.name, engine: p.engine });
    await db
      .update(projects)
      .set({ model: res.model, factcheck: res.factcheck, validation: res.validation, log: res.log, status: "distilled", updatedAt: new Date() })
      .where(eq(projects.id, id));
    return Response.json({ ok: true, validation: res.validation, factcheck: res.factcheck.summary, log: res.log });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 422 });
  }
}
