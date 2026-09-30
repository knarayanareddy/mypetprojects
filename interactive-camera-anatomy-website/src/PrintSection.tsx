import { useCallback, useEffect, useRef, useState } from "react";
import sample from "./assets/sample-portrait.jpg";
import { cl, ss, useCompact, useSectionProgress } from "./engine";

const RAINBOW = ["#e8453c", "#f58a1f", "#f9c31c", "#4fae4e", "#2f7fd4"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── tiny WebAudio helpers (silently ignored if unavailable) ── */
let actx: AudioContext | null = null;
function audio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    actx = actx ?? new AC();
    if (actx.state === "suspended") void actx.resume();
    return actx;
  } catch {
    return null;
  }
}
function beep(freq = 880, dur = 0.07, vol = 0.04) {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}
function shutterClick() {
  const a = audio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * 0.09);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 2200;
  const g = a.createGain();
  g.gain.value = 0.5;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
  setTimeout(() => beep(140, 0.12, 0.12), 70);
}

function coverDraw(ctx: CanvasRenderingContext2D, img: CanvasImageSource, sw: number, sh: number, size: number, mirror: boolean) {
  const s = Math.min(sw, sh);
  ctx.save();
  if (mirror) {
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, (sw - s) / 2, (sh - s) / 2, s, s, 0, 0, size, size);
  ctx.restore();
}
const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

export default function PrintSection() {
  const ref = useRef<HTMLElement>(null);
  const p = useSectionProgress(ref);
  const compact = useCompact();

  const [snap, setSnap] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const [cam, setCam] = useState<"idle" | "asking" | "live" | "denied">("idle");
  const [usedSample, setUsedSample] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const busy = useRef(false);
  const auto = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCam((c) => (c === "live" ? "idle" : c));
  }, []);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  const startCam = useCallback(async () => {
    if (streamRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam("denied");
      return false;
    }
    setCam("asking");
    audio();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      streamRef.current = s;
      setCam("live");
      return true;
    } catch {
      setCam("denied");
      return false;
    }
  }, []);

  const shoot = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    for (let i = 3; i >= 1; i--) {
      setCount(i);
      beep(i === 1 ? 1175 : 880);
      await sleep(i === 3 ? 950 : 800);
    }
    setCount(null);
    const size = 900;
    const cvs = document.createElement("canvas");
    cvs.width = cvs.height = size;
    const ctx = cvs.getContext("2d")!;
    const v = videoRef.current;
    try {
      ctx.filter = "contrast(1.06) saturate(1.12) sepia(0.1)";
    } catch {
      /* unsupported */
    }
    if (streamRef.current && v && v.videoWidth > 0) {
      coverDraw(ctx, v, v.videoWidth, v.videoHeight, size, true);
      setUsedSample(false);
    } else {
      const img = await loadImg(sample);
      coverDraw(ctx, img, img.naturalWidth, img.naturalHeight, size, false);
      setUsedSample(true);
    }
    shutterClick();
    setFlash((f) => f + 1);
    setSnap(cvs.toDataURL("image/jpeg", 0.92));
    stopCam();
    busy.current = false;
  }, [stopCam]);

  // auto-capture once you scroll to the shutter point
  useEffect(() => {
    if (p > 0.12 && !snap && !busy.current && !auto.current && cam !== "asking") {
      auto.current = true;
      void shoot();
    }
  }, [p, snap, cam, shoot]);

  const retake = async () => {
    auto.current = true;
    setSnap(null);
    if (!streamRef.current) await startCam();
    await sleep(600);
    await shoot();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    auto.current = true;
    const url = URL.createObjectURL(f);
    try {
      const img = await loadImg(url);
      const cvs = document.createElement("canvas");
      cvs.width = cvs.height = 900;
      coverDraw(cvs.getContext("2d")!, img, img.naturalWidth, img.naturalHeight, 900, false);
      stopCam();
      setUsedSample(false);
      shutterClick();
      setFlash((x) => x + 1);
      setSnap(cvs.toDataURL("image/jpeg", 0.92));
    } finally {
      URL.revokeObjectURL(url);
      e.target.value = "";
    }
  };

  const download = async () => {
    if (!snap) return;
    const img = await loadImg(snap);
    const c = document.createElement("canvas");
    c.width = 1000;
    c.height = 1222;
    const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, 0, 1222);
    g.addColorStop(0, "#fffdf8");
    g.addColorStop(1, "#ebe5d6");
    x.fillStyle = g;
    x.fillRect(0, 0, 1000, 1222);
    x.drawImage(img, 59, 59, 882, 882);
    x.strokeStyle = "rgba(0,0,0,.25)";
    x.lineWidth = 3;
    x.strokeRect(59, 59, 882, 882);
    x.fillStyle = "#2a2622";
    x.font = "700 78px Caveat, cursive";
    x.textAlign = "center";
    x.fillText(`teardown · ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`, 500, 1060);
    x.font = "500 26px 'JetBrains Mono', monospace";
    x.fillStyle = "#8a8172";
    x.fillText("MERIDIAN ONESHOT · INSTANT PRINT", 500, 1150);
    c.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "teardown-print.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  };

  /* ── timeline ── */
  const c = ss(0.2, 0.34, p); // viewfinder → side, printer in
  const feed = ss(0.36, 0.74, p);
  const lift = ss(0.76, 0.84, p);
  const dev = ss(0.6, 0.95, p);
  const printing = p > 0.36 && feed < 1;

  let title = "Now it's your turn.";
  let sub = "Allow your camera — or just keep scrolling and we'll use a sample portrait.";
  if (count !== null) {
    title = "Hold still…";
    sub = "Three, two, one.";
  } else if (snap && p < 0.36) {
    title = "Got it.";
    sub = "Sending the frame to the printer…";
  } else if (p >= 0.36 && feed < 1) {
    title = "Printing…";
    sub = "Scroll to feed the paper through the rollers.";
  } else if (p >= 0.36 && dev < 0.98) {
    title = "Developing…";
    sub = "Chemistry takes its time. Colour creeps in from the edges.";
  } else if (dev >= 0.98) {
    title = "There it is.";
    sub = usedSample ? "That's our sample portrait — hit Retake to use your own camera." : "One instant print, made from scratch.";
  }

  const vfW = "min(460px, 82vw, 62svh)";
  const vfStyle: React.CSSProperties = compact
    ? { width: vfW, transform: `translate(-50%, calc(-50% - ${c * 27}svh)) scale(${1 - 0.46 * c})` }
    : { width: vfW, transform: `translate(calc(-50% - ${c * 27}vw), -50%) scale(${1 - 0.36 * c})` };

  const setVideo = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      void el.play().catch(() => undefined);
    }
  };

  return (
    <section id="print" ref={ref} className="relative" style={{ height: "680vh" }}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-[#0c0b0a]">
        <div className="blueprint-grid absolute inset-0 opacity-60" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 60% at 50% 55%, rgba(255,180,84,.11), transparent 70%)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,.6)_100%)]" />

        {/* heading */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center px-6 pt-5 text-center md:pt-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ffb454] md:text-[11px]">05 / Finale · Your portrait</div>
          <h2 key={title} className="fade-up mt-1.5 font-display text-[34px] leading-none text-[#f4eee2] md:mt-3 md:text-[60px]">
            {title}
          </h2>
          <p key={sub} className="fade-up mt-2 max-w-xl text-[12.5px] leading-relaxed text-[#efe8da]/65 md:text-[14.5px]">
            {sub}
          </p>
        </div>

        {/* viewfinder */}
        <div className="absolute left-1/2 top-1/2 z-10 will-change-transform" style={vfStyle}>
          <div className="relative aspect-square w-full overflow-hidden rounded-[22px] border border-white/15 bg-black shadow-[0_30px_80px_rgba(0,0,0,.7)]">
            {snap ? (
              <img src={snap} alt="Your captured photo" className="h-full w-full object-cover" />
            ) : cam === "live" ? (
              <video ref={setVideo} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            ) : (
              <img src={sample} alt="" className="h-full w-full object-cover opacity-35 blur-[3px] saturate-50" />
            )}

            {/* HUD */}
            <div className="pointer-events-none absolute inset-0">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="absolute h-6 w-6 border-[#ffb454]"
                  style={{
                    top: i < 2 ? 14 : undefined,
                    bottom: i >= 2 ? 14 : undefined,
                    left: i % 2 === 0 ? 14 : undefined,
                    right: i % 2 === 1 ? 14 : undefined,
                    borderTopWidth: i < 2 ? 2 : 0,
                    borderBottomWidth: i >= 2 ? 2 : 0,
                    borderLeftWidth: i % 2 === 0 ? 2 : 0,
                    borderRightWidth: i % 2 === 1 ? 2 : 0,
                  }}
                />
              ))}
              <div className="absolute left-[33.3%] top-0 h-full w-px bg-white/10" />
              <div className="absolute left-[66.6%] top-0 h-full w-px bg-white/10" />
              <div className="absolute left-0 top-[33.3%] h-px w-full bg-white/10" />
              <div className="absolute left-0 top-[66.6%] h-px w-full bg-white/10" />
              <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-dashed border-[#58f08a]/70" />
              <div className="absolute left-5 top-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/80">
                <span className={"inline-block h-2 w-2 rounded-full " + (snap ? "bg-white/40" : "blink bg-[#ff4b3a]")} />
                {snap ? "Captured" : cam === "live" ? "Live" : "Standby"}
              </div>
              <div className="absolute right-5 top-5 font-mono text-[10px] tracking-[0.15em] text-white/70">1/125 · f/2.8 · ISO 400</div>
              <div className="absolute bottom-4 left-5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">1:1 · Square</div>
              {count !== null && (
                <div key={count} className="pop absolute inset-0 flex items-center justify-center font-display text-[140px] leading-none text-white drop-shadow-[0_6px_30px_rgba(0,0,0,.6)]">
                  {count}
                </div>
              )}
            </div>

            {/* call-to-action before capture */}
            {!snap && count === null && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 p-5 text-center">
                <div className="font-display text-2xl italic text-[#f4eee2] md:text-3xl">Smile for the printer</div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button onClick={() => void startCam()} disabled={cam === "asking" || cam === "live"} className="pointer-events-auto rounded-full bg-[#ffb454] px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-black transition hover:bg-[#ffc677] disabled:opacity-60">
                    {cam === "asking" ? "Waiting for permission…" : cam === "live" ? "Camera live ●" : "Use my camera"}
                  </button>
                  <button onClick={() => fileRef.current?.click()} className="pointer-events-auto rounded-full border border-white/30 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/90 transition hover:bg-white/10">
                    Upload a photo
                  </button>
                </div>
                <p className="max-w-[300px] text-[11px] leading-relaxed text-white/60">
                  {cam === "denied" ? "Camera not available — no problem, we'll use a sample portrait." : "Stays on your device. Or simply scroll on — a sample portrait steps in."}
                </p>
              </div>
            )}
          </div>
          <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-[#efe8da]/40" style={{ opacity: 1 - c * 0.6 }}>
            Viewfinder · Meridian OneShot
          </div>
        </div>

        {/* printer */}
        <div
          className="absolute z-10"
          style={
            compact
              ? { bottom: 0, left: "50%", height: "66svh", aspectRatio: "520 / 700", transform: `translate(-50%, ${(1 - c) * 40}px)`, opacity: c }
              : { right: "6vw", top: "50%", height: "min(86svh, 66vw)", aspectRatio: "520 / 700", transform: `translate(${(1 - c) * 70}px, -50%)`, opacity: c }
          }
        >
          <Printer snap={snap} feed={feed} lift={lift} dev={dev} printing={printing} />
        </div>

        {/* actions */}
        <div className="absolute inset-x-0 bottom-3 z-20 flex flex-wrap items-center justify-center gap-2 px-4 md:bottom-6" style={{ opacity: ss(0.0, 0.05, p) }}>
          {snap && (
            <button onClick={() => void retake()} className="rounded-full border border-white/25 bg-black/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/85 backdrop-blur transition hover:bg-white/10">
              ↺ Retake
            </button>
          )}
          {snap && (
            <button onClick={() => fileRef.current?.click()} className="rounded-full border border-white/25 bg-black/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/85 backdrop-blur transition hover:bg-white/10">
              Upload instead
            </button>
          )}
          <button
            onClick={() => void download()}
            disabled={!snap || dev < 0.9}
            className="rounded-full bg-[#ffb454] px-5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#ffc677] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ⬇ Keep the print
          </button>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="rounded-full border border-white/25 bg-black/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/85 backdrop-blur transition hover:bg-white/10">
            ↑ Start over
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e)} />

        {/* flash */}
        {flash > 0 && <div key={flash} className="flash pointer-events-none absolute inset-0 z-30 bg-white" />}
      </div>
    </section>
  );
}

/* ───────────────────────── the printer ───────────────────────── */

function Printer({ snap, feed, lift, dev, printing }: { snap: string | null; feed: number; lift: number; dev: number; printing: boolean }) {
  const SLOT_Y = 436;
  const PH = 330;
  const top0 = SLOT_Y + 2; // hidden inside
  const topEnd = 104; // fully out
  const topY = top0 + (topEnd - top0) * feed - lift * 46;
  const jitter = printing ? Math.sin(feed * 420) * 0.9 : 0;
  const d = cl(dev);
  const sat = (0.05 + 0.95 * d * d).toFixed(3);
  const blur = ((1 - d) * 9).toFixed(2);
  const imgOp = Math.pow(ss(0.0, 0.85, d), 1.1);
  const pct = Math.round(feed * 100);
  const status = feed >= 1 ? (d >= 0.98 ? "DONE ✓" : "WAIT…") : feed > 0 ? `PRINTING ${pct}%` : "READY";

  return (
    <svg viewBox="0 0 520 700" className="h-full w-full overflow-visible" role="img" aria-label="Instant photo printer with your photo coming out">
      <defs>
        <linearGradient id="pr-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbf8f0" />
          <stop offset=".55" stopColor="#ebe5d6" />
          <stop offset="1" stopColor="#c9c1ae" />
        </linearGradient>
        <linearGradient id="pr-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(0,0,0,.18)" />
          <stop offset=".08" stopColor="rgba(255,255,255,0)" />
          <stop offset=".92" stopColor="rgba(255,255,255,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,.22)" />
        </linearGradient>
        <linearGradient id="pr-lip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(0,0,0,.6)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <radialGradient id="pr-led" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff" />
          <stop offset=".35" stopColor="#ffb454" />
          <stop offset="1" stopColor="#ffb454" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pr-btn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7a66" />
          <stop offset="1" stopColor="#c7291a" />
        </linearGradient>
        <clipPath id="pr-out">
          <rect x="-200" y="-400" width="920" height={SLOT_Y + 400 + 2} />
        </clipPath>
        <clipPath id="pr-img">
          <rect x="16" y="16" width="238" height="238" />
        </clipPath>
        <clipPath id="pr-face">
          <rect x="50" y={SLOT_Y} width="420" height="230" rx="36" />
        </clipPath>
        <filter id="pr-dev" x="-10%" y="-10%" width="120%" height="120%">
          <feColorMatrix type="saturate" values={sat} />
          <feGaussianBlur stdDeviation={blur} />
        </filter>
        <filter id="pr-shadow" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#000" floodOpacity=".5" />
        </filter>
      </defs>

      {/* floor shadow */}
      <ellipse cx="260" cy="672" rx="220" ry="16" fill="#000" opacity=".55" />

      {/* slot mouth (back) */}
      <rect x="86" y="420" width="348" height="26" rx="10" fill="#0a0a0a" />
      <rect x="92" y="428" width="336" height="3" fill="#2a2a2c" />
      <rect x="92" y="433" width="336" height="2" fill="#555" />
      {printing && <rect x="96" y="438" width="328" height="3" fill="#ffb454" opacity={0.55 + 0.4 * Math.sin(feed * 300)} />}

      {/* photo */}
      <g clipPath={feed < 0.999 ? "url(#pr-out)" : undefined}>
        <g transform={`translate(${130 + jitter} ${topY})`} filter="url(#pr-shadow)">
          <rect width="270" height={PH} rx="5" fill="url(#pr-body)" stroke="#cbc3b0" />
          <rect x="3" y="3" width="264" height={PH - 6} rx="3" fill="none" stroke="rgba(255,255,255,.8)" />
          <rect x="16" y="16" width="238" height="238" fill="#1a2328" />
          <g clipPath="url(#pr-img)">
            {snap && <image href={snap} x="14" y="14" width="242" height="242" preserveAspectRatio="xMidYMid slice" opacity={imgOp} filter="url(#pr-dev)" />}
            <rect x="16" y="16" width="238" height="238" fill="#9fc0b8" opacity={(1 - d) * 0.3} />
            <rect x="16" y="16" width="238" height="238" fill="#10181c" opacity={Math.pow(1 - d, 1.3) * 0.75} />
            <rect x="16" y="16" width="238" height="60" fill="url(#pr-lip)" opacity=".18" />
          </g>
          <rect x="16" y="16" width="238" height="238" fill="none" stroke="rgba(0,0,0,.35)" />
          <text x="135" y="292" textAnchor="middle" fontFamily="Caveat, cursive" fontSize="31" fontWeight="700" fill="#2a2622" opacity={ss(0.85, 1, d)}>
            teardown · {new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" })}
          </text>
          <text x="135" y="314" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" letterSpacing="2.5" fill="#8a8172" opacity={ss(0.85, 1, d)}>
            MERIDIAN · INSTANT
          </text>
        </g>
      </g>

      {/* printer face */}
      <g>
        <rect x="50" y={SLOT_Y} width="420" height="230" rx="36" fill="url(#pr-body)" stroke="#9b937f" strokeWidth="1.5" />
        <rect x="50" y={SLOT_Y} width="420" height="230" rx="36" fill="url(#pr-side)" />
        <rect x="50" y={SLOT_Y} width="420" height="14" fill="url(#pr-lip)" clipPath="url(#pr-face)" opacity=".55" />
        <path d={`M86 ${SLOT_Y + 1.5}H434`} stroke="#fff" strokeWidth="1.5" opacity=".9" />
        <g clipPath="url(#pr-face)">
          {RAINBOW.map((c, i) => (
            <rect key={c} x="50" y={SLOT_Y + 22 + i * 5} width="420" height="5" fill={c} />
          ))}
        </g>

        <text x="86" y={SLOT_Y + 92} fontFamily="Inter, sans-serif" fontSize="30" fontWeight="800" letterSpacing="5" fill="#26262a">
          MERIDIAN
        </text>
        <text x="88" y={SLOT_Y + 110} fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="4" fill="#7b7466">
          INSTANT PRINTER · SQ-1
        </text>

        {/* status display */}
        <rect x="86" y={SLOT_Y + 130} width="156" height="56" rx="8" fill="#0d1213" stroke="#3a3a3c" strokeWidth="2" />
        <rect x="92" y={SLOT_Y + 136} width="144" height="44" rx="4" fill="#0f1a16" />
        <text x="100" y={SLOT_Y + 154} fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="700" fill="#58f08a">
          {status}
        </text>
        <rect x="100" y={SLOT_Y + 164} width="128" height="7" rx="2" fill="#0a2016" stroke="#1d5a3a" />
        <rect x="101" y={SLOT_Y + 165} width={126 * feed} height="5" rx="1.5" fill="#58f08a" />

        {/* LEDs */}
        {[
          ["PWR", "#58f08a", true],
          ["BT", "#7aa2ff", true],
          ["PRINT", "#ffb454", printing],
        ].map(([l, c, on], i) => (
          <g key={l as string} transform={`translate(${268 + i * 34} ${SLOT_Y + 138})`}>
            {on && <circle r="9" fill={c as string} opacity=".4" filter="url(#glow)" />}
            <circle r="4.5" fill={on ? (c as string) : "#3a3a3c"} stroke="#222" />
            <text y="18" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="5.5" letterSpacing="1" fill="#7b7466">
              {l as string}
            </text>
          </g>
        ))}

        {/* big red button */}
        <circle cx="404" cy={SLOT_Y + 160} r="34" fill="#d8d1bf" stroke="#9b937f" />
        <circle cx="404" cy={SLOT_Y + 160} r="27" fill="url(#pr-btn)" stroke="#6a0f06" strokeWidth="1.5" />
        <ellipse cx="396" cy={SLOT_Y + 148} rx="14" ry="7" fill="#fff" opacity=".45" transform={`rotate(-30 396 ${SLOT_Y + 148})`} />
        <path d={`M396 ${SLOT_Y + 160}h16m-6 -6l6 6l-6 6`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />

        {/* ports, vents, feet */}
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={86 + i * 9} y={SLOT_Y + 200} width="4" height="18" rx="2" fill="#b5ad98" />
        ))}
        <rect x="320" y={SLOT_Y + 204} width="34" height="11" rx="5.5" fill="#1a1a1c" stroke="#777" />
        <text x="337" y={SLOT_Y + 223} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="5.5" letterSpacing="1" fill="#7b7466">
          USB-C
        </text>
        <rect x="70" y={SLOT_Y + 226} width="64" height="8" rx="3" fill="#1a1a1c" />
        <rect x="386" y={SLOT_Y + 226} width="64" height="8" rx="3" fill="#1a1a1c" />
      </g>
    </svg>
  );
}
