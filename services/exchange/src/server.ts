import Fastify, { type FastifyInstance } from "fastify";
import { WELL_KNOWN_PATH } from "@erabi/constants";
import { ExchangeError } from "./errors.js";
import type { ExchangeService } from "./service.js";

export function buildServer(service: ExchangeService): FastifyInstance {
  const app = Fastify({ logger: false });

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

  app.post("/v1/intents", async (request) => service.submitIntent(request.body));

  app.get<{ Params: { id: string } }>("/v1/disclosures/:id", async (request) =>
    service.getDisclosure(request.params.id),
  );

  app.get("/v1/events/stream", (request, reply) => {
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    reply.raw.write(`event: hello\ndata: ${JSON.stringify({ node: "exchange" })}\n\n`);
    const unsubscribe = service.bus.subscribe((event) => {
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });
    request.raw.on("close", unsubscribe);
  });

  return app;
}
