import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseCoverage, normalizePath } from "../coverage/coverageParser.js";
import { FileCoverage } from "../coverage/coverageData.js";
import { calculateCrap } from "./crapScore.js";
import { parseMethods } from "./parsing/typeScriptMethodParser.js";
import { SMELL_DETECTORS } from "./smells/registry.js";
import { slopScore } from "./smells/smellCounts.js";
import type { MethodDescriptor } from "./methodDescriptor.js";
import type { MethodMetrics } from "./methodMetrics.js";

/**
 * Analyze a set of source files against a coverage report, producing one
 * MethodMetrics row per concrete method, sorted worst-CRAP first.
 */
export function analyze(files: string[], coverageJsonPath: string | null): MethodMetrics[] {
  const coverage = parseCoverage(coverageJsonPath);
  const metrics = files.flatMap((file) => analyzeFile(file, coverage));
  return sortByCrapDescending(metrics);
}

function analyzeFile(file: string, coverage: Map<string, FileCoverage>): MethodMetrics[] {
  const absolute = path.resolve(file);
  if (!existsSync(absolute)) {
    return [];
  }
  const source = readFileSync(absolute, "utf8");
  const fileCoverage = coverage.get(normalizePath(absolute));
  return parseMethods(absolute, source).map((method) => toMetrics(method, fileCoverage));
}

function toMetrics(
  method: MethodDescriptor,
  fileCoverage: FileCoverage | undefined,
): MethodMetrics {
  const coveragePercent = coverageFor(method, fileCoverage);
  return {
    methodName: method.name,
    className: method.className,
    complexity: method.complexity,
    coveragePercent,
    crapScore: calculateCrap(method.complexity, coveragePercent),
    smells: method.smells,
    slopScore: slopScore(method.smells, SMELL_DETECTORS),
  };
}

function coverageFor(
  method: MethodDescriptor,
  fileCoverage: FileCoverage | undefined,
): number | null {
  return fileCoverage?.percentForRange(method.startLine, method.endLine) ?? null;
}

/** Sort by CRAP descending, with null (N/A) rows last. */
export function sortByCrapDescending(metrics: MethodMetrics[]): MethodMetrics[] {
  return [...metrics].sort((a, b) => crapRank(b.crapScore) - crapRank(a.crapScore));
}

/** Numeric rank so that `null` always sorts after any real score. */
function crapRank(score: number | null): number {
  return score ?? Number.MIN_SAFE_INTEGER;
}

/** Largest numeric CRAP score, or 0 when there are none. */
export function maxCrap(metrics: MethodMetrics[]): number {
  const scores = metrics.map((metric) => metric.crapScore ?? 0);
  return scores.reduce((max, score) => Math.max(max, score), 0);
}
