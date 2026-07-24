import { describe, it, expect } from "vitest";
import ts from "typescript";
import { parseMethods } from "../../src/analysis/parsing/typescript-method-parser.js";
import {
  scriptKindFor,
  fileStem,
  enclosingClassName,
} from "../../src/analysis/parsing/ast-names.js";
import {
  describeDeclaredMethod,
  METHOD_EXTRACTORS,
} from "../../src/analysis/parsing/method-extractors.js";
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
    // when
    const actual = ["a.tsx", "a.jsx", "a.js", "a.mjs", "a.cjs", "a.ts"].map(scriptKindFor);

    // then
    expect(actual).toEqual([
      ts.ScriptKind.TSX,
      ts.ScriptKind.JSX,
      ts.ScriptKind.JS,
      ts.ScriptKind.JS,
      ts.ScriptKind.JS,
      ts.ScriptKind.TS,
    ]);
  });
});

describe("fileStem", () => {
  it("strips directories and extensions", () => {
    // when
    const actual = ["src/foo/Bar.ts", "/abs/path/widget.tsx", "types.d.ts", "plain"].map(fileStem);

    // then
    expect(actual).toEqual(["Bar", "widget", "types", "plain"]);
  });
});

describe("enclosingClassName", () => {
  it("reads class, interface, and named class-expression names", () => {
    const classNode = firstChildOfKind("class Foo {}", ts.isClassDeclaration);
    const interfaceNode = firstChildOfKind("interface Bar {}", ts.isInterfaceDeclaration);
    const classExpr = firstChildOfKind("const C = class Named {};", ts.isClassExpression);

    // when
    const names = [classNode, interfaceNode, classExpr].map(enclosingClassName);

    // then
    expect(names).toEqual(["Foo", "Bar", "Named"]);
  });

  it("returns undefined for anonymous classes and non-containers", () => {
    const anonymous = firstChildOfKind("const C = class {};", ts.isClassExpression);
    const nonContainer = firstChildOfKind("const x = 1;", ts.isVariableStatement);

    // when
    const names = [anonymous, nonContainer].map(enclosingClassName);

    // then
    expect(names).toEqual([undefined, undefined]);
  });

  it("uses the file stem as the class name when the class is anonymous", () => {
    // when
    const [actual] = parseMethods("Sample.ts", "const C = class { m() { return 1; } };");

    // then
    expect(actual.className).toBe("Sample");
  });
});

describe("declaration names", () => {
  it("reads string-literal and numeric member names", () => {
    // when
    const actual = names('const o = { "weird-name"() { return 1; }, 0() { return 2; } };');

    // then
    expect(actual).toEqual(["0", "weird-name"]);
  });

  it("reads computed member names via source text", () => {
    // when
    const [actual] = parseMethods("Sample.ts", 'const o = { ["a" + "b"]: () => 1 };');

    // then
    expect(actual.name).toContain("a");
  });
});

describe("method extractors", () => {
  it("exposes an ordered registry and a first-match describe", () => {
    const fn = firstChildOfKind("function f() { return 1; }", ts.isFunctionDeclaration);

    // when
    const actual = describeDeclaredMethod(fn);

    // then
    expect(METHOD_EXTRACTORS.length).toBeGreaterThan(0);
    expect(actual?.name).toBe("f");
  });

  it("returns null for non-declarations", () => {
    const literal = firstChildOfKind("const x = 5;", ts.isNumericLiteral);

    // when
    const actual = describeDeclaredMethod(literal);

    // then
    expect(actual).toBeNull();
  });

  it("ignores const bindings that are not functions and destructured bindings", () => {
    // when
    const actual = names("const x = 5;\nconst { a } = obj;");

    // then
    expect(actual).toEqual([]);
  });

  it("ignores abstract accessors without a body but keeps concrete ones", () => {
    const source = [
      "abstract class A {",
      "  abstract get missing(): number;",
      "  get present(): number { return 1; }",
      "}",
    ].join("\n");

    // when
    const actual = names(source);

    // then
    expect(actual).toEqual(["get present"]);
  });
});

describe("isDeclaredMethodBoundary", () => {
  it("is true for declared methods and false otherwise", () => {
    const declared = firstChildOfKind("function f() {}", ts.isFunctionDeclaration);
    const literal = firstChildOfKind("const x = 1;", ts.isNumericLiteral);

    // when
    const actual = [isDeclaredMethodBoundary(declared), isDeclaredMethodBoundary(literal)];

    // then
    expect(actual).toEqual([true, false]);
  });
});
