import {
  SMELL_KEYS,
  SMELL_LABELS,
  emptySmells,
  addSmells,
} from "../analysis/aiSmells.js";
import { sortByCrapDescending } from "../analysis/crapAnalyzer.js";
import type { MethodMetrics } from "../analysis/methodMetrics.js";

/** Render the full CRAP + AI-slop report as text. */
export function formatReport(metrics: MethodMetrics[]): string {
  const sorted = sortByCrapDescending(metrics);
  return crapTable(sorted) + "\n" + slopBreakdown(sorted);
}

function crapTable(sorted: MethodMetrics[]): string {
  const header = row("Method", "Class", "CC", "Cov%", "CRAP", "Slop");
  const separator = "-".repeat(header.length);

  const lines = [
    "CRAP Report",
    "===========",
    header,
    separator,
  ];

  for (const entry of sorted) {
    lines.push(
      row(
        entry.methodName,
        entry.className,
        String(entry.complexity),
        formatCoverage(entry.coveragePercent),
        formatCrap(entry.crapScore),
        String(entry.slopScore),
      ),
    );
  }

  return lines.join("\n") + "\n";
}

function slopBreakdown(sorted: MethodMetrics[]): string {
  const totals = sorted.reduce(
    (acc, entry) => addSmells(acc, entry.smells),
    emptySmells(),
  );

  const lines = ["AI Slop Breakdown", "================="];
  for (const key of SMELL_KEYS) {
    lines.push(`${SMELL_LABELS[key].padEnd(10)}${String(totals[key]).padStart(6)}`);
  }

  const totalSlop = sorted.reduce((sum, entry) => sum + entry.slopScore, 0);
  lines.push("-".repeat(16));
  lines.push(`Total slop score: ${totalSlop} across ${sorted.length} method(s)`);

  const worst = worstOffenders(sorted, 5);
  if (worst.length > 0) {
    lines.push("");
    lines.push("Sloppiest methods:");
    for (const entry of worst) {
      lines.push(`  ${entry.slopScore.toString().padStart(4)}  ${entry.className}.${entry.methodName}`);
    }
  }

  return lines.join("\n") + "\n";
}

function worstOffenders(metrics: MethodMetrics[], limit: number): MethodMetrics[] {
  return [...metrics]
    .filter((entry) => entry.slopScore > 0)
    .sort((a, b) => b.slopScore - a.slopScore)
    .slice(0, limit);
}

function row(
  method: string,
  className: string,
  cc: string,
  cov: string,
  crap: string,
  slop: string,
): string {
  return (
    method.padEnd(30) +
    " " +
    className.padEnd(30) +
    " " +
    cc.padStart(4) +
    " " +
    cov.padStart(7) +
    " " +
    crap.padStart(8) +
    " " +
    slop.padStart(6)
  );
}

function formatCoverage(coverage: number | null): string {
  if (coverage === null) {
    return "N/A";
  }
  return `${coverage.toFixed(1)}%`;
}

function formatCrap(score: number | null): string {
  if (score === null) {
    return "N/A";
  }
  return score.toFixed(1);
}
