import { sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@/db";

export const dynamic = "force-dynamic";

/** App health. The database is optional, so it never fails the check. */
export async function GET() {
  let db: "up" | "down" | "disabled" = "disabled";
  if (hasDatabase()) {
    try {
      await getDb().execute(sql`select 1`);
      db = "up";
    } catch {
      db = "down";
    }
  }
  return Response.json({ ok: true, db });
}
