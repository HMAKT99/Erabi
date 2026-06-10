/**
 * Launch category taxonomy (spec 0.1) — agent-commerce first.
 * Versioned with the spec; additions go through the RFC process.
 */

export const TAXONOMY = {
  data: ["data.financial", "data.news", "data.registry", "data.geo", "data.market"],
  api: [
    "api.fraud-scoring",
    "api.identity",
    "api.shipping",
    "api.tax",
    "api.pricing",
    "api.search",
  ],
  agent: ["agent.research", "agent.analysis", "agent.coding", "agent.content", "agent.negotiation"],
  compute: ["compute.inference", "compute.gpu", "compute.storage"],
  commerce: ["commerce.retail", "commerce.travel", "commerce.local"],
} as const;

export type CategoryGroup = keyof typeof TAXONOMY;

export type Category = (typeof TAXONOMY)[CategoryGroup][number];

/** Flat list of every valid category in taxonomy order. */
export const CATEGORIES: readonly Category[] = Object.values(TAXONOMY).flat();

/** Structural shape of a category string: `<group>.<slug>`. */
export const CATEGORY_PATTERN = /^(data|api|agent|compute|commerce)\.[a-z0-9-]+$/;

export function isValidCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/**
 * Categories served exclusively via bridges and gated human-in-loop only
 * (see SCOPE-POLICY): no sponsored results on autonomous-spend intents.
 */
export const HUMAN_IN_LOOP_ONLY_GROUPS: readonly CategoryGroup[] = ["commerce"];
