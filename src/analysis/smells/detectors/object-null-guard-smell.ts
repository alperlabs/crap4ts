import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/**
 * The classic untyped JSON guard body:
 * `typeof x === "object" && x !== null` (either operand order).
 *
 * One occurrence is fine; many copies (especially next to duplicated
 * `isRecord` helpers) are a soft AI-slop signal.
 */
export const objectNullGuardSmell: SmellDetector = {
  key: "objectNullGuards",
  label: "obj-null",
  category: "style",
  weight: 1,
  advice: "Parse with a shared schema/helper instead of repeating typeof-object null checks.",
  matches(node) {
    return isObjectNullGuard(node);
  },
};

function isObjectNullGuard(node: ts.Node): boolean {
  if (!isLogicalAnd(node)) {
    return false;
  }
  return (
    isTypeofObjectAndNotNull(node.left, node.right) ||
    isTypeofObjectAndNotNull(node.right, node.left)
  );
}

function isLogicalAnd(node: ts.Node): node is ts.BinaryExpression {
  return (
    ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
  );
}

function isTypeofObjectAndNotNull(typeofSide: ts.Expression, nullSide: ts.Expression): boolean {
  const subject = typeofObjectSubject(typeofSide);
  return subject !== undefined && isNotNullCheck(nullSide, subject);
}

/** `typeof x === "object"` / `"object" === typeof x` → subject identifier text. */
function typeofObjectSubject(expression: ts.Expression): string | undefined {
  if (!isStrictEquality(expression)) {
    return undefined;
  }
  return typeofThenObject(expression) ?? objectThenTypeof(expression);
}

function typeofThenObject(expression: ts.BinaryExpression): string | undefined {
  if (!ts.isTypeOfExpression(expression.left) || !isObjectString(expression.right)) {
    return undefined;
  }
  return identifierText(expression.left.expression);
}

function objectThenTypeof(expression: ts.BinaryExpression): string | undefined {
  if (!isObjectString(expression.left) || !ts.isTypeOfExpression(expression.right)) {
    return undefined;
  }
  return identifierText(expression.right.expression);
}

function isNotNullCheck(expression: ts.Expression, subject: string): boolean {
  if (!isInequality(expression)) {
    return false;
  }
  return comparesSubjectToNull(expression, subject);
}

function comparesSubjectToNull(expression: ts.BinaryExpression, subject: string): boolean {
  return (
    (identifierText(expression.left) === subject && isNullLiteral(expression.right)) ||
    (isNullLiteral(expression.left) && identifierText(expression.right) === subject)
  );
}

function isStrictEquality(node: ts.Expression): node is ts.BinaryExpression {
  return (
    ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
  );
}

function isInequality(node: ts.Expression): node is ts.BinaryExpression {
  if (!ts.isBinaryExpression(node)) {
    return false;
  }
  const op = node.operatorToken.kind;
  return (
    op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken
  );
}

function isObjectString(node: ts.Expression): boolean {
  return ts.isStringLiteral(node) && node.text === "object";
}

function isNullLiteral(node: ts.Expression): boolean {
  return node.kind === ts.SyntaxKind.NullKeyword;
}

function identifierText(node: ts.Expression): string | undefined {
  return ts.isIdentifier(node) ? node.text : undefined;
}
