import { readVendor } from "@/lib/atlas/render";

export const dynamic = "force-dynamic";

// Serves the bundled Chart.js / Mermaid copies for the live preview.
// (The downloadable dashboard inlines them instead, so it needs zero network access.)
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const js = readVendor(name);
  if (!js) return new Response("Not found", { status: 404 });
  return new Response(js, {
    headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=86400" },
  });
}
