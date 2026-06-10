import { realVerifiers } from "@erabi/registry";
import { startReferenceNode } from "./index.js";

/**
 * Production entrypoint. Env:
 *   ERABI_DATA_DIR        persist DBs, node key, nonces (required in prod)
 *   ERABI_NODE_SEED       32-byte hex signing seed (overrides the key file)
 *   ERABI_REAL_VERIFIERS  "1" → real DNS TXT + GitHub gist verification
 *   ERABI_GITHUB_TOKEN    optional, raises GitHub API rate limits
 *   ERABI_HOST / *_PORT   bind address and per-service ports
 */
const production = process.env.NODE_ENV === "production";
const useRealVerifiers = production || process.env.ERABI_REAL_VERIFIERS === "1";

if (production && !process.env.ERABI_DATA_DIR) {
  console.error("refusing to start: production requires ERABI_DATA_DIR (key, nonces, DBs)");
  process.exit(1);
}

const node = await startReferenceNode({
  ports: [
    Number(process.env.REGISTRY_PORT ?? 4001),
    Number(process.env.EXCHANGE_PORT ?? 4002),
    Number(process.env.ATTRIBUTION_PORT ?? 4003),
    Number(process.env.REPUTATION_PORT ?? 4004),
  ],
  host: process.env.ERABI_HOST ?? (production ? "0.0.0.0" : "127.0.0.1"),
  dataDir: process.env.ERABI_DATA_DIR,
  nodeId: process.env.ERABI_NODE_ID ?? "erabi-node-dev-1",
  nodeSeedHex: process.env.ERABI_NODE_SEED,
  verifiers: useRealVerifiers
    ? realVerifiers({ githubToken: process.env.ERABI_GITHUB_TOKEN })
    : undefined,
  logger: production,
});

console.log(`Erabi reference node up (key: ${node.keySource}, verifiers: ${
  useRealVerifiers ? "real" : "mock"
}):
  registry     ${node.urls.registry}
  exchange     ${node.urls.exchange}
  attribution  ${node.urls.attribution}
  reputation   ${node.urls.reputation}
  node key     ${node.publicKey}`);

if (node.keySource === "ephemeral") {
  console.warn(
    "warning: ephemeral node key — disclosures will not verify after a restart. " +
      "Set ERABI_DATA_DIR or ERABI_NODE_SEED.",
  );
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void node.stop().then(() => process.exit(0));
  });
}
