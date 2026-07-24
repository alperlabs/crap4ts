import { statSync } from "node:fs";

/** Whether the path exists and is a directory; false for missing paths. */
export function isDirectory(candidate: string): boolean {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}
