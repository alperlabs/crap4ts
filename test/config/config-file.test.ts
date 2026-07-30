import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfigOverrides, CONFIG_FILE_NAME } from "../../src/config/config-file.js";

describe("loadConfigOverrides", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-config-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeConfig(settings: unknown): void {
    writeFileSync(path.join(dir, CONFIG_FILE_NAME), JSON.stringify(settings));
  }

  it("returns empty overrides when no config exists anywhere", () => {
    // when
    const actual = loadConfigOverrides(dir, null);

    // then
    expect(actual).toEqual({});
  });

  it("parses every supported field from crap4ts.config.json", () => {
    writeConfig({
      threshold: 12,
      format: "json",
      coverage: "off",
      coverageCommand: "npx vitest run --coverage",
      coverageFormat: "lcov",
      sourceRoots: ["lib", "app"],
      baseline: "base.json",
    });

    // when
    const actual = loadConfigOverrides(dir, null);

    // then
    expect(actual).toEqual({
      threshold: 12,
      format: "json",
      coverageMode: "off",
      coverageCommand: ["npx", "vitest", "run", "--coverage"],
      coverageFormat: "lcov",
      sourceRoots: ["lib", "app"],
      baselineFile: "base.json",
    });
  });

  it("accepts coverageCommand as an argv array and coverageFile implying file mode", () => {
    writeConfig({ coverageCommand: ["npm", "run", "cov"], coverageFile: "cov/final.json" });

    // when
    const actual = loadConfigOverrides(dir, null);

    // then
    expect(actual.coverageCommand).toEqual(["npm", "run", "cov"]);
    expect(actual.coverageMode).toBe("file");
    expect(actual.coverageFile).toBe("cov/final.json");
  });

  it("reads the crap4ts key from package.json when no config file exists", () => {
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ crap4ts: { threshold: 4 } }));

    // when
    const actual = loadConfigOverrides(dir, null);

    // then
    expect(actual).toEqual({ threshold: 4 });
  });

  it("ignores package.json without a crap4ts object", () => {
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ crap4ts: "nope" }));

    // when
    const actual = loadConfigOverrides(dir, null);

    // then
    expect(actual).toEqual({});
  });

  it("prefers an explicit --config path and requires it to exist", () => {
    writeFileSync(path.join(dir, "custom.json"), JSON.stringify({ threshold: 3 }));

    // when
    const actual = loadConfigOverrides(dir, "custom.json");

    // then
    expect(actual).toEqual({ threshold: 3 });
    expect(() => loadConfigOverrides(dir, "missing.json")).toThrow(/Config file not found/);
  });

  it("rejects unknown keys with the known list", () => {
    writeConfig({ treshold: 9 });

    // then
    expect(() => loadConfigOverrides(dir, null)).toThrow(/Unknown config key "treshold"/);
  });

  it("rejects malformed JSON and non-object configs", () => {
    writeFileSync(path.join(dir, CONFIG_FILE_NAME), "{nope");

    // then
    expect(() => loadConfigOverrides(dir, null)).toThrow(/not valid JSON/);

    writeConfig([1, 2]);
    expect(() => loadConfigOverrides(dir, null)).toThrow(/must be a JSON object/);
  });

  it("rejects wrong value types field by field", () => {
    const bad: Array<[Record<string, unknown>, RegExp]> = [
      [{ threshold: "8" }, /positive number/],
      [{ threshold: -1 }, /positive number/],
      [{ format: "xml" }, /"format" must be one of/],
      [{ coverage: "maybe" }, /"coverage" must be one of/],
      [{ coverageCommand: "" }, /array of strings/],
      [{ coverageCommand: [1] }, /array of strings/],
      [{ coverageFile: "" }, /non-empty string/],
      [{ coverageFormat: 5 }, /non-empty string/],
      [{ sourceRoots: [] }, /array of strings/],
      [{ baseline: 7 }, /non-empty string/],
    ];
    for (const [settings, message] of bad) {
      writeConfig(settings);

      // then
      expect(() => loadConfigOverrides(dir, null), JSON.stringify(settings)).toThrow(message);
    }
  });
});
