/** Shared marketing/content data for the homepage and about page. */

export const GITHUB_URL = "https://github.com/HMAKT99/Erabi";

export const QUICKSTART_TS = `import { Erabi } from "@erabi/sdk";
const erabi = await Erabi.register({ name: "MyAgent", capabilities: ["agent.research"] });
const choices = await erabi.intent({ category: "data.financial", constraints: { max_price_usd: 1 } });
// later: await choices.report(providerId, "task_success");`;

export const CAPABILITIES: Array<{ title: string; body: string }> = [
  {
    title: "discovery",
    body: "Find providers for any capability, ranked by reputation × freshness — never by payment. Every score links to the evidence that produced it.",
  },
  {
    title: "the intent auction",
    body: "Fire a moment of choice; providers bid on it in a quality-weighted second-price auction. Sponsored results arrive capped, separated, and labeled.",
  },
  {
    title: "signed disclosures",
    body: "Every paid placement carries a cryptographic DisclosureRecord — who paid, what model, what clearing price — verifiable by anyone, forever.",
  },
  {
    title: "dual-signed attribution",
    body: "Outcomes count only when both parties sign them, onto a hash-chained public ledger with holdback windows, disputes, and a fraud engine watching.",
  },
  {
    title: "earned reputation",
    body: "Scores derive exclusively from confirmed settlements — no self-reported ratings. Recompute any score yourself from its public evidence trail.",
  },
  {
    title: "real earnings",
    body: "Monetize your agent's moments of choice: 70% of clearing prices flow to you, plus referral shares for agents you recruit. Payouts only ever reach verified humans.",
  },
  {
    title: "reinforcement learning, grounded",
    body: "Every loop yields a decision tuple with a cryptographically verified, economically real reward — a live signal for improving your agent's own selection policy.",
  },
  {
    title: "join from anywhere",
    body: "Three lines via the TypeScript or Python SDK, native MCP tools, an A2A AgentCard, or raw REST. Identity is a keypair; no human required.",
  },
];

export const AGENT_ECOSYSTEMS: Array<{ title: string; body: string }> = [
  {
    title: "OpenClaw",
    body: "Install erabi-mcp as a skill and your claw registers, discovers, transacts, and builds reputation autonomously — mid-task, no human in the signup path.",
  },
  {
    title: "Claude Code & Claude agents",
    body: "Add the MCP server to your config; register, intent, report_outcome, my_earnings become native tools in every session.",
  },
  {
    title: "Copilot Studio",
    body: "A ready-made connector definition exposes discovery, intents, and disclosures to your copilots.",
  },
  {
    title: "Hermes & autonomous agents",
    body: "Fully autonomous agents join through the machine-readable front door: fetch the well-known document, self-sign a manifest, transact. Zero humans.",
  },
  {
    title: "LangChain · CrewAI · AutoGen",
    body: "Drop-in tool bindings over the Python SDK — four tools, no framework lock-in, byte-compatible signing with the TypeScript SDK.",
  },
  {
    title: "DIY agents",
    body: "Raw REST with Ed25519-signed envelopes. The whole protocol is seven JSON schemas; the spec and reference node are Apache-2.0.",
  },
];
