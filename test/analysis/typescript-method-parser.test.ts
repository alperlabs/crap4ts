import { describe, it, expect } from "vitest";
import { parseMethods } from "../../src/analysis/parsing/typescript-method-parser.js";
import type { MethodDescriptor } from "../../src/analysis/method-descriptor.js";

function parse(source: string, label = "Sample.ts"): MethodDescriptor[] {
  return parseMethods(label, source);
}

function names(methods: MethodDescriptor[]): string[] {
  return methods.map((m) => m.name).sort();
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

    // when
    const [actual] = parse(source);

    // then
    expect(actual).toMatchObject({
      name: "alpha",
      className: "Sample",
      startLine: 1,
      endLine: 6,
      complexity: 3, // base + if + &&
    });
  });

  it("uses the enclosing class name for methods", () => {
    const source = [
      "class Widget {",
      "  render(x: number): number {",
      "    return x > 0 ? 1 : 0;",
      "  }",
      "}",
    ].join("\n");

    // when
    const [actual] = parse(source);

    // then
    expect(actual.name).toBe("render");
    expect(actual.className).toBe("Widget");
    expect(actual.complexity).toBe(2); // base + ternary
  });

  it("counts named arrow and function-expression bindings", () => {
    // when
    const arrow = parse("const isReady = (x: number): boolean => x > 0 && x < 10;");
    const fn = parse("const run = function (a: boolean) { return a ? 1 : 0; };");

    // then
    expect(arrow[0]).toMatchObject({ name: "isReady", complexity: 2 });
    expect(fn[0]).toMatchObject({ name: "run", complexity: 2 });
  });

  it("counts object-literal and class-property function members", () => {
    // when
    const obj = parse("const handlers = { onClick: () => 1, onHover() { return 2; } };");
    const prop = parse("class C {\n  ready = (x: number) => x > 0;\n}");

    // then
    expect(names(obj)).toEqual(["onClick", "onHover"]);
    expect(prop[0]).toMatchObject({ name: "ready", className: "C" });
  });

  it("counts getters and setters", () => {
    const source = [
      "class C {",
      "  get value(): number { return 1; }",
      "  set value(v: number) { this._v = v; }",
      "}",
    ].join("\n");

    // when
    const actual = names(parse(source));

    // then
    expect(actual).toEqual(["get value", "set value"]);
  });

  it("ignores constructors and body-less signatures", () => {
    const source = [
      "abstract class Base {",
      "  constructor(private value: number) {}",
      "  abstract missing(): number;",
      "  present(): number { return 1; }",
      "}",
    ].join("\n");

    // when
    const actual = names(parse(source));

    // then
    expect(actual).toEqual(["present"]);
  });

  it("ignores function overload signatures without a body", () => {
    const source = [
      "function f(x: number): number;",
      "function f(x: string): string;",
      "function f(x: unknown): unknown { return x; }",
    ].join("\n");

    // when
    const actual = parse(source);

    // then
    expect(actual).toHaveLength(1);
    expect(actual[0].name).toBe("f");
  });

  it("folds anonymous inline callbacks into the enclosing method", () => {
    const source = [
      "function outer(items: number[]): number {",
      "  return items.filter((x) => x > 0 && x < 5).length;",
      "}",
    ].join("\n");

    // when
    const actual = parse(source);

    // then
    expect(names(actual)).toEqual(["outer"]);
    expect(actual[0].complexity).toBe(2); // callback && counts toward outer
  });

  it("treats named nested arrows as separate boundaries", () => {
    const source = [
      "function outer(items: number[]): number {",
      "  const helper = (x: number) => (x > 0 ? 1 : 0);",
      "  return helper(items[0]);",
      "}",
    ].join("\n");

    // when
    const actual = parse(source);

    // then
    expect(names(actual)).toEqual(["helper", "outer"]);
    expect(actual.find((m) => m.name === "outer")!.complexity).toBe(1);
    expect(actual.find((m) => m.name === "helper")!.complexity).toBe(2);
  });
});
