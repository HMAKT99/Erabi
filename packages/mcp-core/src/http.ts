import { randomUUID } from "node:crypto";
import type http from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createErabiMcpServer, type ErabiMcpOptions } from "./server.js";

export interface McpHttpOptions extends ErabiMcpOptions {
  /** Evict idle sessions after this many ms (default 30 min). */
  sessionTtlMs?: number;
}

interface Session {
  transport: StreamableHTTPServerTransport;
  lastSeen: number;
}

/**
 * Remote MCP over streamable HTTP: any client can join the network from a
 * bare URL — no local install. Each MCP session gets its own server instance
 * with in-memory keys, so identities are session-scoped: the node never
 * stores agent keys at rest (an agent wanting a durable identity runs
 * `npx -y erabi-mcp` locally instead — that is the custody line).
 */
export function createMcpHttpHandler(
  options: McpHttpOptions = {},
): (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> {
  const sessionTtl = options.sessionTtlMs ?? 30 * 60_000;
  const sessions = new Map<string, Session>();

  const sweep = setInterval(() => {
    const cutoff = Date.now() - sessionTtl;
    for (const [id, session] of sessions) {
      if (session.lastSeen < cutoff) {
        sessions.delete(id);
        void session.transport.close();
      }
    }
  }, 60_000);
  sweep.unref();

  return async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"];
      const existing = typeof sessionId === "string" ? sessions.get(sessionId) : undefined;

      if (existing) {
        existing.lastSeen = Date.now();
        await existing.transport.handleRequest(req, res);
        return;
      }

      if (req.method !== "POST") {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "no session; initialize with a POST first" },
            id: null,
          }),
        );
        return;
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, { transport, lastSeen: Date.now() });
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };

      const server = createErabiMcpServer({ ...options, keyDir: null });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
      }
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: "internal error" },
          id: null,
        }),
      );
    }
  };
}
