import Link from "next/link";
import { formatBytes, listKitFiles, readKitText } from "@/lib/kit";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ file?: string }> };

const MAX_SHOWN = 120_000;

export default async function KitPage({ searchParams }: Props) {
  const { file } = await searchParams;
  const files = listKitFiles();
  const current = file && files.some((f) => f.path === file) ? file : "README.md";
  const text = readKitText(current) ?? "";
  const shown = text.length > MAX_SHOWN ? text.slice(0, MAX_SHOWN) + "\n\n… truncated, download the file for the rest …" : text;
  const total = files.reduce((a, f) => a + f.size, 0);

  // group by directory for a readable tree
  const groups = new Map<string, typeof files>();
  for (const f of files) {
    const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : ".";
    groups.set(dir, [...(groups.get(dir) ?? []), f]);
  }
  const dirs = [...groups.keys()].sort((a, b) => (a === "." ? -1 : b === "." ? 1 : a.localeCompare(b)));

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Browse the kit</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {files.length} files, {formatBytes(total)}. Everything here ships in the .zip; read it before you install it.
          </p>
        </div>
        <a href="/api/kit/zip" className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-300">
          Download .zip
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <nav aria-label="Kit files" className="max-h-[75vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
          {dirs.map((dir) => (
            <div key={dir} className="mb-3">
              <div className="px-2 pb-1 font-mono text-[11px] uppercase tracking-wider text-zinc-500">{dir === "." ? "/" : dir + "/"}</div>
              {groups.get(dir)!.map((f) => {
                const name = f.path.split("/").pop()!;
                const active = f.path === current;
                return (
                  <Link
                    key={f.path}
                    href={`/kit?file=${encodeURIComponent(f.path)}`}
                    className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${
                      active ? "bg-emerald-400/15 text-emerald-200" : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <span className="truncate font-mono text-[13px]">{name}</span>
                    <span className="flex-none text-[11px] text-zinc-500">{formatBytes(f.size)}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <article className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3">
            <code className="text-sm text-emerald-300">{current}</code>
            <a
              href={`/api/kit/file?path=${encodeURIComponent(current)}&download=1`}
              className="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Download file
            </a>
          </div>
          <pre className="max-h-[75vh] overflow-auto whitespace-pre-wrap break-words p-4 text-[13px] leading-relaxed text-zinc-300">{shown}</pre>
        </article>
      </div>
    </main>
  );
}
