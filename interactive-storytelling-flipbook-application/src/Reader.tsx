import { useEffect, useState, type ReactNode } from 'react';
import { Flipbook } from './Flipbook';
import { SinglePager } from './SinglePager';
import { PH, PW, plainTitle } from './Page';
import { CONTENT_PAGES, LEAVES, TOTAL_SIDES, type Story } from './types';
import { useAnim } from './useAnim';

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

function useViewport() {
  const [s, setS] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setS({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return s;
}

export function Reader({ story, onClose }: { story: Story; onClose: () => void }) {
  const vp = useViewport();
  const single = vp.w < 820;
  return <ReaderInner key={single ? 's' : 'd'} story={story} onClose={onClose} single={single} vw={vp.w} vh={vp.h} />;
}

function Btn({ children, onClick, disabled, label, active }: { children: ReactNode; onClick: () => void; disabled?: boolean; label: string; active?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={
        'flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm transition disabled:opacity-30 ' +
        (active
          ? 'border-amber-300/70 bg-amber-200/20 text-amber-100'
          : 'border-white/15 bg-white/5 text-amber-50/90 hover:bg-white/15')
      }
    >
      {children}
    </button>
  );
}

function ReaderInner({ story, onClose, single, vw, vh }: { story: Story; onClose: () => void; single: boolean; vw: number; vh: number }) {
  const anim = useAnim(0);
  const max = single ? TOTAL_SIDES - 1 : LEAVES;
  const [lensOn, setLensOn] = useState(true);
  const [toc, setToc] = useState(false);

  const pos = anim.v;
  const p = Math.round(pos);

  // open the cover shortly after arriving
  useEffect(() => {
    const id = setTimeout(() => anim.to(1, 1000), 650);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (target: number, dur?: number) => {
    const t = clamp(target, 0, max);
    const dist = Math.abs(t - anim.vr.current);
    anim.to(t, dur ?? Math.min(1500, 520 + Math.max(0, dist - 1) * 110));
  };
  const step = (dir: number) => {
    if (anim.animating.current) {
      // queue relative to the current target by snapping forward
      anim.stop();
      const r = Math.round(anim.vr.current);
      anim.set(r);
      go(r + dir, 600);
      return;
    }
    go(Math.round(anim.vr.current) + dir, 700);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') step(1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') step(-1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(max);
      else if (e.key === 'Escape') {
        if (toc) setToc(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // layout
  const availH = vh - (single ? 168 : 176);
  const scale = single
    ? Math.min((vw - 28) / PW, availH / PH, 1.5)
    : Math.min((vw - 72) / (2 * PW + 40), availH / (PH + 24), 1.8);

  // labels
  const curPage = single ? clamp(p, 1, CONTENT_PAGES) : p === 0 ? 1 : Math.min(CONTENT_PAGES, 2 * p - 1);
  let part = story.parts[0][1];
  for (const [start, name] of story.parts) if (start <= curPage) part = name;
  let label: string;
  if (single) {
    label = p === 0 ? 'Cover' : p === TOTAL_SIDES - 1 ? 'Back cover' : `Page ${p} of ${CONTENT_PAGES}`;
  } else if (p === 0) label = 'Cover';
  else if (p === LEAVES) label = 'Back cover';
  else if (p === LEAVES - 1) label = `Pages ${2 * p - 1}–${CONTENT_PAGES} of ${CONTENT_PAGES}`;
  else label = `Pages ${2 * p - 1}–${2 * p} of ${CONTENT_PAGES}`;

  const jumpToPage = (n: number) => {
    setToc(false);
    go(single ? n : Math.ceil(n / 2), 1300);
  };

  return (
    <div className="desk fixed inset-0 flex flex-col">
      {/* header */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
        <button
          onClick={onClose}
          className="flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-amber-50/90 transition hover:bg-white/15"
        >
          <span aria-hidden>←</span> Shelf
        </button>
        <div className="min-w-0 text-center">
          <div className="truncate text-[22px] leading-none text-amber-50" style={{ fontFamily: 'var(--display)' }}>
            {plainTitle(story)}
          </div>
          <div className="mt-1 truncate text-[11px] uppercase tracking-[0.28em] text-amber-200/60">{part}</div>
        </div>
        <div className="flex gap-2">
          {!single && (
            <Btn label={lensOn ? 'Hide magnifier' : 'Show magnifier'} onClick={() => setLensOn((v) => !v)} active={lensOn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="10" cy="10" r="6" />
                <path d="M15 15l6 6" />
              </svg>
            </Btn>
          )}
          <Btn label="Contents" onClick={() => setToc(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </Btn>
        </div>
      </header>

      {/* book */}
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        {single ? (
          <SinglePager story={story} anim={anim} scale={scale} />
        ) : (
          <Flipbook story={story} anim={anim} scale={scale} lensOn={lensOn} />
        )}
      </main>

      {/* footer */}
      <footer className="shrink-0 px-4 pb-4 pt-2 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Btn label="Previous page" onClick={() => step(-1)} disabled={p <= 0}>
            <span aria-hidden>‹</span>
          </Btn>
          <input
            className="seek min-w-0 flex-1"
            type="range"
            min={0}
            max={max}
            step={1}
            value={p}
            aria-label="Go to page"
            onChange={(e) => go(Number(e.target.value))}
          />
          <Btn label="Next page" onClick={() => step(1)} disabled={p >= max}>
            <span aria-hidden>›</span>
          </Btn>
        </div>
        <div className="mt-2 text-center text-[12px] tracking-wide text-amber-100/60">
          {label}
          <span className="hidden sm:inline"> · drag a page to turn it · ← → keys work too</span>
          <span className="sm:hidden"> · swipe to turn</span>
        </div>
      </footer>

      {/* contents */}
      {toc && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/55 backdrop-blur-sm" onClick={() => setToc(false)}>
          <aside
            className="scroll-thin h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#1d1611] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-amber-200/60">Contents</div>
                <div className="mt-1 text-3xl text-amber-50" style={{ fontFamily: 'var(--display)' }}>
                  {plainTitle(story)}
                </div>
              </div>
              <Btn label="Close contents" onClick={() => setToc(false)}>
                ✕
              </Btn>
            </div>
            {story.parts.map(([start, name], pi) => {
              const end = (story.parts[pi + 1]?.[0] ?? CONTENT_PAGES + 1) - 1;
              return (
                <section key={name} className="mb-6">
                  <h3 className="mb-2 flex items-baseline justify-between border-b border-white/10 pb-1 text-lg text-amber-200" style={{ fontFamily: 'var(--display)' }}>
                    <span>
                      <span className="mr-2 text-amber-200/50">{['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][pi]}.</span>
                      {name}
                    </span>
                    <span className="text-xs text-amber-100/40">
                      pp. {start}–{end}
                    </span>
                  </h3>
                  <ul>
                    {story.pages.slice(start - 1, end).map((e, i) => (
                      <li key={start + i}>
                        <button
                          onClick={() => jumpToPage(start + i)}
                          className="flex w-full items-baseline gap-3 rounded px-2 py-1 text-left text-[15px] text-amber-50/85 transition hover:bg-white/10"
                        >
                          <span className="w-6 shrink-0 text-right text-xs text-amber-100/40">{start + i}</span>
                          <span className="truncate">{e[1]}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </aside>
        </div>
      )}
    </div>
  );
}
