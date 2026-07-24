/** A single executable statement's coverage, keyed by its starting line. */
export interface StatementCoverage {
  line: number;
  covered: boolean;
}

/** Per-file statement coverage, indexed for line-range lookups. */
export class FileCoverage {
  constructor(private readonly statements: readonly StatementCoverage[]) {}

  /**
   * Coverage percentage (0..100) for statements whose starting line falls
   * within [startLine, endLine], or null when no statements are in range.
   *
   * This mirrors JaCoCo's per-method instruction coverage: the fraction of the
   * method's executable units that ran at least once.
   */
  percentForRange(startLine: number, endLine: number): number | null {
    const inRange = this.statements.filter((s) => within(s.line, startLine, endLine));
    if (inRange.length === 0) {
      return null;
    }
    const covered = inRange.filter((s) => s.covered).length;
    return (covered * 100.0) / inRange.length;
  }
}

function within(line: number, startLine: number, endLine: number): boolean {
  return line >= startLine && line <= endLine;
}
