import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Demand Radar (portable): validate a demand before you build it",
  description:
    "An agent skill that validates whether a product demand is real. Runs on Hermes Agent, Roo Code, Claude Code, Codex and any open-source agent. Adapted from lemomo-ai/demand-radar (CC BY-NC 4.0).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-200 antialiased">
        <Nav />
        {children}
        <footer className="border-t border-zinc-800 py-8 text-center text-xs text-zinc-500">
          Portable adaptation of{" "}
          <a className="underline hover:text-zinc-300" href="https://github.com/lemomo-ai/demand-radar">
            lemomo-ai/demand-radar
          </a>{" "}
          by Leif Diao, licensed CC BY-NC 4.0. Non-commercial use only; see NOTICE.md in the kit.
        </footer>
      </body>
    </html>
  );
}
