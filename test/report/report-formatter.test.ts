import { describe, it, expect } from "vitest";
import { formatReport, totalSmells } from "../../src/report/report-formatter.js";
import { emptyCounts } from "../../src/analysis/smells/smell-counts.js";
import { SMELL_DETECTORS } from "../../src/analysis/smells/registry.js";
import type { MethodMetrics } from "../../src/analysis/method-metrics.js";

function metric(overrides: Partial<MethodMetrics>): MethodMetrics {
  return {
    methodName: "m",
    className: "C",
    complexity: 1,
    coveragePercent: null,
    crapScore: null,
    smells: emptyCounts(SMELL_DETECTORS),
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
});

describe("totalSmells", () => {
  function base(): MethodMetrics {
    return {
      methodName: "m",
      className: "C",
      complexity: 1,
      coveragePercent: null,
      crapScore: null,
      smells: emptyCounts(SMELL_DETECTORS),
      slopScore: 0,
    };
  }

  it("sums per-detector counts across methods", () => {
    const a = emptyCounts(SMELL_DETECTORS);
    a.isGuards = 1;
    const b = emptyCounts(SMELL_DETECTORS);
    b.isGuards = 2;

    // when
    const actual = totalSmells([
      { ...base(), smells: a },
      { ...base(), smells: b },
    ]);

    // then
    expect(actual.isGuards).toBe(3);
  });
});
