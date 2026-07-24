import ts from "typescript";
import { isDeclaredMethodBoundary } from "./astUtils.js";

/**
 * Cyclomatic complexity from the AST: start at 1 and add one for each decision
 * point (if, loops, case clauses, catch, ternary, and the short-circuiting
 * operators `&&`, `||`, `??`).
 *
 * Nested declared methods are boundaries and are not descended into — they get
 * their own complexity. Anonymous inline callbacks ARE descended into, so their
 * branches count toward the enclosing method, mirroring Java's treatment of
 * lambdas.
 */
export function countComplexity(body: ts.Node): number {
  let complexity = 1;

  const walk = (node: ts.Node): void => {
    complexity += decisionDelta(node);
    ts.forEachChild(node, (child) => {
      if (!isDeclaredMethodBoundary(child)) {
        walk(child);
      }
    });
  };

  walk(body);
  return complexity;
}

function decisionDelta(node: ts.Node): number {
  if (
    ts.isIfStatement(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isCatchClause(node) ||
    ts.isConditionalExpression(node)
  ) {
    return 1;
  }

  // A `case` clause adds a branch; the `default` clause does not.
  if (ts.isCaseClause(node)) {
    return 1;
  }

  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (
      op === ts.SyntaxKind.AmpersandAmpersandToken ||
      op === ts.SyntaxKind.BarBarToken ||
      op === ts.SyntaxKind.QuestionQuestionToken
    ) {
      return 1;
    }
  }

  return 0;
}
