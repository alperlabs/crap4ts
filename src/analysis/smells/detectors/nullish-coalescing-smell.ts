import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** Nullish-coalescing operators (`??`). */
export const nullishCoalescingSmell: SmellDetector = {
  key: "nullishCoalescing",
  label: "??",
  weight: 1,
  matches(node) {
    return isNullish(node);
  },
};

function isNullish(node: ts.Node): boolean {
  return (
    ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
  );
}
