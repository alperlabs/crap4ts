import { describe, it, expect } from "vitest";
import ts from "typescript";
import { parseMethods } from "../../src/analysis/parsing/typeScriptMethodParser.js";
import { decisionDelta } from "../../src/analysis/complexity/decisionRules.js";

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
    // base + 3 loops(for/of/in) + while + do + if + && + || + ternary + catch = 11
    expect(complexityOf(body, "(a: boolean, b: boolean, c: boolean)")).toBe(11);
  });

  it("counts case clauses but not default", () => {
    const body = [
      "  switch (x) {",
      "    case 1: return 1;",
      "    case 2: return 2;",
      "    default: return 0;",
      "  }",
    ].join("\n");
    expect(complexityOf(body, "(x: number)")).toBe(3); // base + 2 cases
  });

  it("counts nullish coalescing", () => {
    expect(complexityOf("  return a ?? 0;", "(a: number | null)")).toBe(2);
  });

  it("has a minimum complexity of 1", () => {
    expect(complexityOf("  return 1;")).toBe(1);
  });
});

describe("decisionDelta", () => {
  it("returns 0 for a non-decision node", () => {
    const sourceFile = ts.createSourceFile("x.ts", "const x = 1;", ts.ScriptTarget.Latest, true);
    expect(decisionDelta(sourceFile)).toBe(0);
  });
});
