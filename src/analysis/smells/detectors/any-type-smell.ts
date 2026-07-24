import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** `any` type annotations (`: any`, `as any`, `Array<any>`, ...). */
export const anyTypeSmell: SmellDetector = {
  key: "anyTypes",
  label: "any",
  weight: 3,
  advice: "Replace any with unknown, a generic, or the real type.",
  matches(node) {
    return node.kind === ts.SyntaxKind.AnyKeyword;
  },
};
