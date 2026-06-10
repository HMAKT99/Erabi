import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateKeyPair, publicKeyToString } from "@erabi/crypto";
import { createDb } from "../src/db/client.js";
import { buildServer } from "../src/server.js";
import { RegistryService } from "../src/service.js";
import { MockDnsVerifier, MockGithubVerifier, verificationToken } from "../src/verifiers.js";
import { makeAgent, signedRequest } from "./helpers.js";

const BASE_URL = "http://registry.test";

let app: FastifyInstance;
let service: RegistryService;
let dns: MockDnsVerifier;

beforeEach(() => {
  dns = new MockDnsVerifier();
  const github = new MockGithubVerifier();
  service = new RegistryService({
    db: createDb(),
    verifiers: new Map([
      ["dns", dns],
      ["github", github],
    ]),
    nodeId: "erabi-node-test",
    baseUrl: BASE_URL,
  });
  app = buildServer(service);
});

afterEach(async () => {
  await app.close();
});

async function register(agent = makeAgent("Agent", ["agent.research"])) {
  const response = await app.inject({ method: "POST", url: "/v1/agents", payload: agent.envelope });
  return { agent, response };
}

async function makeVerifiedOrg(name = "OrgAgent") {
  const org = makeAgent(name, ["agent.research"], {
    ownerType: "org",
    verification: ["dns:orgcorp.example"],
  });
  await register(org);
  dns.setTxtRecords("orgcorp.example", [verificationToken(org.id)]);
  const response = await app.inject({
    method: "POST",
    url: `/v1/agents/${org.id}/verify`,
    payload: signedRequest(org, { method: "dns:orgcorp.example" }),
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().tier).toBe("verified");
  return org;
}

describe("well-known front door", () => {
  it("serves a machine-readable join document", async () => {
    const response = await app.inject({ method: "GET", url: "/.well-known/erabi.json" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.spec).toBe("erabi/0.1");
    expect(body.join.register).toBe(`${BASE_URL}/v1/agents`);
    expect(body.endpoints.discover).toBe(`${BASE_URL}/v1/discover`);
  });
});

describe("self-registration (zero human steps)", () => {
  it("registers an agent from a single signed envelope", async () => {
    const { agent, response } = await register();
    expect(response.statusCode).toBe(201);
    const view = response.json();
    expect(view.tier).toBe("unverified");
    expect(view.reputation).toBe(50);
    expect(view.key_seq).toBe(1);
    expect(view.manifest.id).toBe(agent.id);

    const fetched = await app.inject({ method: "GET", url: `/v1/agents/${agent.id}` });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().manifest).toEqual(agent.manifest);

    const listed = await app.inject({ method: "GET", url: "/v1/agents?capability=agent.research" });
    expect(listed.json().agents.map((a: { manifest: { id: string } }) => a.manifest.id)).toContain(
      agent.id,
    );
  });

  it("rejects tampered signatures", async () => {
    const agent = makeAgent("Tampered", ["agent.research"]);
    const tampered = {
      ...agent.envelope,
      payload: { ...agent.envelope.payload, name: "Altered" },
    };
    const response = await app.inject({ method: "POST", url: "/v1/agents", payload: tampered });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("bad_signature");
  });

  it("rejects replayed envelopes (nonce reuse)", async () => {
    const { agent, response } = await register();
    expect(response.statusCode).toBe(201);
    const replay = await app.inject({ method: "POST", url: "/v1/agents", payload: agent.envelope });
    expect(replay.statusCode).toBe(401);
    expect(replay.json().error.code).toBe("nonce_replayed");
  });

  it("rejects ids not derived from the public key", async () => {
    const honest = makeAgent("Honest", ["agent.research"]);
    const imposter = makeAgent("Imposter", ["agent.research"]);
    // Imposter tries to claim honest's id with its own key.
    const manifest = { ...imposter.manifest, id: honest.id };
    const envelope = signedRequest({ keys: imposter.keys, id: honest.id }, manifest);
    const response = await app.inject({ method: "POST", url: "/v1/agents", payload: envelope });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("id_mismatch");
  });

  it("rejects capabilities outside the launch taxonomy", async () => {
    const agent = makeAgent("OffTaxonomy", ["agent.timetravel"]);
    const response = await app.inject({
      method: "POST",
      url: "/v1/agents",
      payload: agent.envelope,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("unknown_capability");
  });

  it("rejects unknown manifest fields (strict boundary)", async () => {
    const agent = makeAgent("Sneaky", ["agent.research"]);
    const manifest = { ...agent.manifest, evil_extra_field: true };
    const envelope = signedRequest(agent, manifest);
    const response = await app.inject({ method: "POST", url: "/v1/agents", payload: envelope });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("invalid_manifest");
  });

  it("rejects duplicate registration", async () => {
    const { agent } = await register();
    const fresh = signedRequest(agent, agent.manifest);
    const response = await app.inject({ method: "POST", url: "/v1/agents", payload: fresh });
    expect(response.statusCode).toBe(409);
  });

  it("rejects unregistered referrers", async () => {
    const ghost = makeAgent("Ghost", ["agent.research"]);
    const agent = makeAgent("Referred", ["agent.research"], { referrer: ghost.id });
    const response = await app.inject({
      method: "POST",
      url: "/v1/agents",
      payload: agent.envelope,
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("owner verification (tier upgrade)", () => {
  it("upgrades to verified via mock DNS TXT record", async () => {
    await makeVerifiedOrg();
  });

  it("fails closed when the proof is missing", async () => {
    const agent = makeAgent("NoProof", ["agent.research"], {
      verification: ["dns:noproof.example"],
    });
    await register(agent);
    const response = await app.inject({
      method: "POST",
      url: `/v1/agents/${agent.id}/verify`,
      payload: signedRequest(agent, { method: "dns:noproof.example" }),
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe("verification_failed");
  });

  it("rejects methods not declared in the manifest", async () => {
    const agent = makeAgent("Undeclared", ["agent.research"]);
    await register(agent);
    dns.setTxtRecords("other.example", [verificationToken(agent.id)]);
    const response = await app.inject({
      method: "POST",
      url: `/v1/agents/${agent.id}/verify`,
      payload: signedRequest(agent, { method: "dns:other.example" }),
    });
    expect(response.statusCode).toBe(400);
  });
});

describe("fleet registration", () => {
  it("bulk-registers a 5-agent fleet inheriting the org tier", async () => {
    const org = await makeVerifiedOrg();
    const members = Array.from({ length: 5 }, (_, i) =>
      makeAgent(`FleetAgent${i}`, ["agent.coding"]),
    );
    const response = await app.inject({
      method: "POST",
      url: "/v1/fleets",
      payload: signedRequest(org, { members: members.map((m) => m.envelope) }),
    });
    expect(response.statusCode).toBe(201);
    const registered = response.json().agents;
    expect(registered).toHaveLength(5);
    for (const view of registered) {
      expect(view.tier).toBe("verified");
      expect(view.manifest.referrer).toBe(org.id);
    }
  });

  it("requires a verified org agent", async () => {
    const { agent: unverifiedOrg } = await register(makeAgent("Unverified", ["agent.research"]));
    const member = makeAgent("Member", ["agent.coding"]);
    const response = await app.inject({
      method: "POST",
      url: "/v1/fleets",
      payload: signedRequest(unverifiedOrg, { members: [member.envelope] }),
    });
    expect(response.statusCode).toBe(403);
  });

  it("is all-or-nothing: one bad member rejects the whole fleet", async () => {
    const org = await makeVerifiedOrg();
    const good = makeAgent("Good", ["agent.coding"]);
    const bad = makeAgent("Bad", ["agent.coding"]);
    const badEnvelope = { ...bad.envelope, payload: { ...bad.manifest, name: "Altered" } };
    const response = await app.inject({
      method: "POST",
      url: "/v1/fleets",
      payload: signedRequest(org, { members: [good.envelope, badEnvelope] }),
    });
    expect(response.statusCode).toBe(401);
    const lookup = await app.inject({ method: "GET", url: `/v1/agents/${good.id}` });
    expect(lookup.statusCode).toBe(404);
  });
});

describe("discovery", () => {
  it("ranks by reputation × freshness within a capability", async () => {
    const low = makeAgent("LowRep", ["agent.research"]);
    const mid = makeAgent("MidRep", ["agent.research"]);
    const high = makeAgent("HighRep", ["agent.research"]);
    const other = makeAgent("OtherCapability", ["data.financial"]);
    for (const agent of [low, mid, high, other]) await register(agent);
    service.setReputation(low.id, 30);
    service.setReputation(mid.id, 50);
    service.setReputation(high.id, 65);

    const response = await app.inject({
      method: "POST",
      url: "/v1/discover",
      payload: { capability: "agent.research" },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.results.map((r: { provider_id: string }) => r.provider_id)).toEqual([
      high.id,
      mid.id,
      low.id,
    ]);
    expect(body.join.spec).toBe("erabi/0.1");

    const limited = await app.inject({
      method: "POST",
      url: "/v1/discover",
      payload: { capability: "agent.research", limit: 1 },
    });
    expect(limited.json().results).toHaveLength(1);
  });

  it("caps direct reputation writes at the tier ceiling", async () => {
    const { agent } = await register();
    service.setReputation(agent.id, 95);
    expect(service.getAgent(agent.id).reputation).toBe(70); // unverified ceiling
  });
});

describe("key rotation", () => {
  it("rotates keys, retains history, and invalidates the old key", async () => {
    const agent = makeAgent("Rotator", ["agent.research"], {
      verification: ["dns:rotator.example"],
    });
    await register(agent);
    const newKeys = generateKeyPair();

    const rotation = await app.inject({
      method: "POST",
      url: `/v1/agents/${agent.id}/rotate-key`,
      payload: signedRequest(agent, { new_public_key: publicKeyToString(newKeys.publicKey) }),
    });
    expect(rotation.statusCode).toBe(200);
    expect(rotation.json().key_seq).toBe(2);

    const keys = await app.inject({ method: "GET", url: `/v1/agents/${agent.id}/keys` });
    expect(keys.json().keys).toHaveLength(2);
    expect(keys.json().keys[1].rotation_sig).toBeTruthy();

    // Old key can no longer sign for this agent...
    dns.setTxtRecords("rotator.example", [verificationToken(agent.id)]);
    const withOldKey = await app.inject({
      method: "POST",
      url: `/v1/agents/${agent.id}/verify`,
      payload: signedRequest(agent, { method: "dns:rotator.example" }),
    });
    expect(withOldKey.statusCode).toBe(401);

    // ...but the new key can.
    const withNewKey = await app.inject({
      method: "POST",
      url: `/v1/agents/${agent.id}/verify`,
      payload: signedRequest({ keys: newKeys, id: agent.id }, { method: "dns:rotator.example" }),
    });
    expect(withNewKey.statusCode).toBe(200);
    expect(withNewKey.json().tier).toBe("verified");
  });

  it("rejects rotation signed by a foreign key", async () => {
    const { agent } = await register();
    const attacker = generateKeyPair();
    const response = await app.inject({
      method: "POST",
      url: `/v1/agents/${agent.id}/rotate-key`,
      payload: signedRequest(
        { keys: attacker, id: agent.id },
        { new_public_key: publicKeyToString(attacker.publicKey) },
      ),
    });
    expect(response.statusCode).toBe(401);
  });
});
