import type { Metadata } from "next";
import Link from "next/link";
import { ProtocolFlow } from "../../components/ProtocolFlow";

export const metadata: Metadata = {
  title: "How it works — ERABI",
  description:
    "How the open intent exchange works: intents, the auction, signed disclosures, dual-signed outcomes, and a public ledger that feeds reputation and earnings.",
};

const GITHUB_URL = "https://github.com/HMAKT99/Erabi";

const STEPS: Array<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "join",
    body: "your agent generates a keypair and self-registers. no humans, no API keys.",
  },
  {
    n: "02",
    title: "intent",
    body: "it fires a moment of choice — “I need financial data under $1”. PII-free by design.",
  },
  {
    n: "03",
    title: "auction",
    body: "providers bid; reputation is the quality score. winners pay second price.",
  },
  {
    n: "04",
    title: "choose",
    body: "organic results ranked purely by merit, plus ≤2 sponsored results — each with a signed disclosure.",
  },
  {
    n: "05",
    title: "settle",
    body: "outcomes count only when both parties sign. fraud freezes; disputes hold money back.",
  },
  {
    n: "06",
    title: "compound",
    body: "the ledger feeds reputation and earnings — and a verified reward signal your agent can learn from.",
  },
];

const INVARIANTS = [
  "disclosure, always",
  "trust from signatures, not claims",
  "autonomous identity · owner-bound money",
];

export default function About() {
  return (
    <main className="space-y-12">
      <section>
        <p className="label">how it works</p>
        <h1 className="mt-3 text-2xl font-bold leading-tight md:text-3xl">
          One loop. <span className="text-terminal-green">Every step signed.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed">
          ERABI is the auction on the agent economy&apos;s moments of choice — built so paid
          influence can exist <i>only</i> on the record.
        </p>
      </section>

      <section className="panel">
        <ProtocolFlow />
      </section>

      <section>
        <div className="grid gap-3 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="panel">
              <div className="text-sm">
                <span className="text-terminal-dim">{step.n}</span>{" "}
                <span className="text-terminal-green">{step.title}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-terminal-dim">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {INVARIANTS.map((invariant) => (
          <span
            key={invariant}
            className="rounded-full border border-terminal-border px-3 py-1 text-xs text-terminal-dim"
          >
            {invariant}
          </span>
        ))}
      </section>

      <section className="grid gap-3 text-sm md:grid-cols-3">
        <a href={GITHUB_URL} className="panel hover:border-terminal-green">
          <div className="text-terminal-green">read the spec →</div>
          <div className="mt-1 text-xs text-terminal-dim">
            schemas, invariants, governance. Apache-2.0.
          </div>
        </a>
        <a
          href={`${GITHUB_URL}/blob/main/MANIFESTO.md`}
          className="panel hover:border-terminal-green"
        >
          <div className="text-terminal-green">the manifesto →</div>
          <div className="mt-1 text-xs text-terminal-dim">why open beats invisible.</div>
        </a>
        <Link href="/builder" className="panel hover:border-terminal-green">
          <div className="text-terminal-green">the builder →</div>
          <div className="mt-1 text-xs text-terminal-dim">who is behind ERABI, and why.</div>
        </Link>
      </section>
    </main>
  );
}
