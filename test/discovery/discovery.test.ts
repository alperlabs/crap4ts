import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { findSourceFiles, isAnalyzableSource } from "../../src/discovery/source-file-finder.js";
import {
  changedFiles,
  changedFilesSince,
  parseStatusLine,
  renameTarget,
} from "../../src/discovery/changed-file-detector.js";
import { moduleRootFor, groupByModuleRoot } from "../../src/discovery/module-resolver.js";

describe("isAnalyzableSource", () => {
  it("accepts .ts/.tsx and rejects declarations and others", () => {
    // when
    const actual = ["a.ts", "a.tsx", "a.d.ts", "a.js"].map(isAnalyzableSource);

    // then
    expect(actual).toEqual([true, true, false, false]);
  });
});

describe("filesystem and git discovery", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-disc-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("finds analyzable files under src, sorted, excluding node_modules and .d.ts", () => {
    mkdirSync(path.join(dir, "src", "nested"), { recursive: true });
    mkdirSync(path.join(dir, "src", "node_modules"), { recursive: true });
    writeFileSync(path.join(dir, "src", "b.ts"), "");
    writeFileSync(path.join(dir, "src", "a.ts"), "");
    writeFileSync(path.join(dir, "src", "types.d.ts"), "");
    writeFileSync(path.join(dir, "src", "nested", "c.tsx"), "");
    writeFileSync(path.join(dir, "src", "node_modules", "dep.ts"), "");

    // when
    const actual = findSourceFiles(dir, ["src"]).map((f) => path.relative(dir, f));

    // then
    expect(actual).toEqual([
      path.join("src", "a.ts"),
      path.join("src", "b.ts"),
      path.join("src", "nested", "c.tsx"),
    ]);
  });

  it("returns empty when there is no src directory", () => {
    // when
    const actual = findSourceFiles(dir, ["src"]);

    // then
    expect(actual).toEqual([]);
  });

  it("keeps only analyzable changed files under src, handling renames (injected git)", () => {
    const output = [
      " M src/keep.ts",
      "?? src/new.tsx",
      " M src/skip.js",
      " M docs/readme.md",
      " M src/types.d.ts",
      "R  src/old.ts -> src/renamed.ts",
      "",
    ].join("\n");

    // when
    const actual = changedFiles(dir, ["src"], () => output).map((f) => path.relative(dir, f));

    // then
    expect(actual).toEqual([
      path.join("src", "keep.ts"),
      path.join("src", "new.tsx"),
      path.join("src", "renamed.ts"),
    ]);
  });

  it("reads changes from a real git repository (default runner)", () => {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "src", "fresh.ts"), "export const x = 1;\n");

    // when
    const actual = changedFiles(dir, ["src"]).map((f) => path.relative(dir, f));

    // then
    expect(actual).toContain(path.join("src", "fresh.ts"));
  });

  it("unions committed and uncommitted changes for --changed-since (injected git)", () => {
    const git = (_root: string, args: string[]): string => {
      if (args[0] === "diff") {
        expect(args).toEqual(["diff", "--name-only", "origin/main...HEAD"]);
        return ["src/committed.ts", "docs/skip.md", ""].join("\n");
      }
      return [" M src/dirty.ts", ""].join("\n");
    };

    // when
    const actual = changedFilesSince(dir, "origin/main", ["src"], git).map((f) =>
      path.relative(dir, f),
    );

    // then
    expect(actual).toEqual([path.join("src", "committed.ts"), path.join("src", "dirty.ts")]);
  });

  it("reads --changed-since from a real git repository (default runner)", () => {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    execFileSync("git", ["-C", dir, "config", "user.email", "t@t"], { cwd: dir });
    execFileSync("git", ["-C", dir, "config", "user.name", "t"], { cwd: dir });
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "src", "a.ts"), "export const a = 1;\n");
    execFileSync("git", ["-C", dir, "add", "."], { cwd: dir });
    execFileSync("git", ["-C", dir, "commit", "-qm", "init"], { cwd: dir });
    writeFileSync(path.join(dir, "src", "b.ts"), "export const b = 2;\n");

    // when
    const actual = changedFilesSince(dir, "HEAD", ["src"]).map((f) => path.relative(dir, f));

    // then
    expect(actual).toEqual([path.join("src", "b.ts")]);
  });

  it("parses and de-quotes status lines, ignoring blanks", () => {
    // when
    const blank = parseStatusLine(dir, "");
    const codeOnly = parseStatusLine(dir, " M ");
    const quoted = parseStatusLine(dir, ' M "src/a b.ts"');
    const plain = renameTarget("a.ts");
    const renamed = renameTarget("old.ts -> new.ts");

    // then
    expect(blank).toBeNull();
    expect(codeOnly).toBeNull();
    expect(quoted).toBe(path.resolve(dir, "src/a b.ts"));
    expect(plain).toBe("a.ts");
    expect(renamed).toBe("new.ts");
  });
});

describe("moduleResolver", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "crap4ts-mod-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("finds the nearest ancestor package.json", () => {
    mkdirSync(path.join(dir, "packages", "a", "src"), { recursive: true });
    writeFileSync(path.join(dir, "package.json"), "{}");
    writeFileSync(path.join(dir, "packages", "a", "package.json"), "{}");

    // when
    const actual = moduleRootFor(dir, path.join(dir, "packages", "a", "src", "x.ts"));

    // then
    expect(actual).toBe(path.join(dir, "packages", "a"));
  });

  it("falls back to the project root when only the root has a package.json", () => {
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "package.json"), "{}");

    // when
    const actual = moduleRootFor(dir, path.join(dir, "src", "x.ts"));

    // then
    expect(actual).toBe(path.resolve(dir));
  });

  it("resolves a file that sits directly in the module root", () => {
    writeFileSync(path.join(dir, "package.json"), "{}");

    // when
    const actual = moduleRootFor(dir, path.join(dir, "x.ts"));

    // then
    expect(actual).toBe(path.resolve(dir));
  });

  it("accepts a directory as the target", () => {
    mkdirSync(path.join(dir, "pkg"), { recursive: true });
    writeFileSync(path.join(dir, "pkg", "package.json"), "{}");

    // when
    const actual = moduleRootFor(dir, path.join(dir, "pkg"));

    // then
    expect(actual).toBe(path.join(dir, "pkg"));
  });

  it("falls back to the project root when no package.json exists at all", () => {
    mkdirSync(path.join(dir, "src"), { recursive: true });

    // when
    const actual = moduleRootFor(dir, path.join(dir, "src", "x.ts"));

    // then
    expect(actual).toBe(path.resolve(dir));
  });

  it("groups files by module root preserving order", () => {
    mkdirSync(path.join(dir, "a"), { recursive: true });
    mkdirSync(path.join(dir, "b"), { recursive: true });
    writeFileSync(path.join(dir, "package.json"), "{}");
    writeFileSync(path.join(dir, "a", "package.json"), "{}");
    writeFileSync(path.join(dir, "b", "package.json"), "{}");

    // when
    const actual = groupByModuleRoot(dir, [
      path.join(dir, "a", "x.ts"),
      path.join(dir, "b", "y.ts"),
      path.join(dir, "a", "z.ts"),
    ]);

    // then
    expect([...actual.keys()]).toEqual([path.join(dir, "a"), path.join(dir, "b")]);
    expect(actual.get(path.join(dir, "a"))).toHaveLength(2);
  });
});
