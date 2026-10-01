import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recordings } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  try {
    if (id) {
      const [row] = await db.select().from(recordings).where(eq(recordings.id, Number(id)));
      return NextResponse.json({ recording: row ?? null });
    }
    const rows = await db.select().from(recordings).orderBy(desc(recordings.createdAt)).limit(30);
    return NextResponse.json({ recordings: rows.map((r) => ({ id: r.id, name: r.name, arm: r.arm, fps: r.fps, frames: r.frames.length, createdAt: r.createdAt })) });
  } catch (e) {
    return NextResponse.json({ recordings: [], error: String(e) });
  }
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { name?: string; arm?: string; fps?: number; frames?: number[][] } | null;
  if (!b?.name || !Array.isArray(b.frames) || b.frames.length === 0) return NextResponse.json({ error: "name and frames required" }, { status: 400 });
  if (b.frames.length > 20000) return NextResponse.json({ error: "recording too long" }, { status: 413 });
  try {
    const [row] = await db
      .insert(recordings)
      .values({ name: b.name, arm: b.arm === "b" ? "b" : "a", fps: b.fps && b.fps > 0 ? Math.round(b.fps) : 30, frames: b.frames })
      .returning({ id: recordings.id });
    return NextResponse.json({ id: row.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.delete(recordings).where(eq(recordings.id, id));
  return NextResponse.json({ ok: true });
}
