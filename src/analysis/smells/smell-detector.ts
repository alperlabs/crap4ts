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
/**
 * How strong a slop signal the smell is. Escape hatches defeat the type
 * system or error handling outright; style heuristics flag idioms that are
 * only suspicious in aggregate.
 */
export type SmellCategory = "escape-hatch" | "style";

export interface SmellDetector {
  /** Stable machine key, used as the column id in {@link SmellCounts}. */
  readonly key: string;
  /** Short human label shown in the report breakdown. */
  readonly label: string;
  /** Signal strength group; the report breaks totals down by category. */
  readonly category: SmellCategory;
  /** Multiplier applied to this smell's count when computing the slop score. */
  readonly weight: number;
  /** One-line fix suggestion, shown alongside findings for this smell. */
  readonly advice: string;
  /** Whether this node exhibits the smell. Each matching node counts once. */
  matches(node: ts.Node): boolean;
}
