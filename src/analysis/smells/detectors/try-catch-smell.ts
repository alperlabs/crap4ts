import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** try/catch statements. */
export const tryCatchSmell: SmellDetector = {
  key: "tryCatch",
  label: "try",
  category: "style",
  weight: 1,
  advice: "Catch only where you can genuinely handle; let other errors propagate.",
  matches(node) {
    return ts.isTryStatement(node);
  },
};
