import Fastify, { type FastifyInstance } from "fastify";
import type { ReputationService } from "./service.js";

export function buildServer(service: ReputationService): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/healthz", async () => ({ ok: true }));

  app.get<{ Params: { agentId: string } }>("/v1/reputation/:agentId", async (request) =>
    service.getReputation(request.params.agentId),
  );

  return app;
}
