import { describe, it, expect } from "vitest";
import ts from "typescript";
import { parseMethods } from "../../src/analysis/parsing/typeScriptMethodParser.js";
import type { SmellCounts } from "../../src/analysis/smells/smellCounts.js";
import { slopScore, emptyCounts, addCounts } from "../../src/analysis/smells/smellCounts.js";
import { SMELL_DETECTORS } from "../../src/analysis/smells/registry.js";
import { isGuardName } from "../../src/analysis/smells/detectors/guardSmell.js";
import { callTargetName, callReceiverName } from "../../src/analysis/smells/detectors/callName.js";

function smellsOf(body: string, signature = "(x: any): any"): SmellCounts {
  const [method] = parseMethods("Sample.ts", `function target${signature} {\n${body}\n}`);
  return method.smells;
}

describe("smell detectors", () => {
  it("counts instanceof", () => {
    expect(smellsOf("return x instanceof Error;", "(x: unknown): boolean").instanceOf).toBe(1);
  });

  it("counts typeof value checks", () => {
    expect(smellsOf('return typeof x === "string";', "(x: unknown): boolean").typeOf).toBe(1);
  });

  it("counts any annotations in signature and body", () => {
    expect(smellsOf("const y: any = x;\nreturn y;").anyTypes).toBe(3); // x, return, y
  });

  it("counts non-null assertions", () => {
    expect(smellsOf("return x!.length;", "(x: string | null): number").nonNullAssertions).toBe(1);
  });

  it("counts as-casts but not as-const or typeof-only code", () => {
    const s = smellsOf(
      'const a = x as string;\nconst b = "hi" as const;\nreturn a + b;',
      "(x: unknown): string",
    );
    expect(s.asCasts).toBe(1);
  });

  it("counts angle-bracket type assertions", () => {
    // `<T>x` assertions are only valid in .ts (non-JSX) files.
    const [method] = parseMethods(
      "cast.ts",
      "function target(x: unknown): string {\n  return <string>x;\n}",
    );
    expect(method.smells.asCasts).toBe(1);
  });

  it("counts optional chains on properties, elements, and calls", () => {
    expect(smellsOf("return x?.a?.[0]?.();", "(x: any): any").optionalChains).toBe(3);
  });

  it("counts nullish coalescing", () => {
    expect(smellsOf("return x ?? 0;", "(x: number | null): number").nullishCoalescing).toBe(1);
  });

  it("counts try/catch", () => {
    expect(smellsOf("try { return 1; } catch (e) { return 0; }", "(): number").tryCatch).toBe(1);
  });

  it("counts console calls only", () => {
    const s = smellsOf("console.log(x);\nlogger.info(x);\nreturn x;", "(x: number): number");
    expect(s.consoleCalls).toBe(1);
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
    expect(methods.find((m) => m.name === "isThing")!.smells.isGuards).toBe(1);
    expect(methods.find((m) => m.name === "use")!.smells.isGuards).toBe(1);
  });

  it("does not leak nested method smells to the parent", () => {
    const source = [
      "function parent(x: unknown): number {",
      "  const helper = (y: unknown) => y instanceof Error;",
      "  return helper(x) ? 1 : 0;",
      "}",
    ].join("\n");
    const methods = parseMethods("Sample.ts", source);
    expect(methods.find((m) => m.name === "parent")!.smells.instanceOf).toBe(0);
    expect(methods.find((m) => m.name === "helper")!.smells.instanceOf).toBe(1);
  });

  it("reports zero smells for clean code", () => {
    const s = smellsOf("return x + 1;", "(x: number): number");
    expect(Object.values(s).every((count) => count === 0)).toBe(true);
  });
});

describe("guard names", () => {
  it("matches is/has/can/should prefixes", () => {
    expect(isGuardName("isReady")).toBe(true);
    expect(isGuardName("hasValue")).toBe(true);
    expect(isGuardName("canRun")).toBe(true);
    expect(isGuardName("shouldStop")).toBe(true);
    expect(isGuardName("island")).toBe(false);
    expect(isGuardName("compute")).toBe(false);
  });
});

describe("call name helpers", () => {
  function firstCall(source: string): ts.CallExpression {
    const sf = ts.createSourceFile("x.ts", source, ts.ScriptTarget.Latest, true);
    let found: ts.CallExpression | undefined;
    const visit = (node: ts.Node): void => {
      if (found === undefined && ts.isCallExpression(node)) {
        found = node;
      }
      node.forEachChild(visit);
    };
    visit(sf);
    return found!;
  }

  it("reads identifier and property callees, undefined otherwise", () => {
    expect(callTargetName(firstCall("foo();"))).toBe("foo");
    expect(callTargetName(firstCall("obj.bar();"))).toBe("bar");
    expect(callTargetName(firstCall("arr[0]();"))).toBeUndefined();
  });

  it("reads the receiver identifier only", () => {
    expect(callReceiverName(firstCall("console.log();"))).toBe("console");
    expect(callReceiverName(firstCall("foo();"))).toBeUndefined();
    expect(callReceiverName(firstCall("a.b.c();"))).toBeUndefined();
  });
});

describe("smell aggregation", () => {
  it("weights the slop score by detector", () => {
    const counts = emptyCounts(SMELL_DETECTORS);
    counts.isGuards = 1;
    counts.anyTypes = 2;
    // guard weight 2 + any weight 3 * 2 = 8
    expect(slopScore(counts, SMELL_DETECTORS)).toBe(8);
  });

  it("adds count objects in place", () => {
    const a = emptyCounts(SMELL_DETECTORS);
    a.tryCatch = 1;
    const b = emptyCounts(SMELL_DETECTORS);
    b.tryCatch = 2;
    expect(addCounts(a, b).tryCatch).toBe(3);
  });
});
