import type ts from "typescript";

/**
 * A single AI-slop heuristic.
 *
 * Each detector is self-describing and independent: it inspects one AST node at
 * a time and reports how much that node contributes to its smell (almost always
 * `0` or `1`). Detectors are composed through {@link SMELL_DETECTORS}; adding a
 * new heuristic is a matter of implementing this interface in its own file and
 * registering it there.
 *
 * @see ../../../CONTRIBUTING.md for a step-by-step guide.
 */
export interface SmellDetector {
  /** Stable machine key, used as the column id in {@link SmellCounts}. */
  readonly key: string;
  /** Short human label shown in the report breakdown. */
  readonly label: string;
  /** Multiplier applied to this smell's count when computing the slop score. */
  readonly weight: number;
  /** Contribution of a single node to this smell (`0` when it does not match). */
  count(node: ts.Node): number;
}

/** Convenience for detectors whose match is a simple boolean predicate. */
export function booleanSmell(matches: boolean): number {
  return matches ? 1 : 0;
}
