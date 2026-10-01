"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/explode", label: "Exploded view" },
  { href: "/build", label: "Build & setup" },
  { href: "/playground", label: "Playground" },
  { href: "/models", label: "Model hub" },
  { href: "/control", label: "Control center" },
  { href: "/strategy", label: "Hackathon strategy" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#070a12]/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#ff7a1a] text-sm text-slate-900">S</span>
          <span>
            SO-101 <span className="text-[#ff7a1a]">Command Deck</span>
          </span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 transition ${path === l.href ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
