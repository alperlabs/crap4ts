import { duplicateTypeGuardSmell } from "./detectors/duplicate-type-guard-smell.js";
import { isTypeGuardHelperName } from "./detectors/type-guard-names.js";
import { SMELL_DETECTORS } from "./registry.js";
import { tallyFindings } from "./smell-counter.js";
import type { SmellFinding } from "./smell-finding.js";
import { slopScore } from "./smell-counts.js";
import type { MethodMetrics } from "../method-metrics.js";

/**
 * When a type-guard helper name is defined in two or more files, attach one
 * {@link duplicateTypeGuardSmell} finding to each defining method and refresh
 * its tallies / slop score.
 */
export function annotateDuplicateTypeGuards(metrics: readonly MethodMetrics[]): MethodMetrics[] {
  const duplicatedNames = helperNamesDefinedInMultipleFiles(metrics);
  if (duplicatedNames.size === 0) {
    return [...metrics];
  }
  return metrics.map((metric) => annotateIfDuplicated(metric, duplicatedNames));
}

function annotateIfDuplicated(
  metric: MethodMetrics,
  duplicatedNames: ReadonlySet<string>,
): MethodMetrics {
  return duplicatedNames.has(metric.methodName) ? withDuplicateFinding(metric) : metric;
}

function helperNamesDefinedInMultipleFiles(metrics: readonly MethodMetrics[]): ReadonlySet<string> {
  const filesByName = collectHelperFiles(metrics);
  const duplicated = new Set<string>();
  for (const [name, files] of filesByName) {
    if (files.size >= 2) {
      duplicated.add(name);
    }
  }
  return duplicated;
}

function collectHelperFiles(metrics: readonly MethodMetrics[]): Map<string, Set<string>> {
  const filesByName = new Map<string, Set<string>>();
  for (const metric of metrics) {
    recordHelperFile(filesByName, metric);
  }
  return filesByName;
}

function recordHelperFile(filesByName: Map<string, Set<string>>, metric: MethodMetrics): void {
  if (!isTypeGuardHelperName(metric.methodName)) {
    return;
  }
  const files = filesByName.get(metric.methodName) ?? new Set<string>();
  files.add(metric.file);
  filesByName.set(metric.methodName, files);
}

function withDuplicateFinding(metric: MethodMetrics): MethodMetrics {
  const finding: SmellFinding = {
    detector: duplicateTypeGuardSmell,
    file: metric.file,
    line: metric.startLine,
  };
  const findings = [...metric.findings, finding];
  const smells = tallyFindings(findings, SMELL_DETECTORS);
  return {
    ...metric,
    findings,
    smells,
    slopScore: slopScore(smells, SMELL_DETECTORS),
  };
}
