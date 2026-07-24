# crap4ts

[![CI](https://github.com/alperlabs/crap4ts/actions/workflows/ci.yml/badge.svg)](https://github.com/alperlabs/crap4ts/actions/workflows/ci.yml)

`crap4ts` is a standalone CRAP metric tool for TypeScript projects, modeled
after [`crap4java`](https://github.com/unclebob/crap4java).

It combines method cyclomatic complexity with per-method statement coverage and
reports CRAP scores. On top of the classic CRAP metric it also measures a set of
**AI-slop heuristics** — the syntactic tics (guard clauses, `instanceof`
ladders, `any` escape hatches, `!` assertions, `?.`/`??` soup, stray
`console.log`s) that make generated TypeScript look like AI crap — and rolls
them into a per-method **slop score**.

On each run it deletes stale coverage artifacts, runs coverage, then analyzes
the selected files.

## Formula

`CRAP = CC^2 * (1 - coverage)^3 + CC`

- `CC` is cyclomatic complexity.
- `coverage` is the method's statement coverage fraction (covered / total
  statements whose starting line falls inside the method), derived from an
  Istanbul `coverage-final.json`.

> The lowest possible CRAP score is **1.0** — a method with complexity 1 at 100%
> coverage scores `1² · 0³ + 1 = 1`. There is no such thing as CRAP 0.

## AI-slop metrics

Each method is also scanned for the following smells. They are counted per
method and rolled up into a weighted **slop score** (weight in parentheses).

| Smell        | What it counts                                                           | Weight |
| ------------ | ------------------------------------------------------------------------ | ------ |
| `guard`      | `is`/`has`/`can`/`should`-named guard calls and `x is T` type predicates | 2      |
| `instof`     | `x instanceof Foo` expressions                                           | 1      |
| `typeof`     | `typeof x` value-position checks                                         | 1      |
| `any`        | `any` type annotations (`: any`, `as any`, `Array<any>`, ...)            | 3      |
| `nonNull`    | non-null assertions (`x!`)                                               | 2      |
| `as`         | type assertions (`x as T`, `<T>x`), excluding `as const`                 | 1      |
| `?.`         | optional-chaining hops                                                   | 1      |
| `??`         | nullish-coalescing operators                                             | 1      |
| `try`        | try/catch statements                                                     | 1      |
| `mute-catch` | empty `catch` blocks that swallow errors                                 | 3      |
| `console`    | `console.*` calls                                                        | 2      |
| `suppress`   | `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`/`eslint-disable` comments  | 4      |
| `loose-eq`   | loose equality (`==`, `!=`), excluding the `x == null` idiom             | 2      |
| `var`        | function-scoped `var` declarations                                       | 2      |

None of these are bugs on their own; in aggregate they are a good smell for
unreviewed, machine-generated code. The slop score does **not** affect the exit
code — only the CRAP threshold does. Adding your own heuristic is a one-file
change; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Coverage Pipeline

For each module (directory owning a `package.json`), the tool:

1. Deletes the stale `coverage/` directory.
2. Runs the coverage command (default `npm test`).
3. Reads `coverage/coverage-final.json` (Istanbul JSON format).
4. Analyzes the selected TypeScript files in that module.

Your project's coverage command must emit an Istanbul `coverage-final.json`, for
example:

- **Vitest**: `vitest run --coverage` with `coverage.provider = "istanbul"` and
  the `json` reporter.
- **Jest**: `jest --coverage --coverageReporters=json`.

## Install / Build

```bash
npm install
npm run build
```

## Run

From the root of the project you want to analyze:

```bash
# via the built CLI
node dist/main.js

# or without building
npx tsx src/main.ts
```

## CLI

```text
--help                Print usage to stdout
(no args)             Analyze all .ts/.tsx files under src/
--changed             Analyze changed .ts/.tsx files under src/ (git status)
<file ...>            Analyze only these files
<directory ...>       Analyze all .ts/.tsx files under each directory's src/ subtree
```

Examples:

```bash
node dist/main.js --help
node dist/main.js
node dist/main.js --changed
node dist/main.js src/foo/Sample.ts
node dist/main.js packages/a packages/b
```

## Exit codes

- `0` success, threshold respected (also: empty selection, `--help`)
- `1` invalid CLI usage
- `2` CRAP threshold exceeded (`> 8.0`)

## Architecture

```
src/
  analysis/
    complexity/   decision-rule registry + cyclomatic complexity counter
    smells/       smell-detector registry (one file per heuristic)
    parsing/      TypeScript AST → declared methods (extractor registry)
    crap-score.ts  the CRAP formula
    crap-analyzer.ts
  coverage/       Istanbul coverage parsing + the coverage runner
  discovery/      source-file finder, changed-file detector, module resolver
  report/         text report + slop breakdown
  cli/            argument parsing + the application orchestrator
```

Smells, complexity decision points, and method extraction are each expressed as
a **registry of small, single-purpose units** rather than a growing `switch`, so
the code stays flat and extending it means adding a list entry. A single
traversal contract (`parsing/method-traversal.ts`) defines which nodes belong to
a method, so the complexity and smell counters always agree.

## Development

```bash
npm test          # vitest + 100% coverage gate
npm run lint      # eslint (typescript-eslint)
npm run format    # prettier --write
npm run typecheck # tsc --noEmit
npm run crap      # run crap4ts on itself (must exit 0)
```

`crap4ts` is self-hosting and holds itself to its own bar: 100% test coverage
and a max self-CRAP well under the threshold, both enforced in CI. See
[CONTRIBUTING.md](CONTRIBUTING.md) to add a smell detector, complexity rule, or
declaration shape.

## Roadmap

- **Per-finding output**: report each smell occurrence as `file:line` together
  with the detector's one-line fix advice. The data layer already exists —
  `findSmells` returns located findings, and every detector carries `advice` —
  what remains is the report/CLI surface.
- Configurable thresholds and weights.
- Machine-readable (JSON) report output.

Have an idea for a new heuristic? Open a
[smell proposal](.github/ISSUE_TEMPLATE/smell-proposal.md) — a detector is a
one-file contribution.

## Notes

- If the coverage JSON is missing, coverage is reported as `N/A` (and CRAP `N/A`).
- The report is sorted by CRAP descending, with `N/A` rows at the bottom.
- `.d.ts` declaration files are ignored.
- Constructors, overload/`abstract`/`declare` signatures (no body), and
  anonymous inline callbacks are not reported as their own rows; a named arrow
  or function expression bound to a variable/property **is**.

## License

[MIT](LICENSE)
