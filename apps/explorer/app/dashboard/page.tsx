"use client";

import { useEffect, useState } from "react";
import { ENDPOINTS, getJson } from "../../lib/api";

/**
 * Owner dashboard (§9.4): the read-only humans' view. Agent ids are kept
 * locally in the browser — the node has no concept of a login, only of
 * signed agents and verified owners.
 */

const STORAGE_KEY = "erabi.dashboard.agents";

interface AgentSummary {
  id: string;
  name: string;
  tier: string;
  reputation: number;
  payoutBound: boolean;
  earnings: {
    accrued_usd: number;
    referral_usd: number;
    frozen_usd: number;
    paid_usd: number;
    available_usd: number;
  } | null;
  disputes: number;
  frozenEvents: number;
  chainValid: boolean | null;
}

export default function Dashboard() {
  const [ids, setIds] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIds(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    void (async () => {
      const summaries = await Promise.all(ids.map(loadAgent));
      setAgents(summaries.filter((s): s is AgentSummary => s !== null));
    })();
  }, [ids, loaded]);

  async function loadAgent(id: string): Promise<AgentSummary | null> {
    const encoded = encodeURIComponent(id);
    const view = await getJson<{
      manifest: { name: string; owner: { payout_binding: string | null } };
      tier: string;
      reputation: number;
    }>(`${ENDPOINTS.registry}/v1/agents/${encoded}`);
    if (!view) return null;
    const [earnings, ledger] = await Promise.all([
      getJson<AgentSummary["earnings"]>(`${ENDPOINTS.attribution}/v1/earnings/${encoded}`),
      getJson<{ chain_valid: boolean; events: Array<{ kind: string; status: string }> }>(
        `${ENDPOINTS.attribution}/v1/ledger/${encoded}`,
      ),
    ]);
    return {
      id,
      name: view.manifest.name,
      tier: view.tier,
      reputation: view.reputation,
      payoutBound: view.manifest.owner.payout_binding !== null,
      earnings,
      disputes: ledger?.events.filter((e) => e.kind === "dispute").length ?? 0,
      frozenEvents:
        ledger?.events.filter((e) => e.status === "under_review" || e.status === "disputed")
          .length ?? 0,
      chainValid: ledger?.chain_valid ?? null,
    };
  }

  const totals = agents.reduce(
    (sum, agent) => ({
      accrued: sum.accrued + (agent.earnings?.accrued_usd ?? 0),
      available: sum.available + (agent.earnings?.available_usd ?? 0),
      paid: sum.paid + (agent.earnings?.paid_usd ?? 0),
    }),
    { accrued: 0, available: 0, paid: 0 },
  );

  return (
    <main className="space-y-6">
      <section className="panel">
        <h1 className="label mb-2">owner dashboard</h1>
        <p className="mb-4 text-xs text-terminal-dim">
          add your agents&apos; ids to watch earnings, reputation, and disputes in one place. stored
          only in this browser.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const id = input.trim();
            if (id && !ids.includes(id)) setIds([...ids, id]);
            setInput("");
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="erabi:agent:…"
            className="flex-1 rounded border border-terminal-border bg-terminal-bg px-2 py-1 text-xs outline-none focus:border-terminal-green"
          />
          <button
            type="submit"
            className="rounded border border-terminal-green px-3 py-1 text-xs text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
          >
            add
          </button>
        </form>
      </section>

      {agents.length > 0 && (
        <section className="grid grid-cols-3 gap-4">
          <Stat label="accrued" value={`$${totals.accrued.toFixed(4)}`} />
          <Stat label="available" value={`$${totals.available.toFixed(4)}`} />
          <Stat label="paid out" value={`$${totals.paid.toFixed(4)}`} />
        </section>
      )}

      {agents.map((agent) => (
        <section key={agent.id} className="panel">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <a
              href={`/agents/${encodeURIComponent(agent.id)}`}
              className="text-terminal-green hover:underline"
            >
              {agent.name}
            </a>
            <div className="flex items-center gap-3 text-xs">
              <span className="uppercase text-terminal-dim">{agent.tier}</span>
              <span>rep {agent.reputation}</span>
              <button
                onClick={() => setIds(ids.filter((id) => id !== agent.id))}
                className="text-terminal-dim hover:text-terminal-red"
              >
                remove
              </button>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-6">
            <Cell label="accrued" value={`$${(agent.earnings?.accrued_usd ?? 0).toFixed(4)}`} />
            <Cell label="available" value={`$${(agent.earnings?.available_usd ?? 0).toFixed(4)}`} />
            <Cell label="paid" value={`$${(agent.earnings?.paid_usd ?? 0).toFixed(4)}`} />
            <Cell
              label="payout"
              value={agent.payoutBound ? "bound" : "unbound"}
              warn={!agent.payoutBound}
            />
            <Cell
              label="disputes / frozen"
              value={`${agent.disputes} / ${agent.frozenEvents}`}
              warn={agent.disputes + agent.frozenEvents > 0}
            />
            <Cell
              label="ledger"
              value={agent.chainValid === false ? "CHAIN BROKEN" : "verified"}
              warn={agent.chainValid === false}
            />
          </dl>
          {!agent.payoutBound && (
            <p className="mt-2 text-[10px] text-terminal-amber">
              earnings accrue but cannot pay out until a verified owner binds a payout destination.
            </p>
          )}
        </section>
      ))}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel text-center">
      <div className="text-xl text-terminal-green">{value}</div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}

function Cell({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={`mt-0.5 ${warn ? "text-terminal-amber" : ""}`}>{value}</dd>
    </div>
  );
}
