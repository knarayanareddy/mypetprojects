import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller } from "./three/controller";
import { DEFAULTS, computeAero, type Params, type ViewName } from "./lib/aero";
import { IDX, TOTAL, locate } from "./lib/timeline";
import { Story, TopNav } from "./components/Story";
import { TunnelUI } from "./components/TunnelUI";
import { Labels } from "./components/Labels";

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<Controller | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const paramsRef = useRef<Params>(DEFAULTS);

  const [beat, setBeat] = useState(0);
  const [tq, setTq] = useState(0);
  const [tunnel, setTunnel] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [params, setParams] = useState<Params>(DEFAULTS);

  const aero = useMemo(() => computeAero(params), [params]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let c: Controller | null = null;
    let lastQ = -1;
    try {
      c = new Controller(host, {
        onBeat: (b) => setBeat(b),
        onFrame: (s) => {
          if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, s / TOTAL).toFixed(4)})`;
          const q = Math.round(locate(s).t * 20) / 20;
          if (q !== lastQ) {
            lastQ = q;
            setTq(q);
          }
        },
        onTunnel: (a) => setTunnel(a),
        onLabels: (list) => {
          for (const l of list) {
            const el = labelRefs.current[l.id];
            if (!el) continue;
            el.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0)`;
            el.style.opacity = l.v ? "1" : "0";
          }
        },
        onReady: () => setReady(true),
      });
      c.setParams(paramsRef.current);
      ctrlRef.current = c;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "WebGL is not available");
    }
    return () => {
      c?.dispose();
      ctrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    paramsRef.current = params;
    ctrlRef.current?.setParams(params);
  }, [params]);

  const set = useCallback((patch: Partial<Params>) => setParams((p) => ({ ...p, ...patch })), []);
  const jump = useCallback((idx: number) => ctrlRef.current?.scrollToBeat(idx), []);

  return (
    <div className="relative min-h-screen bg-[#07080b]">
      <div ref={hostRef} className="fixed inset-0 z-0" />

      {/* scroll space */}
      <div className="pointer-events-none relative z-[1]" style={{ height: `${(TOTAL + 1) * 100}vh` }} />

      <TopNav beat={beat} onJump={jump} barRef={barRef} />
      <Story beat={beat} t={tq} />

      <Labels refs={labelRefs} visible={tunnel} />
      {tunnel && (
        <TunnelUI
          params={params}
          set={set}
          aero={aero}
          onView={(v: ViewName) => ctrlRef.current?.setView(v)}
          onZoom={(f) => ctrlRef.current?.zoom(f)}
          onResetFlow={() => ctrlRef.current?.resetFlow()}
          onBack={() => ctrlRef.current?.scrollToBeat(IDX.rebuildIntro)}
        />
      )}

      {/* loader */}
      <div
        className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07080b] transition-opacity duration-700"
        style={{ opacity: ready && !err ? 0 : 1, visibility: ready && !err ? "hidden" : "visible", transitionProperty: "opacity, visibility" }}
      >
        <span className="block h-6 w-6 -skew-x-12 animate-pulse bg-[#ff2b2b]" />
        <p className="mt-4 font-display text-xl font-bold uppercase tracking-[0.3em] text-white">
          {err ? "WebGL unavailable" : "Laying out the parts"}
        </p>
        {err && <p className="mt-2 max-w-sm px-6 text-center text-sm text-white/50">{err}</p>}
      </div>
    </div>
  );
}
