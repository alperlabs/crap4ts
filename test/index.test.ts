import { describe, it, expect } from "vitest";
import * as api from "../src/index.js";

describe("public API", () => {
  it("exposes the analyzer, readers, renderers, config, and baseline helpers", () => {
    // then
    expect(typeof api.analyze).toBe("function");
    expect(typeof api.calculateCrap).toBe("function");
    expect(api.COVERAGE_READERS.length).toBeGreaterThan(0);
    expect(api.REPORT_RENDERERS.length).toBeGreaterThan(0);
    expect(api.SMELL_DETECTORS.length).toBeGreaterThan(0);
    expect(api.DEFAULT_CONFIG.threshold).toBe(8);
    expect(typeof api.buildBaseline).toBe("function");
    expect(typeof api.CliApplication).toBe("function");
  });
});
