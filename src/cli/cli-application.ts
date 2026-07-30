import { existsSync } from "node:fs";
import path from "node:path";
import type { AnalyzeArguments, CliArguments, FileSelection } from "./cli-mode.js";
import { parseCliArguments } from "./cli-arguments-parser.js";
import { USAGE } from "./usage.js";
import { packageVersion } from "./version.js";
import { DEFAULT_CONFIG, mergeConfig, type CrapConfig } from "../config/crap-config.js";
import { loadConfigOverrides } from "../config/config-file.js";
import { findSourceFiles, isAnalyzableSource } from "../discovery/source-file-finder.js";
import { changedFiles, changedFilesSince } from "../discovery/changed-file-detector.js";
import { groupByModuleRoot } from "../discovery/module-resolver.js";
import { isDirectory } from "../discovery/file-system.js";
import { CoverageRunner } from "../coverage/coverage-runner.js";
import { ProcessCommandExecutor } from "../coverage/process-command-executor.js";
import type { CoverageReader } from "../coverage/coverage-reader.js";
import type { FileCoverage } from "../coverage/coverage-data.js";
import {
  COVERAGE_READERS,
  defaultReportPaths,
  readerForReport,
  readerNamed,
} from "../coverage/readers/registry.js";
import { analyze, maxCrap } from "../analysis/crap-analyzer.js";
import { rendererNamed } from "../report/registry.js";
import { formatCrap } from "../report/report-formatter.js";
import {
  DEFAULT_BASELINE_FILE,
  buildBaseline,
  newViolations,
  readBaselineFile,
  writeBaselineFile,
  baselineKey,
  type Baseline,
} from "../baseline/baseline.js";
import type { MethodMetrics } from "../analysis/method-metrics.js";

/** Sink for user-facing text (stdout/stderr, or a buffer in tests). */
export type Writer = (text: string) => void;

export interface CliApplicationOptions {
  projectRoot: string;
  out?: Writer;
  err?: Writer;
  coverageRunner?: CoverageRunner;
  /** Coverage report readers; defaults to the built-in registry. */
  coverageReaders?: readonly CoverageReader[];
}

/** Orchestrates argument parsing, config, file selection, coverage, analysis, reporting. */
export class CliApplication {
  private readonly projectRoot: string;
  private readonly out: Writer;
  private readonly err: Writer;
  private readonly coverageRunner: CoverageRunner;
  private readonly coverageReaders: readonly CoverageReader[];

  constructor(options: CliApplicationOptions) {
    this.projectRoot = path.resolve(options.projectRoot);
    this.out = options.out ?? ((text) => process.stdout.write(text));
    this.err = options.err ?? ((text) => process.stderr.write(text));
    this.coverageRunner =
      options.coverageRunner ?? new CoverageRunner(new ProcessCommandExecutor());
    this.coverageReaders = options.coverageReaders ?? COVERAGE_READERS;
  }

  async execute(args: string[]): Promise<number> {
    const parsed = this.parseArguments(args);
    if (parsed === null) {
      return 1;
    }
    if (parsed.command === "help") {
      this.out(USAGE);
      return 0;
    }
    if (parsed.command === "version") {
      this.out(packageVersion() + "\n");
      return 0;
    }
    return this.run(parsed);
  }

  private parseArguments(args: string[]): CliArguments | null {
    try {
      return parseCliArguments(args);
    } catch (error) {
      this.err(messageOf(error) + "\n");
      this.out(USAGE);
      return null;
    }
  }

  private async run(parsed: AnalyzeArguments): Promise<number> {
    const config = this.resolveConfig(parsed);
    if (config === null) {
      return 1;
    }
    return this.analyzeAndReport(parsed, config);
  }

  private resolveConfig(parsed: AnalyzeArguments): CrapConfig | null {
    try {
      const fileOverrides = loadConfigOverrides(this.projectRoot, parsed.configPath);
      return mergeConfig(mergeConfig(DEFAULT_CONFIG, fileOverrides), parsed.overrides);
    } catch (error) {
      this.err(messageOf(error) + "\n");
      return null;
    }
  }

  private async analyzeAndReport(parsed: AnalyzeArguments, config: CrapConfig): Promise<number> {
    const files = this.filesFor(parsed.selection, config);
    if (files.length === 0) {
      this.out("No TypeScript files to analyze.\n");
      return 0;
    }
    const metrics = await this.analyzeByModule(files, config);
    this.out(this.renderReport(metrics, config));
    if (parsed.writeBaseline) {
      return this.writeBaseline(metrics, config);
    }
    return this.exitCodeFor(metrics, config);
  }

  private renderReport(metrics: MethodMetrics[], config: CrapConfig): string {
    const context = { projectRoot: this.projectRoot, threshold: config.threshold };
    return rendererNamed(config.format).render(metrics, context);
  }

  private writeBaseline(metrics: MethodMetrics[], config: CrapConfig): number {
    const baselinePath = this.baselinePath(config);
    writeBaselineFile(baselinePath, buildBaseline(metrics, this.projectRoot));
    this.out(`Baseline written to ${baselinePath}\n`);
    return 0;
  }

  private baselinePath(config: CrapConfig): string {
    return path.resolve(this.projectRoot, config.baselineFile ?? DEFAULT_BASELINE_FILE);
  }

  private exitCodeFor(metrics: MethodMetrics[], config: CrapConfig): number {
    if (config.baselineFile !== null) {
      return this.baselineExitCode(metrics, config);
    }
    const max = maxCrap(metrics);
    if (thresholdExceeded(max, config.threshold)) {
      this.err(`CRAP threshold exceeded: ${max.toFixed(1)} > ${config.threshold.toFixed(1)}\n`);
      return 2;
    }
    return 0;
  }

  private baselineExitCode(metrics: MethodMetrics[], config: CrapConfig): number {
    const baseline = this.readBaseline(config);
    if (baseline === null) {
      return 1;
    }
    const violations = newViolations(metrics, baseline, config.threshold, this.projectRoot);
    if (violations.length === 0) {
      return 0;
    }
    this.err(`CRAP gate failed: ${violations.length} method(s) new or worse than baseline:\n`);
    for (const entry of violations) {
      this.err(`  ${baselineKey(entry, this.projectRoot)}  CRAP ${formatCrap(entry.crapScore)}\n`);
    }
    return 2;
  }

  private readBaseline(config: CrapConfig): Baseline | null {
    try {
      return readBaselineFile(this.baselinePath(config));
    } catch (error) {
      this.err(messageOf(error) + "\n");
      return null;
    }
  }

  private async analyzeByModule(files: string[], config: CrapConfig): Promise<MethodMetrics[]> {
    const metrics: MethodMetrics[] = [];
    for (const [moduleRoot, moduleFiles] of groupByModuleRoot(this.projectRoot, files)) {
      metrics.push(...(await this.analyzeModule(moduleRoot, moduleFiles, config)));
    }
    return metrics;
  }

  private async analyzeModule(
    moduleRoot: string,
    files: string[],
    config: CrapConfig,
  ): Promise<MethodMetrics[]> {
    return analyze(files, await this.coverageForModule(moduleRoot, config));
  }

  private async coverageForModule(
    moduleRoot: string,
    config: CrapConfig,
  ): Promise<Map<string, FileCoverage> | null> {
    if (config.coverageMode === "off") {
      return null;
    }
    if (config.coverageMode === "file") {
      return this.readFileReport(config);
    }
    await this.coverageRunner.generateCoverage(moduleRoot, config.coverageCommand);
    return this.readGeneratedReport(moduleRoot, config);
  }

  /** `file` mode: read the configured report without running anything. */
  private readFileReport(config: CrapConfig): Map<string, FileCoverage> | null {
    if (config.coverageFile === null) {
      this.err("Warning: coverage mode 'file' without a coverage file. Coverage will be N/A.\n");
      return null;
    }
    return this.readReport(path.resolve(this.projectRoot, config.coverageFile), config);
  }

  private readGeneratedReport(
    moduleRoot: string,
    config: CrapConfig,
  ): Map<string, FileCoverage> | null {
    const candidates = defaultReportPaths(this.coverageReaders).map((candidate) =>
      path.join(moduleRoot, candidate),
    );
    const report = candidates.find((candidate) => existsSync(candidate));
    if (report === undefined) {
      this.err(
        `Warning: no coverage report found under ${moduleRoot} ` +
          `(looked for: ${candidates.join(", ")}). Coverage will be N/A.\n`,
      );
      return null;
    }
    return this.readReport(report, config);
  }

  private readReport(reportPath: string, config: CrapConfig): Map<string, FileCoverage> | null {
    const reader = this.readerFor(reportPath, config);
    if (reader === null) {
      return null;
    }
    if (!existsSync(reportPath)) {
      this.err(`Warning: coverage report not found at ${reportPath}. Coverage will be N/A.\n`);
      return null;
    }
    return reader.read(reportPath);
  }

  private readerFor(reportPath: string, config: CrapConfig): CoverageReader | null {
    if (config.coverageFormat !== null) {
      return readerNamed(config.coverageFormat, this.coverageReaders);
    }
    const reader = readerForReport(reportPath, this.coverageReaders);
    if (reader === null) {
      this.err(`Warning: no coverage reader understands ${reportPath}. Coverage will be N/A.\n`);
    }
    return reader;
  }

  private filesFor(selection: FileSelection, config: CrapConfig): string[] {
    if (selection.kind === "changed") {
      return changedFiles(this.projectRoot, config.sourceRoots);
    }
    if (selection.kind === "changed-since") {
      return changedFilesSince(this.projectRoot, selection.ref, config.sourceRoots);
    }
    if (selection.kind === "files") {
      return this.explicitFiles(selection.paths, config);
    }
    return findSourceFiles(this.projectRoot, config.sourceRoots);
  }

  private explicitFiles(args: string[], config: CrapConfig): string[] {
    const files = args.flatMap((arg) => this.expandArgument(arg, config));
    return [...new Set(files)].sort();
  }

  private expandArgument(arg: string, config: CrapConfig): string[] {
    const resolved = path.resolve(this.projectRoot, arg);
    if (isDirectory(resolved)) {
      return findSourceFiles(resolved, config.sourceRoots);
    }
    return isAnalyzableSource(resolved) ? [resolved] : [];
  }
}

/** Whether the worst score breaks the gate. */
export function thresholdExceeded(max: number, threshold: number): boolean {
  return max > threshold;
}

/** Human-readable message for any thrown value. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
