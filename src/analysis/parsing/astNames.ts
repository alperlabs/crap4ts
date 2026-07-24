import ts from "typescript";

/** Human-readable name for a declaration's property/binding name node. */
export function declarationName(name: ts.PropertyName | ts.BindingName): string {
  if (ts.isMemberName(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return name.getText();
}

/** The class/interface name introduced by a node, if it introduces one. */
export function enclosingClassName(node: ts.Node): string | undefined {
  if (isNamedContainer(node)) {
    return node.name?.text;
  }
  return undefined;
}

function isNamedContainer(
  node: ts.Node,
): node is ts.ClassDeclaration | ts.ClassExpression | ts.InterfaceDeclaration {
  return (
    ts.isClassDeclaration(node) || ts.isClassExpression(node) || ts.isInterfaceDeclaration(node)
  );
}

const SCRIPT_KINDS: ReadonlyArray<readonly [RegExp, ts.ScriptKind]> = [
  [/\.tsx$/, ts.ScriptKind.TSX],
  [/\.jsx$/, ts.ScriptKind.JSX],
  [/\.(js|mjs|cjs)$/, ts.ScriptKind.JS],
];

/** Script kind inferred from a file name; defaults to `.ts`. */
export function scriptKindFor(fileName: string): ts.ScriptKind {
  const match = SCRIPT_KINDS.find(([pattern]) => pattern.test(fileName));
  return match ? match[1] : ts.ScriptKind.TS;
}

/** Base file name without directories or a TypeScript/JavaScript extension. */
export function fileStem(fileLabel: string): string {
  const parts = fileLabel.split(/[\\/]/);
  const base = parts[parts.length - 1];
  return base.replace(/\.(d\.ts|tsx?|jsx?|mjs|cjs)$/, "");
}
