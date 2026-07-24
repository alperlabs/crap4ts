import ts from "typescript";
import { declarationName } from "./ast-names.js";

/** A concrete, body-carrying function extracted from a node. */
export interface DeclaredMethod {
  /** Reported method name. */
  name: string;
  /** The body (block or concise expression) whose complexity is measured. */
  body: ts.Node;
  /** The full declaration node, scanned for signature-level smells. */
  declaration: ts.Node;
}

/**
 * Turns a node into a {@link DeclaredMethod}, or `null` when the node is not a
 * reportable declaration. Extractors are tried in order.
 */
export type MethodExtractor = (node: ts.Node) => DeclaredMethod | null;

const extractFunctionDeclaration: MethodExtractor = (node) => {
  if (!ts.isFunctionDeclaration(node) || !node.body || !node.name) {
    return null;
  }
  return { name: node.name.text, body: node.body, declaration: node };
};

const extractMethod: MethodExtractor = (node) => {
  if (!ts.isMethodDeclaration(node) || !node.body) {
    return null;
  }
  return { name: declarationName(node.name), body: node.body, declaration: node };
};

const extractAccessor: MethodExtractor = (node) => {
  if (!isAccessor(node) || !node.body) {
    return null;
  }
  const prefix = ts.isGetAccessorDeclaration(node) ? "get " : "set ";
  return { name: prefix + declarationName(node.name), body: node.body, declaration: node };
};

const extractVariableFunction: MethodExtractor = (node) => {
  if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) {
    return null;
  }
  return fromInitializer(node.name.text, node.initializer, node);
};

const extractPropertyFunction: MethodExtractor = (node) => {
  if (!ts.isPropertyAssignment(node) && !ts.isPropertyDeclaration(node)) {
    return null;
  }
  return fromInitializer(declarationName(node.name), node.initializer, node);
};

/**
 * The ordered set of method extractors. Registering a new declaration shape is
 * a one-line addition here.
 */
export const METHOD_EXTRACTORS: readonly MethodExtractor[] = [
  extractFunctionDeclaration,
  extractMethod,
  extractAccessor,
  extractVariableFunction,
  extractPropertyFunction,
];

/** First matching extraction, or `null`. */
export function describeDeclaredMethod(node: ts.Node): DeclaredMethod | null {
  for (const extract of METHOD_EXTRACTORS) {
    const method = extract(node);
    if (method) {
      return method;
    }
  }
  return null;
}

function fromInitializer(
  name: string,
  initializer: ts.Expression | undefined,
  declaration: ts.Node,
): DeclaredMethod | null {
  if (initializer && isFunctionLike(initializer) && initializer.body) {
    return { name, body: initializer.body, declaration };
  }
  return null;
}

function isFunctionLike(node: ts.Node): node is ts.ArrowFunction | ts.FunctionExpression {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

function isAccessor(node: ts.Node): node is ts.GetAccessorDeclaration | ts.SetAccessorDeclaration {
  return ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node);
}
