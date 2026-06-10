import Fastify, { type FastifyInstance } from "fastify";
import { RATE_LIMITS } from "@erabi/config";
import { envelopeKey, TokenBucketLimiter } from "@erabi/ratelimit";
import { AttributionError } from "./errors.js";
import type { AttributionService } from "./service.js";

export interface ServerOptions {
  logger?: boolean;
  bodyLimit?: number;
}

export function buildServer(
  service: AttributionService,
  options: ServerOptions = {},
): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: options.bodyLimit ?? 262_144,
  });
  const eventLimiter = new TokenBucketLimiter({ limit: RATE_LIMITS.eventsPerMinute });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AttributionError) {
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

  // The explorer reads these APIs from the browser.
  app.addHook("onSend", (_request, reply, payload, done) => {
    reply.header("access-control-allow-origin", "*");
    done(null, payload);
  });

  app.get("/healthz", async () => ({ ok: true }));

  app.get("/v1/stats/earnings", async () => service.earningsBeacon());

  app.get<{ Params: { agentId: string } }>("/v1/badge/:agentId.svg", async (request, reply) => {
    reply.header("content-type", "image/svg+xml");
    reply.header("cache-control", "max-age=300");
    return service.badgeSvg(request.params.agentId);
  });

  app.post("/v1/events", async (request, reply) => {
    const decision = eventLimiter.check(envelopeKey(request.body, request.ip));
    if (!decision.allowed) {
      return reply
        .status(429)
        .header("retry-after", Math.ceil(decision.retryAfterMs / 1000))
        .send({ error: { code: "rate_limited", message: "event rate limit exceeded" } });
    }
    const entry = await service.submitEvent(request.body);
    return reply.status(201).send(entry);
  });

  app.post<{ Params: { id: string } }>("/v1/events/:id/confirm", async (request) =>
    service.confirmEvent(request.params.id, request.body),
  );

  app.post<{ Params: { id: string } }>("/v1/events/:id/dispute", async (request) =>
    service.disputeEvent(request.params.id, request.body),
  );

  app.get<{ Params: { id: string } }>("/v1/events/:id", async (request) =>
    service.getEvent(request.params.id),
  );

  /** Ops endpoint; production runs this on a timer. */
  app.post("/v1/holdbacks/process", async () => ({ confirmed: service.processHoldbacks() }));

  app.get<{ Params: { agentId: string } }>("/v1/ledger/:agentId", async (request) => ({
    agent_id: request.params.agentId,
    chain_valid: service.verifyChain(request.params.agentId),
    events: service.getLedger(request.params.agentId),
  }));

  app.get<{ Params: { agentId: string } }>("/v1/earnings/:agentId", async (request) =>
    service.getEarnings(request.params.agentId),
  );

  app.get<{ Params: { agentId: string } }>("/v1/feedback/:agentId", async (request) =>
    service.getFeedback(request.params.agentId),
  );

  app.post("/v1/payouts", async (request, reply) => {
    const result = await service.requestPayout(request.body);
    return reply.status(201).send(result);
  });

  return app;
}
