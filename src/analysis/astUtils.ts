import ts from "typescript";

/**
 * A "declared method" is a named, body-carrying function-like node that we
 * report as its own row: function declarations, class/object methods and
 * accessors, and arrow/function expressions bound to a named variable or
 * property. These are the TypeScript analog of Java's concrete method
 * declarations.
 *
 * Anonymous inline callbacks (`arr.map(x => ...)`) are NOT boundaries: like
 * Java lambdas, their decision points and smells fold into the enclosing
 * method. Constructors and body-less signatures (overloads, `declare`,
 * `abstract`) are excluded.
 */
export function isDeclaredMethodBoundary(node: ts.Node): boolean {
  return describeDeclaredMethod(node) !== null;
}

export interface DeclaredMethod {
  name: string;
  /** The body (Block) or concise expression body to analyze. */
  body: ts.Node;
  /** The full declaration node, used for signature-level smell counting. */
  declaration: ts.Node;
}

export function describeDeclaredMethod(node: ts.Node): DeclaredMethod | null {
  if (ts.isFunctionDeclaration(node)) {
    if (!node.body || !node.name) {
      return null;
    }
    return { name: node.name.text, body: node.body, declaration: node };
  }

  if (ts.isMethodDeclaration(node)) {
    if (!node.body) {
      return null;
    }
    return { name: propertyName(node.name), body: node.body, declaration: node };
  }

  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
    if (!node.body) {
      return null;
    }
    const prefix = ts.isGetAccessorDeclaration(node) ? "get " : "set ";
    return { name: prefix + propertyName(node.name), body: node.body, declaration: node };
  }

  // const foo = () => {...}  /  const foo = function () {...}
  if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
    const fn = functionInitializer(node.initializer);
    if (fn) {
      return { name: node.name.text, body: fn.body, declaration: node };
    }
  }

  // { foo: () => {...} }  or  class { foo = () => {...} }
  if (ts.isPropertyAssignment(node) || ts.isPropertyDeclaration(node)) {
    const init = ts.isPropertyAssignment(node) ? node.initializer : node.initializer;
    const fn = functionInitializer(init);
    if (fn) {
      return { name: propertyName(node.name), body: fn.body, declaration: node };
    }
  }

  return null;
}

function functionInitializer(
  init: ts.Expression | undefined,
): ts.ArrowFunction | ts.FunctionExpression | null {
  if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && init.body) {
    return init;
  }
  return null;
}

function propertyName(name: ts.PropertyName | ts.BindingName): string {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) {
    return name.text;
  }
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  if (ts.isComputedPropertyName(name)) {
    return name.getText();
  }
  return name.getText();
}

/** The class/interface name enclosing a node, if any. */
export function enclosingClassName(node: ts.Node): string | null {
  if (
    (ts.isClassDeclaration(node) ||
      ts.isClassExpression(node) ||
      ts.isInterfaceDeclaration(node)) &&
    node.name
  ) {
    return node.name.text;
  }
  return null;
}

export function scriptKindFor(fileName: string): ts.ScriptKind {
  if (fileName.endsWith(".tsx")) {
    return ts.ScriptKind.TSX;
  }
  if (fileName.endsWith(".jsx")) {
    return ts.ScriptKind.JSX;
  }
  if (fileName.endsWith(".js") || fileName.endsWith(".mjs") || fileName.endsWith(".cjs")) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}
