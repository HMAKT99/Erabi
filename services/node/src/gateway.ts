import http from "node:http";

/**
 * Single-port gateway for hosts that expose one port per service (Railway,
 * Render, Heroku-likes). Routes to the four internal services by, in order:
 *
 *   1. Host subdomain:  registry.example.com → registry
 *   2. Path prefix:     /registry/v1/agents  → registry /v1/agents
 *   3. Default:         registry (so /healthz and platform checks work)
 *
 * Zero dependencies; SSE streams pipe straight through.
 */

const SERVICES = ["registry", "exchange", "attribution", "reputation"] as const;
export type GatewayService = (typeof SERVICES)[number];

export interface GatewayOptions {
  port: number;
  host?: string;
  /** Internal ports for each service. */
  targets: Record<GatewayService, number>;
  /** Where the internal services listen. Default 127.0.0.1. */
  targetHost?: string;
  /** Optional handler mounted at /mcp (remote MCP over streamable HTTP). */
  mcpHandler?: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
}

function resolveService(req: http.IncomingMessage): { service: GatewayService; path: string } {
  const url = req.url ?? "/";
  const hostLabel = (req.headers.host ?? "").split(":")[0]?.split(".")[0] ?? "";
  if ((SERVICES as readonly string[]).includes(hostLabel)) {
    return { service: hostLabel as GatewayService, path: url };
  }
  const prefix = url.split("/")[1] ?? "";
  if ((SERVICES as readonly string[]).includes(prefix)) {
    const stripped = url.slice(prefix.length + 1) || "/";
    return { service: prefix as GatewayService, path: stripped };
  }
  return { service: "registry", path: url };
}

export function startGateway(options: GatewayOptions): Promise<http.Server> {
  const targetHost = options.targetHost ?? "127.0.0.1";

  const server = http.createServer((req, res) => {
    const url = req.url ?? "/";
    if (options.mcpHandler && (url === "/mcp" || url.startsWith("/mcp?"))) {
      void options.mcpHandler(req, res);
      return;
    }
    const { service, path } = resolveService(req);
    const upstream = http.request(
      {
        host: targetHost,
        port: options.targets[service],
        path,
        method: req.method,
        headers: {
          ...req.headers,
          "x-forwarded-host": req.headers.host ?? "",
          "x-forwarded-proto": "https",
        },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      },
    );
    upstream.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(502, { "content-type": "application/json" });
      }
      res.end(
        JSON.stringify({ error: { code: "bad_gateway", message: `${service} unreachable` } }),
      );
    });
    req.pipe(upstream);
  });

  // SSE connections stay open; don't let the default timeout cut them.
  server.requestTimeout = 0;
  server.headersTimeout = 60_000;

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host ?? "0.0.0.0", () => resolve(server));
  });
}
