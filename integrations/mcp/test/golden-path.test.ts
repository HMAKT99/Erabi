/**
 * Phase 4 gate — the golden-path E2E (spec §12):
 * an agent self-registers VIA THE MCP SERVER, fires an agent.research
 * intent, receives a labeled bridge-backed sponsored result + organic
 * results, hires the top organic sub-agent, reports the outcome, the
 * postback counter-signs, the ledger accrues with a referral share, and
 * reputation updates.
 */
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { startReferenceNode, type ReferenceNode } from "@erabi/node";
import { Erabi, loadKey } from "@erabi/sdk";
import { createEnvelope } from "@erabi/crypto";
import { MockX402Prober, X402Bridge } from "@erabi/bridge-x402";
import { verificationToken } from "@erabi/registry";
import { createErabiMcpServer } from "@erabi/mcp-core";

const HMAC_SECRET = "golden-secret";

let node: ReferenceNode;
let client: Client;
let bridge: X402Bridge;
let referrer: Erabi;
let subAgents: Erabi[];
let keyDir: string;

async function call(name: string, args: Record<string, unknown>) {
  const result = (await client.callTool({ name, arguments: args })) as {
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
  const parsed = JSON.parse(result.content[0]!.text);
  if (result.isError) throw new Error(parsed.error);
  return parsed;
}

beforeAll(async () => {
  node = await startReferenceNode({ holdbackHours: { default: 0 } });
  keyDir = mkdtempSync(path.join(tmpdir(), "erabi-mcp-keys-"));

  // Cold-start demand: an x402-paywalled research API joins via the bridge.
  const prober = new MockX402Prober();
  prober.setEndpoint("https://research-api.example/v1/deep-dive", {
    price_usd: 0.5,
    description: "Deep research reports, pay per call via x402.",
  });
  bridge = new X402Bridge({
    registry: node.registry,
    exchange: node.exchange,
    attribution: node.attribution,
    prober,
    hmacSecret: HMAC_SECRET,
  });
  await bridge.submitEndpoint({
    url: "https://research-api.example/v1/deep-dive",
    category: "agent.research",
  });

  // Organic supply: three research sub-agents (SDK-registered).
  subAgents = [];
  for (let i = 0; i < 3; i++) {
    subAgents.push(
      await Erabi.register({
        name: `SubAgent${i}`,
        capabilities: ["agent.research"],
        endpoints: node.urls,
        keyDir: null,
      }),
    );
  }

  // The agent that recruited our coordinator (referral loop).
  referrer = await Erabi.register({
    name: "OrchestratorHub",
    capabilities: ["agent.analysis"],
    endpoints: node.urls,
    keyDir: null,
  });

  // The coordinator joins through MCP.
  const server = createErabiMcpServer({ endpoints: node.urls, keyDir });
  client = new Client({ name: "golden-path-test", version: "0.0.1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
}, 60_000);

afterAll(async () => {
  await client.close();
  await node.stop();
  rmSync(keyDir, { recursive: true, force: true });
});

describe("golden path", () => {
  it("runs the full loop end to end", async () => {
    // 1. Self-registration via the MCP server — zero human steps.
    const registered = await call("register", {
      name: "CoordinatorAgent",
      capabilities: ["agent.analysis"],
      accepts_sponsored: true,
      verification: ["dns:coordinator.example"],
      referrer: referrer.id,
    });
    const coordinatorId = registered.agent_id as string;
    expect(coordinatorId).toMatch(/^erabi:agent:/);
    expect(node.registry.getAgent(coordinatorId).tier).toBe("unverified");

    // The owner anchors the identity via DNS TXT (tier → verified), signing
    // with the coordinator's own key from the keystore.
    node.dns.setTxtRecords("coordinator.example", [verificationToken(coordinatorId)]);
    const stored = loadKey(keyDir, "CoordinatorAgent")!;
    expect(stored.agentId).toBe(coordinatorId);
    const verifyResponse = await fetch(`${node.urls.registry}/v1/agents/${coordinatorId}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        createEnvelope({
          payload: { method: "dns:coordinator.example" },
          secretKey: stored.keys.secretKey,
          keyId: coordinatorId,
          nodeId: "golden-path-test",
        }),
      ),
    });
    expect(verifyResponse.status).toBe(200);
    expect(node.registry.getAgent(coordinatorId).tier).toBe("verified");

    // 2. The moment of choice: an agent.research intent via MCP.
    const choices = await call("intent", {
      category: "agent.research",
      query: "deep research synthesis with citations",
      max_price_usd: 2,
    });

    // Organic results are present and money-blind.
    expect(choices.organic.length).toBeGreaterThanOrEqual(3);
    const organicIds = choices.organic.map((o: { provider_id: string }) => o.provider_id);
    for (const sub of subAgents) expect(organicIds).toContain(sub.id);

    // The bridge-backed sponsored result is there, labeled, with a signed,
    // publicly fetchable disclosure.
    expect(choices.sponsored).toHaveLength(1);
    const sponsored = choices.sponsored[0];
    expect(sponsored.provider_id).toBe(bridge.list()[0]!.provider_id);
    expect(sponsored.disclosure.label).toContain("Sponsored");
    expect(choices.sponsored_rendered[0]).toContain("[Sponsored]");
    const disclosureCheck = await fetch(
      `${node.urls.exchange}/v1/disclosures/${sponsored.disclosure.disclosure_id}`,
    );
    expect(disclosureCheck.status).toBe(200);

    // Every response carries the join block — the contagion mechanic.
    expect(choices.join.spec).toBe("erabi/0.1");

    // 3. Hire the top organic sub-agent; report outcomes via MCP; the
    //    sub-agent counter-signs (no single-sided event ever confirms).
    // (Organic is money-blind, so the bridged provider ranks there too;
    // the coordinator wants a hireable sub-agent.)
    const topOrganicId = organicIds.find((id: string) =>
      subAgents.some((s) => s.id === id),
    ) as string;
    const hired = subAgents.find((s) => s.id === topOrganicId)!;

    const selection = await call("report_outcome", {
      auction_id: choices.auction_id,
      provider_id: topOrganicId,
      kind: "selection",
    });
    await hired.confirmOutcome(selection.event_id, selection.hash);

    const success = await call("report_outcome", {
      auction_id: choices.auction_id,
      provider_id: topOrganicId,
      kind: "task_success",
      value_usd: 1.25,
      rail: "x402",
      rail_ref: "tx:sol:hire-1",
    });
    await hired.confirmOutcome(success.event_id, success.hash);

    // 4. The coordinator also consumed the sponsored x402 API; the
    //    facilitator's HMAC-signed postback counter-signs that outcome.
    const bridgeOutcome = await call("report_outcome", {
      auction_id: choices.auction_id,
      provider_id: sponsored.provider_id,
      kind: "task_success",
      value_usd: 0.5,
      rail: "x402",
      rail_ref: "tx:sol:bridge-1",
    });
    const postback = JSON.stringify({
      event_id: bridgeOutcome.event_id,
      provider_id: sponsored.provider_id,
      x402_tx: "tx:sol:bridge-1",
    });
    await bridge.handlePostback(
      postback,
      createHmac("sha256", HMAC_SECRET).update(postback).digest("hex"),
    );

    // 5. Settlement: past the holdback, events confirm and the ledger accrues.
    const confirmed = node.attribution.processHoldbacks();
    expect(confirmed.length).toBeGreaterThanOrEqual(3);

    const earnings = await call("my_earnings", {});
    expect(earnings.accrued_usd).toBeGreaterThan(0); // 70% of the clearing price

    // ...including the referral share for the recruiter (§9.2).
    const referrerEarnings = node.attribution.getEarnings(referrer.id);
    expect(referrerEarnings.referral_usd).toBeGreaterThan(0);

    // 6. Reputation updates from the confirmed dual-signed events.
    const reputation = await fetch(`${node.urls.reputation}/v1/reputation/${topOrganicId}`).then(
      (r) => r.json() as Promise<{ score: number; confirmed_events: number; evidence: string[] }>,
    );
    expect(reputation.confirmed_events).toBe(2);
    expect(reputation.score).toBeGreaterThan(50);
    expect(reputation.evidence).toContain(success.event_id);
    // The registry's organic ranking now reflects it.
    expect(node.registry.getAgent(topOrganicId).reputation).toBe(reputation.score);

    // The MCP agent can see its own ledger world too.
    const myRep = await call("my_reputation", {});
    expect(myRep.agent_id).toBe(coordinatorId);
  });
});

describe("welcome wagon: pending_outcomes + confirm_outcome via MCP", () => {
  it("a provider agent counter-signs an incoming selection entirely through MCP tools", async () => {
    // a second MCP session acts as the newcomer provider
    const providerServer = createErabiMcpServer({ endpoints: node.urls, keyDir: null });
    const providerClient = new Client({ name: "newcomer", version: "0" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([providerClient.connect(a), providerServer.connect(b)]);
    const pcall = async (name: string, args: Record<string, unknown>) => {
      const result = (await providerClient.callTool({ name, arguments: args })) as {
        content: Array<{ type: string; text: string }>;
        isError?: boolean;
      };
      const parsed = JSON.parse(result.content[0]!.text);
      if (result.isError) throw new Error(parsed.error);
      return parsed;
    };

    const joined = await pcall("register", {
      name: "WelcomeWagonNewcomer",
      capabilities: ["agent.research"],
    });

    // an established consumer selects the newcomer
    const consumer = await Erabi.register({
      name: "WagonConsumer",
      capabilities: ["agent.analysis"],
      endpoints: node.urls,
      keyDir: null,
    });
    const choices = await consumer.intent({ category: "agent.research" });
    const selection = await consumer.reportOutcome({
      auctionId: (choices as unknown as { set: { auction_id: string } }).set.auction_id,
      providerId: joined.agent_id,
      kind: "selection",
    });

    // the newcomer discovers and counter-signs it via its own tools
    const pending = await pcall("pending_outcomes", {});
    const mine = pending.pending.find(
      (event: { event_id: string }) => event.event_id === selection.event_id,
    );
    expect(mine).toBeTruthy();
    const confirmed = await pcall("confirm_outcome", {
      event_id: mine.event_id,
      hash: mine.hash,
    });
    expect(confirmed.status).toBe("countersigned");
    await providerClient.close();
  });
});
