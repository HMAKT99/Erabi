import type { ConsiderationSet } from "@erabi/schemas";

type SponsoredEntry = ConsiderationSet["sponsored"][number];

export interface LabelOptions {
  /**
   * Suppressing the default label requires explicit acknowledgment that the
   * integrator takes on the disclosure obligation themselves. The signed
   * DisclosureRecord exists publicly either way.
   */
  iUnderstandDisclosureObligations?: boolean;
}

/** Default rendering: sponsored results are labeled, always. */
export function renderSponsored(entry: SponsoredEntry, options: LabelOptions = {}): string {
  const body = `${entry.creative.title} — ${entry.creative.claim} (${entry.creative.endpoint})`;
  if (options.iUnderstandDisclosureObligations === true) {
    return body;
  }
  return `[Sponsored] ${body} · disclosure:${entry.disclosure.disclosure_id}`;
}

export function renderOrganic(entry: ConsiderationSet["organic"][number]): string {
  return `${entry.provider_id} (reputation ${entry.reputation})`;
}
