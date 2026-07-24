import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseCoverage, normalizePath } from "../coverage/coverageParser.js";
import { calculateCrap } from "./crapScore.js";
import { parseMethods } from "./typeScriptMethodParser.js";
import { slopScore } from "./aiSmells.js";
import type { MethodMetrics } from "./methodMetrics.js";

/**
 * Analyze a set of source files against a coverage report, producing one
 * MethodMetrics row per concrete method, sorted worst-CRAP first.
 */
export function analyze(
  files: string[],
  coverageJsonPath: string | null,
): MethodMetrics[] {
  const coverage = parseCoverage(coverageJsonPath);
  const metrics: MethodMetrics[] = [];

  for (const file of files) {
    const absolute = path.resolve(file);
    if (!existsSync(absolute)) {
      continue;
    }
    const source = readFileSync(absolute, "utf8");
    const fileCoverage = coverage.get(normalizePath(absolute));

    for (const method of parseMethods(absolute, source)) {
      const coveragePercent =
        fileCoverage?.percentForRange(method.startLine, method.endLine) ?? null;
      metrics.push({
        methodName: method.name,
        className: method.className,
        complexity: method.complexity,
        coveragePercent,
        crapScore: calculateCrap(method.complexity, coveragePercent),
        smells: method.smells,
        slopScore: slopScore(method.smells),
      });
    }
  }

  return sortByCrapDescending(metrics);
}

/** Sort by CRAP descending, with null (N/A) rows last. */
export function sortByCrapDescending(metrics: MethodMetrics[]): MethodMetrics[] {
  return [...metrics].sort((a, b) => {
    if (a.crapScore === null && b.crapScore === null) {
      return 0;
    }
    if (a.crapScore === null) {
      return 1;
    }
    if (b.crapScore === null) {
      return -1;
    }
    return b.crapScore - a.crapScore;
  });
}

/** Largest numeric CRAP score, or 0 when there are none. */
export function maxCrap(metrics: MethodMetrics[]): number {
  let max = 0;
  for (const metric of metrics) {
    if (metric.crapScore !== null) {
      max = Math.max(max, metric.crapScore);
    }
  }
  return max;
}
