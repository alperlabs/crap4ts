import { execFileSync } from "node:child_process";
import path from "node:path";
import { isAnalyzableSource } from "./source-file-finder.js";

/** Runs `git status --porcelain` for a repo root and returns stdout. */
export type GitRunner = (root: string) => string;

const defaultGitRunner: GitRunner = (root) =>
  execFileSync("git", ["-C", root, "status", "--porcelain", "--untracked-files=all"], {
    encoding: "utf8",
  });

/**
 * Changed (modified, added, untracked, renamed) analyzable TypeScript files
 * under `<root>/src`, sorted in path order and de-duplicated.
 */
export function changedFilesUnderSrc(root: string, git: GitRunner = defaultGitRunner): string[] {
  const srcPrefix = path.resolve(root, "src") + path.sep;
  const files = git(root)
    .split(/\r?\n/)
    .map((line) => parseStatusLine(root, line))
    .filter((file): file is string => file !== null)
    .filter((file) => isUnderSrc(file, srcPrefix) && isAnalyzableSource(file));
  return [...new Set(files)].sort();
}

function isUnderSrc(file: string, srcPrefix: string): boolean {
  return (file + path.sep).startsWith(srcPrefix);
}

export function parseStatusLine(root: string, line: string): string | null {
  if (line.trim().length < 1 || line.length < 4) {
    return null;
  }
  const pathPart = renameTarget(line.slice(3).trim());
  return path.resolve(root, unquote(pathPart));
}

export function renameTarget(pathPart: string): string {
  const index = pathPart.indexOf(" -> ");
  return index < 0 ? pathPart : pathPart.slice(index + 4);
}

function unquote(value: string): string {
  const quoted = value.length >= 2 && value.startsWith('"') && value.endsWith('"');
  return quoted ? value.slice(1, -1) : value;
}
