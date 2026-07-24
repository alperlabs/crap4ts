import type ts from "typescript";
import { describeDeclaredMethod } from "./methodExtractors.js";

/**
 * Whether a node begins its own declared method and therefore bounds traversal
 * of an enclosing method. Anonymous inline callbacks are not boundaries — their
 * decision points and smells fold into the enclosing method (as Java lambdas do
 * in the original crap4java).
 */
export function isDeclaredMethodBoundary(node: ts.Node): boolean {
  return describeDeclaredMethod(node) !== null;
}
