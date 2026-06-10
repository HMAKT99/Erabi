import { execFile, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startReferenceNode, type ReferenceNode } from "@erabi/node";

const execFileAsync = promisify(execFile);
const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// macOS x64 Node (Rosetta) spawns x86_64 children that cannot load arm64
// native extensions — retry under `arch -arm64`.
const launchers: string[][] = [
  ["python3"],
  ...(process.platform === "darwin" ? [["arch", "-arm64", "python3"]] : []),
];

/**
 * Async on purpose: the live test talks HTTP to a reference node running in
 * THIS process — a synchronous spawn would block the event loop the node's
 * servers need, deadlocking both sides.
 */
async function runPython(args: string[], env: NodeJS.ProcessEnv = {}): Promise<string> {
  let lastError: unknown;
  for (const launcher of launchers) {
    const [cmd, ...prefix] = launcher;
    try {
      const { stdout } = await execFileAsync(cmd!, [...prefix, ...args], {
        cwd: pkgRoot,
        env: { ...process.env, ...env },
        encoding: "utf8",
        timeout: 60_000,
      });
      return stdout;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function cryptographyAvailable(): boolean {
  for (const launcher of launchers) {
    const [cmd, ...prefix] = launcher;
    try {
      execFileSync(cmd!, [...prefix, "-c", "import cryptography"], { stdio: "ignore" });
      return true;
    } catch {
      // try next launcher
    }
  }
  return false;
}

describe.skipIf(!cryptographyAvailable())("erabi-sdk (python)", () => {
  it("reproduces the frozen cross-SDK vectors byte-for-byte", async () => {
    const output = await runPython(["tests/run_tests.py"]);
    expect(output).toContain("vector 0 sig");
    expect(output).not.toContain("FAIL");
  });

  describe("against a live reference node", () => {
    let node: ReferenceNode;

    beforeAll(async () => {
      node = await startReferenceNode();
    });

    afterAll(async () => {
      await node.stop();
    });

    it("registers, discovers, fires an intent, and dual-signs an outcome", async () => {
      const output = await runPython(["tests/live_test.py"], {
        ERABI_REGISTRY_URL: node.urls.registry,
        ERABI_EXCHANGE_URL: node.urls.exchange,
        ERABI_ATTRIBUTION_URL: node.urls.attribution,
        ERABI_REPUTATION_URL: node.urls.reputation,
      });
      expect(output).toContain("ok   sdk-py live round-trip");
    }, 90_000);
  });
});
