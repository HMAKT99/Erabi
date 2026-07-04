"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ENDPOINTS, getJson } from "../../lib/api";

export interface ServiceSummary {
  slug: string;
  service_id: string | null;
  url: string;
  title: string | null;
  category: string;
  claim: string | null;
  alive: boolean | null;
  last_probe_ts: string | null;
  latency_ms: number | null;
  price_usd: number | null;
  x402_version: string | null;
  uptime_24h_pct: number | null;
  uptime_7d_pct: number | null;
  uptime_30d_pct: number | null;
  latency_ms_p50_24h: number | null;
  probes_24h: number;
  attestation_url: string;
  badge_url: string;
}

type SortKey = "uptime" | "latency" | "price";

export function statusColor(uptime: number | null): string {
  if (uptime === null) return "bg-terminal-dim";
  if (uptime >= 99) return "bg-terminal-green";
  if (uptime >= 95) return "bg-terminal-amber";
  return "bg-terminal-red";
}

export function fmtUptime(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

export function fmtLatency(value: number | null): string {
  return value === null ? "—" : `${value} ms`;
}

export function fmtPrice(value: number | null): string {
  return value === null ? "—" : `$${value}/call`;
}

export default function ServicesView() {
  const [services, setServices] = useState<ServiceSummary[] | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("uptime");

  useEffect(() => {
    void getJson<{ services: ServiceSummary[] }>(`${ENDPOINTS.index}/v1/services`).then((body) =>
      setServices(body?.services ?? []),
    );
  }, []);

  const sorted = useMemo(() => {
    if (!services) return null;
    const copy = [...services];
    if (sortKey === "uptime") {
      copy.sort((a, b) => (b.uptime_24h_pct ?? -1) - (a.uptime_24h_pct ?? -1));
    } else if (sortKey === "latency") {
      copy.sort(
        (a, b) =>
          (a.latency_ms_p50_24h ?? Number.MAX_VALUE) - (b.latency_ms_p50_24h ?? Number.MAX_VALUE),
      );
    } else {
      copy.sort((a, b) => (a.price_usd ?? Number.MAX_VALUE) - (b.price_usd ?? Number.MAX_VALUE));
    }
    return copy;
  }, [services, sortKey]);

  const headerButton = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => setSortKey(key)}
      className={`uppercase tracking-wide ${sortKey === key ? "text-terminal-green" : "text-terminal-dim hover:text-terminal-text"}`}
    >
      {label}
      {sortKey === key ? " ▾" : ""}
    </button>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold">x402 service reliability index</h1>
      <p className="mt-2 max-w-3xl text-sm text-terminal-dim">
        Every paid (x402) agent service below is probed continuously by the ERABI node. Each probe
        is published as a <span className="text-terminal-text">signed attestation</span> your agent
        can fetch and verify instead of re-checking the service itself. Dead services stay listed —
        an index that hides failures is not a reliability index.
      </p>

      {sorted === null ? (
        <p className="mt-10 text-terminal-dim">loading live index…</p>
      ) : sorted.length === 0 ? (
        <p className="mt-10 text-terminal-dim">
          index unreachable — the node may be restarting; try again shortly.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-terminal-border text-left text-xs">
                <th className="py-2 pr-4 uppercase tracking-wide text-terminal-dim">service</th>
                <th className="py-2 pr-4 uppercase tracking-wide text-terminal-dim">category</th>
                <th className="py-2 pr-4">{headerButton("uptime", "uptime 24h / 7d")}</th>
                <th className="py-2 pr-4">{headerButton("latency", "p50 latency")}</th>
                <th className="py-2 pr-4">{headerButton("price", "price")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((service) => (
                <tr
                  key={service.slug}
                  className="border-b border-terminal-border/50 hover:bg-terminal-panel"
                >
                  <td className="py-3 pr-4">
                    <Link
                      href={`/services/${service.slug}`}
                      className="flex items-center gap-2 font-semibold text-terminal-text hover:text-terminal-green"
                    >
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${statusColor(service.uptime_24h_pct)}`}
                        aria-hidden
                      />
                      {service.title ?? service.slug}
                    </Link>
                    <span className="block truncate pl-4 text-xs text-terminal-dim">
                      {service.claim ?? service.url}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-terminal-dim">{service.category}</td>
                  <td className="py-3 pr-4">
                    {fmtUptime(service.uptime_24h_pct)}
                    <span className="text-terminal-dim"> / {fmtUptime(service.uptime_7d_pct)}</span>
                  </td>
                  <td className="py-3 pr-4">{fmtLatency(service.latency_ms_p50_24h)}</td>
                  <td className="py-3 pr-4">{fmtPrice(service.price_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-terminal-dim">
            {sorted.length} services · probed every 10 minutes · agents: GET{" "}
            <code className="text-terminal-text">{ENDPOINTS.index}/v1/services</code> for this data
            with signed attestations.
          </p>
        </div>
      )}
    </main>
  );
}
