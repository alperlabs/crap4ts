# crap4ts Specification

## 1. Purpose

`crap4ts` is a CRAP metric analyzer for TypeScript projects, modeled after
`crap4java`, extended with AI-slop heuristics.

It shall:

- locate TypeScript source files to analyze
- generate statement coverage for the owning package of each analyzed file set
- parse TypeScript methods and estimate cyclomatic complexity
- count AI-slop smells per method
- combine complexity and coverage into CRAP scores
- print a tabular report sorted by worst CRAP score first, plus a slop breakdown
- fail when the maximum CRAP score exceeds the configured threshold

`crap4ts` is intended as a project-quality gate.

## 2. Scope

This specification defines the command-line contract, source file selection,
coverage generation behavior, method parsing, CRAP computation, AI-slop
counting, report ordering, and exit codes.

It does not define non-Node execution, non-Istanbul coverage formats, a
machine-readable report format, or configurable thresholds through the CLI.

## 3. Terminology

- `project root` — the working root from which `crap4ts` is invoked.
- `module root` — the nearest ancestor directory of an analyzed file that
  contains `package.json`. If none exists below the project root, the project
  root is the module root.
- `method metric` — one report row: method identity, cyclomatic complexity,
  coverage, CRAP score, and slop score.
- `coverage N/A` — the state where no coverage data could be assigned to a
  method.
- `declared method` — a named, body-carrying function-like node reported as its
  own row (see §8.1).

## 4. Command-Line Interface

### 4.1 Supported Forms

- `crap4ts`
- `crap4ts --changed`
- `crap4ts <path...>`
- `crap4ts --help`

### 4.2 Mode Semantics

- no arguments — analyze all TypeScript source files under `src/`.
- `--changed` — analyze changed TypeScript source files under `src/`.
- `<path...>` — for each explicit path: if a file, analyze it directly; if a
  directory, analyze all TypeScript files under that directory's `src/` subtree.
- `--help` — print usage text and exit successfully.

### 4.3 Invalid Usage

The tool shall exit with usage error when argument parsing fails (for example,
`--changed` combined with file arguments) and shall print usage text.

## 5. File Selection Rules

### 5.1 Default Source Discovery

Analyze all `.ts`/`.tsx` files under `<project-root>/src/**`, excluding `.d.ts`
declaration files and any `node_modules` directory.

### 5.2 Changed-File Discovery

In `--changed` mode: invoke `git status --porcelain`; interpret modified, added,
untracked, and renamed files (using the rename target); retain only analyzable
files under `<project-root>/src/`; sort in path order and de-duplicate.

### 5.3 Explicit Paths

File paths are analyzed directly; directory paths expand to analyzable files
under `<dir>/src/**`; duplicates are removed; the final list is sorted in path
order.

### 5.4 Empty Selection

If no files are selected, print `No TypeScript files to analyze.` and exit
successfully.

## 6. Module Grouping

Group selected files by module root before coverage generation. Determine the
module root by walking upward from the file's directory until a `package.json`
is found or the walk leaves the project root; otherwise use the project root.
Coverage generation and coverage lookup occur once per module group.

## 7. Coverage Pipeline

For each module group: (1) delete stale coverage artifacts, (2) run the coverage
command, (3) read the resulting Istanbul JSON, (4) analyze the selected files.

### 7.1 Stale Artifact Cleanup

Before coverage generation, delete the module-local `coverage/` directory.

### 7.2 Coverage Command

Coverage generation runs a command against the module root (default `npm test`)
expected to emit `coverage/coverage-final.json` in Istanbul format. A non-zero
exit fails the run.

### 7.3 Missing Coverage JSON

If the expected coverage JSON does not exist afterward, print a warning to
stderr and report coverage for that module's methods as `N/A`.

## 8. Method Parsing

The tool shall parse TypeScript using the TypeScript compiler API and identify
declared methods with their class name, method name, source location,
cyclomatic complexity, and smell counts. Full type resolution is not required.

### 8.1 Declared Methods

A declared method is one of:

- a function declaration with a body,
- a class/object method declaration or accessor with a body (not a constructor),
- an arrow function or function expression bound to a named variable or property.

### 8.2 Exclusions

The parser shall ignore constructors, body-less signatures (overloads,
`abstract`, `declare`), and anonymous inline callbacks. The decision points and
smells of an anonymous inline callback fold into the enclosing declared method.

### 8.3 Complexity Counting

Cyclomatic complexity is computed from AST structure: start at 1 and add one for
each `if`, `for`/`for-in`/`for-of`, `while`/`do-while`, `case` clause (not
`default`), `catch` clause, conditional (ternary) expression, and each `&&`,
`||`, and `??` operator. Nested declared methods are not descended into. The
result is an integer `CC >= 1`.

## 9. AI-Slop Metrics

For each declared method the tool shall count the smells defined in the README
table (guards, `instanceof`, `typeof`, `any`, non-null assertions, `as` casts,
optional chaining, nullish coalescing, try/catch, `console.*`) over the
declaration node, without descending into nested declared methods. Each method's
weighted slop score is the sum of its counts times their weights. Slop scores do
not affect exit codes.

The set of heuristics is a registry of independent detectors; an implementation
may add or remove heuristics without changing the counting, scoring, or report
machinery.

## 10. Coverage Attribution

Coverage is attributed per method by taking the statements whose starting line
falls within the method's line range and computing `covered / total * 100`. If
no statements fall in range, coverage is `N/A` and CRAP is `N/A`.

## 11. CRAP Formula

For methods with known coverage: `CRAP = CC^2 * (1 - coverage)^3 + CC`, where
`coverage` is the fraction in `0.0..1.0`. Because `CC >= 1`, the minimum possible
CRAP score is `1.0` (complexity 1 at full coverage).

## 12. Report

Print a tabular report with method name, class name, cyclomatic complexity,
coverage percentage or `N/A`, CRAP score or `N/A`, and slop score. Sort by CRAP
descending, with `N/A` CRAP rows after numeric rows. Follow the table with an
AI-slop breakdown: per-category totals, the aggregate slop score, and the
sloppiest methods.

## 13. Threshold

The CRAP threshold is `8.0`. If the maximum numeric CRAP value exceeds `8.0`,
print `CRAP threshold exceeded: <max> > 8.0` to stderr and exit with
threshold-failure status. If there are no numeric CRAP values, the maximum is
`0.0` and the threshold is not exceeded.

## 14. Exit Codes

- `0` — successful analysis (including empty selection or all scores at or below
  threshold).
- `1` — CLI usage error.
- `2` — CRAP threshold exceeded.

## 15. Non-Goals

Configurable thresholds via CLI, non-Node builds, coverage formats other than
Istanbul JSON, directory recursion outside `src/` rules, and machine-readable
output formats are not required.

## 16. Conformance

An implementation conforms if it satisfies the CLI, file selection, module
grouping, coverage generation, method analysis, complexity and slop counting,
CRAP computation, reporting, and exit-code rules above for TypeScript projects
whose coverage command emits Istanbul JSON.
