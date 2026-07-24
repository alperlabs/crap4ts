import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { FileCoverage, type StatementCoverage } from "./coverage-data.js";

/**
 * Parse an Istanbul `coverage-final.json` file into per-file statement
 * coverage, keyed by absolute, normalized file path.
 *
 * The JSON is treated as untrusted input and validated structurally: a
 * missing, unreadable, or malformed report degrades to "coverage N/A" rather
 * than failing the run.
 */
export function parseCoverage(coverageJsonPath: string | null): Map<string, FileCoverage> {
  const report = readReport(coverageJsonPath);
  const result = new Map<string, FileCoverage>();
  for (const [key, entry] of Object.entries(report)) {
    if (isRecord(entry)) {
      result.set(normalizePath(filePathOf(entry, key)), new FileCoverage(readStatements(entry)));
    }
  }
  return result;
}

function readReport(coverageJsonPath: string | null): Record<string, unknown> {
  if (coverageJsonPath === null || !existsSync(coverageJsonPath)) {
    return {};
  }
  return parseJson(readFileSync(coverageJsonPath, "utf8"));
}

function parseJson(text: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function filePathOf(entry: Record<string, unknown>, fallback: string): string {
  return typeof entry.path === "string" ? entry.path : fallback;
}

function readStatements(entry: Record<string, unknown>): StatementCoverage[] {
  const statementMap = recordAt(entry, "statementMap");
  const hits = recordAt(entry, "s");
  return Object.entries(statementMap)
    .map(([id, location]) => ({ line: startLine(location), covered: hitCount(hits[id]) > 0 }))
    .filter((statement) => Number.isFinite(statement.line));
}

function startLine(location: unknown): number {
  if (!isRecord(location) || !isRecord(location.start)) {
    return Number.NaN;
  }
  return typeof location.start.line === "number" ? location.start.line : Number.NaN;
}

function hitCount(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function recordAt(entry: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = entry[key];
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizePath(filePath: string): string {
  return path.resolve(filePath);
}
