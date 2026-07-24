import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { CliMode, type CliArguments } from "./cliMode.js";
import { parseCliArguments } from "./cliArgumentsParser.js";
import { USAGE } from "./usage.js";
import {
  findSourceFilesUnderSrc,
  isAnalyzableSource,
} from "../discovery/sourceFileFinder.js";
import { changedFilesUnderSrc } from "../discovery/changedFileDetector.js";
import { groupByModuleRoot } from "../discovery/moduleResolver.js";
import { CoverageRunner } from "../coverage/coverageRunner.js";
import { COVERAGE_JSON_RELATIVE } from "../coverage/coverageRunner.js";
import { ProcessCommandExecutor } from "../coverage/processCommandExecutor.js";
import { analyze, maxCrap } from "../analysis/crapAnalyzer.js";
import { formatReport } from "../report/reportFormatter.js";
import type { MethodMetrics } from "../analysis/methodMetrics.js";

export const CRAP_THRESHOLD = 8.0;

export interface Writer {
  (text: string): void;
}

export interface CliApplicationOptions {
  projectRoot: string;
  out?: Writer;
  err?: Writer;
  coverageRunner?: CoverageRunner;
}

/** Orchestrates argument parsing, file selection, coverage, analysis, reporting. */
export class CliApplication {
  private readonly projectRoot: string;
  private readonly out: Writer;
  private readonly err: Writer;
  private readonly coverageRunner: CoverageRunner;

  constructor(options: CliApplicationOptions) {
    this.projectRoot = path.resolve(options.projectRoot);
    this.out = options.out ?? ((text) => process.stdout.write(text));
    this.err = options.err ?? ((text) => process.stderr.write(text));
    this.coverageRunner =
      options.coverageRunner ?? new CoverageRunner(new ProcessCommandExecutor());
  }

  async execute(args: string[]): Promise<number> {
    let parsed: CliArguments;
    try {
      parsed = parseCliArguments(args);
    } catch (error) {
      this.err((error as Error).message + "\n");
      this.out(USAGE);
      return 1;
    }

    if (parsed.mode === CliMode.Help) {
      this.out(USAGE);
      return 0;
    }

    const files = this.filesForMode(parsed);
    if (files.length === 0) {
      this.out("No TypeScript files to analyze.\n");
      return 0;
    }

    const metrics = await this.analyzeByModule(files);
    this.out(formatReport(metrics));

    const max = maxCrap(metrics);
    if (thresholdExceeded(max)) {
      this.err(`CRAP threshold exceeded: ${max.toFixed(1)} > ${CRAP_THRESHOLD.toFixed(1)}\n`);
      return 2;
    }
    return 0;
  }

  private async analyzeByModule(files: string[]): Promise<MethodMetrics[]> {
    const metrics: MethodMetrics[] = [];
    for (const [moduleRoot, moduleFiles] of groupByModuleRoot(this.projectRoot, files)) {
      const coverageJson = path.join(moduleRoot, COVERAGE_JSON_RELATIVE);
      await this.coverageRunner.generateCoverage(moduleRoot);
      if (!existsSync(coverageJson)) {
        this.err(`Warning: coverage report not found at ${coverageJson}. Coverage will be N/A.\n`);
        metrics.push(...analyze(moduleFiles, null));
      } else {
        metrics.push(...analyze(moduleFiles, coverageJson));
      }
    }
    return metrics;
  }

  private filesForMode(parsed: CliArguments): string[] {
    switch (parsed.mode) {
      case CliMode.AllSrc:
        return findSourceFilesUnderSrc(this.projectRoot);
      case CliMode.ChangedSrc:
        return changedFilesUnderSrc(this.projectRoot);
      case CliMode.ExplicitFiles:
        return this.explicitFiles(parsed.fileArgs);
      default:
        return [];
    }
  }

  private explicitFiles(args: string[]): string[] {
    const files = new Set<string>();
    for (const arg of args) {
      const resolved = path.resolve(this.projectRoot, arg);
      if (isDirectory(resolved)) {
        for (const file of findSourceFilesUnderSrc(resolved)) {
          files.add(file);
        }
      } else if (isAnalyzableSource(resolved)) {
        files.add(resolved);
      }
    }
    return [...files].sort();
  }
}

export function thresholdExceeded(max: number): boolean {
  return max > CRAP_THRESHOLD;
}

function isDirectory(candidate: string): boolean {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}
