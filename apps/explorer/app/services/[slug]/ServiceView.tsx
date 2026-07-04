"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CopyButton } from "../../../components/CopyButton";
import { ENDPOINTS, EXPLORER_URL, getJson } from "../../../lib/api";
import { fmtLatency, fmtPrice, fmtUptime, statusColor, type ServiceSummary } from "../ServicesView";

interface ServiceDetail extends ServiceSummary {
  claim_block?: {
    method: string;
    txt_record: string;
    verify_endpoint: string;
    details: string;
  } | null;
}

interface HourlyRollup {
  hour: string;
  probes: number;
  ok: number;
  latency_ms_sum: number;
}

interface Attestation {
  payload: Record<string, unknown>;
  sig: string;
  key: string;
  verify: string;
}

export default function ServiceView() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const [service, setService] = useState<ServiceDetail | null | undefined>(undefined);
  const [hourly, setHourly] = useState<HourlyRollup[]>([]);
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [showAttestation, setShowAttestation] = useState(false);

  useEffect(() => {
    const base = `${ENDPOINTS.index}/v1/services/${encodeURIComponent(slug)}`;
    void getJson<ServiceDetail & { claim: ServiceDetail["claim_block"] }>(base).then((body) =>
      setService(body ? { ...body, claim_block: body.claim } : null),
    );
    void getJson<{ hourly: HourlyRollup[] }>(`${base}/history?window=7d`).then((body) =>
      setHourly(body?.hourly ?? []),
    );
    void getJson<Attestation>(`${base}/attestation`).then(setAttestation);
  }, [slug]);

  if (service === undefined) {
    return <main className="mx-auto max-w-4xl px-4 py-10 text-terminal-dim">loading…</main>;
  }
  if (service === null) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-terminal-red">service not found in the index.</p>
        <Link href="/services" className="text-terminal-green hover:underline">
          ← all services
        </Link>
      </main>
    );
  }

  const name = service.title ?? service.slug;
  const badgeUrl = service.badge_url;
  const pageUrl = `${EXPLORER_URL}/services/${service.slug}`;
  const badgeMarkdown = `[![Reliability, probed by ERABI](${badgeUrl})](${pageUrl})`;
  const iframeSnippet = `<iframe src="${EXPLORER_URL}/embed/services/${service.slug}" width="340" height="96" frameborder="0" title="${name} reliability, probed by ERABI"></iframe>`;
  const host = (() => {
    try {
      return new URL(service.url).host;
    } catch {
      return service.url;
    }
  })();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/services" className="text-xs text-terminal-dim hover:text-terminal-green">
        ← x402 reliability index
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span
          className={`h-3 w-3 rounded-full ${statusColor(service.uptime_24h_pct)}`}
          aria-hidden
        />
        <h1 className="text-2xl font-bold">{name}</h1>
        <span className="rounded border border-terminal-border px-2 py-0.5 text-xs uppercase text-terminal-dim">
          {service.category}
        </span>
      </div>
      <p className="mt-2 text-sm text-terminal-dim">{service.claim ?? service.url}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["uptime 24h", fmtUptime(service.uptime_24h_pct)],
          ["uptime 7d", fmtUptime(service.uptime_7d_pct)],
          ["p50 latency", fmtLatency(service.latency_ms_p50_24h)],
          ["price", fmtPrice(service.price_usd)],
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-terminal-border bg-terminal-panel p-3">
            <dt className="text-xs uppercase tracking-wide text-terminal-dim">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-terminal-text">{value}</dd>
          </div>
        ))}
      </dl>

      {hourly.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-terminal-dim">
            last 7 days, hourly
          </h2>
          <div className="mt-2 flex h-12 items-end gap-px" aria-label="hourly uptime bars">
            {hourly.map((bucket) => {
              const ratio = bucket.probes ? bucket.ok / bucket.probes : 0;
              return (
                <span
                  key={bucket.hour}
                  title={`${bucket.hour}: ${bucket.ok}/${bucket.probes} probes ok`}
                  className={`inline-block w-full max-w-[6px] rounded-sm ${
                    ratio >= 0.99
                      ? "bg-terminal-green"
                      : ratio >= 0.5
                        ? "bg-terminal-amber"
                        : "bg-terminal-red"
                  }`}
                  style={{ height: `${Math.max(12, ratio * 100)}%` }}
                />
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-8 rounded border border-terminal-border bg-terminal-panel p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-terminal-dim">
            signed attestation — fetch this instead of re-probing
          </h2>
          {attestation && (
            <button
              type="button"
              onClick={() => setShowAttestation((v) => !v)}
              className="text-xs text-terminal-green hover:underline"
            >
              {showAttestation ? "hide" : "show"} JSON
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-terminal-dim">
          Every probe is published as a detached ed25519 signature over the canonicalized payload,
          signed by the node key served at <code className="text-terminal-text">/index/v1/key</code>
          . Your agent can verify and reuse it — no need to burn a call re-checking the service.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <code className="truncate text-xs text-terminal-text">
            GET {ENDPOINTS.index}/v1/services/{service.slug}/attestation
          </code>
          <CopyButton
            text={`${ENDPOINTS.index}/v1/services/${service.slug}/attestation`}
            label="copy URL"
          />
        </div>
        {showAttestation && attestation && (
          <pre className="mt-3 max-h-80 overflow-auto rounded bg-terminal-bg p-3 text-xs text-terminal-text">
            {JSON.stringify(attestation, null, 2)}
          </pre>
        )}
      </section>

      <section className="mt-8 rounded border border-terminal-border bg-terminal-panel p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-terminal-dim">
          embed this service&apos;s live reliability
        </h2>
        <div className="mt-3 space-y-3 text-xs">
          <div>
            <p className="mb-1 text-terminal-dim">README badge (markdown)</p>
            <div className="flex items-center gap-2">
              <code className="block flex-1 truncate rounded bg-terminal-bg p-2">
                {badgeMarkdown}
              </code>
              <CopyButton text={badgeMarkdown} label="copy" />
            </div>
          </div>
          <div>
            <p className="mb-1 text-terminal-dim">iframe card</p>
            <div className="flex items-center gap-2">
              <code className="block flex-1 truncate rounded bg-terminal-bg p-2">
                {iframeSnippet}
              </code>
              <CopyButton text={iframeSnippet} label="copy" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded border border-terminal-border bg-terminal-panel p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-terminal-dim">
          operated by {host}? claim this page
        </h2>
        {service.claim_block ? (
          <div className="mt-2 space-y-2 text-xs text-terminal-dim">
            <p>
              Add one DNS TXT record on your domain, then call the verify endpoint — your listing is
              promoted from bridge to verified tier. Data wrong? Open an issue and we fix or delist.
            </p>
            <div className="flex items-center gap-2">
              <code className="block flex-1 truncate rounded bg-terminal-bg p-2 text-terminal-text">
                {service.claim_block.txt_record}
              </code>
              <CopyButton text={service.claim_block.txt_record} label="copy" />
            </div>
            <code className="block truncate rounded bg-terminal-bg p-2">
              POST {service.claim_block.verify_endpoint}
            </code>
          </div>
        ) : (
          <p className="mt-2 text-xs text-terminal-dim">
            This service has no bridged provider identity yet (it may have been unreachable at node
            boot). It is still probed — reliability data above is live.
          </p>
        )}
        {service.service_id && (
          <p className="mt-3 text-xs">
            <Link
              href={`/agents/${encodeURIComponent(service.service_id)}`}
              className="text-terminal-green hover:underline"
            >
              view its provider page on the exchange →
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
