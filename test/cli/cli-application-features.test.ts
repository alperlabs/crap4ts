import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CliApplication } from "../../src/cli/cli-application.js";
import { CoverageRunner } from "../../src/coverage/coverage-runner.js";
import type { CommandExecutor } from "../../src/coverage/command-executor.js";

const SOURCE = [
  "export function messy(a: boolean, b: boolean): number {",
  "  if (a) {",
  "    return 1;",
  "  }",
  "  if (b) {",
  "    return 2;",
  "  }",
  "  while (a) {",
  "    a = false;",
  "  }",
  "  return 0;",
  "}",
].join("\n");

function istanbulJson(filePath: string, covered: boolean): string {
  const statementMap: Record<string, unknown> = {};
  const s: Record<string, number> = {};
  [3, 6, 9, 11].forEach((line, i) => {
    statementMap[i] = { start: { line, column: 2 }, end: { line, column: 12 } };
    s[i] = covered ? 1 : 0;
  });
  return JSON.stringify({ [filePath]: { path: filePath, statementMap, s } });
}

function lcov(filePath: string, covered: boolean): string {
  const hit = covered ? 1 : 0;
  return [
    `SF:${filePath}`,
    `DA:3,${hit}`,
    `DA:6,${hit}`,
    `DA:9,${hit}`,
    `DA:11,${hit}`,
    "end_of_record",
    "",
  ].join("\n");
}

describe("CliApplication features", () => {
  let dir: string;
  let out: string;
  let err: string;
  let commandsRun: string[][];

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-feat-"));
    writeFileSync(path.join(dir, "package.json"), "{}");
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(sourcePath(), SOURCE);
    out = "";
    err = "";
    commandsRun = [];
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function sourcePath(): string {
    return path.join(dir, "src", "messy.ts");
  }

  /** A runner that records commands and writes the given coverage artifact. */
  function runner(artifact: "istanbul" | "lcov" | "none", covered = true): CoverageRunner {
    const executor: CommandExecutor = {
      run: async (command, directory) => {
        commandsRun.push(command);
        if (artifact !== "none") {
          mkdirSync(path.join(directory, "coverage"), { recursive: true });
        }
        if (artifact === "istanbul") {
          writeFileSync(
            path.join(directory, "coverage", "coverage-final.json"),
            istanbulJson(sourcePath(), covered),
          );
        }
        if (artifact === "lcov") {
          writeFileSync(path.join(directory, "coverage", "lcov.info"), lcov(sourcePath(), covered));
        }
        return 0;
      },
    };
    return new CoverageRunner(executor);
  }

  function app(
    artifact: "istanbul" | "lcov" | "none" = "istanbul",
    covered = true,
  ): CliApplication {
    return new CliApplication({
      projectRoot: dir,
      out: (t) => (out += t),
      err: (t) => (err += t),
      coverageRunner: runner(artifact, covered),
    });
  }

  it("prints the package version for --version", async () => {
    // when
    const actual = await app().execute(["--version"]);

    // then
    expect(actual).toBe(0);
    expect(out).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("honors --threshold from the CLI", async () => {
    // when
    const actual = await app("istanbul", false).execute(["--threshold", "100"]);

    // then
    expect(actual).toBe(0);
    expect(err).not.toContain("threshold exceeded");
  });

  it("reads settings from crap4ts.config.json and lets flags win", async () => {
    writeFileSync(
      path.join(dir, "crap4ts.config.json"),
      JSON.stringify({ threshold: 0.5, coverageCommand: "my-cov --json" }),
    );

    // when
    const fromFile = await app().execute([]);
    const flagWins = await app().execute(["--threshold", "100"]);

    // then
    expect(fromFile).toBe(2);
    expect(flagWins).toBe(0);
    expect(commandsRun[0]).toEqual(["my-cov", "--json"]);
  });

  it("exits 1 on a broken config file", async () => {
    writeFileSync(path.join(dir, "crap4ts.config.json"), JSON.stringify({ nope: true }));

    // when
    const actual = await app().execute([]);

    // then
    expect(actual).toBe(1);
    expect(err).toContain('Unknown config key "nope"');
  });

  it("skips coverage entirely with --no-coverage", async () => {
    // when
    const actual = await app("none").execute(["--no-coverage"]);

    // then
    expect(actual).toBe(0);
    expect(commandsRun).toEqual([]);
    expect(out).toContain("N/A");
  });

  it("reads an existing report with --coverage-file without running anything", async () => {
    const report = path.join(dir, "existing.json");
    writeFileSync(report, istanbulJson(sourcePath(), true));

    // when
    const actual = await app("none").execute(["--coverage-file", "existing.json"]);

    // then
    expect(actual).toBe(0);
    expect(commandsRun).toEqual([]);
    expect(out).toContain("100.0%");
  });

  it("warns when the --coverage-file is missing or not understood", async () => {
    // when
    const missing = await app("none").execute(["--coverage-file", "nope.json"]);
    err = "";
    const unknown = await app("none").execute(["--coverage-file", "report.xml"]);

    // then
    expect(missing).toBe(0);
    expect(unknown).toBe(0);
    expect(err).toContain("no coverage reader understands");
  });

  it("warns when file mode comes from config without a file", async () => {
    writeFileSync(path.join(dir, "crap4ts.config.json"), JSON.stringify({ coverage: "file" }));

    // when
    const actual = await app("none").execute([]);

    // then
    expect(actual).toBe(0);
    expect(err).toContain("without a coverage file");
  });

  it("detects an lcov report produced by the coverage command", async () => {
    // when
    const actual = await app("lcov").execute([]);

    // then
    expect(actual).toBe(0);
    expect(out).toContain("100.0%");
  });

  it("forces a reader with --coverage-format", async () => {
    const report = path.join(dir, "trace.info");
    writeFileSync(report, lcov(sourcePath(), true));

    // when
    const actual = await app("none").execute([
      "--coverage-file",
      "trace.info",
      "--coverage-format",
      "lcov",
    ]);

    // then
    expect(actual).toBe(0);
    expect(out).toContain("100.0%");
  });

  it("renders json and github formats", async () => {
    // when
    const json = await app("istanbul", false).execute(["--format", "json", "--threshold", "100"]);
    const jsonOut = out;
    out = "";
    const github = await app("istanbul", false).execute(["--format", "github"]);

    // then
    expect(json).toBe(0);
    expect(JSON.parse(jsonOut).summary.methodCount).toBe(1);
    expect(github).toBe(2);
    expect(out).toContain("::error file=");
  });

  it("writes a baseline with --write-baseline and gates against it afterwards", async () => {
    // when — record today's crap as accepted
    const write = await app("istanbul", false).execute(["--write-baseline"]);
    const baselinePath = path.join(dir, "crap4ts-baseline.json");
    const recorded = JSON.parse(readFileSync(baselinePath, "utf8"));
    // then
    expect(write).toBe(0);
    expect(existsSync(baselinePath)).toBe(true);
    expect(Object.keys(recorded.methods)).toHaveLength(1);

    // when — same code passes against the baseline despite exceeding the threshold
    const gate = await app("istanbul", false).execute(["--baseline", "crap4ts-baseline.json"]);
    // then
    expect(gate).toBe(0);

    // when — a worse method fails the ratchet
    const key = Object.keys(recorded.methods)[0];
    writeFileSync(baselinePath, JSON.stringify({ methods: { [key]: recorded.methods[key] - 1 } }));
    err = "";
    const worse = await app("istanbul", false).execute(["--baseline", "crap4ts-baseline.json"]);
    // then
    expect(worse).toBe(2);
    expect(err).toContain("new or worse than baseline");
    expect(err).toContain("#messy");
  });

  it("exits 1 when the baseline file is missing", async () => {
    // when
    const actual = await app("istanbul", false).execute(["--baseline", "missing.json"]);

    // then
    expect(actual).toBe(1);
    expect(err).toContain("Baseline file not found");
  });

  it("analyzes files changed since a ref", async () => {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    execFileSync("git", ["-C", dir, "config", "user.email", "t@t"], { cwd: dir });
    execFileSync("git", ["-C", dir, "config", "user.name", "t"], { cwd: dir });
    execFileSync("git", ["-C", dir, "add", "."], { cwd: dir });
    execFileSync("git", ["-C", dir, "commit", "-qm", "init"], { cwd: dir });
    writeFileSync(
      path.join(dir, "src", "fresh.ts"),
      "export function fresh(): number {\n  return 1;\n}\n",
    );

    // when
    const actual = await app("none").execute(["--no-coverage", "--changed-since", "HEAD"]);

    // then
    expect(actual).toBe(0);
    expect(out).toContain("fresh");
    expect(out).not.toContain("messy");
  });

  it("analyzes alternate --source-root directories", async () => {
    mkdirSync(path.join(dir, "lib"), { recursive: true });
    writeFileSync(path.join(dir, "lib", "extra.ts"), "export const x = 1;\n");

    // when
    const actual = await app("none").execute(["--no-coverage", "--source-root", "lib"]);

    // then
    expect(actual).toBe(0);
    expect(out).not.toContain("messy");
  });
});
