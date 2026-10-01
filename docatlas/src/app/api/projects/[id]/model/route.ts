import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { UUID_RE } from "@/lib/atlas/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const [p] = await db.select().from(projects).where(eq(projects.id, id));
  if (!p || !p.model) return Response.json({ error: "Not distilled yet" }, { status: 404 });
  return new Response(JSON.stringify(p.model, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="model.json"' },
  });
}
