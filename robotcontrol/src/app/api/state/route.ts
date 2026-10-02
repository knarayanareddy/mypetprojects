import { db } from "@/db";
import { deckState } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const OK_KEY = /^so101\.(cal\.[AB]\.(follower|leader)|vision|settings|history)$/;

/** GET → every stored key/value */
export async function GET() {
  try {
    const rows = await db.select().from(deckState);
    return Response.json({ ok: true, items: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

/** PUT { key, value } → upsert (whitelisted keys, ≤256 kB) */
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { key?: string; value?: unknown };
    if (!body.key || !OK_KEY.test(body.key)) return Response.json({ ok: false, error: "bad key" }, { status: 400 });
    if (JSON.stringify(body.value ?? null).length > 256_000) return Response.json({ ok: false, error: "too large" }, { status: 413 });
    await db.insert(deckState).values({ key: body.key, value: body.value ?? null })
      .onConflictDoUpdate({ target: deckState.key, set: { value: sql`excluded.value`, updatedAt: sql`now()` } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
