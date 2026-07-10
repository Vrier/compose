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

## Hosted V1 build (multi-session)

The repo is being taken to a hosted service across multiple sessions:

- **PLAN.md is the plan of record** — product spec, terminology (§1.4), locked
  architecture (§3), work items, and the §8 progress tracker + session log (the
  only memory between sessions; update and commit it every session).
- **IMPLEMENTATION.md contains binding per-session briefs** (§3) and the verified
  interface contracts (§2, C1–C8). If the repo disagrees with the docs, the repo
  wins: verify, then fix the doc in the same commit.
- **The session protocol in IMPLEMENTATION.md §0 is mandatory**: start green
  (`npm test`), stay in scope, end green, update PLAN.md §8, commit.
- PROMPTS.md holds the bootstrap/session/resume prompts used to run each session.

## Pushing to GitHub (Cowork sessions)

Remote: `git@github.com:Vrier/compose.git` (repo is public; pushes authenticate
with the write deploy key `.github-deploy-key` in the repo root — gitignored,
added to GitHub 2026-07-09). Push with:

    GIT_SSH_COMMAND="ssh -i .github-deploy-key -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" git push origin HEAD:main

Every push to `main` triggers `.github/workflows/deploy.yml`: full test suite,
then SSH deploy to the VPS (167.233.233.109 → compose.tstephen.com). Do not
push red: CI failing means no deploy, but keep main green regardless.
