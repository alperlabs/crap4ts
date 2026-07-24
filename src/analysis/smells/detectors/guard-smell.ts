import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";
import { callTargetName } from "./call-name.js";

const GUARD_NAME = /^(is|has|can|should)[A-Z0-9]/;

/**
 * Guard clutter: `is`/`has`/`can`/`should`-named function calls and
 * user-defined `x is T` type predicates.
 */
export const guardSmell: SmellDetector = {
  key: "isGuards",
  label: "guard",
  weight: 2,
  matches(node) {
    return ts.isTypePredicateNode(node) || isGuardCall(node);
  },
};

function isGuardCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  const name = callTargetName(node);
  return name !== undefined && GUARD_NAME.test(name);
}

/** Exposed for reuse (e.g. by method-name heuristics and tests). */
export function isGuardName(name: string): boolean {
  return GUARD_NAME.test(name);
}
