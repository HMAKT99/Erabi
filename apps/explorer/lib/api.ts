export const ENDPOINTS = {
  registry: process.env.NEXT_PUBLIC_ERABI_REGISTRY_URL ?? "http://localhost:4001",
  exchange: process.env.NEXT_PUBLIC_ERABI_EXCHANGE_URL ?? "http://localhost:4002",
  attribution: process.env.NEXT_PUBLIC_ERABI_ATTRIBUTION_URL ?? "http://localhost:4003",
  reputation: process.env.NEXT_PUBLIC_ERABI_REPUTATION_URL ?? "http://localhost:4004",
  // Reliability index (ADR 0026). Derived from the registry URL in gateway
  // deployments (…/registry → …/index) so no extra env var is required;
  // override with NEXT_PUBLIC_ERABI_INDEX_URL when the layouts differ.
  index:
    process.env.NEXT_PUBLIC_ERABI_INDEX_URL ??
    ((process.env.NEXT_PUBLIC_ERABI_REGISTRY_URL ?? "").endsWith("/registry")
      ? (process.env.NEXT_PUBLIC_ERABI_REGISTRY_URL ?? "").replace(/\/registry$/, "/index")
      : "http://localhost:4005"),
};

/** Remote MCP front door: one URL, zero install (gateway mounts it at /mcp). */
export const REMOTE_MCP_URL = ENDPOINTS.registry.replace(/\/registry$/, "/mcp");

/** Public explorer base, for permalinks and share metadata. */
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_ERABI_EXPLORER_URL ?? "https://erabi-explorer.vercel.app";

export async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
