import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { documents, projects } from "@/db/schema";
import { normalizeFile } from "./normalize";
import type { DocAsset, DocMeta, WorkDoc } from "./types";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface IngestResult {
  name: string;
  status: "added" | "unchanged" | "cached" | "error";
  message?: string;
}

export async function ingestFiles(projectId: string, files: { name: string; buf: Buffer }[]): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  for (const f of files) {
    try {
      const existing = await db.select().from(documents).where(eq(documents.projectId, projectId));
      const maxN = existing.reduce((a, d) => Math.max(a, parseInt(d.fileId.replace(/\D/g, ""), 10) || 0), 0);
      const { createHash } = await import("node:crypto");
      const sha = createHash("sha256").update(f.buf).digest("hex");
      // incremental: same bytes already in this workspace -> skip
      if (existing.some((d) => d.sha256 === sha)) {
        results.push({ name: f.name, status: "unchanged", message: "Source unchanged — already normalized, skipped." });
        continue;
      }
      // cache: same bytes normalized in another project -> reuse the normalized layer
      const [cached] = await db.select().from(documents).where(and(eq(documents.sha256, sha), ne(documents.projectId, projectId))).limit(1);
      if (cached) {
        await db.insert(documents).values({
          projectId,
          fileId: `f${maxN + 1}`,
          name: f.name,
          type: cached.type,
          size: cached.size,
          sha256: sha,
          pages: cached.pages,
          words: cached.words,
          contentMd: cached.contentMd,
          assets: cached.assets,
          meta: cached.meta,
          cached: true,
        });
        results.push({ name: f.name, status: "cached", message: "Reused the normalized copy from an earlier run." });
        continue;
      }
      const n = await normalizeFile(f.name, f.buf);
      await db.insert(documents).values({
        projectId,
        fileId: `f${maxN + 1}`,
        name: f.name,
        type: n.type,
        size: n.size,
        sha256: n.sha256,
        pages: n.pages,
        words: n.words,
        contentMd: n.contentMd,
        assets: n.assets,
        meta: n.meta,
      });
      results.push({ name: f.name, status: "added" });
    } catch (e) {
      results.push({ name: f.name, status: "error", message: (e as Error).message });
    }
  }
  await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
  return results;
}

export async function loadWorkDocs(projectId: string, onlyIncluded = true): Promise<WorkDoc[]> {
  const rows = await db.select().from(documents).where(eq(documents.projectId, projectId)).orderBy(asc(documents.createdAt), asc(documents.fileId));
  return rows
    .filter((r) => (onlyIncluded ? r.included : true))
    .map((r) => ({
      fileId: r.fileId,
      name: r.name,
      type: r.type,
      pages: r.pages,
      words: r.words,
      contentMd: r.contentMd,
      assets: (r.assets as DocAsset[] | null) || [],
      meta: (r.meta as DocMeta) || { headings: [], tables: 0, warnings: [], unitKind: "section", units: 0 },
    }));
}
