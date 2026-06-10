import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** Current signing key; history in key_history. */
  publicKey: text("public_key").notNull(),
  tier: text("tier").notNull().default("unverified"),
  reputation: real("reputation").notNull().default(50),
  /** Full AgentManifest as registered (JSON). */
  manifest: text("manifest", { mode: "json" }).notNull(),
  referrer: text("referrer"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const agentCapabilities = sqliteTable("agent_capabilities", {
  rowId: integer("row_id").primaryKey({ autoIncrement: true }),
  agentId: text("agent_id").notNull(),
  capability: text("capability").notNull(),
});

export const keyHistory = sqliteTable("key_history", {
  rowId: integer("row_id").primaryKey({ autoIncrement: true }),
  agentId: text("agent_id").notNull(),
  /** 1 = registration key; increments on each rotation. */
  seq: integer("seq").notNull(),
  publicKey: text("public_key").notNull(),
  startedAt: text("started_at").notNull(),
  /** Envelope signature (by the previous key) that authorized this key. */
  rotationSig: text("rotation_sig"),
});

export const DDL = `
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  public_key TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'unverified',
  reputation REAL NOT NULL DEFAULT 50,
  manifest TEXT NOT NULL,
  referrer TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agent_capabilities (
  row_id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  capability TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_capabilities_capability
  ON agent_capabilities (capability);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_capabilities_unique
  ON agent_capabilities (agent_id, capability);
CREATE TABLE IF NOT EXISTS key_history (
  row_id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  public_key TEXT NOT NULL,
  started_at TEXT NOT NULL,
  rotation_sig TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_key_history_agent_seq
  ON key_history (agent_id, seq);
`;
