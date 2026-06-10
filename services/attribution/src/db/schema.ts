import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Append-only outcome event ledger. Rows are never mutated except for
 * status transitions and counterparty confirmation; the hash chain covers
 * the immutable core (see DECISIONS 0013).
 */
export const events = sqliteTable("events", {
  eventId: text("event_id").primaryKey(),
  auctionId: text("auction_id").notNull(),
  intentId: text("intent_id").notNull(),
  category: text("category").notNull(),
  kind: text("kind").notNull(),
  reportedBy: text("reported_by").notNull(),
  providerId: text("provider_id").notNull(),
  consumerId: text("consumer_id").notNull(),
  valueUsd: real("value_usd").notNull(),
  railReceipt: text("rail_receipt", { mode: "json" }),
  /** Denormalized rail receipt ref for duplicate-fingerprint detection. */
  railRef: text("rail_ref"),
  /** Position in the provider's hash chain (1-based). */
  chainSeq: integer("chain_seq").notNull(),
  /** Clearing price if the provider held a sponsored slot in this auction. */
  clearingPriceUsd: real("clearing_price_usd"),
  prevHash: text("prev_hash"),
  hash: text("hash").notNull(),
  counterpartySig: text("counterparty_sig"),
  counterpartyKeyId: text("counterparty_key_id"),
  /** pending → countersigned → confirmed | disputed | under_review */
  status: text("status").notNull().default("pending"),
  holdbackUntil: text("holdback_until"),
  freezeReason: text("freeze_reason"),
  createdAt: text("created_at").notNull(),
  confirmedAt: text("confirmed_at"),
});

export const revShareEntries = sqliteTable("rev_share_entries", {
  entryId: text("entry_id").primaryKey(),
  eventId: text("event_id").notNull(),
  auctionId: text("auction_id").notNull(),
  /** The consumer-side developer who monetized the moment of choice. */
  beneficiaryId: text("beneficiary_id").notNull(),
  /** The sponsored provider whose clearing price funds the split. */
  providerId: text("provider_id").notNull(),
  basisUsd: real("basis_usd").notNull(),
  developerUsd: real("developer_usd").notNull(),
  protocolUsd: real("protocol_usd").notNull(),
  reservedUsd: real("reserved_usd").notNull(),
  /** accrued | frozen | paid */
  status: text("status").notNull().default("accrued"),
  createdAt: text("created_at").notNull(),
});

export const payouts = sqliteTable("payouts", {
  payoutId: text("payout_id").primaryKey(),
  agentId: text("agent_id").notNull(),
  amountUsd: real("amount_usd").notNull(),
  rail: text("rail").notNull(),
  receiptRef: text("receipt_ref").notNull(),
  createdAt: text("created_at").notNull(),
});

export const DDL = `
CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  category TEXT NOT NULL,
  kind TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  consumer_id TEXT NOT NULL,
  value_usd REAL NOT NULL,
  rail_receipt TEXT,
  rail_ref TEXT,
  chain_seq INTEGER NOT NULL,
  clearing_price_usd REAL,
  prev_hash TEXT,
  hash TEXT NOT NULL,
  counterparty_sig TEXT,
  counterparty_key_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  holdback_until TEXT,
  freeze_reason TEXT,
  created_at TEXT NOT NULL,
  confirmed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_provider ON events (provider_id);
CREATE INDEX IF NOT EXISTS idx_events_auction ON events (auction_id);
CREATE TABLE IF NOT EXISTS rev_share_entries (
  entry_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  auction_id TEXT NOT NULL,
  beneficiary_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  basis_usd REAL NOT NULL,
  developer_usd REAL NOT NULL,
  protocol_usd REAL NOT NULL,
  reserved_usd REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'accrued',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rev_share_beneficiary ON rev_share_entries (beneficiary_id);
CREATE TABLE IF NOT EXISTS payouts (
  payout_id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  rail TEXT NOT NULL,
  receipt_ref TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
