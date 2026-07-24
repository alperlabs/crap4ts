import ts from "typescript";
import { booleanSmell, type SmellDetector } from "../smellDetector.js";

/** Type assertions (`x as T`, `<T>x`), excluding the harmless `as const`. */
export const asCastSmell: SmellDetector = {
  key: "asCasts",
  label: "as",
  weight: 1,
  count(node) {
    return booleanSmell(isMeaningfulCast(node));
  },
};

function isMeaningfulCast(node: ts.Node): node is ts.AsExpression | ts.TypeAssertion {
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    return node.type.getText() !== "const";
  }
  return false;
}
