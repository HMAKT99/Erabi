# Decisions (ADR-lite)

Deviations and choices not fully specified by the project brief, newest first.

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
