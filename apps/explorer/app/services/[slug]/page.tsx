import type { Metadata } from "next";
import { ENDPOINTS, getJson } from "../../../lib/api";
import ServiceView from "./ServiceView";

interface ServiceDetail {
  slug: string;
  title: string | null;
  category: string;
  uptime_24h_pct: number | null;
  latency_ms_p50_24h: number | null;
  price_usd: number | null;
}

/** The service page unfurl carries the live reliability numbers. */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const service = await getJson<ServiceDetail>(
    `${ENDPOINTS.index}/v1/services/${encodeURIComponent(params.slug)}`,
  );
  if (!service) {
    return { title: "service not found · ERABI" };
  }
  const name = service.title ?? service.slug;
  const title = `${name} — ${service.uptime_24h_pct ?? "—"}% uptime · ERABI reliability index`;
  const description = `${name} (${service.category}): ${service.uptime_24h_pct ?? "—"}% uptime, p50 ${
    service.latency_ms_p50_24h ?? "—"
  } ms, $${service.price_usd ?? "—"}/call — measured by continuous probes, published as signed, verifiable attestations.`;
  return {
    title,
    description,
    openGraph: { title, description, siteName: "ERABI Explorer" },
    twitter: { card: "summary", title, description },
  };
}

export default function ServicePage() {
  return <ServiceView />;
}
