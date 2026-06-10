import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const bids = sqliteTable("bids", {
  bidId: text("bid_id").primaryKey(),
  providerId: text("provider_id").notNull(),
  /** Full Bid object as submitted (JSON). */
  payload: text("payload", { mode: "json" }).notNull(),
  active: integer("active").notNull().default(1),
  /** Daily budget pacing: spend accumulated for spend_date (UTC day). */
  spentTodayUsd: real("spent_today_usd").notNull().default(0),
  spendDate: text("spend_date").notNull(),
  createdAt: text("created_at").notNull(),
});

export const disclosures = sqliteTable("disclosures", {
  disclosureId: text("disclosure_id").primaryKey(),
  auctionId: text("auction_id").notNull(),
  intentId: text("intent_id").notNull(),
  providerId: text("provider_id").notNull(),
  /** Full signed DisclosureRecord (JSON). */
  record: text("record", { mode: "json" }).notNull(),
  issuedAt: text("issued_at").notNull(),
});

/**
 * The compounding asset: one full decision tuple per intent — including
 * organic-only intents (spec §10).
 */
export const decisionTuples = sqliteTable("decision_tuples", {
  intentId: text("intent_id").primaryKey(),
  auctionId: text("auction_id").notNull(),
  tuple: text("tuple", { mode: "json" }).notNull(),
  /** Filled by attribution when outcomes arrive. */
  selection: text("selection", { mode: "json" }),
  outcome: text("outcome", { mode: "json" }),
  valueUsd: real("value_usd"),
  createdAt: text("created_at").notNull(),
});

export const DDL = `
CREATE TABLE IF NOT EXISTS bids (
  bid_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  spent_today_usd REAL NOT NULL DEFAULT 0,
  spend_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bids_provider ON bids (provider_id);
CREATE TABLE IF NOT EXISTS disclosures (
  disclosure_id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  record TEXT NOT NULL,
  issued_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_disclosures_intent ON disclosures (intent_id);
CREATE TABLE IF NOT EXISTS decision_tuples (
  intent_id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL,
  tuple TEXT NOT NULL,
  selection TEXT,
  outcome TEXT,
  value_usd REAL,
  created_at TEXT NOT NULL
);
`;
