import { describe, it, expect } from "vitest";
import ts from "typescript";
import { parseMethods } from "../../src/analysis/parsing/typeScriptMethodParser.js";
import {
  scriptKindFor,
  fileStem,
  enclosingClassName,
} from "../../src/analysis/parsing/astNames.js";
import {
  describeDeclaredMethod,
  METHOD_EXTRACTORS,
} from "../../src/analysis/parsing/methodExtractors.js";
import { isDeclaredMethodBoundary } from "../../src/analysis/parsing/boundaries.js";

function names(source: string, label = "Sample.ts"): string[] {
  return parseMethods(label, source)
    .map((m) => m.name)
    .sort();
}

function firstChildOfKind(source: string, predicate: (n: ts.Node) => boolean): ts.Node {
  const sf = ts.createSourceFile("x.ts", source, ts.ScriptTarget.Latest, true);
  let found: ts.Node | undefined;
  const visit = (node: ts.Node): void => {
    if (found === undefined && predicate(node)) {
      found = node;
    }
    node.forEachChild(visit);
  };
  visit(sf);
  return found!;
}

describe("scriptKindFor", () => {
  it("maps extensions to script kinds", () => {
    expect(scriptKindFor("a.tsx")).toBe(ts.ScriptKind.TSX);
    expect(scriptKindFor("a.jsx")).toBe(ts.ScriptKind.JSX);
    expect(scriptKindFor("a.js")).toBe(ts.ScriptKind.JS);
    expect(scriptKindFor("a.mjs")).toBe(ts.ScriptKind.JS);
    expect(scriptKindFor("a.cjs")).toBe(ts.ScriptKind.JS);
    expect(scriptKindFor("a.ts")).toBe(ts.ScriptKind.TS);
  });
});

describe("fileStem", () => {
  it("strips directories and extensions", () => {
    expect(fileStem("src/foo/Bar.ts")).toBe("Bar");
    expect(fileStem("/abs/path/widget.tsx")).toBe("widget");
    expect(fileStem("types.d.ts")).toBe("types");
    expect(fileStem("plain")).toBe("plain");
  });
});

describe("enclosingClassName", () => {
  it("reads class, interface, and named class-expression names", () => {
    expect(enclosingClassName(firstChildOfKind("class Foo {}", ts.isClassDeclaration))).toBe("Foo");
    expect(
      enclosingClassName(firstChildOfKind("interface Bar {}", ts.isInterfaceDeclaration)),
    ).toBe("Bar");
    expect(
      enclosingClassName(firstChildOfKind("const C = class Named {};", ts.isClassExpression)),
    ).toBe("Named");
  });

  it("returns undefined for anonymous classes and non-containers", () => {
    expect(
      enclosingClassName(firstChildOfKind("const C = class {};", ts.isClassExpression)),
    ).toBeUndefined();
    expect(
      enclosingClassName(firstChildOfKind("const x = 1;", ts.isVariableStatement)),
    ).toBeUndefined();
  });

  it("uses the file stem as the class name when the class is anonymous", () => {
    const [method] = parseMethods("Sample.ts", "const C = class { m() { return 1; } };");
    expect(method.className).toBe("Sample");
  });
});

describe("declaration names", () => {
  it("reads string-literal and numeric member names", () => {
    expect(names('const o = { "weird-name"() { return 1; }, 0() { return 2; } };')).toEqual([
      "0",
      "weird-name",
    ]);
  });

  it("reads computed member names via source text", () => {
    const [method] = parseMethods("Sample.ts", 'const o = { ["a" + "b"]: () => 1 };');
    expect(method.name).toContain("a");
  });
});

describe("method extractors", () => {
  it("exposes an ordered registry and a first-match describe", () => {
    expect(METHOD_EXTRACTORS.length).toBeGreaterThan(0);
    const fn = firstChildOfKind("function f() { return 1; }", ts.isFunctionDeclaration);
    expect(describeDeclaredMethod(fn)?.name).toBe("f");
  });

  it("returns null for non-declarations", () => {
    const literal = firstChildOfKind("const x = 5;", ts.isNumericLiteral);
    expect(describeDeclaredMethod(literal)).toBeNull();
  });

  it("ignores const bindings that are not functions and destructured bindings", () => {
    expect(names("const x = 5;\nconst { a } = obj;")).toEqual([]);
  });

  it("ignores abstract accessors without a body but keeps concrete ones", () => {
    const source = [
      "abstract class A {",
      "  abstract get missing(): number;",
      "  get present(): number { return 1; }",
      "}",
    ].join("\n");
    expect(names(source)).toEqual(["get present"]);
  });
});

describe("isDeclaredMethodBoundary", () => {
  it("is true for declared methods and false otherwise", () => {
    expect(
      isDeclaredMethodBoundary(firstChildOfKind("function f() {}", ts.isFunctionDeclaration)),
    ).toBe(true);
    expect(isDeclaredMethodBoundary(firstChildOfKind("const x = 1;", ts.isNumericLiteral))).toBe(
      false,
    );
  });
});
