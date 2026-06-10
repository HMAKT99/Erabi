import {
  agentIdFromPublicKey,
  createEnvelope,
  generateKeyPair,
  publicKeyToString,
  type Envelope,
  type KeyPair,
} from "@erabi/crypto";
import type { AgentManifest } from "@erabi/schemas";

export interface TestAgent {
  keys: KeyPair;
  id: string;
  manifest: AgentManifest;
  envelope: Envelope<AgentManifest>;
}

/** Build a fully self-signed registration envelope — the SDK's job later. */
export function makeAgent(
  name: string,
  capabilities: string[],
  options: {
    referrer?: string | null;
    verification?: string[];
    ownerType?: "org" | "individual" | "unbound";
  } = {},
): TestAgent {
  const keys = generateKeyPair();
  const id = agentIdFromPublicKey(keys.publicKey);
  const manifest = {
    spec_version: "0.1",
    id,
    name,
    public_key: publicKeyToString(keys.publicKey),
    owner: {
      type: options.ownerType ?? "individual",
      verification: options.verification ?? [],
      payout_binding: null,
    },
    capabilities,
    endpoint: "https://agents.example.com/endpoint",
    roles: ["consumer", "provider"],
    policy: { accepts_sponsored: false, max_sponsored_ratio: 0.3, human_in_loop: true },
    referrer: options.referrer ?? null,
    created_at: new Date().toISOString(),
  } as AgentManifest;

  const envelope = createEnvelope({
    payload: manifest,
    secretKey: keys.secretKey,
    keyId: id,
    nodeId: "test-client",
  });
  return { keys, id, manifest, envelope };
}

export function signedRequest(agent: { keys: KeyPair; id: string }, payload: unknown): Envelope {
  return createEnvelope({
    payload,
    secretKey: agent.keys.secretKey,
    keyId: agent.id,
    nodeId: "test-client",
  });
}
