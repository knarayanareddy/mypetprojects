import { useRef, useState, type PointerEvent } from 'react';
import { Page, PW, PH } from './Page';
import { TOTAL_SIDES, type Story } from './types';
import type { Anim } from './useAnim';

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** Phone layout: one page at a time, swipe to turn. `anim.v` is measured in pages (0 - 53). */
export function SinglePager({ story, anim, scale }: { story: Story; anim: Anim; scale: number }) {
  const pos = anim.v;
  const pw = PW * scale;
  const ph = PH * scale;
  const gap = 18;
  const step = pw + gap;
  const drag = useRef<{ startX: number; startPos: number; id: number; moved: boolean; samples: { x: number; t: number }[] } | null>(null);
  const [, force] = useState(0);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    anim.stop();
    drag.current = {
      startX: e.clientX,
      startPos: anim.vr.current,
      id: e.pointerId,
      moved: false,
      samples: [{ x: e.clientX, t: performance.now() }],
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    force((n) => n + 1);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 5) d.moved = true;
    if (!d.moved) return;
    anim.set(clamp(d.startPos - dx / step, 0, TOTAL_SIDES - 1));
    const now = performance.now();
    d.samples.push({ x: e.clientX, t: now });
    while (d.samples.length > 2 && now - d.samples[0].t > 140) d.samples.shift();
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    let target: number;
    if (!d.moved) {
      const half = e.currentTarget.getBoundingClientRect().width / 2;
      const right = e.clientX - e.currentTarget.getBoundingClientRect().left > half;
      target = Math.round(d.startPos) + (right ? 1 : -1);
    } else {
      const f = d.samples[0];
      const l = d.samples[d.samples.length - 1];
      const vx = l.t > f.t ? (l.x - f.x) / (l.t - f.t) : 0;
      const proj = anim.vr.current - (vx * 160) / step;
      target = clamp(Math.round(proj), Math.round(d.startPos) - 1, Math.round(d.startPos) + 1);
    }
    target = clamp(target, 0, TOTAL_SIDES - 1);
    anim.to(target, 260 + 280 * Math.abs(target - anim.vr.current));
    force((n) => n + 1);
  };

  const pages = [];
  const first = Math.max(0, Math.floor(pos) - 1);
  const last = Math.min(TOTAL_SIDES - 1, Math.ceil(pos) + 1);
  for (let i = first; i <= last; i++) {
    const off = i - pos;
    pages.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: pw,
          height: ph,
          marginLeft: -pw / 2,
          transform: `translateX(${off * step}px)`,
          boxShadow: '0 18px 40px -8px rgba(0,0,0,.65)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div style={{ width: PW, height: PH, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <Page story={story} n={i} />
        </div>
      </div>,
    );
  }

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{ position: 'relative', width: '100%', height: ph, touchAction: 'pan-y', userSelect: 'none', overflow: 'hidden' }}
    >
      {pages}
    </div>
  );
}
