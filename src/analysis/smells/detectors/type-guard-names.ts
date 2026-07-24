/** Runtime type-guard helper names commonly sprayed by AI codegen. */
export const TYPE_GUARD_HELPER_NAMES: ReadonlySet<string> = new Set([
  "isRecord",
  "isPlainObject",
  "isObject",
  "isString",
  "isNumber",
  "isBoolean",
  "isArray",
]);

export function isTypeGuardHelperName(name: string): boolean {
  return TYPE_GUARD_HELPER_NAMES.has(name);
}
