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
});
