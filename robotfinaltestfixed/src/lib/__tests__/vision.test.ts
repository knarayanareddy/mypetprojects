import { describe, expect, it } from "vitest";
import { applyH, fitAndValidate, solveHomography, type Mark, type Pt } from "../vision";

// Deterministic RNG so the numbers in this file are reproducible.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// A deliberately imperfect camera: tilt + perspective, 2.5 px per cm (webcam far from the table),
// so ±1.5 px of click noise is ~0.6 cm per click, the regime the reviewer measured.
const PX = 2.5;
const toPixel = (w: Pt): Pt => {
  const s = 1 / (1 - 0.01 * (w.x - 15));
  return { x: 320 - w.y * PX * s, y: 400 - w.x * PX * s };
};

const TABLE: Pt[] = [
  { x: 12, y: -10 }, { x: 12, y: 10 }, { x: 24, y: -10 }, { x: 24, y: 10 }, // 4 corners
  { x: 18, y: 0 }, { x: 14, y: 4 }, { x: 22, y: -5 }, { x: 16, y: -7 }, // extra fit candidates
];
const HOLDOUT: Pt[] = [{ x: 15, y: -2 }, { x: 20, y: 6 }, { x: 13, y: 8 }, { x: 22, y: 1 }, { x: 18, y: -8 }];

function click(w: Pt, r: () => number, noisePx = 1.5): Pt {
  const p = toPixel(w);
  return { x: p.x + (r() * 2 - 1) * noisePx, y: p.y + (r() * 2 - 1) * noisePx };
}
const mk = (pts: Pt[], r: () => number, role: Mark["role"] = "fit"): Mark[] => pts.map((w, i) => ({ id: `${role}${i}`, px: click(w, r), world: w, role }));
const err = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

describe("homography", () => {
  it("is exact on noise-free data", () => {
    const src = TABLE.map(toPixel);
    const H = solveHomography(src, TABLE)!;
    for (const w of HOLDOUT) expect(err(applyH(H, toPixel(w)), w)).toBeLessThan(1e-6);
  });
  it("rejects collinear marks", () => {
    const pts = [0, 1, 2, 3].map((i) => ({ x: i, y: i }));
    expect(solveHomography(pts, pts)).toBeNull();
  });
});

describe("calibration honesty (reviewer P2)", () => {
  it("4 fit marks: in-sample error ~0 but the report is UNVALIDATED, not 'ok'", () => {
    const r = rng(1);
    const rep = fitAndValidate(mk(TABLE.slice(0, 4), r));
    expect(rep.inSampleRmse!).toBeLessThan(1e-6);
    expect(rep.heldOut).toBeNull();
    expect(rep.status).toBe("unvalidated");
  });

  it("held-out probe error is what is reported, and it matches the true error away from the marks", () => {
    const trials = 200;
    const reported: number[] = [];
    const truth: number[] = [];
    const inSample: number[] = [];
    for (let t = 0; t < trials; t++) {
      const r = rng(100 + t);
      const marks = [...mk(TABLE.slice(0, 4), r), ...mk(HOLDOUT.slice(0, 3), r, "probe")];
      const rep = fitAndValidate(marks);
      reported.push(rep.heldOut!.median);
      inSample.push(rep.inSampleRmse!);
      for (const w of HOLDOUT.slice(3)) truth.push(err(applyH(rep.H!, toPixel(w)), w)); // true noise-free positions
    }
    const rep = median(reported), tru = median(truth), ins = median(inSample);
    console.log(`4-pt fit: in-sample ${ins.toFixed(3)} cm | reported(probe) ${rep.toFixed(2)} cm | true elsewhere ${tru.toFixed(2)} cm`);
    expect(ins).toBeLessThan(1e-6); // proves the old badge was structurally ~0
    expect(tru).toBeGreaterThan(0.2); // real error exists
    // The probe estimate is within a factor of ~2.5 of the real error (probes are noisy clicks too).
    expect(rep).toBeGreaterThan(tru / 2.5);
    expect(rep).toBeLessThan(tru * 2.5);
  });

  it("can actually raise the warning (bad clicks => warn, good clicks => ok)", () => {
    const bad = fitAndValidate([...mk(TABLE.slice(0, 4), rng(5), "fit").map((m) => ({ ...m, px: { x: m.px.x + (m.id === "fit0" ? 40 : 0), y: m.px.y } })), ...mk(HOLDOUT.slice(0, 3), rng(6), "probe")]);
    expect(bad.status).toBe("warn");
    const good = fitAndValidate([...mk(TABLE.slice(0, 6), rng(7), "fit").map((m) => ({ ...m, px: toPixel(m.world) })), ...mk(HOLDOUT.slice(0, 3), rng(8), "probe").map((m) => ({ ...m, px: toPixel(m.world) }))]);
    expect(good.status).toBe("ok");
  });

  it("5+ fit marks use leave-one-out and more marks genuinely help", () => {
    const errAt = (nFit: number) => {
      const all: number[] = [];
      for (let t = 0; t < 200; t++) {
        const r = rng(900 + t);
        const rep = fitAndValidate(mk(TABLE.slice(0, nFit), r));
        if (nFit >= 5) expect(rep.heldOut?.method).toBe("loocv");
        for (const w of HOLDOUT) all.push(err(applyH(rep.H!, toPixel(w)), w));
      }
      return median(all);
    };
    const e4 = errAt(4), e6 = errAt(6);
    console.log(`true median error: 4 marks ${e4.toFixed(2)} cm -> 6 marks ${e6.toFixed(2)} cm`);
    expect(e6).toBeLessThan(e4);
  });
});
