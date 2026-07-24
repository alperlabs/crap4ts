import ts from "typescript";
import { isDeclaredMethodBoundary } from "./astUtils.js";
import { emptySmells, type SmellCounts } from "./aiSmells.js";

const GUARD_NAME = /^(is|has|can|should)[A-Z0-9]/;

/**
 * Count AI-slop smells within a declared method's declaration node.
 *
 * Walks the declaration (so parameter/return types are included) but does not
 * descend into nested declared methods — their smells belong to their own row.
 * Anonymous inline callbacks are descended into, so their smells fold in here.
 */
export function countSmells(declaration: ts.Node): SmellCounts {
  const smells = emptySmells();

  const walk = (node: ts.Node): void => {
    tally(node, smells);
    ts.forEachChild(node, (child) => {
      if (!isDeclaredMethodBoundary(child)) {
        walk(child);
      }
    });
  };

  // The declaration node itself is a boundary; walk its subtree directly.
  ts.forEachChild(declaration, (child) => {
    if (!isDeclaredMethodBoundary(child)) {
      walk(child);
    }
  });

  return smells;
}

function tally(node: ts.Node, smells: SmellCounts): void {
  if (node.kind === ts.SyntaxKind.AnyKeyword) {
    smells.anyTypes++;
    return;
  }

  if (ts.isTypePredicateNode(node)) {
    smells.isGuards++;
    return;
  }

  if (ts.isTypeOfExpression(node)) {
    smells.typeOf++;
    return;
  }

  if (ts.isTryStatement(node)) {
    smells.tryCatch++;
    return;
  }

  if (ts.isNonNullExpression(node)) {
    smells.nonNullAssertions++;
    return;
  }

  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    if (node.type.getText() !== "const") {
      smells.asCasts++;
    }
    return;
  }

  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.InstanceOfKeyword) {
      smells.instanceOf++;
    } else if (op === ts.SyntaxKind.QuestionQuestionToken) {
      smells.nullishCoalescing++;
    }
    return;
  }

  if (
    (ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node) ||
      ts.isCallExpression(node)) &&
    node.questionDotToken
  ) {
    smells.optionalChains++;
  }

  if (ts.isCallExpression(node)) {
    if (isConsoleCall(node)) {
      smells.consoleCalls++;
    } else if (isGuardCall(node)) {
      smells.isGuards++;
    }
  }
}

function isConsoleCall(node: ts.CallExpression): boolean {
  const callee = node.expression;
  return (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === "console"
  );
}

function isGuardCall(node: ts.CallExpression): boolean {
  const callee = node.expression;
  if (ts.isIdentifier(callee)) {
    return GUARD_NAME.test(callee.text);
  }
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) {
    return GUARD_NAME.test(callee.name.text);
  }
  return false;
}
