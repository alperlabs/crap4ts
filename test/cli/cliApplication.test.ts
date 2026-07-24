import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CliApplication } from "../../src/cli/cliApplication.js";
import { CoverageRunner } from "../../src/coverage/coverageRunner.js";
import type { CommandExecutor } from "../../src/coverage/commandExecutor.js";

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

type RunnerMode = "covered" | "uncovered" | "missing";

function coverageJson(filePath: string, covered: boolean): string {
  const statementMap: Record<string, unknown> = {};
  const s: Record<string, number> = {};
  [3, 6, 9, 11].forEach((line, i) => {
    statementMap[i] = { start: { line, column: 2 }, end: { line, column: 12 } };
    s[i] = covered ? 1 : 0;
  });
  return JSON.stringify({ [filePath]: { path: filePath, statementMap, s } });
}

function runnerFor(filePath: string, mode: RunnerMode): CoverageRunner {
  const executor: CommandExecutor = {
    run: async (_command, directory) => {
      if (mode !== "missing") {
        mkdirSync(path.join(directory, "coverage"), { recursive: true });
        writeFileSync(
          path.join(directory, "coverage", "coverage-final.json"),
          coverageJson(filePath, mode === "covered"),
        );
      }
      return 0;
    },
  };
  return new CoverageRunner(executor);
}

describe("CliApplication", () => {
  let dir: string;
  let out: string;
  let err: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-cli-"));
    writeFileSync(path.join(dir, "package.json"), "{}");
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "src", "messy.ts"), SOURCE);
    out = "";
    err = "";
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function app(mode: RunnerMode): CliApplication {
    return new CliApplication({
      projectRoot: dir,
      out: (t) => (out += t),
      err: (t) => (err += t),
      coverageRunner: runnerFor(path.join(dir, "src", "messy.ts"), mode),
    });
  }

  it("prints usage for --help and exits 0", async () => {
    expect(await app("covered").execute(["--help"])).toBe(0);
    expect(out).toContain("Usage:");
  });

  it("exits 1 on invalid usage", async () => {
    expect(await app("covered").execute(["--changed", "x.ts"])).toBe(1);
    expect(err).toContain("--changed cannot be combined");
    expect(out).toContain("Usage:");
  });

  it("reports no files when src is empty", async () => {
    rmSync(path.join(dir, "src", "messy.ts"));
    expect(await app("covered").execute([])).toBe(0);
    expect(out).toContain("No TypeScript files to analyze.");
  });

  it("exits 2 when CRAP threshold is exceeded", async () => {
    expect(await app("uncovered").execute([])).toBe(2);
    expect(out).toContain("messy");
    expect(err).toContain("CRAP threshold exceeded");
  });

  it("exits 0 when coverage keeps CRAP under the threshold", async () => {
    expect(await app("covered").execute([])).toBe(0);
    expect(out).toContain("CRAP Report");
    expect(err).not.toContain("threshold exceeded");
  });

  it("warns and reports N/A when no coverage report is produced", async () => {
    expect(await app("missing").execute([])).toBe(0);
    expect(err).toContain("coverage report not found");
    expect(out).toContain("N/A");
  });

  it("analyzes explicit file and directory arguments, ignoring bogus ones", async () => {
    expect(await app("covered").execute(["src/messy.ts", ".", "does-not-exist"])).toBe(0);
    expect(out).toContain("messy");
  });

  it("analyzes changed files from git", async () => {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    expect(await app("covered").execute(["--changed"])).toBe(0);
    expect(out).toContain("messy");
  });

  it("writes to stdout/stderr by default", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    try {
      // Default writers and coverage runner; --help and usage-error paths never
      // invoke the runner, so no real coverage command runs.
      const defaults = new CliApplication({ projectRoot: dir });
      expect(await defaults.execute(["--help"])).toBe(0);
      expect(await defaults.execute(["--changed", "x.ts"])).toBe(1);
      // Assert before restoring: mockRestore() clears recorded calls.
      expect(stdout).toHaveBeenCalled();
      expect(stderr).toHaveBeenCalled();
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });
});
