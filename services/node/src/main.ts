import { startReferenceNode } from "./index.js";

const node = await startReferenceNode({
  ports: [
    Number(process.env.REGISTRY_PORT ?? 4001),
    Number(process.env.EXCHANGE_PORT ?? 4002),
    Number(process.env.ATTRIBUTION_PORT ?? 4003),
    Number(process.env.REPUTATION_PORT ?? 4004),
  ],
  host: process.env.ERABI_HOST ?? "127.0.0.1",
  dataDir: process.env.ERABI_DATA_DIR,
  nodeId: process.env.ERABI_NODE_ID ?? "erabi-node-dev-1",
});

console.log(`Erabi reference node up:
  registry     ${node.urls.registry}
  exchange     ${node.urls.exchange}
  attribution  ${node.urls.attribution}
  reputation   ${node.urls.reputation}`);
