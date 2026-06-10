import { ExchangeError } from "./errors.js";

/**
 * Minimal, safe subset of CEL for bid constraints_filter expressions:
 * comparisons over `intent.constraints.<key>` and numeric literals, joined
 * by `&&`. Example: "intent.constraints.max_price_usd >= 2.0".
 *
 * Unparseable filters are rejected loudly at bid submission. A missing
 * constraint makes its comparison false (the bid does not match).
 */

const COMPARISON =
  /^\s*intent\.constraints\.([a-z_][a-z0-9_]*)\s*(>=|<=|==|!=|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/;

interface Clause {
  key: string;
  op: string;
  value: number;
}

export function parseFilter(expression: string): Clause[] {
  return expression.split("&&").map((part) => {
    const match = COMPARISON.exec(part);
    if (!match) {
      throw new ExchangeError(
        "invalid_bid",
        `constraints_filter clause "${part.trim()}" is not supported ` +
          "(spec 0.1 supports: intent.constraints.<key> <op> <number>, joined by &&)",
      );
    }
    return { key: match[1]!, op: match[2]!, value: Number(match[3]!) };
  });
}

export function evaluateFilter(
  expression: string | undefined,
  constraints: Record<string, number | undefined>,
): boolean {
  if (!expression) return true;
  return parseFilter(expression).every((clause) => {
    const actual = constraints[clause.key];
    if (actual === undefined) return false;
    switch (clause.op) {
      case ">=":
        return actual >= clause.value;
      case "<=":
        return actual <= clause.value;
      case ">":
        return actual > clause.value;
      case "<":
        return actual < clause.value;
      case "==":
        return actual === clause.value;
      case "!=":
        return actual !== clause.value;
      default:
        return false;
    }
  });
}
