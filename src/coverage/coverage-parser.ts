import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { FileCoverage, type StatementCoverage } from "./coverage-data.js";

interface IstanbulPosition {
  line: number;
  column: number;
}

interface IstanbulFileEntry {
  path?: string;
  statementMap?: Record<string, { start: IstanbulPosition; end: IstanbulPosition }>;
  s?: Record<string, number>;
}

type IstanbulReport = Record<string, IstanbulFileEntry>;

/**
 * Parse an Istanbul `coverage-final.json` file into per-file statement
 * coverage, keyed by absolute, normalized file path.
 *
 * Returns an empty map when the file is missing or unreadable, so a missing
 * report degrades to "coverage N/A" rather than failing the run.
 */
export function parseCoverage(coverageJsonPath: string | null): Map<string, FileCoverage> {
  const report = readReport(coverageJsonPath);
  const result = new Map<string, FileCoverage>();
  for (const [key, entry] of Object.entries(report)) {
    const filePath = entry.path ?? key;
    result.set(normalizePath(filePath), new FileCoverage(readStatements(entry)));
  }
  return result;
}

function readReport(coverageJsonPath: string | null): IstanbulReport {
  if (coverageJsonPath === null || !existsSync(coverageJsonPath)) {
    return {};
  }
  return parseJson(readFileSync(coverageJsonPath, "utf8"));
}

function parseJson(text: string): IstanbulReport {
  try {
    return JSON.parse(text) as IstanbulReport;
  } catch {
    return {};
  }
}

function readStatements(entry: IstanbulFileEntry): StatementCoverage[] {
  const statementMap = entry.statementMap ?? {};
  const hits = entry.s ?? {};
  return Object.entries(statementMap)
    .map(([id, location]) => ({ line: location.start.line, covered: hits[id] > 0 }))
    .filter((statement) => Number.isFinite(statement.line));
}

export function normalizePath(filePath: string): string {
  return path.resolve(filePath);
}
