import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { FileCoverage, type StatementCoverage } from "../coverage-data.js";
import type { CoverageReader } from "../coverage-reader.js";
import { normalizePath } from "../coverage-parser.js";

/**
 * Reads LCOV tracefiles (`lcov.info`), the format emitted by c8, nyc's lcov
 * reporter, and most non-Istanbul coverage tools. Only `SF`/`DA` records are
 * consumed: each `DA:<line>,<hits>` entry becomes one statement keyed by its
 * line, which mirrors how the Istanbul reader indexes statements.
 */
export const lcovReader: CoverageReader = {
  format: "lcov",
  defaultReportPaths: ["coverage/lcov.info"],
  canRead: (reportPath) => reportPath.endsWith(".info"),
  read: (reportPath) => parseLcov(reportPath),
};

function parseLcov(reportPath: string): Map<string, FileCoverage> {
  if (!existsSync(reportPath)) {
    return new Map();
  }
  return parseRecords(readFileSync(reportPath, "utf8"), path.dirname(reportPath));
}

function parseRecords(text: string, reportDir: string): Map<string, FileCoverage> {
  const result = new Map<string, FileCoverage>();
  let file: string | null = null;
  let statements: StatementCoverage[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("SF:")) {
      file = sourcePath(line.slice(3).trim(), reportDir);
      statements = [];
    } else if (line.startsWith("DA:") && file !== null) {
      appendStatement(statements, line.slice(3));
    } else if (line.trim() === "end_of_record" && file !== null) {
      result.set(file, new FileCoverage(statements));
      file = null;
    }
  }
  return result;
}

/** LCOV `SF` paths may be relative to the tracefile's directory. */
function sourcePath(raw: string, reportDir: string): string {
  return normalizePath(path.isAbsolute(raw) ? raw : path.resolve(reportDir, raw));
}

function appendStatement(statements: StatementCoverage[], record: string): void {
  const [lineText, hitsText] = record.split(",");
  const line = Number(lineText);
  const hits = Number(hitsText);
  if (Number.isFinite(line) && Number.isFinite(hits)) {
    statements.push({ line, covered: hits > 0 });
  }
}
