import { describe, it, expect } from "vitest";
import { calculateCrap } from "../../src/analysis/crap-score.js";

describe("calculateCrap", () => {
  it("returns complexity when fully covered", () => {
    // when
    const actual = calculateCrap(5, 100.0);

    // then
    expect(actual).toBeCloseTo(5.0, 4);
  });

  it("returns cc^2 + cc when uncovered", () => {
    // when
    const actual = calculateCrap(5, 0.0);

    // then
    expect(actual).toBeCloseTo(30.0, 4);
  });

  it("computes partial coverage", () => {
    // when
    const actual = calculateCrap(8, 45.0);

    // then
    expect(actual).toBeCloseTo(18.648, 2);
  });

  it("returns null for unknown coverage", () => {
    // when
    const actual = calculateCrap(3, null);

    // then
    expect(actual).toBeNull();
  });
});
