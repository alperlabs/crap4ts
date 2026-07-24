import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  findSourceFilesUnderSrc,
  isAnalyzableSource,
} from "../src/discovery/sourceFileFinder.js";
import { changedFilesUnderSrc } from "../src/discovery/changedFileDetector.js";
import { moduleRootFor, groupByModuleRoot } from "../src/discovery/moduleResolver.js";

describe("isAnalyzableSource", () => {
  it("accepts .ts and .tsx, rejects declarations and others", () => {
    expect(isAnalyzableSource("a.ts")).toBe(true);
    expect(isAnalyzableSource("a.tsx")).toBe(true);
    expect(isAnalyzableSource("a.d.ts")).toBe(false);
    expect(isAnalyzableSource("a.js")).toBe(false);
  });
});

describe("filesystem discovery", () => {
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

    const files = findSourceFilesUnderSrc(dir).map((f) => path.relative(dir, f));
    expect(files).toEqual([
      path.join("src", "a.ts"),
      path.join("src", "b.ts"),
      path.join("src", "nested", "c.tsx"),
    ]);
  });

  it("returns empty when there is no src directory", () => {
    expect(findSourceFilesUnderSrc(dir)).toEqual([]);
  });
});

describe("changedFilesUnderSrc", () => {
  it("keeps only analyzable files under src and handles renames", () => {
    const root = "/repo";
    const output = [
      " M src/keep.ts",
      "?? src/new.tsx",
      " M src/skip.js",
      " M docs/readme.md",
      " M src/types.d.ts",
      'R  src/old.ts -> src/renamed.ts',
      "",
    ].join("\n");

    const files = changedFilesUnderSrc(root, () => output).map((f) =>
      f.replace(path.resolve(root) + path.sep, ""),
    );
    expect(files.sort()).toEqual(
      [path.join("src", "keep.ts"), path.join("src", "new.tsx"), path.join("src", "renamed.ts")].sort(),
    );
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
    const file = path.join(dir, "packages", "a", "src", "x.ts");

    expect(moduleRootFor(dir, file)).toBe(path.join(dir, "packages", "a"));
  });

  it("falls back to the project root when no package.json is nearer", () => {
    mkdirSync(path.join(dir, "src"), { recursive: true });
    const file = path.join(dir, "src", "x.ts");
    expect(moduleRootFor(dir, file)).toBe(path.resolve(dir));
  });

  it("groups files by module root preserving order", () => {
    mkdirSync(path.join(dir, "a"), { recursive: true });
    mkdirSync(path.join(dir, "b"), { recursive: true });
    writeFileSync(path.join(dir, "package.json"), "{}");
    writeFileSync(path.join(dir, "a", "package.json"), "{}");
    writeFileSync(path.join(dir, "b", "package.json"), "{}");

    const grouped = groupByModuleRoot(dir, [
      path.join(dir, "a", "x.ts"),
      path.join(dir, "b", "y.ts"),
      path.join(dir, "a", "z.ts"),
    ]);
    expect([...grouped.keys()]).toEqual([path.join(dir, "a"), path.join(dir, "b")]);
    expect(grouped.get(path.join(dir, "a"))).toHaveLength(2);
  });
});
