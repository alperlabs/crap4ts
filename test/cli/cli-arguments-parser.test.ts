import { describe, it, expect } from "vitest";
import { parseCliArguments } from "../../src/cli/cli-arguments-parser.js";
import type { AnalyzeArguments, FileSelection } from "../../src/cli/cli-mode.js";

function expected(overrides: Partial<AnalyzeArguments>): AnalyzeArguments {
  return {
    command: "analyze",
    selection: { kind: "all" },
    overrides: {},
    configPath: null,
    writeBaseline: false,
    ...overrides,
  };
}

/** The parsed invocation, asserted to be an analyze command. */
function analyzed(args: string[]): AnalyzeArguments {
  const parsed = parseCliArguments(args);
  expect(parsed.command).toBe("analyze");
  if (parsed.command !== "analyze") {
    throw new Error("not an analyze command");
  }
  return parsed;
}

function selection(args: string[]): FileSelection {
  return analyzed(args).selection;
}

describe("parseCliArguments", () => {
  it("defaults to all-src with no args", () => {
    // when
    const actual = parseCliArguments([]);

    // then
    expect(actual).toEqual(expected({}));
  });

  it("recognizes --help and --version even alongside other args", () => {
    // when
    const help = parseCliArguments(["a.ts", "--help"]);
    const version = parseCliArguments(["a.ts", "--version"]);

    // then
    expect(help).toEqual({ command: "help" });
    expect(version).toEqual({ command: "version" });
  });

  it("recognizes --changed", () => {
    // when
    const actual = selection(["--changed"]);

    // then
    expect(actual).toEqual({ kind: "changed" });
  });

  it("recognizes --changed-since with its ref", () => {
    // when
    const actual = selection(["--changed-since", "origin/main"]);

    // then
    expect(actual).toEqual({ kind: "changed-since", ref: "origin/main" });
  });

  it("collects explicit file arguments", () => {
    // when
    const actual = parseCliArguments(["a.ts", "b.ts"]);

    // then
    expect(actual).toEqual(expected({ selection: { kind: "files", paths: ["a.ts", "b.ts"] } }));
  });

  it("rejects unknown flags instead of silently analyzing nothing", () => {
    // when
    const act = () => parseCliArguments(["--verbose", "a.ts"]);

    // then
    expect(act).toThrow(/Unknown option: --verbose/);
  });

  it("rejects conflicting selection modes", () => {
    // then
    expect(() => parseCliArguments(["--changed", "a.ts"])).toThrow(/mutually exclusive/);
    expect(() => parseCliArguments(["--changed", "--changed-since", "main"])).toThrow(
      /mutually exclusive/,
    );
  });

  it("parses --threshold into an override", () => {
    // when
    const actual = analyzed(["--threshold", "15.5"]);

    // then
    expect(actual.overrides.threshold).toBe(15.5);
  });

  it("rejects a non-positive or non-numeric threshold", () => {
    // then
    expect(() => parseCliArguments(["--threshold", "zero"])).toThrow(/positive number/);
    expect(() => parseCliArguments(["--threshold", "-3"])).toThrow(/positive number/);
  });

  it("parses --format and rejects unknown names", () => {
    // when
    const actual = analyzed(["--format", "json"]);

    // then
    expect(actual.overrides.format).toBe("json");
    expect(() => parseCliArguments(["--format", "xml"])).toThrow(/--format must be one of/);
  });

  it("parses coverage flags", () => {
    // when
    const off = analyzed(["--no-coverage"]);
    const file = analyzed(["--coverage-file", "coverage/lcov.info"]);
    const command = analyzed(["--coverage-command", "npx vitest run --coverage"]);
    const format = analyzed(["--coverage-format", "lcov"]);

    // then
    expect(off.overrides.coverageMode).toBe("off");
    expect(file.overrides).toMatchObject({
      coverageMode: "file",
      coverageFile: "coverage/lcov.info",
    });
    expect(command.overrides.coverageCommand).toEqual(["npx", "vitest", "run", "--coverage"]);
    expect(format.overrides.coverageFormat).toBe("lcov");
  });

  it("rejects an empty --coverage-command", () => {
    // then
    expect(() => parseCliArguments(["--coverage-command", "   "])).toThrow(/must not be empty/);
  });

  it("collects repeated --source-root values", () => {
    // when
    const actual = analyzed(["--source-root", "lib", "--source-root", "app"]);

    // then
    expect(actual.overrides.sourceRoots).toEqual(["lib", "app"]);
  });

  it("parses baseline and config options", () => {
    // when
    const actual = analyzed([
      "--baseline",
      "crap-baseline.json",
      "--write-baseline",
      "--config",
      "custom.json",
    ]);

    // then
    expect(actual.overrides.baselineFile).toBe("crap-baseline.json");
    expect(actual.writeBaseline).toBe(true);
    expect(actual.configPath).toBe("custom.json");
  });

  it("rejects a value flag with a missing or flag-shaped value", () => {
    // then
    expect(() => parseCliArguments(["--threshold"])).toThrow(/--threshold requires a value/);
    expect(() => parseCliArguments(["--format", "--changed"])).toThrow(/--format requires a value/);
  });
});
