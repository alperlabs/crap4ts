import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** Optional-chaining hops (`?.`). */
export const optionalChainSmell: SmellDetector = {
  key: "optionalChains",
  label: "?.",
  category: "style",
  weight: 1,
  advice: "Make the value non-optional upstream instead of chaining around null.",
  matches(node) {
    return hasOptionalChainToken(node);
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
