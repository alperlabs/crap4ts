import type ts from "typescript";
import { isDeclaredMethodBoundary } from "./boundaries.js";

/**
 * `root` and every descendant that belongs to the same method, stopping at
 * nested declared methods (which are analyzed as their own rows). Both the
 * complexity counter and the smell counter count over this list, so they
 * always agree on exactly which nodes belong to a method.
 */
export function nodesWithin(root: ts.Node): ts.Node[] {
  const nodes: ts.Node[] = [root];
  root.forEachChild((child) => {
    if (!isDeclaredMethodBoundary(child)) {
      nodes.push(...nodesWithin(child));
    }
  });
  return nodes;
}
