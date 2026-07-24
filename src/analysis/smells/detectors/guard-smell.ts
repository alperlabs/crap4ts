import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

/**
 * Defensive guard ladders: two or more consecutive `if (...) return/throw`
 * clauses. A single early return is idiomatic TypeScript; a stack of them is
 * the hallmark of machine-generated defensive noise. Each clause after the
 * first in a run counts once, so a ladder of N guards scores N - 1.
 *
 * Boolean naming (`isX`, `hasY`) and type predicates are deliberately NOT
 * flagged — well-named predicates are clean code, not slop.
 */
export const guardSmell: SmellDetector = {
  key: "guardLadders",
  label: "guard",
  category: "style",
  weight: 2,
  advice: "Collapse consecutive guard clauses; validate once at the boundary.",
  matches(node) {
    return (
      ts.isIfStatement(node) && isGuardClause(node) && isGuardClauseNode(previousStatement(node))
    );
  },
};

function isGuardClauseNode(node: ts.Statement | undefined): boolean {
  return node !== undefined && ts.isIfStatement(node) && isGuardClause(node);
}

function isGuardClause(node: ts.IfStatement): boolean {
  return node.elseStatement === undefined && isBailOut(soleStatement(node.thenStatement));
}

/** The then-branch's single statement: the statement itself, or a one-statement block's content. */
function soleStatement(statement: ts.Statement): ts.Statement | undefined {
  if (!ts.isBlock(statement)) {
    return statement;
  }
  return statement.statements.length === 1 ? statement.statements[0] : undefined;
}

function isBailOut(statement: ts.Statement | undefined): boolean {
  return (
    statement !== undefined &&
    (ts.isReturnStatement(statement) ||
      ts.isThrowStatement(statement) ||
      ts.isContinueStatement(statement) ||
      ts.isBreakStatement(statement))
  );
}

function previousStatement(node: ts.IfStatement): ts.Statement | undefined {
  if (!ts.isBlock(node.parent) && !ts.isSourceFile(node.parent)) {
    return undefined;
  }
  const statements: readonly ts.Statement[] = node.parent.statements;
  const index = statements.indexOf(node);
  return index > 0 ? statements[index - 1] : undefined;
}
