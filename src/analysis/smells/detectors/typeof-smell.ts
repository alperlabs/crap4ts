import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** `typeof x` value-position checks. */
export const typeofSmell: SmellDetector = {
  key: "typeOf",
  label: "typeof",
  category: "style",
  weight: 1,
  advice: "Model the type up front instead of re-checking it at runtime.",
  matches(node) {
    return ts.isTypeOfExpression(node);
  },
};
