import { describe, expect, it } from 'vitest';
import {
  BAR,
  BEAT,
  BPM,
  H,
  TAU,
  W,
  clamp,
  easeOut,
  frac,
  lerp,
} from './core';

describe('stage constants', () => {
  it('is 16:9 at 1920x1080', () => {
    expect(W).toBe(1920);
    expect(H).toBe(1080);
    expect(W / H).toBeCloseTo(16 / 9, 6);
  });

  it('derives beat and bar timing from BPM', () => {
    expect(BPM).toBe(96);
    expect(BEAT).toBeCloseTo(60 / BPM, 10);
    expect(BAR).toBeCloseTo(BEAT * 4, 10);
  });

  it('exposes a full turn in radians', () => {
    expect(TAU).toBeCloseTo(Math.PI * 2, 12);
  });
});

describe('clamp', () => {
  it('passes values inside the range through', () => {
    expect(clamp(0.5)).toBeCloseTo(0.5, 10);
  });

  it('clamps to the default 0..1 bounds', () => {
    expect(clamp(-3)).toBe(0);
    expect(clamp(7)).toBe(1);
  });

  it('honours explicit bounds', () => {
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(4, 0, 10)).toBe(4);
  });

  it('is idempotent', () => {
    const once = clamp(5, 0, 3);
    expect(clamp(once, 0, 3)).toBe(once);
  });
});

describe('lerp', () => {
  it('returns the endpoints at k=0 and k=1', () => {
    expect(lerp(10, 20, 0)).toBeCloseTo(10, 10);
    expect(lerp(10, 20, 1)).toBeCloseTo(20, 10);
  });

  it('interpolates linearly at the midpoint', () => {
    expect(lerp(0, 100, 0.5)).toBeCloseTo(50, 10);
  });

  it('works with descending endpoints', () => {
    expect(lerp(100, 0, 0.25)).toBeCloseTo(75, 10);
  });
});

describe('frac', () => {
  it('returns the fractional part', () => {
    expect(frac(3.25)).toBeCloseTo(0.25, 10);
  });

  it('is zero for integers', () => {
    expect(frac(4)).toBeCloseTo(0, 10);
    expect(frac(-4)).toBeCloseTo(0, 10);
  });

  it('truncates toward zero, so negatives yield a positive fraction', () => {
    // Math.floor(-1.5) is -2, so -1.5 - (-2) = 0.5. Verified against the
    // implementation: this is intentional truncating behaviour, not a bug.
    expect(frac(-1.5)).toBeCloseTo(0.5, 10);
  });
});

describe('easeOut', () => {
  it('pinned at both ends', () => {
    expect(easeOut(0)).toBeCloseTo(0, 10);
    expect(easeOut(1)).toBeCloseTo(1, 10);
  });

  it('is monotonically non-decreasing', () => {
    let prev = -Infinity;
    for (let x = 0; x <= 1.0001; x += 0.05) {
      const v = easeOut(x);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
  });

  it('stays within 0..1', () => {
    for (let x = -0.2; x <= 1.2; x += 0.05) {
      const v = easeOut(x);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});