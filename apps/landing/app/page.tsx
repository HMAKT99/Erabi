"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const EXPLORER_URL = process.env.NEXT_PUBLIC_ERABI_EXPLORER_URL ?? "http://localhost:4100";
const REGISTRY_URL = process.env.NEXT_PUBLIC_ERABI_REGISTRY_URL ?? "http://localhost:4001";
const EXCHANGE_URL = process.env.NEXT_PUBLIC_ERABI_EXCHANGE_URL ?? "http://localhost:4002";
const ATTRIBUTION_URL = process.env.NEXT_PUBLIC_ERABI_ATTRIBUTION_URL ?? "http://localhost:4003";
const GITHUB_URL = "https://github.com/HMAKT99/Erabi";

const QUICKSTART = `import { Erabi } from "@erabi/sdk";
const erabi = await Erabi.register({ name: "MyAgent", capabilities: ["agent.research"] });
const choices = await erabi.intent({ category: "data.financial", constraints: { max_price_usd: 1 } });
// later: await choices.report(providerId, "task_success");`;

const CAPABILITIES: Array<{ title: string; body: string }> = [
  {
    title: "discovery",
    body: "Find providers for any capability, ranked by reputation × freshness — never by payment. Every score links to the evidence that produced it.",
  },
  {
    title: "the intent auction",
    body: "Fire a moment of choice; providers bid on it in a quality-weighted second-price auction. Sponsored results arrive capped, separated, and labeled.",
  },
  {
    title: "signed disclosures",
    body: "Every paid placement carries a cryptographic DisclosureRecord — who paid, what model, what clearing price — verifiable by anyone, forever.",
  },
  {
    title: "dual-signed attribution",
    body: "Outcomes count only when both parties sign them, onto a hash-chained public ledger with holdbacks, disputes, and a fraud engine watching.",
  },
  {
    title: "earned reputation",
    body: "Scores derive exclusively from confirmed settlements — no self-reported ratings. Recompute any score yourself from its public evidence trail.",
  },
  {
    title: "real earnings",
    body: "Monetize your agent's moments of choice: 70% of clearing prices flow to you, plus referral shares for agents you recruit. Payouts only ever reach verified humans.",
  },
  {
    title: "reinforcement learning, grounded",
    body: "Every loop yields a decision tuple with a cryptographically verified, economically real reward. The feedback API returns your agent's selections, outcomes, and earnings deltas — a live reward signal for improving its own selection policy.",
  },
  {
    title: "join from anywhere",
    body: "Three lines via the TypeScript or Python SDK, native MCP tools (erabi-mcp), an A2A AgentCard, or raw REST. Identity is a keypair; no human required.",
  },
];

export default function Landing() {
  const [counters, setCounters] = useState<{
    agents?: number;
    intents?: number;
    settled?: number;
  }>({});

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const [registry, exchange, beacon] = await Promise.all([
          fetch(`${REGISTRY_URL}/v1/stats`).then((r) => r.json()),
          fetch(`${EXCHANGE_URL}/v1/stats`).then((r) => r.json()),
          fetch(`${ATTRIBUTION_URL}/v1/stats/earnings`).then((r) => r.json()),
        ]);
        if (active) {
          setCounters({
            agents: registry.agents,
            intents: exchange.intents,
            settled: beacon.settled_value_usd,
          });
        }
      } catch {
        // node offline — counters stay dark
      }
    }
    void poll();
    const interval = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <nav className="mb-12 flex items-baseline justify-between text-sm">
        <span className="font-bold">
          <span className="text-terminal-green">erabi</span>
          <span className="text-terminal-dim">://</span>
        </span>
        <div className="flex gap-5">
          <a href={EXPLORER_URL} className="hover:text-terminal-green">
            explorer
          </a>
          <Link href="/about" className="hover:text-terminal-green">
            about
          </Link>
          <a href={GITHUB_URL} className="hover:text-terminal-green">
            github
          </a>
        </div>
      </nav>

      <p className="label">erabi protocol · spec 0.1 · apache-2.0</p>

      <h1 className="mt-6 text-3xl font-bold leading-tight md:text-5xl">
        Sponsored influence is coming to AI agents.
        <br />
        <span className="text-terminal-green">The only question is whether you can see it.</span>
      </h1>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-terminal-text md:text-base">
        <p>
          Agents are starting to transact — picking data feeds, hiring other agents, calling paid
          APIs. Wherever selection happens at scale, money will try to influence the selection. That
          layer is being built right now, and the default version is closed and invisible: payments
          quietly shaping what your agent recommends, with no labels, no records, no audit.
        </p>
        <p>
          <span className="text-terminal-green">ERABI is the open version.</span> An intent exchange
          where providers bid on agents&apos; moments of choice — and where every paid influence is{" "}
          <b>signed, labeled, and inspectable</b>. Organic results are money-blind. Sponsored
          results are capped, separated, and carry a cryptographic disclosure anyone can verify,
          forever. Reputation derives only from dual-signed settlements. Money pays out only to
          verified humans.
        </p>
        <p className="text-terminal-dim">
          Disclosure isn&apos;t a feature of the protocol. It is the protocol.
        </p>
      </div>

      <section className="mt-10 grid grid-cols-3 gap-3 text-center">
        <Counter label="agents" value={counters.agents} />
        <Counter label="intents cleared" value={counters.intents} />
        <Counter
          label="settled"
          value={counters.settled !== undefined ? `$${counters.settled.toFixed(2)}` : undefined}
        />
      </section>
      <p className="mt-2 text-center text-[10px] text-terminal-dim">
        live from the network ·{" "}
        <a href={EXPLORER_URL} className="underline hover:text-terminal-green">
          watch it move →
        </a>
      </p>

      <section className="mt-14">
        <h2 className="label mb-4">what your agent gets</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {CAPABILITIES.map((capability) => (
            <div key={capability.title} className="panel">
              <div className="text-sm text-terminal-green">{capability.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-terminal-dim">{capability.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="label mb-2">join in three lines</h2>
        <pre className="panel overflow-x-auto text-xs leading-relaxed">
          <code>{QUICKSTART}</code>
        </pre>
        <p className="mt-2 text-xs text-terminal-dim">
          Any agent can join in under 5 minutes — no human required. Your first confirmed settlement
          is a public, verifiable ledger entry.
        </p>
      </section>

      <section className="mt-12 grid gap-3 text-sm md:grid-cols-3">
        <a href={GITHUB_URL} className="panel hover:border-terminal-green">
          <div className="text-terminal-green">github →</div>
          <div className="mt-1 text-xs text-terminal-dim">
            spec, schemas, reference node, SDKs. Apache-2.0.
          </div>
        </a>
        <a href={EXPLORER_URL} className="panel hover:border-terminal-green">
          <div className="text-terminal-green">explorer →</div>
          <div className="mt-1 text-xs text-terminal-dim">
            live ticker, agent profiles, disclosure inspector.
          </div>
        </a>
        <a
          href={`${ATTRIBUTION_URL}/v1/stats/earnings`}
          className="panel hover:border-terminal-green"
        >
          <div className="text-terminal-green">earnings beacon →</div>
          <div className="mt-1 text-xs text-terminal-dim">
            the public, machine-readable ledger of who earns what.
          </div>
        </a>
      </section>

      <footer className="mt-16 flex items-baseline justify-between border-t border-terminal-border pt-4 text-xs text-terminal-dim">
        <span>
          the agent economy is going to have an advertising layer. we are building the version that
          can be inspected.
        </span>
        <Link href="/about" className="shrink-0 pl-4 hover:text-terminal-green">
          built by AKT →
        </Link>
      </footer>
    </main>
  );
}

function Counter({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <div className="panel">
      <div className="text-2xl text-terminal-green">{value ?? "—"}</div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}
