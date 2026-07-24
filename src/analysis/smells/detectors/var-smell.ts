import ts from "typescript";
import { booleanSmell, type SmellDetector } from "../smell-detector.js";

/** Function-scoped `var` declarations instead of `let`/`const`. */
export const varSmell: SmellDetector = {
  key: "varDeclarations",
  label: "var",
  weight: 2,
  count(node) {
    return booleanSmell(
      ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.BlockScoped) === 0,
    );
  },
};
