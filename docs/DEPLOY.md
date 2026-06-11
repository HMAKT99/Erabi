# Deploying an Erabi node

Two supported shapes:

- **Railway/Render (single port)** — the node starts a built-in gateway on `$PORT`
  that routes to the four services by `/registry|/exchange|/attribution|/reputation`
  path prefix (or by subdomain when you attach custom domains). Easiest start.
- **VPS + Docker Compose (subdomains)** — Caddy terminates TLS on
  `registry.*, exchange.*, attribution.*, reputation.*`. See below.

## Railway (quickest path)

1. railway.app → New Project → **Deploy from GitHub repo** → `HMAKT99/Erabi`
   (`railway.json` selects the Dockerfile build and `/healthz` healthcheck).
2. Service → **Variables**:
   - `NODE_ENV=production`
   - `ERABI_DATA_DIR=/data`
   - `ERABI_NODE_SEED=<openssl rand -hex 32>` ← back this up; it is the signing key
   - `ERABI_PUBLIC_BASE_URL=https://<your-service>.up.railway.app` (set after step 4)
   - optional: `ERABI_GITHUB_TOKEN`
3. Service → **Volume** → mount at `/data`.
4. Service → Settings → **Networking → Generate Domain** (gives the public URL;
   put it into `ERABI_PUBLIC_BASE_URL` and redeploy).
5. Verify: `curl https://<url>/registry/.well-known/erabi.json` — the advertised
   endpoints must be public `https://…/registry/...` URLs, not localhost.

The service URLs to give SDKs / the explorer are then:

```
registry     https://<url>/registry
exchange     https://<url>/exchange
attribution  https://<url>/attribution
reputation   https://<url>/reputation
```

With your own domain later: attach `registry.<domain>` etc. as custom domains on the
same Railway service, set `ERABI_DOMAIN=<domain>` (instead of the base URL), and the
gateway routes by subdomain.

## What you need

- A Linux host with Docker + Compose
- A domain with DNS control; create A/AAAA records for:
  `@`, `explorer`, `registry`, `exchange`, `attribution`, `reputation` → your host
- 32 bytes of entropy for the node signing key (optional but recommended):
  `openssl rand -hex 32`

## Bring it up

```sh
export ERABI_DOMAIN=example.com
export ERABI_NODE_ID=erabi-node-1
export ERABI_NODE_SEED=$(openssl rand -hex 32)   # KEEP THIS SECRET AND BACKED UP
docker compose up -d --build
```

Caddy provisions TLS automatically. Verify the front door:

```sh
curl https://registry.$ERABI_DOMAIN/.well-known/erabi.json
```

## The node signing key — treat it like a private key, because it is one

Every `DisclosureRecord` and `ConsiderationSet` the exchange issues is signed with
this key, and verifiers fetch the public half from the well-known document. If the
key is lost, previously issued disclosures still verify (the records embed nothing
secret) but the node's continuity breaks; if it leaks, disclosures can be forged.

- Precedence: `ERABI_NODE_SEED` env → `$ERABI_DATA_DIR/node-key.json` (created on
  first boot, mode 0600) → ephemeral (dev only; the node warns loudly).
- Back up either the seed or the key file alongside the data volume.

## State, durability, and backups

Everything lives in the `erabi-data` volume:

| File                 | Contents                                           |
| -------------------- | -------------------------------------------------- |
| `registry.sqlite`    | identities, tiers, key history                     |
| `exchange.sqlite`    | bids, disclosures, decision tuples                 |
| `attribution.sqlite` | the hash-chained ledger, rev-share, payouts        |
| `nonces.sqlite`      | replay protection (survives restarts by design)    |
| `node-key.json`      | the node signing seed (unless ERABI_NODE_SEED set) |

SQLite runs in WAL mode. For continuous off-host backup, run
[Litestream](https://litestream.io) against the four databases, or snapshot the
volume on a schedule. The ledger is append-only and hash-chained — a restored backup
is independently verifiable via `GET /v1/ledger/:agent_id` (`chain_valid`).

Single-node SQLite is the supported reference deployment (see DECISIONS 0018); the
Postgres port is the designated scaling path once write volume demands it.

## Hardening defaults already on

- Real DNS TXT / GitHub gist owner verification (`NODE_ENV=production`); set
  `ERABI_GITHUB_TOKEN` to raise GitHub API rate limits.
- Per-identity token-bucket rate limits (registrations per IP, intents and events
  per agent) → HTTP 429 with `retry-after`.
- 256 KB request body limit; 500-subscriber SSE cap; intent TTL enforcement;
  ±120s envelope skew window; durable nonce replay protection.

## Multi-node / scaling notes

- Replay protection across multiple node replicas needs a shared store: construct
  the services with `RedisNonceStore` (any client exposing `SET key val PX ttl NX`,
  e.g. ioredis) instead of the SQLite store.
- Rate limiting is per-process; behind a load balancer, either pin by client or
  swap the limiter for a shared-store implementation behind the same interface.
- The x402 payout rail needs a facilitator: construct `X402Rail(facilitatorUrl)`
  with your provider's settle endpoint and API key.
