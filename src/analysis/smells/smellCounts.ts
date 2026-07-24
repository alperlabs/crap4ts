import type { SmellDetector } from "./smellDetector.js";

/** Per-method smell tallies, keyed by {@link SmellDetector.key}. */
export type SmellCounts = Record<string, number>;

/** A zeroed count object with one entry per detector. */
export function emptyCounts(detectors: readonly SmellDetector[]): SmellCounts {
  const counts: SmellCounts = {};
  for (const detector of detectors) {
    counts[detector.key] = 0;
  }
  return counts;
}

/** Add `extra` into `target` in place and return `target`. */
export function addCounts(target: SmellCounts, extra: SmellCounts): SmellCounts {
  for (const key of Object.keys(target)) {
    target[key] += extra[key];
  }
  return target;
}

/** Weighted aggregate; higher means more AI-slop-shaped. */
export function slopScore(counts: SmellCounts, detectors: readonly SmellDetector[]): number {
  let total = 0;
  for (const detector of detectors) {
    total += counts[detector.key] * detector.weight;
  }
  return total;
}
