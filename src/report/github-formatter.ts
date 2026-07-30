import { sortByCrapDescending } from "../analysis/crap-analyzer.js";
import type { MethodMetrics } from "../analysis/method-metrics.js";
import type { SmellFinding } from "../analysis/smells/smell-finding.js";
import { formatReport, relativePath } from "./report-formatter.js";
import type { ReportContext, ReportRenderer } from "./report-context.js";

/**
 * GitHub Actions workflow-command output: `::error` annotations for methods
 * over the CRAP threshold and `::warning` annotations for smell findings,
 * followed by the regular text report. The runner surfaces annotations
 * inline on the pull request diff.
 */
export const githubRenderer: ReportRenderer = {
  name: "github",
  render: (metrics, context) => annotations(metrics, context) + formatReport(metrics, context),
};

function annotations(metrics: MethodMetrics[], context: ReportContext): string {
  const sorted = sortByCrapDescending(metrics);
  const lines = [
    ...sorted.flatMap((entry) => crapErrorLines(entry, context)),
    ...sorted.flatMap((entry) => [...entry.findings]).map((f) => findingWarning(f, context)),
  ];
  return lines.length === 0 ? "" : lines.join("\n") + "\n";
}

function crapErrorLines(entry: MethodMetrics, context: ReportContext): string[] {
  if (entry.crapScore === null || entry.crapScore <= context.threshold) {
    return [];
  }
  return [crapError(entry, entry.crapScore, context)];
}

function crapError(entry: MethodMetrics, crapScore: number, context: ReportContext): string {
  const location = `file=${relativePath(entry.file, context.projectRoot)},line=${entry.startLine}`;
  const score = crapScore.toFixed(1);
  const message =
    `${entry.className}.${entry.methodName} has CRAP ${score} ` +
    `(threshold ${context.threshold.toFixed(1)}, complexity ${entry.complexity})`;
  return `::error ${location},title=CRAP ${score}::${escapeMessage(message)}`;
}

function findingWarning(finding: SmellFinding, context: ReportContext): string {
  const location = `file=${relativePath(finding.file, context.projectRoot)},line=${finding.line}`;
  const title = `slop: ${finding.detector.label}`;
  return `::warning ${location},title=${title}::${escapeMessage(finding.detector.advice)}`;
}

/** Escape per GitHub's workflow-command data encoding. */
function escapeMessage(message: string): string {
  return message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}
