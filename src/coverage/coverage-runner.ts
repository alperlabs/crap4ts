import { rmSync } from "node:fs";
import path from "node:path";
import type { CommandExecutor } from "./command-executor.js";

/** Default command used to generate coverage for a module. */
export const DEFAULT_COVERAGE_COMMAND: readonly string[] = ["npm", "test"];

/**
 * Regenerates coverage for a module: clears the stale `coverage/` directory,
 * then runs the coverage command. The command is expected to emit a report a
 * registered coverage reader understands (e.g. `vitest run --coverage` with
 * the istanbul provider, or `jest --coverage --coverageReporters=json`).
 */
export class CoverageRunner {
  constructor(private readonly executor: CommandExecutor) {}

  async generateCoverage(
    moduleRoot: string,
    command: readonly string[] = DEFAULT_COVERAGE_COMMAND,
  ): Promise<void> {
    rmSync(path.join(moduleRoot, "coverage"), { recursive: true, force: true });

    const exit = await this.executor.run([...command], moduleRoot);
    if (exit !== 0) {
      throw new Error(`Coverage command failed with exit ${exit}`);
    }
  }
}
