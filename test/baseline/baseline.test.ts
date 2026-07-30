import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  baselineKey,
  buildBaseline,
  newViolations,
  readBaselineFile,
  writeBaselineFile,
} from "../../src/baseline/baseline.js";
import type { MethodMetrics } from "../../src/analysis/method-metrics.js";

function metric(overrides: Partial<MethodMetrics>): MethodMetrics {
  return {
    file: path.resolve("src/sample.ts"),
    methodName: "m",
    className: "C",
    startLine: 1,
    complexity: 1,
    coveragePercent: 0,
    crapScore: 2,
    smells: {},
    findings: [],
    slopScore: 0,
    ...overrides,
  };
}

const ROOT = process.cwd();

describe("baselineKey", () => {
  it("keys by project-relative file, class, and method — not line numbers", () => {
    // when
    const actual = baselineKey(metric({ startLine: 99 }), ROOT);

    // then
    expect(actual).toBe(`${path.join("src", "sample.ts")}#C.m`);
  });
});

describe("buildBaseline", () => {
  it("records the worst score per key and skips N/A rows", () => {
    const metrics = [
      metric({ crapScore: 5 }),
      metric({ crapScore: 12 }),
      metric({ methodName: "na", crapScore: null }),
    ];

    // when
    const actual = buildBaseline(metrics, ROOT);

    // then
    expect(actual.methods).toEqual({ [`${path.join("src", "sample.ts")}#C.m`]: 12 });
  });
});

describe("baseline file round trip", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-baseline-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes and reads the same baseline", () => {
    const file = path.join(dir, "baseline.json");
    writeBaselineFile(file, { methods: { "src/a.ts#C.m": 12.5 } });

    // when
    const actual = readBaselineFile(file);

    // then
    expect(actual.methods).toEqual({ "src/a.ts#C.m": 12.5 });
  });

  it("rejects a missing baseline with a hint to create one", () => {
    // then
    expect(() => readBaselineFile(path.join(dir, "nope.json"))).toThrow(/--write-baseline/);
  });

  it("rejects malformed baselines", () => {
    const file = path.join(dir, "baseline.json");
    const cases: Array<[string, RegExp]> = [
      ["{nope", /not valid JSON/],
      ['"str"', /"methods" map/],
      ["{}", /"methods" map/],
      ['{"methods": {"k": "high"}}', /must be a number/],
    ];
    for (const [content, message] of cases) {
      writeFileSync(file, content);

      // then
      expect(() => readBaselineFile(file), content).toThrow(message);
    }
  });
});

describe("newViolations", () => {
  const key = `${path.join("src", "sample.ts")}#C.m`;

  it("passes methods under the threshold regardless of the baseline", () => {
    // when
    const actual = newViolations([metric({ crapScore: 7 })], { methods: {} }, 8, ROOT);

    // then
    expect(actual).toEqual([]);
  });

  it("fails methods over the threshold that are absent from the baseline", () => {
    // when
    const actual = newViolations([metric({ crapScore: 20 })], { methods: {} }, 8, ROOT);

    // then
    expect(actual).toHaveLength(1);
  });

  it("passes accepted methods that did not get worse, ignoring N/A rows", () => {
    const baseline = { methods: { [key]: 20 } };

    // when
    const same = newViolations([metric({ crapScore: 20 })], baseline, 8, ROOT);
    const better = newViolations([metric({ crapScore: 15 })], baseline, 8, ROOT);
    const na = newViolations([metric({ crapScore: null })], { methods: {} }, 8, ROOT);

    // then
    expect(same).toEqual([]);
    expect(better).toEqual([]);
    expect(na).toEqual([]);
  });

  it("fails accepted methods that got worse", () => {
    // when
    const actual = newViolations([metric({ crapScore: 21 })], { methods: { [key]: 20 } }, 8, ROOT);

    // then
    expect(actual).toHaveLength(1);
  });
});
