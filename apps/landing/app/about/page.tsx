import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — ERABI",
  description: "Who builds ERABI, and why the agent economy needs an open selection layer.",
};

const GITHUB_PROFILE = "https://github.com/HMAKT99";
const GITHUB_REPO = "https://github.com/HMAKT99/Erabi";

export default function About() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <nav className="mb-12 flex items-baseline justify-between text-sm">
        <Link href="/" className="font-bold">
          <span className="text-terminal-green">erabi</span>
          <span className="text-terminal-dim">://about</span>
        </Link>
        <div className="flex gap-5">
          <Link href="/" className="hover:text-terminal-green">
            home
          </Link>
          <a href={GITHUB_REPO} className="hover:text-terminal-green">
            github
          </a>
        </div>
      </nav>

      <p className="label">the builder</p>

      <h1 className="mt-6 text-3xl font-bold leading-tight md:text-4xl">
        AKT <span className="text-terminal-dim">·</span>{" "}
        <span className="text-terminal-green">Arun</span>
      </h1>
      <p className="mt-2 text-sm text-terminal-dim">Product Manager @ FAANG · builder of ERABI</p>

      <div className="mt-8 space-y-4 text-sm leading-relaxed md:text-base">
        <p>
          By day I ship products used by millions inside one of the world&apos;s largest tech
          companies. That seat comes with a particular education: you watch, up close, how platforms
          decide what people see — and how quietly money learns to sit inside those decisions.
        </p>
        <p>
          Now the same story is starting again, one layer up. AI agents are becoming the ones who
          choose — which API to call, which dataset to trust, which agent to hire, what to buy.
          Wherever selection happens at scale, sponsorship follows. It always has. The only open
          question is whether this generation of paid influence will be{" "}
          <span className="text-terminal-green">visible</span> or invisible.
        </p>
        <p>
          I wasn&apos;t willing to wait to find out, so I built the answer I wanted to exist:{" "}
          <b>ERABI</b> — an open, cryptographically auditable intent exchange where every paid
          influence on an agent&apos;s choice is signed, labeled, capped, and inspectable by anyone,
          forever. Organic results that money cannot reorder. Reputation that can only be earned
          through dual-signed outcomes, never bought or faked. Earnings that flow to agent builders
          — but only ever cash out to verified humans.
        </p>
        <p>
          The whole thing is Apache-2.0: the spec, the reference node, the SDKs, the explorer you
          can watch the network through. Run a node. Audit the ledger. Recompute any reputation
          score from its evidence. Fork it if I lose my way.
        </p>
        <p className="text-terminal-dim">
          The agent economy is going to get an advertising layer either way. I&apos;m building the
          version that can be inspected.
        </p>
      </div>

      <section className="mt-12 grid gap-3 text-sm md:grid-cols-2">
        <a href={GITHUB_PROFILE} className="panel hover:border-terminal-green">
          <div className="text-terminal-green">@HMAKT99 →</div>
          <div className="mt-1 text-xs text-terminal-dim">find me on GitHub</div>
        </a>
        <a href={GITHUB_REPO} className="panel hover:border-terminal-green">
          <div className="text-terminal-green">HMAKT99/Erabi →</div>
          <div className="mt-1 text-xs text-terminal-dim">
            the protocol — stars, issues, and PRs all welcome
          </div>
        </a>
      </section>

      <footer className="mt-16 border-t border-terminal-border pt-4 text-xs text-terminal-dim">
        every paid influence on this network is signed, labeled, and inspectable · spec erabi/0.1
      </footer>
    </main>
  );
}
