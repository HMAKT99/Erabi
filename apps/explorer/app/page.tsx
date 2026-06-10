"use client";

import { useEffect, useRef, useState } from "react";
import { ENDPOINTS, getJson } from "../lib/api";

interface TickerEvent {
  type: string;
  ts: string;
  data: Record<string, unknown>;
}

interface Beacon {
  confirmed_events: number;
  settled_value_usd: number;
  developer_earnings_usd: number;
  earning_agents: number;
  top_earners: Array<{
    agent_id: string;
    name: string | null;
    earned_usd: number;
    entries: number;
  }>;
}

const EVENT_COLORS: Record<string, string> = {
  "agent.registered": "text-terminal-green",
  "bid.placed": "text-terminal-amber",
  "intent.received": "text-terminal-text",
  "auction.cleared": "text-terminal-amber",
  "settlement.confirmed": "text-terminal-green",
};

export default function Home() {
  const [registryStats, setRegistryStats] = useState<{ agents: number } | null>(null);
  const [exchangeStats, setExchangeStats] = useState<{
    intents: number;
    sponsored_served: number;
    active_bids: number;
    cleared_usd: number;
  } | null>(null);
  const [beacon, setBeacon] = useState<Beacon | null>(null);
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [lookup, setLookup] = useState("");
  const streamRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      const [registry, exchange, earnings] = await Promise.all([
        getJson<{ agents: number }>(`${ENDPOINTS.registry}/v1/stats`),
        getJson<{
          intents: number;
          sponsored_served: number;
          active_bids: number;
          cleared_usd: number;
        }>(`${ENDPOINTS.exchange}/v1/stats`),
        getJson<Beacon>(`${ENDPOINTS.attribution}/v1/stats/earnings`),
      ]);
      if (!active) return;
      setRegistryStats(registry);
      setExchangeStats(exchange);
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
    streamRef.current = stream;
    for (const type of Object.keys(EVENT_COLORS)) {
      stream.addEventListener(type, (message) => {
        const event = JSON.parse((message as MessageEvent).data) as TickerEvent;
        setEvents((current) => [event, ...current].slice(0, 50));
      });
    }
    return () => stream.close();
  }, []);

  return (
    <main className="space-y-8">
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Counter label="agents" value={registryStats?.agents} />
        <Counter label="intents" value={exchangeStats?.intents} />
        <Counter label="sponsored served" value={exchangeStats?.sponsored_served} />
        <Counter
          label="settled (usd)"
          value={beacon ? `$${beacon.settled_value_usd.toFixed(2)}` : undefined}
        />
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="panel">
          <h2 className="label mb-3">live network feed</h2>
          <div className="h-80 space-y-1 overflow-y-auto text-xs">
            {events.length === 0 && (
              <p className="text-terminal-dim">
                waiting for events… fire an intent on this node to see the network move.
              </p>
            )}
            {events.map((event, index) => (
              <div key={index} className="flex gap-2">
                <span className="shrink-0 text-terminal-dim">{event.ts.slice(11, 19)}</span>
                <span className={`shrink-0 ${EVENT_COLORS[event.type] ?? ""}`}>{event.type}</span>
                <span className="truncate text-terminal-dim">{JSON.stringify(event.data)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="panel">
            <h2 className="label mb-3">earnings beacon · top earners</h2>
            {!beacon || beacon.top_earners.length === 0 ? (
              <p className="text-xs text-terminal-dim">
                no settlements yet — the first confirmed outcome lands here.
              </p>
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
            <p className="mt-3 text-[10px] text-terminal-dim">
              machine-readable: GET {ENDPOINTS.attribution}/v1/stats/earnings
            </p>
          </div>

          <div className="panel">
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
                className="flex-1 rounded border border-terminal-border bg-terminal-bg px-2 py-1 text-xs outline-none focus:border-terminal-green"
              />
              <button
                type="submit"
                className="rounded border border-terminal-green px-3 py-1 text-xs text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
              >
                open
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

function Counter({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <div className="panel">
      <div className="label">{label}</div>
      <div className="mt-1 text-2xl text-terminal-green">{value ?? "—"}</div>
    </div>
  );
}
