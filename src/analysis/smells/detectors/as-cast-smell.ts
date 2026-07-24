import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** Type assertions (`x as T`, `<T>x`), excluding the harmless `as const`. */
export const asCastSmell: SmellDetector = {
  key: "asCasts",
  label: "as",
  weight: 1,
  advice: "Let inference or a type guard prove the type instead of asserting it.",
  matches(node) {
    return isMeaningfulCast(node);
  },
};

function isMeaningfulCast(node: ts.Node): node is ts.AsExpression | ts.TypeAssertion {
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    return node.type.getText() !== "const";
  }
  return false;
}
