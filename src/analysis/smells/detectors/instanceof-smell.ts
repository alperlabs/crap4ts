import ts from "typescript";
import { booleanSmell, type SmellDetector } from "../smell-detector.js";

/** `x instanceof Foo` expressions. */
export const instanceofSmell: SmellDetector = {
  key: "instanceOf",
  label: "instof",
  weight: 1,
  count(node) {
    return booleanSmell(isInstanceOf(node));
  },
};

function isInstanceOf(node: ts.Node): boolean {
  return ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword;
}
