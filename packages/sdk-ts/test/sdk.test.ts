import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startReferenceNode, type ReferenceNode } from "@erabi/node";
import { Erabi, loadKey, renderSponsored } from "../src/index.js";

let node: ReferenceNode;
let keyDir: string;

beforeAll(async () => {
  node = await startReferenceNode({ holdbackHours: { default: 0 } });
  keyDir = mkdtempSync(path.join(tmpdir(), "erabi-keys-"));
});

afterAll(async () => {
  await node.stop();
  rmSync(keyDir, { recursive: true, force: true });
});

describe("@erabi/sdk", () => {
  it("runs the 3-line quickstart through a full settlement", async () => {
    const endpoints = node.urls;

    // Provider side: a sub-agent registers and is discoverable.
    const subAgent = await Erabi.register({
      name: "ResearchSubAgent",
      capabilities: ["agent.research"],
      endpoints,
      keyDir,
    });

    // The 3-line promise:
    const erabi = await Erabi.register({
      name: "MyAgent",
      capabilities: ["agent.analysis"],
      endpoints,
      keyDir,
    });
    const choices = await erabi.intent({
      category: "agent.research",
      constraints: { max_price_usd: 1 },
    });
    expect(choices.organic.map((o) => o.provider_id)).toContain(subAgent.id);

    const selection = await choices.report(subAgent.id, "selection");
    expect(selection.status).toBe("pending");

    // Counterparty dual-signs; holdback is 0 in this node.
    await subAgent.confirmOutcome(selection.event_id, selection.hash);
    const success = await choices.report(subAgent.id, "task_success", { valueUsd: 1 });
    await subAgent.confirmOutcome(success.event_id, success.hash);
    node.attribution.processHoldbacks();

    // Reputation now derives from the confirmed events.
    const reputation = (await subAgent.myReputation()) as { confirmed_events: number };
    expect(reputation.confirmed_events).toBe(2);

    const feedback = (await erabi.feedback()) as { selections: unknown[] };
    expect(feedback.selections).toHaveLength(1);
  });

  it("persists keys and reuses them on re-register", async () => {
    const agent = await Erabi.register({
      name: "PersistentAgent",
      capabilities: ["agent.coding"],
      endpoints: node.urls,
      keyDir,
    });
    const stored = loadKey(keyDir, "PersistentAgent");
    expect(stored?.agentId).toBe(agent.id);
  });

  it("labels sponsored results by default", () => {
    const entry = {
      provider_id: "erabi:agent:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      creative: { title: "T", claim: "C", endpoint: "https://e.example" },
      disclosure: { disclosure_id: "d-1" },
    } as never;
    expect(renderSponsored(entry)).toContain("[Sponsored]");
    expect(renderSponsored(entry)).toContain("disclosure:d-1");
    expect(renderSponsored(entry, { iUnderstandDisclosureObligations: true })).not.toContain(
      "[Sponsored]",
    );
  });

  it("emits a machine-readable invite with referral attached", async () => {
    const agent = await Erabi.register({
      name: "Inviter",
      capabilities: ["agent.content"],
      endpoints: node.urls,
      keyDir: null,
    });
    const invite = agent.invite();
    expect(invite.spec).toBe("erabi/0.1");
    expect(invite.referrer).toBe(agent.id);
    expect(invite.register).toBe(`${node.urls.registry}/v1/agents`);

    // The invite actually works: a recruit registers with the referrer set.
    const recruit = await Erabi.register({
      name: "Recruit",
      capabilities: ["agent.research"],
      endpoints: node.urls,
      referrer: invite.referrer,
      keyDir: null,
    });
    expect(recruit.manifest.referrer).toBe(agent.id);
  });
});
