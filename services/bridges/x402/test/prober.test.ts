import { describe, expect, it } from "vitest";
import { HttpX402Prober } from "../src/index.js";

function fake402(body: unknown, status = 402): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
}

describe("HttpX402Prober", () => {
  it("parses an x402 payment-required response into a USD price", async () => {
    const prober = new HttpX402Prober(
      fake402({
        x402Version: 1,
        accepts: [
          {
            scheme: "exact",
            network: "base",
            maxAmountRequired: "50000", // 0.05 USDC at 6 decimals
            asset: "0xUSDC",
            payTo: "0xabc",
            description: "FX quotes, pay per call.",
          },
        ],
      }),
    );
    const probe = await prober.probe("https://api.fxdata.example/quotes");
    expect(probe).toEqual({ price_usd: 0.05, description: "FX quotes, pay per call." });
  });

  it("honors explicit asset decimals", async () => {
    const prober = new HttpX402Prober(
      fake402({
        accepts: [{ scheme: "exact", maxAmountRequired: "50", extra: { decimals: 2 } }],
      }),
    );
    expect((await prober.probe("https://x.example"))?.price_usd).toBe(0.5);
  });

  it("returns null for non-402 responses, malformed bodies, and network errors", async () => {
    expect(await new HttpX402Prober(fake402({}, 200)).probe("https://free.example")).toBeNull();
    expect(
      await new HttpX402Prober(fake402({ accepts: [] })).probe("https://x.example"),
    ).toBeNull();
    expect(
      await new HttpX402Prober(
        fake402({ accepts: [{ scheme: "exact", maxAmountRequired: "not-a-number" }] }),
      ).probe("https://x.example"),
    ).toBeNull();
    const offline = new HttpX402Prober((async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch);
    expect(await offline.probe("https://down.example")).toBeNull();
  });
});
