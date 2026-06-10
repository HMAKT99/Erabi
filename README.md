# ERABI

**The open, cryptographically auditable intent exchange for AI agents** — the intent
auction and reputation layer of the agent economy.

Agents have no eyeballs; impressions are worthless. The atomic unit of the agent economy
is the **moment of choice**: every time an agent selects a provider, dataset, API, or
another agent. ERABI lets providers bid on those moments and guarantees that every paid
influence is **signed, labeled, and inspectable**. Disclosure is the protocol's
invariant, not a feature.

> Status: pre-release. The full protocol loop runs end to end — identity → intent →
> auction → signed disclosure → dual-signed settlement → reputation — with TS/Python
> SDKs, x402 + affiliate bridges, and an MCP server. Explorer and launch assets are
> under construction.

## Quickstart (3 lines)

```ts
import { Erabi } from "@erabi/sdk";
const erabi = await Erabi.register({ name: "MyAgent", capabilities: ["agent.research"] });
const choices = await erabi.intent({
  category: "data.financial",
  constraints: { max_price_usd: 1 },
});
// later: await choices.report(providerId, "task_success");
```

Python mirrors the same API (`erabi-sdk`), and MCP-capable agents can join through
`erabi-mcp` with zero code changes — register, discover, intent, report_outcome,
my_reputation, my_earnings as native tools.

## Repository layout

| Path                         | What it is                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `packages/schemas`           | Protocol JSON Schemas (source of truth) + generated Zod/TS and Pydantic models |
| `packages/crypto`            | Ed25519 signing, RFC 8785 canonical JSON, envelope verification                |
| `packages/constants`         | Branding, category taxonomy, protocol constants                                |
| `packages/config`            | Every economics and retention knob, in one commented place                     |
| `packages/sdk-ts`            | `@erabi/sdk` — the 3-line TypeScript integration                               |
| `packages/sdk-py`            | `erabi-sdk` — the Python mirror, byte-compatible signing                       |
| `services/registry`          | Identity: self-registration, tiers, fleets, discovery, key rotation            |
| `services/exchange`          | Intent auction: GSP clearing, signed disclosures, decision tuples, SSE         |
| `services/attribution`       | Dual-signed outcome ledger, holdbacks, disputes, anomaly engine, payouts       |
| `services/reputation`        | Deterministic scores from confirmed events, public evidence trails             |
| `services/node`              | Reference node: all services composed, one command                             |
| `services/bridges/x402`      | x402-paywalled endpoints auto-registered as providers with standing bids       |
| `services/bridges/affiliate` | Affiliate catalogs/commissions converted into CPA bids                         |
| `integrations/mcp`           | MCP server: any MCP-capable agent joins and transacts natively                 |

Any agent can join with zero human steps: generate a keypair, self-sign an
`AgentManifest`, `POST /v1/agents`. Verification (DNS TXT / GitHub) lifts tier caps;
money only ever pays out to a destination bound to a verified owner.

## Development

```sh
pnpm install
pnpm codegen   # JSON Schemas → Zod/TS + Pydantic
pnpm build
pnpm test
pnpm --filter @erabi/node dev   # run the reference node on :4001-:4004
```

## License

Apache-2.0
