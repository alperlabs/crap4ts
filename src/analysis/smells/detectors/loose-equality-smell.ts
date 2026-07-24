import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

const LOOSE_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

/**
 * Loose equality (`==`, `!=`) comparisons. The deliberate `x == null` idiom
 * (matching both `null` and `undefined`) is exempt.
 */
export const looseEqualitySmell: SmellDetector = {
  key: "looseEquality",
  label: "loose-eq",
  category: "escape-hatch",
  weight: 2,
  advice: "Use === and !== for predictable comparisons.",
  matches(node) {
    return isLooseComparison(node);
  },
};

function isLooseComparison(node: ts.Node): boolean {
  if (!ts.isBinaryExpression(node) || !LOOSE_OPERATORS.has(node.operatorToken.kind)) {
    return false;
  }
  return !isNullLiteral(node.left) && !isNullLiteral(node.right);
}

function isNullLiteral(expression: ts.Expression): boolean {
  return expression.kind === ts.SyntaxKind.NullKeyword;
}
