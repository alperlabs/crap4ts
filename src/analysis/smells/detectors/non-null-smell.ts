import ts from "typescript";
import { booleanSmell, type SmellDetector } from "../smell-detector.js";

/** Non-null assertions (`x!`). */
export const nonNullSmell: SmellDetector = {
  key: "nonNullAssertions",
  label: "nonNull",
  weight: 2,
  count(node) {
    return booleanSmell(ts.isNonNullExpression(node));
  },
};
