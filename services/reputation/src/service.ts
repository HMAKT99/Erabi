import type { Tier } from "@erabi/config";
import type { AgentDirectory } from "@erabi/exchange";
import type { EvidenceEvent, ReputationResult, TrustModel } from "./model.js";
import { RuleTrustModel } from "./model.js";

/** Where evidence comes from — the attribution ledger. */
export interface LedgerSource {
  evidenceFor(agentId: string): EvidenceEvent[];
}

/** Where computed scores go — the registry (which enforces tier ceilings). */
export interface ScoreSink {
  setReputation(agentId: string, score: number): void;
}

export interface ReputationServiceOptions {
  ledger: LedgerSource;
  directory: AgentDirectory;
  sink?: ScoreSink;
  model?: TrustModel;
  now?: () => number;
}

export interface ReputationView extends ReputationResult {
  agent_id: string;
  tier: Tier;
  computed_at: string;
}

export class ReputationService {
  private readonly ledger: LedgerSource;
  private readonly directory: AgentDirectory;
  private readonly sink?: ScoreSink;
  private readonly model: TrustModel;
  private readonly now: () => number;

  constructor(options: ReputationServiceOptions) {
    this.ledger = options.ledger;
    this.directory = options.directory;
    this.sink = options.sink;
    this.model = options.model ?? new RuleTrustModel();
    this.now = options.now ?? Date.now;
  }

  /**
   * Score + full evidence trail. Independently recomputable: the same
   * evidence and tier always produce the same score — don't trust the
   * number, verify the events.
   */
  getReputation(agentId: string): ReputationView {
    const agent = this.directory.getAgent(agentId);
    const tier: Tier = agent?.tier ?? "unverified";
    const evidence = this.ledger.evidenceFor(agentId);
    const result = this.model.compute(evidence, tier, this.now());
    this.sink?.setReputation(agentId, result.score);
    return {
      agent_id: agentId,
      tier,
      computed_at: new Date(this.now()).toISOString(),
      ...result,
    };
  }
}
