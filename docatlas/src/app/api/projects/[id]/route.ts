import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, projects } from "@/db/schema";
import { llmProvider } from "@/lib/atlas/llm";
import { UUID_RE } from "@/lib/atlas/store";
import type { DocMeta } from "@/lib/atlas/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const [p] = await db.select().from(projects).where(eq(projects.id, id));
  if (!p) return Response.json({ error: "Not found" }, { status: 404 });
  const docs = await db
    .select({
      id: documents.id,
      fileId: documents.fileId,
      name: documents.name,
      type: documents.type,
      size: documents.size,
      pages: documents.pages,
      words: documents.words,
      included: documents.included,
      cached: documents.cached,
      meta: documents.meta,
      assets: documents.assets,
    })
    .from(documents)
    .where(eq(documents.projectId, id))
    .orderBy(asc(documents.createdAt), asc(documents.fileId));
  return Response.json({
    project: {
      id: p.id,
      name: p.name,
      status: p.status,
      uiLang: p.uiLang,
      readingGoal: p.readingGoal,
      engine: p.engine,
      hasModel: !!p.model,
      validation: p.validation,
      factcheck: p.factcheck,
      log: p.log,
      updatedAt: p.updatedAt,
    },
    docs: docs.map((d) => {
      const meta = d.meta as DocMeta | null;
      return {
        id: d.id,
        fileId: d.fileId,
        name: d.name,
        type: d.type,
        size: d.size,
        pages: d.pages,
        words: d.words,
        included: d.included,
        cached: d.cached,
        images: Array.isArray(d.assets) ? d.assets.length : 0,
        tables: meta?.tables ?? 0,
        sections: meta?.headings?.length ?? 0,
        warnings: meta?.warnings ?? [],
        date: meta?.date ?? null,
        unitKind: meta?.unitKind ?? "section",
      };
    }),
    llm: llmProvider(),
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    uiLang?: string;
    readingGoal?: string;
    engine?: string;
    included?: Record<string, boolean>;
  };
  const set: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string") set.name = body.name.trim().slice(0, 200) || "Untitled atlas";
  if (body.uiLang === "en" || body.uiLang === "zh") set.uiLang = body.uiLang;
  if (typeof body.readingGoal === "string") set.readingGoal = body.readingGoal.slice(0, 1000);
  if (body.engine && ["auto", "builtin", "llm"].includes(body.engine)) set.engine = body.engine;
  await db.update(projects).set(set).where(eq(projects.id, id));
  if (body.included) {
    for (const [docId, inc] of Object.entries(body.included)) {
      if (UUID_RE.test(docId)) await db.update(documents).set({ included: !!inc }).where(eq(documents.id, docId));
    }
  }
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  await db.delete(projects).where(eq(projects.id, id));
  return Response.json({ ok: true });
}
