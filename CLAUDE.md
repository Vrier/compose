# Project instructions — COMPOSE

This project authors COMPOSE exercise sets (`compose/exercises/*.compose.json`)
and their reading companions (`compose/reading/*.md` — Markdown + LaTeX notes,
S14) for Coppock &
Champollion's *Invitation to Formal Semantics*.

## Skills

- **Converting chapters → reading notes.** When asked to turn a textbook chapter into a
  reading, or to author/revise the `reading` attached to a `chX.*.compose.json`
  set, follow `compose/docs/SKILL-chapters-to-notes.md` in full. It is the canonical
  procedure: the chapter/exercise pairing contract, the notes syntax reference
  (Markdown skeleton + LaTeX: expex, forest/qtree, stmaryrd, S14), faithfulness
  rules, the embed-via-`run_script` step, and the QA checklist. Read it before
  starting that kind of work.

## Conventions

- Readings must stay faithful to the chapter (same section numbers, example
  sentences, types, rule names) AND locked to the exercises (every λ-term, tree
  bracketing, and type α-equivalent and same-typed to the set's `lexicon`/`domain`).
- Keep the standalone `.md` in `compose/reading/` as the source of truth; re-embed
  into the `.compose.json` when it changes.
- The textbook is copyrighted — condense and paraphrase, never paste prose verbatim.
- Paper readings (the /papers shelf) follow the quote-only sourcing standard
  (S22): notes text is only (a) short direct quotes from the paper or secondary
  literature, attributed, (b) the papers' numbered definitions, (c) explicitly
  flagged rendering/implementation notes (the PTQ-B TY2 §0 pattern), and
  (d) minimal signposting. No unsourced paraphrase presented as fact.

## Architecture (hosted V1 — LIVE at compose.tstephen.com)

One Hetzner VPS (167.233.233.109) runs PocketBase (pinned, `server/get-pocketbase.sh`)
behind Caddy (auto-TLS). `/` = bare starter (demo worksheet only, S13);
`/cc` `/hk` `/papers` (+ per-chapter pages) = curated library with shared
per-family progress islands; `/v/:slug` = per-version student pages
(server-side template substitution, isolated localStorage via `island`);
`/dash/` = instructor dashboard; `/edit/:id` = hosted editor (version's own
worksheets only, S13.4); `/editor/` = account-less editor sandbox;
`/files/` = worksheet downloads + site map; `/help/` (+`/help/guides/`, with
video walkthroughs) = student help (S23/S24); `/guide/` = instructor guide
(screenshots regenerate via scripts/capture-guide.mjs + capture-dash.mjs);
`/about/` = citation page; `/_/` = PB admin; `/template.html` = public
tokenized template (client-side export substitution, S13.3).
Instructor content lives in the `versions` collection (bundle JSON), validated
on save by the real engine running inside PB's goja VM. Deploys: push to
`main` → GitHub Actions runs all five test suites → SSH → `deploy/deploy.sh`
(pull, build, restart). PB data lives in `/srv/compose-data`, never touched by
deploys; nightly PB zips + Hetzner Backups (restore drill passed 2026-07-11,
`deploy/restore-drill.sh`). See DEPLOY.md for operations.

Key gotchas (hard-won; see PLAN.md §8 session log for details): PB hook
handlers run in isolated VMs (require() shared code INSIDE handlers); goja
returns raw bytes for json fields (`parseBundle()`) and struct copies for
nested settings (assign whole objects); always pass explicit
`--hooksDir/--migrationsDir/--publicDir`; substitute template tokens with
split/join, never String.replace.

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
