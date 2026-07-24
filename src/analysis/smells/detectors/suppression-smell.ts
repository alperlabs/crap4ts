import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

const SUPPRESSION = /@ts-ignore|@ts-expect-error|@ts-nocheck|eslint-disable/;

/**
 * Compiler and linter suppression comments (`@ts-ignore`, `@ts-expect-error`,
 * `@ts-nocheck`, `eslint-disable*`) — escape hatches that silence the tools
 * instead of fixing the code.
 */
export const suppressionSmell: SmellDetector = {
  key: "suppressions",
  label: "suppress",
  weight: 4,
  count(node) {
    if (!ownsLeadingComments(node)) {
      return 0;
    }
    return leadingComments(node).filter((comment) => SUPPRESSION.test(comment)).length;
  },
};

/**
 * A leading comment range is shared by a node and every descendant that starts
 * at the same full position; only the outermost such node owns it, so each
 * comment is counted exactly once.
 */
function ownsLeadingComments(node: ts.Node): boolean {
  return node.parent.getFullStart() !== node.getFullStart();
}

function leadingComments(node: ts.Node): string[] {
  const text = node.getSourceFile().getFullText();
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  return ranges.map((range) => text.slice(range.pos, range.end));
}
