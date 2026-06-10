// AUTO-GENERATED from packages/schemas/json — do not edit. Run `pnpm codegen`.
import { z } from "zod"

export const envelopeZod = z.object({ "payload": z.record(z.string(), z.any()).describe("The protocol object being signed; validated against its own schema."), "sig": z.string().regex(new RegExp("^ed25519:[1-9A-HJ-NP-Za-km-z]{64,96}$")), "key_id": z.string().min(1).max(256), "ts": z.string().datetime({ offset: true }), "nonce": z.string().min(8).max(128), "node_id": z.string().min(1).max(128) }).strict().describe("Signed wrapper for every protocol object. sig = ed25519(canonical_json(payload) || ts || nonce). Reject |now - ts| > 120s or reused nonce.")
export type Envelope = z.infer<typeof envelopeZod>
