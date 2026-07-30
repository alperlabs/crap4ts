import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relativePath } from "../report/report-formatter.js";
import { isRecord } from "../shared/records.js";
import type { MethodMetrics } from "../analysis/method-metrics.js";

/** Default baseline location, relative to the project root. */
export const DEFAULT_BASELINE_FILE = "crap4ts-baseline.json";

/**
 * Accepted CRAP scores per method, keyed by `file#Class.method` with the file
 * path relative to the project root. Line numbers are deliberately not part
 * of the key so unrelated edits do not churn the baseline.
 */
export interface Baseline {
  readonly methods: Readonly<Record<string, number>>;
}

/** Comparison slack so re-runs of identical code never flip the gate. */
const EPSILON = 1e-9;

export function baselineKey(entry: MethodMetrics, projectRoot: string): string {
  return `${relativePath(entry.file, projectRoot)}#${entry.className}.${entry.methodName}`;
}

/**
 * Build a baseline from a run: the worst CRAP score per key, for methods with
 * a known score. Duplicate keys (overloaded names across a file) keep the max
 * so the ratchet never accidentally tightens on ambiguity.
 */
export function buildBaseline(metrics: MethodMetrics[], projectRoot: string): Baseline {
  const methods: Record<string, number> = {};
  for (const entry of metrics) {
    if (entry.crapScore !== null) {
      const key = baselineKey(entry, projectRoot);
      methods[key] = Math.max(methods[key] ?? 0, entry.crapScore);
    }
  }
  return { methods };
}

export function writeBaselineFile(filePath: string, baseline: Baseline): void {
  writeFileSync(filePath, JSON.stringify({ methods: baseline.methods }, null, 2) + "\n");
}

/** Read a baseline file; a missing or malformed file is a usage error. */
export function readBaselineFile(filePath: string): Baseline {
  if (!existsSync(filePath)) {
    throw new Error(`Baseline file not found: ${filePath} (create it with --write-baseline)`);
  }
  return parseBaseline(readFileSync(filePath, "utf8"), filePath);
}

function parseBaseline(text: string, filePath: string): Baseline {
  const methods: Record<string, number> = {};
  for (const [key, score] of Object.entries(methodsOf(parseJson(text, filePath), filePath))) {
    if (typeof score !== "number" || !Number.isFinite(score)) {
      throw new Error(`Baseline entry "${key}" in ${filePath} must be a number`);
    }
    methods[key] = score;
  }
  return { methods };
}

function parseJson(text: string, filePath: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Baseline is not valid JSON: ${filePath}`);
  }
}

function methodsOf(parsed: unknown, filePath: string): Record<string, unknown> {
  if (isRecord(parsed) && isRecord(parsed.methods)) {
    return parsed.methods;
  }
  throw new Error(`Baseline must be an object with a "methods" map: ${filePath}`);
}

/**
 * Methods that fail the ratchet: over the threshold AND either absent from
 * the baseline or worse than their recorded score. Methods that merely stay
 * at their accepted (bad) score pass, so the gate can be adopted on an
 * existing codebase and only ever tighten.
 */
export function newViolations(
  metrics: MethodMetrics[],
  baseline: Baseline,
  threshold: number,
  projectRoot: string,
): MethodMetrics[] {
  return metrics.filter((entry) => violates(entry, baseline, threshold, projectRoot));
}

function violates(
  entry: MethodMetrics,
  baseline: Baseline,
  threshold: number,
  projectRoot: string,
): boolean {
  if (entry.crapScore === null || entry.crapScore <= threshold) {
    return false;
  }
  const accepted = baseline.methods[baselineKey(entry, projectRoot)];
  return accepted === undefined || entry.crapScore > accepted + EPSILON;
}
