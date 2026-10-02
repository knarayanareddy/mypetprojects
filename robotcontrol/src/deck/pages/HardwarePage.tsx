import { useEffect, useRef, useState } from "react";
import { ARMS, ArmId, Role, SerialLink, hub, loadCal, saveCal } from "../lib/hub";
import { FeetechBus, calibrationToLeRobotJson, parseCalibration, rawToNorm, serialSupported } from "../lib/feetech";
import { JOINTS } from "../lib/kin";
import { CAM_SLOTS, CamSlot, cameras } from "../lib/cameras";
import { Badge, Btn, Card, Field, download, inputCls, useCameras, useHub } from "../components/ui";
import { LogCard } from "./ControlPage";
import { GraspCard, VisionCard } from "./VisionCard";

export default function HardwarePage() {
  const h = useHub();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [bridgeUrl, setBridgeUrl] = useState(hub.bridge.url);

  const run = async (key: string, fn: () => Promise<void>) => { setErr(""); setBusy(key); try { await fn(); } catch (e) { setErr((e as Error).message); } setBusy(""); };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {!serialSupported() && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          This browser has no Web Serial API. Use desktop <b>Chrome / Edge</b> (https or localhost) – or run the <b>Python bridge</b> below, which works from any browser.
        </div>
      )}
      {err && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">{err}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {ARMS.flatMap((a) => (["follower", "leader"] as Role[]).map((r) => <LinkCard key={a + r} arm={a} role={r} busy={busy} run={run} />))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CalibrationCard setErr={setErr} />
        <SetupCard setErr={setErr} />
      </div>

      <Card title="Python bridge (alternative transport)" right={<Badge tone={h.bridge.connected ? "green" : "slate"}>{h.bridge.connected ? `connected · arms ${h.bridge.arms.join(",")}` : "not connected"}</Badge>}>
        <p className="mb-2 text-xs text-slate-400">Start <code className="text-emerald-300">so101_bridge.py</code> on the PC that has the arms attached (download in the Guide tab; <code>--mock</code> lets you test without hardware). The bridge uses LeRobot’s own drivers and calibration files and can launch real policies.</p>
        <div className="flex gap-2">
          <input className={inputCls} value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} />
          {!h.bridge.connected ? <Btn tone="primary" disabled={busy === "bridge"} onClick={() => run("bridge", () => hub.connectBridge(bridgeUrl))}>Connect</Btn> : <Btn tone="danger" onClick={() => hub.disconnectBridge()}>Disconnect</Btn>}
        </div>
        {h.bridge.connected && <p className="mt-2 text-[11px] text-slate-400">{h.bridge.status}. Use <b>Control → Torque ON</b> per arm and enable “Drive real arms”.</p>}
      </Card>

      <CamerasCard setErr={setErr} />
      <div className="grid gap-4 lg:grid-cols-2"><VisionCard /><GraspCard /></div>
      <LogCard />
    </div>
  );
}

function LinkCard({ arm, role, busy, run }: { arm: ArmId; role: Role; busy: string; run: (k: string, f: () => Promise<void>) => Promise<void> }) {
  const h = useHub();
  const link: SerialLink | null = h.arms[arm][role];
  const key = arm + role;
  const col = arm === "A" ? "#fb923c" : "#2dd4bf";
  return (
    <Card title={<span><span style={{ color: col }}>Arm {arm}</span> · {role}</span>}
      right={link ? <div className="flex gap-1.5"><Badge tone="green">{link.found.length} motors</Badge><Badge tone={link.calState === "ok" ? "cyan" : "amber"}>{link.calState === "ok" ? "calibrated ✓" : link.calState === "mismatch" ? "cal mismatch" : link.calState === "none" ? "uncalibrated" : "cal ?"}</Badge></div> : <Badge>disconnected</Badge>}>
      {!link ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">Pick the USB serial port of the {role} arm’s bus-servo adapter (1 Mbps, STS3215 ids 1–6).</p>
          <Btn tone="primary" disabled={!serialSupported() || busy === key} onClick={() => run(key, () => hub.connect(arm, role))}>{busy === key ? "…" : "Connect"}</Btn>
        </div>
      ) : (
        <>
          <table className="w-full text-[10.5px]">
            <thead><tr className="text-left text-slate-500"><th>joint</th><th>id</th><th>raw</th><th>norm</th><th>load</th><th>°C</th><th>V</th></tr></thead>
            <tbody>
              {JOINTS.map((j, i) => {
                const t = link.telemetry[i];
                return (
                  <tr key={j} className="border-t border-slate-800/60 text-slate-300">
                    <td className="py-0.5">{j}</td><td>{i + 1}</td>
                    <td className="font-mono">{t ? t.pos : "—"}</td>
                    <td className="font-mono">{t ? rawToNorm(i, t.pos, link.cal).toFixed(0) : "—"}</td>
                    <td className="font-mono">{t ? t.load : "—"}</td>
                    <td className={t && t.temp > 55 ? "font-mono text-red-300" : "font-mono"}>{t ? t.temp : "—"}</td>
                    <td className={t && t.volt < 10 ? "font-mono text-amber-300" : "font-mono"}>{t ? t.volt.toFixed(1) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {link.found.length < 6 && <p className="mt-1 text-[11px] text-amber-300">Only motors {link.found.join(",")} answered – check daisy-chain cables / IDs (use Motor ID setup).</p>}
          {link.calState !== "ok" && <p className="mt-1 text-[11px] text-amber-300">Calibration: {link.calState} – {link.calWhy || "not checked"}. Torque is blocked until this says ok.</p>}
          {link.calState === "ok" && link.calWhy && <p className="mt-1 text-[10px] text-slate-500">{link.calWhy}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Btn tone="danger" onClick={() => run(key, () => hub.disconnect(arm, role))}>Disconnect</Btn>
            {link.calState === "mismatch" && <Btn tone="primary" onClick={() => run(key, () => hub.applySavedCalibration(arm, role))}>Write saved calibration to servos</Btn>}
            <Btn onClick={() => run(key, async () => { await hub.checkCalibration(link); hub.bump(); })}>Re-check calibration</Btn>
            {role === "follower" && <Btn onClick={() => run(key, async () => { await link.bus.configureFollower(link.ids, hub.settings.torqueCap); link.configured = true; hub.log(`Arm ${arm}: LeRobot follower registers written (PID 16/0/32, accel 254)`); })}>Apply LeRobot config</Btn>}
            <span className="self-center text-[10px] text-slate-500">read errors: {link.errors}</span>
          </div>
        </>
      )}
    </Card>
  );
}

function CalibrationCard({ setErr }: { setErr: (s: string) => void }) {
  const h = useHub();
  const [arm, setArm] = useState<ArmId>("A");
  const [role, setRole] = useState<Role>("follower");
  const [text, setText] = useState("");
  const link = h.arms[arm][role];
  const c = h.calib;
  const cal = loadCal(arm, role);
  return (
    <Card title="Calibration (LeRobot-compatible)">
      <p className="mb-2 text-[11px] leading-relaxed text-slate-400">
        Same procedure as <code className="text-emerald-300">lerobot-calibrate</code>: hold the arm in the <b>middle of its range</b> → <b>Set homing</b> writes each servo’s Homing_Offset (so the middle reads 2047) → sweep every joint end-to-end (wrist roll is full-turn) → <b>Finish</b> writes the limits into the servos and saves LeRobot-format JSON. Because the servos hold the calibration, LeRobot CLI tools and this deck agree. Already calibrated with LeRobot? Just Connect – it is detected and imported from the servos.
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <Field label="Arm"><select className={inputCls} value={arm} onChange={(e) => setArm(e.target.value as ArmId)}><option>A</option><option>B</option></select></Field>
        <Field label="Role"><select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}><option>follower</option><option>leader</option></select></Field>
      </div>
      {c && c.arm === arm && c.role === role ? (
        <div className="space-y-1.5">
          {!c.offsets ? <p className="text-[11px] text-amber-300">Step 1: put the arm in the middle of its range (see LeRobot’s diagram), torque is off – then press “Set homing”.</p> : <p className="text-[11px] text-emerald-300">Homing written ✓ ({c.offsets.join(", ")}). Step 2: sweep each joint through its full range (wrist roll not needed), then Finish.</p>}
          {JOINTS.map((j, i) => (
            <div key={j} className="grid grid-cols-[90px_1fr_80px] items-center gap-2 text-[10px] text-slate-400">
              <span>{j}</span>
              <div className="relative h-2 rounded bg-slate-800">
                <div className="absolute h-2 rounded bg-orange-400/70" style={{ left: `${(c.min[i] / 4095) * 100}%`, width: `${Math.max(1, ((c.max[i] - c.min[i]) / 4095) * 100)}%` }} />
                <div className="absolute top-[-2px] h-3 w-0.5 bg-cyan-300" style={{ left: `${(c.raw[i] / 4095) * 100}%` }} />
              </div>
              <span className="font-mono">{c.min[i]}–{c.max[i]}</span>
            </div>
          ))}
          <div className="flex gap-1.5 pt-1"><Btn tone="primary" disabled={!!c.offsets} onClick={() => { hub.calibHome().catch((e) => setErr((e as Error).message)); }}>1 · Set homing</Btn><Btn tone="good" disabled={!c.offsets} onClick={() => { hub.finishCalib().catch((e) => setErr((e as Error).message)); }}>2 · Finish & save</Btn><Btn onClick={() => hub.cancelCalib()}>Cancel</Btn></div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <Btn tone="primary" disabled={!link} onClick={() => { try { hub.startCalib(arm, role); } catch (e) { setErr((e as Error).message); } }}>Start calibration</Btn>
          <Btn onClick={() => download(`${role}_${arm}_calibration.json`, calibrationToLeRobotJson(cal), "application/json")}>Export JSON</Btn>
          <Btn tone="ghost" onClick={() => { localStorage.removeItem(`so101.cal.${arm}.${role}`); if (link) link.cal = loadCal(arm, role); hub.bump(); }}>Reset</Btn>
        </div>
      )}
      <details className="mt-3 text-xs text-slate-400">
        <summary className="cursor-pointer text-slate-300">Import LeRobot calibration JSON</summary>
        <textarea className={`${inputCls} mt-2 h-28 font-mono`} value={text} onChange={(e) => setText(e.target.value)} placeholder='{ "shoulder_pan": { "id": 1, "drive_mode": 0, "homing_offset": 12, "range_min": 780, "range_max": 3300 }, … }' />
        <Btn className="mt-1.5" onClick={() => { try { const cc = parseCalibration(text); saveCal(arm, role, cc); if (link) link.cal = cc; hub.log(`Calibration imported for arm ${arm} ${role}`); setText(""); hub.bump(); } catch (e) { setErr("Invalid calibration JSON: " + (e as Error).message); } }}>Import for Arm {arm} {role}</Btn>
        <p className="mt-1 text-[10px] text-slate-500">Importing a JSON only stores it in the browser. If it differs from the servo EEPROM the arm shows “cal mismatch” – press <i>Write saved calibration to servos</i> on its card (writes Homing_Offset 31, Min/Max_Position_Limit 9/11, exactly like LeRobot).</p>
      </details>
    </Card>
  );
}

const SETUP_ORDER: [string, number][] = [["gripper", 6], ["wrist_roll", 5], ["wrist_flex", 4], ["elbow_flex", 3], ["shoulder_lift", 2], ["shoulder_pan", 1]];

function SetupCard({ setErr }: { setErr: (s: string) => void }) {
  const bus = useRef<FeetechBus | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const add = (s: string) => setLog((l) => [s, ...l].slice(0, 12));
  useEffect(() => () => { void bus.current?.close(); }, []);

  const connect = async () => {
    setErr("");
    try { const b = new FeetechBus(); await b.open(); bus.current = b; setOpen(true); setStep(0); add("Port opened @ 1 Mbps. Connect ONLY the gripper motor to the board."); } catch (e) { setErr((e as Error).message); }
  };
  const scan = async () => { const f = await bus.current!.scan(1, 20); setFound(f); add(f.length ? `Found motor id(s): ${f.join(", ")}` : "No motor found – check power & cable"); return f; };
  const assign = async () => {
    try {
      const f = await scan();
      if (f.length !== 1) { add(f.length ? "More than one motor on the bus – connect only one!" : "Nothing to configure."); return; }
      const [name, id] = SETUP_ORDER[step];
      if (f[0] === id) { add(`'${name}' already has id ${id}`); } else if (await bus.current!.setMotorId(f[0], id)) add(`✔ '${name}' id ${f[0]} → ${id}, baud 1 Mbps`); else { add("✖ failed to verify new id"); return; }
      if (step < 5) { setStep(step + 1); add(`Now connect ONLY the '${SETUP_ORDER[step + 1][0]}' motor (unplug the previous one from the board).`); } else add("🎉 All six motors configured. Daisy-chain them and connect shoulder_pan (id 1) to the board.");
    } catch (e) { setErr((e as Error).message); }
  };
  return (
    <Card title="Motor ID setup (replaces lerobot-setup-motors)" right={open ? <Btn tone="ghost" onClick={async () => { await bus.current?.close(); setOpen(false); }}>close port</Btn> : null}>
      <p className="mb-2 text-[11px] leading-relaxed text-slate-400">New STS3215 servos all ship with id 1. Do this once per motor, <b>one motor at a time</b> on the controller board, in the order gripper → wrist_roll → … → shoulder_pan. Do this before assembling (or whenever you swap a motor). Don’t connect this port as a follower/leader while using this tool.</p>
      {!open ? <Btn tone="primary" disabled={!serialSupported()} onClick={connect}>Open port</Btn> : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">{SETUP_ORDER.map(([n, id], i) => <Badge key={n} tone={i < step ? "green" : i === step ? "amber" : "slate"}>{id} {n}</Badge>)}</div>
          <p className="text-xs text-slate-200">Current: connect <b>only</b> the <b className="text-orange-300">{SETUP_ORDER[step][0]}</b> motor → target id {SETUP_ORDER[step][1]}.</p>
          <div className="flex gap-1.5"><Btn onClick={scan}>Scan bus</Btn><Btn tone="primary" onClick={assign}>Set id {SETUP_ORDER[step][1]}</Btn><Btn tone="ghost" onClick={() => setStep(Math.max(0, step - 1))}>◀</Btn><Btn tone="ghost" onClick={() => setStep(Math.min(5, step + 1))}>▶</Btn></div>
          <p className="text-[10px] text-slate-500">found: {found.join(", ") || "—"}</p>
        </div>
      )}
      <div className="mt-2 max-h-28 overflow-y-auto font-mono text-[10px] text-slate-400">{log.map((l, i) => <div key={i}>{l}</div>)}</div>
    </Card>
  );
}

function CamPreview({ slot }: { slot: CamSlot }) {
  const ref = useRef<HTMLVideoElement>(null);
  const c = useCameras();
  const stream = c.slots[slot].stream;
  useEffect(() => { if (ref.current) { ref.current.srcObject = stream; if (stream) void ref.current.play().catch(() => undefined); } }, [stream]);
  return <video ref={ref} muted playsInline className="aspect-video w-full rounded-lg bg-black object-cover" />;
}

function CamerasCard({ setErr }: { setErr: (s: string) => void }) {
  const c = useCameras();
  const [devs, setDevs] = useState<MediaDeviceInfo[]>([]);
  const [sel, setSel] = useState<Record<string, string>>({});
  const load = async () => { try { setDevs(await cameras.list()); } catch (e) { setErr((e as Error).message); } };
  return (
    <Card title="Cameras (feed VLMs & policies)" right={<Btn onClick={load}>Detect cameras</Btn>}>
      <p className="mb-2 text-[11px] text-slate-400">Name cameras like your policy’s training data (<code>top</code>, <code>side</code>, <code>wrist</code>). Frames are centre-cropped to 448² JPEG and sent with each policy request / VLM plan. Recommended: one fixed top-down camera + one wrist camera on arm A.</p>
      <div className="grid gap-3 md:grid-cols-3">
        {CAM_SLOTS.map((s) => (
          <div key={s} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-200"><b>{s}</b>{c.active(s) ? <Badge tone="green">live</Badge> : <Badge>off</Badge>}</div>
            <CamPreview slot={s} />
            <select className={inputCls} value={sel[s] ?? ""} onChange={(e) => setSel({ ...sel, [s]: e.target.value })}>
              <option value="">default / choose…</option>
              {devs.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `camera ${i + 1}`}</option>)}
            </select>
            <div className="flex gap-1.5">
              <Btn tone="primary" onClick={async () => { try { await cameras.start(s, sel[s] ?? ""); } catch (e) { setErr((e as Error).message); } }}>Start</Btn>
              <Btn onClick={() => cameras.stop(s)}>Stop</Btn>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
