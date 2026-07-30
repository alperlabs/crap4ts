/** Report renderer names accepted by `--format` and the config file. */
export type ReportFormatName = "text" | "json" | "github";

export const REPORT_FORMAT_NAMES: readonly ReportFormatName[] = ["text", "json", "github"];

/**
 * How coverage data is obtained:
 * - `run`: delete stale reports and run the coverage command (default)
 * - `file`: read an existing report from `coverageFile` without running anything
 * - `off`: skip coverage entirely; coverage and CRAP report as N/A
 */
export type CoverageMode = "run" | "file" | "off";

/** Fully resolved runtime configuration: defaults <- config file <- CLI flags. */
export interface CrapConfig {
  /** Maximum allowed CRAP score; anything above fails the gate. */
  threshold: number;
  /** Report renderer to use for output. */
  format: ReportFormatName;
  coverageMode: CoverageMode;
  /** Command run per module to (re)generate coverage in `run` mode. */
  coverageCommand: readonly string[];
  /** Existing report path (project-root relative or absolute), `file` mode. */
  coverageFile: string | null;
  /** Coverage reader name; null auto-detects from the report file name. */
  coverageFormat: string | null;
  /** Directories (relative to a root) searched for TypeScript sources. */
  sourceRoots: readonly string[];
  /** Baseline file for ratchet mode; null disables baseline comparison. */
  baselineFile: string | null;
}

export const DEFAULT_CONFIG: CrapConfig = {
  threshold: 8.0,
  format: "text",
  coverageMode: "run",
  coverageCommand: ["npm", "test"],
  coverageFile: null,
  coverageFormat: null,
  sourceRoots: ["src"],
  baselineFile: null,
};

/** A sparse layer of settings, from the config file or CLI flags. */
export type ConfigOverrides = Partial<CrapConfig>;

/** Apply `overrides` on top of `base`, ignoring undefined entries. */
export function mergeConfig(base: CrapConfig, overrides: ConfigOverrides): CrapConfig {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      Object.assign(merged, { [key]: value });
    }
  }
  return merged;
}
