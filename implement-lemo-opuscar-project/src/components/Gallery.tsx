import { useEffect, useMemo, useState } from "react";
import { Bi, useLang } from "../lang";
import { REPO, allStyles, categories } from "../data/styles";
import { Frame } from "./Frame";
import { cn } from "../utils/cn";

type Item = (typeof allStyles)[number];

function StyleModal({
  item,
  onClose,
  onNav,
}: {
  item: Item;
  onClose: () => void;
  onNav: (d: number) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const index = allStyles.findIndex((s) => s.folder === item.folder);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav(1);
      if (e.key === "ArrowLeft") onNav(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onNav]);

  const promptEn = `Make a 45-second film in the ${item.en.toLowerCase()} style about ...`;
  const promptZh = `用${item.zh}风格做一支 45 秒的片子，讲……`;

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  const styleUrl = `${REPO}/blob/main/styles/${item.folder}/STYLE.md`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="pop scroll-thin relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-line bg-panel shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-lg backdrop-blur transition hover:bg-gold hover:text-black"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="relative">
          <Frame folder={item.folder} hue={item.hue} label={item.en} className="aspect-video w-full" eager />
          <button
            onClick={() => onNav(-1)}
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-xl backdrop-blur transition hover:bg-gold hover:text-black"
            aria-label="Previous style"
          >
            ‹
          </button>
          <button
            onClick={() => onNav(1)}
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-xl backdrop-blur transition hover:bg-gold hover:text-black"
            aria-label="Next style"
          >
            ›
          </button>
          <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 font-mono text-xs backdrop-blur">
            {String(index + 1).padStart(2, "0")} / {allStyles.length}
          </span>
        </div>

        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-5">
          <div className="md:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {item.category.icon} {item.category.en} · {item.category.zh}
              {item.isNew && <span className="ml-2 rounded bg-gold px-1.5 py-0.5 text-[10px] text-black">NEW 新增</span>}
            </p>
            <h3 className="mt-2 font-display text-3xl font-bold tracking-tight">{item.en}</h3>
            <p className="font-display text-xl text-cream/60">{item.zh}</p>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex gap-4 border-t border-line pt-3">
                <dt className="w-28 shrink-0 text-cream/50">Our demo · 样片</dt>
                <dd className="font-display text-base italic">{item.demo}</dd>
              </div>
              <div className="flex gap-4 border-t border-line pt-3">
                <dt className="w-28 shrink-0 text-cream/50">Folder · 文件夹</dt>
                <dd className="font-mono text-gold">styles/{item.folder}/</dd>
              </div>
              <div className="flex gap-4 border-t border-line pt-3">
                <dt className="w-28 shrink-0 text-cream/50">Style prompt</dt>
                <dd>
                  <a className="text-gold hover:underline" href={styleUrl} target="_blank" rel="noreferrer">
                    STYLE.md ↗
                  </a>
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={styleUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
              >
                <Bi inline en="Read STYLE.md" zh="看 STYLE.md" />
              </a>
              <a
                href={`${REPO}/tree/main/styles/${item.folder}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold transition hover:border-gold hover:text-gold"
              >
                <Bi inline en="Open folder" zh="打开文件夹" />
              </a>
            </div>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/50">Try it · 试试看</p>
            <p className="mt-2 text-sm text-cream/80">
              <Bi
                en="Name the style, bring your own story:"
                zh="说出风格名，带上你自己的故事："
              />
            </p>
            {[
              { k: "en", t: promptEn },
              { k: "zh", t: promptZh },
            ].map((p) => (
              <button
                key={p.k}
                onClick={() => copy(p.t, p.k)}
                className="mt-3 block w-full rounded-xl border border-line bg-black p-4 text-left text-sm text-cream/90 transition hover:border-gold"
              >
                <span className="font-display italic">“{p.t}”</span>
                <span className="mt-2 block text-xs text-gold">
                  {copied === p.k ? "Copied ✓ 已复制" : "Click to copy · 点击复制"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Gallery() {
  const { lang } = useLang();
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allStyles.filter((s) => {
      if (cat !== "all" && s.category.id !== cat) return false;
      if (!needle) return true;
      return [s.en, s.zh, s.folder, s.demo].some((t) => t.toLowerCase().includes(needle));
    });
  }, [cat, q]);

  const grouped = categories
    .map((c) => ({ c, items: filtered.filter((s) => s.category.id === c.id) }))
    .filter((g) => g.items.length);

  const current = open ? allStyles.find((s) => s.folder === open) : null;

  const nav = (d: number) => {
    if (!open) return;
    const i = allStyles.findIndex((s) => s.folder === open);
    setOpen(allStyles[(i + d + allStyles.length) % allStyles.length].folder);
  };

  // deep links like #style-ukiyoe
  useEffect(() => {
    const check = () => {
      const m = window.location.hash.match(/^#style-(.+)$/);
      if (m && allStyles.some((s) => s.folder === m[1])) setOpen(m[1]);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  const close = () => {
    setOpen(null);
    if (window.location.hash.startsWith("#style-")) {
      history.replaceState(null, "", "#styles");
    }
  };

  return (
    <section id="styles" className="scroll-mt-16 border-t border-line bg-panel/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          <span className="h-px w-10 bg-gold" />
          <span>The styles · 风格</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Style index <span className="text-cream/50">· 风格索引</span>
            </h2>
            <p className="mt-3 max-w-2xl text-cream/80">
              <Bi
                en="Users may name a style in English, in Chinese, or by its folder. Click a frame for its STYLE.md."
                zh="用户可能用英文名、中文名或文件夹名来指定风格。点图片看它的 STYLE.md。"
              />
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "zh" ? "搜索风格、样片、文件夹…" : "Search style, demo, folder… 搜索"}
              className="w-full rounded-full border border-line bg-ink px-5 py-3 pr-10 text-sm outline-none transition placeholder:text-cream/40 focus:border-gold"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/50 hover:text-gold"
                aria-label="Clear"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div className="scroll-thin -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          <button
            onClick={() => setCat("all")}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm transition",
              cat === "all" ? "border-gold bg-gold text-black" : "border-line bg-ink hover:border-gold"
            )}
          >
            All · 全部 <span className="ml-1 opacity-60">{allStyles.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm transition",
                cat === c.id ? "border-gold bg-gold text-black" : "border-line bg-ink hover:border-gold"
              )}
            >
              {c.icon} {lang === "zh" ? c.zh : lang === "en" ? c.en : `${c.en} · ${c.zh}`}
              <span className="ml-1.5 opacity-60">{c.styles.length}</span>
            </button>
          ))}
        </div>

        {grouped.length === 0 && (
          <div className="mt-16 text-center text-cream/60">
            No styles match “{q}”. · 没有匹配的风格。
          </div>
        )}

        <div className="mt-10 space-y-14">
          {grouped.map(({ c, items }) => (
            <div key={c.id}>
              <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-3">
                <span className="text-2xl">{c.icon}</span>
                <h3 className="font-display text-2xl font-bold">{c.en}</h3>
                <span className="font-display text-lg text-cream/50">{c.zh}</span>
                <span className="ml-auto font-mono text-xs text-cream/40">{items.length}</span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <button
                    id={`card-${s.folder}`}
                    key={s.folder}
                    onClick={() => {
                      setOpen(s.folder);
                      history.replaceState(null, "", `#style-${s.folder}`);
                    }}
                    className="fade-up group overflow-hidden rounded-xl border border-line bg-ink text-left transition hover:-translate-y-1 hover:border-gold/70 hover:shadow-xl hover:shadow-gold/10"
                  >
                    <div className="relative">
                      <Frame
                        folder={s.folder}
                        hue={s.hue}
                        label={s.en}
                        className="aspect-video w-full transition duration-500 group-hover:scale-[1.03]"
                      />
                      {s.isNew && (
                        <span className="absolute left-3 top-3 rounded bg-gold px-2 py-0.5 text-[10px] font-bold text-black">
                          NEW · 新增
                        </span>
                      )}
                      <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-sm opacity-0 backdrop-blur transition group-hover:opacity-100">
                        ↗
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-display text-lg font-bold leading-tight">
                            {lang === "zh" ? s.zh : s.en}
                          </h4>
                          {lang === "both" && <p className="mt-0.5 text-sm text-cream/60">{s.zh}</p>}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs">
                        <span className="truncate font-display italic text-cream/80">▶ {s.demo}</span>
                        <code className="shrink-0 font-mono text-gold/80">{s.folder}</code>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {current && <StyleModal item={current} onClose={close} onNav={nav} />}
    </section>
  );
}
