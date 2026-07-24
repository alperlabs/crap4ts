import type ts from "typescript";
import { walkWithin } from "../parsing/method-traversal.js";
import { decisionDelta } from "./decision-rules.js";

/**
 * Cyclomatic complexity of a method body: 1 plus the number of decision points
 * (see {@link DECISION_RULES}). Nested declared methods are excluded; anonymous
 * inline callbacks are included.
 */
export function countComplexity(body: ts.Node): number {
  let complexity = 1;
  walkWithin(body, (node) => {
    complexity += decisionDelta(node);
  });
  return complexity;
}
