import { useState, type ReactNode } from "react";
import { cn } from "../utils/cn";

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  hint,
  fill = "#ff2b2b",
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  hint?: string;
  fill?: string;
  fmt?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.12em] text-white/60">{label}</span>
        <span className="font-mono text-[12px] text-white tabular-nums">
          {fmt ? fmt(value) : value}
          <span className="text-white/40">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        className="rng mt-1.5"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ ["--p" as string]: pct + "%", ["--fill" as string]: fill }}
      />
      {hint && <p className="mt-1 text-[10.5px] leading-snug text-white/35">{hint}</p>}
    </div>
  );
}

export function Toggle({
  label,
  value,
  onChange,
  hint,
  color = "#ff2b2b",
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-3 rounded-lg py-1.5 text-left"
    >
      <span>
        <span className="block text-[11px] uppercase tracking-[0.12em] text-white/70">{label}</span>
        {hint && <span className="block text-[10.5px] leading-snug text-white/35">{hint}</span>}
      </span>
      <span
        className="relative h-5 w-9 shrink-0 rounded-full border border-white/10 transition-colors"
        style={{ background: value ? color : "rgba(255,255,255,0.08)" }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
          style={{ left: value ? 18 : 2 }}
        />
      </span>
    </button>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  cols,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div
      className="grid gap-1 rounded-lg bg-white/[0.04] p-1"
      style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0,1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-md px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide transition-colors",
            value === o.id ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.07] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="flex items-center gap-2 font-display text-[15px] font-semibold uppercase tracking-[0.14em] text-white">
          {icon}
          {title}
          {badge && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] tracking-normal text-white/60">
              {badge}
            </span>
          )}
        </span>
        <span className={cn("text-white/50 transition-transform", open ? "rotate-180" : "")}>▾</span>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  sub,
  tone = "white",
  big,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "white" | "red" | "cyan" | "amber" | "green";
  big?: boolean;
}) {
  const col = { white: "#fff", red: "#ff5a4a", cyan: "#5fe0ff", amber: "#ffc23a", green: "#5dffa8" }[tone];
  return (
    <div className="min-w-0">
      <div className="truncate text-[9.5px] uppercase tracking-[0.14em] text-white/45">{label}</div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn("font-display font-bold leading-none tabular-nums", big ? "text-[34px]" : "text-[22px]")}
          style={{ color: col }}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-[10px] text-white/45">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-white/40">{sub}</div>}
    </div>
  );
}
