import { describe, it, expect } from "vitest";
import { formatReport, totalSmells } from "../../src/report/report-formatter.js";
import { emptyCounts } from "../../src/analysis/smells/smell-counts.js";
import { SMELL_DETECTORS } from "../../src/analysis/smells/registry.js";
import type { MethodMetrics } from "../../src/analysis/method-metrics.js";

function metric(overrides: Partial<MethodMetrics>): MethodMetrics {
  return {
    file: "src/sample.ts",
    methodName: "m",
    className: "C",
    startLine: 1,
    complexity: 1,
    coveragePercent: null,
    crapScore: null,
    smells: emptyCounts(SMELL_DETECTORS),
    findings: [],
    slopScore: 0,
    ...overrides,
  };
}

describe("formatReport", () => {
  it("renders headers, sorts worst CRAP first, and puts N/A last", () => {
    const metrics = [
      metric({ methodName: "low", crapScore: 2, coveragePercent: 90 }),
      metric({ methodName: "na", crapScore: null }),
      metric({ methodName: "high", crapScore: 42, coveragePercent: 10 }),
    ];

    // when
    const actual = formatReport(metrics);

    // then
    expect(actual).toContain("CRAP Report");
    expect(actual).toContain("AI Slop Breakdown");
    expect(actual.indexOf("high")).toBeLessThan(actual.indexOf("low"));
    expect(actual.indexOf("low")).toBeLessThan(actual.indexOf("na "));
  });

  it("formats coverage and crap values", () => {
    const metrics = [metric({ methodName: "covered", crapScore: 3.25, coveragePercent: 87.5 })];

    // when
    const actual = formatReport(metrics);

    // then
    expect(actual).toContain("87.5%");
    expect(actual).toContain("3.3");
  });

  it("totals slop and lists the sloppiest methods worst-first", () => {
    const smells = emptyCounts(SMELL_DETECTORS);
    smells.anyTypes = 2;
    const metrics = [
      metric({ methodName: "mild", className: "Big", smells, slopScore: 3 }),
      metric({ methodName: "sloppy", className: "Big", smells, slopScore: 6 }),
    ];

    // when
    const actual = formatReport(metrics);

    // then
    expect(actual).toContain("Total slop score: 9");
    expect(actual).toContain("Sloppiest methods:");
    expect(actual.indexOf("Big.sloppy")).toBeLessThan(actual.indexOf("Big.mild"));
  });

  it("omits the sloppiest-methods section when everything is clean", () => {
    // when
    const actual = formatReport([metric({ slopScore: 0 })]);

    // then
    expect(actual).not.toContain("Sloppiest methods:");
    expect(actual).toContain("Total slop score: 0");
  });

  it("groups the breakdown by category, escape hatches first, tolerating missing keys", () => {
    // when — an empty smells object must render as zeros, never NaN
    const actual = formatReport([metric({ smells: {} })]);

    // then
    expect(actual.indexOf("Escape hatches")).toBeLessThan(actual.indexOf("Style heuristics"));
    expect(actual.indexOf("Style heuristics")).toBeLessThan(actual.indexOf("Total slop score"));
  });

  it("lists findings as file:line with label and advice, sorted by location", () => {
    const anyDetector = SMELL_DETECTORS.find((d) => d.key === "anyTypes")!;
    const varDetector = SMELL_DETECTORS.find((d) => d.key === "varDeclarations")!;
    const metrics = [
      metric({
        findings: [
          { detector: varDetector, file: "src/b.ts", line: 3 },
          { detector: anyDetector, file: "src/a.ts", line: 7 },
          { detector: anyDetector, file: "src/a.ts", line: 2 },
        ],
      }),
    ];

    // when
    const actual = formatReport(metrics);

    // then
    expect(actual).toContain("Findings");
    expect(actual).toContain("src/a.ts:7");
    expect(actual).toContain(anyDetector.advice);
    expect(actual.indexOf("src/a.ts:2")).toBeLessThan(actual.indexOf("src/a.ts:7"));
    expect(actual.indexOf("src/a.ts:7")).toBeLessThan(actual.indexOf("src/b.ts:3"));
  });

  it("keeps paths outside the working directory absolute and omits empty findings", () => {
    const detector = SMELL_DETECTORS.find((d) => d.key === "anyTypes")!;
    const outside = "/elsewhere/x.ts";

    // when
    const withOutside = formatReport([
      metric({ findings: [{ detector, file: outside, line: 1 }] }),
    ]);
    const clean = formatReport([metric({})]);

    // then
    expect(withOutside).toContain(`${outside}:1`);
    expect(clean).not.toContain("Findings");
  });
});

describe("totalSmells", () => {
  function base(): MethodMetrics {
    return {
      file: "src/sample.ts",
      methodName: "m",
      className: "C",
      startLine: 1,
      complexity: 1,
      coveragePercent: null,
      crapScore: null,
      smells: emptyCounts(SMELL_DETECTORS),
      findings: [],
      slopScore: 0,
    };
  }

  it("sums per-detector counts across methods", () => {
    const a = emptyCounts(SMELL_DETECTORS);
    a.guardLadders = 1;
    const b = emptyCounts(SMELL_DETECTORS);
    b.guardLadders = 2;

    // when
    const actual = totalSmells([
      { ...base(), smells: a },
      { ...base(), smells: b },
    ]);

    // then
    expect(actual.guardLadders).toBe(3);
  });
});
