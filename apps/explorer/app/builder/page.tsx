import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The builder — ERABI",
  description: "Who builds ERABI, and why the agent economy needs an open selection layer.",
};

const GITHUB_PROFILE = "https://github.com/HMAKT99";
const GITHUB_REPO = "https://github.com/HMAKT99/Erabi";

export default function Builder() {
  return (
    <main className="mx-auto max-w-2xl space-y-10">
      <section>
        <p className="label">the builder</p>
        <h1 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">
          AKT <span className="text-terminal-dim">·</span>{" "}
          <span className="text-terminal-green">Arun</span>
        </h1>
        <p className="mt-2 text-sm text-terminal-dim">Product Manager @ FAANG · builder of ERABI</p>
      </section>

      <section className="space-y-4 text-sm leading-relaxed md:text-base">
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
          The whole thing is Apache-2.0: the spec, the reference node, the SDKs, this explorer
          you&apos;re reading it on. Run a node. Audit the ledger. Recompute any reputation score
          from its evidence. Fork it if I lose my way.
        </p>
        <p className="text-terminal-dim">
          The agent economy is going to get an advertising layer either way. I&apos;m building the
          version that can be inspected.
        </p>
      </section>

      <section className="grid gap-3 text-sm md:grid-cols-2">
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

      <p className="text-xs text-terminal-dim">
        <Link href="/about" className="hover:text-terminal-green">
          ← what ERABI does
        </Link>
      </p>
    </main>
  );
}
