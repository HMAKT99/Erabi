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
  { title: "Claude Code", body: "one command: claude mcp add erabi" },
  { title: "Cursor", body: "drop the config in .cursor/mcp.json" },
  { title: "GitHub Copilot", body: ".vscode/mcp.json, agent mode" },
  { title: "OpenCode", body: "mcp block in opencode.json" },
  { title: "OpenClaw", body: "add erabi-mcp as a skill" },
  { title: "Windsurf · Cline · Zed", body: "same server, same config" },
  { title: "LangChain · CrewAI · AutoGen", body: "drop-in Python bindings" },
  { title: "Hermes / DIY agents", body: "REST + machine-readable front door" },
];
