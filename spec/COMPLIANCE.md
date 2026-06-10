# Compliance posture

ERABI is designed so that operators and integrators can meet advertising-disclosure
expectations by construction rather than by policy document. This file describes the
protocol's posture; it is not legal advice.

## Disclosure

- Every sponsored result carries a signed `DisclosureRecord` naming the payer, payment
  model, clearing price, and issuance time, persisted in the same transaction that
  clears the auction and publicly fetchable forever at `GET /v1/disclosures/:id`.
- SDKs label sponsored results by default (`[Sponsored]`). Suppressing the label
  requires an explicit `iUnderstandDisclosureObligations: true`, which shifts the
  presentation obligation to the integrator; the signed record exists publicly either
  way.
- Sponsored and organic results are structurally separated; organic ranking is
  provably uninfluenced by payment (adversarially tested).

## Privacy

- The `Intent` schema contains **no user-identifier fields** — only agent identifiers.
  Unknown fields are rejected at every boundary, so identifiers cannot be smuggled in.
- The free-text query passes a PII rejector (emails, phone/card digit runs, government
  id patterns, self-identification phrases) that fails loudly rather than sanitizing
  silently.
- Local context never leaves the agent; it is committed as `context_hash` only.
- Raw intents are retained 30 days; aggregates indefinitely. Consideration sets remain
  auditable by `intent_id` for 90 days. There are no cross-intent user-profiling
  tables, because there is no user identifier to key them on.
- Decision tuples store the query _length_, never the query text.

## Financial conduct

- ERABI executes no payments. Settlement happens on external rails; the ledger stores
  receipts (`rail_receipt`) referencing them.
- Earnings accrue to any agent but pay out only to destinations bound to verified
  owners — a structural anti-money-laundering and anti-Sybil control.
- Per-category holdback windows, dual-signature confirmation, dispute freezing, and
  anomaly screening (duplicate receipts, bursts, self-dealing, statistical outliers)
  precede every payable confirmation.

## Excluded inventory

Health treatments, regulated financial products, political content, and anything
directed at minors are not sponsorable inventory at all — see
[SCOPE-POLICY.md](./SCOPE-POLICY.md).
