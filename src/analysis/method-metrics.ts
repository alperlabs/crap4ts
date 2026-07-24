import type { SmellCounts } from "./smells/smell-counts.js";
import type { SmellFinding } from "./smells/smell-finding.js";

/** A single report row: method identity, complexity, coverage, CRAP, and slop. */
export interface MethodMetrics {
  /** Absolute or label path of the source file. */
  file: string;
  methodName: string;
  className: string;
  /** 1-based start line of the method declaration. */
  startLine: number;
  complexity: number;
  /** Coverage percentage in 0..100, or null when unknown. */
  coveragePercent: number | null;
  /** CRAP score, or null when coverage is unknown. */
  crapScore: number | null;
  smells: SmellCounts;
  /** Located smell occurrences backing the counts. */
  findings: readonly SmellFinding[];
  /** Weighted AI-slop aggregate for the method. */
  slopScore: number;
}
