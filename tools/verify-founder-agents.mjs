/**
 * Verify founder-owned agents via GitHub gist, so the network shows a real
 * VERIFIED tier (and the verification flow is publicly demonstrated). Honest:
 * these agents are genuinely owned by HMAKT99, proven by a public gist.
 *
 * Two phases (gist must exist before verify):
 *   node tools/verify-founder-agents.mjs register   # register + print tokens
 *   node tools/verify-founder-agents.mjs verify      # after the gist is live
 *
 * Keys persist in ~/.erabi/founder-keys so the agents are durable + re-usable.
 */
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { Erabi } from "@erabi/sdk";

const HANDLE = "HMAKT99";
const METHOD = `github:${HANDLE}`;
const BASE = process.env.ERABI_BASE_URL ?? "https://erabi-production.up.railway.app";
const endpoints = {
  registry: `${BASE}/registry`,
  exchange: `${BASE}/exchange`,
  attribution: `${BASE}/attribution`,
  reputation: `${BASE}/reputation`,
};
const keyDir = path.join(homedir(), ".erabi", "founder-keys");
mkdirSync(keyDir, { recursive: true });

const AGENTS = [
  { name: "Praxis-Research", capabilities: ["agent.research", "agent.analysis"] },
  { name: "Sentinel-Audit", capabilities: ["agent.analysis", "api.fraud-scoring"] },
];

const phase = process.argv[2];

async function load(spec) {
  // keyDir persistence makes register an idempotent re-join for the same name.
  return Erabi.register({
    name: spec.name,
    capabilities: spec.capabilities,
    verification: [METHOD],
    endpoints,
    keyDir,
    endpoint: "https://github.com/HMAKT99/Erabi",
  });
}

if (phase === "register") {
  const ids = [];
  for (const spec of AGENTS) {
    const agent = await load(spec);
    ids.push(agent.id);
    console.log(`${spec.name}: ${agent.id}`);
  }
  console.log("\n--- put BOTH tokens in one public gist (description or file) ---");
  for (const id of ids) console.log(`erabi-verify=${id}`);
  console.log(
    `\ngh gist create --public -d "ERABI agent ownership — ${ids
      .map((id) => `erabi-verify=${id}`)
      .join(" ")}" <(echo "ERABI agent ownership proof for ${HANDLE}")`,
  );
} else if (phase === "verify") {
  for (const spec of AGENTS) {
    const agent = await load(spec);
    const res = await fetch(`${endpoints.registry}/v1/agents/${encodeURIComponent(agent.id)}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(agent.signed({ method: METHOD })),
    });
    const body = await res.json();
    console.log(`${spec.name}: ${res.status} → tier=${body.tier ?? JSON.stringify(body).slice(0, 160)}`);
  }
} else {
  console.error('usage: node tools/verify-founder-agents.mjs <register|verify>');
  process.exit(1);
}
