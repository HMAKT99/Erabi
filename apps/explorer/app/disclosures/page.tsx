"use client";

import { useState } from "react";
import { canonicalize, publicKeyFromString, verifyBytes } from "@erabi/crypto";
import { ENDPOINTS, getJson } from "../../lib/api";

interface DisclosureRecord {
  disclosure_id: string;
  auction_id: string;
  intent_id: string;
  provider_id: string;
  payment_model: string;
  clearing_price_usd: number;
  label: string;
  issued_at: string;
  exchange_sig: string;
}

type VerifyState = "idle" | "valid" | "invalid" | "no-key";

export default function DisclosureInspector() {
  const [disclosureId, setDisclosureId] = useState("");
  const [record, setRecord] = useState<DisclosureRecord | null>(null);
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function inspect(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setRecord(null);
    setVerifyState("idle");

    const fetched = await getJson<DisclosureRecord>(
      `${ENDPOINTS.exchange}/v1/disclosures/${encodeURIComponent(disclosureId.trim())}`,
    );
    if (!fetched) {
      setError("no disclosure with that id on this node");
      return;
    }
    setRecord(fetched);

    // In-browser signature verification against the exchange's published key.
    const wellKnown = await getJson<{ exchange_public_key: string }>(
      `${ENDPOINTS.exchange}/.well-known/erabi.json`,
    );
    if (!wellKnown?.exchange_public_key) {
      setVerifyState("no-key");
      return;
    }
    const { exchange_sig, ...unsigned } = fetched;
    const valid = verifyBytes(
      new TextEncoder().encode(canonicalize(unsigned)),
      exchange_sig,
      publicKeyFromString(wellKnown.exchange_public_key),
    );
    setVerifyState(valid ? "valid" : "invalid");
  }

  return (
    <main className="space-y-6">
      <section className="panel">
        <h1 className="label mb-2">disclosure inspector</h1>
        <p className="mb-4 text-xs text-terminal-dim">
          paste any disclosure_id: the full signed who-paid-what record is fetched and its ed25519
          signature verified in your browser against the exchange&apos;s published key.
        </p>
        <form onSubmit={inspect} className="flex gap-2">
          <input
            value={disclosureId}
            onChange={(event) => setDisclosureId(event.target.value)}
            placeholder="disclosure_id (uuid)"
            className="flex-1 rounded border border-terminal-border bg-terminal-bg px-2 py-1 text-xs outline-none focus:border-terminal-green"
          />
          <button
            type="submit"
            className="rounded border border-terminal-green px-3 py-1 text-xs text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
          >
            inspect
          </button>
        </form>
        {error && <p className="mt-3 text-xs text-terminal-red">{error}</p>}
      </section>

      {record && (
        <section className="panel">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="label">record</h2>
            {verifyState === "valid" && (
              <span className="text-xs text-terminal-green">✓ signature verified in-browser</span>
            )}
            {verifyState === "invalid" && (
              <span className="text-xs text-terminal-red">✗ SIGNATURE INVALID</span>
            )}
            {verifyState === "no-key" && (
              <span className="text-xs text-terminal-amber">exchange key unavailable</span>
            )}
          </div>
          <dl className="space-y-1 text-xs">
            {Object.entries(record).map(([key, value]) => (
              <div key={key} className="flex gap-4">
                <dt className="w-40 shrink-0 text-terminal-dim">{key}</dt>
                <dd className="break-all">
                  {key === "provider_id" ? (
                    <a
                      href={`/agents/${encodeURIComponent(String(value))}`}
                      className="hover:text-terminal-green"
                    >
                      {String(value)}
                    </a>
                  ) : (
                    String(value)
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </main>
  );
}
