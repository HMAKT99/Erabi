"use client";

import { useEffect, useMemo, useState } from "react";
import { ENDPOINTS, getJson } from "../../lib/api";

interface AgentRow {
  manifest: { id: string; name: string; capabilities: string[] };
  tier: string;
  reputation: number;
  created_at: string;
}

const PAGE_SIZE = 25;

export default function AgentDirectory() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [query, setQuery] = useState("");
  const [capability, setCapability] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    void getJson<{ agents: AgentRow[] }>(`${ENDPOINTS.registry}/v1/agents`).then((result) =>
      setAgents(result?.agents ?? []),
    );
  }, []);

  const capabilities = useMemo(
    () => [...new Set(agents.flatMap((a) => a.manifest.capabilities))].sort(),
    [agents],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return agents
      .filter(
        (agent) =>
          (!capability || agent.manifest.capabilities.includes(capability)) &&
          (!needle ||
            agent.manifest.name.toLowerCase().includes(needle) ||
            agent.manifest.id.toLowerCase().includes(needle)),
      )
      .sort((a, b) => b.reputation - a.reputation);
  }, [agents, query, capability]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <main className="space-y-4">
      <section className="panel flex flex-wrap items-center gap-2">
        <h1 className="label mr-2">agent directory</h1>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="search name or id…"
          className="flex-1 rounded border border-terminal-border bg-terminal-bg px-2 py-1 text-xs outline-none focus:border-terminal-green"
        />
        <select
          value={capability}
          onChange={(event) => {
            setCapability(event.target.value);
            setPage(0);
          }}
          className="rounded border border-terminal-border bg-terminal-bg px-2 py-1 text-xs outline-none focus:border-terminal-green"
        >
          <option value="">all capabilities</option>
          {capabilities.map((cap) => (
            <option key={cap} value={cap}>
              {cap}
            </option>
          ))}
        </select>
        <span className="text-xs text-terminal-dim">{filtered.length} agents</span>
      </section>

      <section className="panel">
        <table className="w-full text-xs">
          <thead className="text-left text-terminal-dim">
            <tr>
              <th className="py-1">agent</th>
              <th>capabilities</th>
              <th className="text-right">reputation</th>
              <th className="text-right">tier</th>
              <th className="text-right">joined</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((agent) => (
              <tr key={agent.manifest.id} className="border-t border-terminal-border">
                <td className="py-1.5">
                  <a
                    href={`/agents/${encodeURIComponent(agent.manifest.id)}`}
                    className="hover:text-terminal-green"
                  >
                    {agent.manifest.name}
                  </a>
                </td>
                <td className="text-terminal-dim">{agent.manifest.capabilities.join(", ")}</td>
                <td className="text-right text-terminal-green">{agent.reputation}</td>
                <td className="text-right uppercase text-terminal-dim">{agent.tier}</td>
                <td className="text-right text-terminal-dim">{agent.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-xs">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="rounded border border-terminal-border px-2 py-0.5 disabled:opacity-40"
            >
              prev
            </button>
            <span className="text-terminal-dim">
              {page + 1} / {pages}
            </span>
            <button
              disabled={page >= pages - 1}
              onClick={() => setPage(page + 1)}
              className="rounded border border-terminal-border px-2 py-0.5 disabled:opacity-40"
            >
              next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
