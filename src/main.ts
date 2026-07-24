#!/usr/bin/env node
import process from "node:process";
import { CliApplication } from "./cli/cliApplication.js";

/**
 * Entry point.
 *
 * Exit codes:
 *   0  success, threshold respected (or empty selection / help)
 *   1  invalid CLI usage
 *   2  CRAP threshold exceeded (> 8.0)
 */
async function main(): Promise<void> {
  const app = new CliApplication({ projectRoot: process.cwd() });
  const exitCode = await app.execute(process.argv.slice(2));
  process.exitCode = exitCode;
}

main().catch((error) => {
  process.stderr.write(
    String(error instanceof Error ? (error.stack ?? error.message) : error) + "\n",
  );
  process.exitCode = 1;
});
