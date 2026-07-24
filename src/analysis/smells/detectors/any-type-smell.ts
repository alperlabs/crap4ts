import ts from "typescript";
import { booleanSmell, type SmellDetector } from "../smell-detector.js";

/** `any` type annotations (`: any`, `as any`, `Array<any>`, ...). */
export const anyTypeSmell: SmellDetector = {
  key: "anyTypes",
  label: "any",
  weight: 3,
  count(node) {
    return booleanSmell(node.kind === ts.SyntaxKind.AnyKeyword);
  },
};
