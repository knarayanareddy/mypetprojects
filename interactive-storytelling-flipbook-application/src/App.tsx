import { useState } from 'react';
import { Cover, PH, PW } from './Page';
import { Reader } from './Reader';
import { STORIES } from './stories';
import type { Story } from './types';

function ShelfBook({ story, index, onOpen }: { story: Story; index: number; onOpen: () => void }) {
  const s = 0.5;
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col items-center gap-5 text-left outline-none"
      aria-label={`Open ${story.title.replace('\n', ' ')}`}
    >
      <div style={{ perspective: 1200 }}>
        <div
          className="relative transition-transform duration-500 ease-out group-hover:-translate-y-3 group-focus-visible:-translate-y-3"
          style={{
            width: PW * s,
            height: PH * s,
            transformStyle: 'preserve-3d',
            transform: 'rotateY(-14deg) rotateX(2deg)',
          }}
        >
          {/* page block */}
          <div
            style={{
              position: 'absolute',
              left: 6,
              top: 5,
              width: PW * s,
              height: PH * s - 10,
              background: 'repeating-linear-gradient(to bottom, #efe6d0 0 1px, #cdbf9f 1px 2px)',
              transform: 'translateZ(-14px) translateX(9px)',
              borderRadius: 3,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              boxShadow: '0 30px 40px -12px rgba(0,0,0,.7), 10px 0 0 -2px rgba(0,0,0,.25)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div style={{ width: PW, height: PH, transform: `scale(${s})`, transformOrigin: '0 0' }}>
              <Cover story={story} />
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(115deg, rgba(255,255,255,.18), transparent 35%, transparent 70%, rgba(0,0,0,.25))',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      </div>
      <div className="max-w-[260px] text-center">
        <div className="text-[11px] uppercase tracking-[0.28em] text-amber-200/55">Volume {['I', 'II', 'III', 'IV', 'V', 'VI'][index]}</div>
        <p className="mt-2 text-[15px] leading-snug text-amber-50/75">{story.blurb}</p>
        <span className="mt-3 inline-block rounded-full border border-amber-200/30 px-4 py-1.5 text-[13px] text-amber-100 transition group-hover:bg-amber-200/15">
          Open sketchbook →
        </span>
      </div>
    </button>
  );
}

export default function App() {
  const [open, setOpen] = useState<Story | null>(null);

  if (open) return <Reader story={open} onClose={() => setOpen(null)} />;

  return (
    <div className="desk fixed inset-0 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-14 sm:pt-20">
        <header className="mx-auto max-w-2xl text-center">
          <div className="kick text-amber-200/80" style={{ fontSize: 24 }}>
            six stories · fifty-two plates each
          </div>
          <h1 className="mt-3 text-6xl leading-[0.95] text-amber-50 sm:text-7xl" style={{ fontFamily: 'var(--display)' }}>
            The Sketch Shelf
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-amber-50/70">
            Pick a cloth-bound sketchbook from the desk. Drag a page and it bends like paper. Then drag the brass
            magnifier across the ink to read it up close.
          </p>
        </header>

        <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-20 sm:grid-cols-2 lg:grid-cols-3">
          {STORIES.map((s, i) => (
            <div key={s.id} className="flex justify-center">
              <ShelfBook story={s} index={i} onOpen={() => setOpen(s)} />
            </div>
          ))}
        </div>

        <footer className="mt-24 text-center text-sm text-amber-100/40">
          Hand-inked with code · every plate is drawn procedurally in watercolour and pencil.
        </footer>
      </div>
    </div>
  );
}
