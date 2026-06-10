import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// On macOS an x64 Node (Rosetta) spawns x86_64 children, which cannot load
// arm64 native extensions like pydantic_core — retry under `arch -arm64`.
const launchers: string[][] = [
  ["python3"],
  ...(process.platform === "darwin" ? [["arch", "-arm64", "python3"]] : []),
];

function runPython(args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): string {
  let lastError: unknown;
  for (const launcher of launchers) {
    const [cmd, ...prefix] = launcher;
    try {
      return execFileSync(cmd!, [...prefix, ...args], { ...opts, encoding: "utf8" });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function pydanticAvailable(): boolean {
  try {
    runPython(["-c", "import pydantic"]);
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!pydanticAvailable())("generated pydantic models", () => {
  it("validate every example (and reject unknown fields)", () => {
    const output = runPython(["python/validate_examples.py"], {
      cwd: pkgRoot,
      env: { ...process.env, PYTHONPATH: "python" },
    });
    expect(output).toContain("ok");
  });
});
