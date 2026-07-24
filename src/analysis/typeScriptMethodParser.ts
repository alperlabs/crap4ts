import ts from "typescript";
import {
  describeDeclaredMethod,
  enclosingClassName,
  scriptKindFor,
} from "./astUtils.js";
import { countComplexity } from "./complexityCounter.js";
import { countSmells } from "./smellCounter.js";
import type { MethodDescriptor } from "./methodDescriptor.js";

/**
 * Parse a TypeScript source string into the concrete methods it declares, each
 * with cyclomatic complexity and AI-slop smell counts.
 *
 * `fileLabel` is used both to select the script kind (`.ts`/`.tsx`) and to
 * derive a fallback class name for top-level functions.
 */
export function parseMethods(fileLabel: string, source: string): MethodDescriptor[] {
  const sourceFile = ts.createSourceFile(
    fileLabel,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKindFor(fileLabel),
  );

  const fallbackClass = fileStem(fileLabel);
  const methods: MethodDescriptor[] = [];

  const visit = (node: ts.Node, className: string): void => {
    const declared = describeDeclaredMethod(node);
    if (declared) {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const end = sourceFile.getLineAndCharacterOfPosition(Math.max(node.getEnd() - 1, 0));
      methods.push({
        name: declared.name,
        className,
        startLine: start.line + 1,
        endLine: end.line + 1,
        complexity: countComplexity(declared.body),
        smells: countSmells(declared.declaration),
      });
    }

    const nextClassName = enclosingClassName(node) ?? className;
    ts.forEachChild(node, (child) => visit(child, nextClassName));
  };

  ts.forEachChild(sourceFile, (child) => visit(child, fallbackClass));
  return methods;
}

export function fileStem(fileLabel: string): string {
  const base = fileLabel.split(/[\\/]/).pop() ?? fileLabel;
  return base.replace(/\.(d\.ts|tsx?|jsx?|mjs|cjs)$/, "");
}
