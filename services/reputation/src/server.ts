import Fastify, { type FastifyInstance } from "fastify";
import type { ReputationService } from "./service.js";

export interface ServerOptions {
  logger?: boolean;
  bodyLimit?: number;
}

export function buildServer(
  service: ReputationService,
  options: ServerOptions = {},
): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: options.bodyLimit ?? 262_144,
  });

  // The explorer reads this API from the browser.
  app.addHook("onSend", (_request, reply, payload, done) => {
    reply.header("access-control-allow-origin", "*");
    done(null, payload);
  });

  app.get("/healthz", async () => ({ ok: true }));

  app.get<{ Params: { agentId: string } }>("/v1/reputation/:agentId", async (request) =>
    service.getReputation(request.params.agentId),
  );

  return app;
}
