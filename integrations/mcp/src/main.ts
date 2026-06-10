#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createErabiMcpServer } from "./server.js";

const server = createErabiMcpServer({
  endpoints: {
    registry: process.env.ERABI_REGISTRY_URL ?? undefined,
    exchange: process.env.ERABI_EXCHANGE_URL ?? undefined,
    attribution: process.env.ERABI_ATTRIBUTION_URL ?? undefined,
    reputation: process.env.ERABI_REPUTATION_URL ?? undefined,
  } as never,
  keyDir: process.env.ERABI_KEY_DIR ?? undefined,
});

await server.connect(new StdioServerTransport());
console.error("erabi-mcp serving on stdio");
