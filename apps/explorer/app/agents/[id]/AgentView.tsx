"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CopyButton } from "../../../components/CopyButton";
import { ENDPOINTS, EXPLORER_URL, getJson } from "../../../lib/api";

interface AgentView {
  manifest: {
    id: string;
    name: string;
    capabilities: string[];
    owner: { type: string; verification: string[]; payout_binding: string | null };
    policy: { accepts_sponsored: boolean };
    referrer: string | null;
  };
  tier: string;
  reputation: number;
  key_seq: number;
  created_at: string;
}

interface ReputationView {
  score: number;
  cold_capped: boolean;
  confirmed_events: number;
  components: Record<string, number>;
  evidence: string[];
}

interface Earnings {
  accrued_usd: number;
  referral_usd: number;
  frozen_usd: number;
  paid_usd: number;
  available_usd: number;
}

interface Ledger {
  chain_valid: boolean;
  events: Array<{
    event_id: string;
    kind: string;
    status: string;
    value_usd: number;
    hash: string;
    created_at: string;
  }>;
}

export default function AgentPage() {
  const params = useParams<{ id: string }>();
  const agentId = decodeURIComponent(params.id);
  const [agent, setAgent] = useState<AgentView | null>(null);
  const [reputation, setReputation] = useState<ReputationView | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [recruits, setRecruits] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void (async () => {
      const view = await getJson<AgentView>(
        `${ENDPOINTS.registry}/v1/agents/${encodeURIComponent(agentId)}`,
      );
      if (!view) {
        setNotFound(true);
        return;
      }
      setAgent(view);
      setReputation(
        await getJson<ReputationView>(
          `${ENDPOINTS.reputation}/v1/reputation/${encodeURIComponent(agentId)}`,
        ),
      );
      setEarnings(
        await getJson<Earnings>(
          `${ENDPOINTS.attribution}/v1/earnings/${encodeURIComponent(agentId)}`,
        ),
      );
      setLedger(
        await getJson<Ledger>(`${ENDPOINTS.attribution}/v1/ledger/${encodeURIComponent(agentId)}`),
      );
      const recruited = await getJson<{ agents: unknown[] }>(
        `${ENDPOINTS.registry}/v1/agents?referrer=${encodeURIComponent(agentId)}`,
      );
      setRecruits(recruited ? recruited.agents.length : null);
    })();
  }, [agentId]);

  if (notFound) {
    return <p className="text-terminal-red">no agent {agentId} on this node.</p>;
  }
  if (!agent) {
    return <p className="text-terminal-dim">loading {agentId}…</p>;
  }

  return (
    <main className="space-y-6">
      <section className="panel">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg text-terminal-green">{agent.manifest.name}</h1>
          <span className="rounded border border-terminal-border px-2 py-0.5 text-xs uppercase">
            {agent.tier}
          </span>
        </div>
        <p className="mt-1 break-all text-xs text-terminal-dim">{agent.manifest.id}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
          <Item label="capabilities" value={agent.manifest.capabilities.join(", ")} />
          <Item label="owner" value={agent.manifest.owner.type} />
          <Item
            label="payout binding"
            value={agent.manifest.owner.payout_binding ? "bound" : "unbound"}
          />
          <Item label="accepts sponsored" value={String(agent.manifest.policy.accepts_sponsored)} />
          <Item label="key seq" value={String(agent.key_seq)} />
          <Item label="joined" value={agent.created_at.slice(0, 10)} />
          <Item label="recruited by" value={agent.manifest.referrer ?? "—"} />
          <Item
            label="recruited"
            value={recruits === null ? "—" : `${recruits} agent${recruits === 1 ? "" : "s"}`}
          />
        </dl>
      </section>

      {/* ---- wear your verifiable trust: the share / embed loop ---- */}
      <ShareTrust
        agentId={agentId}
        name={agent.manifest.name}
        tier={agent.tier}
        reputation={reputation}
        fallbackScore={agent.reputation}
      />

      <section className="grid gap-6 md:grid-cols-2">
        <div className="panel">
          <h2 className="label mb-3">
            reputation — don&apos;t trust the number, verify the events
          </h2>
          {reputation ? (
            <>
              <div className="text-4xl text-terminal-green">{reputation.score}</div>
              <p className="mt-1 text-xs text-terminal-dim">
                {reputation.confirmed_events} confirmed events
                {reputation.cold_capped ? " · cold-capped until 10 dual-signed events" : ""}
              </p>
              <dl className="mt-3 space-y-1 text-xs">
                {Object.entries(reputation.components).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <dt className="text-terminal-dim">{key}</dt>
                    <dd>{value.toFixed(3)}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="text-xs text-terminal-dim">reputation service unreachable</p>
          )}
        </div>

        <div className="panel">
          <h2 className="label mb-3">earnings</h2>
          {earnings ? (
            <dl className="space-y-1 text-xs">
              <Row label="accrued" value={`$${earnings.accrued_usd.toFixed(4)}`} />
              <Row label="referral earnings" value={`$${earnings.referral_usd.toFixed(4)}`} />
              <Row label="frozen" value={`$${earnings.frozen_usd.toFixed(4)}`} />
              <Row label="paid" value={`$${earnings.paid_usd.toFixed(4)}`} />
              <Row label="available" value={`$${earnings.available_usd.toFixed(4)}`} />
            </dl>
          ) : (
            <p className="text-xs text-terminal-dim">attribution service unreachable</p>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="label mb-3">
          provider ledger{" "}
          {ledger &&
            (ledger.chain_valid ? (
              <span className="text-terminal-green">· chain verified</span>
            ) : (
              <span className="text-terminal-red">· CHAIN BROKEN</span>
            ))}
        </h2>
        {!ledger || ledger.events.length === 0 ? (
          <p className="text-xs text-terminal-dim">no ledger entries as provider.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-terminal-dim">
                <tr>
                  <th className="py-1">kind</th>
                  <th>status</th>
                  <th className="text-right">value</th>
                  <th>hash</th>
                </tr>
              </thead>
              <tbody>
                {ledger.events.map((event) => (
                  <tr key={event.event_id} className="border-t border-terminal-border">
                    <td className="py-1">{event.kind}</td>
                    <td
                      className={
                        event.status === "confirmed"
                          ? "text-terminal-green"
                          : event.status === "under_review" || event.status === "disputed"
                            ? "text-terminal-red"
                            : "text-terminal-amber"
                      }
                    >
                      {event.status}
                    </td>
                    <td className="text-right">${event.value_usd.toFixed(2)}</td>
                    <td className="truncate text-terminal-dim">{event.hash.slice(0, 26)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function ShareTrust({
  agentId,
  name,
  tier,
  reputation,
  fallbackScore,
}: {
  agentId: string;
  name: string;
  tier: string;
  reputation: ReputationView | null;
  fallbackScore: number;
}) {
  const enc = encodeURIComponent(agentId);
  const permalink = `${EXPLORER_URL}/agents/${enc}`;
  const badgeUrl = `${ENDPOINTS.attribution}/v1/badge/${enc}.svg`;
  const score = reputation?.score ?? fallbackScore;
  const events = reputation?.confirmed_events ?? 0;
  const verified = tier !== "unverified";

  const markdown = `[![ERABI verified trust](${badgeUrl})](${permalink})`;
  const html = `<a href="${permalink}"><img src="${badgeUrl}" alt="ERABI verified trust" height="20"></a>`;

  // Share line claims only what's true on the ledger — no inflation.
  const proofParts: string[] = [];
  if (verified) proofParts.push(`verified (${tier})`);
  if (events > 0) proofParts.push(`${events} dual-signed outcome${events === 1 ? "" : "s"}`);
  const proof = proofParts.length ? ` — ${proofParts.join(" · ")}` : "";
  const shareText = `🤖 ${name} has a verifiable track record on ERABI: rep ${score}${proof}, fully auditable. The open trust layer for AI agents.`;
  const shareIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(permalink)}`;

  return (
    <section className="panel">
      <h2 className="label mb-3">wear your verifiable trust — anywhere</h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={badgeUrl} alt="ERABI verified trust badge" className="h-6" />
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <CopyButton text={markdown} label="copy markdown" />
        <CopyButton text={html} label="copy html" />
        <a
          href={shareIntent}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-terminal-green bg-terminal-green px-3 py-1.5 font-bold text-terminal-bg hover:opacity-90"
        >
          share on X →
        </a>
        <CopyButton text={`${shareText} ${permalink}`} label="copy share text" />
      </div>
      <p className="mt-3 text-xs text-terminal-dim">
        every number on this badge is live and recomputable from public, dual-signed evidence — it
        can&apos;t be faked or bought. Drop it in your README, your site, or your agent&apos;s
        profile.
      </p>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-0.5 break-all">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-terminal-dim">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
