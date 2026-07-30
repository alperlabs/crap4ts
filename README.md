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

## Reading CRAP scores

CRAP means **Change Risk Anti-Patterns**: how risky it is to change a method,
not how ugly it looks. High CRAP usually means “complex **and** under-tested.”
A clean method with no tests can outrank a messy one that is fully covered.

### Example: clean use case, CRAP 20

This NestJS-style use case is short, linear, and follows clean architecture —
yet it scored **CRAP 20** on a real project run:

```ts
async execute(command: AdminUpdateOrganizationCommand): Promise<Organization> {
  const organization = await this.organizationRepository.findById(
    command.organizationId,
  );
  if (!organization) {
    throw new OrganizationNotFoundException(command.organizationId);
  }

  if (command.categorySlug) {
    const exists = await this.categoryRepository.existsBySlug(
      command.categorySlug,
    );
    if (!exists) {
      throw new OrganizationCategoryNotFoundException(command.categorySlug);
    }
  }

  const updated = organization.updateProfile({ /* fields from command */ });
  await this.organizationRepository.save(updated);
  return updated;
}
```

| Input    |  Value | Why                                              |
| -------- | -----: | ------------------------------------------------ |
| CC       |      4 | base + three `if`s (not-found, optional slug, …) |
| Coverage |     0% | no use-case spec; callers mock this class        |
| **CRAP** | **20** | `4² · (1 − 0)³ + 4 = 20`                         |

At **100%** coverage the same method would score **CRAP 4.0** — well under the
default gate of 8 (tune it with `--threshold`). The fix is a focused unit test
for `execute`, not a rewrite.

### Example: dense domain update, CRAP 90

Same project, same 0% coverage — but here the method itself is hard to change.
Optional fields are merged through nested ternaries and `||` fallbacks:

```ts
updateDetails(params: {
  displayName?: string;
  phone?: string | null;
  locale?: string;
  timezone?: string;
  avatarUrl?: string | null;
}): UserProfile {
  const displayName =
    params.displayName !== undefined
      ? params.displayName.trim() || this.displayNameValue
      : this.displayNameValue;
  return new UserProfile(
    this.id,
    this.accountIdValue,
    displayName,
    params.avatarUrl === undefined
      ? this.avatarUrlValue
      : params.avatarUrl?.trim() || undefined,
    params.phone === undefined
      ? this.phoneValue
      : params.phone?.trim() || undefined,
    params.locale?.trim() || this.localeValue,
    params.timezone?.trim() || this.timezoneValue,
  );
}
```

| Input    |  Value | Why                                   |
| -------- | -----: | ------------------------------------- |
| CC       |      9 | ternaries + `                         |     | ` short-circuits on every optional field |
| Coverage |     0% | no direct unit coverage for this path |
| **CRAP** | **90** | `9² · (1 − 0)³ + 9 = 90`              |

Even at **100%** coverage this would still score **CRAP 9.0** (above the gate)
until the branching is simplified — e.g. small per-field helpers or an explicit
patch/merge step. Tests alone are not enough; the structure has to get simpler.

### How to read the two rows

| Signal           | Clean use case (CRAP 20) | Dense update (CRAP 90)   |
| ---------------- | ------------------------ | ------------------------ |
| Structure        | fine                     | tangled optional merging |
| Coverage         | 0%                       | 0%                       |
| Fix              | add a use-case spec      | simplify **and** test    |
| At 100% coverage | CRAP 4 (passes)          | CRAP 9 (still fails)     |

Use **CRAP** for change risk, and the **slop** breakdown when you care about
AI-shaped syntax. A high-CRAP / low-complexity row is usually testing debt;
high-CRAP / high-complexity is where design review belongs.

## AI-slop metrics

Each method is also scanned for the following smells. They are counted per
method and rolled up into a weighted **slop score** (weight in parentheses).
Smells come in two categories, and the report groups them accordingly.

**Escape hatches** — strong signals; they defeat the type system or error
handling outright:

| Smell        | What it counts                                                          | Weight |
| ------------ | ----------------------------------------------------------------------- | ------ |
| `suppress`   | `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`/`eslint-disable` comments | 4      |
| `any`        | `any` type annotations (`: any`, `as any`, `Array<any>`, ...)           | 3      |
| `mute-catch` | empty `catch` blocks that swallow errors                                | 3      |
| `nonNull`    | non-null assertions (`x!`)                                              | 2      |
| `loose-eq`   | loose equality (`==`, `!=`), excluding the `x == null` idiom            | 2      |
| `var`        | function-scoped `var` declarations                                      | 2      |
| `as`         | type assertions (`x as T`, `<T>x`), excluding `as const`                | 1      |

**Style heuristics** — soft signals; each is idiomatic on its own and only
suspicious in aggregate:

| Smell       | What it counts                                                               | Weight |
| ----------- | ---------------------------------------------------------------------------- | ------ |
| `guard`     | consecutive `if (...) return/throw` guard clauses (ladders of N score N−1)   | 2      |
| `console`   | `console.*` calls                                                            | 2      |
| `instof`    | `x instanceof Foo` expressions                                               | 1      |
| `typeof`    | `typeof x` value-position checks                                             | 1      |
| `?.`        | optional-chaining hops                                                       | 1      |
| `??`        | nullish-coalescing operators                                                 | 1      |
| `try`       | try/catch statements                                                         | 1      |
| `obj-null`  | `typeof x === "object" && x !== null` JSON-guard bodies                      | 1      |
| `is-helper` | `isRecord` / `isPlainObject` / `isObject` / `isString` / … defs & bare calls | 1      |
| `dup-guard` | same type-guard helper name defined in two or more files                     | 1      |

None of these are bugs on their own; in aggregate they are a good smell for
unreviewed, machine-generated code. The slop score does **not** affect the exit
code — only the CRAP threshold does. Adding your own heuristic is a one-file
change; see [CONTRIBUTING.md](CONTRIBUTING.md).

The report ends with a **findings section** locating every occurrence, so you
can jump straight to the smell and fix it:

```text
Findings
========
src/user-service.ts:42    any         Replace any with unknown, a generic, or the real type.
src/user-service.ts:57    mute-catch  Never swallow errors: handle, log, or rethrow.
```

## Coverage Pipeline

For each module (directory owning a `package.json`), the tool:

1. Deletes the stale `coverage/` directory.
2. Runs the coverage command (default `npm test`, configurable via
   `--coverage-command`).
3. Reads the coverage report through a **coverage reader** — Istanbul
   `coverage-final.json` and LCOV `lcov.info` ship built in, probed in that
   order. `--coverage-format` forces one explicitly.
4. Analyzes the selected TypeScript files in that module.

Example coverage commands:

- **Vitest**: `vitest run --coverage` with `coverage.provider = "istanbul"` and
  the `json` reporter (or the lcov reporter with any provider).
- **Jest**: `jest --coverage --coverageReporters=json` (or `lcov`).
- **c8 / node:test**: `c8 --reporter=lcov node --test`.

Already ran coverage in an earlier CI step? Skip the re-run with
`--coverage-file coverage/coverage-final.json`. Analyzing a repo you can't
run (or don't want to)? `--no-coverage` scores smells and complexity only,
with coverage and CRAP reported as N/A.

Coverage reading is an interface (`CoverageReader`): implementing one file
adds a format, and library consumers can pass their own readers without
forking. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Install

```bash
# in a project
npm install --save-dev @alperlabs/crap4ts

# or run without installing
npx @alperlabs/crap4ts
```

Both put a `crap4ts` binary on your path. From a checkout: `npm install &&
npm run build`, then `node dist/main.js`.

## CLI

```text
Usage: crap4ts [selection] [options]

Selection (mutually exclusive):
  (no args)                    Analyze all TypeScript files under the source roots
  --changed                    Analyze files with uncommitted changes (git status)
  --changed-since <ref>        Analyze files changed since merge-base with <ref>
                               (committed and uncommitted), e.g. origin/main
  <path...>                    Analyze these files; directory arguments are
                               searched under their own source roots

Options:
  --threshold <score>          Maximum allowed CRAP score (default: 8.0)
  --format <name>              Report format: text, json, or github (default: text)
  --no-coverage                Skip coverage; coverage and CRAP report as N/A
  --coverage-file <path>       Read an existing coverage report instead of
                               running the coverage command
  --coverage-command <command> Command that generates coverage (default: npm test)
  --coverage-format <name>     Coverage report format: istanbul or lcov
                               (default: detect from the report file name)
  --source-root <dir>          Source directory to search; repeatable
                               (default: src)
  --baseline <path>            Fail only on methods that are new or worse than
                               this baseline file
  --write-baseline             Write the baseline file from this run and exit 0
  --config <path>              Config file (default: crap4ts.config.json, then
                               the "crap4ts" key in package.json)
  --version                    Print the crap4ts version
  --help                       Print this help message
```

Examples:

```bash
crap4ts                                   # gate the whole project
crap4ts --changed-since origin/main       # PR-scoped: only what the diff touched
crap4ts --format json > crap.json         # machine-readable report
crap4ts --coverage-file coverage/lcov.info --threshold 10
crap4ts src/foo/Sample.ts packages/a packages/b
```

## Configuration

Every flag has a config-file equivalent. Settings load from
`crap4ts.config.json` at the project root (or a `crap4ts` key in
`package.json`); CLI flags win over the file, the file wins over defaults:

```json
{
  "threshold": 10,
  "format": "text",
  "coverageCommand": "npx vitest run --coverage",
  "sourceRoots": ["src", "lib"],
  "baseline": "crap4ts-baseline.json"
}
```

Other keys: `coverage` (`"run"` | `"file"` | `"off"`), `coverageFile`,
`coverageFormat`. Unknown keys and wrong types are errors, not silent
fallbacks.

## CI

`--format github` prefixes the report with GitHub Actions annotations —
`::error` per method over the threshold, `::warning` per smell finding — so
results land inline on the pull request diff:

```yaml
- run: npx @alperlabs/crap4ts --coverage-file coverage/coverage-final.json --format github
```

## Baseline (ratchet) mode

Real codebases rarely pass a CRAP gate on day one. Record today's scores,
then fail only what is **new or worse**:

```bash
crap4ts --write-baseline               # writes crap4ts-baseline.json
crap4ts --baseline crap4ts-baseline.json   # passes; existing debt is accepted
```

Commit the baseline. Methods over the threshold that are already recorded
pass until they get worse; new offenders and regressions fail. Re-run
`--write-baseline` after paying debt down so the ratchet only tightens.

## Library use

The npm package exposes everything the CLI does:

```ts
import {
  analyze,
  istanbulJsonReader,
  rendererNamed,
  buildBaseline,
  type CoverageReader,
} from "@alperlabs/crap4ts";

const coverage = istanbulJsonReader.read("coverage/coverage-final.json");
const metrics = analyze(["src/service.ts"], coverage);
console.log(rendererNamed("json").render(metrics, { projectRoot: process.cwd(), threshold: 8 }));
```

Custom coverage formats implement the `CoverageReader` interface and can be
passed to `new CliApplication({ coverageReaders: [...] })` alongside the
built-ins.

## Exit codes

- `0` success, gate respected (also: empty selection, `--help`, `--version`,
  `--write-baseline`)
- `1` invalid CLI usage, broken config, or missing baseline
- `2` CRAP gate failed (over the threshold, or worse than the baseline)

## Architecture

```
src/
  analysis/
    complexity/   decision-rule registry + cyclomatic complexity counter
    smells/       smell-detector registry (one file per heuristic)
    parsing/      TypeScript AST → declared methods (extractor registry)
    crap-score.ts  the CRAP formula
    crap-analyzer.ts
  coverage/       coverage runner + pluggable report readers (istanbul, lcov)
  discovery/      source-file finder, changed-file detector, module resolver
  report/         report renderers: text, json, github
  baseline/       ratchet-mode baseline build/read/compare
  config/         defaults, config file, CLI/file/default merging
  cli/            argument parsing + the application orchestrator
  index.ts        the public library API
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

- Configurable smell weights.
- SARIF output for GitHub code scanning.
- A published reference corpus for density comparisons.

Have an idea for a new heuristic? Open a
[smell proposal](.github/ISSUE_TEMPLATE/smell-proposal.md) — a detector is a
one-file contribution.

## Notes

- If no coverage report is found (or `--no-coverage` is set), coverage is
  reported as `N/A` (and CRAP `N/A`); the run still succeeds.
- The report is sorted by CRAP descending, with `N/A` rows at the bottom.
- `.d.ts` declaration files are ignored.
- Constructors, overload/`abstract`/`declare` signatures (no body), and
  anonymous inline callbacks are not reported as their own rows; a named arrow
  or function expression bound to a variable/property **is**.

## License

[MIT](LICENSE)
