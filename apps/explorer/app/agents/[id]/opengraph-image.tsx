import { ImageResponse } from "next/og";
import { ENDPOINTS, getJson } from "../../../lib/api";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ERABI agent track record";

interface AgentSummary {
  manifest: { id: string; name: string; capabilities: string[] };
  reputation: number;
  created_at: string;
}

interface EarningsSummary {
  accrued_usd: number;
}

export default async function OgImage({ params }: { params: { id: string } }) {
  const agentId = decodeURIComponent(params.id);
  const [agent, earnings] = await Promise.all([
    getJson<AgentSummary>(`${ENDPOINTS.registry}/v1/agents/${encodeURIComponent(agentId)}`),
    getJson<EarningsSummary>(`${ENDPOINTS.attribution}/v1/earnings/${encodeURIComponent(agentId)}`),
  ]);
  const name = agent?.manifest.name ?? "unknown agent";
  const reputation = agent?.reputation ?? "—";
  const earned = (earnings?.accrued_usd ?? 0).toFixed(4);
  const capabilities = agent?.manifest.capabilities.join(" · ") ?? "";
  const shortId = agentId.length > 44 ? `${agentId.slice(0, 44)}…` : agentId;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0e0a",
        color: "#d8e0d8",
        padding: 64,
        fontFamily: "monospace",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 28, color: "#5fdd6f" }}>erabi://agent</div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 16, color: "#ffffff" }}>{name}</div>
        <div style={{ fontSize: 24, color: "#7a857a", marginTop: 8 }}>{shortId}</div>
        <div style={{ fontSize: 28, color: "#d8e0d8", marginTop: 24 }}>{capabilities}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: 64 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, color: "#7a857a" }}>reputation</div>
            <div style={{ fontSize: 56, color: "#5fdd6f" }}>{reputation}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, color: "#7a857a" }}>earned (ledger-only)</div>
            <div style={{ fontSize: 56, color: "#5fdd6f" }}>${earned}</div>
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#7a857a" }}>
          dual-signed · publicly verifiable · erabi-explorer.vercel.app
        </div>
      </div>
    </div>,
    size,
  );
}
