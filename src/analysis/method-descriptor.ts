import type { SmellCounts } from "./smells/smell-counts.js";

/**
 * A concrete function/method extracted from a source file, with its location,
 * cyclomatic complexity, and AI-slop smell counts.
 */
export interface MethodDescriptor {
  name: string;
  className: string;
  startLine: number;
  endLine: number;
  complexity: number;
  smells: SmellCounts;
}
