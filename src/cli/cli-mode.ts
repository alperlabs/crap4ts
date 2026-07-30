import type { ConfigOverrides } from "../config/crap-config.js";

/** Which files a run analyzes. */
export type FileSelection =
  | { kind: "all" }
  | { kind: "changed" }
  | { kind: "changed-since"; ref: string }
  | { kind: "files"; paths: string[] };

export interface AnalyzeArguments {
  command: "analyze";
  selection: FileSelection;
  /** Settings taken from flags, layered on top of the config file. */
  overrides: ConfigOverrides;
  /** Explicit `--config` path; null uses the default lookup order. */
  configPath: string | null;
  /** Write the baseline file from this run instead of gating against it. */
  writeBaseline: boolean;
}

/** A fully parsed CLI invocation. */
export type CliArguments = { command: "help" } | { command: "version" } | AnalyzeArguments;
