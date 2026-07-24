import ts from "typescript";

/**
 * The simple name being invoked by a call expression:
 *   `foo(...)`      -> "foo"
 *   `obj.foo(...)`  -> "foo"
 * Returns `undefined` for other callee shapes.
 */
export function callTargetName(node: ts.CallExpression): string | undefined {
  const callee = node.expression;
  if (ts.isIdentifier(callee)) {
    return callee.text;
  }
  if (ts.isPropertyAccessExpression(callee)) {
    return callee.name.text;
  }
  return undefined;
}

/** The receiver identifier of a method call: `console.log()` -> "console". */
export function callReceiverName(node: ts.CallExpression): string | undefined {
  const callee = node.expression;
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    return callee.expression.text;
  }
  return undefined;
}
