import { createServer } from "node:net";
import type { FastifyInstance } from "fastify";
import {
  buildServer as buildRegistryServer,
  createDb as createRegistryDb,
  MockDnsVerifier,
  MockGithubVerifier,
  RegistryService,
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

export interface ReferenceNodeOptions {
  nodeId?: string;
  host?: string;
  /** Fixed ports; omit (or 0) for ephemeral. Order: registry, exchange, attribution, reputation. */
  ports?: [number, number, number, number];
  /** Persist databases at these paths; default in-memory. */
  dataDir?: string;
  /** Override holdback windows (demo/e2e use { default: 0 }). */
  holdbackHours?: Record<string, number>;
}

export interface ReferenceNode {
  nodeId: string;
  urls: { registry: string; exchange: string; attribution: string; reputation: string };
  registry: RegistryService;
  exchange: ExchangeService;
  attribution: AttributionService;
  reputation: ReputationService;
  bus: EventBus;
  dns: MockDnsVerifier;
  github: MockGithubVerifier;
  mockRail: MockRail;
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
    registry: `http://${host}:${registryPort}`,
    exchange: `http://${host}:${exchangePort}`,
    attribution: `http://${host}:${attributionPort}`,
    reputation: `http://${host}:${reputationPort}`,
  };

  const db = (name: string) => (options.dataDir ? `${options.dataDir}/${name}.sqlite` : ":memory:");

  const dns = new MockDnsVerifier();
  const github = new MockGithubVerifier();
  const bus = new EventBus();

  const registry = new RegistryService({
    db: createRegistryDb(db("registry")),
    verifiers: new Map<string, MockDnsVerifier | MockGithubVerifier>([
      ["dns", dns],
      ["github", github],
    ]),
    nodeId,
    baseUrl: urls.registry,
  });
  const directory = registryDirectory(registry);

  const exchange = new ExchangeService({
    db: createExchangeDb(db("exchange")),
    directory,
    nodeId,
    baseUrl: urls.exchange,
    registryBaseUrl: urls.registry,
    bus,
  });

  const mockRail = new MockRail();
  const attribution = new AttributionService({
    db: createAttributionDb(db("attribution")),
    directory,
    auctions: exchange,
    tupleSink: exchange,
    bus,
    rails: [mockRail, new X402Rail("http://x402-facilitator.invalid")],
    holdbackHours: options.holdbackHours,
  });

  const reputation = new ReputationService({
    ledger: attribution,
    directory,
    sink: registry,
  });

  const apps = [
    buildRegistryServer(registry),
    buildExchangeServer(exchange),
    buildAttributionServer(attribution),
    buildReputationServer(reputation),
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
    apps,
    async stop() {
      await Promise.all(apps.map((app) => app.close()));
    },
  };
}
