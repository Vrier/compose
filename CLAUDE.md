# Project instructions — COMPOSE

This project authors COMPOSE exercise sets (`compose/exercises/*.compose.json`)
and their lingdown reading companions (`compose/reading/*.md`) for Coppock &
Champollion's *Invitation to Formal Semantics*.

## Skills

- **Converting chapters → lingdown.** When asked to turn a textbook chapter into a
  reading, or to author/revise the `reading` attached to a `chX.*.compose.json`
  set, follow `compose/docs/SKILL-chapters-to-lingdown.md` in full. It is the canonical
  procedure: the chapter/exercise pairing contract, the lingdown syntax reference,
  faithfulness rules, the embed-via-`run_script` step, and the QA checklist. Read
  it before starting that kind of work.

## Conventions

- Readings must stay faithful to the chapter (same section numbers, example
  sentences, types, rule names) AND locked to the exercises (every λ-term, tree
  bracketing, and type α-equivalent and same-typed to the set's `lexicon`/`domain`).
- Keep the standalone `.md` in `compose/reading/` as the source of truth; re-embed
  into the `.compose.json` when it changes.
- The textbook is copyrighted — condense and paraphrase, never paste prose verbatim.
