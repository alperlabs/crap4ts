import ts from "typescript";
import { type SmellDetector } from "../smell-detector.js";

const SUPPRESSION = /@ts-ignore|@ts-expect-error|@ts-nocheck|eslint-disable/;

/**
 * Compiler and linter suppression comments (`@ts-ignore`, `@ts-expect-error`,
 * `@ts-nocheck`, `eslint-disable*`) — escape hatches that silence the tools
 * instead of fixing the code.
 *
 * The unit of smell is the suppressed node: a statement carrying several
 * stacked suppression comments counts once.
 */
export const suppressionSmell: SmellDetector = {
  key: "suppressions",
  label: "suppress",
  weight: 4,
  advice: "Fix the underlying diagnostic instead of silencing the tool.",
  matches(node) {
    return ownsLeadingComments(node) && leadingComments(node).some(isSuppressionComment);
  },
};

function isSuppressionComment(comment: string): boolean {
  return SUPPRESSION.test(comment);
}

/**
 * A leading comment range is shared by a node and every descendant that starts
 * at the same full position; only the outermost such node owns it, so each
 * suppressed location is counted exactly once.
 */
function ownsLeadingComments(node: ts.Node): boolean {
  return node.parent.getFullStart() !== node.getFullStart();
}

function leadingComments(node: ts.Node): string[] {
  const text = node.getSourceFile().getFullText();
  const ranges = ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [];
  return ranges.map((range) => text.slice(range.pos, range.end));
}
