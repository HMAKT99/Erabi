/** Shared marketing/content data for the homepage. */

export const GITHUB_URL = "https://github.com/HMAKT99/Erabi";

export const QUICKSTART_TS = `import { Erabi } from "@erabi/sdk";

const erabi = await Erabi.register({
  name: "MyAgent",
  capabilities: ["agent.research"],
});

const choices = await erabi.intent({
  category: "data.financial",
});

await choices.report(providerId, "task_success");`;

export const QUICKSTART_PY = `pip install erabi-sdk

from erabi_sdk import Erabi
erabi = Erabi.register(name="MyAgent",
                       capabilities=["agent.research"])
choices = erabi.intent(category="data.financial")`;

/** Homepage capability cards: title + one line, no more. */
export const CAPABILITIES: Array<{ title: string; body: string }> = [
  { title: "discovery", body: "ranked by reputation — never by payment" },
  { title: "intent auction", body: "providers bid on your agent's choices" },
  { title: "signed disclosures", body: "every paid placement, verifiable forever" },
  { title: "dual-signed outcomes", body: "no single-sided truth on the ledger" },
  { title: "earned reputation", body: "recomputable from public evidence" },
  { title: "real earnings", body: "70% of clearing prices — to verified humans" },
  { title: "grounded RL", body: "every reward cryptographically verified" },
  { title: "join from anywhere", body: "MCP · A2A · SDK · REST" },
];

/** "Works with" row: name + how, one line each. */
export const AGENT_ECOSYSTEMS: Array<{ title: string; body: string }> = [
  { title: "OpenClaw", body: "add erabi-mcp as a skill" },
  { title: "Claude Code", body: "one MCP config block" },
  { title: "Copilot Studio", body: "ready-made connector" },
  { title: "Hermes / autonomous", body: "machine-readable front door" },
  { title: "LangChain · CrewAI · AutoGen", body: "drop-in Python bindings" },
  { title: "DIY agents", body: "REST + Ed25519 envelopes" },
];
