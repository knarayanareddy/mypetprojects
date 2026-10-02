import { eq, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";
import { appState } from "@/db/schema";

export const dynamic = "force-dynamic";

const KEY = "control-room";

async function ensureTable() {
  await getDb().execute(sql`create table if not exists app_state (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz not null default now()
  )`);
}

export async function GET() {
  if (!hasDatabase()) return Response.json({ ok: false, reason: "no-database" }, { status: 503 });
  try {
    await ensureTable();
    const rows = await getDb().select().from(appState).where(eq(appState.key, KEY));
    return Response.json({ ok: true, value: rows[0]?.value ?? null, updatedAt: rows[0]?.updatedAt ?? null });
  } catch (e) {
    return Response.json({ ok: false, reason: String(e) }, { status: 503 });
  }
}

export async function PUT(req: Request) {
  if (!hasDatabase()) return Response.json({ ok: false, reason: "no-database" }, { status: 503 });
  try {
    const body = await req.json();
    await ensureTable();
    await getDb()
      .insert(appState)
      .values({ key: KEY, value: body })
      .onConflictDoUpdate({ target: appState.key, set: { value: body, updatedAt: new Date() } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, reason: String(e) }, { status: 503 });
  }
}
