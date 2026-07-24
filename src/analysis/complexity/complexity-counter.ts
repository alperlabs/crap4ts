import type ts from "typescript";
import { nodesWithin } from "../parsing/method-traversal.js";
import { isDecisionPoint } from "./decision-rules.js";

/**
 * Cyclomatic complexity of a method body: 1 plus the number of decision points
 * (see {@link DECISION_RULES}). Nested declared methods are excluded; anonymous
 * inline callbacks are included.
 */
export function countComplexity(body: ts.Node): number {
  return 1 + nodesWithin(body).filter(isDecisionPoint).length;
}
