import { CliMode, type CliArguments } from "./cliMode.js";

/**
 * Parse raw argv into a mode plus file arguments.
 * Throws on invalid usage (e.g. `--changed` combined with explicit files).
 */
export function parseCliArguments(args: string[]): CliArguments {
  if (args.length === 0) {
    return { mode: CliMode.AllSrc, fileArgs: [] };
  }

  if (containsFlag(args, "--help")) {
    return { mode: CliMode.Help, fileArgs: [] };
  }

  const changed = containsFlag(args, "--changed");
  const values = nonFlagArgs(args);
  if (changed && values.length > 0) {
    throw new Error("--changed cannot be combined with file arguments");
  }
  if (changed) {
    return { mode: CliMode.ChangedSrc, fileArgs: [] };
  }
  return { mode: CliMode.ExplicitFiles, fileArgs: values };
}

function containsFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function nonFlagArgs(args: string[]): string[] {
  return args.filter((arg) => !arg.startsWith("--"));
}
