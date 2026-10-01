import { useLang, type Lang } from "../lang";
import { REPO } from "../data/styles";
import { cn } from "../utils/cn";

const links = [
  { href: "#opuscar98", en: "Feature", zh: "特别放映" },
  { href: "#about", en: "About", zh: "关于" },
  { href: "#how", en: "How to use", zh: "怎么用" },
  { href: "#styles", en: "Styles", zh: "风格" },
  { href: "#licence", en: "Licence", zh: "授权" },
];

export function Header() {
  const { lang, setLang } = useLang();
  const opts: { v: Lang; label: string }[] = [
    { v: "both", label: "EN+中" },
    { v: "en", label: "EN" },
    { v: "zh", label: "中" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-gold text-lg text-black">🎬</span>
          <span className="font-display text-lg font-bold tracking-tight">
            OPUS<span className="text-gold">CAR</span>
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm text-cream/70 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition hover:text-gold">
              {lang === "zh" ? l.zh : l.en}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-line bg-panel p-0.5 text-xs font-medium">
            {opts.map((o) => (
              <button
                key={o.v}
                onClick={() => setLang(o.v)}
                className={cn(
                  "rounded-full px-3 py-1 transition",
                  lang === o.v ? "bg-gold text-black" : "text-cream/70 hover:text-cream"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full border border-line px-3 py-1.5 text-xs font-medium text-cream/80 transition hover:border-gold hover:text-gold sm:block"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </header>
  );
}
