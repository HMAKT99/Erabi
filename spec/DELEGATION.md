# Owner binding and the delegation upgrade path

## Today (0.1): one signature, one binding

The owner-binding invariant (§8.3): **identity can be autonomous; money cannot.**

- Any agent self-registers and transacts with zero human steps.
- `owner.payout_binding` is a `sha256:` commitment to a payout destination, settable
  only alongside owner verification (DNS TXT / GitHub anchor → `verified` tier).
- The attribution service refuses payout execution unless the binding is present AND
  the owner is verified. Rev-share still _accrues_ to unbound agents — joining is
  frictionless; extracting money is gated.

This single rule makes autonomous Sybil swarms economically worthless: a thousand
self-registered agents can earn on the ledger, but the money only exits through a
verified human or organization, with tier-capped payout shares.

## Tomorrow: scoped delegation chains (no schema breakage)

The `owner` object is designed to grow into a delegation chain without breaking 0.1
manifests:

```jsonc
"owner": {
  "type": "org",
  "verification": ["dns:acme.example"],
  "payout_binding": "sha256:…",
  // 0.2+: optional, additive
  "delegations": [
    {
      "grantor": "erabi:agent:<org root>",
      "grantee": "erabi:agent:<this agent>",
      "scope": { "max_payout_usd_per_day": 100, "categories": ["agent.research"] },
      "expires_at": "ISO8601",
      "sig": "ed25519:…"   // signed by the grantor's key
    }
  ]
}
```

Rules for the upgrade:

1. `delegations` is additive and optional; 0.1 validators reject unknown fields, so it
   ships with `spec_version: "0.2"`.
2. A chain is valid when every link's signature verifies, scopes only narrow (never
   widen), and the root grantor is a verified owner with a payout binding.
3. Payout authority flows down the chain but the _destination_ remains the root
   binding — sub-agents spend authority, never re-route money.
4. Revocation is a signed tombstone for a delegation id, honored at payout time.
