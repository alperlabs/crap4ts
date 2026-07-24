import type { SmellCounts } from "./smells/smell-counts.js";
import type { SmellFinding } from "./smells/smell-finding.js";

/**
 * A concrete function/method extracted from a source file, with its location,
 * cyclomatic complexity, and AI-slop smells (located findings plus tallies).
 */
export interface MethodDescriptor {
  file: string;
  name: string;
  className: string;
  startLine: number;
  endLine: number;
  complexity: number;
  smells: SmellCounts;
  findings: readonly SmellFinding[];
}
