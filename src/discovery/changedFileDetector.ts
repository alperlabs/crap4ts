import { execFileSync } from "node:child_process";
import path from "node:path";
import { isAnalyzableSource } from "./sourceFileFinder.js";

/** Runs a command and returns stdout; injectable for testing. */
export type GitRunner = (root: string) => string;

const defaultGitRunner: GitRunner = (root) =>
  execFileSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8" });

/**
 * Changed (modified, added, untracked, renamed) analyzable TypeScript files
 * under `<root>/src`, sorted in path order.
 */
export function changedFilesUnderSrc(root: string, git: GitRunner = defaultGitRunner): string[] {
  const srcPrefix = path.resolve(root, "src") + path.sep;
  const output = git(root);
  const files: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const file = parseStatusLine(root, line);
    if (file !== null && (file + path.sep).startsWith(srcPrefix) && isAnalyzableSource(file)) {
      files.push(file);
    }
  }
  files.sort();
  return [...new Set(files)];
}

export function parseStatusLine(root: string, line: string): string | null {
  if (!line || line.trim().length === 0 || line.length < 4) {
    return null;
  }
  const pathPart = line.slice(3).trim();
  const finalPath = renameTarget(pathPart);
  return path.resolve(root, unquote(finalPath));
}

export function renameTarget(pathPart: string): string {
  const index = pathPart.indexOf(" -> ");
  return index < 0 ? pathPart : pathPart.slice(index + 4);
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}
