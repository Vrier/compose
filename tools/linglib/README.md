# Linglib cross-check

[Linglib](https://linglib.io) is a Lean 4 library of formal linguistics. Its
`Interpreter` states the composition rules as a language over the semantic
types: Functional Application in either order and Predicate Modification in
`Linglib/Semantics/Composition/Rules.lean`, Intensional Functional Application
in `Studies/HeimKratzer1998.lean`. This folder evaluates those definitions and
records the answers for `test/linglib-rules.mjs`, which checks the engine's
rule chooser against them on every `npm test`.

## What the suite checks

For every pair of sister types of size five or less over t, e, s, v and n
(280 types, 78,400 pairs), and for every pair of sister types at a binary node
`solveTree` completes in the curated library:

| COMPOSE | Linglib |
|---|---|
| `candidateRules` offers FA, PM or IFA, with a mother type | `Application.rules`, `PredicateModification.rules`, `IntensionalApplication.rules` admit it, with that type |
| `applicable` applies FA with the function on the left (`lr`) or on the right (`rl`) | `fa` or `ba` |

Event Identification (`Interpreter.EventIdentification`, Kratzer 1996) admits two
grid pairs, ⟨e,⟨v,t⟩⟩ with ⟨v,t⟩ in either order, and has no COMPOSE
counterpart; the suite counts these pairs. Sister pairs over the time sort `i`
are left out, since `Interpreter.Base` has entities, degrees, cardinalities,
eventualities and worlds, and no times.

Deleting the reverse order from `tryIFA`, swapping the order labels in `tryFA`,
or dropping the shared-domain condition from `tryPM` fails the suite with 25,
591 and 875 disagreements.

## Regenerating the fixture

Regenerate after a change to the composition rules, or when the suite warns
that the library has sister types the fixture lacks.

Requirements: [elan](https://github.com/leanprover/elan), which installs the Lean
version in `lean-toolchain`, and Node 18 or later. The first run downloads about
11 GB (Mathlib's compiled files, the toolchain and Linglib's release archive);
later runs take seconds. Nothing of Mathlib or Linglib is compiled locally,
since Linglib is pinned to a release tag and `lake-manifest.json` pins every
dependency.

    node tools/linglib/regenerate.mjs

The script collects the library's sister-type pairs with the real engine, writes
them to `ComposeLean/LibPairs.lean`, runs `lake exe cache get`, builds the
Linglib modules it needs, runs `ComposeLean/RuleOracle.lean`, and writes
`test/fixtures/linglib-rules.json` with Linglib's release tag and commit.
`--no-lean` rebuilds the fixture from the last Lean output.

To move to a later Linglib, change the tag in `lakefile.lean` and the toolchain
in `lean-toolchain` to the ones Linglib's README names, run `lake update` here,
then regenerate. Linglib follows Lean's monthly releases and its README asks for
review of its AI-assisted code, so a new tag is a change to inspect.

## Files

| file | role |
|---|---|
| `lakefile.lean`, `lean-toolchain`, `lake-manifest.json` | the Lake project, pinned to Linglib `v4.36.0` |
| `ComposeLean/RuleOracle.lean` | evaluates Linglib's rule definitions on the grid and the library pairs |
| `regenerate.mjs` | the whole pipeline, from the library to the fixture |

Generated and ignored by git: `.lake/`, `ComposeLean/LibPairs.lean`,
`oracle-grid.jsonl`, `oracle-lib.jsonl`.
