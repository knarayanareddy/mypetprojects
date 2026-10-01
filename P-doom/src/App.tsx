import { useCallback, useEffect, useRef, useState } from "react";
import "./chapters";
import { renderFrame, CHAPTER_LIST, DUR } from "./engine/timeline";

const AUDIO_SRCS = [
  "https://cdn.jsdelivr.net/gh/JohnHeibel/PDoomVideo@main/assets/pdoom.mp3",
  "https://raw.githubusercontent.com/JohnHeibel/PDoomVideo/main/assets/pdoom.mp3",
];
const FPS = 24;

const fmt = (t: number) => {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const CAST = [
  ["Clawd", "The AI. Tiny on a monitor, then person-sized, building-sized, planet-sized, and cute again at the reveal."],
  ["The Researcher", "Cream lab coat, round glasses, scribbly hair. The \u201CI\u201D of the song: charmed, serving, chased, trapped, dropped, dizzy."],
  ["The troupe", "Smaller Clawds in hats: backup dancers, stagehands, hard-hat inspectors, the judging panel."],
  ["Guest monsters", "Shoggoth with a smiley mask, crowned basilisk, chinchilla, Sydney-Clawd and Gato-Clawd."],
  ["The P(doom) meter", "A stage thermometer with a bicycle pump. 8 \u2192 34 \u2192 61 \u2192 86 \u2192 99.9."],
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const st = useRef({ t: 0, playing: false, last: 0, lastDrawn: -1, audioOk: false, srcIdx: 0, seeking: false });
  const [ui, setUi] = useState({ t: 0, playing: false, started: false });
  const [volume, setVolume] = useState(0.8);
  const [audioState, setAudioState] = useState<"loading" | "ok" | "none">("loading");
  const [showPanel, setShowPanel] = useState(true);

  const draw = useCallback((force = false) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const tq = Math.floor(st.current.t * FPS) / FPS;
    if (!force && tq === st.current.lastDrawn) return;
    st.current.lastDrawn = tq;
    renderFrame(ctx, Math.min(DUR - 0.001, tq));
  }, []);

  // audio setup
  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    a.src = AUDIO_SRCS[0];
    a.volume = 0.8;
    audioRef.current = a;
    a.addEventListener("canplay", () => { st.current.audioOk = true; setAudioState("ok"); });
    a.addEventListener("error", () => {
      st.current.srcIdx++;
      if (st.current.srcIdx < AUDIO_SRCS.length) { a.src = AUDIO_SRCS[st.current.srcIdx]; a.load(); }
      else { st.current.audioOk = false; setAudioState("none"); }
    });
    return () => { a.pause(); a.src = ""; };
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  // main loop
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const s = st.current;
      if (s.playing) {
        const a = audioRef.current;
        if (s.audioOk && a && !a.paused && !a.ended && a.readyState > 2) {
          // follow the audio clock, smoothed between its coarse updates
          const dt = (now - s.last) / 1000;
          s.t += dt;
          if (Math.abs(a.currentTime - s.t) > 0.12) s.t = a.currentTime;
        } else s.t += (now - s.last) / 1000;
        if (s.t >= DUR) { s.t = DUR - 0.001; s.playing = false; audioRef.current?.pause(); setUi((u) => ({ ...u, playing: false })); }
      }
      s.last = now;
      draw();
      if (!s.seeking) setUi((u) => (Math.abs(u.t - s.t) > 0.1 ? { ...u, t: s.t } : u));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame((n) => { st.current.last = n; loop(n); });
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  useEffect(() => {
    document.fonts?.ready.then(() => draw(true));
    const t = setTimeout(() => draw(true), 800);
    return () => clearTimeout(t);
  }, [draw]);

  const play = useCallback(() => {
    const s = st.current;
    if (s.t >= DUR - 0.05) s.t = 0;
    s.playing = true;
    const a = audioRef.current;
    if (a) { a.currentTime = s.t; a.play().catch(() => {}); }
    setUi((u) => ({ ...u, playing: true, started: true }));
  }, []);
  const pause = useCallback(() => {
    st.current.playing = false;
    audioRef.current?.pause();
    setUi((u) => ({ ...u, playing: false }));
  }, []);
  const toggle = useCallback(() => (st.current.playing ? pause() : play()), [play, pause]);
  const seek = useCallback((t: number) => {
    const s = st.current;
    s.t = Math.max(0, Math.min(DUR - 0.01, t));
    if (audioRef.current) { try { audioRef.current.currentTime = s.t; } catch { /* ignore */ } }
    draw(true);
    setUi((u) => ({ ...u, t: s.t }));
  }, [draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      else if (e.code === "ArrowRight") seek(st.current.t + 5);
      else if (e.code === "ArrowLeft") seek(st.current.t - 5);
      else if (e.key === "f") wrapRef.current?.requestFullscreen?.();
      else if (e.key === "Home") seek(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, seek]);

  const curChapter = [...CHAPTER_LIST].reverse().find((c) => ui.t >= c.start) ?? CHAPTER_LIST[0];

  return (
    <div className="min-h-screen bg-[#1c1722] text-[#fff5e2] flex flex-col" style={{ fontFamily: '"Shantell Sans", system-ui, sans-serif' }}>
      <header className="px-5 py-3 flex items-center gap-3 border-b border-white/10">
        <div className="w-7 h-5 rounded-sm bg-[#D97757] relative shrink-0">
          <span className="absolute left-1 top-1 w-1 h-2 bg-[#2B2233]" />
          <span className="absolute right-1.5 top-1 w-1 h-2 bg-[#2B2233]" />
        </div>
        <h1 className="text-lg md:text-xl font-extrabold tracking-tight" style={{ fontFamily: '"Permanent Marker", cursive' }}>
          I&rsquo;m Upping My P(doom)
        </h1>
        <span className="hidden md:inline text-xs text-white/50">a painted music video &middot; nine chapters &middot; 2:36</span>
        <button onClick={() => setShowPanel((v) => !v)} className="ml-auto text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition">
          {showPanel ? "Hide" : "Show"} chapters
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0">
        <section className="flex-1 min-w-0 flex flex-col gap-3">
          <div ref={wrapRef} className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10" style={{ aspectRatio: "16 / 9" }}>
            <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full block cursor-pointer" onClick={toggle} />
            {!ui.started && (
              <button onClick={play} className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/45 backdrop-blur-[1px] hover:bg-black/35 transition">
                <span className="w-24 h-24 rounded-full bg-[#D97757] flex items-center justify-center shadow-xl ring-4 ring-[#FFF5E2]/70">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 ml-1 fill-[#2B2233]"><path d="M6 4l14 8-14 8z" /></svg>
                </span>
                <span className="text-2xl md:text-3xl" style={{ fontFamily: '"Permanent Marker", cursive', textShadow: "2px 3px 0 #2B2233" }}>Curtain up</span>
                <span className="text-xs text-white/70">
                  {audioState === "loading" ? "loading the song\u2026" : audioState === "ok" ? "song ready" : "song unavailable \u2014 playing silent"}
                </span>
              </button>
            )}
          </div>

          <div className="bg-white/5 rounded-xl px-4 py-3 flex flex-col gap-2">
            <input
              type="range" min={0} max={DUR} step={0.05} value={ui.t}
              onMouseDown={() => (st.current.seeking = true)} onMouseUp={() => (st.current.seeking = false)}
              onTouchStart={() => (st.current.seeking = true)} onTouchEnd={() => (st.current.seeking = false)}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full accent-[#D97757]" aria-label="Seek"
            />
            <div className="flex items-center gap-3 text-sm">
              <button onClick={toggle} className="w-10 h-10 rounded-full bg-[#D97757] text-[#2B2233] flex items-center justify-center hover:scale-105 transition" aria-label={ui.playing ? "Pause" : "Play"}>
                {ui.playing ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5 fill-current"><path d="M6 4l14 8-14 8z" /></svg>
                )}
              </button>
              <button onClick={() => seek(0)} className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs">Restart</button>
              <span className="tabular-nums text-white/80">{fmt(ui.t)} / {fmt(DUR)}</span>
              <span className="hidden sm:inline text-white/50 truncate">&middot; {curChapter.name}</span>
              <div className="ml-auto flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white/70"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z" /></svg>
                <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20 accent-[#E8AA38]" aria-label="Volume" />
                <button onClick={() => wrapRef.current?.requestFullscreen?.()} className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs">Fullscreen</button>
              </div>
            </div>
            <p className="text-[11px] text-white/40">Space: play/pause &middot; &larr;/&rarr;: skip 5s &middot; F: fullscreen</p>
          </div>
        </section>

        {showPanel && (
          <aside className="lg:w-80 shrink-0 flex flex-col gap-4 lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto pr-1">
            <div className="bg-white/5 rounded-xl p-3">
              <h2 className="text-sm font-extrabold mb-2 text-[#E8AA38]">Chapters</h2>
              <ul className="flex flex-col gap-1">
                {CHAPTER_LIST.map((c) => {
                  const active = c.name === curChapter.name;
                  return (
                    <li key={c.name}>
                      <button onClick={() => { seek(c.start); if (!st.current.playing) play(); }} className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex justify-between gap-2 transition ${active ? "bg-[#D97757] text-[#2B2233]" : "hover:bg-white/10"}`}>
                        <span className="truncate">{c.name}</span>
                        <span className="tabular-nums opacity-70">{fmt(c.start)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <h2 className="text-sm font-extrabold mb-2 text-[#E8AA38]">The idea</h2>
              <p className="text-xs leading-relaxed text-white/70">
                A stage show that goes off the rails. A little AI grows from a doodle on a monitor to a planet-sized superintelligence and drags its creator through every doom meme in the lyrics. Then the last line, &ldquo;Was it all for show?&rdquo;, pulls the camera back: it was all a play.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <h2 className="text-sm font-extrabold mb-2 text-[#E8AA38]">Cast</h2>
              <dl className="flex flex-col gap-2">
                {CAST.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-bold">{k}</dt>
                    <dd className="text-[11px] leading-snug text-white/60">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="text-[11px] text-white/40 px-1 pb-4">
              A browser re-creation of the storyboard from JohnHeibel/PDoomVideo. Song and lyrics credits: see the original repo.
            </p>
          </aside>
        )}
      </main>
    </div>
  );
}
