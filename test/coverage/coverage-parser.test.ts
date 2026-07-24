import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { FileCoverage } from "../../src/coverage/coverage-data.js";
import { parseCoverage, normalizePath } from "../../src/coverage/coverage-parser.js";

describe("FileCoverage.percentForRange", () => {
  it("computes the covered fraction of in-range statements", () => {
    const coverage = new FileCoverage([
      { line: 2, covered: true },
      { line: 3, covered: false },
      { line: 4, covered: true },
      { line: 9, covered: false },
    ]);

    // when
    const actual = coverage.percentForRange(2, 4);

    // then
    expect(actual).toBeCloseTo((2 / 3) * 100, 4);
  });

  it("returns null when no statements are in range", () => {
    const coverage = new FileCoverage([{ line: 100, covered: true }]);

    // when
    const actual = coverage.percentForRange(1, 10);

    // then
    expect(actual).toBeNull();
  });

  it("returns null for an empty file", () => {
    const coverage = new FileCoverage([]);

    // when
    const actual = coverage.percentForRange(1, 10);

    // then
    expect(actual).toBeNull();
  });
});

describe("parseCoverage", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-cov-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function write(report: unknown): string {
    const json = path.join(dir, "coverage-final.json");
    writeFileSync(json, typeof report === "string" ? report : JSON.stringify(report));
    return json;
  }

  it("returns an empty map for null, missing, or invalid reports", () => {
    // when
    const sizes = [
      parseCoverage(null).size,
      parseCoverage(path.join(dir, "nope.json")).size,
      parseCoverage(write("{ not json")).size,
    ];

    // then
    expect(sizes).toEqual([0, 0, 0]);
  });

  it("parses statement coverage and keys by absolute path", () => {
    const filePath = path.join(dir, "foo.ts");
    const json = write({
      [filePath]: {
        path: filePath,
        statementMap: {
          "0": { start: { line: 2, column: 0 }, end: { line: 2, column: 5 } },
          "1": { start: { line: 3, column: 0 }, end: { line: 3, column: 5 } },
        },
        s: { "0": 3, "1": 0 },
      },
    });

    // when
    const actual = parseCoverage(json).get(normalizePath(filePath));

    // then
    expect(actual!.percentForRange(2, 3)).toBeCloseTo(50, 4);
  });

  it("falls back to the map key when an entry has no path", () => {
    const filePath = path.join(dir, "bar.ts");

    // when
    const actual = parseCoverage(write({ [filePath]: { statementMap: {}, s: {} } }));

    // then
    expect(actual.has(normalizePath(filePath))).toBe(true);
  });

  it("tolerates entries without a statement map or hit counts", () => {
    const filePath = path.join(dir, "empty.ts");

    // when
    const actual = parseCoverage(write({ [filePath]: {} })).get(normalizePath(filePath));

    // then
    expect(actual!.percentForRange(1, 100)).toBeNull();
  });

  it("tolerates structurally malformed reports without trusting any field", () => {
    const filePath = path.join(dir, "weird.ts");
    const json = write({
      skipped: "not an object entry",
      [filePath]: {
        path: 42,
        statementMap: {
          "0": "not a location",
          "1": { start: "not a position" },
          "2": { start: { line: 7, column: 0 }, end: { line: 7, column: 1 } },
        },
        s: { "2": "not a count" },
      },
    });

    // when
    const parsed = parseCoverage(json);
    const topLevelJunk = parseCoverage(write(42));

    // then — the one valid statement survives, counted as uncovered
    const actual = parsed.get(normalizePath(filePath));
    expect(parsed.size).toBe(1);
    expect(actual!.percentForRange(1, 10)).toBe(0);
    expect(topLevelJunk.size).toBe(0);
  });

  it("drops statements with a non-numeric line", () => {
    const filePath = path.join(dir, "bad.ts");
    const json = write({
      [filePath]: {
        statementMap: {
          "0": { start: { line: null, column: 0 }, end: { line: null, column: 0 } },
          "1": { start: { line: 5, column: 0 }, end: { line: 5, column: 0 } },
        },
        s: { "0": 1, "1": 1 },
      },
    });

    // when
    const actual = parseCoverage(json).get(normalizePath(filePath));

    // then
    expect(actual!.percentForRange(1, 10)).toBeCloseTo(100, 4);
  });
});
