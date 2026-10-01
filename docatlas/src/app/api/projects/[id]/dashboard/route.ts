import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { renderDashboard } from "@/lib/atlas/render";
import { loadWorkDocs, UUID_RE } from "@/lib/atlas/store";
import type { Model, ValidationResult } from "@/lib/atlas/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return new Response("Not found", { status: 404 });
  const [p] = await db.select().from(projects).where(eq(projects.id, id));
  if (!p || !p.model) return new Response("This atlas has not been distilled yet.", { status: 404 });
  const model = p.model as Model;
  const all = await loadWorkDocs(id, false);
  const docs = all.filter((d) => model.files.some((f) => f.id === d.fileId));
  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  const lang = url.searchParams.get("lang") === "zh" ? "zh" : url.searchParams.get("lang") === "en" ? "en" : p.uiLang === "zh" ? "zh" : "en";
  const html = renderDashboard(model, docs, {
    uiLang: lang,
    inlineVendor: download,
    validation: p.validation as ValidationResult | null,
  });
  const slug = (p.name || "atlas").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "atlas";
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      ...(download ? { "content-disposition": `attachment; filename="${slug}-dashboard.html"` } : {}),
    },
  });
}
