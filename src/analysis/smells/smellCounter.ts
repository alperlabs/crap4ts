import type ts from "typescript";
import { walkWithin } from "../parsing/methodTraversal.js";
import { SMELL_DETECTORS } from "./registry.js";
import { emptyCounts, type SmellCounts } from "./smellCounts.js";
import type { SmellDetector } from "./smellDetector.js";

/**
 * Count AI-slop smells across a declared method's declaration node (so
 * parameter and return types are included), without descending into nested
 * declared methods.
 */
export function countSmells(
  declaration: ts.Node,
  detectors: readonly SmellDetector[] = SMELL_DETECTORS,
): SmellCounts {
  const counts = emptyCounts(detectors);
  walkWithin(declaration, (node) => {
    for (const detector of detectors) {
      counts[detector.key] += detector.count(node);
    }
  });
  return counts;
}
