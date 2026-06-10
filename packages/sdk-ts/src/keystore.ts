import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { keyPairFromSeed, type KeyPair } from "@erabi/crypto";

export const DEFAULT_KEY_DIR = path.join(homedir(), ".erabi", "keys");

interface StoredKey {
  seed_hex: string;
  agent_id: string;
}

function keyPath(dir: string, name: string): string {
  return path.join(dir, `${name.replace(/[^A-Za-z0-9_-]/g, "_")}.json`);
}

export function saveKey(dir: string, name: string, seed: Uint8Array, agentId: string): string {
  mkdirSync(dir, { recursive: true });
  const file = keyPath(dir, name);
  writeFileSync(
    file,
    JSON.stringify({ seed_hex: Buffer.from(seed).toString("hex"), agent_id: agentId }, null, 2),
  );
  chmodSync(file, 0o600);
  return file;
}

export function loadKey(dir: string, name: string): { keys: KeyPair; agentId: string } | null {
  const file = keyPath(dir, name);
  if (!existsSync(file)) return null;
  const stored = JSON.parse(readFileSync(file, "utf8")) as StoredKey;
  return {
    keys: keyPairFromSeed(Uint8Array.from(Buffer.from(stored.seed_hex, "hex"))),
    agentId: stored.agent_id,
  };
}
