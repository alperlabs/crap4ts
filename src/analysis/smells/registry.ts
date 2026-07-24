import type { SmellDetector } from "./smell-detector.js";
import { guardSmell } from "./detectors/guard-smell.js";
import { instanceofSmell } from "./detectors/instanceof-smell.js";
import { typeofSmell } from "./detectors/typeof-smell.js";
import { anyTypeSmell } from "./detectors/any-type-smell.js";
import { nonNullSmell } from "./detectors/non-null-smell.js";
import { asCastSmell } from "./detectors/as-cast-smell.js";
import { optionalChainSmell } from "./detectors/optional-chain-smell.js";
import { nullishCoalescingSmell } from "./detectors/nullish-coalescing-smell.js";
import { tryCatchSmell } from "./detectors/try-catch-smell.js";
import { emptyCatchSmell } from "./detectors/empty-catch-smell.js";
import { consoleSmell } from "./detectors/console-smell.js";
import { suppressionSmell } from "./detectors/suppression-smell.js";
import { looseEqualitySmell } from "./detectors/loose-equality-smell.js";
import { varSmell } from "./detectors/var-smell.js";

/**
 * The active set of AI-slop heuristics, in report order.
 *
 * To add a new smell, implement a {@link SmellDetector} in
 * `detectors/<name>-smell.ts` and add it to this list. Nothing else needs to
 * change: counting, scoring, and the report all iterate this registry.
 */
export const SMELL_DETECTORS: readonly SmellDetector[] = [
  guardSmell,
  instanceofSmell,
  typeofSmell,
  anyTypeSmell,
  nonNullSmell,
  asCastSmell,
  optionalChainSmell,
  nullishCoalescingSmell,
  tryCatchSmell,
  emptyCatchSmell,
  consoleSmell,
  suppressionSmell,
  looseEqualitySmell,
  varSmell,
];
