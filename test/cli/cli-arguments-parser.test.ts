import { describe, it, expect } from "vitest";
import { parseCliArguments } from "../../src/cli/cli-arguments-parser.js";
import { CliMode } from "../../src/cli/cli-mode.js";

describe("parseCliArguments", () => {
  it("defaults to all-src with no args", () => {
    // when
    const actual = parseCliArguments([]);

    // then
    expect(actual).toEqual({ mode: CliMode.AllSrc, fileArgs: [] });
  });

  it("recognizes --help even alongside other args", () => {
    // when
    const alone = parseCliArguments(["--help"]);
    const withFiles = parseCliArguments(["a.ts", "--help"]);

    // then
    expect(alone.mode).toBe(CliMode.Help);
    expect(withFiles.mode).toBe(CliMode.Help);
  });

  it("recognizes --changed", () => {
    // when
    const actual = parseCliArguments(["--changed"]);

    // then
    expect(actual.mode).toBe(CliMode.ChangedSrc);
  });

  it("collects explicit file arguments and ignores unknown flags", () => {
    // when
    const actual = parseCliArguments(["a.ts", "--verbose", "b.ts"]);

    // then
    expect(actual).toEqual({ mode: CliMode.ExplicitFiles, fileArgs: ["a.ts", "b.ts"] });
  });

  it("rejects --changed combined with files", () => {
    // when
    const act = () => parseCliArguments(["--changed", "a.ts"]);

    // then
    expect(act).toThrow(/--changed cannot be combined/);
  });
});
