import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** `typeof x` value-position checks. */
export const typeofSmell: SmellDetector = {
  key: "typeOf",
  label: "typeof",
  weight: 1,
  matches(node) {
    return ts.isTypeOfExpression(node);
  },
};
