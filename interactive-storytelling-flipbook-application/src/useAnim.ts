import { useCallback, useEffect, useRef, useState } from 'react';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A float value that can be set directly (dragging) or eased toward a target. */
export function useAnim(initial: number) {
  const [v, setV] = useState(initial);
  const vr = useRef(initial);
  const raf = useRef(0);
  const animating = useRef(false);

  const set = useCallback((x: number) => {
    vr.current = x;
    setV(x);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    animating.current = false;
  }, []);

  const to = useCallback(
    (target: number, dur = 650) => {
      cancelAnimationFrame(raf.current);
      const from = vr.current;
      if (from === target) {
        animating.current = false;
        return;
      }
      if (reduced()) {
        animating.current = false;
        set(target);
        return;
      }
      const t0 = performance.now();
      animating.current = true;
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        set(from + (target - from) * e);
        if (k < 1) raf.current = requestAnimationFrame(step);
        else animating.current = false;
      };
      raf.current = requestAnimationFrame(step);
    },
    [set],
  );

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return { v, vr, set, to, stop, animating };
}

export type Anim = ReturnType<typeof useAnim>;
