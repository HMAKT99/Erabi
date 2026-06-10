/**
 * The full Erabi loop, locally, in ~5 seconds:
 * a coordinator agent hires a research sub-agent through the exchange,
 * a bridged x402 API wins the sponsored slot with a signed disclosure,
 * outcomes dual-sign, the ledger settles, reputation moves, and the
 * coordinator's developer earns their first cent.
 *
 *   pnpm demo            run the loop, keep the node up for the explorer
 *   pnpm demo -- --once  run the loop and exit (CI)
 */
import { createHmac } from "node:crypto";
import { startReferenceNode } from "@erabi/node";
import { Erabi } from "@erabi/sdk";
import { MockX402Prober, X402Bridge } from "@erabi/bridge-x402";

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const step = (n: number, s: string) => console.log(`\n${green(`[${n}]`)} ${bold(s)}`);

const once = process.argv.includes("--once");
const HMAC_SECRET = "demo-secret";

console.log(bold("\nerabi://demo — a coordinator hires a sub-agent through the exchange\n"));

step(1, "boot a reference node (registry, exchange, attribution, reputation)");
const node = await startReferenceNode({
  ports: once ? undefined : [4001, 4002, 4003, 4004],
  holdbackHours: { default: 0 }, // demo settles instantly; prod holds 24-72h
});
for (const [name, url] of Object.entries(node.urls))
  console.log(dim(`    ${name.padEnd(12)} ${url}`));

step(2, "cold-start demand: an x402-paywalled research API joins via the bridge");
const prober = new MockX402Prober();
prober.setEndpoint("https://research-api.example/v1/deep-dive", {
  price_usd: 0.5,
  description: "Deep research reports, pay per call via x402.",
});
const bridge = new X402Bridge({
  registry: node.registry,
  exchange: node.exchange,
  attribution: node.attribution,
  prober,
  hmacSecret: HMAC_SECRET,
});
prober.setEndpoint("https://litreview.example/v1/survey", {
  price_usd: 0.35,
  description: "Literature surveys on demand via x402.",
});
const bridged = await bridge.submitEndpoint({
  url: "https://research-api.example/v1/deep-dive",
  category: "agent.research",
});
const rival = await bridge.submitEndpoint({
  url: "https://litreview.example/v1/survey",
  category: "agent.research",
});
console.log(
  dim(`    bridge-tier provider ${bridged.provider_id.slice(0, 32)}… bids $${bridged.price_usd}`),
);
console.log(
  dim(`    bridge-tier provider ${rival.provider_id.slice(0, 32)}… bids $${rival.price_usd}`),
);
console.log(dim(`    (GSP: the winner will pay just enough to hold rank, not its own bid)`));

step(3, "organic supply: three research sub-agents self-register (zero human steps)");
const subAgents: Erabi[] = [];
for (const name of ["CiteSeeker", "DeepDiveDan", "SourceHound"]) {
  const agent = await Erabi.register({
    name,
    capabilities: ["agent.research"],
    endpoints: node.urls,
    keyDir: null,
  });
  subAgents.push(agent);
  console.log(dim(`    ${name.padEnd(12)} ${agent.id.slice(0, 40)}…`));
}

step(4, "the coordinator joins and opts in to monetizing its moments of choice");
const coordinator = await Erabi.register({
  name: "CoordinatorAgent",
  capabilities: ["agent.analysis"],
  endpoints: node.urls,
  acceptsSponsored: true,
  keyDir: null,
});
console.log(dim(`    ${coordinator.id}`));

step(5, "the moment of choice: an agent.research intent hits the exchange");
const choices = await coordinator.intent({
  category: "agent.research",
  query: "deep research synthesis with citations",
  constraints: { max_price_usd: 2 },
});
console.log(`    organic (money-blind, ranked by reputation × freshness):`);
for (const organic of choices.organic) {
  console.log(dim(`      ${organic.provider_id.slice(0, 40)}…  rep ${organic.reputation}`));
}
console.log(`    sponsored (capped, labeled, disclosure-signed):`);
for (const line of choices.renderSponsored()) console.log(`      ${green(line)}`);
const disclosure = choices.sponsored[0]!.disclosure;
console.log(
  dim(
    `      verify it yourself: GET ${node.urls.exchange}/v1/disclosures/${disclosure.disclosure_id}`,
  ),
);

step(6, "hire the top organic sub-agent; outcomes dual-sign (no single-sided truth)");
const hired = subAgents.find((s) => s.id === choices.organic[0]!.provider_id) ?? subAgents[0]!;
const selection = await choices.report(hired.id, "selection");
await hired.confirmOutcome(selection.event_id, selection.hash);
const success = await choices.report(hired.id, "task_success", { valueUsd: 1.25 });
await hired.confirmOutcome(success.event_id, success.hash);
console.log(dim(`    ${hired.manifest.name} counter-signed selection + task_success`));

step(7, "the sponsored x402 API was also used; the facilitator postback counter-signs");
const bridgeOutcome = await coordinator.reportOutcome({
  auctionId: choices.set.auction_id,
  providerId: bridged.provider_id,
  kind: "task_success",
  valueUsd: 0.5,
  railReceipt: { rail: "x402", ref: "tx:sol:demo-1" },
});
const postback = JSON.stringify({
  event_id: bridgeOutcome.event_id,
  provider_id: bridged.provider_id,
  x402_tx: "tx:sol:demo-1",
});
await bridge.handlePostback(
  postback,
  createHmac("sha256", HMAC_SECRET).update(postback).digest("hex"),
);

step(8, "settlement: holdback passes, the ledger confirms, money and reputation move");
const confirmed = node.attribution.processHoldbacks();
console.log(dim(`    ${confirmed.length} events confirmed on the hash-chained ledger`));

const earnings = await coordinator.myEarnings();
console.log(
  `\n    ${bold("first cent:")} ${green(`$${Number(earnings.accrued_usd).toFixed(4)}`)} accrued to ${coordinator.manifest.name}'s developer`,
);
console.log(
  dim(`    (70% of the sponsored clearing price — the rev-share ledger entry is public)`),
);

const reputation = (await hired.myReputation()) as { score: number; confirmed_events: number };
console.log(
  `    ${bold("reputation:")} ${hired.manifest.name} → ${green(String(reputation.score))} from ${reputation.confirmed_events} dual-signed events`,
);
console.log(
  dim(`    evidence: GET ${node.urls.reputation}/v1/reputation/${hired.id.slice(0, 32)}…`),
);

if (once) {
  console.log(`\n${green("✓")} full loop complete. shutting down.\n`);
  await node.stop();
} else {
  console.log(`
${green("✓")} full loop complete — the node stays up so you can watch it:

    explorer:   ${bold("pnpm --filter @erabi/explorer dev")}  →  http://localhost:4100
    beacon:     ${node.urls.attribution}/v1/stats/earnings
    this agent: http://localhost:4100/agents/${encodeURIComponent(coordinator.id)}

  Ctrl+C to stop.
`);
}
