import type { MutableRefObject } from "react";

export const LABELS: { id: string; title: string; text: string; side?: "l" | "r" }[] = [
  { id: "stag", title: "Stagnation point", text: "Air stops dead. Cp ≈ +1, the highest pressure on the car.", side: "l" },
  { id: "fwv", title: "Outwash vortex", text: "Front-wing tip vortex pushes the dirty tyre wake away.", side: "l" },
  { id: "tyre", title: "Tyre wake", text: "Spinning tyres are the biggest single source of drag.", side: "l" },
  { id: "airbox", title: "Airbox inlet", text: "Feeds the engine and turbo with clean, fast air." },
  { id: "edge", title: "Floor-edge vortex", text: "Seals the low-pressure underfloor from the side." },
  { id: "venturi", title: "Venturi tunnels", text: "Air accelerates, pressure drops, the car is sucked down." },
  { id: "undercut", title: "Sidepod undercut", text: "Channels fast air toward the diffuser." },
  { id: "diff", title: "Diffuser", text: "Expands and slows the underfloor flow, pulling more air under." },
  { id: "rw", title: "Rear wing", text: "An inverted wing: suction side faces the road." },
  { id: "wake", title: "Turbulent wake", text: "Slow, chaotic air that a chasing car drives into." },
];

export function Labels({
  refs,
  visible,
}: {
  refs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  visible: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[15] overflow-hidden" style={{ opacity: visible ? 1 : 0 }}>
      {LABELS.map((l) => (
        <div
          key={l.id}
          ref={(el) => {
            refs.current[l.id] = el;
          }}
          className="absolute left-0 top-0 opacity-0 transition-opacity duration-200"
          style={{ willChange: "transform" }}
        >
          <div className="relative">
            <span className="absolute -left-[5px] -top-[5px] h-[10px] w-[10px] rounded-full border border-white bg-[#ff2b2b] shadow-[0_0_12px_#ff2b2b]" />
            <span className="pulse-dot absolute -left-[9px] -top-[9px] h-[18px] w-[18px] rounded-full border border-[#ff2b2b]/60" />
            <div
              className="absolute top-0 h-px w-7 bg-white/50"
              style={l.side === "l" ? { right: 5 } : { left: 5 }}
            />
            <div
              className="absolute w-[168px] -translate-y-1/2 rounded-md border border-white/10 bg-black/60 px-2 py-1.5 backdrop-blur-md"
              style={l.side === "l" ? { right: 34, top: 0 } : { left: 34, top: 0 }}
            >
              <div className="font-display text-[12.5px] font-semibold uppercase tracking-[0.1em] text-white">
                {l.title}
              </div>
              <div className="text-[10px] leading-snug text-white/60">{l.text}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
