import { describe, it, expect } from "vitest";
import { parseMethods } from "../src/analysis/typeScriptMethodParser.js";
import { slopScore, SMELL_WEIGHTS, type SmellCounts } from "../src/analysis/aiSmells.js";

function smellsOf(body: string, signature = "(x: any): any"): SmellCounts {
  const source = `function target${signature} {\n${body}\n}`;
  const [method] = parseMethods("Sample.ts", source);
  return method.smells;
}

describe("smell counting", () => {
  it("counts instanceof", () => {
    const s = smellsOf("return x instanceof Error;", "(x: unknown): boolean");
    expect(s.instanceOf).toBe(1);
  });

  it("counts typeof value checks", () => {
    const s = smellsOf('return typeof x === "string";', "(x: unknown): boolean");
    expect(s.typeOf).toBe(1);
  });

  it("counts any annotations in signature and body", () => {
    const s = smellsOf("const y: any = x;\nreturn y;");
    // x: any, : any, y: any
    expect(s.anyTypes).toBe(3);
  });

  it("counts non-null assertions", () => {
    const s = smellsOf("return x!.length;", "(x: string | null): number");
    expect(s.nonNullAssertions).toBe(1);
  });

  it("counts as-casts but not as-const", () => {
    const s = smellsOf('const a = x as string;\nconst b = "hi" as const;\nreturn a + b;', "(x: unknown): string");
    expect(s.asCasts).toBe(1);
  });

  it("counts optional chains", () => {
    const s = smellsOf("return x?.a?.b;", "(x: any): any");
    expect(s.optionalChains).toBe(2);
  });

  it("counts nullish coalescing", () => {
    const s = smellsOf("return x ?? 0;", "(x: number | null): number");
    expect(s.nullishCoalescing).toBe(1);
  });

  it("counts try/catch", () => {
    const s = smellsOf("try { return 1; } catch (e) { return 0; }", "(): number");
    expect(s.tryCatch).toBe(1);
  });

  it("counts console calls", () => {
    const s = smellsOf("console.log(x); console.warn(x); return x;", "(x: number): number");
    expect(s.consoleCalls).toBe(2);
  });

  it("counts type predicates and guard-style calls as guards", () => {
    const source = [
      "function isThing(x: unknown): x is string {",
      "  return typeof x === 'string';",
      "}",
      "function use(x: unknown): number {",
      "  return isThing(x) ? 1 : 0;",
      "}",
    ].join("\n");
    const methods = parseMethods("Sample.ts", source);
    const isThing = methods.find((m) => m.name === "isThing")!;
    const use = methods.find((m) => m.name === "use")!;
    expect(isThing.smells.isGuards).toBe(1); // type predicate
    expect(use.smells.isGuards).toBe(1); // guard-style call
  });

  it("does not leak nested method smells to the parent", () => {
    const source = [
      "function parent(x: unknown): number {",
      "  const helper = (y: unknown) => y instanceof Error;",
      "  return helper(x) ? 1 : 0;",
      "}",
    ].join("\n");
    const methods = parseMethods("Sample.ts", source);
    const parent = methods.find((m) => m.name === "parent")!;
    const helper = methods.find((m) => m.name === "helper")!;
    expect(parent.smells.instanceOf).toBe(0);
    expect(helper.smells.instanceOf).toBe(1);
  });

  it("weights the slop score", () => {
    const counts: SmellCounts = {
      isGuards: 1,
      instanceOf: 1,
      typeOf: 0,
      anyTypes: 2,
      nonNullAssertions: 0,
      asCasts: 0,
      optionalChains: 0,
      nullishCoalescing: 0,
      tryCatch: 0,
      consoleCalls: 0,
    };
    const expected =
      SMELL_WEIGHTS.isGuards + SMELL_WEIGHTS.instanceOf + 2 * SMELL_WEIGHTS.anyTypes;
    expect(slopScore(counts)).toBe(expected);
  });
});
