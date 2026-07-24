import ts from "typescript";
import { booleanSmell, type SmellDetector } from "../smell-detector.js";

/** Optional-chaining hops (`?.`). */
export const optionalChainSmell: SmellDetector = {
  key: "optionalChains",
  label: "?.",
  weight: 1,
  count(node) {
    return booleanSmell(hasOptionalChainToken(node));
  },
};

function hasOptionalChainToken(node: ts.Node): boolean {
  if (
    ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node) ||
    ts.isCallExpression(node)
  ) {
    return node.questionDotToken !== undefined;
  }
  return false;
}
