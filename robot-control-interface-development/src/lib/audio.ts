export type SoundSpec = { type: "tone"; freq: number } | { type: "hat" } | { type: "snare" } | { type: "kick" } | { type: "click" } | { type: "ding" };

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise(c: AudioContext, dur: number, hp: number, gain: number) {
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start();
}

function osc(c: AudioContext, freq: number, dur: number, gain: number, type: OscillatorType = "sine", sweepTo?: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, c.currentTime + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur);
}

export function play(s: SoundSpec) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  switch (s.type) {
    case "tone":
      osc(c, s.freq, 0.5, 0.18, "triangle");
      break;
    case "hat":
      noise(c, 0.08, 7000, 0.18);
      break;
    case "snare":
      noise(c, 0.18, 1500, 0.22);
      osc(c, 190, 0.1, 0.12, "triangle");
      break;
    case "kick":
      osc(c, 150, 0.22, 0.5, "sine", 40);
      break;
    case "click":
      osc(c, 1400, 0.04, 0.1, "square");
      break;
    case "ding":
      osc(c, 880, 0.6, 0.15, "sine");
      osc(c, 1320, 0.5, 0.08, "sine");
      break;
  }
}
