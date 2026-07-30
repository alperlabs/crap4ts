import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CoverageRunner, DEFAULT_COVERAGE_COMMAND } from "../../src/coverage/coverage-runner.js";
import type { CommandExecutor } from "../../src/coverage/command-executor.js";

describe("CoverageRunner", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-runner-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("clears stale coverage and runs the configured command", async () => {
    mkdirSync(path.join(dir, "coverage"), { recursive: true });
    writeFileSync(path.join(dir, "coverage", "stale.json"), "{}");
    const calls: Array<{ command: string[]; directory: string }> = [];
    const executor: CommandExecutor = {
      run: async (command, directory) => {
        calls.push({ command, directory });
        return 0;
      },
    };

    // when
    await new CoverageRunner(executor).generateCoverage(dir, ["echo", "hi"]);

    // then
    expect(existsSync(path.join(dir, "coverage"))).toBe(false);
    expect(calls).toEqual([{ command: ["echo", "hi"], directory: dir }]);
  });

  it("defaults to `npm test`", async () => {
    let seen: string[] = [];
    const executor: CommandExecutor = {
      run: async (command) => {
        seen = command;
        return 0;
      },
    };

    // when
    await new CoverageRunner(executor).generateCoverage(dir);

    // then
    expect(seen).toEqual([...DEFAULT_COVERAGE_COMMAND]);
  });

  it("throws when the command fails", async () => {
    const executor: CommandExecutor = { run: async () => 1 };

    // when
    const act = new CoverageRunner(executor).generateCoverage(dir);

    // then
    await expect(act).rejects.toThrow(/exit 1/);
  });
});
