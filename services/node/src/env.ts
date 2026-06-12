/**
 * Parse ERABI_HOLDBACK_HOURS: either a plain number ("0.0833" → applies to
 * every category as the default) or a JSON record of category-group → hours
 * ('{"default":0.0833,"commerce":1}'). Invalid input is ignored with a
 * warning so a typo can never take the node down.
 */
export function parseHoldbackHours(raw: string | undefined): Record<string, number> | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  const trimmed = raw.trim();

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber >= 0) return { default: asNumber };

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const entries = Object.entries(record).filter(
        ([, value]) => typeof value === "number" && Number.isFinite(value) && value >= 0,
      );
      if (entries.length > 0 && entries.length === Object.keys(record).length) {
        return Object.fromEntries(entries) as Record<string, number>;
      }
    }
  } catch {
    // fall through to the warning
  }

  console.warn(
    `ERABI_HOLDBACK_HOURS ignored (expected a non-negative number or a JSON record of category → hours): ${raw}`,
  );
  return undefined;
}
