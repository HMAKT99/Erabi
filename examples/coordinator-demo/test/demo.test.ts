import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("pnpm demo", () => {
  it("runs the full coordinator story end to end (--once)", async () => {
    const { stdout } = await execFileAsync("npx", ["tsx", "src/demo.ts", "--once"], {
      cwd: pkgRoot,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(stdout).toContain("[Sponsored]");
    expect(stdout).toContain("first cent:");
    expect(stdout).toContain("reputation:");
    expect(stdout).toContain("full loop complete");
  }, 150_000);
});
