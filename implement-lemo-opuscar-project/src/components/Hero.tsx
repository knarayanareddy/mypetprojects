import { Bi } from "../lang";
import { GALLERY, REPO, RAW, allStyles } from "../data/styles";
import { Frame } from "./Frame";

export function Hero() {
  const strip = [...allStyles, ...allStyles];
  return (
    <section id="top" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(232,182,74,.22), transparent 70%), radial-gradient(40% 40% at 90% 30%, rgba(190,70,60,.15), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-medium text-gold">
            <span>LemoLab × Claude Opus 5.5</span>
            <span className="opacity-50">·</span>
            <span>MIT</span>
          </div>

          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-gold">43 film styles,</span>
            <br />
            each with a short film made entirely in code.
          </h1>
          <p className="mt-4 font-display text-xl text-cream/70 sm:text-2xl">
            43 种影片风格，每种都配一支完全用代码做出来的短片。
          </p>

          <p className="mx-auto mt-8 max-w-2xl text-base text-cream/80 sm:text-lg">
            <Bi
              en="Pick a style, bring your own story, and let your coding agent direct the film."
              zh="选一个风格，带上你自己的故事，让你的编程 agent 来当导演。"
            />
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href={GALLERY}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-gold/20 transition hover:brightness-110"
            >
              ▶ <Bi inline en="Watch the gallery" zh="看图鉴" />
            </a>
            <a
              href="#styles"
              className="rounded-full border border-line bg-panel px-6 py-3 text-sm font-semibold transition hover:border-gold hover:text-gold"
            >
              <Bi inline en="Browse 43 styles" zh="浏览 43 种风格" />
            </a>
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-cream/80 transition hover:border-gold hover:text-gold"
            >
              GitHub ↗
            </a>
          </div>
        </div>

        {/* New styles */}
        <div className="mx-auto mt-14 max-w-4xl rounded-2xl border border-line bg-panel/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="rounded bg-gold px-2 py-0.5 text-xs font-bold text-black">
              NEW · 新增
            </span>
            {allStyles
              .filter((s) => s.isNew)
              .map((s) => (
                <a
                  key={s.folder}
                  href={`#style-${s.folder}`}
                  className="rounded-full border border-line px-3 py-1 transition hover:border-gold hover:text-gold"
                >
                  {s.en} <span className="opacity-60">{s.zh}</span>
                </a>
              ))}
          </div>
        </div>
      </div>

      {/* Cover + marquee */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <a
          href={`${RAW}/docs/cover.jpg`}
          target="_blank"
          rel="noreferrer"
          className="group relative block overflow-hidden rounded-2xl border border-line"
        >
          <img
            src={`${RAW}/docs/cover.jpg`}
            alt="All styles · 全部风格"
            referrerPolicy="no-referrer"
            className="w-full transition duration-700 group-hover:scale-[1.02]"
            onError={(e) => ((e.currentTarget.parentElement as HTMLElement).style.display = "none")}
          />
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs backdrop-blur">
            All styles · 全部风格
          </span>
        </a>
      </div>

      <div className="relative mt-8 overflow-hidden border-y border-line bg-black py-3">
        <div className="sprockets absolute inset-x-0 top-0 h-2" />
        <div className="sprockets absolute inset-x-0 bottom-0 h-2" />
        <div className="marquee-track flex w-max gap-3 py-2">
          {strip.map((s, i) => (
            <a key={i} href={`#style-${s.folder}`} className="block shrink-0">
              <Frame
                folder={s.folder}
                hue={s.hue}
                label={s.en}
                className="h-28 w-48 rounded-sm opacity-80 transition hover:opacity-100"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
