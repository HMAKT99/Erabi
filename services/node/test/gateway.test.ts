import http, { type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** fetch() forbids overriding Host, so host-routing tests go raw. */
function getWithHost(url: string, host: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const { hostname, port, pathname } = new URL(url);
    const request = http.request(
      { hostname, port, path: pathname, method: "GET", headers: { host }, setHost: false },
      (response) => {
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => resolve({ status: response.statusCode ?? 0, body }));
      },
    );
    request.on("error", reject);
    request.end();
  });
}
import { startGateway } from "../src/gateway.js";
import { startReferenceNode, type ReferenceNode } from "../src/index.js";

let node: ReferenceNode;
let gateway: Server;
let gatewayUrl: string;

beforeAll(async () => {
  node = await startReferenceNode();
  const ports = node.apps.map((app) => (app.server.address() as { port: number }).port);
  gateway = await startGateway({
    port: 0,
    host: "127.0.0.1",
    targets: {
      registry: ports[0]!,
      exchange: ports[1]!,
      attribution: ports[2]!,
      reputation: ports[3]!,
    },
  });
  gatewayUrl = `http://127.0.0.1:${(gateway.address() as { port: number }).port}`;
});

afterAll(async () => {
  gateway.close();
  await node.stop();
});

describe("single-port gateway (Railway/Render mode)", () => {
  it("defaults to the registry so platform healthchecks pass", async () => {
    const health = await fetch(`${gatewayUrl}/healthz`).then((r) => r.json());
    expect(health).toEqual({ ok: true });
    const stats = await fetch(`${gatewayUrl}/v1/stats`).then((r) => r.json());
    expect(stats).toEqual({ agents: 0, by_tier: {} }); // registry stats shape
  });

  it("routes by /service path prefix, stripping it", async () => {
    const registry = await fetch(`${gatewayUrl}/registry/v1/stats`).then((r) => r.json());
    expect(registry).toHaveProperty("agents");

    const exchange = await fetch(`${gatewayUrl}/exchange/v1/stats`).then((r) => r.json());
    expect(exchange).toHaveProperty("intents");

    const beacon = await fetch(`${gatewayUrl}/attribution/v1/stats/earnings`).then((r) => r.json());
    expect(beacon).toHaveProperty("confirmed_events");

    const wellKnown = (await fetch(`${gatewayUrl}/registry/.well-known/erabi.json`).then((r) =>
      r.json(),
    )) as { spec: string };
    expect(wellKnown.spec).toBe("erabi/0.1");
  });

  it("routes by host subdomain", async () => {
    const exchange = await getWithHost(`${gatewayUrl}/v1/stats`, "exchange.erabi.example");
    expect(JSON.parse(exchange.body)).toHaveProperty("intents");

    const reputation = await getWithHost(`${gatewayUrl}/healthz`, "reputation.erabi.example");
    expect(reputation.status).toBe(200);
  });

  it("answers 502 with a JSON error when an upstream is down", async () => {
    const broken = await startGateway({
      port: 0,
      host: "127.0.0.1",
      targets: { registry: 1, exchange: 1, attribution: 1, reputation: 1 },
    });
    try {
      const url = `http://127.0.0.1:${(broken.address() as { port: number }).port}`;
      const response = await fetch(`${url}/healthz`);
      expect(response.status).toBe(502);
      expect((await response.json()).error.code).toBe("bad_gateway");
    } finally {
      broken.close();
    }
  });
});
