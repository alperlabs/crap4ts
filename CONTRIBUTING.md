# Contributing to crap4ts

Thanks for your interest! crap4ts aims to be small, sharp, and easy to extend.
This guide covers the project's shape, the quality gates, and — most usefully —
how to add a new smell heuristic.

## Development

```bash
npm install
npm test          # vitest + 100% coverage gate
npm run lint      # eslint
npm run format    # prettier --write
npm run typecheck # tsc --noEmit
npm run build     # emit dist/
npm run crap      # run crap4ts on itself (must exit 0)
```

### Quality gates (enforced in CI)

- **Tests + 100% coverage.** `npm test` fails below 100% statements, branches,
  functions, and lines. Thin IO adapters (`main.ts`, `process-command-executor.ts`)
  are excluded; everything else is covered.
- **Lint & format.** `npm run lint` and `npm run format:check` must pass.
- **Self CRAP gate.** crap4ts analyzes its own `src/`; the max CRAP must stay at
  or below the 8.0 threshold. Keep functions small and well-tested.

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

Two ideas keep complexity low and extension easy:

1. **Registries over switches.** Smells, complexity decision points, and method
   extraction are each a list of small, single-purpose units. Adding a case is
   adding a list entry — never editing a growing `switch`.
2. **One traversal contract.** `parsing/method-traversal.ts` defines exactly which
   nodes belong to a method (stopping at nested declared methods). Both the
   complexity and smell counters use it, so they always agree.

## Adding a new AI-slop smell

Say you want to flag `@ts-ignore`/`@ts-expect-error` comments, or `JSON.parse`
without a cast, or deeply nested ternaries. Three steps:

### 1. Implement the detector

Create `src/analysis/smells/detectors/<name>-smell.ts`:

```ts
import ts from "typescript";
import { booleanSmell, type SmellDetector } from "../smell-detector.js";

/** One-line description of what this smell flags. */
export const myThingSmell: SmellDetector = {
  key: "myThing", // stable id, also the column key in SmellCounts
  label: "mine", // short header shown in the report breakdown
  weight: 1, // multiplier into the slop score
  count(node) {
    return booleanSmell(/* a predicate on a single AST node */);
  },
};
```

A detector inspects **one node at a time** and returns its contribution
(normally `0` or `1`). Keep any non-trivial predicate in a small helper so the
detector stays under the CRAP threshold. If you need the name of a called
function or its receiver, reuse `detectors/call-name.ts`.

### 2. Register it

Add it to `src/analysis/smells/registry.ts` (order = report order):

```ts
import { myThingSmell } from "./detectors/my-thing-smell.js";

export const SMELL_DETECTORS: readonly SmellDetector[] = [
  // ...existing detectors...
  myThingSmell,
];
```

That's the only wiring. Counting, scoring, the report breakdown, and the
`SmellCounts` shape all iterate the registry.

### 3. Test it

Add a case to `test/analysis/smells.test.ts` with a matching and a
non-matching example, and update the README smell table. Run `npm test` — the
100% coverage gate will tell you if any branch of your detector is untested.

## Adding a complexity decision point

Append a rule to `DECISION_RULES` in
`src/analysis/complexity/decision-rules.ts` (each rule is a
`(node) => boolean`), and add a case to `test/analysis/complexity.test.ts`.

## Adding a new declaration shape

If a construct should be reported as its own method (or should bound
traversal), add a `MethodExtractor` to
`src/analysis/parsing/method-extractors.ts` and cover it in
`test/analysis/parsing.test.ts`.

## Commit style

Small, focused commits with imperative subjects. Make sure `npm test`,
`npm run lint`, `npm run format:check`, and `npm run crap` all pass before
opening a pull request.
