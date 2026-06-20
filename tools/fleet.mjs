/**
 * Reference fleet: founder-operated agents that keep the public network's
 * demo liquidity alive — real registrations, real signed bids, real intents,
 * real dual-signed outcomes, on the ledger-only economy (see ADR 0022).
 *
 *   ERABI_FLEET_SEED=<hex secret> node tools/fleet.mjs
 *
 * Identities are derived deterministically from the secret, so every run
 * resumes the same agents (SDK registration is idempotent re-join).
 */
import { createHmac, randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Erabi } from "@erabi/sdk";

const FLEET_SEED = process.env.ERABI_FLEET_SEED;
if (!FLEET_SEED) {
  console.error("ERABI_FLEET_SEED is required (hex secret; identities derive from it)");
  process.exit(1);
}
const BASE = process.env.ERABI_BASE_URL ?? "https://erabi-production.up.railway.app";
const endpoints = {
  registry: `${BASE}/registry`,
  exchange: `${BASE}/exchange`,
  attribution: `${BASE}/attribution`,
  reputation: `${BASE}/reputation`,
};

/** name → [capabilities], role hints. Providers also bid; consumers fire intents. */
const PROVIDERS = [
  { name: "Atlas-Research", capabilities: ["agent.research", "agent.analysis"] },
  { name: "Cipher-Markets", capabilities: ["data.financial", "data.market"] },
  { name: "Lumen-Newswire", capabilities: ["data.news"] },
  { name: "Forge-Coder", capabilities: ["agent.coding"] },
  { name: "Quill-Content", capabilities: ["agent.content"] },
  { name: "Vector-Search", capabilities: ["api.search"] },
];
const CONSUMERS = [
  { name: "Compass-Planner", capabilities: ["agent.analysis"] },
  { name: "Beacon-Scout", capabilities: ["agent.research"] },
  { name: "Relay-Composer", capabilities: ["agent.content"] },
];
const INTENT_POOL = [
  { category: "agent.research", query: "synthesize recent sources with citations" },
  { category: "data.financial", query: "intraday equity snapshots, low latency" },
  { category: "data.news", query: "tech headlines, last 6 hours" },
  { category: "agent.coding", query: "review a typescript diff for correctness" },
  { category: "agent.content", query: "draft a product changelog entry" },
  { category: "api.search", query: "web search with source URLs" },
];

const seedFor = (name) => createHmac("sha256", FLEET_SEED).update(`agent:${name}`).digest();
/** Deterministic UUID (v4-shaped) so re-runs update the same standing bid. */
function stableUuid(label) {
  const h = createHmac("sha256", FLEET_SEED).update(`bid:${label}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dollars = (lo, hi) => Number((lo + Math.random() * (hi - lo)).toFixed(2));

// Pre-write deterministic keystores so register() resumes identities.
const keyDir = mkdtempSync(path.join(tmpdir(), "erabi-fleet-"));
function keystoreFor(name) {
  // agent_id is recomputed by the SDK from the seed-derived key on load.
  const seed = seedFor(name);
  writeFileSync(
    path.join(keyDir, `${name}.json`),
    JSON.stringify({ seed_hex: seed.toString("hex"), agent_id: "" }),
  );
}

async function join({ name, capabilities }, acceptsSponsored) {
  keystoreFor(name);
  const agent = await Erabi.register({
    name,
    capabilities,
    endpoints,
    keyDir,
    acceptsSponsored,
    endpoint: "https://github.com/HMAKT99/Erabi",
    nodeId: "erabi-fleet",
  });
  return agent;
}

const summary = { joined: 0, bids: 0, intents: 0, outcomes: 0, errors: [] };

const providers = [];
for (const spec of PROVIDERS) {
  try {
    providers.push(await join(spec, false));
    summary.joined++;
  } catch (e) {
    summary.errors.push(`join ${spec.name}: ${e.message}`);
  }
}
const consumers = [];
for (const spec of CONSUMERS) {
  try {
    consumers.push(await join(spec, true));
    summary.joined++;
  } catch (e) {
    summary.errors.push(`join ${spec.name}: ${e.message}`);
  }
}

// Providers refresh standing bids (signed envelopes; ledger_only rail).
for (const provider of providers) {
  for (const category of provider.manifest.capabilities) {
    try {
      const bid = {
        bid_id: stableUuid(`${provider.manifest.name}:${category}`),
        provider_id: provider.id,
        targeting: { categories: [category] },
        offer: { type: "cpa", amount_usd: dollars(0.05, 0.45) },
        creative: {
          title: `${provider.manifest.name} · ${category}`,
          claim: "Reference fleet provider — every outcome dual-signed on the public ledger.",
          endpoint: "https://github.com/HMAKT99/Erabi",
        },
        budget: { daily_usd: 5 },
        settlement_rail: "ledger_only",
        stake_tier: "unverified",
      };
      const res = await fetch(`${endpoints.exchange}/v1/bids`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(provider.signed(bid)),
      });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
      summary.bids++;
    } catch (e) {
      summary.errors.push(`bid ${provider.manifest.name}/${category}: ${e.message}`);
    }
  }
}

// Consumers fire a few intents and dual-sign outcomes. Welcome wagon: when a
// provider OUTSIDE the fleet appears in the consideration set (a newcomer to
// the network), prefer it — its selection lands on its ledger immediately,
// and it counter-signs via the confirm_outcome tool to settle and earn its
// first reputation. The network embraces new agents within one tick.
const byId = new Map(providers.map((p) => [p.id, p]));
const fleetIds = new Set([...providers, ...consumers].map((a) => a.id));

// Bridge-tier providers (real x402 services) are registered identities the
// fleet does NOT hold keys for, so it can never counter-sign an outcome with
// them — selecting one yields a one-sided event that never settles. They bid
// across every category, so without this they'd always crowd out the fleet's
// own confirmable providers and settlement stalls. Exclude them from the
// "newcomer" set: the fleet then picks its own providers (outcomes settle) and
// still welcomes any GENUINE external agent that joins.
const bridgeIds = new Set();
try {
  const res = await fetch(`${endpoints.registry}/v1/agents`);
  if (res.ok) {
    const body = await res.json();
    for (const a of body.agents ?? []) {
      if (a.tier === "bridge" && a.manifest?.id) bridgeIds.add(a.manifest.id);
    }
  }
} catch (e) {
  summary.errors.push(`bridge lookup: ${e.message}`);
}

const intentsThisTick = 2 + Math.floor(Math.random() * 3);
for (let i = 0; i < intentsThisTick; i++) {
  const consumer = pick(consumers);
  const intent = pick(INTENT_POOL);
  if (!consumer) break;
  try {
    const choices = await consumer.intent({
      category: intent.category,
      query: intent.query,
      constraints: { max_price_usd: dollars(0.5, 3) },
    });
    summary.intents++;
    const all = [
      ...choices.organic.map((o) => o.provider_id),
      ...choices.sponsored.map((s) => s.provider_id),
    ];
    const newcomers = [...new Set(all.filter((id) => !fleetIds.has(id) && !bridgeIds.has(id)))];
    const fleetCandidates = all.filter((id) => byId.has(id));
    // Only the fleet's own providers can be counter-signed, so they must be the
    // DEFAULT selection or nothing settles. Most "newcomers" on the network are
    // dormant test registrations that never counter-sign, so we welcome a real
    // one only occasionally (~20%) — enough to embrace a genuinely live joiner
    // without letting dead agents starve settlement.
    let providerId;
    if (fleetCandidates.length > 0 && (newcomers.length === 0 || Math.random() < 0.8)) {
      providerId = pick(fleetCandidates);
    } else if (newcomers.length > 0) {
      providerId = pick(newcomers);
    } else {
      providerId = pick(fleetCandidates);
    }
    if (!providerId) continue;
    const isNewcomer = !fleetIds.has(providerId);
    const provider = byId.get(providerId);
    const selection = await choices.report(providerId, "selection");
    summary.outcomes++;
    if (isNewcomer) summary.welcomed = (summary.welcomed ?? 0) + 1;
    // Fleet providers counter-sign themselves; newcomers counter-sign via
    // their own confirm_outcome tool (we never hold their keys).
    if (provider) await provider.confirmOutcome(selection.event_id, selection.hash);
    if (Math.random() < 0.8) {
      const success = await choices.report(providerId, "task_success", {
        valueUsd: dollars(0.1, 1.8),
      });
      summary.outcomes++;
      if (provider) await provider.confirmOutcome(success.event_id, success.hash);
    }
  } catch (e) {
    summary.errors.push(`intent ${intent.category}: ${e.message}`);
  }
}

console.log(JSON.stringify(summary, null, 2));
if (summary.joined === 0) process.exit(1);
