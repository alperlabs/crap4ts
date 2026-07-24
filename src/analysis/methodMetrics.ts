import type { SmellCounts } from "./smells/smellCounts.js";

/** A single report row: method identity, complexity, coverage, CRAP, and slop. */
export interface MethodMetrics {
  methodName: string;
  className: string;
  complexity: number;
  /** Coverage percentage in 0..100, or null when unknown. */
  coveragePercent: number | null;
  /** CRAP score, or null when coverage is unknown. */
  crapScore: number | null;
  smells: SmellCounts;
  /** Weighted AI-slop aggregate for the method. */
  slopScore: number;
}
