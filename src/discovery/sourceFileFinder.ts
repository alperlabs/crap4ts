import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

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
  const files: string[] = [];
  walk(src, files);
  files.sort();
  return files;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (entry === "node_modules") {
        continue;
      }
      walk(full, out);
    } else if (isAnalyzableSource(full)) {
      out.push(path.resolve(full));
    }
  }
}
