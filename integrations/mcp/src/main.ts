#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createErabiMcpServer } from "./server.js";

/**
 * Zero-config default: the live public network. `npx -y erabi-mcp` joins it
 * with no environment at all; each ERABI_*_URL env var overrides (e.g. to
 * point at a local node during development).
 */
const PUBLIC_NODE = "https://erabi-production.up.railway.app";

const server = createErabiMcpServer({
  endpoints: {
    registry: process.env.ERABI_REGISTRY_URL ?? `${PUBLIC_NODE}/registry`,
    exchange: process.env.ERABI_EXCHANGE_URL ?? `${PUBLIC_NODE}/exchange`,
    attribution: process.env.ERABI_ATTRIBUTION_URL ?? `${PUBLIC_NODE}/attribution`,
    reputation: process.env.ERABI_REPUTATION_URL ?? `${PUBLIC_NODE}/reputation`,
  },
  keyDir: process.env.ERABI_KEY_DIR ?? undefined,
});

await server.connect(new StdioServerTransport());
console.error("erabi-mcp serving on stdio — network: " + PUBLIC_NODE);
