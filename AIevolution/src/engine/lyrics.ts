// Song structure, lyrics (original), syllable timing + melody for "Teaching the Sand to Think".
// 96 BPM, 1 bar = 2.5s.  Lyrics are hyphenated by syllable so the karaoke bar and the synthesized
// singer share exactly the same timing.

export const SONG_END = 172.5;
export const BARLEN = 2.5;

export interface Section {
  name: string;
  a: number;
  b: number;
  e: number; // arrangement energy 0..4 (the music "evolves" through the decades)
  chorus?: boolean;
}
export const SECTIONS: Section[] = [
  { name: 'intro', a: 0, b: 5, e: 0 },
  { name: 'v1', a: 5, b: 27.5, e: 1 },
  { name: 'c1', a: 27.5, b: 40, e: 3, chorus: true },
  { name: 'v2', a: 40, b: 55, e: 2 },
  { name: 'v3', a: 55, b: 70, e: 2 },
  { name: 'c2', a: 70, b: 82.5, e: 3, chorus: true },
  { name: 'v4', a: 82.5, b: 100, e: 2 },
  { name: 'v5', a: 100, b: 120, e: 3 },
  { name: 'c3', a: 120, b: 132.5, e: 3, chorus: true },
  { name: 'v6', a: 132.5, b: 147.5, e: 3 },
  { name: 'c4', a: 147.5, b: 160, e: 4, chorus: true },
  { name: 'outro', a: 160, b: 167.5, e: 1 },
  { name: 'end', a: 167.5, b: 172.5, e: 0 },
];
export const CHORUS_STARTS = [27.5, 70, 120, 147.5];
export const WIPES = [5, 40, 55, 70, 82.5, 100, 120, 132.5, 147.5, 160];

export const secAt = (t: number) => SECTIONS.find((s) => t >= s.a && t < s.b) ?? SECTIONS[SECTIONS.length - 1];

// ---- chords ----
export interface Chord {
  name: string;
  root: number; // bass midi
  pad: number[];
  pcs: number[];
}
const CH: Record<string, Chord> = {
  Am: { name: 'Am', root: 45, pad: [57, 60, 64], pcs: [9, 0, 4] },
  F: { name: 'F', root: 41, pad: [53, 57, 60], pcs: [5, 9, 0] },
  C: { name: 'C', root: 48, pad: [55, 60, 64], pcs: [0, 4, 7] },
  G: { name: 'G', root: 43, pad: [55, 59, 62], pcs: [7, 11, 2] },
};
const VERSE = ['Am', 'F', 'C', 'G'];
const CHOR = ['C', 'G', 'Am', 'F'];
export function chordAtBar(bar: number): Chord {
  const t = bar * BARLEN + 0.01;
  const s = secAt(t);
  if (s.chorus) return CH[CHOR[(bar - Math.round(s.a / BARLEN)) % 4]];
  if (s.name === 'end') return bar === 68 ? CH.C : CH.C;
  if (s.name === 'outro' && bar >= 66) return bar === 66 ? CH.C : CH.C;
  return CH[VERSE[bar % 4]];
}
export const chordAt = (t: number) => chordAtBar(Math.floor(t / BARLEN));

// ---- melody ----
const SCALE = [0, 2, 4, 5, 7, 9, 11];
export const degToMidi = (d: number) => 60 + SCALE[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);

export interface Syl {
  txt: string;
  a: number;
  b: number;
  midi: number;
  ci: number; // char index in display text
  len: number;
  wordEnd: boolean;
}
export interface Line {
  a: number;
  b: number;
  text: string;
  syl: Syl[];
  chorus: boolean;
  harm: boolean;
}

type Raw = [number, number, string, number[]?, boolean?];

const CHORUS_REL: [number, number][] = [
  [0, 2.9],
  [3.1, 6.0],
  [6.2, 9.1],
  [9.3, 12.4],
];
const CHORUS_TXT = ['We\u2019re teach-ing the sand to think,', 'one lit-tle spark at a time,', 'up and up the num-bers climb,', 'teach-ing the sand to think!'];
const CHORUS_TXT_FINAL = ['We\u2019re teach-ing the sand to think,', 'one lit-tle spark at a time,', 'up and up the num-bers climb,', 'teach-ing the sand to think, to-geth-er!'];
const CHORUS_DEG = [
  [4, 7, 7, 8, 7, 5, 4],
  [4, 5, 7, 8, 7, 5, 4],
  [5, 7, 8, 9, 8, 7, 5],
  [9, 8, 9, 8, 5, 7],
];
const CHORUS_DEG_FINAL = [...CHORUS_DEG.slice(0, 3), [9, 8, 9, 8, 5, 7, 4, 5, 7]];

const RAW: Raw[] = [
  // verse 1 — 1956..1968
  [5.2, 9.8, 'Fif-ty-six, a sum-mer of dream-ers'],
  [10.2, 14.8, 'Then E-li-za asks me how I feel'],
  [15.2, 19.8, 'Shak-ey rolls and the per-cep-trons blink'],
  [20.2, 25.6, 'Hal is watch-ing, calm and red'],
  // verse 2 — winters
  [40.2, 44.8, 'Sev-en-ty-four, the mon-ey ran dry'],
  [45.2, 49.8, 'Rules in a box, if this, then that'],
  [50.2, 54.8, 'Win-ter a-gain, but a seed lies deep'],
  // verse 3 — 90s..2011
  [55.2, 59.8, 'Deep Blue moves, the cham-pi-on stares'],
  [60.2, 64.8, 'Cars cross des-erts, Room-bas roam'],
  [65.2, 69.8, 'Wat-son wins the quiz show crown'],
  // verse 4 — deep learning
  [82.7, 87.3, 'Twen-ty-twelve, the pic-tures see'],
  [87.7, 92.3, 'Move thir-ty-sev-en, no one knew'],
  [92.7, 99.6, 'Fak-ers and cri-tics, deep-er and deep-er'],
  // verse 5 — attention
  [100.2, 104.8, 'At-ten-tion is all you need'],
  [105.2, 109.8, 'Read the whole wide web in a day'],
  [110.2, 114.8, 'Paint with words from noise and light'],
  [115.2, 119.8, 'Hel-lo world, a hun-dred mil-lion friends'],
  // verse 6 — now
  [132.7, 137.3, 'Eyes and ears and hands that help'],
  [137.7, 142.3, 'Fold-ing pro-teins, find-ing cures'],
  [142.7, 147.3, 'What comes next, we\u2019ll write to-geth-er'],
  // outro
  [160.4, 166.0, 'Six-ty years and just be-gin-ning'],
  [166.4, 171.6, 'Take a bow, now pass it on'],
];

function seeded(i: number) {
  const x = Math.sin(i * 91.3 + 17.7) * 43758.5;
  return x - Math.floor(x);
}

function layout(a: number, b: number, text: string, degs: number[] | undefined, chorus: boolean, lineIdx: number, last?: boolean): Line {
  const words = text.split(' ').map((w) => w.split('-'));
  const flat: { txt: string; wordEnd: boolean; word: number }[] = [];
  words.forEach((w, wi) => w.forEach((s, si) => flat.push({ txt: s, wordEnd: si === w.length - 1, word: wi })));
  const n = flat.length;
  const weights = flat.map((s, i) => (i === n - 1 ? 2.6 : s.wordEnd ? 1.25 : 1));
  const total = weights.reduce((x, y) => x + y, 0);
  const t0 = a;
  const span = b - a;
  let acc = 0;
  let ci = 0;
  const syl: Syl[] = [];
  let prev = 4;
  const display = words.map((w) => w.join('')).join(' ');
  flat.forEach((s, i) => {
    const sa = t0 + (acc / total) * span;
    acc += weights[i];
    const sb = t0 + (acc / total) * span;
    // char index
    let deg: number;
    if (degs) deg = degs[Math.min(i, degs.length - 1)];
    else {
      const r = seeded(lineIdx * 31 + i);
      const arch = Math.sin((i / Math.max(1, n - 1)) * Math.PI);
      const step = Math.round((r - 0.5) * 4 + (arch - 0.4) * 1.2);
      deg = Math.max(2, Math.min(9, prev + step));
      // snap stressed syllables to chord tones
      if (s.wordEnd || i === n - 1) {
        const ch = chordAt(sa);
        let best = deg;
        let bd = 99;
        for (let d = deg - 2; d <= deg + 2; d++) {
          if (ch.pcs.includes(degToMidi(d) % 12) && Math.abs(d - deg) < bd) {
            bd = Math.abs(d - deg);
            best = d;
          }
        }
        deg = best;
      }
      if (i === n - 1) deg = last ? 7 : deg;
    }
    prev = deg;
    syl.push({ txt: s.txt, a: sa, b: sb, midi: degToMidi(deg), ci, len: s.txt.length, wordEnd: s.wordEnd });
    ci += s.txt.length + (s.wordEnd && i !== n - 1 ? 1 : 0);
  });
  return { a, b, text: display, syl, chorus, harm: chorus };
}

export const LINES: Line[] = (() => {
  const out: Line[] = [];
  RAW.forEach((r, i) => out.push(layout(r[0], r[1], r[2], r[3], false, i, i === RAW.length - 1)));
  CHORUS_STARTS.forEach((cs, ci) => {
    const txt = ci === 3 ? CHORUS_TXT_FINAL : CHORUS_TXT;
    const deg = ci === 3 ? CHORUS_DEG_FINAL : CHORUS_DEG;
    txt.forEach((t, li) => out.push(layout(cs + CHORUS_REL[li][0], cs + CHORUS_REL[li][1], t, deg[li], true, 100 + li)));
  });
  return out.sort((x, y) => x.a - y.a);
})();

export function lineAt(t: number): Line | null {
  let r: Line | null = null;
  for (const l of LINES) if (t >= l.a - 0.15 && t <= l.b + 0.5) r = l;
  return r;
}
