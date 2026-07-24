import ts from "typescript";
import { booleanSmell, type SmellDetector } from "../smellDetector.js";

/** `typeof x` value-position checks. */
export const typeofSmell: SmellDetector = {
  key: "typeOf",
  label: "typeof",
  weight: 1,
  count(node) {
    return booleanSmell(ts.isTypeOfExpression(node));
  },
};
