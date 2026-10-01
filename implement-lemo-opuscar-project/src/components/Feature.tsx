import { useState } from "react";
import { Bi } from "../lang";
import { GALLERY, RAW } from "../data/styles";

const MP4 = "https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/opuscar98.mp4";

export function Feature() {
  const [playing, setPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section id="opuscar98" className="relative scroll-mt-16 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          <span className="h-px w-10 bg-gold" />
          <span>🎬 Feature presentation · 特别放映</span>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-black shadow-2xl shadow-gold/10">
              <div className="sprockets h-2" />
              <div className="relative aspect-video bg-neutral-950">
                {playing && !videoFailed ? (
                  <video
                    src={MP4}
                    controls
                    autoPlay
                    playsInline
                    className="h-full w-full"
                    onError={() => setVideoFailed(true)}
                  />
                ) : (
                  <button
                    onClick={() => setPlaying(true)}
                    className="group absolute inset-0 block w-full"
                    aria-label="Play OPUSCAR 98"
                  >
                    <img
                      src={`${RAW}/docs/opuscar98.jpg`}
                      alt="OPUSCAR 98 — 98 Years of Best Picture"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 bg-black/20 transition group-hover:bg-black/5" />
                    <span className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold text-3xl text-black shadow-xl transition group-hover:scale-110">
                      ▶
                    </span>
                  </button>
                )}
                {playing && videoFailed && (
                  <div className="absolute inset-0 grid place-items-center bg-black/90 p-6 text-center text-sm">
                    <div>
                      <p className="mb-4 text-cream/80">
                        The inline player couldn't load the file. Open it on the gallery instead.
                        <br />
                        <span className="opacity-60">无法在这里播放，请到图鉴页观看。</span>
                      </p>
                      <a
                        href={`${GALLERY}#opuscar98`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-gold px-5 py-2 font-semibold text-black"
                      >
                        ▶ Watch · 观看
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className="sprockets h-2" />
            </div>
          </div>

          <div className="lg:col-span-2">
            <p className="font-mono text-xs text-gold">1927 – 2025 · 6:25</p>
            <h2 className="mt-2 font-display text-5xl font-bold leading-none tracking-tight sm:text-6xl">
              OPUSCAR <span className="text-gold">98</span>
            </h2>
            <p className="mt-3 font-display text-xl italic text-cream/90">
              98 Years of Best Picture
            </p>
            <p className="font-display text-lg text-cream/60">98 年最佳影片 · 1927 – 2025 · 6 分 25 秒</p>

            <div className="mt-6 space-y-4 text-cream/85">
              <p>
                <Bi
                  en="One Clawd walks through all 98 Best Picture winners, each one redrawn in a style that fits the film."
                  zh="一个 Clawd 走过 98 部最佳影片，每一部都换成贴合那部电影的画风。"
                />
              </p>
              <p>
                <Bi
                  en="Every frame, every note and every cut was written in code by Claude Opus 5.5."
                  zh="每一帧画面、每一个音符、每一刀剪辑，都是 Claude Opus 5.5 写代码做出来的。"
                />
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                ["98", "winners · 部影片"],
                ["6:25", "runtime · 时长"],
                ["1080p", "download · 下载"],
              ].map(([n, l]) => (
                <div key={n} className="rounded-xl border border-line bg-panel px-2 py-3">
                  <div className="font-display text-2xl font-bold text-gold">{n}</div>
                  <div className="text-[11px] text-cream/60">{l}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`${GALLERY}#opuscar98`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
              >
                ▶ <Bi inline en="Watch" zh="观看" />
              </a>
              <a
                href={MP4}
                className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold transition hover:border-gold hover:text-gold"
              >
                ⬇ <Bi inline en="Download 1080p" zh="下载" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
