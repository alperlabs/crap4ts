import { sortByCrapDescending } from "../analysis/crapAnalyzer.js";
import { SMELL_DETECTORS } from "../analysis/smells/registry.js";
import { addCounts, emptyCounts, type SmellCounts } from "../analysis/smells/smellCounts.js";
import type { MethodMetrics } from "../analysis/methodMetrics.js";

const WORST_OFFENDER_LIMIT = 5;

/** Render the full CRAP + AI-slop report as text. */
export function formatReport(metrics: MethodMetrics[]): string {
  const sorted = sortByCrapDescending(metrics);
  return crapTable(sorted) + "\n" + slopBreakdown(sorted);
}

function crapTable(sorted: MethodMetrics[]): string {
  const lines = ["CRAP Report", "===========", HEADER, "-".repeat(HEADER.length)];
  for (const entry of sorted) {
    lines.push(rowFor(entry));
  }
  return lines.join("\n") + "\n";
}

function rowFor(entry: MethodMetrics): string {
  return row(
    entry.methodName,
    entry.className,
    String(entry.complexity),
    formatCoverage(entry.coveragePercent),
    formatCrap(entry.crapScore),
    String(entry.slopScore),
  );
}

function slopBreakdown(sorted: MethodMetrics[]): string {
  const totals = totalSmells(sorted);
  const lines = ["AI Slop Breakdown", "================="];
  for (const detector of SMELL_DETECTORS) {
    lines.push(detector.label.padEnd(10) + String(totals[detector.key]).padStart(6));
  }
  lines.push("-".repeat(16));
  lines.push(`Total slop score: ${totalSlop(sorted)} across ${sorted.length} method(s)`);
  return lines.concat(worstOffenderLines(sorted)).join("\n") + "\n";
}

function worstOffenderLines(sorted: MethodMetrics[]): string[] {
  const worst = worstOffenders(sorted);
  if (worst.length === 0) {
    return [];
  }
  const lines = ["", "Sloppiest methods:"];
  for (const entry of worst) {
    lines.push(`  ${String(entry.slopScore).padStart(4)}  ${entry.className}.${entry.methodName}`);
  }
  return lines;
}

function worstOffenders(metrics: MethodMetrics[]): MethodMetrics[] {
  return metrics
    .filter((entry) => entry.slopScore > 0)
    .sort((a, b) => b.slopScore - a.slopScore)
    .slice(0, WORST_OFFENDER_LIMIT);
}

export function totalSmells(metrics: MethodMetrics[]): SmellCounts {
  return metrics.reduce((acc, entry) => addCounts(acc, entry.smells), emptyCounts(SMELL_DETECTORS));
}

function totalSlop(metrics: MethodMetrics[]): number {
  return metrics.reduce((sum, entry) => sum + entry.slopScore, 0);
}

const HEADER = row("Method", "Class", "CC", "Cov%", "CRAP", "Slop");

function row(
  method: string,
  className: string,
  cc: string,
  cov: string,
  crap: string,
  slop: string,
): string {
  return [
    method.padEnd(30),
    className.padEnd(30),
    cc.padStart(4),
    cov.padStart(7),
    crap.padStart(8),
    slop.padStart(6),
  ].join(" ");
}

function formatCoverage(coverage: number | null): string {
  return coverage === null ? "N/A" : `${coverage.toFixed(1)}%`;
}

function formatCrap(score: number | null): string {
  return score === null ? "N/A" : score.toFixed(1);
}
