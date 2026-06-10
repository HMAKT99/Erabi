# Decisions (ADR-lite)

Deviations and choices not fully specified by the project brief, newest first.

## 0017 — @erabi/node composes the reference node; holdbacks are overridable

`startReferenceNode()` wires registry + exchange + attribution + reputation with an
in-process directory, shared event bus, mock verifiers/rails, and ephemeral ports —
the substrate for SDK tests, bridge tests, the golden-path E2E, and `pnpm demo`.
`holdbackHours: { default: 0 }` lets demos settle instantly; production uses the
config defaults.

## 0016 — The frozen signing vectors are protocol law across SDKs

`packages/crypto/test/vectors.json` is generated once and never regenerated; both
@erabi/sdk (TS) and erabi-sdk (Python) must reproduce every byte (canonical JSON,
public keys, agent ids, signatures). sdk-py implements ECMAScript number→string
semantics (decimal for 1e-6 ≤ |x| < 1e21, no zero-padded exponents) so RFC 8785
canonical forms match across languages.

## 0015 — Disputes are recorded as already-confirmed chain events

A dispute is a single-sided attestation by a party; it freezes the disputed entry (and
its rev-share) and is appended to the provider's chain with no counterparty signature.
"Only confirmed events bear reputation" applies to _positive_ evidence; disputes feed
reputation directly per the spec ("disputes freeze entries and feed reputation").

## 0014 — Latency component is neutral in reputation v0.1

The 0.1 OutcomeEvent schema carries no latency attestations, so the 15% latency
component scores a neutral 0.5 for everyone. Attestations are a spec addition (0.2);
the weight stays reserved so scores don't reshuffle when they land.

## 0013 — Ledger hash chain covers the immutable core

`hash = sha256(canonical({event_id, auction_id, kind, reported_by, value_usd,
rail_receipt, prev_hash}))`, chained per provider. The counterparty confirmation is an
attestation _over_ that core (its envelope payload includes the hash) rather than part
of the hashed content — otherwise confirming an event would mutate its own hash and
break the chain. Rev-share splits clear the sponsored clearing price 70/20/10 to the
consumer-side developer / protocol / reserved; the `assisted` kind pays 50%.

## 0012 — Exchange signatures are detached over canonical JSON

`exchange_sig` on DisclosureRecords and ConsiderationSets is
`ed25519(canonical_json(object minus exchange_sig))` — no ts/nonce envelope, since
these objects are server-issued artifacts with their own `issued_at`/`auction_id`
identity. The exchange's public key is published in its well-known document.

## 0011 — Budget pacing charges at serve time

Daily budgets are debited by the clearing price when a sponsored slot is served (CPC
semantics) even for CPA bids, as a v0.1 simplification. True CPA budget accounting
(charge on confirmed conversion, release on expiry) arrives with attribution in
Phase 3. Slots a provider can no longer afford are dropped, not re-auctioned.

## 0010 — constraints_filter is a CEL subset

Spec 0.1 supports `intent.constraints.<key> <op> <number>` clauses joined by `&&`,
parsed with a strict grammar and rejected loudly at bid submission. Full CEL would pull
in an evaluator dependency before any bidder needs it; the seam (parse/evaluate in
`filter.ts`) allows a real CEL engine later without schema changes.

## 0009 — Key rotation keeps the agent id stable

`erabi:agent:<base58(pubkey)>` derives from the _genesis_ key. Rotation (signed by the
old key) updates the current signing key in `agents.public_key` and appends to
`key_history`; the id never changes, so reputation and ledger history survive rotation.
Envelopes always verify against the current key.

## 0008 — Registry schema bootstrap via idempotent DDL

Dev/test SQLite schema is created with `CREATE TABLE IF NOT EXISTS` at startup instead
of drizzle-kit migrations — zero-dependency `pnpm dev` and hermetic in-memory tests.
Proper migrations arrive with the Postgres production target.

## 0007 — Economics knobs live in the @erabi/config package

The brief calls for `config/economics.ts`; it lives as `packages/config/src/economics.ts`
(`@erabi/config`) so every service imports the same typed knobs through the workspace
rather than a root-level path alias.

## 0006 — Raw control characters avoided in source

Test fixtures spell control characters as `\uXXXX` escapes, never raw bytes, so diffs and
greps stay sane.

## 0005 — UTC-only timestamps on the wire

All `ts`/`*_at` fields are ISO 8601 with `Z` offset. JSON Schema's `date-time` accepts
offsets but Zod's `.datetime()` (as generated) does not; standardizing on UTC keeps both
validators in agreement and removes timezone ambiguity from signed payloads.

## 0004 — base58 (Bitcoin alphabet) for keys, ids, and signatures

`erabi:agent:<base58(pubkey)>`, `ed25519:<base58>` for keys and signatures,
`sha256:<hex>` for hashes. base58 avoids ambiguous characters in ids that humans will
paste into explorers. Length bounds in schemas: 32–50 chars for 32-byte keys, 64–96 for
64-byte signatures.

## 0003 — URN schema ids

Schema `$id`s use `urn:erabi:schema:<name>:<version>` rather than https URLs so the spec
is not coupled to a domain before launch. Cross-schema `$ref`s use the URN; codegen
inlines them, Ajv resolves them natively after `addSchema`.

## 0002 — Custom minimal Pydantic emitter instead of datamodel-code-generator

The codegen script emits Pydantic v2 models directly from our (deliberately small) JSON
Schema subset. Avoids a Python toolchain dependency in the Node codegen path; generated
models are validated against all examples in CI when Python+pydantic are present. If
schema complexity outgrows the emitter, switch to datamodel-code-generator.

## 0001 — Zod generated via json-schema-to-zod, output committed

JSON Schemas in `packages/schemas/json` are the single source of truth. Generated Zod +
TS types and Pydantic models are committed; CI re-runs codegen and fails on drift. Raw
schema objects are also exported for Ajv validation at service boundaries.
