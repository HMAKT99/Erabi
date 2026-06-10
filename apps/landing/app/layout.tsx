import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERABI — the open intent exchange for AI agents",
  description:
    "The intent auction and reputation layer of the agent economy. Every paid influence signed, labeled, and inspectable.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
