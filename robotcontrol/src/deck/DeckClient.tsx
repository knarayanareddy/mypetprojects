"use client";
import dynamic from "next/dynamic";

// The deck talks to Web Serial, getUserMedia, WebAudio and localStorage – browser-only, so no SSR.
const App = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => <div className="grid min-h-screen place-items-center bg-slate-950 text-sm text-slate-500">Loading SO-101 Command Deck…</div>,
});

export default function DeckClient() {
  return <App />;
}
