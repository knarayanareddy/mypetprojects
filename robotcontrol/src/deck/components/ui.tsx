import { ReactNode, useSyncExternalStore } from "react";
import { hub } from "../lib/hub";
import { cameras } from "../lib/cameras";

export function useHub() {
  useSyncExternalStore(hub.subscribe, hub.getVersion);
  return hub;
}
export function useCameras() {
  useSyncExternalStore(cameras.subscribe, cameras.getVersion);
  return cameras;
}

export function Card({ title, right, children, className = "" }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/20 ${className}`}>
      {(title || right) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h3>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

type Tone = "default" | "primary" | "danger" | "good" | "ghost";
const tones: Record<Tone, string> = {
  default: "bg-slate-800 text-slate-100 hover:bg-slate-700 border-slate-700",
  primary: "bg-orange-500 text-slate-950 hover:bg-orange-400 border-orange-400",
  danger: "bg-red-600 text-white hover:bg-red-500 border-red-500",
  good: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 border-emerald-400",
  ghost: "bg-transparent text-slate-300 hover:bg-slate-800 border-slate-700",
};
export function Btn({ tone = "default", className = "", ...p }: { tone?: Tone } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${className}`} />;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "red" | "amber" | "cyan" | "violet" }) {
  const t = { slate: "bg-slate-800 text-slate-300", green: "bg-emerald-500/15 text-emerald-300", red: "bg-red-500/15 text-red-300", amber: "bg-amber-500/15 text-amber-300", cyan: "bg-cyan-500/15 text-cyan-300", violet: "bg-violet-500/15 text-violet-300" }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${t}`}>{children}</span>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-xs text-slate-400">
      <span className="mb-1 block font-medium text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-slate-500">{hint}</span>}
    </label>
  );
}
export const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-orange-400";

export function Code({ children, copy = true }: { children: string; copy?: boolean }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 pr-16 text-[11px] leading-relaxed text-emerald-200">{children}</pre>
      {copy && (
        <button onClick={() => navigator.clipboard?.writeText(children)} className="absolute right-2 top-2 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700">copy</button>
      )}
    </div>
  );
}

export function download(name: string, text: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
