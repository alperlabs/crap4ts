/**
 * The one shared record guard, per this tool's own `dup-guard` advice:
 * whether the value is a non-null object usable for key access.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
