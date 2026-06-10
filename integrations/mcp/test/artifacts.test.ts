import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const integrationsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadJson(relative: string) {
  return JSON.parse(readFileSync(path.join(integrationsRoot, relative), "utf8"));
}

describe("integration artifacts", () => {
  it("A2A agent card declares the four core skills", () => {
    const card = loadJson("a2a/agent-card.json");
    expect(card.name).toContain("Erabi");
    const skillIds = card.skills.map((s: { id: string }) => s.id);
    expect(skillIds).toEqual(["register", "discover", "intent", "report_outcome"]);
  });

  it("OpenAI tool schemas are well-formed function definitions", () => {
    const tools = loadJson("openai/tools.json") as Array<{
      type: string;
      function: { name: string; parameters: { type: string; required?: string[] } };
    }>;
    expect(tools).toHaveLength(4);
    for (const tool of tools) {
      expect(tool.type).toBe("function");
      expect(tool.function.name).toMatch(/^erabi_/);
      expect(tool.function.parameters.type).toBe("object");
    }
  });

  it("Copilot Studio connector is a swagger 2.0 definition with the core paths", () => {
    const swagger = loadJson("copilot-studio/apiDefinition.swagger.json");
    expect(swagger.swagger).toBe("2.0");
    expect(Object.keys(swagger.paths)).toEqual(
      expect.arrayContaining(["/v1/discover", "/v1/intents", "/v1/disclosures/{id}"]),
    );
  });
});
