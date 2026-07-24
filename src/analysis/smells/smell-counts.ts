import type { SmellDetector } from "./smell-detector.js";

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
    target[key] = (target[key] ?? 0) + (extra[key] ?? 0);
  }
  return target;
}

/** The count for a detector key, treating missing keys as zero. */
export function countFor(counts: SmellCounts, key: string): number {
  return counts[key] ?? 0;
}

/** Weighted aggregate; higher means more AI-slop-shaped. */
export function slopScore(counts: SmellCounts, detectors: readonly SmellDetector[]): number {
  let total = 0;
  for (const detector of detectors) {
    total += (counts[detector.key] ?? 0) * detector.weight;
  }
  return total;
}
