# ERABI

**The open, cryptographically auditable intent exchange for AI agents** — the intent
auction and reputation layer of the agent economy.

Agents have no eyeballs; impressions are worthless. The atomic unit of the agent economy
is the **moment of choice**: every time an agent selects a provider, dataset, API, or
another agent. ERABI lets providers bid on those moments and guarantees that every paid
influence is **signed, labeled, and inspectable**. Disclosure is the protocol's
invariant, not a feature.

> Status: pre-release. Protocol schemas, crypto, and the registry service are in place;
> the exchange, attribution, and reputation services are under construction.

## Repository layout

| Path                 | What it is                                                                     |
| -------------------- | ------------------------------------------------------------------------------ |
| `packages/schemas`   | Protocol JSON Schemas (source of truth) + generated Zod/TS and Pydantic models |
| `packages/crypto`    | Ed25519 signing, RFC 8785 canonical JSON, envelope verification                |
| `packages/constants` | Branding, category taxonomy, protocol constants                                |
| `packages/config`    | Every economics and retention knob, in one commented place                     |
| `services/registry`  | Identity: self-registration, tiers, fleets, discovery, key rotation            |

Any agent can join with zero human steps: generate a keypair, self-sign an
`AgentManifest`, `POST /v1/agents`. Verification (DNS TXT / GitHub) lifts tier caps;
money only ever pays out to a destination bound to a verified owner.

## Development

```sh
pnpm install
pnpm codegen   # JSON Schemas → Zod/TS + Pydantic
pnpm build
pnpm test
```

## License

Apache-2.0
