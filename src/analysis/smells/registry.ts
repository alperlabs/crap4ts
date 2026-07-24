import type { SmellDetector } from "./smellDetector.js";
import { guardSmell } from "./detectors/guardSmell.js";
import { instanceofSmell } from "./detectors/instanceofSmell.js";
import { typeofSmell } from "./detectors/typeofSmell.js";
import { anyTypeSmell } from "./detectors/anyTypeSmell.js";
import { nonNullSmell } from "./detectors/nonNullSmell.js";
import { asCastSmell } from "./detectors/asCastSmell.js";
import { optionalChainSmell } from "./detectors/optionalChainSmell.js";
import { nullishCoalescingSmell } from "./detectors/nullishCoalescingSmell.js";
import { tryCatchSmell } from "./detectors/tryCatchSmell.js";
import { consoleSmell } from "./detectors/consoleSmell.js";

/**
 * The active set of AI-slop heuristics, in report order.
 *
 * To add a new smell, implement a {@link SmellDetector} in
 * `detectors/<name>Smell.ts` and add it to this list. Nothing else needs to
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
  consoleSmell,
];
