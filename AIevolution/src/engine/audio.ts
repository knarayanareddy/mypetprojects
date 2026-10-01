// WebAudio band + formant "singer". Everything is generated from the score below — no samples.
// The arrangement EVOLVES with the story: lo-fi bleeps and a pad in the 1960s, drums and bass by the
// 80s/90s, full synth-pop with plucks in the deep-learning era, and a stacked finale.
import { LINES, SONG_END, WIPES, chordAtBar, secAt } from './lyrics';

const BEAT = 60 / 96;
const BAR = BEAT * 4;
const mtof = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Ev {
  t: number;
  k: string;
  [x: string]: unknown;
}

const FORM: Record<string, number[]> = {
  a: [800, 1150, 2900],
  e: [500, 1800, 2600],
  i: [300, 2200, 3000],
  o: [500, 900, 2800],
  u: [350, 800, 2600],
};
function vowelOf(s: string) {
  const t = s.toLowerCase();
  if (t === 'i' || /(ime|imb|ight|ife)$/.test(t)) return 'a';
  if (/ee|ea|ie|y$/.test(t)) return 'i';
  if (/oo|ou|ew|ue|u/.test(t)) return 'u';
  if (/oa|ow|o/.test(t)) return 'o';
  if (/ai|ay|a/.test(t)) return 'a';
  if (/i/.test(t)) return 'e';
  if (/e/.test(t)) return 'e';
  return 'a';
}
const INSCALE = new Set([0, 2, 4, 5, 7, 9, 11]);
const harmOf = (m: number) => (INSCALE.has(((m - 4) % 12 + 12) % 12) ? m - 4 : m - 3);

function build(): Ev[] {
  const ev: Ev[] = [];
  const add = (t: number, k: string, o: Record<string, unknown> = {}) => ev.push({ t, k, ...o });
  const nBars = Math.round(SONG_END / BAR);
  for (let b = 0; b < nBars; b++) {
    const t0 = b * BAR;
    const s = secAt(t0 + 0.01);
    const e = s.e;
    const ch = chordAtBar(b);
    const nextSec = secAt(t0 + BAR + 0.01);
    const isLast = b === nBars - 1;
    const chStart = s.chorus && Math.abs(t0 - s.a) < 0.01;
    add(t0, 'pad', { notes: ch.pad, dur: BAR, v: e === 0 ? 0.9 : e >= 3 ? 0.7 : 0.6 });
    // bass
    if (e === 1) {
      add(t0, 'bass', { n: ch.root, d: 1.1, v: 0.7 });
      add(t0 + 2 * BEAT, 'bass', { n: ch.root, d: 1.1, v: 0.6 });
    } else if (e === 2) {
      [0, 3, 4, 6].forEach((i) => add(t0 + i * BEAT * 0.5, 'bass', { n: ch.root, d: 0.3, v: 0.75 }));
    } else if (e >= 3) {
      [0, 0, 12, 0, 0, 12, 0, 7].forEach((o, i) => add(t0 + i * BEAT * 0.5, 'bass', { n: ch.root + o, d: 0.28, v: 0.8 }));
    }
    // drums
    if (e >= 1) {
      const kb = e === 1 ? [0] : e === 2 ? [0, 2] : [0, 1, 2, 3];
      kb.forEach((i) => add(t0 + i * BEAT, 'kick', { v: e === 1 ? 0.55 : 1 }));
    }
    if (e >= 2) [1, 3].forEach((i) => add(t0 + i * BEAT, 'snare', { v: e === 2 ? 0.6 : 1 }));
    if (e >= 1)
      for (let i = 0; i < 8; i++) {
        if (e === 1 && i % 2 === 0) continue;
        add(t0 + i * BEAT * 0.5, 'hat', { v: i % 2 ? 1 : 0.6, open: e >= 3 && i === 7 });
      }
    if (nextSec.chorus && nextSec !== s && !isLast) {
      for (let k = 0; k < 4; k++) add(t0 + 3 * BEAT + k * BEAT * 0.25, 'snare', { v: 0.5 + k * 0.15 });
    }
    if (chStart) {
      add(t0, 'crash', { v: 1 });
      add(t0, 'bell', { n: ch.pad[2] + 12, v: 1 });
    }
    // arps
    if (e === 1) {
      for (let i = 0; i < 4; i++) add(t0 + i * BEAT, 'bleep', { n: ch.pad[i % 3] + 12, d: 0.22, v: 0.8 });
    } else if (e === 2) {
      [0, 1, 2, 1, 0, 1, 2, 1].forEach((x, i) => add(t0 + i * BEAT * 0.5, 'bleep', { n: ch.pad[x] + 12, d: 0.2, v: 0.7 }));
    } else if (e === 3) {
      [0, 1, 2, 1, 0, 1, 2, 1].forEach((x, i) => add(t0 + i * BEAT * 0.5, 'pluck', { n: ch.pad[x] + 12, v: 0.8 }));
    } else if (e === 4) {
      for (let i = 0; i < 16; i++) add(t0 + i * BEAT * 0.25, 'pluck', { n: ch.pad[[0, 1, 2, 1][i % 4]] + (i % 8 < 4 ? 12 : 24), v: 0.65 });
    }
    // intro sparkle: first computer-ish bells
    if (b < 2) {
      const pent = [72, 76, 79, 81, 84, 88, 91, 93];
      for (let i = 0; i < 8; i++) add(t0 + i * 0.3125, 'bell', { n: pent[(i + b * 3) % 8], v: 0.5 + i * 0.05 });
    }
    // ending
    if (s.name === 'end') {
      if (b === nBars - 2) [0, 1, 2, 3, 4, 5].forEach((i) => add(t0 + i * 0.4, 'bell', { n: [84, 79, 76, 72, 67, 64][i], v: 0.6 }));
      if (isLast) {
        add(t0, 'bell', { n: 84, v: 0.8 });
        add(t0 + 0.3, 'bell', { n: 91, v: 0.6 });
        add(t0 + 0.6, 'bell', { n: 96, v: 0.5 });
      }
    }
  }
  WIPES.forEach((w) => add(w - 0.5, 'whoosh', { d: 1 }));
  add(0.15, 'whoosh', { d: 2.2 });
  add(27.3, 'boom', {});
  add(155.0, 'boom', {});
  add(155.0, 'crash', { v: 1.2 });
  add(159.9, 'whoosh', { d: 0.6 });
  // voice
  for (const l of LINES) {
    for (const sy of l.syl) {
      const d = Math.max(0.14, (sy.b - sy.a) * 0.92);
      add(sy.a, 'vox', { m: sy.midi, d, txt: sy.txt, v: l.chorus ? 1 : 0.9 });
      if (l.harm) add(sy.a, 'vox', { m: harmOf(sy.midi), d, txt: sy.txt, v: 0.5 });
    }
  }
  ev.sort((a, b) => a.t - b.t);
  return ev;
}

export class Engine {
  ctx: AudioContext | null = null;
  events: Ev[] = build();
  idx = 0;
  from = 0;
  startCtx = 0;
  playing = false;
  muted = false;
  timer: number | null = null;
  comp!: DynamicsCompressorNode;
  master!: GainNode;
  rev!: ConvolverNode;
  dest!: MediaStreamAudioDestinationNode;
  noise!: AudioBuffer;
  dry: GainNode | null = null;
  wet: GainNode | null = null;

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const c = new AC();
    this.ctx = c;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.005;
    this.comp.release.value = 0.2;
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    this.dest = c.createMediaStreamDestination();
    this.comp.connect(this.master);
    this.master.connect(c.destination);
    this.master.connect(this.dest);
    // reverb impulse
    const len = Math.floor(c.sampleRate * 2.2);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.rev = c.createConvolver();
    this.rev.buffer = ir;
    const revOut = c.createGain();
    revOut.gain.value = 0.55;
    this.rev.connect(revOut);
    revOut.connect(this.comp);
    // noise
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
  }

  async play(from: number) {
    this.init();
    const c = this.ctx!;
    await c.resume();
    this.stopVoices();
    this.dry = c.createGain();
    this.wet = c.createGain();
    this.dry.connect(this.comp);
    this.wet.connect(this.rev);
    this.from = from;
    this.startCtx = c.currentTime + 0.12;
    this.idx = this.events.findIndex((e) => e.t >= from - 0.04);
    if (this.idx < 0) this.idx = this.events.length;
    this.playing = true;
    this.schedule();
    if (this.timer) clearInterval(this.timer);
    this.timer = window.setInterval(() => this.schedule(), 150);
  }

  stopVoices() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const c = this.ctx;
    if (c && this.dry && this.wet) {
      const d = this.dry;
      const w = this.wet;
      d.gain.setTargetAtTime(0, c.currentTime, 0.015);
      w.gain.setTargetAtTime(0, c.currentTime, 0.015);
      setTimeout(() => {
        try {
          d.disconnect();
          w.disconnect();
        } catch {
          /* noop */
        }
      }, 300);
    }
    this.dry = null;
    this.wet = null;
  }

  pause() {
    if (this.playing) this.from = this.pos();
    this.playing = false;
    this.stopVoices();
  }

  pos() {
    if (!this.playing || !this.ctx) return this.from;
    return Math.max(this.from, this.ctx.currentTime - this.startCtx + this.from);
  }

  schedule() {
    if (!this.playing || !this.ctx) return;
    const now = this.pos();
    while (this.idx < this.events.length && this.events[this.idx].t < now + 2.5) {
      const e = this.events[this.idx++];
      const when = this.startCtx + (e.t - this.from);
      if (when < this.ctx.currentTime - 0.03) continue;
      this.fire(e, when);
    }
  }

  // ---------- voices ----------
  private out(n: AudioNode, wet = 0) {
    if (!this.dry || !this.wet || !this.ctx) return;
    n.connect(this.dry);
    if (wet > 0) {
      const s = this.ctx.createGain();
      s.gain.value = wet;
      n.connect(s);
      s.connect(this.wet);
    }
  }
  private env(gn: GainNode, when: number, a: number, peak: number, dur: number) {
    gn.gain.setValueAtTime(0.0001, when);
    gn.gain.linearRampToValueAtTime(peak, when + a);
    gn.gain.linearRampToValueAtTime(0.0001, when + dur);
  }
  private osc(type: OscillatorType, f: number, when: number, dur: number) {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.start(when);
    o.stop(when + dur + 0.05);
    return o;
  }
  private noiseSrc(when: number, dur: number) {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.start(when, Math.random() * 0.5, dur + 0.05);
    return s;
  }

  fire(e: Ev, when: number) {
    const c = this.ctx!;
    const v = (e.v as number) ?? 1;
    switch (e.k) {
      case 'kick': {
        const o = c.createOscillator();
        const gn = c.createGain();
        o.frequency.setValueAtTime(150, when);
        o.frequency.exponentialRampToValueAtTime(42, when + 0.12);
        gn.gain.setValueAtTime(0.9 * v, when);
        gn.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
        o.connect(gn);
        o.start(when);
        o.stop(when + 0.32);
        this.out(gn);
        break;
      }
      case 'snare': {
        const n = this.noiseSrc(when, 0.2);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1900;
        bp.Q.value = 0.8;
        const gn = c.createGain();
        gn.gain.setValueAtTime(0.38 * v, when);
        gn.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
        n.connect(bp);
        bp.connect(gn);
        this.out(gn, 0.25);
        const o = this.osc('triangle', 190, when, 0.1);
        const g2 = c.createGain();
        g2.gain.setValueAtTime(0.25 * v, when);
        g2.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
        o.connect(g2);
        this.out(g2);
        break;
      }
      case 'hat': {
        const d = e.open ? 0.22 : 0.05;
        const n = this.noiseSrc(when, d);
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7500;
        const gn = c.createGain();
        gn.gain.setValueAtTime(0.1 * v, when);
        gn.gain.exponentialRampToValueAtTime(0.001, when + d);
        n.connect(hp);
        hp.connect(gn);
        this.out(gn);
        break;
      }
      case 'crash': {
        const n = this.noiseSrc(when, 1.6);
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 4500;
        const gn = c.createGain();
        gn.gain.setValueAtTime(0.28 * v, when);
        gn.gain.exponentialRampToValueAtTime(0.001, when + 1.6);
        n.connect(hp);
        hp.connect(gn);
        this.out(gn, 0.4);
        break;
      }
      case 'boom': {
        const o = c.createOscillator();
        const gn = c.createGain();
        o.frequency.setValueAtTime(110, when);
        o.frequency.exponentialRampToValueAtTime(28, when + 0.8);
        gn.gain.setValueAtTime(1, when);
        gn.gain.exponentialRampToValueAtTime(0.001, when + 1.1);
        o.connect(gn);
        o.start(when);
        o.stop(when + 1.2);
        this.out(gn, 0.3);
        break;
      }
      case 'whoosh': {
        const d = (e.d as number) ?? 1;
        const n = this.noiseSrc(when, d);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.5;
        bp.frequency.setValueAtTime(300, when);
        bp.frequency.exponentialRampToValueAtTime(5500, when + d * 0.7);
        const gn = c.createGain();
        this.env(gn, when, d * 0.5, 0.2, d);
        n.connect(bp);
        bp.connect(gn);
        this.out(gn, 0.3);
        break;
      }
      case 'bass': {
        const f = mtof(e.n as number);
        const d = e.d as number;
        const o = this.osc('sawtooth', f, when, d);
        const o2 = this.osc('square', f / 2, when, d);
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(900, when);
        lp.frequency.exponentialRampToValueAtTime(260, when + d);
        const gn = c.createGain();
        this.env(gn, when, 0.01, 0.2 * v, d);
        o.connect(lp);
        o2.connect(lp);
        lp.connect(gn);
        this.out(gn);
        break;
      }
      case 'pad': {
        const notes = e.notes as number[];
        const d = e.dur as number;
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1500;
        const gn = c.createGain();
        gn.gain.setValueAtTime(0.0001, when);
        gn.gain.linearRampToValueAtTime(0.06 * v, when + 0.5);
        gn.gain.setValueAtTime(0.06 * v, when + d - 0.4);
        gn.gain.linearRampToValueAtTime(0.0001, when + d + 0.6);
        for (const n of notes) {
          const f = mtof(n);
          const o1 = this.osc('sawtooth', f, when, d + 0.6);
          o1.detune.value = -8;
          const o2 = this.osc('sawtooth', f, when, d + 0.6);
          o2.detune.value = 8;
          o1.connect(lp);
          o2.connect(lp);
        }
        lp.connect(gn);
        this.out(gn, 0.5);
        break;
      }
      case 'pluck': {
        const f = mtof(e.n as number);
        const o = this.osc('square', f, when, 0.3);
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3600, when);
        lp.frequency.exponentialRampToValueAtTime(500, when + 0.25);
        const gn = c.createGain();
        gn.gain.setValueAtTime(0.1 * v, when);
        gn.gain.exponentialRampToValueAtTime(0.001, when + 0.28);
        o.connect(lp);
        lp.connect(gn);
        this.out(gn, 0.25);
        break;
      }
      case 'bleep': {
        const f = mtof(e.n as number);
        const d = e.d as number;
        const o = this.osc('square', f, when, d);
        const gn = c.createGain();
        this.env(gn, when, 0.005, 0.07 * v, d);
        o.connect(gn);
        this.out(gn, 0.15);
        break;
      }
      case 'bell': {
        const f = mtof(e.n as number);
        const gn = c.createGain();
        gn.gain.setValueAtTime(0.16 * v, when);
        gn.gain.exponentialRampToValueAtTime(0.001, when + 1.6);
        const o = this.osc('sine', f, when, 1.6);
        const o2 = this.osc('sine', f * 2.756, when, 0.6);
        const g2 = c.createGain();
        g2.gain.value = 0.35;
        o.connect(gn);
        o2.connect(g2);
        g2.connect(gn);
        this.out(gn, 0.5);
        break;
      }
      case 'vox': {
        const f = mtof(e.m as number);
        const d = e.d as number;
        const txt = e.txt as string;
        const vow = FORM[vowelOf(txt)];
        const o1 = this.osc('sawtooth', f, when, d + 0.1);
        const o2 = this.osc('sawtooth', f, when, d + 0.1);
        o2.detune.value = 9;
        const src = c.createGain();
        src.gain.value = 0.5;
        o1.connect(src);
        o2.connect(src);
        // vibrato
        const lfo = this.osc('sine', 5.3, when, d + 0.1);
        const lg = c.createGain();
        lg.gain.setValueAtTime(0, when);
        lg.gain.linearRampToValueAtTime(f * 0.011, when + Math.min(0.35, d));
        lfo.connect(lg);
        lg.connect(o1.frequency);
        lg.connect(o2.frequency);
        const mix = c.createGain();
        const wts = [3.2, 2.2, 1.4];
        vow.forEach((fr, i) => {
          const bp = c.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = fr;
          bp.Q.value = 7 + i * 3;
          const fg = c.createGain();
          fg.gain.value = wts[i];
          src.connect(bp);
          bp.connect(fg);
          fg.connect(mix);
        });
        const amp = c.createGain();
        amp.gain.setValueAtTime(0.0001, when);
        amp.gain.linearRampToValueAtTime(0.3 * v, when + 0.035);
        amp.gain.setValueAtTime(0.3 * v, when + Math.max(0.04, d - 0.07));
        amp.gain.linearRampToValueAtTime(0.0001, when + d + 0.06);
        mix.connect(amp);
        this.out(amp, 0.35);
        const first = txt[0]?.toLowerCase() ?? '';
        if ('sfztkpch'.includes(first)) {
          const n = this.noiseSrc(when - 0.01, 0.07);
          const hp = c.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 'sfzh'.includes(first) ? 5000 : 2800;
          const ng = c.createGain();
          ng.gain.setValueAtTime(0.09 * v, when - 0.01);
          ng.gain.exponentialRampToValueAtTime(0.001, when + 0.07);
          n.connect(hp);
          hp.connect(ng);
          this.out(ng, 0.2);
        }
        break;
      }
    }
  }
}
