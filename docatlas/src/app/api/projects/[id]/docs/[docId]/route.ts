import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { UUID_RE } from "@/lib/atlas/store";

export const dynamic = "force-dynamic";

// Preview of the normalized Markdown layer (content.md) for one file.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await ctx.params;
  if (!UUID_RE.test(id) || !UUID_RE.test(docId)) return Response.json({ error: "Not found" }, { status: 404 });
  const [d] = await db
    .select({ name: documents.name, contentMd: documents.contentMd, meta: documents.meta })
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.projectId, id)));
  if (!d) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ name: d.name, meta: d.meta, content: d.contentMd.slice(0, 12000), truncated: d.contentMd.length > 12000 });
}
