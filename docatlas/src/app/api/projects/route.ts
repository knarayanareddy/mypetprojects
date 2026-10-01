import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { documents, projects } from "@/db/schema";
import { ingestFiles } from "@/lib/atlas/store";
import { SAMPLE_FILES, SAMPLE_GOAL } from "@/lib/atlas/sample";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      createdAt: projects.createdAt,
      files: sql<number>`(select count(*)::int from documents d where d.project_id = ${projects.id})`,
    })
    .from(projects)
    .orderBy(desc(projects.updatedAt))
    .limit(50);
  return Response.json({ projects: rows });
}

export async function POST(req: Request) {
  const ctype = req.headers.get("content-type") || "";
  let name = "Untitled atlas";
  let goal = "";
  let files: { name: string; buf: Buffer }[] = [];

  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData();
    name = String(form.get("name") || "").trim() || name;
    goal = String(form.get("goal") || "");
    for (const f of form.getAll("files")) {
      if (f instanceof File && f.size > 0) files.push({ name: f.name, buf: Buffer.from(await f.arrayBuffer()) });
    }
  } else {
    const body = (await req.json().catch(() => ({}))) as { sample?: boolean; name?: string };
    if (body.sample) {
      name = "Sample: warehouse automation program";
      goal = SAMPLE_GOAL;
      files = SAMPLE_FILES.map((f) => ({ name: f.name, buf: Buffer.from(f.content, "utf8") }));
    } else if (body.name) name = body.name;
  }

  const [p] = await db.insert(projects).values({ name, readingGoal: goal }).returning();
  const results = files.length ? await ingestFiles(p.id, files) : [];
  const added = results.filter((r) => r.status !== "error").length;
  if (files.length && !added) {
    // nothing usable — don't leave an empty project behind
    await db.delete(documents).where(eq(documents.projectId, p.id));
    await db.delete(projects).where(eq(projects.id, p.id));
    return Response.json({ error: results.map((r) => `${r.name}: ${r.message}`).join(" · ") || "No usable files", results }, { status: 400 });
  }
  return Response.json({ id: p.id, results });
}
