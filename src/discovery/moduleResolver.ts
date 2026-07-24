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
  const normalized = path.resolve(file);
  let current = isDirectory(normalized) ? normalized : path.dirname(normalized);

  while (current.startsWith(root)) {
    if (existsSync(path.join(current, "package.json"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return root;
}

/**
 * Group files by their module root, preserving first-seen module order.
 */
export function groupByModuleRoot(
  projectRoot: string,
  files: string[],
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const file of files) {
    const moduleRoot = moduleRootFor(projectRoot, file);
    const bucket = grouped.get(moduleRoot);
    if (bucket) {
      bucket.push(file);
    } else {
      grouped.set(moduleRoot, [file]);
    }
  }
  return grouped;
}

function isDirectory(candidate: string): boolean {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}
