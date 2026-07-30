import { readFileSync } from "node:fs";
import { isRecord } from "../shared/records.js";

/**
 * The version of the running crap4ts package, read from the package.json two
 * levels above this module (the same location in a dev checkout and in the
 * published `dist/` layout). Returns "unknown" when the manifest is missing
 * or malformed rather than failing a `--version` call.
 */
export function packageVersion(manifestUrl: URL = defaultManifestUrl()): string {
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifestUrl, "utf8"));
    return versionOf(parsed);
  } catch {
    return "unknown";
  }
}

function defaultManifestUrl(): URL {
  return new URL("../../package.json", import.meta.url);
}

function versionOf(manifest: unknown): string {
  if (!isRecord(manifest)) {
    return "unknown";
  }
  return typeof manifest.version === "string" ? manifest.version : "unknown";
}
