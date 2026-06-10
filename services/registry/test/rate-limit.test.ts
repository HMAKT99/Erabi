import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { RATE_LIMITS } from "@erabi/config";
import { createDb } from "../src/db/client.js";
import { buildServer } from "../src/server.js";
import { RegistryService } from "../src/service.js";
import { makeAgent } from "./helpers.js";

let app: FastifyInstance;

beforeEach(() => {
  app = buildServer(
    new RegistryService({
      db: createDb(),
      verifiers: new Map(),
      nodeId: "erabi-node-test",
      baseUrl: "http://registry.test",
    }),
  );
});

afterEach(async () => {
  await app.close();
});

describe("registration rate limiting", () => {
  it("returns 429 with retry-after once the per-IP budget is exhausted", async () => {
    // The bucket refills in real time, so under load a slow loop earns a
    // few extra tokens — send a comfortable margin past the budget and
    // assert the limiter kicked in near it.
    const attempts = RATE_LIMITS.registrationsPerMinutePerIp + 10;
    let successes = 0;
    let firstDenied: { statusCode: number; body: string; retryAfter: string | undefined } | null =
      null;
    for (let i = 0; i < attempts; i++) {
      const agent = makeAgent(`Burst${i}`, ["agent.research"]);
      const response = await app.inject({
        method: "POST",
        url: "/v1/agents",
        payload: agent.envelope,
      });
      if (response.statusCode === 201) successes += 1;
      else if (!firstDenied) {
        firstDenied = {
          statusCode: response.statusCode,
          body: response.body,
          retryAfter: response.headers["retry-after"] as string | undefined,
        };
      }
    }

    expect(successes).toBeGreaterThanOrEqual(RATE_LIMITS.registrationsPerMinutePerIp);
    expect(firstDenied).not.toBeNull();
    expect(firstDenied!.statusCode).toBe(429);
    expect(JSON.parse(firstDenied!.body).error.code).toBe("rate_limited");
    expect(Number(firstDenied!.retryAfter)).toBeGreaterThan(0);
  });
});
