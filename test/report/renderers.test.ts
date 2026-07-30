import { describe, it, expect } from "vitest";
import path from "node:path";
import { emptyCounts } from "../../src/analysis/smells/smell-counts.js";
import { SMELL_DETECTORS } from "../../src/analysis/smells/registry.js";
import { jsonRenderer } from "../../src/report/json-formatter.js";
import { githubRenderer } from "../../src/report/github-formatter.js";
import { REPORT_RENDERERS, rendererNamed } from "../../src/report/registry.js";
import { summarize } from "../../src/report/summary.js";
import type { ReportContext } from "../../src/report/report-context.js";
import type { MethodMetrics } from "../../src/analysis/method-metrics.js";

const ROOT = process.cwd();
const CONTEXT: ReportContext = { projectRoot: ROOT, threshold: 8 };

function metric(overrides: Partial<MethodMetrics>): MethodMetrics {
  return {
    file: path.resolve("src/sample.ts"),
    methodName: "m",
    className: "C",
    startLine: 3,
    complexity: 2,
    coveragePercent: 50,
    crapScore: 3,
    smells: emptyCounts(SMELL_DETECTORS),
    findings: [],
    slopScore: 0,
    ...overrides,
  };
}

function anyDetector() {
  return SMELL_DETECTORS.find((d) => d.key === "anyTypes")!;
}

function consoleDetector() {
  return SMELL_DETECTORS.find((d) => d.key === "consoleCalls")!;
}

describe("registry", () => {
  it("registers text, json, and github renderers", () => {
    // then
    expect(REPORT_RENDERERS.map((r) => r.name)).toEqual(["text", "json", "github"]);
    expect(rendererNamed("json")).toBe(jsonRenderer);
  });

  it("rejects unknown renderer names", () => {
    // then
    expect(() => rendererNamed("xml" as never)).toThrow(/Unknown report format: xml/);
  });
});

describe("summarize", () => {
  it("computes totals, per-method densities, and the category split", () => {
    const escape = emptyCounts(SMELL_DETECTORS);
    escape[anyDetector().key] = 1;
    const style = emptyCounts(SMELL_DETECTORS);
    style[consoleDetector().key] = 2;
    const metrics = [
      metric({ smells: escape, slopScore: anyDetector().weight, complexity: 4 }),
      metric({ smells: style, slopScore: 2 * consoleDetector().weight, complexity: 2 }),
    ];

    // when
    const actual = summarize(metrics);

    // then
    expect(actual.methodCount).toBe(2);
    expect(actual.escapeHatchSlop).toBe(anyDetector().weight);
    expect(actual.styleSlop).toBe(2 * consoleDetector().weight);
    expect(actual.totalSlop).toBe(actual.escapeHatchSlop + actual.styleSlop);
    expect(actual.slopPerMethod).toBeCloseTo(actual.totalSlop / 2, 6);
    expect(actual.meanComplexity).toBeCloseTo(3, 6);
    expect(actual.maxCrap).toBe(3);
  });

  it("reports zero densities for an empty run", () => {
    // when
    const actual = summarize([]);

    // then
    expect(actual).toMatchObject({ methodCount: 0, slopPerMethod: 0, meanComplexity: 0 });
  });
});

describe("jsonRenderer", () => {
  it("emits threshold, summary, methods, and findings with relative paths", () => {
    const detector = anyDetector();
    const metrics = [
      metric({
        crapScore: 12,
        findings: [{ detector, file: path.resolve("src/sample.ts"), line: 7 }],
        slopScore: detector.weight,
      }),
    ];

    // when
    const parsed = JSON.parse(jsonRenderer.render(metrics, CONTEXT));

    // then
    expect(parsed.threshold).toBe(8);
    expect(parsed.summary.methodCount).toBe(1);
    expect(parsed.methods[0]).toMatchObject({
      file: path.join("src", "sample.ts"),
      className: "C",
      methodName: "m",
      crapScore: 12,
    });
    expect(parsed.findings[0]).toMatchObject({
      file: path.join("src", "sample.ts"),
      line: 7,
      smell: detector.key,
      category: detector.category,
    });
  });
});

describe("githubRenderer", () => {
  it("annotates over-threshold methods as errors and findings as warnings", () => {
    const detector = anyDetector();
    const metrics = [
      metric({ methodName: "bad", crapScore: 42.5 }),
      metric({ methodName: "ok", crapScore: 3 }),
      metric({ methodName: "na", crapScore: null }),
      metric({
        methodName: "smelly",
        findings: [{ detector, file: path.resolve("src/sample.ts"), line: 7 }],
      }),
    ];

    // when
    const actual = githubRenderer.render(metrics, CONTEXT);

    // then
    const rel = path.join("src", "sample.ts");
    expect(actual).toContain(`::error file=${rel},line=3,title=CRAP 42.5::C.bad has CRAP 42.5`);
    expect(actual).toContain(`::warning file=${rel},line=7,title=slop: ${detector.label}::`);
    expect(actual).not.toContain("C.ok has CRAP");
    expect(actual).not.toContain("C.na has CRAP");
    expect(actual).toContain("CRAP Report");
  });

  it("escapes newlines and percents in annotation messages", () => {
    const detector = { ...anyDetector(), advice: "line1\nline2 100%\r" };
    const metrics = [
      metric({ findings: [{ detector, file: path.resolve("src/sample.ts"), line: 1 }] }),
    ];

    // when
    const actual = githubRenderer.render(metrics, CONTEXT);

    // then
    expect(actual).toContain("line1%0Aline2 100%25%0D");
  });

  it("emits no annotation block for a clean run", () => {
    // when
    const actual = githubRenderer.render([metric({ crapScore: 1 })], CONTEXT);

    // then
    expect(actual.startsWith("CRAP Report")).toBe(true);
  });
});
