# Governance

The Erabi Protocol — schemas, spec documents, reference services, and SDKs — is
Apache-2.0. The protocol's value depends on no single operator being able to bend it.

## Spec changes

- Changes to schemas, invariants, taxonomy, or signing rules go through a public RFC:
  an issue describing the problem, a PR against `spec/` and `packages/schemas/`, and a
  comment period before merge.
- The disclosure invariant, the dual-signature settlement rule, the organic/sponsored
  separation, and the owner-binding invariant are **constitutional**: an RFC may
  strengthen them, never weaken them.

## Versioning

- The spec uses semver, surfaced as `spec_version` in manifests and `erabi/<version>`
  in join blocks.
- Breaking schema changes bump the minor version pre-1.0 (0.1 → 0.2) and require a
  migration note. Generated types and the frozen signing vectors version with the
  spec.

## Federation and neutrality

- Every envelope carries a `node_id`; no node URL is hardcoded outside configuration.
  Independent and private nodes are an intended deployment mode, not a fork.
- Stated intent: as the network grows beyond a single reference operator, stewardship
  of the spec moves to a neutral foundation with multi-party governance. The Apache-2.0
  license and the public RFC trail make that transfer mechanical rather than
  aspirational.
