import { CliMode, type CliArguments } from "./cli-mode.js";

const HELP_FLAG = "--help";
const CHANGED_FLAG = "--changed";

/**
 * Parse raw argv into a mode plus file arguments.
 * Throws on invalid usage (e.g. `--changed` combined with explicit files).
 */
export function parseCliArguments(args: string[]): CliArguments {
  if (args.length === 0) {
    return mode(CliMode.AllSrc);
  }
  if (args.includes(HELP_FLAG)) {
    return mode(CliMode.Help);
  }
  return parseActionArguments(args);
}

function parseActionArguments(args: string[]): CliArguments {
  const files = args.filter((arg) => !isFlag(arg));
  if (args.includes(CHANGED_FLAG)) {
    return parseChanged(files);
  }
  return { mode: CliMode.ExplicitFiles, fileArgs: files };
}

function parseChanged(files: string[]): CliArguments {
  if (files.length > 0) {
    throw new Error("--changed cannot be combined with file arguments");
  }
  return mode(CliMode.ChangedSrc);
}

function mode(value: CliMode): CliArguments {
  return { mode: value, fileArgs: [] };
}

function isFlag(arg: string): boolean {
  return arg.startsWith("--");
}
