import Link from "next/link";

const links = [
  { href: "/#install", label: "Install" },
  { href: "/#pipeline", label: "Method" },
  { href: "/playground", label: "Playground" },
  { href: "/kit", label: "Browse kit" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-zinc-50">
          <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/70">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Demand Radar
          <span className="ml-1 rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
            portable
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm text-zinc-400">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded px-2.5 py-1.5 hover:bg-zinc-800 hover:text-zinc-100">
              {l.label}
            </Link>
          ))}
          <a
            href="/api/kit/zip"
            className="ml-2 rounded bg-emerald-400 px-3 py-1.5 font-medium text-zinc-950 hover:bg-emerald-300"
          >
            Download .zip
          </a>
        </nav>
      </div>
    </header>
  );
}
