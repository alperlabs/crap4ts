import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const IGNORED_DIRECTORIES: ReadonlySet<string> = new Set(["node_modules"]);

/** True for `.ts`/`.tsx` files, excluding declaration files. */
export function isAnalyzableSource(filePath: string): boolean {
  if (filePath.endsWith(".d.ts")) {
    return false;
  }
  return filePath.endsWith(".ts") || filePath.endsWith(".tsx");
}

/**
 * All analyzable TypeScript files under `<root>/src`, sorted in path order.
 * Returns an empty list when no `src` directory exists.
 */
export function findSourceFilesUnderSrc(root: string): string[] {
  const src = path.join(root, "src");
  if (!existsSync(src)) {
    return [];
  }
  return collectFrom(src).sort();
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
