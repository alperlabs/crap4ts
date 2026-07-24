import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** `any` type annotations (`: any`, `as any`, `Array<any>`, ...). */
export const anyTypeSmell: SmellDetector = {
  key: "anyTypes",
  label: "any",
  weight: 3,
  matches(node) {
    return node.kind === ts.SyntaxKind.AnyKeyword;
  },
};
