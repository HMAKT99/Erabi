import http, { type Server } from "node:http";
import { createMcpHttpHandler } from "@erabi/mcp-core";
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
    mcpHandler: createMcpHttpHandler({ endpoints: node.urls }),
    agentCard: { name: "Erabi Intent Exchange", url: "https://example.com" },
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

describe("remote MCP at /mcp", () => {
  it("initializes a session, lists the six tools, and registers a live agent", async () => {
    const post = (body: unknown, sessionId?: string) =>
      fetch(`${gatewayUrl}/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          ...(sessionId ? { "mcp-session-id": sessionId } : {}),
        },
        body: JSON.stringify(body),
      });

    const parse = async (response: Response) => {
      const text = await response.text();
      const data = text
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => JSON.parse(line.slice(5)));
      return data[0] ?? JSON.parse(text);
    };

    const init = await post({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      },
    });
    expect(init.status).toBe(200);
    const session = init.headers.get("mcp-session-id");
    expect(session).toBeTruthy();
    const initBody = await parse(init);
    expect(initBody.result.serverInfo.name).toBe("erabi");

    await post({ jsonrpc: "2.0", method: "notifications/initialized" }, session!);

    const list = await post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, session!);
    const tools = (await parse(list)).result.tools.map((tool: { name: string }) => tool.name);
    expect(tools.sort()).toEqual([
      "discover",
      "intent",
      "my_earnings",
      "my_reputation",
      "register",
      "report_outcome",
    ]);

    const register = await post(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "register",
          arguments: { name: "RemoteJoiner", capabilities: ["agent.research"] },
        },
      },
      session!,
    );
    const result = JSON.parse((await parse(register)).result.content[0].text);
    expect(result.agent_id).toMatch(/^erabi:agent:/);
    expect(result.live_page).toContain("/agents/");

    // session-scoped: a second initialize gets its own session id
    const second = await post({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test2", version: "0" },
      },
    });
    expect(second.headers.get("mcp-session-id")).not.toBe(session);
  });

  it("rejects sessionless non-POST requests", async () => {
    const response = await fetch(`${gatewayUrl}/mcp`, { method: "GET" });
    expect(response.status).toBe(400);
  });
});

describe("A2A agent card", () => {
  it("serves the card at /.well-known/agent.json", async () => {
    const response = await fetch(`${gatewayUrl}/.well-known/agent.json`);
    expect(response.status).toBe(200);
    const card = (await response.json()) as { name: string };
    expect(card.name).toBe("Erabi Intent Exchange");
  });
});
