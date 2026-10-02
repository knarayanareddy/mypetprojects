import { useEffect, useState } from "react";
import { restore } from "./lib/persist";
import { vision } from "./lib/vision";
import { Viewport } from "./components/Viewport";
import { Badge, Btn, useHub } from "./components/ui";
import { ARMS, hub } from "./lib/hub";
import ControlPage from "./pages/ControlPage";
import MissionsPage from "./pages/MissionsPage";
import ModelsPage from "./pages/ModelsPage";
import HardwarePage from "./pages/HardwarePage";
import GuidePage from "./pages/GuidePage";

const TABS = [
  { id: "missions", label: "Missions", icon: "🎯" },
  { id: "control", label: "Control", icon: "🕹️" },
  { id: "models", label: "Models", icon: "🧠" },
  { id: "hardware", label: "Hardware", icon: "🔌" },
  { id: "guide", label: "Guide", icon: "📘" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function App() {
  const h = useHub();
  useEffect(() => {
    // fill gaps from the Postgres backup (new browser / PC) – calibration, camera homography, settings
    restore().then((keys) => { if (keys.length) { if (keys.includes("so101.vision")) vision.reload(); hub.log(`Restored from server backup: ${keys.join(", ")}`); } });
  }, []);
  const [tab, setTab] = useState<Tab>("missions");
  const split = tab === "missions" || tab === "control" || tab === "models";
  const live = ARMS.filter((a) => h.arms[a].torque);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-teal-400 text-base">🦾</div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight text-white">SO-101 Command Deck</div>
              <div className="text-[10px] text-slate-500">dual-arm control · missions · policies</div>
            </div>
          </div>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === t.id ? "bg-slate-800 text-orange-300" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}>
                <span className="mr-1">{t.icon}</span>{t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge tone={h.settings.drive ? "red" : "cyan"}>{h.settings.drive ? "REAL ARMS LIVE" : "sim only"}</Badge>
            {ARMS.map((a) => <Badge key={a} tone={h.hasReal(a) ? (h.arms[a].torque ? "red" : "green") : "slate"}>{a}: {h.hasReal(a) ? (h.arms[a].torque ? "torque" : "linked") : "—"}</Badge>)}
            {h.bridge.connected && <Badge tone="violet">bridge</Badge>}
            {h.source !== "idle" && <Badge tone="amber">{h.source}</Badge>}
            {live.length > 0 && !h.settings.drive && <Badge tone="amber">holding</Badge>}
            {h.estopped ? (
              <Btn tone="good" onClick={() => hub.clearEstop()}>Clear E-STOP</Btn>
            ) : (
              <button onClick={() => hub.emergencyStop()} className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-extrabold tracking-wide text-white shadow shadow-red-900/50 hover:bg-red-500">■ E-STOP <span className="font-normal opacity-70">(space)</span></button>
            )}
          </div>
        </div>
      </header>

      {split ? (
        <main className="mx-auto grid max-w-[1800px] gap-4 p-4 lg:grid-cols-[minmax(440px,560px)_1fr]">
          <div className="order-2 min-w-0 lg:order-1">
            {tab === "missions" && <MissionsPage />}
            {tab === "control" && <ControlPage />}
            {tab === "models" && <ModelsPage />}
          </div>
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-[72px]">
              <Viewport className="h-[320px] lg:h-[calc(100vh-96px)]" />
            </div>
          </div>
        </main>
      ) : (
        <main className="p-4">
          {tab === "hardware" && <HardwarePage />}
          {tab === "guide" && <GuidePage />}
        </main>
      )}
    </div>
  );
}
