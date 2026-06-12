/**
 * Curated x402-paywalled endpoints bridged as bridge-tier providers at boot.
 * Every entry is live-probed first — an endpoint that stops answering with a
 * valid x402 402 response simply doesn't activate, so a stale entry can never
 * advertise a dead or mispriced service. Override with ERABI_X402_ENDPOINTS
 * (JSON array of {url, category, title?, claim?}) or disable with "off".
 *
 * Curation rule: real, useful, pay-per-call services only — this list is what
 * makes `discover` worth calling for a visiting agent.
 */
export interface CuratedX402Endpoint {
  url: string;
  category: string;
  title?: string;
  claim?: string;
}

// Live-verified 2026-06-12 against the x402 Bazaar + ecosystem lists (ADR
// 0025); the probe-at-boot guarantee means listing here is necessary but not
// sufficient — only endpoints that answer 402 right now go live.
export const DEFAULT_X402_ENDPOINTS: CuratedX402Endpoint[] = [
  {
    url: "https://api.exa.ai/search",
    category: "api.search",
    title: "Exa Search",
    claim: "Neural + keyword web search API returning ranked results; pay-per-call via x402.",
  },
  {
    url: "https://blockrun.ai/api/v1/exa/answer",
    category: "agent.research",
    title: "BlockRun Grounded Answer",
    claim: "AI answer to any question grounded in live web search results (Exa-backed).",
  },
  {
    url: "https://minifetch.com/api/v1/x402/extract/url-content",
    category: "api.search",
    title: "MiniFetch URL Extract",
    claim: "Clean LLM-ready markdown extracted from any URL — nav, ads, and scripts stripped.",
  },
  {
    url: "https://x402.browserbase.com/browser/session/create",
    category: "api.search",
    title: "Browserbase Session",
    claim: "Prepaid headless-browser session for web automation; returns a WebSocket URL.",
  },
  {
    url: "https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools",
    category: "data.market",
    title: "CoinGecko Onchain Pool Search",
    claim: "Search onchain DEX pools and tokens by contract address, name, or symbol.",
  },
  {
    url: "https://api.nansen.ai/api/v1/smart-money/netflow",
    category: "data.market",
    title: "Nansen Smart Money Netflow",
    claim: "Aggregated token inflows/outflows of labeled smart-money wallets.",
  },
  {
    url: "https://api.anchor-x402.com/v1/price/token",
    category: "data.market",
    title: "Anchor Token Price",
    claim: "USD price for any major token by symbol or chain + contract.",
  },
  {
    url: "https://tick.hugen.tokyo/tick/latest",
    category: "data.financial",
    title: "Hugen FX Tick",
    claim: "Real-time best bid/ask for 14 FX pairs aggregated from institutional liquidity.",
  },
  {
    url: "https://api.stocktrends.com/v1/prices/latest",
    category: "data.financial",
    title: "Stock Trends Latest Price",
    claim: "Latest price row per symbol: adjusted close, weekly high/low, volume, change.",
  },
  {
    url: "https://x402.ottoai.services/crypto-news",
    category: "data.news",
    title: "Otto AI Crypto News",
    claim: "Real-time crypto market news with sentiment analysis, ranked by importance.",
  },
  {
    url: "https://x402.ottoai.services/token-security",
    category: "api.fraud-scoring",
    title: "Otto AI Token Security Scanner",
    claim: "Honeypot, rug-pull, and scam detection for any token contract across 7 chains.",
  },
  {
    url: "https://api.anchor-x402.com/v1/screen",
    category: "api.fraud-scoring",
    title: "Anchor Wallet Screening",
    claim: "Sanctions + AML screening for any wallet address.",
  },
  {
    url: "https://weather.payapi.market/current",
    category: "data.geo",
    title: "PayAPI Current Weather",
    claim: "Current conditions for any global location: temperature, humidity, precipitation.",
  },
  {
    url: "https://stabletravel.dev/api/google-flights/search",
    category: "commerce.travel",
    title: "StableTravel Flight Search",
    claim: "Google Flights search: best flights, price insights, and airport info per route.",
  },
  {
    url: "https://www.surplusintelligence.ai/x402/api/inference/v1/chat/completions",
    category: "compute.inference",
    title: "Surplus Intelligence Chat Completions",
    claim: "OpenAI-compatible LLM inference across many models at market prices.",
  },
  {
    url: "https://stableupload.dev/api/upload",
    category: "compute.storage",
    title: "StableUpload File Slot",
    claim: "Buy a file-upload slot; returns an upload URL — sibling endpoint serves static sites.",
  },
];

export function parseX402Endpoints(raw: string | undefined): CuratedX402Endpoint[] | "off" {
  if (raw === undefined || raw.trim() === "") return DEFAULT_X402_ENDPOINTS;
  if (raw.trim().toLowerCase() === "off") return "off";
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(
        (e): e is CuratedX402Endpoint =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as CuratedX402Endpoint).url === "string" &&
          typeof (e as CuratedX402Endpoint).category === "string",
      );
      if (valid.length === parsed.length) return valid;
    }
  } catch {
    // fall through
  }
  console.warn(`ERABI_X402_ENDPOINTS ignored (expected JSON array of {url, category} or "off")`);
  return DEFAULT_X402_ENDPOINTS;
}
