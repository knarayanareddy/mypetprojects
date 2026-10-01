import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { ingestFiles, UUID_RE } from "@/lib/atlas/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const [p] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, id));
  if (!p) return Response.json({ error: "Not found" }, { status: 404 });
  const form = await req.formData();
  const files: { name: string; buf: Buffer }[] = [];
  for (const f of form.getAll("files")) if (f instanceof File && f.size > 0) files.push({ name: f.name, buf: Buffer.from(await f.arrayBuffer()) });
  if (!files.length) return Response.json({ error: "No files received" }, { status: 400 });
  const results = await ingestFiles(id, files);
  // new inputs invalidate an earlier dashboard
  await db.update(projects).set({ status: "draft" }).where(eq(projects.id, id));
  return Response.json({ results });
}
