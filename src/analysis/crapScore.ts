/**
 * CRAP = CC^2 * (1 - coverage)^3 + CC
 *
 * where `coverage` is a fraction in 0..1 derived from the coverage percentage.
 * Returns null when coverage is unknown.
 */
export function calculateCrap(
  complexity: number,
  coveragePercent: number | null,
): number | null {
  if (coveragePercent === null) {
    return null;
  }
  const cc = complexity;
  const uncovered = 1.0 - coveragePercent / 100.0;
  return cc * cc * uncovered * uncovered * uncovered + cc;
}
