export function Loader({ progress, ready }: { progress: number; ready: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d0f12] text-washi transition-opacity duration-[1400ms] ${ready ? "pointer-events-none opacity-0" : "opacity-100"}`}
      aria-hidden={ready}
    >
      <div className="font-jp text-[clamp(40px,8vw,88px)] tracking-[0.4em] opacity-90" style={{ paddingLeft: "0.4em" }}>
        静寂
      </div>
      <div className="font-serif mt-2 text-[22px] italic text-washi/60">Seijaku</div>
      <div className="mt-10 h-px w-56 overflow-hidden bg-washi/15">
        <div className="h-full bg-[#f0b79f] transition-all duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <p className="eyebrow mt-4 text-[10px] text-washi/45">Raising the timber · {Math.round(progress * 100)}%</p>
    </div>
  );
}
