import { EXPLORER_URL } from "../../../lib/api";

/**
 * oEmbed provider: platforms that support oEmbed can unfurl an ERABI agent
 * link into the live trust card, or a service link into its reliability card.
 *   GET /api/oembed?url=https://erabi-explorer.vercel.app/agents/<id>
 *   GET /api/oembed?url=https://erabi-explorer.vercel.app/services/<slug>
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url") ?? "";
  const agentMatch = target.match(/\/agents\/([^/?#]+)/);
  const serviceMatch = target.match(/\/services\/([^/?#]+)/);
  if (!agentMatch && !serviceMatch) {
    return new Response(JSON.stringify({ error: "url must be an ERABI agent or service page" }), {
      status: 404,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }

  const width = 360;
  const height = 96;
  const embedUrl = agentMatch
    ? `${EXPLORER_URL}/embed/${encodeURIComponent(decodeURIComponent(agentMatch[1]))}`
    : `${EXPLORER_URL}/embed/services/${encodeURIComponent(decodeURIComponent(serviceMatch![1]))}`;
  const cardTitle = agentMatch ? "ERABI verified trust" : "Reliability, probed by ERABI";
  const html = `<iframe src="${embedUrl}" width="${width}" height="${height}" style="border:0" title="${cardTitle}" loading="lazy"></iframe>`;

  return new Response(
    JSON.stringify({
      version: "1.0",
      type: "rich",
      provider_name: "ERABI",
      provider_url: EXPLORER_URL,
      title: cardTitle,
      width,
      height,
      html,
    }),
    {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=300",
      },
    },
  );
}
