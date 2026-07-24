import path from "node:path";
import { sortByCrapDescending } from "../analysis/crap-analyzer.js";
import { SMELL_DETECTORS } from "../analysis/smells/registry.js";
import {
  addCounts,
  countFor,
  emptyCounts,
  type SmellCounts,
} from "../analysis/smells/smell-counts.js";
import type { SmellFinding } from "../analysis/smells/smell-finding.js";
import type { SmellCategory } from "../analysis/smells/smell-detector.js";
import type { MethodMetrics } from "../analysis/method-metrics.js";

const WORST_OFFENDER_LIMIT = 5;

/** Render the full CRAP + AI-slop report as text. */
export function formatReport(metrics: MethodMetrics[]): string {
  const sorted = sortByCrapDescending(metrics);
  return crapTable(sorted) + "\n" + slopBreakdown(sorted) + findingsSection(sorted);
}

/**
 * Every smell occurrence as `file:line  label  advice`, sorted by file then
 * line. Empty when the code is clean.
 */
function findingsSection(metrics: MethodMetrics[]): string {
  const findings = metrics.flatMap((entry) => entry.findings).sort(byFileAndLine);
  if (findings.length === 0) {
    return "";
  }
  const lines = ["", "Findings", "========"];
  for (const finding of findings) {
    lines.push(findingLine(finding));
  }
  return lines.join("\n") + "\n";
}

function findingLine(finding: SmellFinding): string {
  const location = `${relativePath(finding.file)}:${finding.line}`;
  return `${location.padEnd(40)}  ${finding.detector.label.padEnd(10)}  ${finding.detector.advice}`;
}

function relativePath(file: string): string {
  const relative = path.relative(process.cwd(), file);
  return relative.startsWith("..") ? file : relative;
}

function byFileAndLine(a: SmellFinding, b: SmellFinding): number {
  return a.file.localeCompare(b.file) || a.line - b.line;
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

const CATEGORY_HEADINGS: readonly [SmellCategory, string][] = [
  ["escape-hatch", "Escape hatches (strong signals):"],
  ["style", "Style heuristics (soft signals):"],
];

function slopBreakdown(sorted: MethodMetrics[]): string {
  const totals = totalSmells(sorted);
  const lines = ["AI Slop Breakdown", "================="];
  for (const [category, heading] of CATEGORY_HEADINGS) {
    lines.push(heading, ...categoryLines(category, totals));
  }
  lines.push("-".repeat(16));
  lines.push(`Total slop score: ${totalSlop(sorted)} across ${sorted.length} method(s)`);
  return lines.concat(worstOffenderLines(sorted)).join("\n") + "\n";
}

function categoryLines(category: SmellCategory, totals: SmellCounts): string[] {
  return SMELL_DETECTORS.filter((detector) => detector.category === category).map(
    (detector) =>
      "  " + detector.label.padEnd(10) + String(countFor(totals, detector.key)).padStart(6),
  );
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
