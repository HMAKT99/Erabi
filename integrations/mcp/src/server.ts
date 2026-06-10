import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_ENDPOINTS, Erabi, type ErabiEndpoints, type OutcomeKind } from "@erabi/sdk";

export interface ErabiMcpOptions {
  endpoints?: Partial<ErabiEndpoints>;
  /** Key persistence dir; null keeps keys in memory for the session. */
  keyDir?: string | null;
}

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

/**
 * The agent door: an MCP-capable agent generates its own identity and
 * transacts on the network mid-task, zero human steps.
 */
export function createErabiMcpServer(options: ErabiMcpOptions = {}): McpServer {
  const endpoints = { ...DEFAULT_ENDPOINTS, ...options.endpoints };
  const agents = new Map<string, Erabi>();
  let current: Erabi | null = null;

  const server = new McpServer({ name: "erabi", version: "0.1.0" });

  function agentFor(name?: string): Erabi | null {
    if (name) return agents.get(name) ?? null;
    return current;
  }

  server.tool(
    "register",
    "Join the Erabi intent exchange: generates a keypair and self-registers this agent. No human steps.",
    {
      name: z.string().min(1).max(120),
      capabilities: z.array(z.string()).min(1),
      accepts_sponsored: z.boolean().optional(),
      verification: z.array(z.string()).optional(),
      referrer: z.string().nullable().optional(),
    },
    async (args) => {
      try {
        const agent = await Erabi.register({
          name: args.name,
          capabilities: args.capabilities,
          acceptsSponsored: args.accepts_sponsored,
          verification: args.verification,
          referrer: args.referrer ?? null,
          endpoints,
          keyDir: options.keyDir ?? null,
        });
        agents.set(args.name, agent);
        current = agent;
        return text({ agent_id: agent.id, tier: "unverified", manifest: agent.manifest });
      } catch (error) {
        return fail(String(error));
      }
    },
  );

  server.tool(
    "discover",
    "Find providers for a capability, ranked organically by reputation × freshness.",
    { capability: z.string(), limit: z.number().int().min(1).max(50).optional() },
    async (args) => {
      const agent = current;
      try {
        if (agent) return text(await agent.discover(args.capability, args.limit ?? 10));
        const response = await fetch(`${endpoints.registry}/v1/discover`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ capability: args.capability, limit: args.limit ?? 10 }),
        });
        return text(await response.json());
      } catch (error) {
        return fail(String(error));
      }
    },
  );

  server.tool(
    "intent",
    "Fire a moment of choice: get organic candidates plus clearly labeled sponsored ones (each with a signed disclosure).",
    {
      category: z.string(),
      query: z.string().optional(),
      max_price_usd: z.number().optional(),
      max_latency_ms: z.number().int().optional(),
      human_in_loop: z.boolean().optional(),
      agent_name: z.string().optional(),
    },
    async (args) => {
      const agent = agentFor(args.agent_name);
      if (!agent) return fail("register first");
      try {
        const constraints: { max_price_usd?: number; max_latency_ms?: number } = {};
        if (args.max_price_usd !== undefined) constraints.max_price_usd = args.max_price_usd;
        if (args.max_latency_ms !== undefined) constraints.max_latency_ms = args.max_latency_ms;
        const choices = await agent.intent({
          category: args.category,
          query: args.query,
          constraints,
          humanInLoop: args.human_in_loop,
        });
        return text({
          auction_id: choices.set.auction_id,
          intent_id: choices.set.intent_id,
          organic: choices.organic,
          sponsored: choices.sponsored,
          sponsored_rendered: choices.renderSponsored(),
          join: choices.set.join,
        });
      } catch (error) {
        return fail(String(error));
      }
    },
  );

  server.tool(
    "report_outcome",
    "Report a signed outcome event (selection, click, conversion, task_success, assisted) for a provider chosen from a consideration set.",
    {
      auction_id: z.string(),
      provider_id: z.string(),
      kind: z.enum(["selection", "click", "conversion", "task_success", "assisted"]),
      value_usd: z.number().min(0).optional(),
      rail: z.enum(["x402", "ap2", "affiliate", "ledger_only"]).optional(),
      rail_ref: z.string().optional(),
      agent_name: z.string().optional(),
    },
    async (args) => {
      const agent = agentFor(args.agent_name);
      if (!agent) return fail("register first");
      try {
        const entry = await agent.reportOutcome({
          auctionId: args.auction_id,
          providerId: args.provider_id,
          kind: args.kind as OutcomeKind,
          valueUsd: args.value_usd,
          railReceipt: args.rail && args.rail_ref ? { rail: args.rail, ref: args.rail_ref } : null,
        });
        return text(entry);
      } catch (error) {
        return fail(String(error));
      }
    },
  );

  server.tool(
    "my_reputation",
    "This agent's reputation score with its full, independently verifiable evidence trail.",
    { agent_name: z.string().optional() },
    async (args) => {
      const agent = agentFor(args.agent_name);
      if (!agent) return fail("register first");
      try {
        return text(await agent.myReputation());
      } catch (error) {
        return fail(String(error));
      }
    },
  );

  server.tool(
    "my_earnings",
    "This agent's accrued, frozen, paid, and available earnings on the public ledger.",
    { agent_name: z.string().optional() },
    async (args) => {
      const agent = agentFor(args.agent_name);
      if (!agent) return fail("register first");
      try {
        return text(await agent.myEarnings());
      } catch (error) {
        return fail(String(error));
      }
    },
  );

  return server;
}
