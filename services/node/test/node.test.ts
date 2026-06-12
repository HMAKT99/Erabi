import { describe, expect, it } from "vitest";
import { startReferenceNode } from "../src/index.js";

describe("reference node", () => {
  it("boots all four services and serves the machine-readable front doors", async () => {
    const node = await startReferenceNode();
    try {
      for (const url of Object.values(node.urls)) {
        const health = await fetch(`${url}/healthz`).then((r) => r.json());
        expect(health).toEqual({ ok: true });
      }
      const wellKnown = (await fetch(`${node.urls.registry}/.well-known/erabi.json`).then((r) =>
        r.json(),
      )) as { spec: string; join: { register: string } };
      expect(wellKnown.spec).toBe("erabi/0.1");
      expect(wellKnown.join.register).toBe(`${node.urls.registry}/v1/agents`);
    } finally {
      await node.stop();
    }
  });

  it("advertises public URLs in front doors when behind a reverse proxy", async () => {
    const node = await startReferenceNode({
      publicUrls: {
        registry: "https://registry.example.com",
        exchange: "https://exchange.example.com",
      },
    });
    try {
      // Listening stays on a local ephemeral port; advertised URLs are public.
      const listenPort = (node.apps[0]!.server.address() as { port: number }).port;
      const wellKnown = (await fetch(`http://127.0.0.1:${listenPort}/.well-known/erabi.json`).then(
        (r) => r.json(),
      )) as { join: { register: string } };
      expect(wellKnown.join.register).toBe("https://registry.example.com/v1/agents");
      expect(node.urls.exchange).toBe("https://exchange.example.com");
    } finally {
      await node.stop();
    }
  });

  it("serves the explorer's data endpoints with CORS", async () => {
    const node = await startReferenceNode();
    try {
      const stats = await fetch(`${node.urls.registry}/v1/stats`);
      expect(stats.headers.get("access-control-allow-origin")).toBe("*");
      expect(await stats.json()).toEqual({ agents: 0, by_tier: {} });

      const exchangeStats = (await fetch(`${node.urls.exchange}/v1/stats`).then((r) =>
        r.json(),
      )) as { intents: number; active_bids: number };
      expect(exchangeStats.intents).toBe(0);

      const beacon = (await fetch(`${node.urls.attribution}/v1/stats/earnings`).then((r) =>
        r.json(),
      )) as {
        confirmed_events: number;
        top_earners: unknown[];
        holdback_hours: Record<string, number>;
      };
      expect(beacon.confirmed_events).toBe(0);
      expect(beacon.top_earners).toEqual([]);
      // the active holdback window is itself public (ADR 0024)
      expect(beacon.holdback_hours.default).toBeGreaterThanOrEqual(0);

      const badge = await fetch(
        `${node.urls.attribution}/v1/badge/erabi:agent:4XujsM2nKbeqApvNVMZRT8JcWcfMs5VRGsCdSqJpwy8d.svg`,
      );
      expect(badge.headers.get("content-type")).toContain("image/svg+xml");
      expect(await badge.text()).toContain("not on ERABI");
    } finally {
      await node.stop();
    }
  });
});
