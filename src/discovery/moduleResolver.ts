import { existsSync, statSync } from "node:fs";
import path from "node:path";

/**
 * The module root that owns a file: the nearest ancestor directory containing
 * a `package.json`, without walking above the project root. Falls back to the
 * project root when no nearer `package.json` exists.
 *
 * This is the TypeScript analog of finding the owning Maven module by walking
 * up to the nearest `pom.xml`.
 */
export function moduleRootFor(projectRoot: string, file: string): string {
  const root = path.resolve(projectRoot);
  return walkUp(startDirectory(file), root) ?? root;
}

function walkUp(from: string, root: string): string | null {
  let current = from;
  while (current !== root) {
    if (hasPackageJson(current)) {
      return current;
    }
    current = path.dirname(current);
  }
  return hasPackageJson(root) ? root : null;
}

function hasPackageJson(dir: string): boolean {
  return existsSync(path.join(dir, "package.json"));
}

function startDirectory(file: string): string {
  const normalized = path.resolve(file);
  return isDirectory(normalized) ? normalized : path.dirname(normalized);
}

/** Group files by their module root, preserving first-seen module order. */
export function groupByModuleRoot(projectRoot: string, files: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const file of files) {
    const moduleRoot = moduleRootFor(projectRoot, file);
    appendTo(grouped, moduleRoot, file);
  }
  return grouped;
}

function appendTo(grouped: Map<string, string[]>, key: string, value: string): void {
  const bucket = grouped.get(key);
  if (bucket) {
    bucket.push(value);
  } else {
    grouped.set(key, [value]);
  }
}

function isDirectory(candidate: string): boolean {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}
