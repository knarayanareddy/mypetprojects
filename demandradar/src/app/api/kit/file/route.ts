import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { readKitText } from "@/lib/kit";

export const dynamic = "force-dynamic";

/** GET /api/kit/file?path=skills/demand-radar/SKILL.md[&download=1] */
export async function GET(req: NextRequest) {
  const rel = req.nextUrl.searchParams.get("path") ?? "";
  const text = readKitText(rel);
  if (text === null) {
    return NextResponse.json({ error: "file not found in kit" }, { status: 404 });
  }
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (req.nextUrl.searchParams.get("download")) {
    headers["Content-Disposition"] = `attachment; filename="${path.basename(rel)}"`;
  }
  return new NextResponse(text, { headers });
}
