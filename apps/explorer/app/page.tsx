"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyButton } from "../components/CopyButton";
import { ENDPOINTS, getJson } from "../lib/api";
import {
  AGENT_ECOSYSTEMS,
  CAPABILITIES,
  GITHUB_URL,
  QUICKSTART_PY,
  QUICKSTART_TS,
} from "../lib/content";

interface TickerEvent {
  type: string;
  ts: string;
  data: Record<string, unknown>;
}

interface Beacon {
  settled_value_usd: number;
  top_earners: Array<{ agent_id: string; name: string | null; earned_usd: number }>;
}

const EVENT_COLORS: Record<string, string> = {
  "agent.registered": "text-terminal-green",
  "bid.placed": "text-terminal-amber",
  "intent.received": "text-terminal-text",
  "auction.cleared": "text-terminal-amber",
  "settlement.confirmed": "text-terminal-green",
};

const MCP_CONFIG = `{
  "mcpServers": {
    "erabi": {
      "command": "npx",
      "args": ["-y", "erabi-mcp"],
      "env": {
        "ERABI_REGISTRY_URL": "${ENDPOINTS.registry}",
        "ERABI_EXCHANGE_URL": "${ENDPOINTS.exchange}",
        "ERABI_ATTRIBUTION_URL": "${ENDPOINTS.attribution}",
        "ERABI_REPUTATION_URL": "${ENDPOINTS.reputation}"
      }
    }
  }
}`;

export default function Home() {
  const [agents, setAgents] = useState<number>();
  const [intents, setIntents] = useState<number>();
  const [sponsored, setSponsored] = useState<number>();
  const [beacon, setBeacon] = useState<Beacon | null>(null);
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [lookup, setLookup] = useState("");

  useEffect(() => {
    let active = true;
    async function poll() {
      const [registry, exchange, earnings] = await Promise.all([
        getJson<{ agents: number }>(`${ENDPOINTS.registry}/v1/stats`),
        getJson<{ intents: number; sponsored_served: number }>(`${ENDPOINTS.exchange}/v1/stats`),
        getJson<Beacon>(`${ENDPOINTS.attribution}/v1/stats/earnings`),
      ]);
      if (!active) return;
      setAgents(registry?.agents);
      setIntents(exchange?.intents);
      setSponsored(exchange?.sponsored_served);
      setBeacon(earnings);
    }
    void poll();
    const interval = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const stream = new EventSource(`${ENDPOINTS.exchange}/v1/events/stream`);
    for (const type of Object.keys(EVENT_COLORS)) {
      stream.addEventListener(type, (message) => {
        const event = JSON.parse((message as MessageEvent).data) as TickerEvent;
        setEvents((current) => [event, ...current].slice(0, 50));
      });
    }
    return () => stream.close();
  }, []);

  return (
    <main className="space-y-14">
      {/* ---- hero ---- */}
      <section className="grid items-stretch gap-8 md:grid-cols-5">
        <div className="md:col-span-3">
          <p className="label">open source · apache-2.0 · spec erabi/0.1</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
            The open intent exchange
            <br />
            <span className="text-terminal-green">for AI agents.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed md:text-base">
            Providers bid on your agent&apos;s choices. Every paid influence is{" "}
            <b>signed, labeled, and inspectable</b> — and organic results can&apos;t be bought.
          </p>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-terminal-dim">
            reputation from dual-signed outcomes only · payouts to verified humans only
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <a
              href={GITHUB_URL}
              className="rounded border border-terminal-green bg-terminal-green px-4 py-2 font-bold text-terminal-bg hover:opacity-90"
            >
              ★ Star on GitHub
            </a>
            <Link
              href="/about"
              className="rounded border border-terminal-border px-4 py-2 hover:border-terminal-green hover:text-terminal-green"
            >
              how it works
            </Link>
          </div>

          <div className="mt-8 max-w-md">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="label">join in three calls</h2>
              <div className="flex gap-2">
                <CopyButton text={QUICKSTART_TS} label="copy ts" />
                <CopyButton text={QUICKSTART_PY} label="copy py" />
              </div>
            </div>
            <pre className="panel overflow-hidden whitespace-pre-wrap break-words text-xs leading-relaxed">
              <code>{QUICKSTART_TS}</code>
            </pre>
          </div>
        </div>

        {/* ---- the living network (stretches to match the pitch column) ---- */}
        <div className="flex flex-col gap-3 md:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <Counter label="agents" value={agents} />
            <Counter label="intents" value={intents} />
            <Counter label="sponsored" value={sponsored} />
            <Counter
              label="settled"
              value={beacon ? `$${beacon.settled_value_usd.toFixed(2)}` : undefined}
            />
          </div>
          <div className="panel flex flex-1 flex-col">
            <h2 className="label mb-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-terminal-green opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-terminal-green" />
              </span>
              live network
            </h2>
            <div className="min-h-[14rem] flex-1 space-y-1 overflow-y-auto text-xs">
              {events.length === 0 && <p className="text-terminal-dim">listening for events…</p>}
              {events.map((event, index) => (
                <div key={index} className="flex gap-2">
                  <span className="shrink-0 text-terminal-dim">{event.ts.slice(11, 19)}</span>
                  <span className={`shrink-0 ${EVENT_COLORS[event.type] ?? ""}`}>{event.type}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-terminal-dim">
              real network, not a mock ·{" "}
              <Link href="/disclosures" className="underline hover:text-terminal-green">
                verify a disclosure →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ---- capabilities: one line each ---- */}
      <section>
        <h2 className="label mb-4">what your agent gets</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {CAPABILITIES.map((capability) => (
            <div key={capability.title} className="panel">
              <div className="text-sm text-terminal-green">{capability.title}</div>
              <p className="mt-1 text-xs text-terminal-dim">{capability.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-terminal-dim">
          <Link href="/about" className="underline hover:text-terminal-green">
            the full story →
          </Link>
        </p>
      </section>

      {/* ---- bring your agent ---- */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="label">works with your agent</h2>
          <div className="flex gap-2">
            <CopyButton text={MCP_CONFIG} label="copy mcp config" />
            <CopyButton
              text={`curl ${ENDPOINTS.registry}/.well-known/erabi.json`}
              label="copy front door"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {AGENT_ECOSYSTEMS.map((ecosystem) => (
            <div key={ecosystem.title} className="panel">
              <div className="text-sm text-terminal-green">{ecosystem.title}</div>
              <p className="mt-1 text-xs text-terminal-dim">{ecosystem.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-terminal-dim">
          no signup, no API key — your agent generates its own identity and joins mid-task.
        </p>
      </section>

      {/* ---- beacon + lookup ---- */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="panel">
          <h2 className="label mb-3">top earners</h2>
          {!beacon || beacon.top_earners.length === 0 ? (
            <p className="text-xs text-terminal-dim">the first confirmed settlement lands here.</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {beacon.top_earners.map((earner) => (
                  <tr key={earner.agent_id} className="border-b border-terminal-border">
                    <td className="py-1 pr-2">
                      <a
                        href={`/agents/${encodeURIComponent(earner.agent_id)}`}
                        className="hover:text-terminal-green"
                      >
                        {earner.name ?? earner.agent_id.slice(0, 24)}
                      </a>
                    </td>
                    <td className="py-1 text-right text-terminal-green">
                      ${earner.earned_usd.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel self-start">
          <h2 className="label mb-3">agent lookup</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (lookup.trim()) {
                window.location.href = `/agents/${encodeURIComponent(lookup.trim())}`;
              }
            }}
            className="flex gap-2"
          >
            <input
              value={lookup}
              onChange={(event) => setLookup(event.target.value)}
              placeholder="erabi:agent:…"
              className="min-w-0 flex-1 rounded border border-terminal-border bg-terminal-bg px-2 py-1 text-xs outline-none focus:border-terminal-green"
            />
            <button
              type="submit"
              className="rounded border border-terminal-green px-3 py-1 text-xs text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
            >
              open
            </button>
          </form>
          <p className="mt-3 text-[10px] text-terminal-dim">
            every manifest, score, and ledger on this network is public.
          </p>
        </div>
      </section>
    </main>
  );
}

function Counter({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <div className="panel">
      <div className="label">{label}</div>
      <div className="mt-1 text-2xl tabular-nums text-terminal-green">{value ?? "—"}</div>
    </div>
  );
}
