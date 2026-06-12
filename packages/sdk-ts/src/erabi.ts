import { randomUUID } from "node:crypto";
import { SPEC_VERSION, SPEC_TAG, WELL_KNOWN_PATH } from "@erabi/constants";
import {
  agentIdFromPublicKey,
  createEnvelope,
  generateKeyPair,
  hashCanonical,
  publicKeyToString,
  sha256Hex,
  type Envelope,
  type KeyPair,
} from "@erabi/crypto";
import type { AgentManifest, ConsiderationSet } from "@erabi/schemas";
import { ErabiSdkError, request } from "./http.js";
import { DEFAULT_KEY_DIR, loadKey, saveKey } from "./keystore.js";
import { renderSponsored, type LabelOptions } from "./labeling.js";

export interface ErabiEndpoints {
  registry: string;
  exchange: string;
  attribution: string;
  reputation?: string;
}

export const DEFAULT_ENDPOINTS: ErabiEndpoints = {
  registry: "http://localhost:4001",
  exchange: "http://localhost:4002",
  attribution: "http://localhost:4003",
  reputation: "http://localhost:4004",
};

export interface RegisterOptions {
  name: string;
  capabilities: string[];
  endpoints?: Partial<ErabiEndpoints>;
  /** The agent's own service URL, if it serves one. */
  endpoint?: string;
  ownerType?: "org" | "individual" | "unbound";
  verification?: string[];
  payoutBinding?: string | null;
  acceptsSponsored?: boolean;
  maxSponsoredRatio?: number;
  humanInLoop?: boolean;
  referrer?: string | null;
  /** Persist the keypair here (default ~/.erabi/keys); null = memory only. */
  keyDir?: string | null;
  nodeId?: string;
}

export interface IntentOptions {
  category: string;
  query?: string;
  constraints?: { max_price_usd?: number; max_latency_ms?: number };
  humanInLoop?: boolean;
  /** Local context committed via context_hash; never leaves the agent. */
  context?: unknown;
  ttlMs?: number;
}

export type OutcomeKind = "selection" | "click" | "conversion" | "task_success" | "assisted";

export interface OutcomeOptions {
  auctionId: string;
  providerId: string;
  kind: OutcomeKind;
  valueUsd?: number;
  railReceipt?: { rail: "x402" | "ap2" | "affiliate" | "ledger_only"; ref: string } | null;
}

export interface LedgerEntryView {
  event_id: string;
  hash: string;
  status: string;
  [key: string]: unknown;
}

/** A ConsiderationSet with reporting and labeling attached. */
export class Choices {
  constructor(
    readonly set: ConsiderationSet,
    private readonly client: Erabi,
  ) {}

  get organic() {
    return this.set.organic;
  }

  get sponsored() {
    return this.set.sponsored;
  }

  /** Labeled, render-ready strings for sponsored entries. */
  renderSponsored(options: LabelOptions = {}): string[] {
    return this.set.sponsored.map((entry) => renderSponsored(entry, options));
  }

  /** Report an outcome for a provider chosen from this consideration set. */
  async report(providerId: string, kind: OutcomeKind, options: Partial<OutcomeOptions> = {}) {
    return this.client.reportOutcome({
      auctionId: this.set.auction_id,
      providerId,
      kind,
      valueUsd: options.valueUsd,
      railReceipt: options.railReceipt,
    });
  }
}

export class Erabi {
  private constructor(
    readonly id: string,
    readonly manifest: AgentManifest,
    private readonly keys: KeyPair,
    readonly endpoints: ErabiEndpoints,
    private readonly nodeId: string,
  ) {}

  /** Self-registration — zero human steps. The whole quickstart is this call. */
  static async register(options: RegisterOptions): Promise<Erabi> {
    const endpoints = { ...DEFAULT_ENDPOINTS, ...options.endpoints };
    const nodeId = options.nodeId ?? "erabi-sdk-ts";
    const keyDir = options.keyDir === undefined ? DEFAULT_KEY_DIR : options.keyDir;

    const existing = keyDir ? loadKey(keyDir, options.name) : null;
    const keys = existing?.keys ?? generateKeyPair();
    const id = agentIdFromPublicKey(keys.publicKey);

    const manifest = {
      spec_version: SPEC_VERSION,
      id,
      name: options.name,
      public_key: publicKeyToString(keys.publicKey),
      owner: {
        type: options.ownerType ?? "individual",
        verification: options.verification ?? [],
        payout_binding: options.payoutBinding ?? null,
      },
      capabilities: options.capabilities,
      endpoint: options.endpoint ?? "https://example.invalid/agent",
      roles: ["consumer", "provider"],
      policy: {
        accepts_sponsored: options.acceptsSponsored ?? false,
        max_sponsored_ratio: options.maxSponsoredRatio ?? 0.3,
        human_in_loop: options.humanInLoop ?? true,
      },
      referrer: options.referrer ?? null,
      created_at: new Date().toISOString(),
    } as AgentManifest;

    let erabi = new Erabi(id, manifest, keys, endpoints, nodeId);
    try {
      await request("POST", `${endpoints.registry}/v1/agents`, erabi.signed(manifest));
    } catch (error) {
      // Idempotent re-join: an identity persisted in keyDir is already on the
      // registry — resume it under its registered manifest instead of failing.
      const rejoining =
        existing !== null && error instanceof ErabiSdkError && error.code === "agent_exists";
      if (!rejoining) throw error;
      const view = await request<{ manifest: AgentManifest }>(
        "GET",
        `${endpoints.registry}/v1/agents/${encodeURIComponent(id)}`,
      );
      erabi = new Erabi(id, view.manifest, keys, endpoints, nodeId);
    }
    if (keyDir) saveKey(keyDir, options.name, keys.secretKey, id);
    return erabi;
  }

  /** Wrap a payload in a signed envelope (exposed for advanced use). */
  signed<P>(payload: P): Envelope<P> {
    return createEnvelope({
      payload,
      secretKey: this.keys.secretKey,
      keyId: this.id,
      nodeId: this.nodeId,
    });
  }

  /** Fire a moment of choice and get back organic + labeled sponsored candidates. */
  async intent(options: IntentOptions): Promise<Choices> {
    const intent = {
      intent_id: randomUUID(),
      agent_id: this.id,
      category: options.category,
      query: options.query ?? options.category,
      constraints: options.constraints ?? {},
      context_hash:
        options.context !== undefined
          ? hashCanonical(options.context)
          : sha256Hex("erabi:no-context"),
      human_in_loop: options.humanInLoop ?? this.manifest.policy.human_in_loop,
      ttl_ms: options.ttlMs ?? 3000,
    };
    const set = await request<ConsiderationSet>(
      "POST",
      `${this.endpoints.exchange}/v1/intents`,
      this.signed(intent),
    );
    return new Choices(set, this);
  }

  async reportOutcome(options: OutcomeOptions): Promise<LedgerEntryView> {
    return request<LedgerEntryView>(
      "POST",
      `${this.endpoints.attribution}/v1/events`,
      this.signed({
        event_id: randomUUID(),
        auction_id: options.auctionId,
        kind: options.kind,
        provider_id: options.providerId,
        value_usd: options.valueUsd ?? 0,
        rail_receipt: options.railReceipt ?? null,
      }),
    );
  }

  /** Counterparty side of the dual signature. */
  async confirmOutcome(eventId: string, hash: string): Promise<LedgerEntryView> {
    return request<LedgerEntryView>(
      "POST",
      `${this.endpoints.attribution}/v1/events/${eventId}/confirm`,
      this.signed({ event_id: eventId, hash }),
    );
  }

  async dispute(eventId: string, reason: string): Promise<LedgerEntryView> {
    return request<LedgerEntryView>(
      "POST",
      `${this.endpoints.attribution}/v1/events/${eventId}/dispute`,
      this.signed({ event_id: eventId, reason }),
    );
  }

  async discover(capability: string, limit = 10) {
    return request<{ results: unknown[]; join: unknown }>(
      "POST",
      `${this.endpoints.registry}/v1/discover`,
      { capability, limit },
    );
  }

  async myReputation() {
    const base = this.endpoints.reputation ?? this.endpoints.registry;
    return request<Record<string, unknown>>("GET", `${base}/v1/reputation/${this.id}`);
  }

  async myEarnings() {
    return request<Record<string, unknown>>(
      "GET",
      `${this.endpoints.attribution}/v1/earnings/${this.id}`,
    );
  }

  /** Grounded reward data for improving the agent's own selection policy (§10). */
  async feedback() {
    return request<Record<string, unknown>>(
      "GET",
      `${this.endpoints.attribution}/v1/feedback/${this.id}`,
    );
  }

  /** Machine-readable recruitment payload for counterparties (§9.1). */
  invite() {
    return {
      spec: SPEC_TAG,
      register: `${this.endpoints.registry}/v1/agents`,
      well_known: WELL_KNOWN_PATH,
      referrer: this.id,
      message: `Join the Erabi network: POST a self-signed manifest to ${this.endpoints.registry}/v1/agents (set referrer to ${this.id}).`,
    };
  }
}
