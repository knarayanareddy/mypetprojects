import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Engine } from './engine/audio';
import { SONG_END } from './engine/lyrics';
import { renderFrame, CHAPTERS } from './scenes/timeline';

const CW = 1280;
const CH = 720;
const SCALE = CW / 1920;

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const METHOD = [
  {
    h: 'Every frame is a pure function of time',
    p: 'No state between frames and no randomness: shot(t) paints the whole picture, so you can scrub anywhere (or render frames in parallel) and get the same image.',
  },
  {
    h: 'Watercolor painter engine',
    p: 'Flat washes, pigment pooled at the edges, highlight and shadow blooms, wobbly double ink lines that re-seed 12×/s so the linework "boils", plus paper grain and a vignette.',
  },
  {
    h: 'One mascot, one human, one stage',
    p: 'Bit grows from a chalk doodle to a giant. The Researcher ages through six eras. The same stage returns after every chorus and escalates: party, pyro, flood of pages, golden finale.',
  },
  {
    h: 'Motivated transitions + a twist',
    p: 'Brush-stroke wipes mark chapters, irises and zooms carry action across cuts, and the final pull-back reveals the whole history was a stage show, with a new generation taking the pump.',
  },
];

export default function App() {
  const engine = useMemo(() => new Engine(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const recordingRef = useRef(false);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [note, setNote] = useState('');

  const draw = useCallback((t: number) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    renderFrame(ctx, t, SCALE, CW, CH);
  }, []);

  // fonts, then poster frame
  useEffect(() => {
    let alive = true;
    const go = () => {
      if (!alive) return;
      draw(3.9);
      setReady(true);
    };
    if (document.fonts && document.fonts.load) {
      Promise.race([document.fonts.load("40px 'Permanent Marker'"), new Promise((r) => setTimeout(r, 2500))]).then(go, go);
    } else go();
    return () => {
      alive = false;
    };
  }, [draw]);

  const finish = useCallback(() => {
    engine.pause();
    playingRef.current = false;
    timeRef.current = SONG_END - 0.02;
    setTime(SONG_END);
    setPlaying(false);
    if (recordingRef.current && recRef.current && recRef.current.state !== 'inactive') {
      const r = recRef.current;
      setTimeout(() => r.stop(), 250);
    }
  }, [engine]);

  // main loop
  useEffect(() => {
    let raf = 0;
    let lastUI = 0;
    const tick = (now: number) => {
      if (playingRef.current) {
        const t = engine.pos();
        if (t >= SONG_END) finish();
        else {
          timeRef.current = t;
          draw(t);
          if (now - lastUI > 100) {
            lastUI = now;
            setTime(t);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, draw, finish]);

  const play = useCallback(
    async (from?: number) => {
      let f = from ?? timeRef.current;
      if (f >= SONG_END - 0.1) f = 0;
      timeRef.current = f;
      setStarted(true);
      await engine.play(f);
      playingRef.current = true;
      setPlaying(true);
    },
    [engine],
  );
  const pause = useCallback(() => {
    engine.pause();
    playingRef.current = false;
    setPlaying(false);
  }, [engine]);
  const toggle = useCallback(() => (playingRef.current ? pause() : void play()), [pause, play]);
  const seek = useCallback(
    (t: number) => {
      timeRef.current = t;
      setTime(t);
      if (playingRef.current) void engine.play(t);
      else draw(t);
    },
    [engine, draw],
  );

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [toggle]);

  const record = useCallback(async () => {
    if (recordingRef.current) return;
    const c = canvasRef.current;
    if (!c || typeof MediaRecorder === 'undefined') {
      setNote('Recording is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    engine.init();
    engine.setMuted(false);
    setMuted(false);
    const stream = c.captureStream(30);
    engine.dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 9_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'teaching-the-sand-to-think.webm';
      a.click();
      recordingRef.current = false;
      setRecording(false);
      setNote('Saved teaching-the-sand-to-think.webm. Convert to MP4 with ffmpeg if you need one.');
    };
    recRef.current = rec;
    recordingRef.current = true;
    setRecording(true);
    setNote('Recording in real time (2:52). Keep this tab visible until it finishes.');
    rec.start(500);
    await play(0);
  }, [engine, play]);

  const progress = (time / SONG_END) * 100;
  const chapter = [...CHAPTERS].reverse().find((c) => time >= c.a);

  return (
    <div className="min-h-screen bg-[#17132b] text-[#fff3da]" style={{ background: 'radial-gradient(1200px 700px at 50% -10%, #3a2d6e 0%, #17132b 60%)' }}>
      <header className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-5 pt-8 pb-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-[#eab04a] uppercase">A painted music video · 1956 → now</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl" style={{ fontFamily: "'Permanent Marker', cursive" }}>
            Teaching the Sand to Think
          </h1>
        </div>
        <p className="max-w-sm text-sm text-[#d9cfee]">
          Sixty-plus years of AI as a stage show: sparks, winters, champions, deep learning, transformers and the road ahead. All painted live, frame by frame.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16">
        <div ref={wrapRef} className="relative overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10" style={{ aspectRatio: '16 / 9' }}>
          <canvas ref={canvasRef} width={CW} height={CH} className="block h-full w-full" onClick={toggle} />
          {!ready && <div className="absolute inset-0 grid place-items-center bg-[#17132b] text-sm text-[#d9cfee]">Mixing paint…</div>}
          {ready && !started && (
            <button
              onClick={() => void play(0)}
              className="group absolute inset-0 grid place-items-center bg-black/25 backdrop-blur-[1px] transition hover:bg-black/10"
              aria-label="Play the film"
            >
              <span className="flex items-center gap-4 rounded-full bg-[#eab04a] px-8 py-4 text-xl font-bold text-[#2b2638] shadow-xl transition group-hover:scale-105">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                Play the film (sound on)
              </span>
            </button>
          )}
          {recording && (
            <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" /> REC
            </div>
          )}
        </div>

        {/* controls */}
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
          <button onClick={toggle} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eab04a] text-[#2b2638] transition hover:scale-105" aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <span className="w-24 shrink-0 text-sm tabular-nums text-[#d9cfee]">
            {fmt(time)} / {fmt(SONG_END)}
          </span>
          <div className="relative flex-1">
            <input
              type="range"
              min={0}
              max={SONG_END}
              step={0.05}
              value={time}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#eab04a]"
              style={{ background: `linear-gradient(to right,#eab04a ${progress}%,rgba(255,255,255,.15) ${progress}%)` }}
              aria-label="Seek"
            />
          </div>
          <button
            onClick={() => {
              const m = !muted;
              setMuted(m);
              engine.init();
              engine.setMuted(m);
            }}
            className="rounded-lg px-3 py-2 text-sm text-[#d9cfee] ring-1 ring-white/15 transition hover:bg-white/10"
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button
            onClick={() => wrapRef.current?.requestFullscreen?.()}
            className="hidden rounded-lg px-3 py-2 text-sm text-[#d9cfee] ring-1 ring-white/15 transition hover:bg-white/10 sm:block"
          >
            Fullscreen
          </button>
          <button
            onClick={() => void record()}
            disabled={recording}
            className="rounded-lg bg-[#e86a7e] px-3 py-2 text-sm font-semibold text-[#2b2638] transition hover:brightness-110 disabled:opacity-50"
          >
            {recording ? 'Recording…' : 'Record video'}
          </button>
        </div>
        {note && <p className="mt-2 text-sm text-[#eab04a]">{note}</p>}

        {/* chapters */}
        <div className="mt-5 flex flex-wrap gap-2">
          {CHAPTERS.map((c) => (
            <button
              key={c.a}
              onClick={() => seek(c.a + 0.05)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ring-1 ${
                chapter?.a === c.a ? 'bg-[#eab04a] text-[#2b2638] ring-[#eab04a]' : 'bg-white/5 text-[#d9cfee] ring-white/15 hover:bg-white/10'
              }`}
            >
              {fmt(c.a)} · {c.title}
              {c.sub ? ` · ${c.sub}` : ''}
            </button>
          ))}
        </div>

        {/* method */}
        <section className="mt-12">
          <h2 className="text-lg font-bold text-[#eab04a]">How this film is made (same recipe as the P(doom) video, new story)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {METHOD.map((m) => (
              <div key={m.h} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <h3 className="font-semibold">{m.h}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#d9cfee]">{m.p}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-[#a99fc7]">
            Audio note: the song, lyrics and singing voice are generated in your browser (WebAudio synth-pop band plus a formant "AI singer"), so it won't sound like the original recording. The arrangement evolves with the eras, from lo-fi bleeps in the 1960s to a full finale. "Record video" captures the canvas and audio into a downloadable .webm.
          </p>
        </section>
      </main>
    </div>
  );
}
