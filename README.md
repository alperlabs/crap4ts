# crap4ts

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

## AI-slop metrics

Each method is also scanned for the following smells. They are counted per
method and rolled up into a weighted **slop score** (weight in parentheses).

| Smell | What it counts | Weight |
| --- | --- | --- |
| `guard` | `is`/`has`/`can`/`should`-named guard calls and `x is T` type predicates | 2 |
| `instof` | `x instanceof Foo` expressions | 1 |
| `typeof` | `typeof x` value-position checks | 1 |
| `any` | `any` type annotations (`: any`, `as any`, `Array<any>`, ...) | 3 |
| `nonNull` | non-null assertions (`x!`) | 2 |
| `as` | type assertions (`x as T`, `<T>x`), excluding `as const` | 1 |
| `?.` | optional-chaining hops | 1 |
| `??` | nullish-coalescing operators | 1 |
| `try` | try/catch statements | 1 |
| `console` | `console.*` calls | 2 |

None of these are bugs on their own; in aggregate they are a good smell for
unreviewed, machine-generated code. The slop score does **not** affect the exit
code — only the CRAP threshold does.

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

## Test

```bash
npm test
```

`crap4ts` is self-hosting: `node dist/main.js` analyzes its own `src/` tree.

## Notes

- If the coverage JSON is missing, coverage is reported as `N/A` (and CRAP `N/A`).
- The report is sorted by CRAP descending, with `N/A` rows at the bottom.
- `.d.ts` declaration files are ignored.
- Constructors, overload/`abstract`/`declare` signatures (no body), and
  anonymous inline callbacks are not reported as their own rows; a named arrow
  or function expression bound to a variable/property **is**.
