import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";
import { isTypeGuardHelperName } from "./type-guard-names.js";

/**
 * One-off runtime type-guard helpers and bare calls to them (`isRecord`,
 * `isPlainObject`, `isObject`, `isString`, …). Soft signal: the name alone is
 * not proof of slop, but AI codegen sprays these heavily.
 *
 * Property calls (`types.isObject`, `Array.isArray`) are ignored — shared
 * utilities used via a namespace are fine.
 */
export const typeGuardHelperSmell: SmellDetector = {
  key: "typeGuardHelpers",
  label: "is-helper",
  category: "style",
  weight: 1,
  advice: "Prefer one shared type-guard (or a schema) over ad-hoc isX helpers.",
  matches(node) {
    return isHelperDefinition(node) || isBareHelperCall(node);
  },
};

function isHelperDefinition(node: ts.Node): boolean {
  return (
    isNamedFunctionHelper(node) || isVariableFunctionHelper(node) || isMemberFunctionHelper(node)
  );
}

function isNamedFunctionHelper(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) &&
    node.name !== undefined &&
    isTypeGuardHelperName(node.name.text)
  );
}

function isVariableFunctionHelper(node: ts.Node): boolean {
  if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) {
    return false;
  }
  if (!isTypeGuardHelperName(node.name.text) || node.initializer === undefined) {
    return false;
  }
  return isFunctionLike(node.initializer);
}

function isMemberFunctionHelper(node: ts.Node): boolean {
  if (isNamedMethodHelper(node)) {
    return node.body !== undefined;
  }
  return isNamedPropertyHelper(node);
}

function isNamedMethodHelper(node: ts.Node): node is ts.MethodDeclaration {
  return (
    ts.isMethodDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    isTypeGuardHelperName(node.name.text)
  );
}

function isNamedPropertyHelper(node: ts.Node): boolean {
  if (!ts.isPropertyDeclaration(node) && !ts.isPropertyAssignment(node)) {
    return false;
  }
  if (!ts.isIdentifier(node.name) || !isTypeGuardHelperName(node.name.text)) {
    return false;
  }
  return node.initializer !== undefined && isFunctionLike(node.initializer);
}

function isBareHelperCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) {
    return false;
  }
  return isTypeGuardHelperName(node.expression.text);
}

function isFunctionLike(node: ts.Node): boolean {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}
