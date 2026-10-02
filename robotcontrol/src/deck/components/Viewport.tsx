import { useEffect, useRef, useState } from "react";
import { ARM_BASE, Cam, L, V3, fk, project } from "../lib/kin";
import { ARMS, ArmId, Obj, hub } from "../lib/hub";

const ARM_COL: Record<ArmId, string> = { A: "#f97316", B: "#14b8a6" };

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * k)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * k)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * k)));
  return `rgb(${r},${g},${b})`;
}

export function Viewport({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cam = useRef<Cam>({ yaw: 0.0, pitch: 0.62, zoom: 1.35 });
  const [, setTick] = useState(0);
  const [showReal, setShowReal] = useState(true);
  const showRealRef = useRef(true);
  showRealRef.current = showReal;

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    let w = 0, h = 0;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      cv.width = Math.max(1, Math.floor(w * dpr)); cv.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();

    const P = (p: V3) => project(p, cam.current, w, h);
    const poly = (pts: V3[], fill: string, stroke?: string, lw = 1) => {
      ctx.beginPath();
      pts.forEach((p, i) => { const s = P(p); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); });
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    };
    const rect = (cx: number, y: number, cz: number, ww: number, dd: number, fill: string, stroke?: string, rot = 0) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      const pts: V3[] = [[-ww / 2, -dd / 2], [ww / 2, -dd / 2], [ww / 2, dd / 2], [-ww / 2, dd / 2]].map(([x, z]) => [cx + x * c - z * s, y, cz + x * s + z * c] as V3);
      poly(pts, fill, stroke);
    };
    const ring = (cx: number, y: number, cz: number, r: number, n = 22): V3[] => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r] as V3; });
    const cyl = (cx: number, y0: number, cz: number, r0: number, r1: number, hgt: number, col: string, slices = 5) => {
      for (let i = 0; i < slices; i++) {
        const t = i / slices, r = r0 + (r1 - r0) * t;
        poly(ring(cx, y0 + hgt * t, cz, r), shade(col, 0.7 + 0.25 * t), shade(col, 0.55), 0.5);
      }
      poly(ring(cx, y0 + hgt, cz, r1), shade(col, 1.1), shade(col, 0.5), 0.8);
    };
    const box = (cx: number, cy: number, cz: number, bw: number, bh: number, bd: number, col: string) => {
      const x0 = cx - bw / 2, x1 = cx + bw / 2, y0 = cy - bh / 2, y1 = cy + bh / 2, z0 = cz - bd / 2, z1 = cz + bd / 2;
      const faces: [V3[], number][] = [
        [[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 0.85],
        [[[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], 0.65],
        [[[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], 0.6],
        [[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], 1.15],
      ];
      for (const [f, k] of faces) poly(f, shade(col, k), shade(col, 0.45), 0.8);
    };
    const line3 = (a: V3, b: V3, widthCm: number, col: string, outline?: string) => {
      const pa = P(a), pb = P(b);
      ctx.lineCap = "round";
      if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = widthCm * pa[2] + 3; ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke(); }
      ctx.strokeStyle = col; ctx.lineWidth = widthCm * pa[2]; ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    };
    const text = (t: string, p: V3, size = 11, col = "#e2e8f0", dy = 0) => {
      const s = P(p); ctx.font = `600 ${size}px ui-sans-serif, system-ui`; ctx.textAlign = "center"; ctx.fillStyle = col; ctx.fillText(t, s[0], s[1] + dy);
    };

    const drawFlat = (o: Obj) => {
      const [x, , z] = o.pos;
      const ww = o.w ?? o.size, dd = o.d ?? o.size;
      switch (o.kind) {
        case "pad": rect(x, 0.02, z, ww, dd, shade(o.color, 0.55), o.color); if (o.label) text(o.label, [x, 0, z + dd / 2 + 2], 10, "#94a3b8"); break;
        case "bin": rect(x, 0.02, z, ww, dd, shade(o.color, 0.35), o.color); rect(x, 0.03, z, ww - 1.6, dd - 1.6, shade(o.color, 0.22)); break;
        case "paper": rect(x, 0.03, z, ww, dd, "#f1f5f9", "#cbd5e1"); break;
        case "tray": rect(x, 0.03, z, ww, dd, "#334155", "#64748b"); break;
        case "board": {
          const n = o.id === "grid" ? 3 : 8;
          if (n === 8) {
            const cw = ww / 8;
            for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) rect(x - ww / 2 + cw * (i + 0.5), 0.02, z - dd / 2 + cw * (j + 0.5), cw, cw, (i + j) % 2 ? "#92400e" : "#fde68a");
          } else {
            rect(x, 0.02, z, ww, dd, "#1e293b", "#94a3b8");
            for (let i = 1; i < 3; i++) {
              const a = P([x - ww / 2 + (ww / 3) * i, 0.04, z - dd / 2]), b = P([x - ww / 2 + (ww / 3) * i, 0.04, z + dd / 2]);
              const c2 = P([x - ww / 2, 0.04, z - dd / 2 + (dd / 3) * i]), d2 = P([x + ww / 2, 0.04, z - dd / 2 + (dd / 3) * i]);
              ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(c2[0], c2[1]); ctx.lineTo(d2[0], d2[1]); ctx.stroke();
            }
          }
          break;
        }
        case "plant": {
          cyl(x, 0, z, 2, 2.6, 2.6, "#b45309", 2);
          const g = 0.8 + (o.state ?? 0) * 0.9;
          for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; line3([x, 2.6, z], [x + Math.cos(a) * 2.6 * g, 2.6 + 3.2 * g, z + Math.sin(a) * 2.6 * g], 1.5, i % 2 ? "#22c55e" : "#16a34a"); }
          break;
        }
        case "button": {
          const on = (o.state ?? 0) > 0;
          cyl(x, 0, z, 1.9, 1.7, on ? 0.5 : 0.9, on ? "#22c55e" : o.color, 2);
          if (o.label) text(o.label, [x, 0, z - 3], 10, on ? "#4ade80" : "#cbd5e1");
          break;
        }
        case "bar": rect(x, 0.2, z, ww, dd, shade(o.color, 0.95), shade(o.color, 0.5)); text(o.label ?? "", [x, 0.3, z - dd / 2 - 1], 11, "#e2e8f0"); break;
        case "drum": poly(ring(x, 0.3, z, ww / 2), shade(o.color, 0.8), o.color, 2); poly(ring(x, 0.35, z, ww / 2 - 1.2), shade(o.color, 0.45)); break;
        case "slot": rect(x, 0.04, z, ww, dd, "#475569", "#94a3b8"); text(o.label ?? "", [x, 0, z + dd / 2 + 1.8], 9, "#94a3b8"); break;
        case "stage": {
          poly(ring(x, 0.3, z, ww / 2, 36), "#475569", "#94a3b8", 1.5);
          const a0 = o.state ?? 0;
          for (let i = 0; i < 4; i++) { const a = a0 + (i * Math.PI) / 2; line3([x, 0.4, z], [x + Math.cos(a) * ww / 2.4, 0.4, z + Math.sin(a) * ww / 2.4], 0.9, "#cbd5e1"); }
          break;
        }
        case "knob": {
          cyl(x, 0, z, 2.4, 2.2, 1.6, "#92400e", 2);
          const a = ((o.state ?? 0) * 1.6 * Math.PI) / 180;
          line3([x, 1.7, z], [x + Math.cos(a) * 2.2, 1.7, z + Math.sin(a) * 2.2], 0.6, "#fde68a");
          break;
        }
        case "cloth": {
          const L1 = o.state ?? 0, R1 = o.tilt ?? 0, t3 = ww / 3;
          const xl = x - ww / 2 + L1 * t3, xr = x + ww / 2 - R1 * t3;
          rect((xl + xr) / 2, 0.04, z, xr - xl, dd, o.color, shade(o.color, 0.6));
          if (L1 > 0) rect(xl + (t3 * (1 - 0)) / 2 * 0 + t3 / 2 + (-0), 0.09, z, t3, dd, shade(o.color, 0.88), shade(o.color, 0.6));
          if (R1 > 0) rect(xr - t3 / 2, 0.14, z, t3, dd, shade(o.color, 0.8), shade(o.color, 0.6));
          break;
        }
      }
    };

    const draw3D = (o: Obj) => {
      const [x, y, z] = o.pos;
      const s = o.size;
      const sh = P([x, 0, z]);
      ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], Math.max(3, s * 0.6 * sh[2]), Math.max(2, s * 0.25 * sh[2]), 0, 0, 7); ctx.fill();
      const b = y - s / 2;
      switch (o.kind) {
        case "cube": box(x, y, z, s, s, s, o.color); break;
        case "die": box(x, y, z, s, s, s, o.color); text(o.label ?? "?", [x, y + s / 2 + 0.2, z], 14, "#0f172a", 5); break;
        case "ball": case "candy": {
          if (o.state === 9 && hub.objects.some((u) => u.kind === "cup" && !u.held && Math.hypot(u.pos[0] - x, u.pos[2] - z) < 2.5)) break;
          const p = P([x, y, z]); const r = (s / 2) * p[2];
          const g = ctx.createRadialGradient(p[0] - r * 0.3, p[1] - r * 0.3, r * 0.1, p[0], p[1], r);
          g.addColorStop(0, shade(o.color, 1.35)); g.addColorStop(1, shade(o.color, 0.65));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill(); break;
        }
        case "cup": {
          cyl(x, b, z, s * 0.38, s * 0.5, s, o.color, 5);
          if (o.state && o.state > 0) poly(ring(x, b + s * 0.15 + s * 0.65 * Math.min(1, o.state), z, s * 0.46), "#60a5fa");
          break;
        }
        case "bottle": {
          ctx.save();
          cyl(x, b, z, s * 0.18, s * 0.18, s * 0.7, o.color, 4);
          cyl(x, b + s * 0.7, z, s * 0.18, s * 0.07, s * 0.3, o.color, 3);
          ctx.restore(); break;
        }
        case "tube": cyl(x, b, z, s * 0.14, s * 0.14, s, o.color, 4); break;
        case "piece": cyl(x, b, z, s * 0.3, s * 0.18, s * 0.7, o.color, 3); { const p = P([x, b + s * 0.85, z]); ctx.fillStyle = shade(o.color, 1.05); ctx.beginPath(); ctx.arc(p[0], p[1], s * 0.2 * p[2], 0, 7); ctx.fill(); } break;
        case "tile": cyl(x, b, z, s * 0.7, s * 0.7, s * 0.5, o.color, 2); break;
        case "card": rect(x, y, z, o.w ?? 4, o.d ?? 6, o.color, "#0f172a"); break;
        case "phone": box(x, y, z, 3.4, 0.8, 6.5, o.color); break;
        case "pen": case "spoon": case "laser": {
          const t = ((o.tilt ?? 0) * Math.PI) / 180 * 0;
          const held = !!o.held;
          const a: V3 = held ? [x, y + s * 0.5, z] : [x - s / 2, 0.8, z], c2: V3 = held ? [x, y - s * 0.5, z] : [x + s / 2, 0.8, z];
          void t;
          line3(a, c2, 1.1, o.kind === "spoon" ? "#cbd5e1" : o.color, "#0f172a");
          if (o.kind === "laser") { const p = P(c2); ctx.fillStyle = "#fecaca"; ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 7); ctx.fill(); }
          break;
        }
        default: box(x, y, z, s, s, s, o.color);
      }
    };

    const drawArm = (id: ArmId, pose: number[], col: string, alpha = 1, ghost = false) => {
      const f = fk(pose, ARM_BASE[id]);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (ghost) ctx.setLineDash([5, 4]);
      const [b0, sh, el, wr, tip] = f.pts;
      if (!ghost) { cyl(b0[0], 0, b0[2], 5, 4.4, L.base * 0.55, "#334155", 3); }
      line3(b0, sh, 5.8, ghost ? "rgba(34,211,238,.35)" : "#475569", ghost ? "#22d3ee" : "#0f172a");
      line3(sh, el, 5.2, ghost ? "rgba(34,211,238,.35)" : col, ghost ? "#22d3ee" : "#0f172a");
      line3(el, wr, 4.4, ghost ? "rgba(34,211,238,.35)" : shade(col, 0.9), ghost ? "#22d3ee" : "#0f172a");
      line3(wr, tip, 3.6, ghost ? "rgba(34,211,238,.35)" : "#e2e8f0", ghost ? "#22d3ee" : "#0f172a");
      line3(tip, f.jaw.a, 1.4, ghost ? "#22d3ee" : "#111827");
      line3(tip, f.jaw.b, 1.4, ghost ? "#22d3ee" : "#111827");
      if (!ghost) for (const j of [sh, el, wr]) { const p = P(j); ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(p[0], p[1], 3.2 * p[2] * 0.5 + 2, 0, 7); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], 3.2 * p[2] * 0.3 + 1, 0, 7); ctx.fill(); }
      ctx.restore();
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!w || !h) return;
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0b1220"); bg.addColorStop(1, "#111c33");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      // table
      poly([[-36, 0, -26], [36, 0, -26], [36, 0, 22], [-36, 0, 22]], "#1e293b", "#334155", 2);
      ctx.strokeStyle = "rgba(148,163,184,.12)"; ctx.lineWidth = 1;
      for (let x = -35; x <= 35; x += 5) { const a = P([x, 0, -26]), b = P([x, 0, 22]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      for (let z = -25; z <= 21; z += 5) { const a = P([-36, 0, z]), b = P([36, 0, z]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      // reach rings
      for (const id of ARMS) {
        const bs = ARM_BASE[id];
        ctx.strokeStyle = id === "A" ? "rgba(249,115,22,.22)" : "rgba(20,184,166,.22)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i <= 48; i++) { const a = -Math.PI * 0.62 + (i / 48) * Math.PI * 1.24; const p = P([bs[0] + Math.sin(a) * 24, 0, bs[2] - Math.cos(a) * 24]); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.stroke(); ctx.setLineDash([]);
      }
      const objs = hub.objects;
      objs.filter((o) => ["pad", "bin", "paper", "tray", "board", "slot", "stage", "bar", "drum", "cloth"].includes(o.kind)).forEach(drawFlat);
      // trails
      for (const t of hub.trails) {
        if (t.pts.length < 2) continue;
        ctx.strokeStyle = t.color === "#ef4444" ? "rgba(239,68,68,.9)" : t.color; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.beginPath();
        t.pts.forEach((p, i) => { const s = P(p); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); });
        ctx.stroke();
      }
      objs.filter((o) => ["plant", "button", "knob"].includes(o.kind)).sort((a, b) => a.pos[2] - b.pos[2]).forEach(drawFlat);
      const solids = objs.filter((o) => !["pad", "bin", "paper", "tray", "board", "slot", "stage", "bar", "drum", "cloth", "plant", "button", "knob"].includes(o.kind));
      solids.sort((a, b) => a.pos[2] - b.pos[2] || a.pos[1] - b.pos[1]).forEach(draw3D);
      // arms
      for (const id of ARMS) {
        const real = hub.realPose(id);
        if (showRealRef.current && real && hub.hasReal(id)) drawArm(id, real, "#22d3ee", 0.9, true);
        drawArm(id, hub.arms[id].sim, ARM_COL[id]);
        const f = fk(hub.arms[id].sim, ARM_BASE[id]);
        text(id === "A" ? "ARM A" : "ARM B", [ARM_BASE[id][0], 0, ARM_BASE[id][2] + 6], 11, ARM_COL[id]);
        void f;
      }
      // overlays
      if (hub.flashUntil > performance.now()) { ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(0, 0, w, h); }
      if (hub.caption) {
        ctx.font = "600 14px ui-sans-serif, system-ui"; ctx.textAlign = "center";
        const tw = ctx.measureText(hub.caption).width + 28;
        ctx.fillStyle = "rgba(2,6,23,.75)"; ctx.beginPath(); ctx.roundRect(w / 2 - tw / 2, h - 46, tw, 30, 15); ctx.fill();
        ctx.fillStyle = "#f8fafc"; ctx.fillText(hub.caption, w / 2, h - 26);
      }
      if (hub.estopped) {
        ctx.fillStyle = "rgba(220,38,38,.18)"; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#fecaca"; ctx.font = "800 22px ui-sans-serif, system-ui"; ctx.textAlign = "center"; ctx.fillText("EMERGENCY STOP", w / 2, 44);
      }
    };
    raf = requestAnimationFrame(loop);

    let drag: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      cam.current.yaw += (e.clientX - drag.x) * 0.006;
      cam.current.pitch = Math.min(1.5, Math.max(0.1, cam.current.pitch + (e.clientY - drag.y) * 0.005));
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => { drag = null; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); cam.current.zoom = Math.min(3, Math.max(0.6, cam.current.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up);
    cv.addEventListener("wheel", wheel, { passive: false });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); cv.removeEventListener("wheel", wheel); };
  }, []);

  const preset = (yaw: number, pitch: number) => { cam.current.yaw = yaw; cam.current.pitch = pitch; setTick((t) => t + 1); };
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950 ${className}`}>
      <canvas ref={ref} className="h-full w-full cursor-grab touch-none active:cursor-grabbing" />
      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 text-[11px]">
        {[["Front", 0, 0.62], ["Top", 0, 1.45], ["Side", 1.2, 0.35], ["Iso", 0.7, 0.7]].map(([n, y, p]) => (
          <button key={n as string} onClick={() => preset(y as number, p as number)} className="rounded-md bg-slate-800/80 px-2 py-1 text-slate-200 hover:bg-slate-700">{n}</button>
        ))}
        <label className="flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-1 text-slate-200">
          <input type="checkbox" checked={showReal} onChange={(e) => setShowReal(e.target.checked)} /> real-arm ghost
        </label>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 text-right text-[10px] text-slate-400">drag = orbit · wheel = zoom<br />Space = E-STOP</div>
    </div>
  );
}
