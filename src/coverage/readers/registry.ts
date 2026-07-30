import type { CoverageReader } from "../coverage-reader.js";
import { istanbulJsonReader } from "./istanbul-json-reader.js";
import { lcovReader } from "./lcov-reader.js";

/**
 * The active set of coverage report readers, in probe order.
 *
 * To support a new format, implement a {@link CoverageReader} in
 * `readers/<name>-reader.ts` and add it to this list — or, as a library
 * consumer, pass extra readers to the application via
 * `CliApplicationOptions.coverageReaders`.
 */
export const COVERAGE_READERS: readonly CoverageReader[] = [istanbulJsonReader, lcovReader];

/** The reader registered under `format`; throws on an unknown format name. */
export function readerNamed(
  format: string,
  readers: readonly CoverageReader[] = COVERAGE_READERS,
): CoverageReader {
  const reader = readers.find((candidate) => candidate.format === format);
  if (reader === undefined) {
    throw new Error(`Unknown coverage format: ${format} (known: ${names(readers).join(", ")})`);
  }
  return reader;
}

/** The first reader that understands the report file name, or null. */
export function readerForReport(
  reportPath: string,
  readers: readonly CoverageReader[] = COVERAGE_READERS,
): CoverageReader | null {
  return readers.find((candidate) => candidate.canRead(reportPath)) ?? null;
}

/** Every default report location across the given readers, in probe order. */
export function defaultReportPaths(readers: readonly CoverageReader[]): string[] {
  return readers.flatMap((reader) => [...reader.defaultReportPaths]);
}

function names(readers: readonly CoverageReader[]): string[] {
  return readers.map((reader) => reader.format);
}
