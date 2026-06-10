/**
 * ALL naming for the project is centralized here. Never hardcode these
 * strings anywhere else — import from @erabi/constants instead.
 */

/** Network / project name. From Japanese "erabu" — to choose. */
export const NETWORK_NAME = "ERABI";

/** The open protocol. */
export const PROTOCOL_NAME = "Erabi Protocol";

/** The hosted commercial layer. */
export const EXCHANGE_NAME = "Erabi Exchange";

/** The network explorer UI. */
export const EXPLORER_NAME = "Erabi Explorer";

/** One-line public positioning. */
export const TAGLINE = "The intent auction and reputation layer of the agent economy.";

export const NPM_SCOPE = "@erabi";
export const GITHUB_ORG = "erabi-protocol";

/** Current protocol spec version. */
export const SPEC_VERSION = "0.1";

/** Spec tag used in join blocks and well-known documents. */
export const SPEC_TAG = `erabi/${SPEC_VERSION}`;

/** Agent identifiers: `erabi:agent:<base58(ed25519 public key)>`. */
export const AGENT_ID_PREFIX = "erabi:agent:";

/** Machine-readable front door served by every node. */
export const WELL_KNOWN_PATH = "/.well-known/erabi.json";

/** Default disclosure label attached to every sponsored result. */
export const SPONSORED_LABEL = "Sponsored — provider paid for placement";

/** URN namespace for protocol JSON Schemas. */
export const SCHEMA_URN_PREFIX = "urn:erabi:schema:";
