import type ts from "typescript";

/**
 * A single AI-slop heuristic, expressed as a pure predicate over one AST node.
 *
 * Detectors only decide *whether* a node exhibits their smell; counting,
 * weighting, and reporting live in the machinery that iterates the registry
 * ({@link SMELL_DETECTORS}). This mirrors the complexity side, where each
 * decision rule is likewise a `(node) => boolean` predicate. Adding a new
 * heuristic is a matter of implementing this interface in its own file and
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
  /** Whether this node exhibits the smell. Each matching node counts once. */
  matches(node: ts.Node): boolean;
}
