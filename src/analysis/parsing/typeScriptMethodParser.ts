import ts from "typescript";
import { enclosingClassName, fileStem, scriptKindFor } from "./astNames.js";
import { describeDeclaredMethod, type DeclaredMethod } from "./methodExtractors.js";
import { countComplexity } from "../complexity/complexityCounter.js";
import { countSmells } from "../smells/smellCounter.js";
import type { MethodDescriptor } from "../methodDescriptor.js";

/**
 * Parse a TypeScript source string into the concrete methods it declares, each
 * with cyclomatic complexity and AI-slop smell counts.
 *
 * `fileLabel` selects the script kind (`.ts`/`.tsx`) and provides a fallback
 * class name for top-level functions.
 */
export function parseMethods(fileLabel: string, source: string): MethodDescriptor[] {
  const sourceFile = ts.createSourceFile(
    fileLabel,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKindFor(fileLabel),
  );

  const methods: MethodDescriptor[] = [];
  collect(sourceFile, sourceFile, fileStem(fileLabel), methods);
  return methods;
}

function collect(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  className: string,
  methods: MethodDescriptor[],
): void {
  const declared = describeDeclaredMethod(node);
  if (declared) {
    methods.push(toDescriptor(sourceFile, node, declared, className));
  }
  const nextClass = enclosingClassName(node) ?? className;
  node.forEachChild((child) => collect(sourceFile, child, nextClass, methods));
}

function toDescriptor(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  declared: DeclaredMethod,
  className: string,
): MethodDescriptor {
  return {
    name: declared.name,
    className,
    startLine: lineOf(sourceFile, node.getStart(sourceFile)),
    endLine: lineOf(sourceFile, Math.max(node.getEnd() - 1, 0)),
    complexity: countComplexity(declared.body),
    smells: countSmells(declared.declaration),
  };
}

function lineOf(sourceFile: ts.SourceFile, position: number): number {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}
