import { describe, it, expect } from "vitest";
import ts from "typescript";
import { parseMethods } from "../../src/analysis/parsing/typescript-method-parser.js";
import type { SmellCounts } from "../../src/analysis/smells/smell-counts.js";
import { slopScore, emptyCounts, addCounts } from "../../src/analysis/smells/smell-counts.js";
import { SMELL_DETECTORS } from "../../src/analysis/smells/registry.js";
import { findSmells } from "../../src/analysis/smells/smell-counter.js";
import { isGuardName } from "../../src/analysis/smells/detectors/guard-smell.js";
import { callTargetName, callReceiverName } from "../../src/analysis/smells/detectors/call-name.js";

function smellsOf(body: string, signature = "(x: any): any"): SmellCounts {
  const [method] = parseMethods("Sample.ts", `function target${signature} {\n${body}\n}`);
  return method.smells;
}

describe("smell detectors", () => {
  it("counts instanceof", () => {
    // when
    const actual = smellsOf("return x instanceof Error;", "(x: unknown): boolean");

    // then
    expect(actual.instanceOf).toBe(1);
  });

  it("counts typeof value checks", () => {
    // when
    const actual = smellsOf('return typeof x === "string";', "(x: unknown): boolean");

    // then
    expect(actual.typeOf).toBe(1);
  });

  it("counts any annotations in signature and body", () => {
    // when
    const actual = smellsOf("const y: any = x;\nreturn y;");

    // then
    expect(actual.anyTypes).toBe(3); // x, return, y
  });

  it("counts non-null assertions", () => {
    // when
    const actual = smellsOf("return x!.length;", "(x: string | null): number");

    // then
    expect(actual.nonNullAssertions).toBe(1);
  });

  it("counts as-casts but not as-const", () => {
    // when
    const actual = smellsOf(
      'const a = x as string;\nconst b = "hi" as const;\nreturn a + b;',
      "(x: unknown): string",
    );

    // then
    expect(actual.asCasts).toBe(1);
  });

  it("counts angle-bracket type assertions", () => {
    // `<T>x` assertions are only valid in .ts (non-JSX) files.
    const source = "function target(x: unknown): string {\n  return <string>x;\n}";

    // when
    const [actual] = parseMethods("cast.ts", source);

    // then
    expect(actual.smells.asCasts).toBe(1);
  });

  it("counts optional chains on properties, elements, and calls", () => {
    // when
    const actual = smellsOf("return x?.a?.[0]?.();", "(x: any): any");

    // then
    expect(actual.optionalChains).toBe(3);
  });

  it("counts nullish coalescing", () => {
    // when
    const actual = smellsOf("return x ?? 0;", "(x: number | null): number");

    // then
    expect(actual.nullishCoalescing).toBe(1);
  });

  it("counts try/catch", () => {
    // when
    const actual = smellsOf("try { return 1; } catch (e) { return 0; }", "(): number");

    // then
    expect(actual.tryCatch).toBe(1);
  });

  it("counts empty catch blocks but not handled ones", () => {
    // when
    const swallowed = smellsOf("try { return 1; } catch {}\nreturn 0;", "(): number");
    const handled = smellsOf("try { return 1; } catch (e) { throw e; }", "(): number");

    // then
    expect(swallowed.emptyCatches).toBe(1);
    expect(swallowed.tryCatch).toBe(1);
    expect(handled.emptyCatches).toBe(0);
  });

  it("counts suppression comments once each, ignoring ordinary comments", () => {
    const body = [
      "// @ts-expect-error legacy shim",
      "const a = x.missing;",
      "// eslint-disable-next-line no-console",
      "const b = 1;",
      "// a perfectly ordinary comment",
      "return a + b;",
    ].join("\n");

    // when
    const actual = smellsOf(body, "(x: never): number");

    // then
    expect(actual.suppressions).toBe(2);
  });

  it("counts a stack of suppression comments on one statement once", () => {
    const body = [
      "// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access",
      "// @ts-expect-error legacy shim",
      "return x.missing;",
    ].join("\n");

    // when
    const actual = smellsOf(body, "(x: never): number");

    // then — the unit of smell is the suppressed node, not the comment
    expect(actual.suppressions).toBe(1);
  });

  it("counts loose equality but exempts the == null idiom", () => {
    const body = [
      "if (x == 1) return 1;",
      "if (x != 2) return 2;",
      "if (x == null) return 3;",
      "if (null != x) return 4;",
      "if (x === 5) return 5;",
      "return x + 0;",
    ].join("\n");

    // when
    const actual = smellsOf(body, "(x: number | null): number");

    // then
    expect(actual.looseEquality).toBe(2);
  });

  it("counts var declarations but not let, const, or for-loop let", () => {
    const body = [
      "var a = 1;",
      "let b = 2;",
      "const c = 3;",
      "for (var i = 0; i < 1; i++) { b += i; }",
      "return a + b + c;",
    ].join("\n");

    // when
    const actual = smellsOf(body, "(): number");

    // then
    expect(actual.varDeclarations).toBe(2);
  });

  it("counts console calls only", () => {
    // when
    const actual = smellsOf("console.log(x);\nlogger.info(x);\nreturn x;", "(x: number): number");

    // then
    expect(actual.consoleCalls).toBe(1);
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

    // when
    const actual = parseMethods("Sample.ts", source);

    // then
    expect(actual.find((m) => m.name === "isThing")!.smells.isGuards).toBe(1);
    expect(actual.find((m) => m.name === "use")!.smells.isGuards).toBe(1);
  });

  it("does not leak nested method smells to the parent", () => {
    const source = [
      "function parent(x: unknown): number {",
      "  const helper = (y: unknown) => y instanceof Error;",
      "  return helper(x) ? 1 : 0;",
      "}",
    ].join("\n");

    // when
    const actual = parseMethods("Sample.ts", source);

    // then
    expect(actual.find((m) => m.name === "parent")!.smells.instanceOf).toBe(0);
    expect(actual.find((m) => m.name === "helper")!.smells.instanceOf).toBe(1);
  });

  it("reports zero smells for clean code", () => {
    // when
    const actual = smellsOf("return x + 1;", "(x: number): number");

    // then
    expect(Object.values(actual).every((count) => count === 0)).toBe(true);
  });
});

describe("smell findings", () => {
  it("locates each occurrence by file and 1-based line", () => {
    const source = [
      "function target(x: unknown): boolean {",
      "  const y = x as string;",
      "  return x instanceof Error;",
      "}",
    ].join("\n");
    const sourceFile = ts.createSourceFile("sample.ts", source, ts.ScriptTarget.Latest, true);

    // when
    const findings = findSmells(sourceFile.statements[0]);

    // then
    const located = findings.map((f) => ({ key: f.detector.key, file: f.file, line: f.line }));
    expect(located).toEqual([
      { key: "asCasts", file: "sample.ts", line: 2 },
      { key: "instanceOf", file: "sample.ts", line: 3 },
    ]);
  });
});

describe("detector registry hygiene", () => {
  it("gives every detector a unique key and complete metadata", () => {
    const keys = SMELL_DETECTORS.map((detector) => detector.key);

    // then
    expect(new Set(keys).size).toBe(SMELL_DETECTORS.length);
    for (const detector of SMELL_DETECTORS) {
      expect(detector.label.length).toBeGreaterThan(0);
      expect(detector.advice.length).toBeGreaterThan(0);
      expect(detector.weight).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("guard names", () => {
  it("matches is/has/can/should prefixes", () => {
    // when
    const matches = ["isReady", "hasValue", "canRun", "shouldStop"].map(isGuardName);
    const nonMatches = ["island", "compute"].map(isGuardName);

    // then
    expect(matches).toEqual([true, true, true, true]);
    expect(nonMatches).toEqual([false, false]);
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
    // when
    const identifier = callTargetName(firstCall("foo();"));
    const property = callTargetName(firstCall("obj.bar();"));
    const element = callTargetName(firstCall("arr[0]();"));

    // then
    expect(identifier).toBe("foo");
    expect(property).toBe("bar");
    expect(element).toBeUndefined();
  });

  it("reads the receiver identifier only", () => {
    // when
    const receiver = callReceiverName(firstCall("console.log();"));
    const bareCall = callReceiverName(firstCall("foo();"));
    const nestedReceiver = callReceiverName(firstCall("a.b.c();"));

    // then
    expect(receiver).toBe("console");
    expect(bareCall).toBeUndefined();
    expect(nestedReceiver).toBeUndefined();
  });
});

describe("smell aggregation", () => {
  it("weights the slop score by detector", () => {
    const counts = emptyCounts(SMELL_DETECTORS);
    counts.isGuards = 1;
    counts.anyTypes = 2;

    // when
    const actual = slopScore(counts, SMELL_DETECTORS);

    // then
    expect(actual).toBe(8); // guard weight 2 + any weight 3 * 2
  });

  it("adds count objects in place", () => {
    const a = emptyCounts(SMELL_DETECTORS);
    a.tryCatch = 1;
    const b = emptyCounts(SMELL_DETECTORS);
    b.tryCatch = 2;

    // when
    const actual = addCounts(a, b);

    // then
    expect(actual.tryCatch).toBe(3);
  });
});
