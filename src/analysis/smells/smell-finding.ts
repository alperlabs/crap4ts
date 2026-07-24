import type ts from "typescript";
import type { SmellDetector } from "./smell-detector.js";

/** One concrete smell occurrence: which detector matched, and where. */
export interface SmellFinding {
  readonly detector: SmellDetector;
  readonly file: string;
  /** 1-based line of the matching node. */
  readonly line: number;
}

export function toFinding(detector: SmellDetector, node: ts.Node): SmellFinding {
  const source = node.getSourceFile();
  const { line } = source.getLineAndCharacterOfPosition(node.getStart());
  return { detector, file: source.fileName, line: line + 1 };
}
