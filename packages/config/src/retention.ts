/** Data retention knobs (privacy section of the spec). */

/** Raw intents are deleted after this many days; aggregates kept indefinitely. */
export const RAW_INTENT_RETENTION_DAYS = 30;

/** ConsiderationSet audit log queryable by intent_id for this many days. */
export const CONSIDERATION_SET_AUDIT_DAYS = 90;
