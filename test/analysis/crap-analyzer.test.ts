import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyze, sortByCrapDescending, maxCrap } from "../../src/analysis/crap-analyzer.js";
import type { MethodMetrics } from "../../src/analysis/method-metrics.js";

function metric(crapScore: number | null, methodName = "m"): MethodMetrics {
  return {
    methodName,
    className: "C",
    complexity: 1,
    coveragePercent: crapScore,
    crapScore,
    smells: {},
    slopScore: 0,
  };
}

describe("sortByCrapDescending", () => {
  it("orders by CRAP descending with N/A rows last", () => {
    const metrics = [metric(2, "low"), metric(null, "na"), metric(42, "high")];

    // when
    const actual = sortByCrapDescending(metrics);

    // then
    expect(actual.map((m) => m.methodName)).toEqual(["high", "low", "na"]);
  });

  it("keeps two N/A rows stable relative to each other", () => {
    const metrics = [metric(null, "a"), metric(null, "b")];

    // when
    const actual = sortByCrapDescending(metrics);

    // then
    expect(actual.map((m) => m.methodName)).toEqual(["a", "b"]);
  });
});

describe("maxCrap", () => {
  it("is 0 with no numeric scores", () => {
    // when
    const actual = [maxCrap([metric(null)]), maxCrap([])];

    // then
    expect(actual).toEqual([0, 0]);
  });

  it("ignores N/A rows", () => {
    // when
    const actual = maxCrap([metric(3), metric(null), metric(7)]);

    // then
    expect(actual).toBe(7);
  });
});

describe("analyze", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-analyze-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("attributes coverage to methods and computes CRAP", () => {
    const filePath = path.join(dir, "sample.ts");
    writeFileSync(
      filePath,
      [
        "export function branch(a: boolean): number {",
        "  if (a) {",
        "    return 1;",
        "  }",
        "  return 0;",
        "}",
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
          s: { "0": 1, "1": 0 },
        },
      }),
    );

    // when
    const [actual] = analyze([filePath], json);

    // then
    expect(actual).toMatchObject({ methodName: "branch", complexity: 2 });
    expect(actual.coveragePercent).toBeCloseTo(50, 4);
    expect(actual.crapScore).not.toBeNull();
  });

  it("reports N/A without coverage and skips missing files", () => {
    const filePath = path.join(dir, "sample.ts");
    writeFileSync(filePath, "export function noop(): number {\n  return 1;\n}\n");

    // when
    const actual = analyze([filePath, path.join(dir, "ghost.ts")], null);

    // then
    expect(actual).toHaveLength(1);
    expect(actual[0].coveragePercent).toBeNull();
    expect(actual[0].crapScore).toBeNull();
  });
});
