import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  AGENT_ID_PREFIX,
  isValidCategory,
  SPEC_TAG,
  WELL_KNOWN_PATH,
  PROTOCOL_NAME,
} from "@erabi/constants";
import {
  DISCOVERY_FRESHNESS_HALF_LIFE_DAYS,
  FLEET_MAX_MEMBERS,
  TIER_POLICIES,
  type Tier,
} from "@erabi/config";
import {
  InMemoryNonceStore,
  publicKeyFromString,
  verifyEnvelope,
  type Envelope,
  type NonceStore,
} from "@erabi/crypto";
import { agentManifestZod, envelopeZod, type AgentManifest } from "@erabi/schemas";
import { agentIdFromPublicKey } from "@erabi/crypto";
import { agentCapabilities, agents, keyHistory } from "./db/schema.js";
import type { RegistryDb } from "./db/client.js";
import { RegistryError } from "./errors.js";
import type { VerifierSet } from "./verifiers.js";

const PUBLIC_KEY_PATTERN = /^ed25519:[1-9A-HJ-NP-Za-km-z]{32,50}$/;

const verifyRequestZod = z.object({ method: z.string().min(1).max(256) }).strict();
const rotateKeyZod = z.object({ new_public_key: z.string().regex(PUBLIC_KEY_PATTERN) }).strict();
const fleetRequestZod = z.object({ members: z.array(z.unknown()).min(1) }).strict();
export const discoverRequestZod = z
  .object({
    capability: z.string().min(1).max(128),
    limit: z.number().int().min(1).max(50).default(10),
  })
  .strict();

export interface AgentView {
  manifest: AgentManifest;
  tier: Tier;
  reputation: number;
  key_seq: number;
  created_at: string;
  updated_at: string;
}

export interface DiscoverResult {
  provider_id: string;
  name: string;
  tier: Tier;
  reputation: number;
  score: number;
  reason: string;
  evidence_url: string;
}

export interface RegistryServiceOptions {
  db: RegistryDb;
  verifiers: VerifierSet;
  nodeId: string;
  baseUrl: string;
  nonceStore?: NonceStore;
  now?: () => number;
}

export class RegistryService {
  private readonly db: RegistryDb;
  private readonly verifiers: VerifierSet;
  private readonly nonceStore: NonceStore;
  private readonly nodeId: string;
  private readonly baseUrl: string;
  private readonly now: () => number;

  constructor(options: RegistryServiceOptions) {
    this.db = options.db;
    this.verifiers = options.verifiers;
    this.nonceStore = options.nonceStore ?? new InMemoryNonceStore();
    this.nodeId = options.nodeId;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.now = options.now ?? Date.now;
  }

  // ---- envelope plumbing ----

  private parseEnvelope(body: unknown): Envelope {
    const parsed = envelopeZod.safeParse(body);
    if (!parsed.success) {
      throw new RegistryError(
        "invalid_envelope",
        "body is not a valid signed envelope",
        parsed.error.issues,
      );
    }
    return parsed.data as Envelope;
  }

  private async checkSignature(envelope: Envelope, publicKey: string): Promise<void> {
    const result = await verifyEnvelope(envelope, publicKeyFromString(publicKey), {
      nowMs: this.now(),
      nonceStore: this.nonceStore,
    });
    if (!result.ok) {
      const reason = result.reason ?? "bad_signature";
      if (reason === "clock_skew")
        throw new RegistryError("clock_skew", "envelope ts outside ±120s window");
      if (reason === "nonce_replayed")
        throw new RegistryError("nonce_replayed", "nonce already seen");
      throw new RegistryError("bad_signature", "envelope signature does not verify");
    }
  }

  // ---- registration ----

  /**
   * Signed self-registration — zero human steps. The envelope must be
   * self-signed by the key in the manifest, proving key possession.
   */
  async registerAgent(body: unknown, internal: { tier?: Tier } = {}): Promise<AgentView> {
    const envelope = this.parseEnvelope(body);
    const manifest = this.parseManifest(envelope.payload);

    const derivedId = agentIdFromPublicKey(publicKeyFromString(manifest.public_key));
    if (manifest.id !== derivedId) {
      throw new RegistryError("id_mismatch", "manifest id is not derived from public_key");
    }
    if (envelope.key_id !== manifest.id) {
      throw new RegistryError("id_mismatch", "envelope key_id does not match manifest id");
    }
    await this.checkSignature(envelope, manifest.public_key);

    if (manifest.referrer && !this.findAgentRow(manifest.referrer)) {
      throw new RegistryError("invalid_request", `referrer ${manifest.referrer} is not registered`);
    }
    if (this.findAgentRow(manifest.id)) {
      throw new RegistryError("agent_exists", `agent ${manifest.id} is already registered`);
    }

    const nowIso = new Date(this.now()).toISOString();
    const tier: Tier = internal.tier ?? "unverified";
    this.insertAgent(manifest, tier, nowIso);
    return this.getAgent(manifest.id);
  }

  private parseManifest(payload: unknown): AgentManifest {
    const parsed = agentManifestZod.safeParse(payload);
    if (!parsed.success) {
      throw new RegistryError(
        "invalid_manifest",
        "payload is not a valid agent manifest",
        parsed.error.issues,
      );
    }
    const manifest = parsed.data as AgentManifest;
    for (const capability of manifest.capabilities) {
      if (!isValidCategory(capability)) {
        throw new RegistryError(
          "unknown_capability",
          `capability ${capability} is not in the spec ${SPEC_TAG} taxonomy`,
        );
      }
    }
    return manifest;
  }

  private insertAgent(manifest: AgentManifest, tier: Tier, nowIso: string): void {
    this.db.transaction((tx) => {
      tx.insert(agents)
        .values({
          id: manifest.id,
          name: manifest.name,
          publicKey: manifest.public_key,
          tier,
          manifest,
          referrer: manifest.referrer,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .run();
      for (const capability of manifest.capabilities) {
        tx.insert(agentCapabilities).values({ agentId: manifest.id, capability }).run();
      }
      tx.insert(keyHistory)
        .values({
          agentId: manifest.id,
          seq: 1,
          publicKey: manifest.public_key,
          startedAt: nowIso,
          rotationSig: null,
        })
        .run();
    });
  }

  // ---- reads ----

  private findAgentRow(id: string) {
    return this.db.select().from(agents).where(eq(agents.id, id)).get();
  }

  private toView(row: NonNullable<ReturnType<RegistryService["findAgentRow"]>>): AgentView {
    const seqRow = this.db
      .select()
      .from(keyHistory)
      .where(eq(keyHistory.agentId, row.id))
      .orderBy(desc(keyHistory.seq))
      .get();
    return {
      manifest: row.manifest as AgentManifest,
      tier: row.tier as Tier,
      reputation: row.reputation,
      key_seq: seqRow?.seq ?? 1,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  getAgent(id: string): AgentView {
    const row = this.findAgentRow(id);
    if (!row) throw new RegistryError("agent_not_found", `no agent ${id}`);
    return this.toView(row);
  }

  listAgents(filter: { capability?: string } = {}): AgentView[] {
    if (filter.capability) {
      const rows = this.db
        .select({ agent: agents })
        .from(agents)
        .innerJoin(agentCapabilities, eq(agentCapabilities.agentId, agents.id))
        .where(eq(agentCapabilities.capability, filter.capability))
        .all();
      return rows.map((r) => this.toView(r.agent));
    }
    return this.db
      .select()
      .from(agents)
      .all()
      .map((row) => this.toView(row));
  }

  getKeyHistory(id: string) {
    this.getAgent(id);
    return this.db
      .select()
      .from(keyHistory)
      .where(eq(keyHistory.agentId, id))
      .orderBy(keyHistory.seq)
      .all()
      .map((row) => ({
        seq: row.seq,
        public_key: row.publicKey,
        started_at: row.startedAt,
        rotation_sig: row.rotationSig,
      }));
  }

  // ---- owner verification (tier upgrade) ----

  async verifyAgent(id: string, body: unknown): Promise<AgentView> {
    const row = this.findAgentRow(id);
    if (!row) throw new RegistryError("agent_not_found", `no agent ${id}`);

    const envelope = this.parseEnvelope(body);
    if (envelope.key_id !== id) {
      throw new RegistryError("id_mismatch", "envelope key_id does not match agent id");
    }
    await this.checkSignature(envelope, row.publicKey);

    const parsed = verifyRequestZod.safeParse(envelope.payload);
    if (!parsed.success) {
      throw new RegistryError("invalid_request", "payload must be { method }", parsed.error.issues);
    }
    const method = parsed.data.method;
    const manifest = row.manifest as AgentManifest;
    if (!manifest.owner.verification.includes(method)) {
      throw new RegistryError(
        "invalid_request",
        `method ${method} is not declared in owner.verification`,
      );
    }

    const sep = method.indexOf(":");
    const scheme = sep === -1 ? method : method.slice(0, sep);
    const target = sep === -1 ? "" : method.slice(sep + 1);
    const verifier = this.verifiers.get(scheme);
    if (!verifier) {
      throw new RegistryError("unsupported_verifier", `no verifier for scheme "${scheme}"`);
    }
    if (!(await verifier.verify(target, id))) {
      throw new RegistryError("verification_failed", `proof not found for ${method}`);
    }

    if (row.tier === "unverified") {
      this.db
        .update(agents)
        .set({ tier: "verified", updatedAt: new Date(this.now()).toISOString() })
        .where(eq(agents.id, id))
        .run();
    }
    return this.getAgent(id);
  }

  // ---- key rotation ----

  /** Rotation is signed by the OLD (current) key; history chain retained. */
  async rotateKey(id: string, body: unknown): Promise<AgentView> {
    const row = this.findAgentRow(id);
    if (!row) throw new RegistryError("agent_not_found", `no agent ${id}`);

    const envelope = this.parseEnvelope(body);
    if (envelope.key_id !== id) {
      throw new RegistryError("id_mismatch", "envelope key_id does not match agent id");
    }
    await this.checkSignature(envelope, row.publicKey);

    const parsed = rotateKeyZod.safeParse(envelope.payload);
    if (!parsed.success) {
      throw new RegistryError(
        "invalid_request",
        "payload must be { new_public_key }",
        parsed.error.issues,
      );
    }
    const newKey = parsed.data.new_public_key;
    if (newKey === row.publicKey) {
      throw new RegistryError("invalid_request", "new_public_key equals the current key");
    }
    publicKeyFromString(newKey); // throws on malformed encodings

    const nowIso = new Date(this.now()).toISOString();
    const lastSeq = this.getKeyHistory(id).at(-1)?.seq ?? 1;
    this.db.transaction((tx) => {
      tx.insert(keyHistory)
        .values({
          agentId: id,
          seq: lastSeq + 1,
          publicKey: newKey,
          startedAt: nowIso,
          rotationSig: envelope.sig,
        })
        .run();
      tx.update(agents)
        .set({ publicKey: newKey, updatedAt: nowIso })
        .where(eq(agents.id, id))
        .run();
    });
    return this.getAgent(id);
  }

  // ---- fleet registration ----

  /**
   * A verified org bulk-registers N agents, each with its own self-signed
   * manifest, inheriting the org's tier. All-or-nothing.
   */
  async registerFleet(body: unknown): Promise<AgentView[]> {
    const envelope = this.parseEnvelope(body);
    const orgRow = this.findAgentRow(envelope.key_id);
    if (!orgRow)
      throw new RegistryError("agent_not_found", `org agent ${envelope.key_id} is not registered`);
    if (orgRow.tier !== "verified" && orgRow.tier !== "staked") {
      throw new RegistryError("tier_required", "fleet registration requires a verified org agent");
    }
    await this.checkSignature(envelope, orgRow.publicKey);

    const parsed = fleetRequestZod.safeParse(envelope.payload);
    if (!parsed.success) {
      throw new RegistryError(
        "invalid_request",
        "payload must be { members: Envelope<AgentManifest>[] }",
        parsed.error.issues,
      );
    }
    if (parsed.data.members.length > FLEET_MAX_MEMBERS) {
      throw new RegistryError("fleet_too_large", `fleet exceeds ${FLEET_MAX_MEMBERS} members`);
    }

    // Validate every member fully before inserting any (all-or-nothing).
    const orgTier = orgRow.tier as Tier;
    const validated: AgentManifest[] = [];
    for (const member of parsed.data.members) {
      const memberEnvelope = this.parseEnvelope(member);
      const manifest = this.parseManifest(memberEnvelope.payload);
      const derivedId = agentIdFromPublicKey(publicKeyFromString(manifest.public_key));
      if (manifest.id !== derivedId || memberEnvelope.key_id !== manifest.id) {
        throw new RegistryError("id_mismatch", `member ${manifest.id}: id/key mismatch`);
      }
      await this.checkSignature(memberEnvelope, manifest.public_key);
      if (this.findAgentRow(manifest.id)) {
        throw new RegistryError("agent_exists", `member ${manifest.id} is already registered`);
      }
      // Orchestrators recruit their sub-agents: default referrer to the org.
      validated.push({ ...manifest, referrer: manifest.referrer ?? orgRow.id });
    }
    const ids = new Set(validated.map((m) => m.id));
    if (ids.size !== validated.length) {
      throw new RegistryError("invalid_request", "fleet contains duplicate member ids");
    }

    const nowIso = new Date(this.now()).toISOString();
    this.db.transaction(() => {
      for (const manifest of validated) this.insertAgent(manifest, orgTier, nowIso);
    });
    return validated.map((m) => this.getAgent(m.id));
  }

  // ---- discovery (organic; valuable with zero exchange involvement) ----

  discover(request: unknown): { results: DiscoverResult[]; join: Record<string, string> } {
    const parsed = discoverRequestZod.safeParse(request);
    if (!parsed.success) {
      throw new RegistryError(
        "invalid_request",
        "body must be { capability, limit? }",
        parsed.error.issues,
      );
    }
    const { capability, limit } = parsed.data;

    const nowMs = this.now();
    const results = this.listAgents({ capability })
      .map((view) => {
        const ageDays = Math.max(0, (nowMs - Date.parse(view.updated_at)) / 86_400_000);
        const freshness = Math.pow(0.5, ageDays / DISCOVERY_FRESHNESS_HALF_LIFE_DAYS);
        const capabilityMatch = 1; // exact category match (the only mode in 0.1)
        const score = capabilityMatch * (view.reputation / 100) * freshness;
        return {
          provider_id: view.manifest.id,
          name: view.manifest.name,
          tier: view.tier,
          reputation: view.reputation,
          score: Number(score.toFixed(6)),
          reason: "capability_match",
          evidence_url: `${this.baseUrl}/v1/reputation/${view.manifest.id}`,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { results, join: this.joinBlock() };
  }

  /** TEST/OPS ONLY until the reputation service lands: set a score directly. */
  setReputation(id: string, score: number): void {
    const tier = this.getAgent(id).tier;
    const ceiling = TIER_POLICIES[tier].reputationCeiling;
    this.db
      .update(agents)
      .set({ reputation: Math.max(0, Math.min(score, ceiling)) })
      .where(eq(agents.id, id))
      .run();
  }

  // ---- machine-readable front door ----

  joinBlock(): Record<string, string> {
    return {
      spec: SPEC_TAG,
      register: `${this.baseUrl}/v1/agents`,
      well_known: WELL_KNOWN_PATH,
    };
  }

  wellKnown(): Record<string, unknown> {
    return {
      spec: SPEC_TAG,
      name: PROTOCOL_NAME,
      node_id: this.nodeId,
      agent_id_prefix: AGENT_ID_PREFIX,
      endpoints: {
        register: `${this.baseUrl}/v1/agents`,
        discover: `${this.baseUrl}/v1/discover`,
        fleets: `${this.baseUrl}/v1/fleets`,
        agent: `${this.baseUrl}/v1/agents/:id`,
      },
      join: this.joinBlock(),
    };
  }
}
