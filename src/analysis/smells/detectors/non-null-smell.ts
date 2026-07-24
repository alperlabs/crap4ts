import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** Non-null assertions (`x!`). */
export const nonNullSmell: SmellDetector = {
  key: "nonNullAssertions",
  label: "nonNull",
  weight: 2,
  advice: "Handle the null case, or restructure so the value is provably present.",
  matches(node) {
    return ts.isNonNullExpression(node);
  },
};
