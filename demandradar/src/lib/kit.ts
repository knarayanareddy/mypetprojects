import fs from "node:fs";
import path from "node:path";

/** The portable Demand Radar kit that ships with this app. */
export const KIT_ROOT = path.join(process.cwd(), "demand-radar");

const SKIP = new Set(["__pycache__", ".DS_Store", "node_modules", ".git"]);

export type KitFile = { path: string; size: number };

export function listKitFiles(): KitFile[] {
  const out: KitFile[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name) || entry.name.endsWith(".pyc")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        out.push({
          path: path.relative(KIT_ROOT, full).split(path.sep).join("/"),
          size: fs.statSync(full).size,
        });
      }
    }
  };
  walk(KIT_ROOT);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/** Resolve a kit-relative path; returns null for anything outside the kit. */
export function resolveKitPath(rel: string): string | null {
  if (!rel || rel.includes("\0")) return null;
  const full = path.resolve(KIT_ROOT, rel);
  if (full !== KIT_ROOT && !full.startsWith(KIT_ROOT + path.sep)) return null;
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
  return full;
}

export function readKitText(rel: string): string | null {
  const full = resolveKitPath(rel);
  return full ? fs.readFileSync(full, "utf-8") : null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
