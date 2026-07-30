import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const IGNORED_DIRECTORIES: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
  "coverage",
  "dist",
]);

/** True for `.ts`/`.tsx` files, excluding declaration files. */
export function isAnalyzableSource(filePath: string): boolean {
  if (filePath.endsWith(".d.ts")) {
    return false;
  }
  return filePath.endsWith(".ts") || filePath.endsWith(".tsx");
}

/**
 * All analyzable TypeScript files under the given source roots of `root`,
 * de-duplicated and sorted in path order. Missing roots contribute nothing.
 */
export function findSourceFiles(root: string, sourceRoots: readonly string[]): string[] {
  const files = sourceRoots.flatMap((sourceRoot) => filesUnder(path.join(root, sourceRoot)));
  return [...new Set(files)].sort();
}

function filesUnder(directory: string): string[] {
  return existsSync(directory) ? collectFrom(directory) : [];
}

function collectFrom(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return descendInto(entry.name, full);
    }
    return isAnalyzableSource(full) ? [path.resolve(full)] : [];
  });
}

function descendInto(name: string, full: string): string[] {
  return IGNORED_DIRECTORIES.has(name) ? [] : collectFrom(full);
}
