import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Page, PW, PH } from './Page';
import { LEAVES as L, type Story } from './types';
import type { Anim } from './useAnim';

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** Horizontal shift that centres the book when it is closed (front or back). */
export const shiftFor = (pos: number) =>
  (-PW / 2) * clamp(1 - pos, 0, 1) + (PW / 2) * clamp(pos - (L - 1), 0, 1);

type StripProps = {
  k: number;
  n: number;
  sw: number;
  base: number;
  d: number;
  front: ReactNode;
  back: ReactNode;
  castF: number;
  castB: number;
};

const faceBase: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

/** One vertical strip of a leaf. Strips nest, each rotating a little further, so the paper bends. */
function Strip({ k, n, sw, base, d, front, back, castF, castB }: StripProps) {
  const abs = base + k * d;
  const rad = (Math.abs(abs) * Math.PI) / 180;
  const shade = 0.34 * Math.sin(rad);
  const spec = Math.max(0, Math.sin(rad * 2 - 0.6)) * 0.16;
  const w = k < n - 1 ? sw + 1 : sw;
  return (
    <div
      style={{
        position: 'absolute',
        left: k === 0 ? 0 : sw,
        top: 0,
        width: w,
        height: PH,
        transformOrigin: '0 50%',
        transformStyle: 'preserve-3d',
        transform: k === 0 ? undefined : `rotateY(${d}deg)`,
      }}
    >
      <div style={faceBase}>
        <div style={{ position: 'absolute', left: -k * sw, top: 0, width: PW, height: PH }}>{front}</div>
        <div style={{ position: 'absolute', inset: 0, background: `rgba(38,20,4,${shade})` }} />
        {spec > 0.004 && <div style={{ position: 'absolute', inset: 0, background: `rgba(255,248,230,${spec})` }} />}
        {castF > 0.004 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to right, rgba(35,18,0,${castF}), rgba(35,18,0,${castF * 0.3}) 35%, transparent 70%)`,
            }}
          />
        )}
      </div>
      <div style={{ ...faceBase, transform: 'rotateY(180deg)' }}>
        <div style={{ position: 'absolute', left: -(PW - (k + 1) * sw), top: 0, width: PW, height: PH }}>{back}</div>
        <div style={{ position: 'absolute', inset: 0, background: `rgba(38,20,4,${shade})` }} />
        {spec > 0.004 && <div style={{ position: 'absolute', inset: 0, background: `rgba(255,248,230,${spec})` }} />}
        {castB > 0.004 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to left, rgba(35,18,0,${castB}), rgba(35,18,0,${castB * 0.3}) 35%, transparent 70%)`,
            }}
          />
        )}
      </div>
      {k < n - 1 && (
        <Strip k={k + 1} n={n} sw={sw} base={base} d={d} front={front} back={back} castF={0} castB={0} />
      )}
    </div>
  );
}

function Leaf({ i, pos, story, castF, castB }: { i: number; pos: number; story: Story; castF: number; castB: number }) {
  const t = clamp(pos - i, 0, 1);
  const moving = t > 0.0004 && t < 0.9996;
  const n = moving ? 6 : 1;
  const base = -180 * t;
  const d = moving ? (34 / n) * Math.sin(2 * Math.PI * t) : 0;
  const z = (2 * t - 1) * i * 0.3;
  const front = <Page story={story} n={2 * i} />;
  const back = <Page story={story} n={2 * i + 1} />;
  return (
    <div
      style={{
        position: 'absolute',
        left: PW,
        top: 0,
        width: PW,
        height: PH,
        transformOrigin: '0 50%',
        transformStyle: 'preserve-3d',
        transform: `translateZ(${z}px) rotateY(${base}deg)`,
      }}
    >
      <Strip
        k={0}
        n={n}
        sw={PW / n}
        base={base}
        d={d}
        front={front}
        back={back}
        castF={moving ? 0 : castF}
        castB={moving ? 0 : castB}
      />
    </div>
  );
}

type Drag = {
  dir: 1 | -1;
  leaf: number;
  tx0: number;
  t: number;
  rectLeft: number;
  startX: number;
  startTime: number;
  samples: { x: number; t: number }[];
  moved: boolean;
  id: number;
};

const R = 88; // lens radius
const Z = 2.3; // lens zoom

export function Flipbook({
  story,
  anim,
  scale,
  lensOn,
}: {
  story: Story;
  anim: Anim;
  scale: number;
  lensOn: boolean;
}) {
  const pos = anim.v;
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState(false);
  const [lens, setLens] = useState({ x: PW * 1.55, y: PH * 0.72 });
  const lensDrag = useRef<{ dx: number; dy: number } | null>(null);

  const rounded = Math.round(pos);
  const idle = Math.abs(pos - rounded) < 0.003 && !dragging;
  const shift = shiftFor(pos);

  const solve = (d: Drag, clientX: number) => {
    let t = d.t;
    for (let it = 0; it < 4; it++) {
      const sx = d.rectLeft + (PW + shiftFor(d.leaf + t)) * scale;
      const x = (clientX - sx) / scale;
      const tx = Math.acos(clamp(x / PW, -1, 1)) / Math.PI;
      t = d.dir === 1 ? (tx - d.tx0) / (1 - d.tx0) : tx / d.tx0;
      t = clamp(t, 0, 1);
    }
    return t;
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (anim.animating.current) return;
    const p = Math.round(anim.vr.current);
    const rect = stageRef.current!.getBoundingClientRect();
    const spineX = rect.left + (PW + shiftFor(p)) * scale;
    const x0 = (e.clientX - spineX) / scale;
    const dir: 1 | -1 = x0 >= 0 ? 1 : -1;
    if (dir === 1 && p >= L) return;
    if (dir === -1 && p <= 0) return;
    const tx0 = Math.acos(clamp(x0 / PW, -1, 1)) / Math.PI;
    drag.current = {
      dir,
      leaf: dir === 1 ? p : p - 1,
      tx0: dir === 1 ? Math.min(tx0, 0.98) : Math.max(tx0, 0.02),
      t: dir === 1 ? 0 : 1,
      rectLeft: rect.left,
      startX: e.clientX,
      startTime: performance.now(),
      samples: [{ x: e.clientX, t: performance.now() }],
      moved: false,
      id: e.pointerId,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (Math.abs(e.clientX - d.startX) > 5) d.moved = true;
    if (!d.moved) return;
    const t = solve(d, e.clientX);
    d.t = t;
    anim.set(d.leaf + t);
    const now = performance.now();
    d.samples.push({ x: e.clientX, t: now });
    while (d.samples.length > 2 && now - d.samples[0].t > 140) d.samples.shift();
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const vx = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    const toward = -d.dir * vx; // > 0 means moving in the direction that completes the turn
    let complete: boolean;
    if (!d.moved) complete = true;
    else if (toward > 0.35) complete = true;
    else if (toward < -0.35) complete = false;
    else complete = d.dir === 1 ? d.t > 0.5 : d.t < 0.5;
    const target = d.dir === 1 ? (complete ? d.leaf + 1 : d.leaf) : complete ? d.leaf : d.leaf + 1;
    const dist = Math.abs(target - anim.vr.current);
    anim.to(target, 280 + 520 * dist);
  };

  // ---- lens
  const onLensDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = stageRef.current!.getBoundingClientRect();
    lensDrag.current = {
      dx: (e.clientX - rect.left) / scale - lens.x,
      dy: (e.clientY - rect.top) / scale - lens.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onLensMove = (e: PointerEvent<HTMLDivElement>) => {
    const ld = lensDrag.current;
    if (!ld) return;
    const rect = stageRef.current!.getBoundingClientRect();
    setLens({
      x: clamp((e.clientX - rect.left) / scale - ld.dx, -60, 2 * PW + 60),
      y: clamp((e.clientY - rect.top) / scale - ld.dy, -40, PH + 60),
    });
  };
  const onLensUp = () => {
    lensDrag.current = null;
  };

  // ---- leaves
  const i0 = Math.floor(pos);
  const t0 = pos - i0;
  const castActive = t0 > 0.0005 && i0 < L;
  const cast = Math.sin(Math.PI * t0);
  const first = Math.max(0, i0 - 1);
  const last = Math.min(L - 1, Math.ceil(pos) + 1);
  const leaves: ReactNode[] = [];
  for (let i = first; i <= last; i++) {
    const castF = castActive && i === i0 + 1 ? cast * (1 - t0) * 0.6 : 0;
    const castB = castActive && i === i0 - 1 ? cast * t0 * 0.6 : 0;
    leaves.push(<Leaf key={i} i={i} pos={pos} story={story} castF={castF} castB={castB} />);
  }

  const leftTh = Math.min(9, pos * 0.4);
  const rightTh = Math.min(9, (L - pos) * 0.4);
  const edgeBg = 'repeating-linear-gradient(to right, #efe6d0 0 1px, #c9bb9b 1px 2px)';

  const sl = 2 * rounded - 1;
  const sr = 2 * rounded;
  const bx0 = PW + shift - (rounded >= 1 ? PW : 0);
  const bx1 = PW + shift + (rounded < L ? PW : 0);
  const onPaper = lens.x >= bx0 && lens.x <= bx1 && lens.y >= 0 && lens.y <= PH;
  const lensVisible = lensOn && idle;

  return (
    <div
      ref={stageRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{
        width: 2 * PW * scale,
        height: PH * scale,
        position: 'relative',
        touchAction: 'none',
        userSelect: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 2 * PW,
          height: PH,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${shift}px)` }}>
          {/* boards */}
          <div
            className="cloth"
            style={{
              position: 'absolute',
              left: -10,
              top: -8,
              width: PW + 12,
              height: PH + 16,
              background: story.cloth,
              borderRadius: '7px 2px 2px 7px',
              opacity: pos > 0.001 ? 1 : 0,
              boxShadow: '0 26px 46px -8px rgba(0,0,0,.7), inset 0 0 0 1px rgba(255,255,255,.08)',
            }}
          />
          <div
            className="cloth"
            style={{
              position: 'absolute',
              left: PW - 2,
              top: -8,
              width: PW + 12,
              height: PH + 16,
              background: story.cloth,
              borderRadius: '2px 7px 7px 2px',
              opacity: pos < L - 0.001 ? 1 : 0,
              boxShadow: '0 26px 46px -8px rgba(0,0,0,.7), inset 0 0 0 1px rgba(255,255,255,.08)',
            }}
          />
          {/* page-block edges */}
          {leftTh > 0.4 && (
            <div style={{ position: 'absolute', left: -leftTh, top: 3, width: leftTh, height: PH - 6, background: edgeBg }} />
          )}
          {rightTh > 0.4 && (
            <div style={{ position: 'absolute', left: 2 * PW, top: 3, width: rightTh, height: PH - 6, background: edgeBg }} />
          )}
          <div style={{ position: 'absolute', inset: 0, perspective: 2600 }}>{leaves}</div>
        </div>

        {/* brass magnifier */}
        <div
          onPointerDown={onLensDown}
          onPointerMove={onLensMove}
          onPointerUp={onLensUp}
          onPointerCancel={onLensUp}
          style={{
            position: 'absolute',
            left: lens.x - R,
            top: lens.y - R,
            width: 2 * R,
            height: 2 * R,
            zIndex: 50,
            opacity: lensVisible ? 1 : 0,
            pointerEvents: lensVisible ? 'auto' : 'none',
            transition: 'opacity .22s',
            cursor: 'grab',
            touchAction: 'none',
          }}
        >
          {/* handle */}
          <div
            style={{
              position: 'absolute',
              left: R * 1.707 - 8,
              top: R * 1.707 - 4,
              width: 16,
              height: 92,
              borderRadius: 8,
              transformOrigin: 'top center',
              transform: 'rotate(-45deg)',
              background: 'linear-gradient(to right, #5a3b1a, #c08a46 45%, #6b4520)',
              boxShadow: '0 6px 14px rgba(0,0,0,.45)',
            }}
          />
          {/* ring */}
          <div
            style={{
              position: 'absolute',
              inset: -9,
              borderRadius: '50%',
              background: 'conic-gradient(from 30deg, #f0d79a, #9a6d2a, #f6e3ad, #7c5420, #ecd08c, #9a6d2a, #f0d79a)',
              boxShadow: '0 14px 30px rgba(0,0,0,.55), 0 2px 4px rgba(0,0,0,.5)',
            }}
          />
          {/* glass */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'rgba(255,250,235,.06)',
              boxShadow: 'inset 0 0 0 2px rgba(60,35,10,.55), inset 0 0 22px rgba(0,0,0,.35)',
            }}
          >
            <div style={{ opacity: onPaper ? 1 : 0, transition: 'opacity .15s' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 2 * PW,
                  height: PH,
                  transformOrigin: '0 0',
                  transform: `translate(${R - Z * lens.x}px, ${R - Z * lens.y}px) scale(${Z})`,
                }}
              >
                <div style={{ position: 'absolute', inset: 0, transform: `translateX(${shift}px)` }}>
                  {rounded >= 1 && (
                    <div style={{ position: 'absolute', left: 0, top: 0 }}>
                      <Page story={story} n={sl} />
                    </div>
                  )}
                  {rounded < L && (
                    <div style={{ position: 'absolute', left: PW, top: 0 }}>
                      <Page story={story} n={sr} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 30% 24%, rgba(255,255,255,.4), rgba(255,255,255,.08) 30%, transparent 46%)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
