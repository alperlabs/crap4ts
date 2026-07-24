import { describe, it, expect } from "vitest";
import { parseCliArguments } from "../../src/cli/cliArgumentsParser.js";
import { CliMode } from "../../src/cli/cliMode.js";

describe("parseCliArguments", () => {
  it("defaults to all-src with no args", () => {
    expect(parseCliArguments([])).toEqual({ mode: CliMode.AllSrc, fileArgs: [] });
  });

  it("recognizes --help even alongside other args", () => {
    expect(parseCliArguments(["--help"]).mode).toBe(CliMode.Help);
    expect(parseCliArguments(["a.ts", "--help"]).mode).toBe(CliMode.Help);
  });

  it("recognizes --changed", () => {
    expect(parseCliArguments(["--changed"]).mode).toBe(CliMode.ChangedSrc);
  });

  it("collects explicit file arguments and ignores unknown flags", () => {
    expect(parseCliArguments(["a.ts", "--verbose", "b.ts"])).toEqual({
      mode: CliMode.ExplicitFiles,
      fileArgs: ["a.ts", "b.ts"],
    });
  });

  it("rejects --changed combined with files", () => {
    expect(() => parseCliArguments(["--changed", "a.ts"])).toThrow(/--changed cannot be combined/);
  });
});
