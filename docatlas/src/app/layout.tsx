import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doc Atlas — distil documents into one offline visual dashboard",
  description:
    "Turn PDF, Word, PowerPoint, Excel, EPUB, HTML and Markdown files into a single, traceable, offline briefing dashboard with a logic diagram, conflicts surfaced and every claim cited.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
