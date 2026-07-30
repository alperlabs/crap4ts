import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, mergeConfig } from "../../src/config/crap-config.js";

describe("mergeConfig", () => {
  it("layers overrides over the base, keeping untouched settings", () => {
    // when
    const actual = mergeConfig(DEFAULT_CONFIG, { threshold: 20, format: "json" });

    // then
    expect(actual.threshold).toBe(20);
    expect(actual.format).toBe("json");
    expect(actual.coverageMode).toBe("run");
    expect(actual.sourceRoots).toEqual(["src"]);
  });

  it("ignores explicitly undefined overrides", () => {
    // when
    const actual = mergeConfig(DEFAULT_CONFIG, { threshold: undefined });

    // then
    expect(actual.threshold).toBe(DEFAULT_CONFIG.threshold);
  });

  it("accepts file mode when the file is provided", () => {
    // when
    const actual = mergeConfig(DEFAULT_CONFIG, {
      coverageMode: "file",
      coverageFile: "coverage/final.json",
    });

    // then
    expect(actual.coverageFile).toBe("coverage/final.json");
  });
});
