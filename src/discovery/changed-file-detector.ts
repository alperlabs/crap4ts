import { execFileSync } from "node:child_process";
import path from "node:path";
import { isAnalyzableSource } from "./source-file-finder.js";

/** Runs a git subcommand for a repo root and returns stdout. */
export type GitRunner = (root: string, args: string[]) => string;

const defaultGitRunner: GitRunner = (root, args) =>
  execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });

/**
 * Changed (modified, added, untracked, renamed) analyzable TypeScript files
 * under the source roots, sorted in path order and de-duplicated.
 */
export function changedFiles(
  root: string,
  sourceRoots: readonly string[],
  git: GitRunner = defaultGitRunner,
): string[] {
  return selectAnalyzable(root, sourceRoots, statusFiles(root, git));
}

/**
 * Analyzable TypeScript files changed since the merge-base with `ref` —
 * committed changes (`git diff ref...HEAD`) plus uncommitted ones — under the
 * source roots, sorted and de-duplicated. This is the PR-shaped selection:
 * `--changed-since origin/main` analyzes exactly what a review would.
 */
export function changedFilesSince(
  root: string,
  ref: string,
  sourceRoots: readonly string[],
  git: GitRunner = defaultGitRunner,
): string[] {
  const committed = git(root, ["diff", "--name-only", `${ref}...HEAD`])
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => path.resolve(root, line));
  return selectAnalyzable(root, sourceRoots, [...committed, ...statusFiles(root, git)]);
}

function statusFiles(root: string, git: GitRunner): string[] {
  return git(root, ["status", "--porcelain", "--untracked-files=all"])
    .split(/\r?\n/)
    .map((line) => parseStatusLine(root, line))
    .filter((file): file is string => file !== null);
}

function selectAnalyzable(root: string, sourceRoots: readonly string[], files: string[]): string[] {
  const prefixes = sourceRoots.map((sourceRoot) => path.resolve(root, sourceRoot) + path.sep);
  const selected = files.filter((file) => isUnderAny(file, prefixes) && isAnalyzableSource(file));
  return [...new Set(selected)].sort();
}

function isUnderAny(file: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => (file + path.sep).startsWith(prefix));
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
