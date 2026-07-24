import ts from "typescript";
import { booleanSmell, type SmellDetector } from "../smell-detector.js";

/** try/catch statements. */
export const tryCatchSmell: SmellDetector = {
  key: "tryCatch",
  label: "try",
  weight: 1,
  count(node) {
    return booleanSmell(ts.isTryStatement(node));
  },
};
