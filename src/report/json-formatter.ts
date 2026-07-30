import { sortByCrapDescending } from "../analysis/crap-analyzer.js";
import type { MethodMetrics } from "../analysis/method-metrics.js";
import type { SmellFinding } from "../analysis/smells/smell-finding.js";
import { relativePath } from "./report-formatter.js";
import { summarize } from "./summary.js";
import type { ReportContext, ReportRenderer } from "./report-context.js";

/**
 * Machine-readable report: a summary block plus one record per method and
 * per finding. This is the format for scripting cohort comparisons — every
 * number in the text report is derivable from it.
 */
export const jsonRenderer: ReportRenderer = {
  name: "json",
  render: (metrics, context) => renderJson(metrics, context),
};

function renderJson(metrics: MethodMetrics[], context: ReportContext): string {
  const sorted = sortByCrapDescending(metrics);
  const report = {
    threshold: context.threshold,
    summary: summarize(sorted),
    methods: sorted.map((entry) => methodRecord(entry, context)),
    findings: sorted
      .flatMap((entry) => [...entry.findings])
      .map((finding) => findingRecord(finding, context)),
  };
  return JSON.stringify(report, null, 2) + "\n";
}

function methodRecord(entry: MethodMetrics, context: ReportContext): Record<string, unknown> {
  return {
    file: relativePath(entry.file, context.projectRoot),
    className: entry.className,
    methodName: entry.methodName,
    startLine: entry.startLine,
    complexity: entry.complexity,
    coveragePercent: entry.coveragePercent,
    crapScore: entry.crapScore,
    slopScore: entry.slopScore,
    smells: entry.smells,
  };
}

function findingRecord(finding: SmellFinding, context: ReportContext): Record<string, unknown> {
  return {
    file: relativePath(finding.file, context.projectRoot),
    line: finding.line,
    smell: finding.detector.key,
    category: finding.detector.category,
    advice: finding.detector.advice,
  };
}
