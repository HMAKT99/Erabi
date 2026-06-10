import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DDL } from "./schema.js";

export type RegistryDb = BetterSQLite3Database;

/**
 * SQLite for dev (zero external deps); Postgres behind the same Drizzle
 * surface in prod. `:memory:` for tests.
 */
export function createDb(file = ":memory:"): RegistryDb {
  if (file !== ":memory:") {
    mkdirSync(path.dirname(file), { recursive: true });
  }
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(DDL);
  return drizzle(sqlite);
}
