import { describe, it, expect } from "vitest";
import { calculateCrap } from "../src/analysis/crapScore.js";

describe("calculateCrap", () => {
  it("returns complexity when fully covered", () => {
    expect(calculateCrap(5, 100.0)).toBeCloseTo(5.0, 4);
  });

  it("returns cc^2 + cc when uncovered", () => {
    expect(calculateCrap(5, 0.0)).toBeCloseTo(30.0, 4);
  });

  it("computes partial coverage", () => {
    expect(calculateCrap(8, 45.0)).toBeCloseTo(18.648, 2);
  });

  it("returns null for unknown coverage", () => {
    expect(calculateCrap(3, null)).toBeNull();
  });
});
