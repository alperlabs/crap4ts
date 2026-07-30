import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { istanbulJsonReader } from "../../src/coverage/readers/istanbul-json-reader.js";
import { lcovReader } from "../../src/coverage/readers/lcov-reader.js";
import {
  COVERAGE_READERS,
  defaultReportPaths,
  readerForReport,
  readerNamed,
} from "../../src/coverage/readers/registry.js";

describe("registry", () => {
  it("registers istanbul before lcov with their default report paths", () => {
    // then
    expect(COVERAGE_READERS.map((reader) => reader.format)).toEqual(["istanbul", "lcov"]);
    expect(defaultReportPaths(COVERAGE_READERS)).toEqual([
      "coverage/coverage-final.json",
      "coverage/lcov.info",
    ]);
  });

  it("finds readers by name and rejects unknown names", () => {
    // then
    expect(readerNamed("lcov")).toBe(lcovReader);
    expect(() => readerNamed("cobertura")).toThrow(/Unknown coverage format: cobertura/);
  });

  it("detects the reader from the report file name", () => {
    // then
    expect(readerForReport("coverage/coverage-final.json")).toBe(istanbulJsonReader);
    expect(readerForReport("coverage/lcov.info")).toBe(lcovReader);
    expect(readerForReport("coverage/report.xml")).toBeNull();
  });
});

describe("lcovReader", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-lcov-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("parses DA records per SF section, resolving relative paths", () => {
    const absolute = path.join(dir, "abs.ts");
    const report = path.join(dir, "lcov.info");
    writeFileSync(
      report,
      [
        "TN:",
        `SF:${absolute}`,
        "DA:1,1",
        "DA:2,0",
        "end_of_record",
        "SF:src/rel.ts",
        "DA:5,3",
        "DA:not,a,number",
        "end_of_record",
        "",
      ].join("\n"),
    );

    // when
    const actual = lcovReader.read(report);

    // then
    expect(actual.get(absolute)?.percentForRange(1, 2)).toBeCloseTo(50, 4);
    expect(actual.get(path.join(dir, "src", "rel.ts"))?.percentForRange(5, 5)).toBe(100);
    expect(actual.size).toBe(2);
  });

  it("ignores records outside an SF section and unterminated sections", () => {
    const report = path.join(dir, "lcov.info");
    writeFileSync(report, ["DA:1,1", "SF:src/open.ts", "DA:1,1", ""].join("\n"));

    // when
    const actual = lcovReader.read(report);

    // then
    expect(actual.size).toBe(0);
  });

  it("returns empty coverage for a missing report", () => {
    // when
    const actual = lcovReader.read(path.join(dir, "missing.info"));

    // then
    expect(actual.size).toBe(0);
  });
});

describe("istanbulJsonReader", () => {
  it("delegates to the istanbul parser and tolerates missing files", () => {
    // when
    const actual = istanbulJsonReader.read("/does/not/exist/coverage-final.json");

    // then
    expect(actual.size).toBe(0);
  });
});
