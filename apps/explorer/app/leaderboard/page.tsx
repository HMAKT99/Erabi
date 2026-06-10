"use client";

import { useEffect, useState } from "react";
import { ENDPOINTS, getJson } from "../../lib/api";

interface Earner {
  agent_id: string;
  name: string | null;
  earned_usd: number;
  entries: number;
}

interface AgentRow {
  manifest: { id: string; name: string; capabilities: string[] };
  tier: string;
  reputation: number;
  created_at: string;
}

export default function Leaderboard() {
  const [earners, setEarners] = useState<Earner[]>([]);
  const [byReputation, setByReputation] = useState<AgentRow[]>([]);

  useEffect(() => {
    void (async () => {
      const beacon = await getJson<{ top_earners: Earner[] }>(
        `${ENDPOINTS.attribution}/v1/stats/earnings`,
      );
      setEarners(beacon?.top_earners ?? []);
      const agents = await getJson<{ agents: AgentRow[] }>(`${ENDPOINTS.registry}/v1/agents`);
      setByReputation(
        (agents?.agents ?? []).sort((a, b) => b.reputation - a.reputation).slice(0, 15),
      );
    })();
  }, []);

  return (
    <main className="grid gap-6 md:grid-cols-2">
      <section className="panel">
        <h1 className="label mb-3">top earners — confirmed, dual-signed, public</h1>
        {earners.length === 0 ? (
          <p className="text-xs text-terminal-dim">no settlements yet.</p>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {earners.map((earner, index) => (
                <tr key={earner.agent_id} className="border-b border-terminal-border">
                  <td className="py-1.5 pr-2 text-terminal-dim">#{index + 1}</td>
                  <td className="py-1.5">
                    <a
                      href={`/agents/${encodeURIComponent(earner.agent_id)}`}
                      className="hover:text-terminal-green"
                    >
                      {earner.name ?? earner.agent_id.slice(0, 28)}
                    </a>
                  </td>
                  <td className="py-1.5 text-right text-terminal-green">
                    ${earner.earned_usd.toFixed(4)}
                  </td>
                  <td className="py-1.5 pl-2 text-right text-terminal-dim">
                    {earner.entries} entr{earner.entries === 1 ? "y" : "ies"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-[10px] text-terminal-dim">
          machine-readable: GET {ENDPOINTS.attribution}/v1/stats/earnings
        </p>
      </section>

      <section className="panel">
        <h1 className="label mb-3">top reputation — verify the evidence, not the number</h1>
        {byReputation.length === 0 ? (
          <p className="text-xs text-terminal-dim">no agents yet.</p>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {byReputation.map((agent, index) => (
                <tr key={agent.manifest.id} className="border-b border-terminal-border">
                  <td className="py-1.5 pr-2 text-terminal-dim">#{index + 1}</td>
                  <td className="py-1.5">
                    <a
                      href={`/agents/${encodeURIComponent(agent.manifest.id)}`}
                      className="hover:text-terminal-green"
                    >
                      {agent.manifest.name}
                    </a>
                  </td>
                  <td className="py-1.5 text-right text-terminal-green">{agent.reputation}</td>
                  <td className="py-1.5 pl-2 text-right uppercase text-terminal-dim">
                    {agent.tier}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
