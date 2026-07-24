import { describe, it, expect } from "vitest";
import ts from "typescript";
import { parseMethods } from "../../src/analysis/parsing/typescript-method-parser.js";
import { isDecisionPoint } from "../../src/analysis/complexity/decision-rules.js";

function complexityOf(body: string, signature = "()"): number {
  const [method] = parseMethods("Sample.ts", `function target${signature} {\n${body}\n}`);
  return method.complexity;
}

describe("complexity", () => {
  it("counts every decision node kind", () => {
    const body = [
      "  for (let i = 0; i < 3; i++) {}",
      "  for (const v of [1]) {}",
      "  for (const k in {}) {}",
      "  while (a) { a = false; }",
      "  do { b = false; } while (b);",
      "  if (a && b || c) {}",
      "  try {",
      "    return a ? 1 : 0;",
      "  } catch (e) {",
      "    return 2;",
      "  }",
    ].join("\n");

    // when
    const actual = complexityOf(body, "(a: boolean, b: boolean, c: boolean)");

    // then
    // base + 3 loops(for/of/in) + while + do + if + && + || + ternary + catch = 11
    expect(actual).toBe(11);
  });

  it("counts case clauses but not default", () => {
    const body = [
      "  switch (x) {",
      "    case 1: return 1;",
      "    case 2: return 2;",
      "    default: return 0;",
      "  }",
    ].join("\n");

    // when
    const actual = complexityOf(body, "(x: number)");

    // then
    expect(actual).toBe(3); // base + 2 cases
  });

  it("counts nullish coalescing", () => {
    // when
    const actual = complexityOf("  return a ?? 0;", "(a: number | null)");

    // then
    expect(actual).toBe(2);
  });

  it("has a minimum complexity of 1", () => {
    // when
    const actual = complexityOf("  return 1;");

    // then
    expect(actual).toBe(1);
  });
});

describe("isDecisionPoint", () => {
  it("rejects a non-decision node", () => {
    const sourceFile = ts.createSourceFile("x.ts", "const x = 1;", ts.ScriptTarget.Latest, true);

    // when
    const actual = isDecisionPoint(sourceFile);

    // then
    expect(actual).toBe(false);
  });
});
