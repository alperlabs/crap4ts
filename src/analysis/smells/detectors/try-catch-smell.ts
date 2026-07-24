import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** try/catch statements. */
export const tryCatchSmell: SmellDetector = {
  key: "tryCatch",
  label: "try",
  weight: 1,
  matches(node) {
    return ts.isTryStatement(node);
  },
};
