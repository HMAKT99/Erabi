import { describe, expect, it } from "vitest";
import { HttpX402Prober, probeX402Detailed } from "../src/index.js";

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

describe("HttpX402Prober — x402 v2", () => {
  it("parses the base64 PAYMENT-REQUIRED header challenge (empty body)", async () => {
    const challenge = Buffer.from(
      JSON.stringify({
        x402Version: 2,
        accepts: [{ scheme: "exact", amount: "5000", description: "FX ticks" }],
      }),
    ).toString("base64");
    const prober = new HttpX402Prober(
      (async () =>
        new Response("{}", {
          status: 402,
          headers: { "payment-required": challenge },
        })) as typeof fetch,
    );
    const probe = await prober.probe("https://tick.example/latest");
    expect(probe).toEqual({ price_usd: 0.005, description: "FX ticks" });
  });

  it("accepts the v2 `amount` field in a body challenge", async () => {
    const prober = new HttpX402Prober(
      (async () =>
        new Response(
          JSON.stringify({ x402Version: 2, accepts: [{ scheme: "exact", amount: "10000" }] }),
          { status: 402 },
        )) as typeof fetch,
    );
    const probe = await prober.probe("https://v2body.example/api");
    expect(probe?.price_usd).toBe(0.01);
  });

  it("falls back to the body when the header is malformed", async () => {
    const prober = new HttpX402Prober(
      (async () =>
        new Response(
          JSON.stringify({ accepts: [{ scheme: "exact", maxAmountRequired: "2000" }] }),
          { status: 402, headers: { "payment-required": "not-base64-json!!" } },
        )) as typeof fetch,
    );
    const probe = await prober.probe("https://mixed.example/api");
    expect(probe?.price_usd).toBe(0.002);
  });
});

describe("probeX402Detailed", () => {
  it("reports a live v1 body challenge with status, latency, and version", async () => {
    const detailed = await probeX402Detailed("https://api.fxdata.example/quotes", {
      fetchImpl: fake402({
        x402Version: 1,
        accepts: [
          { scheme: "exact", maxAmountRequired: "50000", description: "FX quotes, pay per call." },
        ],
      }),
    });
    expect(detailed.alive).toBe(true);
    expect(detailed.http_status).toBe(402);
    expect(detailed.price_usd).toBe(0.05);
    expect(detailed.x402_version).toBe("v1-body");
    expect(detailed.description).toBe("FX quotes, pay per call.");
    expect(detailed.error).toBeNull();
    expect(detailed.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it("reports a live v2 header challenge", async () => {
    const challenge = Buffer.from(
      JSON.stringify({ x402Version: 2, accepts: [{ scheme: "exact", amount: "5000" }] }),
    ).toString("base64");
    const detailed = await probeX402Detailed("https://tick.example/latest", {
      fetchImpl: (async () =>
        new Response("{}", {
          status: 402,
          headers: { "payment-required": challenge },
        })) as typeof fetch,
    });
    expect(detailed.alive).toBe(true);
    expect(detailed.x402_version).toBe("v2-header");
    expect(detailed.price_usd).toBe(0.005);
    expect(detailed.error).toBeNull();
  });

  it("classifies non-402 responses without losing status or latency", async () => {
    const detailed = await probeX402Detailed("https://free.example", {
      fetchImpl: fake402({}, 200),
    });
    expect(detailed).toMatchObject({
      alive: false,
      http_status: 200,
      price_usd: null,
      x402_version: null,
      error: "non_402",
    });
    expect(detailed.latency_ms).toBeGreaterThanOrEqual(0);

    const down = await probeX402Detailed("https://down.example", {
      fetchImpl: fake402({}, 500),
    });
    expect(down.http_status).toBe(500);
    expect(down.error).toBe("non_402");
  });

  it("classifies a 402 with an unparseable challenge as bad_challenge", async () => {
    const emptyAccepts = await probeX402Detailed("https://x.example", {
      fetchImpl: fake402({ accepts: [] }),
    });
    expect(emptyAccepts).toMatchObject({ alive: false, http_status: 402, error: "bad_challenge" });

    const nonJson = await probeX402Detailed("https://html.example", {
      fetchImpl: (async () => new Response("<html>pay</html>", { status: 402 })) as typeof fetch,
    });
    expect(nonJson).toMatchObject({ alive: false, http_status: 402, error: "bad_challenge" });

    const badPrice = await probeX402Detailed("https://nan.example", {
      fetchImpl: fake402({ accepts: [{ scheme: "exact", maxAmountRequired: "not-a-number" }] }),
    });
    expect(badPrice.error).toBe("bad_challenge");
  });

  it("classifies network failures and timeouts distinctly", async () => {
    const network = await probeX402Detailed("https://down.example", {
      fetchImpl: (async () => {
        throw new Error("ECONNREFUSED");
      }) as typeof fetch,
    });
    expect(network).toMatchObject({
      alive: false,
      http_status: null,
      latency_ms: null,
      error: "network",
    });

    const timeout = await probeX402Detailed("https://slow.example", {
      fetchImpl: (async () => {
        const error = new Error("The operation timed out");
        error.name = "TimeoutError";
        throw error;
      }) as typeof fetch,
    });
    expect(timeout.error).toBe("timeout");
  });

  it("falls back to the body when the v2 header is malformed", async () => {
    const detailed = await probeX402Detailed("https://mixed.example/api", {
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({ accepts: [{ scheme: "exact", maxAmountRequired: "2000" }] }),
          { status: 402, headers: { "payment-required": "not-base64-json!!" } },
        )) as typeof fetch,
    });
    expect(detailed.alive).toBe(true);
    expect(detailed.x402_version).toBe("v1-body");
    expect(detailed.price_usd).toBe(0.002);
  });
});
