import type ts from "typescript";
import { nodesWithin } from "../parsing/method-traversal.js";
import { SMELL_DETECTORS } from "./registry.js";
import type { SmellCounts } from "./smell-counts.js";
import type { SmellDetector } from "./smell-detector.js";

/**
 * Count AI-slop smells across a declared method's declaration node (so
 * parameter and return types are included), without descending into nested
 * declared methods. One entry per registered detector: how many of the
 * method's nodes it matches.
 */
export function countSmells(
  declaration: ts.Node,
  detectors: readonly SmellDetector[] = SMELL_DETECTORS,
): SmellCounts {
  const nodes = nodesWithin(declaration);
  return Object.fromEntries(
    detectors.map((detector) => [detector.key, countMatches(detector, nodes)]),
  );
}

function countMatches(detector: SmellDetector, nodes: readonly ts.Node[]): number {
  return nodes.filter((node) => detector.matches(node)).length;
}
