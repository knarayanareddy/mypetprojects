import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { taskRuns } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(taskRuns).orderBy(desc(taskRuns.createdAt)).limit(40);
    return NextResponse.json({ runs: rows });
  } catch (e) {
    return NextResponse.json({ runs: [], error: String(e) });
  }
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.instruction !== "string") return NextResponse.json({ error: "instruction required" }, { status: 400 });
  const s = (v: unknown, d: string) => (typeof v === "string" && v ? v : d);
  const metrics: Record<string, number | string> = {};
  if (b.metrics && typeof b.metrics === "object") {
    for (const [k, v] of Object.entries(b.metrics as Record<string, unknown>)) if (typeof v === "number" || typeof v === "string") metrics[k] = v;
  }
  try {
    const [row] = await db
      .insert(taskRuns)
      .values({ instruction: b.instruction, scenarioId: s(b.scenarioId, ""), modelName: s(b.modelName, "Scripted IK skill"), mode: s(b.mode, "sim"), outcome: s(b.outcome, "completed"), metrics })
      .returning();
    return NextResponse.json({ run: row });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
