import { describe, expect, it } from "vitest";
import { MockX402Prober, X402Bridge } from "@erabi/bridge-x402";
import type { RegistryService } from "@erabi/registry";
import type { ExchangeService } from "@erabi/exchange";
import type { AttributionService } from "@erabi/attribution";
import { DEFAULT_X402_ENDPOINTS, slugForEndpoint } from "../src/x402-endpoints.js";

/**
 * Drift guard (found by the 2026-07-07 e2e round): main.ts passes curated
 * entries DIRECTLY into bridge.submitEndpoint, whose zod schema is .strict().
 * Adding a field to CuratedX402Endpoint without teaching the bridge about it
 * silently kills every boot activation. This test submits every curated
 * entry through the real bridge path so the shapes can never drift apart.
 */
describe("curated x402 endpoints stay bridge-submittable", () => {
  it("every DEFAULT_X402_ENDPOINTS entry activates through submitEndpoint", async () => {
    const prober = new MockX402Prober();
    for (const endpoint of DEFAULT_X402_ENDPOINTS) {
      prober.setEndpoint(endpoint.url, { price_usd: 0.001 });
    }
    const bridge = new X402Bridge({
      registry: { registerAgent: async () => ({}) } as unknown as RegistryService,
      exchange: { placeBid: async () => ({}) } as unknown as ExchangeService,
      attribution: {} as AttributionService,
      prober,
      hmacSecret: "test-secret",
      seedSecret: "test-seed",
    });

    for (const endpoint of DEFAULT_X402_ENDPOINTS) {
      const bridged = await bridge.submitEndpoint(endpoint); // throws on schema drift
      expect(bridged.url).toBe(endpoint.url);
    }
  });

  it("every curated entry has a unique slug", () => {
    const slugs = DEFAULT_X402_ENDPOINTS.map(slugForEndpoint);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
