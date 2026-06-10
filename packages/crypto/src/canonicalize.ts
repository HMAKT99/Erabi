/**
 * RFC 8785 (JSON Canonicalization Scheme) serializer.
 *
 * Number and string serialization delegate to ES2015+ JSON.stringify, which
 * RFC 8785 is defined in terms of. Object keys are sorted by UTF-16 code
 * units (the default Array.prototype.sort comparison).
 *
 * Loud failures over silent sanitization: values JSON cannot faithfully
 * represent (undefined, functions, symbols, BigInt, non-finite numbers)
 * throw instead of being dropped — dropped fields in signed payloads are a
 * signature-confusion hazard.
 */

export type CanonicalizableValue =
  | null
  | boolean
  | number
  | string
  | CanonicalizableValue[]
  | { [key: string]: CanonicalizableValue };

export function canonicalize(value: unknown): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new TypeError(`canonicalize: non-finite number ${value} is not valid JSON`);
      }
      return JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) {
        return `[${value.map((item) => canonicalize(item)).join(",")}]`;
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      const members: string[] = [];
      for (const key of keys) {
        const member = record[key];
        if (member === undefined) {
          throw new TypeError(`canonicalize: property "${key}" is undefined and cannot be signed`);
        }
        members.push(`${JSON.stringify(key)}:${canonicalize(member)}`);
      }
      return `{${members.join(",")}}`;
    }
    default:
      throw new TypeError(`canonicalize: cannot canonicalize value of type ${typeof value}`);
  }
}
