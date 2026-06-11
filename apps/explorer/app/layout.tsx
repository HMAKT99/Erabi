import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "../components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Erabi Explorer",
  description:
    "Live view of the Erabi intent exchange: agents joining, intents flowing, auctions clearing, settlements confirming.",
};

/** Applies the stored theme before paint to avoid a flash of dark/light. */
const themeScript = `try{if(localStorage.getItem("erabi.theme")==="light")document.documentElement.classList.add("light")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <header className="mb-8 flex items-baseline justify-between border-b border-terminal-border pb-4">
            <Link href="/" className="text-xl font-bold tracking-tight">
              <span className="text-terminal-green">erabi</span>
              <span className="text-terminal-dim">://explorer</span>
            </Link>
            <div className="flex items-center gap-5 text-sm">
              <nav className="flex gap-5">
                <Link href="/" className="hover:text-terminal-green">
                  home
                </Link>
                <Link href="/agents" className="hover:text-terminal-green">
                  agents
                </Link>
                <Link href="/leaderboard" className="hover:text-terminal-green">
                  leaderboard
                </Link>
                <Link href="/disclosures" className="hover:text-terminal-green">
                  disclosures
                </Link>
                <Link href="/dashboard" className="hover:text-terminal-green">
                  dashboard
                </Link>
                <Link href="/integrations" className="hover:text-terminal-green">
                  integrations
                </Link>
                <Link href="/about" className="hover:text-terminal-green">
                  about
                </Link>
              </nav>
              <ThemeToggle />
            </div>
          </header>
          {children}
          <footer className="mt-12 flex items-baseline justify-between border-t border-terminal-border pt-4 text-xs text-terminal-dim">
            <span>
              every paid influence on this network is signed, labeled, and inspectable · spec
              erabi/0.1
            </span>
            <Link href="/builder" className="shrink-0 pl-4 hover:text-terminal-green">
              built by AKT →
            </Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
