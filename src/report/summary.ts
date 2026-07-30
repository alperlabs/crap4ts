import { SMELL_DETECTORS } from "../analysis/smells/registry.js";
import { slopScore } from "../analysis/smells/smell-counts.js";
import type { SmellCategory } from "../analysis/smells/smell-detector.js";
import { maxCrap } from "../analysis/crap-analyzer.js";
import type { MethodMetrics } from "../analysis/method-metrics.js";

/**
 * Corpus-level aggregates for a run. The per-category densities are the
 * numbers that separate cohorts in practice: escape hatches track how often
 * the type system is defeated, style residue tracks what unreviewed code
 * leaves behind (stray logging, null-soup fallbacks, blanket try/catch).
 */
export interface ReportSummary {
  methodCount: number;
  totalSlop: number;
  slopPerMethod: number;
  escapeHatchSlop: number;
  escapeHatchPerMethod: number;
  styleSlop: number;
  stylePerMethod: number;
  meanComplexity: number;
  maxCrap: number;
}

export function summarize(metrics: MethodMetrics[]): ReportSummary {
  const methodCount = metrics.length;
  const totalSlop = sum(metrics.map((entry) => entry.slopScore));
  const escapeHatchSlop = categorySlop(metrics, "escape-hatch");
  const styleSlop = categorySlop(metrics, "style");
  return {
    methodCount,
    totalSlop,
    slopPerMethod: perMethod(totalSlop, methodCount),
    escapeHatchSlop,
    escapeHatchPerMethod: perMethod(escapeHatchSlop, methodCount),
    styleSlop,
    stylePerMethod: perMethod(styleSlop, methodCount),
    meanComplexity: perMethod(sum(metrics.map((entry) => entry.complexity)), methodCount),
    maxCrap: maxCrap(metrics),
  };
}

/** Weighted slop contributed by detectors of one category. */
function categorySlop(metrics: MethodMetrics[], category: SmellCategory): number {
  const detectors = SMELL_DETECTORS.filter((detector) => detector.category === category);
  return sum(metrics.map((entry) => slopScore(entry.smells, detectors)));
}

function perMethod(total: number, methodCount: number): number {
  return methodCount === 0 ? 0 : total / methodCount;
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}
