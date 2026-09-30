import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TowerEngine, STAGE_AT, type EngineState } from './engine/engine';
import { COUNTRIES, TIMES, WEATHERS } from './data';

const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtPop = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} billion` : `${m} million`);

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TowerEngine | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(11); // start on Japan, like the original study
  const [tod, setTod] = useState(0);
  const [wx, setWx] = useState(0);
  const [st, setSt] = useState<EngineState>({ p: 0, stage: 0, playing: true, done: false });
  const [hint, setHint] = useState(true);

  const country = COUNTRIES[idx];

  // engine lifecycle
  useEffect(() => {
    const eng = new TowerEngine(canvasRef.current!);
    eng.onState = setSt;
    engineRef.current = eng;
    eng.setTod(0);
    eng.setTower(11);
    return () => {
      eng.dispose();
      engineRef.current = null;
    };
  }, []);

  const pickCountry = useCallback((i: number) => {
    const n = (i + COUNTRIES.length) % COUNTRIES.length;
    setIdx(n);
    engineRef.current?.setTower(n);
  }, []);
  const pickTod = useCallback((i: number) => {
    const n = (i + TIMES.length) % TIMES.length;
    setTod(n);
    engineRef.current?.setTod(n);
  }, []);
  const pickWx = useCallback((i: number) => {
    const n = (i + WEATHERS.length) % WEATHERS.length;
    setWx(n);
    engineRef.current?.setWeather(n);
  }, []);

  // keep the active chip in view
  useEffect(() => {
    const el = railRef.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`);
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [idx]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' && e.key === ' ') return;
      const k = e.key.toLowerCase();
      if (k === ' ') {
        e.preventDefault();
        engineRef.current?.toggle();
      } else if (k === 'r') engineRef.current?.rebuild();
      else if (k === 'c') engineRef.current?.recenter();
      else if (k === 't') pickTod(tod + 1);
      else if (k === 'w') pickWx(wx + 1);
      else if (k === 'arrowright' || k === 's') pickCountry(idx + 1);
      else if (k === 'arrowleft') pickCountry(idx - 1);
      else return;
      setHint(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, tod, wx, pickCountry, pickTod, pickWx]);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 9000);
    return () => clearTimeout(t);
  }, []);

  const lightInk = tod >= 2 || wx === 2;
  const ink = lightInk ? '#f6efe2' : '#14202b';
  const panel = lightInk ? 'rgba(8,12,26,0.42)' : 'rgba(255,255,255,0.46)';
  const line = lightInk ? 'rgba(246,239,226,0.28)' : 'rgba(20,32,43,0.25)';
  const active = lightInk ? 'rgba(246,239,226,0.94)' : 'rgba(20,32,43,0.92)';
  const activeText = lightInk ? '#0d1424' : '#f6efe2';
  const shadow = lightInk ? '0 2px 24px rgba(0,0,0,0.35)' : '0 2px 24px rgba(255,255,255,0.35)';

  const pct = Math.round(st.p * 100);
  const caption = st.done ? 'COMPLETE' : country.stages[st.stage];
  const ticks = useMemo(() => STAGE_AT, []);

  const btn = (on: boolean): React.CSSProperties => ({
    background: on ? active : 'transparent',
    color: on ? activeText : ink,
    borderColor: on ? 'transparent' : line,
  });

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ color: ink, fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif" }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none cursor-grab active:cursor-grabbing" onPointerDown={() => setHint(false)} />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-7" style={{ textShadow: shadow }}>
        {/* top bar */}
        <div className="flex items-start justify-between gap-4">
          <div className="leading-tight">
            <div className="text-[11px] font-semibold tracking-[0.32em]">TOWERS</div>
            <div className="mt-1 text-[11px] tracking-[0.12em] opacity-70">TWENTY NATIONS · ONE CONSTRUCTION</div>
          </div>
          <div className="text-right">
            <div className="flex items-start justify-end" style={{ fontFamily: "'Instrument Serif', 'Cormorant Garamond', Georgia, serif" }}>
              <span className="text-[72px] leading-[0.85] tabular-nums sm:text-[132px]">{pct}</span>
              <span className="mt-1 text-2xl sm:mt-3 sm:text-5xl">%</span>
            </div>
            <div className="mt-2 text-[11px] font-semibold tracking-[0.28em] sm:text-xs">{caption}</div>
            <div className="mt-1 text-[10px] tracking-[0.2em] opacity-60">
              STAGE {Math.min(4, st.stage + 1)} / 4
            </div>
          </div>
        </div>

        {/* headline */}
        <div className="absolute left-4 top-[84px] max-w-[60%] sm:left-7 sm:top-auto sm:bottom-[230px] sm:max-w-[30rem]">
          <div className="text-[11px] font-semibold tracking-[0.3em] opacity-80">
            No. {pad2(country.rank)} / 20 · {country.code}
          </div>
          <h1
            className="mt-1 text-[44px] leading-[0.92] sm:text-[92px]"
            style={{ fontFamily: "'Instrument Serif', 'Cormorant Garamond', Georgia, serif", letterSpacing: '-0.01em' }}
          >
            {country.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xl sm:text-3xl" style={{ fontFamily: "'Noto Serif', 'Noto Sans', serif" }}>
              {country.native}
            </span>
            <span className="text-[11px] font-semibold tracking-[0.22em] opacity-80 uppercase">{country.tower}</span>
          </div>
          <div className="mt-2 text-[11px] tracking-[0.16em] opacity-70">POPULATION ≈ {fmtPop(country.pop).toUpperCase()}</div>
          <p className="mt-3 hidden max-w-sm text-[13px] leading-relaxed opacity-85 sm:block">{country.blurb}</p>
        </div>

        {/* bottom controls */}
        <div className="pointer-events-auto flex flex-col gap-2.5" style={{ textShadow: 'none' }}>
          {hint && (
            <div className="pointer-events-none self-center rounded-full px-4 py-1.5 text-[11px] tracking-[0.14em]" style={{ background: panel, backdropFilter: 'blur(10px)' }}>
              DRAG TO ORBIT · SCROLL TO ZOOM · ← → CHANGE COUNTRY · SPACE PAUSE
            </div>
          )}

          {/* country rail */}
          <div className="rounded-2xl p-1.5" style={{ background: panel, backdropFilter: 'blur(14px)', border: `1px solid ${line}` }}>
            <div ref={railRef} className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {COUNTRIES.map((c, i) => (
                <button
                  key={c.id}
                  data-i={i}
                  onClick={() => pickCountry(i)}
                  className="shrink-0 cursor-pointer rounded-xl border px-3 py-1.5 text-left transition-colors"
                  style={btn(i === idx)}
                  aria-pressed={i === idx}
                >
                  <div className="text-[9px] font-semibold tracking-[0.22em] opacity-70">{pad2(c.rank)} · {c.code}</div>
                  <div className="text-[13px] font-medium leading-tight whitespace-nowrap">{c.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* timeline + pickers */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="flex flex-1 items-center gap-3 rounded-2xl px-3 py-2" style={{ background: panel, backdropFilter: 'blur(14px)', border: `1px solid ${line}` }}>
              <button
                onClick={() => engineRef.current?.toggle()}
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border"
                style={{ background: active, color: activeText, borderColor: 'transparent' }}
                aria-label={st.playing ? 'Pause' : st.done ? 'Replay' : 'Play'}
              >
                {st.playing ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="1" width="3.5" height="12" rx="1" /><rect x="8.5" y="1" width="3.5" height="12" rx="1" /></svg>
                ) : st.done ? (
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M13.5 8a5.5 5.5 0 1 1-1.8-4.1" /><path d="M13.6 2v3.2h-3.2" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5v11l9-5.5z" /></svg>
                )}
              </button>
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ background: line }} />
                <div className="pointer-events-none absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ width: `${st.p * 100}%`, background: ink }} />
                {ticks.map((t) => (
                  <div key={t} className="pointer-events-none absolute top-1/2 h-2.5 w-px -translate-y-1/2" style={{ left: `${t * 100}%`, background: ink, opacity: 0.45 }} />
                ))}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={st.p}
                  onChange={(e) => engineRef.current?.seek(parseFloat(e.target.value))}
                  className="tl relative z-10 h-6 w-full cursor-pointer"
                  style={{ color: ink }}
                  aria-label="Construction timeline"
                />
              </div>
              <button onClick={() => engineRef.current?.rebuild()} className="shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em]" style={{ borderColor: line }}>
                REBUILD
              </button>
            </div>

            <div className="flex gap-2">
              <Segment label="TIME" items={TIMES} value={tod} onPick={pickTod} panel={panel} line={line} btn={btn} />
              <Segment label="WEATHER" items={WEATHERS} value={wx} onPick={pickWx} panel={panel} line={line} btn={btn} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Segment({
  label,
  items,
  value,
  onPick,
  panel,
  line,
  btn,
}: {
  label: string;
  items: readonly string[];
  value: number;
  onPick: (i: number) => void;
  panel: string;
  line: string;
  btn: (on: boolean) => React.CSSProperties;
}) {
  return (
    <div className="flex-1 rounded-2xl px-2 py-1.5 sm:flex-none" style={{ background: panel, backdropFilter: 'blur(14px)', border: `1px solid ${line}` }}>
      <div className="px-1 pb-1 text-[9px] font-semibold tracking-[0.26em] opacity-70">{label}</div>
      <div className="flex gap-1">
        {items.map((it, i) => (
          <button
            key={it}
            onClick={() => onPick(i)}
            className="flex-1 cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors sm:flex-none"
            style={btn(i === value)}
            aria-pressed={i === value}
          >
            {it}
          </button>
        ))}
      </div>
    </div>
  );
}
