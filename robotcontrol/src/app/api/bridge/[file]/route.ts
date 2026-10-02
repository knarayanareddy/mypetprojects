import { readFile } from "node:fs/promises";
import path from "node:path";

// Serves the *actual* files in /bridge so what the Guide shows (and you download) is byte-for-byte what is tested.
const ALLOWED = new Set(["so101_bridge.py", "policy_server.py", "requirements.txt", "README.md"]);

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!ALLOWED.has(file)) return new Response("not found", { status: 404 });
  try {
    const text = await readFile(path.join(process.cwd(), "bridge", file), "utf8");
    return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  } catch {
    return new Response("missing", { status: 404 });
  }
}
