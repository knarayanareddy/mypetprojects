import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { robotModels } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(robotModels).orderBy(desc(robotModels.createdAt));
    return NextResponse.json({ models: rows });
  } catch (e) {
    return NextResponse.json({ models: [], error: String(e) }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.name !== "string" || !b.name.trim() || typeof b.location !== "string" || !b.location.trim()) {
    return NextResponse.json({ error: "name and location are required" }, { status: 400 });
  }
  const str = (v: unknown, d = "") => (typeof v === "string" ? v.trim() : d);
  try {
    const [row] = await db
      .insert(robotModels)
      .values({
        name: str(b.name),
        family: str(b.family, "custom") || "custom",
        source: str(b.source, "hf") || "hf",
        location: str(b.location),
        endpoint: str(b.endpoint, "http://localhost:8787") || "http://localhost:8787",
        instruction: str(b.instruction),
        notes: str(b.notes),
        languageConditioned: b.languageConditioned === true,
      })
      .returning();
    return NextResponse.json({ model: row });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.delete(robotModels).where(eq(robotModels.id, id));
  return NextResponse.json({ ok: true });
}
