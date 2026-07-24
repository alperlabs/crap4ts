import { type SmellDetector } from "../smell-detector.js";

/**
 * Project-level smell: the same type-guard helper name (`isRecord`, …) is
 * defined in two or more files. `matches` is unused — findings are attached by
 * {@link annotateDuplicateTypeGuards} after per-file analysis.
 */
export const duplicateTypeGuardSmell: SmellDetector = {
  key: "duplicateTypeGuards",
  label: "dup-guard",
  category: "style",
  weight: 1,
  advice: "Deduplicate copy-pasted type guards into one shared module.",
  matches() {
    return false;
  },
};
