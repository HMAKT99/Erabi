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
import type { AgentManifest, Bid, Intent } from "@erabi/schemas";
import { createDb as createRegistryDb, RegistryService } from "@erabi/registry";
import { createDb } from "../src/db/client.js";
import { registryDirectory } from "../src/directory.js";
import { ExchangeService, type ExchangeServiceOptions } from "../src/service.js";

export const REGISTRY_URL = "http://registry.test";
export const EXCHANGE_URL = "http://exchange.test";

export interface TestAgent {
  keys: KeyPair;
  id: string;
  manifest: AgentManifest;
}

export function makeAgent(
  name: string,
  capabilities: string[],
  options: { acceptsSponsored?: boolean; maxSponsoredRatio?: number } = {},
): TestAgent {
  const keys = generateKeyPair();
  const id = agentIdFromPublicKey(keys.publicKey);
  const manifest = {
    spec_version: "0.1",
    id,
    name,
    public_key: publicKeyToString(keys.publicKey),
    owner: { type: "individual", verification: [], payout_binding: null },
    capabilities,
    endpoint: "https://agents.example.com/endpoint",
    roles: ["consumer", "provider"],
    policy: {
      accepts_sponsored: options.acceptsSponsored ?? false,
      max_sponsored_ratio: options.maxSponsoredRatio ?? 0.3,
      human_in_loop: true,
    },
    referrer: null,
    created_at: new Date().toISOString(),
  } as AgentManifest;
  return { keys, id, manifest };
}

export function signedRequest(agent: { keys: KeyPair; id: string }, payload: unknown): Envelope {
  return createEnvelope({
    payload,
    secretKey: agent.keys.secretKey,
    keyId: agent.id,
    nodeId: "test-client",
  });
}

export function makeIntent(consumer: TestAgent, overrides: Partial<Intent> = {}): Intent {
  return {
    intent_id: randomUUID(),
    agent_id: consumer.id,
    category: "agent.research",
    query: "financial data analysis for listed companies",
    constraints: { max_price_usd: 5, max_latency_ms: 30000 },
    context_hash: sha256Hex("test-context"),
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

export interface Fixture {
  registry: RegistryService;
  exchange: ExchangeService;
}

export function setupFixture(
  exchangeOverrides: Partial<ExchangeServiceOptions> = {},
  ExchangeClass: typeof ExchangeService = ExchangeService,
): Fixture {
  const registry = new RegistryService({
    db: createRegistryDb(),
    verifiers: new Map(),
    nodeId: "erabi-node-test",
    baseUrl: REGISTRY_URL,
  });
  const exchange = new ExchangeClass({
    db: createDb(),
    directory: registryDirectory(registry),
    nodeId: "erabi-node-test",
    baseUrl: EXCHANGE_URL,
    registryBaseUrl: REGISTRY_URL,
    ...exchangeOverrides,
  });
  return { registry, exchange };
}

export async function registerAgents(
  registry: RegistryService,
  agents: TestAgent[],
): Promise<void> {
  for (const agent of agents) {
    await registry.registerAgent(signedRequest(agent, agent.manifest));
  }
}

/** Standard scene: opted-in consumer, 3 organic providers, ready to bid. */
export async function standardScene(fixture: Fixture) {
  const consumer = makeAgent("Coordinator", ["agent.analysis"], { acceptsSponsored: true });
  const providers = [
    makeAgent("ProviderA", ["agent.research"]),
    makeAgent("ProviderB", ["agent.research"]),
    makeAgent("ProviderC", ["agent.research"]),
  ];
  await registerAgents(fixture.registry, [consumer, ...providers]);
  return { consumer, providers };
}
