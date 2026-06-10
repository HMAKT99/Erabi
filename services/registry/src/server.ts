import Fastify, { type FastifyInstance } from "fastify";
import { WELL_KNOWN_PATH } from "@erabi/constants";
import { RegistryError } from "./errors.js";
import type { RegistryService } from "./service.js";

export function buildServer(service: RegistryService): FastifyInstance {
  const app = Fastify({ logger: false });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof RegistryError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
    }
    if ("statusCode" in error && typeof error.statusCode === "number" && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: { code: "invalid_request", message: error.message },
      });
    }
    app.log.error(error);
    return reply.status(500).send({ error: { code: "internal", message: "internal error" } });
  });

  app.get("/healthz", async () => ({ ok: true }));

  app.get(WELL_KNOWN_PATH, async () => service.wellKnown());

  app.post("/v1/agents", async (request, reply) => {
    const view = await service.registerAgent(request.body);
    return reply.status(201).send(view);
  });

  app.get<{ Params: { id: string } }>("/v1/agents/:id", async (request) =>
    service.getAgent(request.params.id),
  );

  app.get<{ Querystring: { capability?: string } }>("/v1/agents", async (request) => ({
    agents: service.listAgents({ capability: request.query.capability }),
  }));

  app.get<{ Params: { id: string } }>("/v1/agents/:id/keys", async (request) => ({
    keys: service.getKeyHistory(request.params.id),
  }));

  app.post<{ Params: { id: string } }>("/v1/agents/:id/verify", async (request) =>
    service.verifyAgent(request.params.id, request.body),
  );

  app.post<{ Params: { id: string } }>("/v1/agents/:id/rotate-key", async (request) =>
    service.rotateKey(request.params.id, request.body),
  );

  app.post("/v1/fleets", async (request, reply) => {
    const members = await service.registerFleet(request.body);
    return reply.status(201).send({ agents: members });
  });

  app.post("/v1/discover", async (request) => service.discover(request.body));

  return app;
}
