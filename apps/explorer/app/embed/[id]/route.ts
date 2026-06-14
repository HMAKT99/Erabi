import { ENDPOINTS, EXPLORER_URL } from "../../../lib/api";

/**
 * Chrome-free, iframe-able "Verified by ERABI" trust card. Any site or agent
 * directory can embed an agent's live, verifiable trust:
 *   <iframe src="https://erabi-explorer.vercel.app/embed/<agent-id>" ...>
 * Served as a route handler (raw HTML) so it carries no site nav/footer.
 */
function esc(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const enc = encodeURIComponent(id);
  let name = id;
  let tier = "unverified";
  let score: number | string = "—";
  try {
    const res = await fetch(`${ENDPOINTS.registry}/v1/agents/${enc}`, { cache: "no-store" });
    if (res.ok) {
      const view = (await res.json()) as {
        manifest?: { name?: string };
        tier?: string;
        reputation?: number;
      };
      name = view.manifest?.name ?? name;
      tier = view.tier ?? tier;
      if (typeof view.reputation === "number") score = view.reputation;
    }
  } catch {
    // network down → render a graceful placeholder card rather than erroring
  }

  const permalink = `${EXPLORER_URL}/agents/${enc}`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)} — verified on ERABI</title>
<style>
  *{margin:0;box-sizing:border-box}
  html,body{height:100%}
  body{font-family:ui-monospace,Menlo,monospace;background:#0a0d0c}
  a.card{display:flex;flex-direction:column;justify-content:center;gap:6px;height:100%;min-height:88px;
    padding:14px 16px;border:1px solid #23332a;border-radius:8px;background:#0a0d0c;color:#d7e4dc;text-decoration:none}
  a.card:hover{border-color:#4ade80}
  .top{display:flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.04em;color:#56685e;text-transform:uppercase}
  .dot{width:7px;height:7px;border-radius:50%;background:#4ade80}
  .name{font-size:16px;color:#e6efe9;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .row{display:flex;align-items:baseline;gap:10px}
  .score{font-size:22px;color:#4ade80;font-weight:700}
  .lbl{font-size:11px;color:#6b7d72}
  .tier{font-size:11px;color:#9fb1a7;text-transform:uppercase;border:1px solid #23332a;border-radius:4px;padding:1px 6px}
</style></head>
<body>
  <a class="card" href="${permalink}" target="_blank" rel="noopener">
    <span class="top"><span class="dot"></span>verified by erabi</span>
    <span class="name">${esc(name)}</span>
    <span class="row">
      <span class="score">${typeof score === "number" ? score : esc(String(score))}</span>
      <span class="lbl">reputation</span>
      <span class="tier">${esc(tier)}</span>
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
