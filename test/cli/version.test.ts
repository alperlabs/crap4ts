import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { packageVersion } from "../../src/cli/version.js";

function manifestUrl(content: string): URL {
  const dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-version-"));
  const file = path.join(dir, "package.json");
  writeFileSync(file, content);
  return pathToFileURL(file);
}

describe("packageVersion", () => {
  it("reads the version of the real package by default", () => {
    // when
    const actual = packageVersion();

    // then
    expect(actual).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("reads a version string from the given manifest", () => {
    // when
    const actual = packageVersion(manifestUrl(JSON.stringify({ version: "9.9.9" })));

    // then
    expect(actual).toBe("9.9.9");
  });

  it("degrades to unknown for missing, malformed, or version-less manifests", () => {
    // when
    const missing = packageVersion(pathToFileURL("/does/not/exist/package.json"));
    const malformed = packageVersion(manifestUrl("{nope"));
    const nonObject = packageVersion(manifestUrl('"just a string"'));
    const versionless = packageVersion(manifestUrl(JSON.stringify({ name: "x" })));
    const wrongType = packageVersion(manifestUrl(JSON.stringify({ version: 5 })));

    // then
    expect([missing, malformed, nonObject, versionless, wrongType]).toEqual([
      "unknown",
      "unknown",
      "unknown",
      "unknown",
      "unknown",
    ]);
  });
});
