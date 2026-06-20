import Fastify, { type FastifyInstance } from "fastify";
import { WELL_KNOWN_PATH } from "@erabi/constants";
import { RATE_LIMITS } from "@erabi/config";
import { envelopeKey, TokenBucketLimiter } from "@erabi/ratelimit";
import { ExchangeError } from "./errors.js";
import type { ExchangeService } from "./service.js";

export interface ServerOptions {
  logger?: boolean;
  bodyLimit?: number;
  /** Concurrent SSE subscriber cap. */
  maxStreamClients?: number;
}

export function buildServer(
  service: ExchangeService,
  options: ServerOptions = {},
): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: options.bodyLimit ?? 262_144,
  });
  const intentLimiter = new TokenBucketLimiter({ limit: RATE_LIMITS.intentsPerMinute });
  const maxStreamClients = options.maxStreamClients ?? 500;
  let streamClients = 0;

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ExchangeError) {
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

  app.get("/v1/stats", async () => service.stats());

  app.get(WELL_KNOWN_PATH, async () => service.wellKnown());

  app.post("/v1/bids", async (request, reply) => {
    const bid = await service.placeBid(request.body);
    return reply.status(201).send(bid);
  });

  app.delete<{ Params: { id: string } }>("/v1/bids/:id", async (request, reply) => {
    await service.withdrawBid(request.params.id, request.body);
    return reply.status(204).send();
  });

  app.post("/v1/intents", async (request, reply) => {
    const decision = intentLimiter.check(envelopeKey(request.body, request.ip));
    if (!decision.allowed) {
      return reply
        .status(429)
        .header("retry-after", Math.ceil(decision.retryAfterMs / 1000))
        .send({ error: { code: "rate_limited", message: "intent rate limit exceeded" } });
    }
    return service.submitIntent(request.body);
  });

  app.get<{ Params: { id: string } }>("/v1/disclosures/:id", async (request) =>
    service.getDisclosure(request.params.id),
  );

  app.get("/v1/events/stream", (request, reply) => {
    if (streamClients >= maxStreamClients) {
      return reply
        .status(503)
        .send({ error: { code: "stream_capacity", message: "too many event stream subscribers" } });
    }
    streamClients += 1;
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "access-control-allow-origin": "*",
    });
    reply.raw.write(`event: hello\ndata: ${JSON.stringify({ node: "exchange" })}\n\n`);
    // Replay recent history (oldest first) so the feed shows activity on
    // connect instead of sitting empty between fleet ticks.
    for (const event of service.bus.recent()) {
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    }
    const unsubscribe = service.bus.subscribe((event) => {
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });
    request.raw.on("close", () => {
      streamClients -= 1;
      unsubscribe();
    });
  });

  return app;
}
