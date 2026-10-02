// Fire-and-forget backup of selected localStorage keys to Postgres (/api/state) + restore on first load.
// localStorage stays the source of truth while the page runs; the DB only fills gaps (new browser/PC).
export function backup(key: string, value: unknown) {
  if (typeof fetch === "undefined") return;
  fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, value }) }).catch(() => undefined);
}

/** copy DB values into localStorage for keys that are missing locally. Returns the keys restored. */
export async function restore(): Promise<string[]> {
  try {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (!r.ok) return [];
    const j = (await r.json()) as { items?: Record<string, unknown> };
    const got: string[] = [];
    for (const [k, v] of Object.entries(j.items ?? {})) {
      if (localStorage.getItem(k) === null && v !== null) { localStorage.setItem(k, JSON.stringify(v)); got.push(k); }
    }
    return got;
  } catch { return []; }
}
