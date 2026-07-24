import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/** Function-scoped `var` declarations instead of `let`/`const`. */
export const varSmell: SmellDetector = {
  key: "varDeclarations",
  label: "var",
  category: "escape-hatch",
  weight: 2,
  advice: "Use const (or let) for block-scoped declarations.",
  matches(node) {
    return ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.BlockScoped) === 0;
  },
};
