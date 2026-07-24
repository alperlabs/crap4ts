---
name: Smell proposal
about: Propose a new AI-slop heuristic for the detector registry
title: "smell: "
labels: smell-proposal
---

## The smell

<!-- What pattern should be flagged, and why is it a signal of unreviewed or
     machine-generated code? -->

## Example

```ts
// code that should match
```

```ts
// nearby code that should NOT match (the false-positive you're avoiding)
```

## Suggested key, label, and weight

<!-- e.g. key: "deepClone", label: "clone", weight: 2 — see the README table
     for how existing weights are calibrated. -->

## Willing to implement?

<!-- A detector is one file plus a registry entry plus tests — see
     CONTRIBUTING.md "Adding a new AI-slop smell". PRs welcome! -->
