import { describe, it, expect } from "vitest";
import { formatReport, totalSmells } from "../../src/report/reportFormatter.js";
import { emptyCounts } from "../../src/analysis/smells/smellCounts.js";
import { SMELL_DETECTORS } from "../../src/analysis/smells/registry.js";
import type { MethodMetrics } from "../../src/analysis/methodMetrics.js";

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
    const report = formatReport([
      metric({ methodName: "low", crapScore: 2, coveragePercent: 90 }),
      metric({ methodName: "na", crapScore: null }),
      metric({ methodName: "high", crapScore: 42, coveragePercent: 10 }),
    ]);

    expect(report).toContain("CRAP Report");
    expect(report).toContain("AI Slop Breakdown");
    expect(report.indexOf("high")).toBeLessThan(report.indexOf("low"));
    expect(report.indexOf("low")).toBeLessThan(report.indexOf("na "));
  });

  it("formats coverage and crap values", () => {
    const report = formatReport([
      metric({ methodName: "covered", crapScore: 3.25, coveragePercent: 87.5 }),
    ]);
    expect(report).toContain("87.5%");
    expect(report).toContain("3.3");
  });

  it("totals slop and lists the sloppiest methods worst-first", () => {
    const smells = emptyCounts(SMELL_DETECTORS);
    smells.anyTypes = 2;
    const report = formatReport([
      metric({ methodName: "mild", className: "Big", smells, slopScore: 3 }),
      metric({ methodName: "sloppy", className: "Big", smells, slopScore: 6 }),
    ]);
    expect(report).toContain("Total slop score: 9");
    expect(report).toContain("Sloppiest methods:");
    expect(report.indexOf("Big.sloppy")).toBeLessThan(report.indexOf("Big.mild"));
  });

  it("omits the sloppiest-methods section when everything is clean", () => {
    const report = formatReport([metric({ slopScore: 0 })]);
    expect(report).not.toContain("Sloppiest methods:");
    expect(report).toContain("Total slop score: 0");
  });
});

describe("totalSmells", () => {
  it("sums per-detector counts across methods", () => {
    const a = emptyCounts(SMELL_DETECTORS);
    a.isGuards = 1;
    const b = emptyCounts(SMELL_DETECTORS);
    b.isGuards = 2;
    const totals = totalSmells([
      { ...base(), smells: a },
      { ...base(), smells: b },
    ]);
    expect(totals.isGuards).toBe(3);
  });

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
});
