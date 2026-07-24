import { describe, it, expect } from "vitest";
import { formatReport } from "../src/report/reportFormatter.js";
import { emptySmells } from "../src/analysis/aiSmells.js";
import type { MethodMetrics } from "../src/analysis/methodMetrics.js";

function metric(overrides: Partial<MethodMetrics>): MethodMetrics {
  return {
    methodName: "m",
    className: "C",
    complexity: 1,
    coveragePercent: null,
    crapScore: null,
    smells: emptySmells(),
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
    expect(report).toContain("Method");
    expect(report).toContain("AI Slop Breakdown");

    const highIndex = report.indexOf("high");
    const lowIndex = report.indexOf("low");
    const naIndex = report.indexOf("na ");
    expect(highIndex).toBeLessThan(lowIndex);
    expect(lowIndex).toBeLessThan(naIndex);
  });

  it("totals slop and lists the sloppiest methods", () => {
    const smells = { ...emptySmells(), anyTypes: 2 };
    const report = formatReport([
      metric({ methodName: "sloppy", className: "Big", smells, slopScore: 6 }),
    ]);
    expect(report).toContain("Total slop score: 6");
    expect(report).toContain("Sloppiest methods:");
    expect(report).toContain("Big.sloppy");
  });
});
