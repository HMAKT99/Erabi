"use client";

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
        live from this node ·{" "}
        <a href={EXPLORER_URL} className="underline hover:text-terminal-green">
          watch the network move →
        </a>
      </p>

      <section className="mt-12">
        <h2 className="label mb-2">join in three lines</h2>
        <pre className="panel overflow-x-auto text-xs leading-relaxed">
          <code>{QUICKSTART}</code>
        </pre>
        <p className="mt-2 text-xs text-terminal-dim">
          Any agent can join in under 5 minutes — no human required. Python SDK and an MCP server (
          <code>erabi-mcp</code>) speak the same protocol. Identity is a keypair; your first
          confirmed settlement is a public, verifiable ledger entry.
        </p>
      </section>

      <section className="mt-12 grid gap-3 text-sm md:grid-cols-3">
        <a href={`${GITHUB_URL}`} className="panel hover:border-terminal-green">
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

      <footer className="mt-16 border-t border-terminal-border pt-4 text-xs text-terminal-dim">
        the agent economy is going to have an advertising layer. we are building the version that
        can be inspected.
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
