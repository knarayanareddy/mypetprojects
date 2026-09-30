import type { Season } from "./layout";

export interface AudioMood {
  daylight: number;
  night: number;
  snow: number;
  season: Season;
  pond: number;
  courtyard: number;
  inside: number;
}

/** Garden ambience synthesized with Web Audio. Starts only after a user gesture. */
export class Ambience {
  ctx: AudioContext | null = null;
  master!: GainNode;
  wind!: GainNode;
  water!: GainNode;
  cricket!: GainNode;
  mood: AudioMood = { daylight: 1, night: 0, snow: 0, season: "spring", pond: 0, courtyard: 0, inside: 0 };
  timers: number[] = [];
  enabled = false;
  private noiseBrown!: AudioBuffer;
  private noiseWhite!: AudioBuffer;

  async start() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    await ctx.resume();
    this.enabled = true;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.8);
    this.applyMood();
    this.timers.push(window.setInterval(() => this.birds(), 2600));
    this.timers.push(window.setInterval(() => this.knock(), 9000));
    this.timers.push(window.setInterval(() => this.bell(), 26000));
  }

  stop() {
    if (!this.ctx) return;
    this.enabled = false;
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    const c = this.ctx;
    window.setTimeout(() => {
      if (!this.enabled) c.suspend();
    }, 1800);
  }

  setMood(m: AudioMood) {
    this.mood = m;
    if (this.enabled) this.applyMood();
  }

  private applyMood() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const m = this.mood;
    const windAmt = (0.05 + 0.1 * (1 - m.inside * 0.65)) * (m.season === "winter" ? 1.4 : 1);
    this.wind.gain.setTargetAtTime(windAmt, t, 0.8);
    this.water.gain.setTargetAtTime(Math.min(0.3, m.pond * 0.22 + m.courtyard * 0.09), t, 0.6);
    const crick = m.night * (m.season === "summer" ? 0.035 : m.season === "autumn" ? 0.022 : 0.004) * (1 - m.inside * 0.5);
    this.cricket.gain.setTargetAtTime(crick, t, 1.0);
  }

  private build() {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp);
    comp.connect(ctx.destination);

    const len = ctx.sampleRate * 4;
    this.noiseWhite = ctx.createBuffer(1, len, ctx.sampleRate);
    this.noiseBrown = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = this.noiseWhite.getChannelData(0);
    const b = this.noiseBrown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      w[i] = white;
      last = (last + 0.02 * white) / 1.02;
      b[i] = last * 3.5;
    }
    const loop = (buf: AudioBuffer) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.start();
      return s;
    };

    // wind
    const wsrc = loop(this.noiseBrown);
    const wf = ctx.createBiquadFilter();
    wf.type = "lowpass";
    wf.frequency.value = 600;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 260;
    lfo.connect(lg);
    lg.connect(wf.frequency);
    lfo.start();
    this.wind = ctx.createGain();
    this.wind.gain.value = 0;
    wsrc.connect(wf);
    wf.connect(this.wind);
    this.wind.connect(this.master);

    // water
    const ws = loop(this.noiseWhite);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2300;
    bp.Q.value = 0.8;
    const bp2 = ctx.createBiquadFilter();
    bp2.type = "highpass";
    bp2.frequency.value = 900;
    this.water = ctx.createGain();
    this.water.gain.value = 0;
    const wlfo = ctx.createOscillator();
    wlfo.frequency.value = 3.1;
    const wlg = ctx.createGain();
    wlg.gain.value = 0.25;
    const wmod = ctx.createGain();
    wmod.gain.value = 0.75;
    wlfo.connect(wlg);
    wlg.connect(wmod.gain);
    wlfo.start();
    ws.connect(bp);
    bp.connect(bp2);
    bp2.connect(wmod);
    wmod.connect(this.water);
    this.water.connect(this.master);

    // crickets
    const car = ctx.createOscillator();
    car.frequency.value = 4300;
    const cg = ctx.createGain();
    cg.gain.value = 0.5;
    const clfo = ctx.createOscillator();
    clfo.type = "square";
    clfo.frequency.value = 17;
    const clg = ctx.createGain();
    clg.gain.value = 0.5;
    clfo.connect(clg);
    clg.connect(cg.gain);
    car.connect(cg);
    this.cricket = ctx.createGain();
    this.cricket.gain.value = 0;
    cg.connect(this.cricket);
    this.cricket.connect(this.master);
    car.start();
    clfo.start();
  }

  private env(g: GainNode, peak: number, a: number, d: number, at: number) {
    const t = this.ctx!.currentTime + at;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private birds() {
    if (!this.enabled || !this.ctx) return;
    const m = this.mood;
    if (m.season === "winter" || Math.random() > m.daylight * 0.55) return;
    const ctx = this.ctx;
    const n = 2 + Math.floor(Math.random() * 4);
    const f0 = 2400 + Math.random() * 1400;
    const vol = 0.028 * (1 - m.inside * 0.5);
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const at = i * 0.13;
      o.type = "sine";
      o.frequency.setValueAtTime(f0, ctx.currentTime + at);
      o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + Math.random() * 0.4), ctx.currentTime + at + 0.08);
      o.connect(g);
      g.connect(this.master);
      this.env(g, vol, 0.015, 0.08, at);
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + 0.16);
    }
  }

  private knock() {
    if (!this.enabled || !this.ctx) return;
    const v = this.mood.courtyard;
    if (v < 0.08) return;
    this.thock(0.16 * v);
  }

  private thock(vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(520, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.12);
    const g = ctx.createGain();
    o.connect(g);
    g.connect(this.master);
    this.env(g, vol, 0.004, 0.22, 0);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  }

  private bell() {
    if (!this.enabled || !this.ctx) return;
    const m = this.mood;
    if (m.night < 0.2 || m.night > 0.8 || Math.random() > 0.6) return;
    const ctx = this.ctx;
    for (const [f, v] of [
      [196, 0.05],
      [392.7, 0.028],
      [587, 0.015],
      [823, 0.008],
    ] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      o.connect(g);
      g.connect(this.master);
      this.env(g, v, 0.01, 5, 0);
      o.start();
      o.stop(ctx.currentTime + 5.2);
    }
  }

  plop() {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(700, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.16);
    const g = ctx.createGain();
    o.connect(g);
    g.connect(this.master);
    this.env(g, 0.14, 0.005, 0.2, 0);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  }

  tick(on: boolean) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = on ? 880 : 520;
    const g = ctx.createGain();
    o.connect(g);
    g.connect(this.master);
    this.env(g, 0.08, 0.004, 0.14, 0);
    o.start();
    o.stop(ctx.currentTime + 0.2);
  }
}
