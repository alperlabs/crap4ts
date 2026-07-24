import { describe, it, expect } from "vitest";
import { parseMethods, fileStem } from "../src/analysis/typeScriptMethodParser.js";
import type { MethodDescriptor } from "../src/analysis/methodDescriptor.js";

function parse(source: string, label = "Sample.ts"): MethodDescriptor[] {
  return parseMethods(label, source);
}

function names(methods: MethodDescriptor[]): string[] {
  return methods.map((m) => m.name);
}

describe("parseMethods", () => {
  it("extracts function declarations with lines and complexity", () => {
    const source = [
      "function alpha(a: boolean, b: boolean): number {",
      "  if (a && b) {",
      "    return 1;",
      "  }",
      "  return 0;",
      "}",
    ].join("\n");

    const [method] = parse(source);
    expect(method.name).toBe("alpha");
    expect(method.className).toBe("Sample");
    expect(method.startLine).toBe(1);
    expect(method.endLine).toBe(6);
    expect(method.complexity).toBe(3); // base + if + &&
  });

  it("uses the enclosing class name for methods", () => {
    const source = [
      "class Widget {",
      "  render(x: number): number {",
      "    return x > 0 ? 1 : 0;",
      "  }",
      "}",
    ].join("\n");

    const [method] = parse(source);
    expect(method.name).toBe("render");
    expect(method.className).toBe("Widget");
    expect(method.complexity).toBe(2); // base + ternary
  });

  it("counts arrow functions bound to a named variable", () => {
    const source = "const isReady = (x: number): boolean => x > 0 && x < 10;";
    const [method] = parse(source);
    expect(method.name).toBe("isReady");
    expect(method.complexity).toBe(2); // base + &&
  });

  it("ignores constructors", () => {
    const source = [
      "class Widget {",
      "  constructor(private value: number) {}",
      "  present(): number { return 1; }",
      "}",
    ].join("\n");

    expect(names(parse(source))).toEqual(["present"]);
  });

  it("ignores abstract and overload signatures without a body", () => {
    const source = [
      "abstract class Base {",
      "  abstract missing(): number;",
      "  present(): number { return 1; }",
      "}",
    ].join("\n");

    expect(names(parse(source))).toEqual(["present"]);
  });

  it("folds anonymous inline callbacks into the enclosing method", () => {
    const source = [
      "function outer(items: number[]): number {",
      "  return items.filter((x) => x > 0 && x < 5).length;",
      "}",
    ].join("\n");

    const methods = parse(source);
    expect(names(methods)).toEqual(["outer"]);
    expect(methods[0].complexity).toBe(2); // callback's && counts toward outer
  });

  it("treats named nested arrows as separate boundaries", () => {
    const source = [
      "function outer(items: number[]): number {",
      "  const helper = (x: number) => (x > 0 ? 1 : 0);",
      "  return helper(items[0]);",
      "}",
    ].join("\n");

    const methods = parse(source);
    expect(names(methods).sort()).toEqual(["helper", "outer"]);
    const outer = methods.find((m) => m.name === "outer")!;
    const helper = methods.find((m) => m.name === "helper")!;
    expect(outer.complexity).toBe(1); // ternary belongs to helper
    expect(helper.complexity).toBe(2);
  });

  it("counts all decision node kinds", () => {
    const source = [
      "function score(a: boolean, b: boolean, values: number[]): number {",
      "  for (let i = 0; i < values.length; i++) {}",
      "  for (const v of values) {}",
      "  while (a) { a = false; }",
      "  do { b = false; } while (b);",
      "  if (a && b || values.length > 0) {}",
      "  try {",
      "    return a ? 1 : 0;",
      "  } catch (e) {",
      "    return 2;",
      "  }",
      "}",
    ].join("\n");

    const [method] = parse(source);
    expect(method.complexity).toBe(10);
  });

  it("counts switch case clauses but not default", () => {
    const source = [
      "function pick(x: number): number {",
      "  switch (x) {",
      "    case 1: return 1;",
      "    case 2: return 2;",
      "    default: return 0;",
      "  }",
      "}",
    ].join("\n");

    const [method] = parse(source);
    expect(method.complexity).toBe(3); // base + 2 cases
  });

  it("counts nullish coalescing as a decision", () => {
    const source = "const pick = (a: number | null): number => a ?? 0;";
    const [method] = parse(source);
    expect(method.complexity).toBe(2);
  });
});

describe("fileStem", () => {
  it("strips directories and extensions", () => {
    expect(fileStem("src/foo/Bar.ts")).toBe("Bar");
    expect(fileStem("/abs/path/widget.tsx")).toBe("widget");
    expect(fileStem("types.d.ts")).toBe("types");
  });
});
