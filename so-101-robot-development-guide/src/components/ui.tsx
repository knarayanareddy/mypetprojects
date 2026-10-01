import { useState, type ReactNode } from 'react';

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="group relative overflow-hidden rounded-lg border border-white/10 bg-[#070a11]">
      {label && <div className="border-b border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500">{label}</div>}
      <pre className="overflow-x-auto p-3 pr-16 font-mono text-[12px] leading-relaxed text-emerald-200/90">{code}</pre>
      <button
        onClick={() => { navigator.clipboard?.writeText(code); setOk(true); setTimeout(() => setOk(false), 1200); }}
        className="absolute right-2 top-2 rounded bg-white/10 px-2 py-1 text-[11px] text-slate-200 opacity-70 transition hover:bg-white/20 group-hover:opacity-100"
      >
        {ok ? 'copied ✓' : 'copy'}
      </button>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>{children}</div>;
}

export function H2({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-bold tracking-tight text-white">{children}</h2>
      {sub && <p className="mt-1 max-w-3xl text-sm text-slate-400">{sub}</p>}
    </div>
  );
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'orange' | 'sky' | 'emerald' | 'violet' | 'amber' | 'rose' }) {
  const m = {
    slate: 'bg-white/10 text-slate-200', orange: 'bg-orange-500/20 text-orange-200', sky: 'bg-sky-500/20 text-sky-200', emerald: 'bg-emerald-500/20 text-emerald-200',
    violet: 'bg-violet-500/20 text-violet-200', amber: 'bg-amber-500/20 text-amber-200', rose: 'bg-rose-500/20 text-rose-200',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${m[tone]}`}>{children}</span>;
}
