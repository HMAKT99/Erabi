import type { Tier } from "@erabi/config";
import type { AgentManifest } from "@erabi/schemas";
import { RegistryError, type RegistryService } from "@erabi/registry";

/** What the exchange needs to know about agents; the registry provides it. */
export interface DirectoryAgent {
  manifest: AgentManifest;
  /** Current signing key (rotation-aware). */
  publicKey: string;
  tier: Tier;
  reputation: number;
}

export interface OrganicCandidate {
  provider_id: string;
  reputation: number;
  evidence_url: string;
  reason: string;
}

export interface AgentDirectory {
  getAgent(id: string): DirectoryAgent | null;
  discover(capability: string, limit: number): OrganicCandidate[];
}

/** In-process adapter for the reference node (registry + exchange co-deployed). */
export function registryDirectory(registry: RegistryService): AgentDirectory {
  return {
    getAgent(id) {
      try {
        const view = registry.getAgent(id);
        return {
          manifest: view.manifest,
          publicKey: view.public_key,
          tier: view.tier,
          reputation: view.reputation,
        };
      } catch (error) {
        if (error instanceof RegistryError && error.code === "agent_not_found") return null;
        throw error;
      }
    },
    discover(capability, limit) {
      return registry.discover({ capability, limit }).results.map((result) => ({
        provider_id: result.provider_id,
        reputation: result.reputation,
        evidence_url: result.evidence_url,
        reason: result.reason,
      }));
    },
  };
}
