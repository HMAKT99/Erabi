import { describe, expect, it } from "vitest";
import { X402Rail } from "../src/rails.js";

const REQUEST = {
  payout_id: "p-1",
  agent_id: "erabi:agent:stub",
  amount_usd: 1.25,
  payout_binding: "sha256:" + "ab".repeat(32),
};

describe("X402Rail (facilitator client)", () => {
  it("settles through the facilitator and maps the transaction into a receipt", async () => {
    let captured: { url: string; body: Record<string, unknown> } | null = null;
    const rail = new X402Rail("https://facilitator.example/", (async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      captured = { url: String(input), body: JSON.parse(String(init?.body)) };
      return new Response(JSON.stringify({ success: true, transaction: "0xfeed" }), {
        status: 200,
      });
    }) as typeof fetch);

    const receipt = await rail.execute(REQUEST);
    expect(receipt.rail).toBe("x402");
    expect(receipt.ref).toBe("x402:0xfeed");
    expect(captured!.url).toBe("https://facilitator.example/settle");
    expect(captured!.body.destination_binding).toBe(REQUEST.payout_binding);
    expect(captured!.body.amount_usd).toBe(1.25);
  });

  it("fails closed on HTTP errors and unsuccessful settles — no receipt, no payout", async () => {
    const httpError = new X402Rail(
      "https://facilitator.example",
      (async () => new Response("", { status: 502 })) as typeof fetch,
    );
    await expect(httpError.execute(REQUEST)).rejects.toThrow(/HTTP 502/);

    const declined = new X402Rail(
      "https://facilitator.example",
      (async () =>
        new Response(JSON.stringify({ success: false }), { status: 200 })) as typeof fetch,
    );
    await expect(declined.execute(REQUEST)).rejects.toThrow(/no transaction/);
  });
});
