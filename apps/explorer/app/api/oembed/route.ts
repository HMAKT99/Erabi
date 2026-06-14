import { EXPLORER_URL } from "../../../lib/api";

/**
 * oEmbed provider: platforms that support oEmbed can unfurl an ERABI agent
 * link into the live trust card.
 *   GET /api/oembed?url=https://erabi-explorer.vercel.app/agents/<id>
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url") ?? "";
  const match = target.match(/\/agents\/([^/?#]+)/);
  if (!match) {
    return new Response(JSON.stringify({ error: "url must be an ERABI agent page" }), {
      status: 404,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  }

  const enc = encodeURIComponent(decodeURIComponent(match[1]));
  const width = 360;
  const height = 96;
  const embedUrl = `${EXPLORER_URL}/embed/${enc}`;
  const html = `<iframe src="${embedUrl}" width="${width}" height="${height}" style="border:0" title="ERABI verified trust" loading="lazy"></iframe>`;

  return new Response(
    JSON.stringify({
      version: "1.0",
      type: "rich",
      provider_name: "ERABI",
      provider_url: EXPLORER_URL,
      title: "ERABI verified trust",
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
