import type ts from "typescript";
import { nodesWithin } from "../parsing/method-traversal.js";
import { SMELL_DETECTORS } from "./registry.js";
import type { SmellCounts } from "./smell-counts.js";
import type { SmellDetector } from "./smell-detector.js";
import { toFinding, type SmellFinding } from "./smell-finding.js";

/**
 * Every smell occurrence in a declared method's declaration node (so parameter
 * and return types are included), without descending into nested declared
 * methods. Findings are the source of truth: they carry the detector, file,
 * and line of each occurrence, in source order; {@link countSmells} is a tally
 * of them.
 */
export function findSmells(
  declaration: ts.Node,
  detectors: readonly SmellDetector[] = SMELL_DETECTORS,
): SmellFinding[] {
  return nodesWithin(declaration).flatMap((node) =>
    detectors
      .filter((detector) => detector.matches(node))
      .map((detector) => toFinding(detector, node)),
  );
}

/** Per-detector tallies of {@link findSmells}, one entry per registered detector. */
export function countSmells(
  declaration: ts.Node,
  detectors: readonly SmellDetector[] = SMELL_DETECTORS,
): SmellCounts {
  const findings = findSmells(declaration, detectors);
  return Object.fromEntries(
    detectors.map((detector) => [detector.key, occurrencesOf(detector, findings)]),
  );
}

function occurrencesOf(detector: SmellDetector, findings: readonly SmellFinding[]): number {
  return findings.filter((finding) => finding.detector === detector).length;
}
