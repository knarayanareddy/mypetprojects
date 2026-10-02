import { Aborted, sleep, type Arm } from "./arm";
import type { Detection } from "./vision";

export interface RunnerOpts {
  hover: number; // cm above grasp height when travelling
  grabZ: number; // fingertip height when grasping a cube (cm above table)
  speedMs: number; // base duration of a move
  dryRun: boolean; // plan + log only, never writes goals
}

export const DEFAULT_RUNNER: RunnerOpts = { hover: 7, grabZ: 1.4, speedMs: 900, dryRun: false };

export class Runner {
  trail: [number, number, number][] = [];
  constructor(
    public arm: Arm,
    public signal: AbortSignal,
    public log: (m: string, level?: "info" | "warn" | "error" | "ok") => void,
    public perceive: () => Promise<Detection[]>,
    public opts: RunnerOpts = DEFAULT_RUNNER,
    public onTrail?: (p: [number, number, number][]) => void,
  ) {}

  private check() {
    if (this.signal.aborted) throw new Aborted();
  }

  async home() {
    this.log("→ ready pose");
    if (this.opts.dryRun) return;
    await this.arm.moveTip([14, 0, 12], { pitch: -60, ms: this.opts.speedMs + 300, signal: this.signal });
  }

  async goto(x: number, y: number, z: number, o: { pitch?: number; ms?: number; roll?: number } = {}) {
    this.check();
    if (this.opts.dryRun) {
      this.log(`goto ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`);
      return;
    }
    await this.arm.moveTip([x, y, z], { pitch: o.pitch, roll: o.roll, ms: o.ms ?? this.opts.speedMs, signal: this.signal });
  }

  async open(pct = 100) {
    this.check();
    if (!this.opts.dryRun) await this.arm.setGripper(pct, 350, this.signal);
  }
  async closeEmpty() {
    this.check();
    if (!this.opts.dryRun) await this.arm.setGripper(0, 450, this.signal);
  }
  async roll(deg: number, ms = 700) {
    this.check();
    if (!this.opts.dryRun) await this.arm.moveTo({ wrist_roll: deg }, ms, this.signal);
  }
  async wait(ms: number) {
    await sleep(this.opts.dryRun ? 5 : ms, this.signal);
  }

  /** Full verified pick: open → above → down → close → stall check → lift → slip check. */
  async pick(x: number, y: number, o: { grabZ?: number; roll?: number } = {}): Promise<boolean> {
    const gz = o.grabZ ?? this.opts.grabZ;
    const hz = gz + this.opts.hover;
    this.log(`pick at (${x.toFixed(1)}, ${y.toFixed(1)})`);
    if (this.opts.dryRun) return true;
    await this.arm.moveTo({ gripper: 85, ...(o.roll !== undefined ? { wrist_roll: o.roll } : {}) }, 300, this.signal);
    await this.goto(x, y, hz);
    await this.goto(x, y, gz, { ms: 700 });
    const g = await this.arm.grasp(this.signal);
    this.log(`grasp: ${g.reason} (gap ${g.gapPct.toFixed(0)}%, load ${g.load}‰)`, g.holding ? "ok" : "warn");
    if (!g.holding) {
      await this.open(85);
      await this.goto(x, y, hz);
      return false;
    }
    await this.goto(x, y, hz + 2, { ms: 700 });
    const s = await this.arm.slipCheck();
    if (!s.holding) {
      this.log(`slip check failed (gap ${s.gapPct.toFixed(0)}%, load ${s.load}‰) - object lost`, "warn");
      await this.open(85);
      return false;
    }
    this.log("object secured", "ok");
    return true;
  }

  async place(x: number, y: number, z: number): Promise<void> {
    this.log(`place at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
    if (this.opts.dryRun) return;
    await this.goto(x, y, z + this.opts.hover * 0.8);
    await this.goto(x, y, z, { ms: 700 });
    await this.open(90);
    await this.goto(x, y, z + this.opts.hover * 0.8, { ms: 600 });
  }

  /** Touch a point with a closed tool (button, key, screen). */
  async press(x: number, y: number, depth = 0.2) {
    this.log(`press (${x.toFixed(1)}, ${y.toFixed(1)})`);
    if (this.opts.dryRun) return;
    await this.goto(x, y, 4);
    await this.goto(x, y, depth, { ms: 500 });
    await this.wait(120);
    await this.goto(x, y, 4, { ms: 400 });
  }

  /** Trace a polyline with the pen tip at height z. */
  async draw(points: [number, number][], z = 0.3) {
    if (!points.length) return;
    this.trail = [];
    const [sx, sy] = points[0];
    await this.goto(sx, sy, z + 3);
    await this.goto(sx, sy, z, { ms: 500 });
    for (const [x, y] of points) {
      this.check();
      this.trail.push([x, y, z]);
      this.onTrail?.([...this.trail]);
      await this.goto(x, y, z, { ms: 220, pitch: -90 });
    }
    const [ex, ey] = points[points.length - 1];
    await this.goto(ex, ey, z + 3, { ms: 400 });
  }

  /** Find objects: nearest to the robot first. Parks at the ready pose first so the arm is not in the camera's way. */
  async targets(filter?: (d: Detection) => boolean, parkFirst = true): Promise<Detection[]> {
    if (parkFirst && !this.opts.dryRun) {
      await this.home();
      await this.wait(250);
    }
    const d = (await this.perceive()).filter((x) => x.world && (!filter || filter(x)));
    return d.sort((a, b) => Math.hypot(a.world!.x, a.world!.y) - Math.hypot(b.world!.x, b.world!.y));
  }
}

// ---------------------------------------------------------------------------

export type ParamDef = { key: string; label: string; value: number };
export interface Mission {
  id: string;
  title: string;
  emoji: string;
  category: "Manipulation" | "Creative" | "Interaction" | "Assistive" | "Lab & Industry" | "Games" | "Perception";
  summary: string;
  novelty: string;
  sensors: string[];
  needsCamera: boolean;
  params: ParamDef[];
  run: (r: Runner, p: Record<string, number>) => Promise<string>;
}

const P = (key: string, label: string, value: number): ParamDef => ({ key, label, value });
const BIN_A: [number, number] = [17, -13];
const BIN_B: [number, number] = [9, -14];

async function pickAndDrop(r: Runner, d: Detection, to: [number, number], z = 5): Promise<boolean> {
  const ok = await r.pick(d.world!.x, d.world!.y);
  if (!ok) return false;
  await r.place(to[0], to[1], z);
  return true;
}

function circle(cx: number, cy: number, rad: number, n = 28): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => [cx + rad * Math.cos((2 * Math.PI * i) / n), cy + rad * Math.sin((2 * Math.PI * i) / n)]);
}

const WIN = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function winner(b: string[]) {
  for (const [a, c, d] of WIN) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? "draw" : "";
}
function minimax(b: string[], me: string, turn: string): number {
  const w = winner(b);
  if (w === me) return 1;
  if (w === "draw") return 0;
  if (w) return -1;
  const other = turn === "X" ? "O" : "X";
  const scores = b.flatMap((c, i) => (c ? [] : [minimax(b.map((v, k) => (k === i ? turn : v)), me, other)]));
  return turn === me ? Math.max(...scores) : Math.min(...scores);
}
function bestMove(b: string[], me: string): number {
  const other = me === "X" ? "O" : "X";
  let best = -2, mv = -1;
  b.forEach((c, i) => {
    if (c) return;
    const s = minimax(b.map((v, k) => (k === i ? me : v)), me, other);
    if (s > best) { best = s; mv = i; }
  });
  return mv;
}

export const MISSIONS: Mission[] = [
  {
    id: "pick-place", title: "Pick & Place to Bin", emoji: "📦", category: "Manipulation",
    summary: "Finds the nearest object with the camera, grasps it with stall + slip verification and drops it in the bin.",
    novelty: "The reference closed-loop task: every later mission reuses this verified pick.",
    sensors: ["Overhead USB camera"], needsCamera: true,
    params: [P("binX", "Bin X (cm)", BIN_A[0]), P("binY", "Bin Y (cm)", BIN_A[1]), P("count", "Objects", 1)],
    run: async (r, p) => {
      let done = 0;
      for (let i = 0; i < p.count; i++) {
        const t = await r.targets((d) => Math.hypot(d.world!.x - p.binX, d.world!.y - p.binY) > 5);
        if (!t.length) { r.log("no objects visible outside the bin", "warn"); break; }
        if (await pickAndDrop(r, t[0], [p.binX, p.binY])) done++;
      }
      await r.home();
      return `${done}/${p.count} objects binned`;
    },
  },
  {
    id: "color-sort", title: "Colour Sorter", emoji: "🌈", category: "Manipulation",
    summary: "Sorts every object by registered colour label into two bins (warm colours → A, others → B).",
    novelty: "Perception-driven routing; same loop works for recycling-style sorting.",
    sensors: ["Overhead USB camera"], needsCamera: true,
    params: [P("max", "Max objects", 5)],
    run: async (r, p) => {
      let n = 0;
      for (let i = 0; i < p.max; i++) {
        const t = await r.targets();
        const pending = t.filter((d) => Math.hypot(d.world!.x - BIN_A[0], d.world!.y - BIN_A[1]) > 5 && Math.hypot(d.world!.x - BIN_B[0], d.world!.y - BIN_B[1]) > 5);
        if (!pending.length) break;
        const d = pending[0];
        const warm = /red|yellow|orange/i.test(d.label);
        r.log(`${d.label} → bin ${warm ? "A" : "B"}`);
        if (await pickAndDrop(r, d, warm ? BIN_A : BIN_B)) n++;
      }
      await r.home();
      return `${n} objects sorted`;
    },
  },
  {
    id: "tower", title: "Tower Builder", emoji: "🧱", category: "Manipulation",
    summary: "Stacks detected cubes into a tower at a build site, raising the release height per level.",
    novelty: "Tests z-accuracy and table-height calibration — a great live demo.",
    sensors: ["Overhead USB camera"], needsCamera: true,
    params: [P("x", "Tower X", 13), P("y", "Tower Y", -6), P("levels", "Levels", 3)],
    run: async (r, p) => {
      let built = 0;
      for (let i = 0; i < p.levels; i++) {
        const t = await r.targets((d) => Math.hypot(d.world!.x - p.x, d.world!.y - p.y) > 4.5);
        if (!t.length) break;
        if (!(await r.pick(t[0].world!.x, t[0].world!.y))) continue;
        await r.place(p.x, p.y, 1.5 + built * 3.05);
        built++;
      }
      await r.home();
      return `tower height ${built}`;
    },
  },
  {
    id: "hanoi", title: "Tower of Hanoi", emoji: "🗼", category: "Games",
    summary: "Solves 3-disc Tower of Hanoi optimally (7 moves) using stacked discs/cubes on three pegs.",
    novelty: "Pure planning + precise stacking; no camera needed.",
    sensors: ["None (fixed layout)"], needsCamera: false,
    params: [P("pegX", "Peg row X", 16), P("gap", "Peg spacing (cm)", 7), P("disc", "Disc height (cm)", 1.5), P("n", "Discs", 3)],
    run: async (r, p) => {
      const pegs = [0, 0, 0];
      pegs[0] = p.n;
      const y = (i: number) => (i - 1) * p.gap;
      let moves = 0;
      const mv = async (a: number, b: number) => {
        await r.pick(p.pegX, y(a), { grabZ: pegs[a] * p.disc - p.disc / 2 });
        pegs[a]--;
        await r.place(p.pegX, y(b), pegs[b] * p.disc + p.disc / 2 + 0.3);
        pegs[b]++;
        moves++;
      };
      const solve = async (n: number, a: number, b: number, c: number): Promise<void> => {
        if (n === 0) return;
        await solve(n - 1, a, c, b);
        await mv(a, c);
        await solve(n - 1, b, a, c);
      };
      await solve(p.n, 0, 1, 2);
      await r.home();
      return `solved in ${moves} moves`;
    },
  },
  {
    id: "tictactoe", title: "Tic-Tac-Toe Opponent", emoji: "⭕", category: "Games",
    summary: "Plays an unbeatable minimax game against a scripted opponent, physically placing tokens on a 3×3 board.",
    novelty: "Shows decision-making + manipulation; extend with a vision board reader for a human opponent.",
    sensors: ["Overhead USB camera (tokens)"], needsCamera: true,
    params: [P("bx", "Board centre X", 16), P("by", "Board centre Y", 0), P("cell", "Cell size (cm)", 3.5)],
    run: async (r, p) => {
      const b = Array<string>(9).fill("");
      const cellXY = (i: number): [number, number] => [p.bx + (1 - Math.floor(i / 3)) * p.cell, p.by + (1 - (i % 3)) * p.cell];
      let turn = "X";
      while (!winner(b)) {
        let mv: number;
        if (turn === "X") mv = bestMove(b, "X");
        else {
          const free = b.flatMap((c, i) => (c ? [] : [i]));
          mv = free[Math.floor(Math.random() * free.length)];
          r.log(`opponent plays cell ${mv + 1}`);
        }
        if (turn === "X") {
          const t = await r.targets((d) => !b.some((_, i) => b[i] && Math.hypot(cellXY(i)[0] - d.world!.x, cellXY(i)[1] - d.world!.y) < 2) && Math.hypot(d.world!.x - p.bx, d.world!.y - p.by) > 6);
          if (!t.length) return "out of tokens";
          const ok = await r.pick(t[0].world!.x, t[0].world!.y);
          if (!ok) continue;
          const [cx, cy] = cellXY(mv);
          await r.place(cx, cy, 1.5);
        }
        b[mv] = turn;
        turn = turn === "X" ? "O" : "X";
      }
      await r.home();
      return `result: ${winner(b)}`;
    },
  },
  {
    id: "draw", title: "Pen Plotter: Shapes", emoji: "✏️", category: "Creative",
    summary: "Holds a marker in the gripper and draws a circle, square and star on paper using Cartesian IK.",
    novelty: "Turns the arm into a plotter; proves millimetre path tracking.",
    sensors: ["Pen clamped in the gripper (3D-printed pen holder)"], needsCamera: false,
    params: [P("cx", "Paper centre X", 17), P("cy", "Paper centre Y", 0), P("size", "Size (cm)", 4)],
    run: async (r, p) => {
      await r.draw(circle(p.cx, p.cy - 5, p.size * 0.6));
      const s = p.size * 0.6;
      await r.draw([[p.cx - s, p.cy - s], [p.cx - s, p.cy + s], [p.cx + s, p.cy + s], [p.cx + s, p.cy - s], [p.cx - s, p.cy - s]].map(([x, y]) => [x, y + 5] as [number, number]));
      const star: [number, number][] = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 4 * Math.PI) / 5 + Math.PI / 2;
        return [p.cx + p.size * 0.7 * Math.sin(a), p.cy + 11 + p.size * 0.7 * Math.cos(a)] as [number, number];
      });
      await r.draw(star);
      await r.home();
      return "circle + square + star drawn";
    },
  },
  {
    id: "signature", title: "Signature / Calligraphy", emoji: "🖋️", category: "Creative",
    summary: "Replays a stroke list (wave signature) with pen up/down between strokes.",
    novelty: "Drop in any SVG-derived polyline to write names on cards at a hackathon booth.",
    sensors: ["Pen holder"], needsCamera: false,
    params: [P("x", "Origin X", 15), P("y", "Origin Y", -6), P("scale", "Scale", 1)],
    run: async (r, p) => {
      const strokes: [number, number][][] = [
        [[0, 0], [1, 3], [2, 0], [3, 3], [4, 0]],
        [[5, 0], [5, 3], [6.5, 3], [6.5, 1.5], [5, 1.5]],
        [[8, 0], [8, 3], [9.5, 0], [9.5, 3]],
      ];
      for (const s of strokes) await r.draw(s.map(([a, b]) => [p.x + a * p.scale, p.y + b * p.scale]));
      await r.home();
      return `${strokes.length} strokes written`;
    },
  },
  {
    id: "button", title: "Button Presser (IoT bridge)", emoji: "🔘", category: "Assistive",
    summary: "Presses a physical button on demand: coffee machine, doorbell, elevator panel, arcade button.",
    novelty: "Retrofits any dumb appliance with 'smart' control by robot finger.",
    sensors: ["Tool tip (closed gripper)"], needsCamera: false,
    params: [P("x", "Button X", 17), P("y", "Button Y", 5), P("n", "Presses", 2)],
    run: async (r, p) => {
      await r.closeEmpty();
      for (let i = 0; i < p.n; i++) await r.press(p.x, p.y);
      await r.home();
      return `${p.n} presses`;
    },
  },
  {
    id: "lightswitch", title: "Light-Switch Flipper", emoji: "💡", category: "Assistive",
    summary: "Pushes a rocker/toggle switch up or down with a sideways sweep of the closed gripper.",
    novelty: "Assistive-tech use: operate switches without wiring changes.",
    sensors: ["Switch mounted on a vertical plate"], needsCamera: false,
    params: [P("x", "Switch X", 18), P("y", "Switch Y", 8), P("z", "Switch Z (cm)", 5)],
    run: async (r, p) => {
      await r.closeEmpty();
      await r.goto(p.x - 3, p.y - 3, p.z + 2);
      await r.goto(p.x, p.y, p.z + 2, { pitch: -30, ms: 600 });
      await r.goto(p.x, p.y, p.z - 1.5, { pitch: -30, ms: 500 });
      await r.home();
      return "switch flipped";
    },
  },
  {
    id: "keypad", title: "Keypad Typist", emoji: "🔢", category: "Assistive",
    summary: "Types a digit string on a calculator / door keypad laid flat on the table.",
    novelty: "Physical-layer automation: test hardware keypads or operate legacy panels.",
    sensors: ["Flat keypad with known layout"], needsCamera: false,
    params: [P("x", "Key 1 X", 20), P("y", "Key 1 Y", -3), P("pitch", "Key pitch (cm)", 2.2), P("code", "Digits (e.g. 1234)", 1234)],
    run: async (r, p) => {
      await r.closeEmpty();
      const digits = String(Math.round(p.code)).split("");
      for (const dgt of digits) {
        const n = Number(dgt);
        if (n < 1 || n > 9) continue;
        const row = Math.floor((n - 1) / 3);
        const col = (n - 1) % 3;
        await r.press(p.x - row * p.pitch, p.y + col * p.pitch);
      }
      await r.home();
      return `typed ${digits.join("")}`;
    },
  },
  {
    id: "phone-tap", title: "Touchscreen QA Tapper", emoji: "📱", category: "Lab & Industry",
    summary: "Taps a grid of points on a phone/tablet to regression-test touch UIs; reports taps made.",
    novelty: "Hardware-in-the-loop mobile testing for the price of a robot arm.",
    sensors: ["Capacitive stylus tip on the gripper"], needsCamera: false,
    params: [P("x", "Screen centre X", 17), P("y", "Screen centre Y", 0), P("w", "Grid span (cm)", 5)],
    run: async (r, p) => {
      let n = 0;
      for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) { await r.press(p.x + dx * p.w / 2, p.y + dy * p.w / 2, 0.1); n++; }
      await r.home();
      return `${n} taps`;
    },
  },
  {
    id: "vial-rack", title: "Lab Vial Rack Loader", emoji: "🧪", category: "Lab & Industry",
    summary: "Picks detected vials/blocks and fills a 2×3 rack row by row.",
    novelty: "Lab-automation pattern: inventory in, ordered grid out.",
    sensors: ["Overhead USB camera"], needsCamera: true,
    params: [P("rx", "Rack origin X", 10), P("ry", "Rack origin Y", 6), P("pitch", "Hole pitch (cm)", 3.6)],
    run: async (r, p) => {
      let n = 0;
      for (let i = 0; i < 6; i++) {
        const t = await r.targets((d) => !(d.world!.x < p.rx + 3 && d.world!.x > p.rx - 8 && d.world!.y > p.ry - 3 && d.world!.y < p.ry + 11));
        if (!t.length) break;
        if (!(await r.pick(t[0].world!.x, t[0].world!.y))) continue;
        await r.place(p.rx + (i % 2) * p.pitch * -1, p.ry + Math.floor(i / 2) * p.pitch, 2);
        n++;
      }
      await r.home();
      return `${n}/6 slots filled`;
    },
  },
  {
    id: "pour", title: "Pour-Over Barista", emoji: "☕", category: "Assistive",
    summary: "Grabs a small cup, carries it above a target, rolls the wrist slowly to pour, returns it upright.",
    novelty: "Wrist-roll tool use; a play on assistive feeding / drink service.",
    sensors: ["Light cup with beads/water", "Optional load cell"], needsCamera: false,
    params: [P("cx", "Cup X", 16), P("cy", "Cup Y", 6), P("tx", "Target X", 17), P("ty", "Target Y", -8), P("roll", "Pour angle", 100)],
    run: async (r, p) => {
      if (!(await r.pick(p.cx, p.cy, { grabZ: 3 }))) return "cup not grasped";
      await r.goto(p.tx, p.ty, 10, { pitch: -90 });
      await r.roll(p.roll, 1800);
      await r.wait(1200);
      await r.roll(0, 1500);
      await r.place(p.cx, p.cy, 3);
      await r.home();
      return "poured";
    },
  },
  {
    id: "domino", title: "Domino Layer & Toppler", emoji: "🁣", category: "Creative",
    summary: "Places a row of blocks with equal spacing, then pushes the first one over.",
    novelty: "Chain-reaction art piece; shows push primitives.",
    sensors: ["Overhead USB camera"], needsCamera: true,
    params: [P("x", "Row start X", 12), P("y", "Row Y", 8), P("n", "Blocks", 4), P("gap", "Spacing (cm)", 3.5)],
    run: async (r, p) => {
      let n = 0;
      for (let i = 0; i < p.n; i++) {
        const t = await r.targets((d) => d.world!.y < p.y - 3 || d.world!.y > p.y + 3 || d.world!.x > p.x + 4 * p.gap);
        if (!t.length) break;
        if (!(await r.pick(t[0].world!.x, t[0].world!.y))) continue;
        await r.place(p.x + n * p.gap, p.y, 1.5);
        n++;
      }
      await r.closeEmpty();
      await r.goto(p.x - 2, p.y - 4, 2);
      await r.goto(p.x - 2, p.y + 1.5, 2, { ms: 500 });
      await r.home();
      return `${n} blocks placed + push`;
    },
  },
  {
    id: "dice", title: "Dice Roller Dealer", emoji: "🎲", category: "Games",
    summary: "Picks a die, drops it from height in a tray, then re-localises it with the camera.",
    novelty: "Fair, tireless dealer for board-game booths; shows pick→throw→re-perceive loop.",
    sensors: ["Overhead USB camera", "Dice tray"], needsCamera: true,
    params: [P("tx", "Tray X", 17), P("ty", "Tray Y", -13)],
    run: async (r, p) => {
      const t = await r.targets();
      if (!t.length) return "no die found";
      if (!(await r.pick(t[0].world!.x, t[0].world!.y))) return "grasp failed";
      await r.goto(p.tx, p.ty, 11);
      await r.open(100);
      await r.wait(800);
      await r.home();
      const after = await r.targets();
      return `die landed; ${after.length} object(s) now visible`;
    },
  },
  {
    id: "follow", title: "Follow-Me Tracker", emoji: "👀", category: "Interaction",
    summary: "Visual servoing: the gripper hovers above whatever coloured object you move around the table.",
    novelty: "Interactive crowd-pleaser; demonstrates closed-loop perception at ~3 Hz.",
    sensors: ["Overhead USB camera"], needsCamera: true,
    params: [P("seconds", "Duration (s)", 20)],
    run: async (r, p) => {
      const end = Date.now() + p.seconds * 1000;
      let n = 0;
      while (Date.now() < end) {
        const t = await r.targets(undefined, false);
        if (t.length) {
          const w = t[0].world!;
          await r.goto(w.x, w.y, 9, { ms: 450, pitch: -70 });
          n++;
        }
        await r.wait(100);
      }
      await r.home();
      return `${n} tracking updates`;
    },
  },
  {
    id: "sentry", title: "Desk Sentry", emoji: "🛡️", category: "Perception",
    summary: "Memorises the table, then points at any new object that appears (change detection).",
    novelty: "Turns the arm into an active security/attendance pointer.",
    sensors: ["Overhead USB camera"], needsCamera: true,
    params: [P("seconds", "Watch time (s)", 20)],
    run: async (r, p) => {
      const baseline = (await r.targets()).length;
      r.log(`baseline: ${baseline} object(s)`);
      const end = Date.now() + p.seconds * 1000;
      let alerts = 0;
      while (Date.now() < end) {
        const t = await r.targets(undefined, false);
        if (t.length > baseline) {
          const w = t[t.length - 1].world!;
          r.log(`intruder at ${w.x.toFixed(1)}, ${w.y.toFixed(1)}`, "warn");
          await r.goto(w.x, w.y, 9, { pitch: -45, ms: 600 });
          alerts++;
          await r.wait(1500);
        }
        await r.wait(400);
      }
      await r.home();
      return `${alerts} alert(s)`;
    },
  },
  {
    id: "pet-teaser", title: "Cat Teaser Arm", emoji: "🐱", category: "Interaction",
    summary: "Waves a feather toy in random swoops and pauses, with idle rests, to entertain a pet.",
    novelty: "Randomised play behaviour keeps pets engaged.",
    sensors: ["Feather toy taped to the gripper"], needsCamera: false,
    params: [P("swoops", "Swoops", 6)],
    run: async (r, p) => {
      for (let i = 0; i < p.swoops; i++) {
        const y = (Math.random() - 0.5) * 24;
        const x = 12 + Math.random() * 8;
        await r.goto(x, y, 3 + Math.random() * 6, { pitch: -40, ms: 450 + Math.random() * 400 });
        if (Math.random() < 0.3) await r.wait(700);
      }
      await r.home();
      return "playtime done";
    },
  },
  {
    id: "wave", title: "Greeter: Wave & Handshake Offer", emoji: "👋", category: "Interaction",
    summary: "Raises the arm, waves with wrist roll, then extends the gripper in a 'high-five' pose.",
    novelty: "Booth greeter in 5 lines — humanoid presence for the demo table.",
    sensors: ["None"], needsCamera: false,
    params: [P("waves", "Waves", 4)],
    run: async (r, p) => {
      await r.goto(14, 0, 18, { pitch: -10 });
      for (let i = 0; i < p.waves; i++) { await r.roll(45, 350); await r.roll(-45, 350); }
      await r.roll(0, 300);
      await r.goto(18, 0, 10, { pitch: 0 });
      await r.open(100);
      await r.wait(1000);
      await r.home();
      return "hello!";
    },
  },
  {
    id: "page-turn", title: "Page Turner", emoji: "📖", category: "Assistive",
    summary: "Sweeps the fingertip from the page's right edge to the left to flip a page for readers with limited mobility.",
    novelty: "Assistive reading aid; tune the sweep to paper stiffness.",
    sensors: ["Book holder"], needsCamera: false,
    params: [P("x", "Page edge X", 16), P("y", "Page edge Y (right)", -8), P("width", "Sweep width (cm)", 10)],
    run: async (r, p) => {
      await r.closeEmpty();
      await r.goto(p.x, p.y, 1.2);
      await r.goto(p.x, p.y + p.width * 0.3, 0.8, { ms: 500 });
      await r.goto(p.x, p.y + p.width * 0.6, 3.5, { ms: 600 });
      await r.goto(p.x, p.y + p.width, 5, { ms: 500 });
      await r.home();
      return "page turned";
    },
  },
  {
    id: "tidy", title: "Desk Tidy (Push)", emoji: "🧹", category: "Manipulation",
    summary: "Pushes loose objects to the edge of the workspace with the closed gripper — no grasp needed.",
    novelty: "Non-prehensile manipulation (what world-models like Visionary learn to predict).",
    sensors: ["Overhead USB camera"], needsCamera: true,
    params: [P("edgeX", "Push-to X", 24), P("max", "Objects", 3)],
    run: async (r, p) => {
      let n = 0;
      await r.closeEmpty();
      for (let i = 0; i < p.max; i++) {
        const t = await r.targets((d) => d.world!.x < p.edgeX - 3);
        if (!t.length) break;
        const w = t[0].world!;
        await r.goto(w.x - 4, w.y, 3);
        await r.goto(w.x - 4, w.y, 1.4, { ms: 500 });
        await r.goto(p.edgeX, w.y, 1.4, { ms: 900 });
        await r.goto(p.edgeX - 2, w.y, 5, { ms: 400 });
        n++;
      }
      await r.home();
      return `${n} objects pushed`;
    },
  },
  {
    id: "cup-stack", title: "Cup/Block Pyramid", emoji: "🔺", category: "Manipulation",
    summary: "Builds a 3-2-1 pyramid of blocks on a precise grid.",
    novelty: "Higher z-precision challenge than a straight tower.",
    sensors: ["Overhead USB camera"], needsCamera: true,
    params: [P("x", "Base X", 12), P("y", "Base Y", 6), P("pitch", "Block pitch (cm)", 3.4)],
    run: async (r, p) => {
      const layout: [number, number][] = [[0, -1], [0, 0], [0, 1], [1, -0.5], [1, 0.5], [2, 0]];
      let n = 0;
      for (const [lvl, off] of layout) {
        const t = await r.targets((d) => Math.hypot(d.world!.x - p.x, d.world!.y - p.y) > 9);
        if (!t.length) break;
        if (!(await r.pick(t[0].world!.x, t[0].world!.y))) continue;
        await r.place(p.x, p.y + off * p.pitch, 1.5 + lvl * 3.05);
        n++;
      }
      await r.home();
      return `${n}/6 blocks placed`;
    },
  },
  {
    id: "inspect", title: "Object Inspector (Rotate & Show)", emoji: "🔍", category: "Perception",
    summary: "Picks an object, holds it up in front of the camera and rotates it with wrist roll for 360° inspection.",
    novelty: "Active perception: the robot creates its own multi-view dataset (feeds VLM/QC pipelines).",
    sensors: ["Camera facing the show position"], needsCamera: true,
    params: [P("sx", "Show X", 15), P("sy", "Show Y", 0), P("sz", "Show Z", 14)],
    run: async (r, p) => {
      const t = await r.targets();
      if (!t.length) return "nothing to inspect";
      if (!(await r.pick(t[0].world!.x, t[0].world!.y))) return "grasp failed";
      await r.goto(p.sx, p.sy, p.sz, { pitch: -20 });
      for (const a of [90, 180, 270, 360]) { await r.roll(a === 360 ? 0 : Math.min(a, 150), 800); r.log(`view @ ${a}°`); await r.wait(500); }
      await r.place(t[0].world!.x, t[0].world!.y, 1.5);
      await r.home();
      return "4 views captured";
    },
  },
  {
    id: "conveyor", title: "Pick-from-Line Feeder", emoji: "🏭", category: "Lab & Industry",
    summary: "Continuously watches a strip of the table and moves each arriving object to the bin (conveyor emulation).",
    novelty: "Always-on industrial pattern with watchdog-style idle loop.",
    sensors: ["Overhead USB camera"], needsCamera: true,
    params: [P("seconds", "Run time (s)", 30), P("binX", "Bin X", BIN_A[0]), P("binY", "Bin Y", BIN_A[1])],
    run: async (r, p) => {
      const end = Date.now() + p.seconds * 1000;
      let n = 0;
      while (Date.now() < end) {
        const t = await r.targets((d) => Math.hypot(d.world!.x - p.binX, d.world!.y - p.binY) > 5);
        if (t.length && (await pickAndDrop(r, t[0], [p.binX, p.binY]))) n++;
        else await r.wait(500);
      }
      await r.home();
      return `${n} items fed`;
    },
  },
];

export const CATEGORY_ORDER: Mission["category"][] = ["Manipulation", "Games", "Creative", "Assistive", "Interaction", "Lab & Industry", "Perception"];

/** Tools that are not scripted missions but exposed elsewhere in the UI. */
export const INTERACTIVE_USE_CASES = [
  { id: "teleop", title: "Leader–Follower Teleoperation", where: "Manual → Teleop", summary: "A second SO-101 as leader: move it by hand and the follower mirrors it live." },
  { id: "teach", title: "Teach & Replay", where: "Manual → Recorder", summary: "Torque off, physically guide the arm, record, then replay at any speed or loop it." },
  { id: "policy", title: "Learned policies (ACT / SmolVLA / π0 / GR00T / MolmoAct2)", where: "Models", summary: "Run language- or vision-conditioned policies through lerobot-rollout." },
];
