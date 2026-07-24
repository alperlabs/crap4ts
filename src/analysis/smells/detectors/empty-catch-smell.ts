import ts from "typescript";
import { booleanSmell, type SmellDetector } from "../smell-detector.js";

/** Empty `catch` blocks that swallow errors silently. */
export const emptyCatchSmell: SmellDetector = {
  key: "emptyCatches",
  label: "mute-catch",
  weight: 3,
  count(node) {
    return booleanSmell(ts.isCatchClause(node) && node.block.statements.length === 0);
  },
};
