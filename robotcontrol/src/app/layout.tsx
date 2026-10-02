import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SO-101 Command Deck",
  description: "Drive real SO-101 arms from the browser: manual control, 29 missions, vision-calibrated pick & place, LeRobot policy rollout.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-200 antialiased">{children}</body>
    </html>
  );
}
