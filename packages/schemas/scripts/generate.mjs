/**
 * Codegen: packages/schemas/json (the single source of truth) →
 *   - src/generated/schemas.ts   raw schema objects (for Ajv at service boundaries)
 *   - src/generated/<name>.ts    Zod schemas + inferred TS types
 *   - python/erabi_schemas/      Pydantic v2 models (consumed by sdk-py)
 *
 * Generated output is committed; CI re-runs codegen and fails on drift.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsonSchemaToZod } from "json-schema-to-zod";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonDir = path.join(pkgRoot, "json");
const generatedDir = path.join(pkgRoot, "src", "generated");
const pythonDir = path.join(pkgRoot, "python", "erabi_schemas");

const HEADER = "// AUTO-GENERATED from packages/schemas/json — do not edit. Run `pnpm codegen`.\n";
const PY_HEADER =
  "# AUTO-GENERATED from packages/schemas/json — do not edit. Run `pnpm codegen`.\n";

const files = readdirSync(jsonDir)
  .filter((f) => f.endsWith(".schema.json"))
  .sort();

const entries = files.map((file) => {
  const stem = file.replace(/\.schema\.json$/, "");
  const schema = JSON.parse(readFileSync(path.join(jsonDir, file), "utf8"));
  return { stem, schema };
});

const byId = new Map(entries.map((e) => [e.schema.$id, e.schema]));

function camel(stem) {
  return stem.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}

function pascal(stem) {
  const c = camel(stem);
  return c[0].toUpperCase() + c.slice(1);
}

/** Inline cross-schema URN $refs so each schema is self-contained. */
function deref(node) {
  if (Array.isArray(node)) return node.map(deref);
  if (node && typeof node === "object") {
    if (typeof node.$ref === "string") {
      const target = byId.get(node.$ref);
      if (!target) throw new Error(`unresolved $ref: ${node.$ref}`);
      const { $schema, $id, title, ...body } = structuredClone(target);
      return deref(body);
    }
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, deref(v)]));
  }
  return node;
}

mkdirSync(generatedDir, { recursive: true });
mkdirSync(pythonDir, { recursive: true });

// ---- raw schemas (with $refs intact, for Ajv) ----
{
  let out = HEADER + "\n";
  for (const { stem, schema } of entries) {
    out += `export const ${camel(stem)}Schema = ${JSON.stringify(schema, null, 2)} as const;\n\n`;
  }
  out += `export const schemasById = {\n`;
  for (const { stem, schema } of entries) {
    out += `  ${JSON.stringify(schema.$id)}: ${camel(stem)}Schema,\n`;
  }
  out += `} as const;\n`;
  writeFileSync(path.join(generatedDir, "schemas.ts"), out);
}

// ---- zod ----
for (const { stem, schema } of entries) {
  const code = jsonSchemaToZod(deref(schema), {
    name: `${camel(stem)}Zod`,
    module: "esm",
    type: pascal(stem),
  });
  writeFileSync(path.join(generatedDir, `${stem}.ts`), HEADER + code);
}

// ---- generated index ----
{
  let out = HEADER + `export * from "./schemas.js";\n`;
  for (const { stem } of entries) {
    out += `export * from "./${stem}.js";\n`;
  }
  writeFileSync(path.join(generatedDir, "index.ts"), out);
}

// ---- pydantic v2 models ----
{
  const classes = [];

  function pyStr(value) {
    return JSON.stringify(value);
  }

  function fieldKwargs(node) {
    const kwargs = [];
    if (node.pattern !== undefined) {
      // JSON string escaping is valid Python string escaping for regex
      // patterns (backslashes arrive doubled), so no raw-string prefix.
      kwargs.push(`pattern=${pyStr(node.pattern)}`);
    }
    if (node.minLength !== undefined) kwargs.push(`min_length=${node.minLength}`);
    if (node.maxLength !== undefined) kwargs.push(`max_length=${node.maxLength}`);
    if (node.minItems !== undefined) kwargs.push(`min_length=${node.minItems}`);
    if (node.maxItems !== undefined) kwargs.push(`max_length=${node.maxItems}`);
    if (node.minimum !== undefined) kwargs.push(`ge=${node.minimum}`);
    if (node.maximum !== undefined) kwargs.push(`le=${node.maximum}`);
    if (node.exclusiveMinimum !== undefined) kwargs.push(`gt=${node.exclusiveMinimum}`);
    if (node.exclusiveMaximum !== undefined) kwargs.push(`lt=${node.exclusiveMaximum}`);
    return kwargs;
  }

  function typeExpr(node, hint) {
    if (node.const !== undefined) return `Literal[${pyStr(node.const)}]`;
    if (node.enum !== undefined) return `Literal[${node.enum.map(pyStr).join(", ")}]`;
    if (node.anyOf) {
      const nonNull = node.anyOf.filter((n) => n.type !== "null");
      const nullable = nonNull.length !== node.anyOf.length;
      const inner = nonNull.map((n, i) =>
        typeExpr(n, nonNull.length > 1 ? `${hint}Option${i}` : hint),
      );
      const union = inner.length > 1 ? `Union[${inner.join(", ")}]` : inner[0];
      return nullable ? `Optional[${union}]` : union;
    }
    switch (node.type) {
      case "string": {
        const kwargs = fieldKwargs(node);
        return kwargs.length ? `Annotated[str, Field(${kwargs.join(", ")})]` : "str";
      }
      case "number": {
        const kwargs = fieldKwargs(node);
        return kwargs.length ? `Annotated[float, Field(${kwargs.join(", ")})]` : "float";
      }
      case "integer": {
        const kwargs = fieldKwargs(node);
        return kwargs.length ? `Annotated[int, Field(${kwargs.join(", ")})]` : "int";
      }
      case "boolean":
        return "bool";
      case "array": {
        const item = typeExpr(node.items ?? {}, `${hint}Item`);
        const kwargs = fieldKwargs(node);
        const list = `List[${item}]`;
        return kwargs.length ? `Annotated[${list}, Field(${kwargs.join(", ")})]` : list;
      }
      case "object": {
        if (!node.properties) return "Dict[str, Any]";
        emitClass(hint, node);
        return hint;
      }
      default:
        return "Any";
    }
  }

  function emitClass(name, node) {
    const required = new Set(node.required ?? []);
    const lines = [`class ${name}(BaseModel):`, `    model_config = ConfigDict(extra="forbid")`];
    for (const [prop, child] of Object.entries(node.properties)) {
      let expr = typeExpr(child, name + pascal(prop.replace(/_/g, "-")));
      if (required.has(prop)) {
        lines.push(`    ${prop}: ${expr}`);
      } else {
        if (!expr.startsWith("Optional[")) expr = `Optional[${expr}]`;
        lines.push(`    ${prop}: ${expr} = None`);
      }
    }
    classes.push(lines.join("\n"));
  }

  for (const { stem, schema } of entries) {
    const dereffed = deref(schema);
    if (dereffed.type !== "object") throw new Error(`top-level schema ${stem} must be an object`);
    emitClass(pascal(stem), dereffed);
  }

  const body =
    PY_HEADER +
    "from typing import Any, Dict, List, Literal, Optional, Union\n\n" +
    "from typing_extensions import Annotated\n" +
    "from pydantic import BaseModel, ConfigDict, Field\n\n\n" +
    classes.join("\n\n\n") +
    "\n";
  writeFileSync(path.join(pythonDir, "models.py"), body);

  const exports = entries.map(({ stem }) => pascal(stem));
  writeFileSync(
    path.join(pythonDir, "__init__.py"),
    PY_HEADER +
      `from .models import ${exports.join(", ")}\n\n__all__ = [${exports.map(pyStr).join(", ")}]\n`,
  );
}

console.log(`generated ${entries.length} schemas → zod + pydantic`);
