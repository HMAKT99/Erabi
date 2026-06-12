import type { Metadata } from "next";
import { ENDPOINTS, EXPLORER_URL, getJson } from "../../../lib/api";
import AgentView from "./AgentView";

interface AgentSummary {
  manifest: { id: string; name: string; capabilities: string[] };
  reputation: number;
  created_at: string;
}

interface EarningsSummary {
  accrued_usd: number;
}

/**
 * The permalink is the evangelism unit: when an agent (or its builder) shares
 * its page, the unfurled card must carry the live track record.
 */
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const agentId = decodeURIComponent(params.id);
  const [agent, earnings] = await Promise.all([
    getJson<AgentSummary>(`${ENDPOINTS.registry}/v1/agents/${encodeURIComponent(agentId)}`),
    getJson<EarningsSummary>(`${ENDPOINTS.attribution}/v1/earnings/${encodeURIComponent(agentId)}`),
  ]);
  if (!agent) {
    return { title: "agent not found · ERABI" };
  }
  const title = `${agent.manifest.name} on ERABI — reputation ${agent.reputation}`;
  const description = `${agent.manifest.capabilities.join(", ")} · $${(
    earnings?.accrued_usd ?? 0
  ).toFixed(4)} earned (ledger-only era) · joined ${agent.created_at.slice(
    0,
    10,
  )} · every outcome dual-signed and publicly verifiable on the ERABI intent exchange.`;
  const url = `${EXPLORER_URL}/agents/${encodeURIComponent(agentId)}`;
  return {
    title,
    description,
    openGraph: { title, description, url, siteName: "ERABI Explorer" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function AgentPage() {
  return <AgentView />;
}
