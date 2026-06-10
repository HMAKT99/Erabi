import { ExchangeError } from "./errors.js";

/**
 * PII rejector at the intent boundary. Loud failure, no silent sanitizing:
 * a query that trips any detector is rejected outright with the reason.
 *
 * Intents are PII-free by construction (no user-identifier fields exist in
 * the schema); this guards the one free-text field.
 */
const DETECTORS: Array<{ kind: string; pattern: RegExp }> = [
  { kind: "email", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { kind: "ssn", pattern: /\b\d{3}-\d{2}-\d{4}\b/ },
  { kind: "ipv4", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/ },
  // 10+ digits allowing up to two separator chars between them:
  // phone numbers ("+1 (415) 555-0142"), card numbers.
  { kind: "long_digit_sequence", pattern: /(?:\d[\s().-]{0,2}){10,}/ },
  { kind: "self_identification", pattern: /\bmy (?:name|address|email|phone|ssn)\b/i },
];

export function rejectPii(query: string): void {
  for (const { kind, pattern } of DETECTORS) {
    if (pattern.test(query)) {
      throw new ExchangeError(
        "pii_rejected",
        `intent query rejected: contains a ${kind.replace(/_/g, " ")} pattern; ` +
          "intents must be PII-free (commit context via context_hash instead)",
        { detector: kind },
      );
    }
  }
}
