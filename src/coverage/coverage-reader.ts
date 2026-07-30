import type { FileCoverage } from "./coverage-data.js";

/**
 * Reads a coverage report file into per-file statement coverage, keyed by
 * absolute, normalized source path.
 *
 * Built-in implementations live in `readers/` and are registered in
 * `readers/registry.ts`. Library consumers can implement this interface to
 * support additional report formats and pass their readers to the
 * application; nothing else needs to change.
 */
export interface CoverageReader {
  /** Stable format name, matched against the `coverageFormat` setting. */
  readonly format: string;
  /** Report locations this reader looks for, relative to a module root. */
  readonly defaultReportPaths: readonly string[];
  /** Whether this reader understands the given report file name. */
  canRead(reportPath: string): boolean;
  /** Parse the report. Malformed input degrades to empty coverage. */
  read(reportPath: string): Map<string, FileCoverage>;
}
