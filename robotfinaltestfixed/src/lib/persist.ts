/**
 * Persistence: localStorage is the source of truth (works offline at a hackathon).
 * Postgres (via /api/state) is a best-effort backup; every failure is swallowed.
 */
const KEY = "so101-control-room-v2";

export function loadLocal<T>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveLocal(v: unknown) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* quota */
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
export function backupRemote(v: unknown) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(v) }).catch(() => undefined);
  }, 1500);
}

export async function loadRemote<T>(): Promise<T | null> {
  try {
    const r = await fetch("/api/state", { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as { value?: T | null };
    return j.value ?? null;
  } catch {
    return null;
  }
}
