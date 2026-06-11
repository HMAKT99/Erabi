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

- [x] **GitHub home**: decided 2026-06-11 — stays on `HMAKT99/Erabi`. All public
      artifacts (package metadata, branding constants, AgentCard, landing) point there.
- [ ] **Domain**: register one (e.g. `erabi.dev` / `erabi.network`). DNS A records for
      `@, explorer, registry, exchange, attribution, reputation`.
- [x] **npm scope**: `@erabi` org claimed; granular token (All packages, Bypass 2FA)
      stored as the `NPM_TOKEN` repo secret.
- [x] **PyPI**: `erabi-sdk` registered; API token stored as `PYPI_TOKEN`.

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

- [x] Add `NPM_TOKEN` and `PYPI_TOKEN` repository secrets.
- [x] Release workflow run 2026-06-11: all 7 npm packages
      (`@erabi/{constants,crypto,schemas,config,ratelimit,sdk}` + `erabi-mcp`) and
      `erabi-sdk` on PyPI are live. The workflow is idempotent — reruns skip
      already-published versions.
- [x] Clean-room smoke test passed 2026-06-11: fresh `npm install @erabi/sdk`,
      `npx -y erabi-mcp` (6 tools over stdio), and `pip install erabi-sdk` each
      registered a live agent against the hosted node and verified public lookup.

## 4. Distribution listings

- [x] IDE-base integration content shipped: per-tool configs for Claude Code, Cursor,
      GitHub Copilot, OpenCode, OpenClaw, Windsurf, Cline, Zed
      (`integrations/ide/README.md` + the explorer `/integrations` page + homepage
      roster). NOTE: every `npx -y erabi-mcp` snippet goes live the moment npm publish
      happens (step 3) — that's the gate.
- [x] **Official MCP Registry** (registry.modelcontextprotocol.io): published
      2026-06-11 as `io.github.HMAKT99/erabi` v0.1.2 — namespace is case-sensitive
      and `mcpName` in the published npm package must match exactly. Republish on
      version bumps: `mcp-publisher login github && mcp-publisher publish` from
      `integrations/mcp` (tokens are short-lived; login right before publishing).
- [ ] **Smithery** (smithery.ai): `smithery.yaml` is at the repo root — sign in with
      GitHub on smithery.ai and add/claim the HMAKT99/Erabi repo (one click).
- [ ] **mcp.so**: submit via the site's form (browser; their submit page blocks
      non-browser clients). Listing data: npm `erabi-mcp`, repo
      https://github.com/HMAKT99/Erabi.
- [ ] IDE-community outreach (post-npm-publish): awesome-mcp-servers lists, ClawHub /
      OpenClaw skills, Cursor & OpenCode community forums — link the `/integrations`
      page, lead with the live network.
- [ ] CI/CD gating (one toggle each, your click): Railway → service → Settings →
      **Wait for CI** = ON; Vercel → project → Settings → Git → require checks.
      The `smoke.yml` workflow already verifies the live node + explorer after every
      push and daily.
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
