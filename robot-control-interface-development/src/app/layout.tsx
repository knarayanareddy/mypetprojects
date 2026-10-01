import type { Metadata } from "next";
import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "SO-101 Command Deck — build, simulate & operate your arms",
  description: "Exploded view, build guide, 24-use-case simulator, model hub and a Web-Serial control center for the SO-101 robot arm.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
