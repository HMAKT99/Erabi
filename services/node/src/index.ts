import { createServer } from "node:net";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { InMemoryNonceStore, publicKeyToString, type NonceStore } from "@erabi/crypto";
import {
  buildServer as buildRegistryServer,
  createDb as createRegistryDb,
  MockDnsVerifier,
  MockGithubVerifier,
  RegistryService,
  type VerifierSet,
} from "@erabi/registry";
import {
  buildServer as buildExchangeServer,
  createDb as createExchangeDb,
  EventBus,
  ExchangeService,
  registryDirectory,
} from "@erabi/exchange";
import {
  AttributionService,
  buildServer as buildAttributionServer,
  createDb as createAttributionDb,
  MockRail,
  X402Rail,
} from "@erabi/attribution";
import { buildServer as buildReputationServer, ReputationService } from "@erabi/reputation";
import { loadOrCreateNodeKeys, SqliteNonceStore } from "./durability.js";

export * from "./durability.js";

export interface ReferenceNodeOptions {
  nodeId?: string;
  host?: string;
  /** Fixed ports; omit (or 0) for ephemeral. Order: registry, exchange, attribution, reputation. */
  ports?: [number, number, number, number];
  /** Persist databases, the node key, and nonces here; default in-memory/ephemeral. */
  dataDir?: string;
  /** Override holdback windows (demo/e2e use { default: 0 }). */
  holdbackHours?: Record<string, number>;
  /** Node signing seed (hex, 32 bytes); takes precedence over the dataDir key file. */
  nodeSeedHex?: string;
  /** Owner verifiers; defaults to mocks (dev/test). Production passes realVerifiers(). */
  verifiers?: VerifierSet;
  /** Shared replay protection; defaults to SQLite under dataDir, else in-memory. */
  nonceStore?: NonceStore;
  /** Enable fastify logging (production). */
  logger?: boolean;
  /**
   * Public base URLs advertised in well-known documents, join blocks, and
   * evidence links (e.g. behind a reverse proxy). Listening still happens
   * on host:port; defaults to the listen URLs.
   */
  publicUrls?: Partial<{
    registry: string;
    exchange: string;
    attribution: string;
    reputation: string;
  }>;
}

export interface ReferenceNode {
  nodeId: string;
  urls: { registry: string; exchange: string; attribution: string; reputation: string };
  registry: RegistryService;
  exchange: ExchangeService;
  attribution: AttributionService;
  reputation: ReputationService;
  bus: EventBus;
  /** Present when the default mock verifiers are in use (dev/test). */
  dns: MockDnsVerifier;
  github: MockGithubVerifier;
  mockRail: MockRail;
  /** Where the node signing key came from: env seed, key file, or ephemeral. */
  keySource: "env" | "file" | "ephemeral";
  publicKey: string;
  apps: FastifyInstance[];
  stop(): Promise<void>;
}

async function freePort(host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const port = (server.address() as { port: number }).port;
      server.close(() => resolve(port));
    });
  });
}

export async function startReferenceNode(
  options: ReferenceNodeOptions = {},
): Promise<ReferenceNode> {
  const host = options.host ?? "127.0.0.1";
  const nodeId = options.nodeId ?? "erabi-node-dev-1";
  const ports: number[] = [];
  for (let i = 0; i < 4; i++) {
    ports.push(options.ports?.[i] || (await freePort(host)));
  }
  const [registryPort, exchangePort, attributionPort, reputationPort] = ports as [
    number,
    number,
    number,
    number,
  ];
  const urls = {
    registry: options.publicUrls?.registry ?? `http://${host}:${registryPort}`,
    exchange: options.publicUrls?.exchange ?? `http://${host}:${exchangePort}`,
    attribution: options.publicUrls?.attribution ?? `http://${host}:${attributionPort}`,
    reputation: options.publicUrls?.reputation ?? `http://${host}:${reputationPort}`,
  };

  const db = (name: string) => (options.dataDir ? `${options.dataDir}/${name}.sqlite` : ":memory:");

  const dns = new MockDnsVerifier();
  const github = new MockGithubVerifier();
  const bus = new EventBus();

  // Identity and replay protection survive restarts when dataDir is set.
  const { keys, source: keySource } = loadOrCreateNodeKeys({
    seedHex: options.nodeSeedHex,
    dataDir: options.dataDir,
  });
  const nonceStore: NonceStore =
    options.nonceStore ??
    (options.dataDir
      ? new SqliteNonceStore(path.join(options.dataDir, "nonces.sqlite"))
      : new InMemoryNonceStore());

  // Registry → attribution stake lookups are wired lazily (attribution is
  // constructed after the registry it depends on through the directory).
  let attributionRef: AttributionService | undefined;
  const registry = new RegistryService({
    db: createRegistryDb(db("registry")),
    verifiers:
      options.verifiers ??
      new Map<string, MockDnsVerifier | MockGithubVerifier>([
        ["dns", dns],
        ["github", github],
      ]),
    nodeId,
    baseUrl: urls.registry,
    nonceStore,
    bus,
    stakeSource: { stakeOf: (id) => attributionRef?.stakeOf(id) ?? 0 },
  });
  const directory = registryDirectory(registry);

  const exchange = new ExchangeService({
    db: createExchangeDb(db("exchange")),
    directory,
    nodeId,
    baseUrl: urls.exchange,
    registryBaseUrl: urls.registry,
    bus,
    keys,
    nonceStore,
  });

  const mockRail = new MockRail();
  const attribution = new AttributionService({
    db: createAttributionDb(db("attribution")),
    directory,
    auctions: exchange,
    tupleSink: exchange,
    spendSink: exchange,
    bus,
    rails: [mockRail, new X402Rail("http://x402-facilitator.invalid")],
    holdbackHours: options.holdbackHours,
    nonceStore,
  });
  attributionRef = attribution;

  const reputation = new ReputationService({
    ledger: attribution,
    directory,
    sink: registry,
  });

  const serverOptions = { logger: options.logger ?? false };
  const apps = [
    buildRegistryServer(registry, serverOptions),
    buildExchangeServer(exchange, serverOptions),
    buildAttributionServer(attribution, serverOptions),
    buildReputationServer(reputation, serverOptions),
  ];
  await Promise.all(apps.map((app, i) => app.listen({ port: ports[i]!, host })));

  return {
    nodeId,
    urls,
    registry,
    exchange,
    attribution,
    reputation,
    bus,
    dns,
    github,
    mockRail,
    keySource,
    publicKey: publicKeyToString(keys.publicKey),
    apps,
    async stop() {
      await Promise.all(apps.map((app) => app.close()));
    },
  };
}
