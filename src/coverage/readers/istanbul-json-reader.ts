import type { CoverageReader } from "../coverage-reader.js";
import { parseCoverage } from "../coverage-parser.js";

/** Reads Istanbul `coverage-final.json` reports (vitest/jest/nyc). */
export const istanbulJsonReader: CoverageReader = {
  format: "istanbul",
  defaultReportPaths: ["coverage/coverage-final.json"],
  canRead: (reportPath) => reportPath.endsWith(".json"),
  read: (reportPath) => parseCoverage(reportPath),
};
