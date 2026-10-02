"use client";

import type { ReactNode } from "react";

export function Card({ title, children, right, className = "" }: { title?: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-slate-900/70 p-4 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-300">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

type BtnProps = { children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost" | "danger" | "warn" | "ok"; disabled?: boolean; small?: boolean; title?: string };
export function Btn({ children, onClick, kind = "ghost", disabled, small, title }: BtnProps) {
  const k = {
    primary: "bg-cyan-500 text-slate-950 hover:bg-cyan-400",
    ghost: "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
    warn: "bg-amber-500 text-slate-950 hover:bg-amber-400",
    ok: "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
  }[kind];
  return (
    <button title={title} disabled={disabled} onClick={onClick} className={`rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${k}`}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "red" | "amber" | "cyan" | "violet" }) {
  const t = {
    slate: "bg-slate-800 text-slate-300",
    green: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    red: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    amber: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    cyan: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",
    violet: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
  }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${t}`}>{children}</span>;
}

export function Num({ label, value, onChange, step = 1, min, max, w = "w-20" }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; w?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${w} rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100`}
      />
    </label>
  );
}

export function Code({ children }: { children: string }) {
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-emerald-200">{children}</pre>
      <button onClick={() => navigator.clipboard?.writeText(children)} className="absolute right-2 top-2 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 opacity-0 transition group-hover:opacity-100">
        copy
      </button>
    </div>
  );
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-sm text-slate-300">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">{i + 1}</span>
          <div>{it}</div>
        </li>
      ))}
    </ol>
  );
}
