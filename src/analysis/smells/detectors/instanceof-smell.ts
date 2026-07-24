import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** `x instanceof Foo` expressions. */
export const instanceofSmell: SmellDetector = {
  key: "instanceOf",
  label: "instof",
  category: "style",
  weight: 1,
  advice: "Prefer polymorphism or discriminated unions over instanceof checks.",
  matches(node) {
    return isInstanceOf(node);
  },
};

function isInstanceOf(node: ts.Node): boolean {
  return ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword;
}
