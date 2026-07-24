import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { FileCoverage } from "../src/coverage/coverageData.js";
import { parseCoverage, normalizePath } from "../src/coverage/coverageParser.js";
import { analyze } from "../src/analysis/crapAnalyzer.js";

describe("FileCoverage.percentForRange", () => {
  it("computes covered fraction of in-range statements", () => {
    const coverage = new FileCoverage([
      { line: 2, covered: true },
      { line: 3, covered: false },
      { line: 4, covered: true },
      { line: 9, covered: false },
    ]);
    expect(coverage.percentForRange(2, 4)).toBeCloseTo((2 / 3) * 100, 4);
  });

  it("returns null when no statements are in range", () => {
    const coverage = new FileCoverage([{ line: 100, covered: true }]);
    expect(coverage.percentForRange(1, 10)).toBeNull();
  });
});

describe("parseCoverage / analyze", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns an empty map for a missing report", () => {
    expect(parseCoverage(null).size).toBe(0);
    expect(parseCoverage(path.join(dir, "nope.json")).size).toBe(0);
  });

  it("parses istanbul statement coverage keyed by absolute path", () => {
    const filePath = path.join(dir, "foo.ts");
    const json = path.join(dir, "coverage-final.json");
    writeFileSync(
      json,
      JSON.stringify({
        [filePath]: {
          path: filePath,
          statementMap: {
            "0": { start: { line: 2, column: 0 }, end: { line: 2, column: 5 } },
            "1": { start: { line: 3, column: 0 }, end: { line: 3, column: 5 } },
          },
          s: { "0": 3, "1": 0 },
        },
      }),
    );
    const map = parseCoverage(json);
    const fileCoverage = map.get(normalizePath(filePath));
    expect(fileCoverage).toBeDefined();
    expect(fileCoverage!.percentForRange(2, 3)).toBeCloseTo(50, 4);
  });

  it("attributes coverage to methods and computes CRAP", () => {
    const filePath = path.join(dir, "sample.ts");
    writeFileSync(
      filePath,
      [
        "export function branch(a: boolean): number {", // line 1
        "  if (a) {", // line 2
        "    return 1;", // line 3
        "  }", // line 4
        "  return 0;", // line 5
        "}", // line 6
      ].join("\n"),
    );

    const json = path.join(dir, "coverage-final.json");
    writeFileSync(
      json,
      JSON.stringify({
        [filePath]: {
          path: filePath,
          statementMap: {
            "0": { start: { line: 3, column: 4 }, end: { line: 3, column: 12 } },
            "1": { start: { line: 5, column: 2 }, end: { line: 5, column: 10 } },
          },
          s: { "0": 1, "1": 0 }, // half the statements ran
        },
      }),
    );

    const metrics = analyze([filePath], json);
    expect(metrics).toHaveLength(1);
    const [metric] = metrics;
    expect(metric.methodName).toBe("branch");
    expect(metric.complexity).toBe(2); // base + if
    expect(metric.coveragePercent).toBeCloseTo(50, 4);
    expect(metric.crapScore).not.toBeNull();
  });

  it("reports N/A when a file has no coverage entry", () => {
    const filePath = path.join(dir, "sample.ts");
    writeFileSync(filePath, "export function noop(): number {\n  return 1;\n}\n");
    const metrics = analyze([filePath], null);
    expect(metrics[0].coveragePercent).toBeNull();
    expect(metrics[0].crapScore).toBeNull();
  });
});
