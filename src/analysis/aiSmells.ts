/**
 * AI-slop heuristics.
 *
 * These counters flag the syntactic tics that tend to show up in
 * machine-generated TypeScript: piles of `isSomething` type guards, defensive
 * `instanceof`/`typeof` ladders, `any` escape hatches, non-null `!` assertions,
 * gratuitous `as` casts, optional-chaining and `??` soup, try/catch wrappers
 * around everything, and stray `console.log`s.
 *
 * None of these are bugs on their own. In aggregate they are a good smell for
 * "this code looks like AI crap".
 */
export interface SmellCounts {
  /** Guard functions/calls named `is`/`has`/`can`/`should`, plus type predicates. */
  isGuards: number;
  /** `x instanceof Foo` expressions. */
  instanceOf: number;
  /** `typeof x` value-position checks. */
  typeOf: number;
  /** `any` type annotations (`: any`, `as any`, `Array<any>`, ...). */
  anyTypes: number;
  /** Non-null assertions (`x!`). */
  nonNullAssertions: number;
  /** Type assertions (`x as T`, `<T>x`). */
  asCasts: number;
  /** Optional-chaining hops (`?.`). */
  optionalChains: number;
  /** Nullish-coalescing operators (`??`). */
  nullishCoalescing: number;
  /** try/catch statements. */
  tryCatch: number;
  /** `console.*` calls. */
  consoleCalls: number;
}

export type SmellKey = keyof SmellCounts;

export const SMELL_KEYS: readonly SmellKey[] = [
  "isGuards",
  "instanceOf",
  "typeOf",
  "anyTypes",
  "nonNullAssertions",
  "asCasts",
  "optionalChains",
  "nullishCoalescing",
  "tryCatch",
  "consoleCalls",
];

/** Short column labels used in the report breakdown. */
export const SMELL_LABELS: Record<SmellKey, string> = {
  isGuards: "guard",
  instanceOf: "instof",
  typeOf: "typeof",
  anyTypes: "any",
  nonNullAssertions: "nonNull",
  asCasts: "as",
  optionalChains: "?.",
  nullishCoalescing: "??",
  tryCatch: "try",
  consoleCalls: "console",
};

/**
 * Weights fold the individual smell counts into a single slop score.
 * The escape hatches that most strongly correlate with unreviewed generated
 * code (`any`, non-null assertions, guard clutter, stray logging) are weighted
 * more heavily than the merely idiomatic ones.
 */
export const SMELL_WEIGHTS: Record<SmellKey, number> = {
  isGuards: 2,
  instanceOf: 1,
  typeOf: 1,
  anyTypes: 3,
  nonNullAssertions: 2,
  asCasts: 1,
  optionalChains: 1,
  nullishCoalescing: 1,
  tryCatch: 1,
  consoleCalls: 2,
};

export function emptySmells(): SmellCounts {
  return {
    isGuards: 0,
    instanceOf: 0,
    typeOf: 0,
    anyTypes: 0,
    nonNullAssertions: 0,
    asCasts: 0,
    optionalChains: 0,
    nullishCoalescing: 0,
    tryCatch: 0,
    consoleCalls: 0,
  };
}

export function addSmells(into: SmellCounts, extra: SmellCounts): SmellCounts {
  for (const key of SMELL_KEYS) {
    into[key] += extra[key];
  }
  return into;
}

/** Weighted aggregate; higher means more AI-slop-shaped. */
export function slopScore(smells: SmellCounts): number {
  let total = 0;
  for (const key of SMELL_KEYS) {
    total += smells[key] * SMELL_WEIGHTS[key];
  }
  return total;
}
