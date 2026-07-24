import ts from "typescript";

/** A rule that decides whether a node introduces a branch (+1 complexity). */
export type DecisionRule = (node: ts.Node) => boolean;

const SHORT_CIRCUIT_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
]);

const isShortCircuit: DecisionRule = (node) =>
  ts.isBinaryExpression(node) && SHORT_CIRCUIT_OPERATORS.has(node.operatorToken.kind);

/**
 * Nodes that each add one to cyclomatic complexity. `default` clauses are
 * intentionally absent (only `case` adds a branch). Add a construct by
 * appending a rule here.
 */
export const DECISION_RULES: readonly DecisionRule[] = [
  ts.isIfStatement,
  ts.isForStatement,
  ts.isForInStatement,
  ts.isForOfStatement,
  ts.isWhileStatement,
  ts.isDoStatement,
  ts.isCaseClause,
  ts.isCatchClause,
  ts.isConditionalExpression,
  isShortCircuit,
];

/** Whether a single node adds one to cyclomatic complexity. */
export function isDecisionPoint(node: ts.Node): boolean {
  return DECISION_RULES.some((rule) => rule(node));
}
