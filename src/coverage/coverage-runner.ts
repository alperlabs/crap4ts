import { rmSync } from "node:fs";
import path from "node:path";
import type { CommandExecutor } from "./command-executor.js";

/** Default command used to generate coverage for a module. */
export const DEFAULT_COVERAGE_COMMAND: readonly string[] = ["npm", "test"];

/** Location of the Istanbul JSON report, relative to a module root. */
export const COVERAGE_JSON_RELATIVE = "coverage/coverage-final.json";

/**
 * Regenerates coverage for a module: clears the stale `coverage/` directory,
 * then runs the coverage command. The command is expected to emit an Istanbul
 * `coverage-final.json` (e.g. `vitest run --coverage` with the istanbul
 * provider, or `jest --coverage --coverageReporters=json`).
 */
export class CoverageRunner {
  constructor(
    private readonly executor: CommandExecutor,
    private readonly command: readonly string[] = DEFAULT_COVERAGE_COMMAND,
  ) {}

  async generateCoverage(moduleRoot: string): Promise<void> {
    rmSync(path.join(moduleRoot, "coverage"), { recursive: true, force: true });

    const exit = await this.executor.run([...this.command], moduleRoot);
    if (exit !== 0) {
      throw new Error(`Coverage command failed with exit ${exit}`);
    }
  }
}
