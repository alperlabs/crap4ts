import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CliApplication } from "../src/cli/cliApplication.js";
import { CoverageRunner } from "../src/coverage/coverageRunner.js";
import type { CommandExecutor } from "../src/coverage/commandExecutor.js";

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

// Statements on the executable lines of `messy`.
function coverageJson(filePath: string, covered: boolean): string {
  const statementMap: Record<string, unknown> = {};
  const s: Record<string, number> = {};
  const lines = [3, 6, 9, 11];
  lines.forEach((line, i) => {
    statementMap[i] = { start: { line, column: 2 }, end: { line, column: 12 } };
    s[i] = covered ? 1 : 0;
  });
  return JSON.stringify({ [filePath]: { path: filePath, statementMap, s } });
}

/** Fake executor that writes a coverage report instead of running tests. */
function fakeRunner(filePath: string, covered: boolean): CoverageRunner {
  const executor: CommandExecutor = {
    run: async (_command, directory) => {
      mkdirSync(path.join(directory, "coverage"), { recursive: true });
      writeFileSync(
        path.join(directory, "coverage", "coverage-final.json"),
        coverageJson(filePath, covered),
      );
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

  function app(covered: boolean): CliApplication {
    const filePath = path.join(dir, "src", "messy.ts");
    return new CliApplication({
      projectRoot: dir,
      out: (t) => (out += t),
      err: (t) => (err += t),
      coverageRunner: fakeRunner(filePath, covered),
    });
  }

  it("prints usage for --help and exits 0", async () => {
    const code = await app(true).execute(["--help"]);
    expect(code).toBe(0);
    expect(out).toContain("Usage:");
  });

  it("exits 1 on invalid usage", async () => {
    const code = await app(true).execute(["--changed", "x.ts"]);
    expect(code).toBe(1);
    expect(err).toContain("--changed cannot be combined");
    expect(out).toContain("Usage:");
  });

  it("reports no files when src is empty", async () => {
    rmSync(path.join(dir, "src", "messy.ts"));
    const code = await app(true).execute([]);
    expect(code).toBe(0);
    expect(out).toContain("No TypeScript files to analyze.");
  });

  it("exits 2 when CRAP threshold is exceeded", async () => {
    const code = await app(false).execute([]);
    expect(code).toBe(2);
    expect(out).toContain("messy");
    expect(err).toContain("CRAP threshold exceeded");
  });

  it("exits 0 when coverage keeps CRAP under the threshold", async () => {
    const code = await app(true).execute([]);
    expect(code).toBe(0);
    expect(out).toContain("CRAP Report");
    expect(err).not.toContain("threshold exceeded");
  });
});
