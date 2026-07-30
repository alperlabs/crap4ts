/**
 * Public library API.
 *
 * Everything the CLI does is reachable programmatically: run `analyze` over a
 * file list with coverage from any {@link CoverageReader}, render the result
 * with a {@link ReportRenderer}, and gate with the baseline helpers. Custom
 * coverage formats plug in by implementing `CoverageReader` and passing the
 * reader via {@link CliApplicationOptions.coverageReaders} (or by calling it
 * directly and handing `analyze` the resulting map).
 */

// Analysis
export { analyze, maxCrap, sortByCrapDescending } from "./analysis/crap-analyzer.js";
export { calculateCrap } from "./analysis/crap-score.js";
export type { MethodMetrics } from "./analysis/method-metrics.js";
export { SMELL_DETECTORS } from "./analysis/smells/registry.js";
export type { SmellDetector, SmellCategory } from "./analysis/smells/smell-detector.js";
export type { SmellFinding } from "./analysis/smells/smell-finding.js";
export { slopScore, countFor, type SmellCounts } from "./analysis/smells/smell-counts.js";

// Coverage
export type { CoverageReader } from "./coverage/coverage-reader.js";
export { FileCoverage, type StatementCoverage } from "./coverage/coverage-data.js";
export {
  COVERAGE_READERS,
  readerNamed,
  readerForReport,
  defaultReportPaths,
} from "./coverage/readers/registry.js";
export { istanbulJsonReader } from "./coverage/readers/istanbul-json-reader.js";
export { lcovReader } from "./coverage/readers/lcov-reader.js";
export { CoverageRunner, DEFAULT_COVERAGE_COMMAND } from "./coverage/coverage-runner.js";
export type { CommandExecutor } from "./coverage/command-executor.js";

// Configuration
export {
  DEFAULT_CONFIG,
  mergeConfig,
  REPORT_FORMAT_NAMES,
  type CrapConfig,
  type ConfigOverrides,
  type CoverageMode,
  type ReportFormatName,
} from "./config/crap-config.js";
export { loadConfigOverrides, CONFIG_FILE_NAME } from "./config/config-file.js";

// Reporting
export type { ReportContext, ReportRenderer } from "./report/report-context.js";
export { REPORT_RENDERERS, rendererNamed } from "./report/registry.js";
export { formatReport, textRenderer } from "./report/report-formatter.js";
export { jsonRenderer } from "./report/json-formatter.js";
export { githubRenderer } from "./report/github-formatter.js";
export { summarize, type ReportSummary } from "./report/summary.js";

// Baseline
export {
  DEFAULT_BASELINE_FILE,
  buildBaseline,
  newViolations,
  readBaselineFile,
  writeBaselineFile,
  baselineKey,
  type Baseline,
} from "./baseline/baseline.js";

// Discovery
export { findSourceFiles, isAnalyzableSource } from "./discovery/source-file-finder.js";
export { changedFiles, changedFilesSince } from "./discovery/changed-file-detector.js";
export { groupByModuleRoot, moduleRootFor } from "./discovery/module-resolver.js";

// CLI embedding
export {
  CliApplication,
  thresholdExceeded,
  messageOf,
  type CliApplicationOptions,
  type Writer,
} from "./cli/cli-application.js";
