import type ts from "typescript";
import { isDeclaredMethodBoundary } from "./boundaries.js";

/**
 * Visit `root` and every descendant that belongs to the same method, stopping
 * at nested declared methods (which are analyzed as their own rows). Used by
 * both the complexity counter and the smell counter so they agree on exactly
 * which nodes belong to a method.
 */
export function walkWithin(root: ts.Node, visit: (node: ts.Node) => void): void {
  visit(root);
  root.forEachChild((child) => {
    if (!isDeclaredMethodBoundary(child)) {
      walkWithin(child, visit);
    }
  });
}
