// AUTO-GENERATED from packages/schemas/json — do not edit. Run `pnpm codegen`.

export const agentManifestSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:erabi:schema:agent-manifest:0.1",
  "title": "AgentManifest",
  "description": "erabi.json — an agent's identity manifest. Identity IS the keypair: id derives from the public key.",
  "type": "object",
  "properties": {
    "spec_version": {
      "const": "0.1"
    },
    "id": {
      "type": "string",
      "pattern": "^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 120
    },
    "public_key": {
      "type": "string",
      "pattern": "^ed25519:[1-9A-HJ-NP-Za-km-z]{32,50}$"
    },
    "owner": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "org",
            "individual",
            "unbound"
          ]
        },
        "verification": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1,
            "maxLength": 256
          }
        },
        "payout_binding": {
          "anyOf": [
            {
              "type": "string",
              "pattern": "^sha256:[0-9a-f]{64}$"
            },
            {
              "type": "null"
            }
          ],
          "description": "Hash of the verified payout destination. Payout execution requires a non-null binding on a verified owner (the owner-binding invariant)."
        }
      },
      "required": [
        "type",
        "verification",
        "payout_binding"
      ],
      "additionalProperties": false
    },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^(data|api|agent|compute|commerce)\\.[a-z0-9-]+$"
      },
      "minItems": 1,
      "maxItems": 50
    },
    "endpoint": {
      "type": "string",
      "format": "uri",
      "maxLength": 2048
    },
    "roles": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "consumer",
          "provider"
        ]
      },
      "minItems": 1,
      "maxItems": 2,
      "uniqueItems": true
    },
    "policy": {
      "type": "object",
      "properties": {
        "accepts_sponsored": {
          "type": "boolean",
          "description": "Defaults false at registration — monetization is opt-in, never a dark pattern."
        },
        "max_sponsored_ratio": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "human_in_loop": {
          "type": "boolean"
        }
      },
      "required": [
        "accepts_sponsored",
        "max_sponsored_ratio",
        "human_in_loop"
      ],
      "additionalProperties": false
    },
    "referrer": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$"
        },
        {
          "type": "null"
        }
      ]
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "spec_version",
    "id",
    "name",
    "public_key",
    "owner",
    "capabilities",
    "endpoint",
    "roles",
    "policy",
    "referrer",
    "created_at"
  ],
  "additionalProperties": false
} as const;

export const bidSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:erabi:schema:bid:0.1",
  "title": "Bid",
  "description": "A signed standing offer targeting intent categories.",
  "type": "object",
  "properties": {
    "bid_id": {
      "type": "string",
      "format": "uuid"
    },
    "provider_id": {
      "type": "string",
      "pattern": "^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$"
    },
    "targeting": {
      "type": "object",
      "properties": {
        "categories": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^(data|api|agent|compute|commerce)\\.[a-z0-9-]+$"
          },
          "minItems": 1,
          "maxItems": 20
        },
        "constraints_filter": {
          "type": "string",
          "maxLength": 1024,
          "description": "Optional CEL expression evaluated against the intent's constraints."
        }
      },
      "required": [
        "categories"
      ],
      "additionalProperties": false
    },
    "offer": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "cpa",
            "cpc",
            "rev_share"
          ]
        },
        "amount_usd": {
          "type": "number",
          "exclusiveMinimum": 0
        }
      },
      "required": [
        "type",
        "amount_usd"
      ],
      "additionalProperties": false
    },
    "creative": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "claim": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        },
        "endpoint": {
          "type": "string",
          "format": "uri",
          "maxLength": 2048
        }
      },
      "required": [
        "title",
        "claim",
        "endpoint"
      ],
      "additionalProperties": false
    },
    "budget": {
      "type": "object",
      "properties": {
        "daily_usd": {
          "type": "number",
          "exclusiveMinimum": 0
        }
      },
      "required": [
        "daily_usd"
      ],
      "additionalProperties": false
    },
    "settlement_rail": {
      "type": "string",
      "enum": [
        "x402",
        "ap2",
        "affiliate",
        "ledger_only"
      ]
    },
    "stake_tier": {
      "type": "string",
      "enum": [
        "unverified",
        "verified",
        "staked",
        "bridge"
      ]
    }
  },
  "required": [
    "bid_id",
    "provider_id",
    "targeting",
    "offer",
    "creative",
    "budget",
    "settlement_rail",
    "stake_tier"
  ],
  "additionalProperties": false
} as const;

export const considerationSetSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:erabi:schema:consideration-set:0.1",
  "title": "ConsiderationSet",
  "description": "Ranked organic + capped, labeled sponsored candidates. Organic is NEVER reordered by payment; sponsored and organic live in separate arrays; every sponsored entry carries its DisclosureRecord. The join block appears on every response — it is the contagion mechanic.",
  "type": "object",
  "properties": {
    "intent_id": {
      "type": "string",
      "format": "uuid"
    },
    "organic": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "provider_id": {
            "type": "string",
            "pattern": "^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$"
          },
          "reputation": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
          },
          "evidence_url": {
            "type": "string",
            "format": "uri",
            "maxLength": 2048
          },
          "reason": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200
          }
        },
        "required": [
          "provider_id",
          "reputation",
          "evidence_url",
          "reason"
        ],
        "additionalProperties": false
      },
      "maxItems": 50
    },
    "sponsored": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "provider_id": {
            "type": "string",
            "pattern": "^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$"
          },
          "creative": {
            "type": "object",
            "properties": {
              "title": {
                "type": "string",
                "minLength": 1,
                "maxLength": 80
              },
              "claim": {
                "type": "string",
                "minLength": 1,
                "maxLength": 200
              },
              "endpoint": {
                "type": "string",
                "format": "uri",
                "maxLength": 2048
              }
            },
            "required": [
              "title",
              "claim",
              "endpoint"
            ],
            "additionalProperties": false
          },
          "disclosure": {
            "$ref": "urn:erabi:schema:disclosure-record:0.1"
          }
        },
        "required": [
          "provider_id",
          "creative",
          "disclosure"
        ],
        "additionalProperties": false
      },
      "maxItems": 2,
      "description": "Hard cap: sponsored.length <= min(policy.max_sponsored_ratio * total, 2)."
    },
    "auction_id": {
      "type": "string",
      "format": "uuid"
    },
    "join": {
      "type": "object",
      "properties": {
        "spec": {
          "const": "erabi/0.1"
        },
        "register": {
          "type": "string",
          "format": "uri",
          "maxLength": 2048
        },
        "well_known": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256
        }
      },
      "required": [
        "spec",
        "register",
        "well_known"
      ],
      "additionalProperties": false
    },
    "exchange_sig": {
      "type": "string",
      "pattern": "^ed25519:[1-9A-HJ-NP-Za-km-z]{64,96}$"
    }
  },
  "required": [
    "intent_id",
    "organic",
    "sponsored",
    "auction_id",
    "join",
    "exchange_sig"
  ],
  "additionalProperties": false
} as const;

export const disclosureRecordSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:erabi:schema:disclosure-record:0.1",
  "title": "DisclosureRecord",
  "description": "THE protocol invariant: the signed who-paid-what artifact on every sponsored result. Issued inside the same transaction as auction clearing; no code path returns a sponsored result before its disclosure is persisted and signed. Publicly verifiable at GET /v1/disclosures/:id.",
  "type": "object",
  "properties": {
    "disclosure_id": {
      "type": "string",
      "format": "uuid"
    },
    "auction_id": {
      "type": "string",
      "format": "uuid"
    },
    "intent_id": {
      "type": "string",
      "format": "uuid"
    },
    "provider_id": {
      "type": "string",
      "pattern": "^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$"
    },
    "payment_model": {
      "type": "string",
      "enum": [
        "cpa",
        "cpc",
        "rev_share"
      ]
    },
    "clearing_price_usd": {
      "type": "number",
      "minimum": 0
    },
    "label": {
      "type": "string",
      "pattern": "Sponsored",
      "minLength": 9,
      "maxLength": 200,
      "description": "Human- and agent-readable label; must contain the word 'Sponsored'."
    },
    "issued_at": {
      "type": "string",
      "format": "date-time"
    },
    "exchange_sig": {
      "type": "string",
      "pattern": "^ed25519:[1-9A-HJ-NP-Za-km-z]{64,96}$"
    }
  },
  "required": [
    "disclosure_id",
    "auction_id",
    "intent_id",
    "provider_id",
    "payment_model",
    "clearing_price_usd",
    "label",
    "issued_at",
    "exchange_sig"
  ],
  "additionalProperties": false
} as const;

export const envelopeSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:erabi:schema:envelope:0.1",
  "title": "Envelope",
  "description": "Signed wrapper for every protocol object. sig = ed25519(canonical_json(payload) || ts || nonce). Reject |now - ts| > 120s or reused nonce.",
  "type": "object",
  "properties": {
    "payload": {
      "type": "object",
      "description": "The protocol object being signed; validated against its own schema."
    },
    "sig": {
      "type": "string",
      "pattern": "^ed25519:[1-9A-HJ-NP-Za-km-z]{64,96}$"
    },
    "key_id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    },
    "ts": {
      "type": "string",
      "format": "date-time"
    },
    "nonce": {
      "type": "string",
      "minLength": 8,
      "maxLength": 128
    },
    "node_id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 128
    }
  },
  "required": [
    "payload",
    "sig",
    "key_id",
    "ts",
    "nonce",
    "node_id"
  ],
  "additionalProperties": false
} as const;

export const intentSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:erabi:schema:intent:0.1",
  "title": "Intent",
  "description": "A structured, PII-free moment of choice. No user identifiers exist anywhere in this schema — only agent identifiers. The query passes a PII rejector at the exchange boundary (loud failure, no silent sanitizing).",
  "type": "object",
  "properties": {
    "intent_id": {
      "type": "string",
      "format": "uuid"
    },
    "agent_id": {
      "type": "string",
      "pattern": "^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$"
    },
    "category": {
      "type": "string",
      "pattern": "^(data|api|agent|compute|commerce)\\.[a-z0-9-]+$"
    },
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 2000
    },
    "constraints": {
      "type": "object",
      "properties": {
        "max_price_usd": {
          "type": "number",
          "minimum": 0
        },
        "max_latency_ms": {
          "type": "integer",
          "minimum": 1
        }
      },
      "additionalProperties": false
    },
    "context_hash": {
      "type": "string",
      "pattern": "^sha256:[0-9a-f]{64}$",
      "description": "Commitment to off-exchange context; the context itself never leaves the agent."
    },
    "human_in_loop": {
      "type": "boolean",
      "description": "Mandatory. Sponsored results are disabled when false (scope policy) unless the owner has explicitly consented."
    },
    "ttl_ms": {
      "type": "integer",
      "minimum": 1,
      "maximum": 600000
    }
  },
  "required": [
    "intent_id",
    "agent_id",
    "category",
    "query",
    "constraints",
    "context_hash",
    "human_in_loop",
    "ttl_ms"
  ],
  "additionalProperties": false
} as const;

export const outcomeEventSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:erabi:schema:outcome-event:0.1",
  "title": "OutcomeEvent",
  "description": "Append-only, hash-chained ledger entry. Events are pending until counterparty-signed AND the holdback window passes; only confirmed events bear reputation or payout. rail_receipt links to the external payment proof — attribution owns the truth, the rail owns the money.",
  "type": "object",
  "properties": {
    "event_id": {
      "type": "string",
      "format": "uuid"
    },
    "auction_id": {
      "type": "string",
      "format": "uuid"
    },
    "kind": {
      "type": "string",
      "enum": [
        "selection",
        "click",
        "conversion",
        "task_success",
        "assisted",
        "dispute"
      ]
    },
    "reported_by": {
      "type": "string",
      "pattern": "^erabi:agent:[1-9A-HJ-NP-Za-km-z]{32,50}$"
    },
    "counterparty_confirmation": {
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "sig": {
              "type": "string",
              "pattern": "^ed25519:[1-9A-HJ-NP-Za-km-z]{64,96}$"
            },
            "key_id": {
              "type": "string",
              "minLength": 1,
              "maxLength": 256
            }
          },
          "required": [
            "sig",
            "key_id"
          ],
          "additionalProperties": false
        },
        {
          "type": "null"
        }
      ],
      "description": "Null while pending; no single-sided event ever confirms."
    },
    "value_usd": {
      "type": "number",
      "minimum": 0
    },
    "rail_receipt": {
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "rail": {
              "type": "string",
              "enum": [
                "x402",
                "ap2",
                "affiliate",
                "ledger_only"
              ]
            },
            "ref": {
              "type": "string",
              "minLength": 1,
              "maxLength": 512
            }
          },
          "required": [
            "rail",
            "ref"
          ],
          "additionalProperties": false
        },
        {
          "type": "null"
        }
      ]
    },
    "prev_hash": {
      "anyOf": [
        {
          "type": "string",
          "pattern": "^sha256:[0-9a-f]{64}$"
        },
        {
          "type": "null"
        }
      ],
      "description": "Null only for the genesis entry of an agent's chain."
    },
    "hash": {
      "type": "string",
      "pattern": "^sha256:[0-9a-f]{64}$"
    }
  },
  "required": [
    "event_id",
    "auction_id",
    "kind",
    "reported_by",
    "counterparty_confirmation",
    "value_usd",
    "rail_receipt",
    "prev_hash",
    "hash"
  ],
  "additionalProperties": false
} as const;

export const schemasById = {
  "urn:erabi:schema:agent-manifest:0.1": agentManifestSchema,
  "urn:erabi:schema:bid:0.1": bidSchema,
  "urn:erabi:schema:consideration-set:0.1": considerationSetSchema,
  "urn:erabi:schema:disclosure-record:0.1": disclosureRecordSchema,
  "urn:erabi:schema:envelope:0.1": envelopeSchema,
  "urn:erabi:schema:intent:0.1": intentSchema,
  "urn:erabi:schema:outcome-event:0.1": outcomeEventSchema,
} as const;
