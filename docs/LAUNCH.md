# Launch checklist

Everything code-side is ready; each unchecked item below is blocked only on an
account, credential, or naming decision.

## 0. Already executed

- [x] **v0.1.0 tagged and released**: https://github.com/HMAKT99/Erabi/releases/tag/v0.1.0
- [x] Repo description + topics set (discoverability on GitHub search).
- [x] npm publish validated: all 7 public packages pack cleanly (`pnpm publish --dry-run`).
- [x] PyPI distribution validated: `erabi_sdk-0.1.0` wheel + sdist build, and the wheel
      installs and signs correctly from a clean environment.

## 1. Identity decisions (you)

- [ ] **GitHub home**: keep `HMAKT99/Erabi` or create the `erabi-protocol` org and
      transfer (repo links in package metadata/READMEs update with one search-replace).
- [ ] **Domain**: register one (e.g. `erabi.dev` / `erabi.network`). DNS A records for
      `@, explorer, registry, exchange, attribution, reputation`.
- [ ] **npm scope**: claim the `@erabi` org on npmjs.com; create an automation token.
- [ ] **PyPI**: register the `erabi-sdk` project name; create an API token.

- [x] Docker image build + boot verified: `erabi-node` (374 MB) builds, all four
      services answer `/healthz`, the persistent key loads from the volume, real
      verifiers activate under `NODE_ENV=production`, and with `ERABI_DOMAIN` set the
      well-known documents advertise the public `https://<svc>.<domain>` URLs.

## 2. Hosted node (docs/DEPLOY.md)

- [ ] Linux host with Docker; `export ERABI_DOMAIN=… ERABI_NODE_SEED=$(openssl rand -hex 32)`
- [ ] `docker compose up -d --build`
- [ ] Verify `https://registry.$DOMAIN/.well-known/erabi.json` and the explorer.
- [ ] Back up the node seed + data volume (Litestream or snapshots).
- [ ] Optional: set `ERABI_GITHUB_TOKEN` (higher GitHub verification rate limits),
      and an x402 facilitator URL/key when chosen.

## 3. Package releases

- [ ] Add `NPM_TOKEN` and `PYPI_TOKEN` repository secrets.
- [ ] Run the **Release** workflow (Actions → Release → run). It builds, runs the full
      suite, then publishes `@erabi/{constants,crypto,schemas,config,ratelimit,sdk}` + `erabi-mcp`, and `erabi-sdk` to PyPI.
- [ ] Smoke-test from a clean machine: the README 3-line quickstart against the
      hosted node.

## 4. Distribution listings

- [ ] Submit `erabi-mcp` to the MCP registries (modelcontextprotocol/servers, Smithery,
      mcp.so) — manifest: `integrations/mcp`.
- [ ] Publish the A2A AgentCard at `https://$DOMAIN/.well-known/agent.json`
      (file: `integrations/a2a/agent-card.json`, update the `url`).

## 5. Launch motion

- [ ] **Show HN**: spec-led title ("Show HN: Erabi – an open, auditable intent
      exchange for AI agents"). Lead with MANIFESTO.md's argument; demo link = the
      live explorer; `pnpm demo` for the skeptics. Expect and welcome the
      "ads-in-agents is bad" thread — the manifesto IS the answer: it's coming
      either way; this version is signed, labeled, capped, opt-in, and inspectable.
- [ ] **Product Hunt**: explorer as the demo, first-cent screenshot as the gallery
      shot.
- [ ] README badges: add the live earnings badge of a real agent
      (`/v1/badge/:id.svg`) once the hosted node has settlements.

## Already true (verify before posting, never claim more)

- Full loop runs publicly: register → intent → labeled sponsored + organic →
  dual-signed outcomes → settlement → reputation.
- Every disclosure is fetchable and verifiable in-browser.
- The fraud engine freezes five distinct manipulation patterns in tests.
- Payouts are structurally impossible without a verified human owner.
