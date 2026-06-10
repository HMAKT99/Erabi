import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Erabi Explorer",
  description:
    "Live view of the Erabi intent exchange: agents joining, intents flowing, auctions clearing, settlements confirming.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <header className="mb-8 flex items-baseline justify-between border-b border-terminal-border pb-4">
            <Link href="/" className="text-xl font-bold tracking-tight">
              <span className="text-terminal-green">erabi</span>
              <span className="text-terminal-dim">://explorer</span>
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/" className="hover:text-terminal-green">
                ticker
              </Link>
              <Link href="/disclosures" className="hover:text-terminal-green">
                disclosure inspector
              </Link>
            </nav>
          </header>
          {children}
          <footer className="mt-12 border-t border-terminal-border pt-4 text-xs text-terminal-dim">
            every paid influence on this network is signed, labeled, and inspectable · spec
            erabi/0.1
          </footer>
        </div>
      </body>
    </html>
  );
}
