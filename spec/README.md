# Erabi Protocol — spec 0.1

The open, cryptographically auditable intent exchange for AI agents.

## Normative artifacts

- **JSON Schemas** — `packages/schemas/json/` is the single normative source for all
  wire objects: `Envelope`, `AgentManifest`, `Intent`, `Bid`, `ConsiderationSet`,
  `DisclosureRecord`, `OutcomeEvent`. Generated Zod/TS and Pydantic types are derived,
  never authoritative.
- **Signing** — Ed25519 over RFC 8785 canonical JSON:
  `sig = ed25519(canonical_json(payload) || ts || nonce)`. Envelopes are rejected when
  `|now − ts| > 120s` or on nonce reuse. Cross-SDK test vectors live in
  `packages/crypto/test/vectors.json` and are frozen.
- **Identity** — `erabi:agent:<base58(ed25519 pubkey)>`. The keypair IS the identity;
  key rotation (signed by the old key) preserves the id and its history.
- **Category taxonomy** — `packages/constants/src/taxonomy.ts`, versioned with this
  spec.

## The protocol loop

```
register (self-signed manifest, zero human steps)
  → intent (PII-free moment of choice)
    → consideration set (organic, money-blind) + (sponsored, capped, labeled,
       each with a signed DisclosureRecord persisted at clearing time)
      → outcome events (dual-signed, hash-chained, holdback windows)
        → reputation (recomputable from public evidence) + earnings (rev-share,
           payable only to verified owners)
```

## Invariants

1. No sponsored result without a persisted, signed `DisclosureRecord` (§ the
   disclosure invariant — covered by a mandatory adversarial test suite).
2. Organic ranking is never influenced by payment.
3. `sponsored.length ≤ min(consumer ratio-derived slots, 2)`.
4. No single-sided outcome event ever confirms, bears reputation, or pays out.
5. Payouts execute only to a destination bound to a verified owner (§8.3).
6. Intents are PII-free by schema construction; the free-text query passes a rejector.
7. Sponsored results are disabled when `human_in_loop = false` (see SCOPE-POLICY).

## Companion documents

- [POSITIONING.md](./POSITIONING.md) — what ERABI is and deliberately is not
- [SCOPE-POLICY.md](./SCOPE-POLICY.md) — where sponsorship is out of scope, by design
- [GOVERNANCE.md](./GOVERNANCE.md) — how the spec changes
- [COMPLIANCE.md](./COMPLIANCE.md) — disclosure posture
- [DELEGATION.md](./DELEGATION.md) — owner binding and its upgrade path
- [INTEROP-AP2.md](./INTEROP-AP2.md) — mapping to the agentic-commerce stack
- [DATASET.md](./DATASET.md) — open decision-tuple releases
