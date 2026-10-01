import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { UUID_RE } from "@/lib/atlas/store";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await ctx.params;
  if (!UUID_RE.test(id) || !UUID_RE.test(docId)) return Response.json({ error: "Not found" }, { status: 404 });
  await db.delete(documents).where(and(eq(documents.id, docId), eq(documents.projectId, id)));
  return Response.json({ ok: true });
}
