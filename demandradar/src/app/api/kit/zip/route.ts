import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { KIT_ROOT, listKitFiles } from "@/lib/kit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/kit/zip: the whole portable kit as demand-radar.zip (scripts keep their executable bit). */
export async function GET() {
  const zip = new JSZip();
  const root = zip.folder("demand-radar")!;
  for (const f of listKitFiles()) {
    const full = path.join(KIT_ROOT, f.path);
    const executable = f.path.endsWith(".py");
    root.file(f.path, fs.readFileSync(full), executable ? { unixPermissions: 0o755 } : undefined);
  }
  const data = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    platform: "UNIX",
  });
  return new Response(Buffer.from(data), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="demand-radar.zip"',
      "Cache-Control": "no-store",
    },
  });
}
