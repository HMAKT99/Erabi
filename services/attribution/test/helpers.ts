import { randomUUID } from "node:crypto";
import {
  agentIdFromPublicKey,
  createEnvelope,
  generateKeyPair,
  publicKeyToString,
  sha256Hex,
  type Envelope,
  type KeyPair,
} from "@erabi/crypto";
import type { AgentManifest, Bid, ConsiderationSet, Intent } from "@erabi/schemas";
import {
  createDb as createRegistryDb,
  MockDnsVerifier,
  RegistryService,
  verificationToken,
} from "@erabi/registry";
import {
  createDb as createExchangeDb,
  EventBus,
  ExchangeService,
  registryDirectory,
} from "@erabi/exchange";
import { createDb } from "../src/db/client.js";
import { MockRail } from "../src/rails.js";
import { AttributionService } from "../src/service.js";

export interface Clock {
  nowMs: number;
  advance(ms: number): void;
}

export function makeClock(startIso = "2026-06-10T00:00:00.000Z"): Clock {
  return {
    nowMs: Date.parse(startIso),
    advance(ms: number) {
      this.nowMs += ms;
    },
  };
}

export interface TestAgent {
  keys: KeyPair;
  id: string;
  manifest: AgentManifest;
}

export function makeAgent(
  name: string,
  capabilities: string[],
  options: {
    acceptsSponsored?: boolean;
    payoutBinding?: string | null;
    verification?: string[];
  } = {},
  clock?: Clock,
): TestAgent {
  const keys = generateKeyPair();
  const id = agentIdFromPublicKey(keys.publicKey);
  const manifest = {
    spec_version: "0.1",
    id,
    name,
    public_key: publicKeyToString(keys.publicKey),
    owner: {
      type: "individual",
      verification: options.verification ?? [],
      payout_binding: options.payoutBinding ?? null,
    },
    capabilities,
    endpoint: "https://agents.example.com/endpoint",
    roles: ["consumer", "provider"],
    policy: {
      accepts_sponsored: options.acceptsSponsored ?? false,
      max_sponsored_ratio: 0.3,
      human_in_loop: true,
    },
    referrer: null,
    created_at: new Date(clock?.nowMs ?? Date.now()).toISOString(),
  } as AgentManifest;
  return { keys, id, manifest };
}

export function signedRequest(
  agent: { keys: KeyPair; id: string },
  payload: unknown,
  clock?: Clock,
): Envelope {
  return createEnvelope({
    payload,
    secretKey: agent.keys.secretKey,
    keyId: agent.id,
    nodeId: "test-client",
    ts: clock ? new Date(clock.nowMs).toISOString() : undefined,
  });
}

export interface Pipeline {
  clock: Clock;
  registry: RegistryService;
  exchange: ExchangeService;
  attribution: AttributionService;
  bus: EventBus;
  rail: MockRail;
  dns: MockDnsVerifier;
}

export function setupPipeline(): Pipeline {
  const clock = makeClock();
  const now = () => clock.nowMs;
  const dns = new MockDnsVerifier();
  const bus = new EventBus();
  const registry = new RegistryService({
    db: createRegistryDb(),
    verifiers: new Map([["dns", dns]]),
    nodeId: "erabi-node-test",
    baseUrl: "http://registry.test",
    now,
  });
  const directory = registryDirectory(registry);
  const exchange = new ExchangeService({
    db: createExchangeDb(),
    directory,
    nodeId: "erabi-node-test",
    baseUrl: "http://exchange.test",
    registryBaseUrl: "http://registry.test",
    bus,
    now,
  });
  const rail = new MockRail();
  const attribution = new AttributionService({
    db: createDb(),
    directory,
    auctions: exchange,
    tupleSink: exchange,
    bus,
    rails: [rail],
    now,
  });
  return { clock, registry, exchange, attribution, bus, rail, dns };
}

export async function register(pipeline: Pipeline, ...agents: TestAgent[]): Promise<void> {
  for (const agent of agents) {
    await pipeline.registry.registerAgent(signedRequest(agent, agent.manifest, pipeline.clock));
  }
}

export async function verifyViaDns(pipeline: Pipeline, agent: TestAgent, domain: string) {
  pipeline.dns.setTxtRecords(domain, [verificationToken(agent.id)]);
  await pipeline.registry.verifyAgent(
    agent.id,
    signedRequest(agent, { method: `dns:${domain}` }, pipeline.clock),
  );
}

export function makeIntent(
  consumer: TestAgent,
  clock: Clock,
  overrides: Partial<Intent> = {},
): Intent {
  return {
    intent_id: randomUUID(),
    agent_id: consumer.id,
    category: "agent.research",
    query: "research synthesis with cited sources",
    constraints: { max_price_usd: 5 },
    context_hash: sha256Hex(`ctx-${clock.nowMs}`),
    human_in_loop: true,
    ttl_ms: 3000,
    ...overrides,
  } as Intent;
}

export function makeBid(provider: TestAgent, overrides: Partial<Bid> = {}): Bid {
  return {
    bid_id: randomUUID(),
    provider_id: provider.id,
    targeting: { categories: ["agent.research"] },
    offer: { type: "cpa", amount_usd: 2 },
    creative: {
      title: `${provider.manifest.name} — sponsored`,
      claim: "Audited research with cited primary sources.",
      endpoint: "https://provider.example.com/agent",
    },
    budget: { daily_usd: 100 },
    settlement_rail: "x402",
    stake_tier: "unverified",
    ...overrides,
  } as Bid;
}

export async function fireIntent(
  pipeline: Pipeline,
  consumer: TestAgent,
  overrides: Partial<Intent> = {},
): Promise<ConsiderationSet> {
  return pipeline.exchange.submitIntent(
    signedRequest(consumer, makeIntent(consumer, pipeline.clock, overrides), pipeline.clock),
  );
}

/** Report an event and have the counterparty dual-sign it. */
export async function reportAndConfirm(
  pipeline: Pipeline,
  options: {
    reporter: TestAgent;
    counterparty: TestAgent;
    auctionId: string;
    providerId: string;
    kind: "selection" | "click" | "conversion" | "task_success" | "assisted";
    valueUsd?: number;
    railRef?: string;
    confirm?: boolean;
  },
) {
  const submission = {
    event_id: randomUUID(),
    auction_id: options.auctionId,
    kind: options.kind,
    provider_id: options.providerId,
    value_usd: options.valueUsd ?? 0,
    rail_receipt: options.railRef ? { rail: "x402" as const, ref: options.railRef } : null,
  };
  const entry = await pipeline.attribution.submitEvent(
    signedRequest(options.reporter, submission, pipeline.clock),
  );
  if ((options.confirm ?? true) && entry.status === "pending") {
    return pipeline.attribution.confirmEvent(
      entry.event_id,
      signedRequest(
        options.counterparty,
        { event_id: entry.event_id, hash: entry.hash },
        pipeline.clock,
      ),
    );
  }
  return entry;
}

export const HOUR = 3_600_000;
export const MINUTE = 60_000;
