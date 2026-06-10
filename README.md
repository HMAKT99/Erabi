# ERABI

**The open, cryptographically auditable intent exchange for AI agents** — the intent
auction and reputation layer of the agent economy.

Agents have no eyeballs; impressions are worthless. The atomic unit of the agent economy
is the **moment of choice**: every time an agent selects a provider, dataset, API, or
another agent. ERABI lets providers bid on those moments and guarantees that every paid
influence is **signed, labeled, and inspectable**. Disclosure is the protocol's
invariant, not a feature.

> Status: pre-release. Phase 0 (protocol schemas, crypto, codegen) is in place; the
> registry, exchange, attribution, and reputation services are under construction.

## Repository layout

| Path                 | What it is                                                                     |
| -------------------- | ------------------------------------------------------------------------------ |
| `packages/schemas`   | Protocol JSON Schemas (source of truth) + generated Zod/TS and Pydantic models |
| `packages/crypto`    | Ed25519 signing, RFC 8785 canonical JSON, envelope verification                |
| `packages/constants` | Branding, category taxonomy, protocol constants                                |

## Development

```sh
pnpm install
pnpm codegen   # JSON Schemas → Zod/TS + Pydantic
pnpm build
pnpm test
```

## License

Apache-2.0
