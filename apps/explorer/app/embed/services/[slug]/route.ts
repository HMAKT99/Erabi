import { ENDPOINTS, EXPLORER_URL } from "../../../../lib/api";

/**
 * Chrome-free, iframe-able reliability card for an x402 service (ADR 0026).
 * Operators embed their live, node-measured uptime anywhere:
 *   <iframe src="https://erabi-explorer.vercel.app/embed/services/<slug>" ...>
 * Sibling of /embed/[id] (the agent trust card) — same contract.
 */
function esc(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  let name = slug;
  let uptime: number | null = null;
  let latency: number | null = null;
  let price: number | null = null;
  try {
    const res = await fetch(`${ENDPOINTS.index}/v1/services/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const view = (await res.json()) as {
        title?: string | null;
        uptime_24h_pct?: number | null;
        latency_ms_p50_24h?: number | null;
        price_usd?: number | null;
      };
      name = view.title ?? name;
      uptime = view.uptime_24h_pct ?? null;
      latency = view.latency_ms_p50_24h ?? null;
      price = view.price_usd ?? null;
    }
  } catch {
    // index unreachable → graceful placeholder card rather than an error
  }

  const dot =
    uptime === null ? "#56685e" : uptime >= 99 ? "#4ade80" : uptime >= 95 ? "#fbbf24" : "#f87171";
  const permalink = `${EXPLORER_URL}/services/${encodeURIComponent(slug)}`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)} — reliability, probed by ERABI</title>
<style>
  *{margin:0;box-sizing:border-box}
  html,body{height:100%}
  body{font-family:ui-monospace,Menlo,monospace;background:#0a0d0c}
  a.card{display:flex;flex-direction:column;justify-content:center;gap:6px;height:100%;min-height:88px;
    padding:14px 16px;border:1px solid #23332a;border-radius:8px;background:#0a0d0c;color:#d7e4dc;text-decoration:none}
  a.card:hover{border-color:#4ade80}
  .top{display:flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.04em;color:#56685e;text-transform:uppercase}
  .dot{width:7px;height:7px;border-radius:50%;background:${dot}}
  .name{font-size:16px;color:#e6efe9;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .row{display:flex;align-items:baseline;gap:12px}
  .big{font-size:20px;color:#4ade80;font-weight:700}
  .lbl{font-size:11px;color:#6b7d72}
</style></head>
<body>
  <a class="card" href="${permalink}" target="_blank" rel="noopener">
    <span class="top"><span class="dot"></span>probed by erabi</span>
    <span class="name">${esc(name)}</span>
    <span class="row">
      <span><span class="big">${uptime === null ? "—" : `${uptime}%`}</span> <span class="lbl">uptime 24h</span></span>
      <span><span class="big">${latency === null ? "—" : latency}</span> <span class="lbl">ms p50</span></span>
      <span><span class="big">${price === null ? "—" : `$${price}`}</span> <span class="lbl">/call</span></span>
    </span>
  </a>
</body></html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
      // public widget: allow embedding on any site
      "content-security-policy": "frame-ancestors *",
    },
  });
}
